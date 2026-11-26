//! Thanh TCL - Zalo Web (chat.zalo.me) trong cua so rieng bang WebView2, cu xu nhu Zalo PC:
//!   - bam X = an xuong khay (van chay, van nhan tin); bam icon khay = hien lai; "Thoat han" trong menu khay
//!   - chay 1 ban; mo lan 2 (loi tat) = hien cua so dang chay
//!   - `--an`: khoi dong an (dung cho Startup)
//!   - ao carbon + ten/icon nap ngay tu luc tai trang (modules/*.js canh exe); cac mod con lai + cau noi do
//!     nguoi canh (zalo-gon.exe ban web) chen qua cong go loi 9334 (chi 127.0.0.1).
//!   - link ngoai mo bang trinh duyet mac dinh.
#![windows_subsystem = "windows"]

use std::path::{Path, PathBuf};
use tao::dpi::{LogicalSize, PhysicalSize};
use tao::platform::windows::WindowBuilderExtWindows;
use windows_sys::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXICON, SM_CXSMICON, SYSTEM_METRICS_INDEX};
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tao::platform::windows::IconExtWindows;
use tao::window::{Icon, Window, WindowBuilder};
use tray_icon::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem};
use tray_icon::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use windows_sys::Win32::Foundation::{GetLastError, ERROR_ALREADY_EXISTS};
use windows_sys::Win32::System::Threading::{CreateEventW, CreateMutexW, OpenEventW, SetEvent, WaitForSingleObject, EVENT_MODIFY_STATE, INFINITE};
use wry::{NewWindowResponse, WebContext, WebViewBuilder, WebViewBuilderExtWindows};

const TEN: &str = "Thành TCL";
const URL: &str = "https://chat.zalo.me/";
const CONG_GO_LOI: u16 = 9334;
/// Module nap ngay luc tai trang (chong nhay trang); cac module khac do nguoi canh chen.
const MODULE_NAP_NGAY: [&str; 2] = ["00-brand.js", "05-carbon-web.js"];

enum Su {
    Khay(TrayIconEvent),
    Menu(MenuEvent),
    Hien,
}

fn w(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn thu_muc_exe() -> PathBuf {
    std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf)).unwrap_or_else(|| PathBuf::from("."))
}

fn ghi_log(msg: &str) {
    use std::io::Write;
    let f = thu_muc_exe().join("thanh-tcl.log");
    if std::fs::metadata(&f).is_ok_and(|m| m.len() > 256 * 1024) {
        let _ = std::fs::remove_file(&f);
    }
    if let Ok(mut h) = std::fs::OpenOptions::new().create(true).append(true).open(f) {
        let t = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
        let _ = writeln!(h, "{t}  {msg}");
    }
}

/// Script nap tu dau: favicon + module ao/ten, chay khi DOM san sang, moi module boc try/catch.
fn script_nap_ngay(thu_muc: &Path) -> String {
    let favicon = std::fs::read_to_string(thu_muc.join("assets").join("favicon-datauri.txt")).unwrap_or_default();
    let mut js = format!("window.__OTL_FAVICON={:?};\n", favicon.trim());
    js.push_str("(function(){function chay(){\n");
    for ten in MODULE_NAP_NGAY {
        if let Ok(code) = std::fs::read_to_string(thu_muc.join("modules").join(ten)) {
            js.push_str(&format!("try{{\n{code}\n}}catch(e){{console.error('[otl] {ten}',e);}}\n"));
        }
    }
    js.push_str("}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',chay);else chay();})();");
    js
}

/// Co icon he thong (da tinh DPI man hinh chinh), toi thieu 16.
fn co_icon(loai: SYSTEM_METRICS_INDEX) -> u32 {
    (unsafe { GetSystemMetrics(loai) }).max(16) as u32
}

fn mo_ngoai(url: &str) {
    if url.starts_with("https://") || url.starts_with("http://") {
        let _ = std::process::Command::new("rundll32.exe").args(["url.dll,FileProtocolHandler", url]).spawn();
    }
}

fn hien(cs: &Window) {
    cs.set_visible(true);
    if cs.is_minimized() {
        cs.set_minimized(false);
    }
    cs.set_focus();
}

/// Ban thu 2 (bam lai loi tat) -> bao ban dang chay hien cua so roi thoat.
fn ban_dang_chay() -> bool {
    let ten_mutex = w("Local\\ThanhTclZaloWeb");
    unsafe {
        CreateMutexW(std::ptr::null(), 1, ten_mutex.as_ptr());
        if GetLastError() != ERROR_ALREADY_EXISTS {
            return false;
        }
        let su = OpenEventW(EVENT_MODIFY_STATE, 0, w("Local\\ThanhTclHien").as_ptr());
        if !su.is_null() {
            SetEvent(su);
        }
    }
    true
}

fn main() {
    let an = std::env::args().any(|a| a == "--an");
    if ban_dang_chay() {
        return;
    }
    let dir = thu_muc_exe();
    let ico = dir.join("assets").join("zalo.ico");
    let du_lieu = std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| dir.clone()).join("ThanhTCL").join("webview2");

    let vong = EventLoopBuilder::<Su>::with_user_event().build();
    let (p1, p2, p3) = (vong.create_proxy(), vong.create_proxy(), vong.create_proxy());
    TrayIconEvent::set_event_handler(Some(move |e| {
        let _ = p1.send_event(Su::Khay(e));
    }));
    MenuEvent::set_event_handler(Some(move |e| {
        let _ = p2.send_event(Su::Menu(e));
    }));
    // Ban thu 2 bao "hien len" qua su kien co ten
    std::thread::spawn(move || unsafe {
        let su = CreateEventW(std::ptr::null(), 0, 0, w("Local\\ThanhTclHien").as_ptr());
        if su.is_null() {
            return;
        }
        while WaitForSingleObject(su, INFINITE) == 0 {
            if p3.send_event(Su::Hien).is_err() {
                break;
            }
        }
    });

    let cs = match WindowBuilder::new()
        .with_title(TEN)
        .with_inner_size(LogicalSize::new(1280.0, 860.0))
        .with_min_inner_size(LogicalSize::new(760.0, 520.0))
        .with_visible(false)
        // Icon nho (thanh tieu de) va icon lon (thanh tac vu, Alt+Tab) lay KHUNG RIENG trong zalo.ico theo DPI
        // -> net, khong phong to tu 16 px nhu cua so Chrome --app.
        .with_window_icon(Icon::from_path(&ico, Some(PhysicalSize::new(co_icon(SM_CXSMICON), co_icon(SM_CXSMICON)))).ok())
        .with_taskbar_icon(Icon::from_path(&ico, Some(PhysicalSize::new(co_icon(SM_CXICON), co_icon(SM_CXICON)))).ok())
        .build(&vong)
    {
        Ok(c) => c,
        Err(e) => return ghi_log(&format!("Khong tao duoc cua so: {e}")),
    };

    let mut ctx = WebContext::new(Some(du_lieu));
    let wv = WebViewBuilder::new_with_web_context(&mut ctx)
        .with_url(URL)
        .with_initialization_script(script_nap_ngay(&dir))
        .with_additional_browser_args(format!(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-port={CONG_GO_LOI} --remote-debugging-address=127.0.0.1"
        ))
        .with_devtools(true)
        .with_new_window_req_handler(|url, _| {
            mo_ngoai(&url);
            NewWindowResponse::Deny
        })
        .build(&cs);
    let wv = match wv {
        Ok(v) => v,
        Err(e) => return ghi_log(&format!("Khong tao duoc WebView2: {e}")),
    };

    let menu = Menu::new();
    let mo = MenuItem::new("Mở Thành TCL", true, None);
    let tai = MenuItem::new("Tải lại trang", true, None);
    let thoat = MenuItem::new("Thoát hẳn", true, None);
    let _ = menu.append_items(&[&mo, &tai, &PredefinedMenuItem::separator(), &thoat]);
    let mut khay = TrayIconBuilder::new().with_tooltip(TEN).with_menu(Box::new(menu)).with_menu_on_left_click(false);
    if let Ok(i) = tray_icon::Icon::from_path(&ico, Some((32, 32))) {
        khay = khay.with_icon(i);
    }
    let khay = match khay.build() {
        Ok(k) => Some(k),
        Err(e) => {
            ghi_log(&format!("Khong tao duoc icon khay: {e}"));
            None
        }
    };
    if !an || khay.is_none() {
        hien(&cs);
    }
    ghi_log(if an { "Khoi dong (an)" } else { "Khoi dong" });

    vong.run(move |ev, _, cf| {
        *cf = ControlFlow::Wait;
        let _ = (&khay, &wv);
        match ev {
            Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => {
                if khay.is_some() {
                    cs.set_visible(false); // nhu Zalo PC: X = an xuong khay
                } else {
                    *cf = ControlFlow::Exit;
                }
            }
            Event::UserEvent(Su::Hien) => hien(&cs),
            Event::UserEvent(Su::Khay(TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. })) => {
                if cs.is_visible() && !cs.is_minimized() && cs.is_focused() {
                    cs.set_visible(false);
                } else {
                    hien(&cs);
                }
            }
            Event::UserEvent(Su::Menu(e)) => {
                if e.id == *mo.id() {
                    hien(&cs);
                } else if e.id == *tai.id() {
                    let _ = wv.evaluate_script("location.reload()");
                } else if e.id == *thoat.id() {
                    ghi_log("Thoat han (menu khay)");
                    *cf = ControlFlow::Exit;
                }
            }
            _ => {}
        }
    });
}
