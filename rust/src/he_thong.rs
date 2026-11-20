//! Goi Windows: mutex 1 ban, tim tien trinh theo ten, xem ZaloCall co cua so (dang goi) khong.

use windows_sys::Win32::Foundation::{
    CloseHandle, GetLastError, BOOL, ERROR_ALREADY_EXISTS, FILETIME, HWND, INVALID_HANDLE_VALUE, LPARAM, SYSTEMTIME,
};
use windows_sys::Win32::System::SystemInformation::GetLocalTime;
use windows_sys::Win32::System::Time::{FileTimeToSystemTime, SystemTimeToTzSpecificLocalTime};
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows_sys::Win32::System::Threading::CreateMutexW;
use windows_sys::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindow, GetWindowThreadProcessId, IsWindowVisible, GW_OWNER};

/// Gio dia phuong (thay chrono: chrono ban moi can dlltool, hong khi duong dan user co dau cach).
#[derive(Clone, Copy, PartialEq, Eq)]
pub struct Gio {
    pub nam: u16,
    pub thang: u16,
    pub ngay: u16,
    pub gio: u16,
    pub phut: u16,
    pub giay: u16,
    pub ms: u16,
}

impl Gio {
    fn tu(st: &SYSTEMTIME) -> Self {
        Gio { nam: st.wYear, thang: st.wMonth, ngay: st.wDay, gio: st.wHour, phut: st.wMinute, giay: st.wSecond, ms: st.wMilliseconds }
    }

    pub fn bay_gio() -> Self {
        // SAFETY: GetLocalTime chi ghi vao SYSTEMTIME.
        unsafe {
            let mut st: SYSTEMTIME = std::mem::zeroed();
            GetLocalTime(&mut st);
            Gio::tu(&st)
        }
    }

    /// Mili-giay Unix -> gio dia phuong (tinh ca gio mua he theo dung ngay do).
    pub fn tu_unix_ms(ms: i64) -> Option<Self> {
        let ticks = u64::try_from(ms.checked_mul(10_000)?.checked_add(116_444_736_000_000_000)?).ok()?;
        let ft = FILETIME { dwLowDateTime: ticks as u32, dwHighDateTime: (ticks >> 32) as u32 };
        // SAFETY: con tro toi bien cuc bo.
        unsafe {
            let mut utc: SYSTEMTIME = std::mem::zeroed();
            let mut loc: SYSTEMTIME = std::mem::zeroed();
            if FileTimeToSystemTime(&ft, &mut utc) == 0 || SystemTimeToTzSpecificLocalTime(std::ptr::null(), &utc, &mut loc) == 0 {
                return None;
            }
            Some(Gio::tu(&loc))
        }
    }

    pub fn ngay_vn(&self) -> String {
        format!("{:02}/{:02}/{}", self.ngay, self.thang, self.nam)
    }
    pub fn hhmm(&self) -> String {
        format!("{:02}:{:02}", self.gio, self.phut)
    }
    pub fn yymmdd(&self) -> String {
        format!("{:02}{:02}{:02}", self.nam % 100, self.thang, self.ngay)
    }
    pub fn cung_ngay(&self, o: &Gio) -> bool {
        (self.nam, self.thang, self.ngay) == (o.nam, o.thang, o.ngay)
    }
    /// 2026-11-20 10:30:29 (log)
    pub fn day_du(&self) -> String {
        format!("{}-{:02}-{:02} {:02}:{:02}:{:02}", self.nam, self.thang, self.ngay, self.gio, self.phut, self.giay)
    }
}

/// Giu mutex ten `ten` suot doi tien trinh. false = da co ban khac giu.
pub fn giu_mutex(ten: &str) -> bool {
    let w: Vec<u16> = ten.encode_utf16().chain(Some(0)).collect();
    // SAFETY: chuoi ket thuc 0, handle co y giu toi khi tien trinh thoat.
    unsafe {
        let h = CreateMutexW(std::ptr::null(), 0, w.as_ptr());
        !h.is_null() && GetLastError() != ERROR_ALREADY_EXISTS
    }
}

/// PID cua moi tien trinh co ten file `exe` (khong phan biet hoa thuong).
pub fn pid_theo_ten(exe: &str) -> Vec<u32> {
    let mut kq = Vec::new();
    // SAFETY: snapshot dong o cuoi; PROCESSENTRY32W khoi tao dung dwSize.
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snap == INVALID_HANDLE_VALUE {
            return kq;
        }
        let mut e: PROCESSENTRY32W = std::mem::zeroed();
        e.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;
        let mut ok = Process32FirstW(snap, &mut e);
        while ok != 0 {
            let n = e.szExeFile.iter().position(|&c| c == 0).unwrap_or(e.szExeFile.len());
            if String::from_utf16_lossy(&e.szExeFile[..n]).eq_ignore_ascii_case(exe) {
                kq.push(e.th32ProcessID);
            }
            ok = Process32NextW(snap, &mut e);
        }
        CloseHandle(snap);
    }
    kq
}

struct TimCuaSo {
    pids: Vec<u32>,
    thay: bool,
}

unsafe extern "system" fn moi_cua_so(hwnd: HWND, lp: LPARAM) -> BOOL {
    let t = &mut *(lp as *mut TimCuaSo);
    let mut pid = 0u32;
    GetWindowThreadProcessId(hwnd, &mut pid);
    if t.pids.contains(&pid) && IsWindowVisible(hwnd) != 0 && GetWindow(hwnd, GW_OWNER).is_null() {
        t.thay = true;
        return 0;
    }
    1
}

/// Zalo 11/2026 LUON chay san ZaloCall.exe khong cua so -> chi coi la DANG GOI khi no co cua so chinh that.
pub fn dang_goi(exe_goi: &str) -> bool {
    let pids = pid_theo_ten(exe_goi);
    if pids.is_empty() {
        return false;
    }
    let mut t = TimCuaSo { pids, thay: false };
    // SAFETY: con tro toi `t` chi dung trong luc EnumWindows chay.
    unsafe {
        EnumWindows(Some(moi_cua_so), &mut t as *mut TimCuaSo as LPARAM);
    }
    t.thay
}
