//! zalo-gon.exe — nguoi canh + cau noi Zalo gon (thay zalo-canh.ps1 + bridge.py, 20/11/2026).
//!
//! - Giu 1 ket noi CDP toi trang chinh Zalo (127.0.0.1:9333), dang ky binding '__otlGonBridgeSend'.
//!   Trang goi binding -> lenh.rs xu ly -> tra bang window.__otlGonBridgeReply(...).
//! - Tu 20/11/2026 dung chung cho WhatsApp: chep exe sang thu muc khac kem ung-dung.json (cau_hinh.rs).
//! - Ket noi rot ma Zalo van chay -> tu noi lai (loi 20/11: bridge.py coi rot = Zalo tat, thoat luon).
//! - Moi 8 s: Zalo chay ma mat cong / mat mod -> goi zalo-gon.ps1 chen lai (hoan khi dang goi).
//! - Moi luc 1 ban. Nhat ky: bridge.log (cau noi) + zalo-canh.log (chen lai), nhu ban cu.
#![windows_subsystem = "windows"]

mod cau_hinh;
mod he_thong;
mod lenh;

use cau_hinh::CFG;

use serde_json::{json, Value};
use std::io::{ErrorKind, Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, LazyLock};
use std::time::{Duration, Instant};
use tungstenite::stream::MaybeTlsStream;
use tungstenite::{Message, WebSocket};

const CHU_KY: u64 = 8; // giay giua 2 lan kiem

pub static HERE: LazyLock<PathBuf> = LazyLock::new(|| {
    std::env::current_exe().ok().and_then(|p| p.parent().map(PathBuf::from)).unwrap_or_else(|| PathBuf::from("."))
});

fn ghi_vao(file: &str, dong: &str) {
    let p = HERE.join(file);
    if std::fs::metadata(&p).map(|m| m.len() > 1_000_000).unwrap_or(false) {
        let _ = std::fs::rename(&p, HERE.join(format!("{file}.cu")));
    }
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&p) {
        let _ = writeln!(f, "{dong}");
    }
}

/// Dong nhat ky bridge.log, cung dang voi ban Python cu.
pub fn ghi_log(muc: &str, msg: &str) {
    let g = he_thong::Gio::bay_gio();
    ghi_vao("bridge.log", &format!("{},{:03} {muc} {msg}", g.day_du(), g.ms));
}

fn ghi_canh(msg: &str) {
    ghi_vao(&CFG.log_canh, &format!("{}  {msg}", he_thong::Gio::bay_gio().day_du()));
}

/// GET /json cua cong go loi -> webSocketDebuggerUrl cua trang chinh (url chua CFG.trang_url_chua).
fn tim_trang() -> Option<String> {
    let addr = ("127.0.0.1", CFG.cong).to_socket_addrs().ok()?.next()?;
    let mut s = TcpStream::connect_timeout(&addr, Duration::from_secs(2)).ok()?;
    s.set_read_timeout(Some(Duration::from_secs(3))).ok()?;
    write!(s, "GET /json HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nConnection: close\r\n\r\n", CFG.cong).ok()?;
    let mut buf = Vec::new();
    let _ = s.read_to_end(&mut buf);
    let txt = String::from_utf8_lossy(&buf);
    let body = txt.split_once("\r\n\r\n")?.1;
    let ds: Value = serde_json::from_str(body).ok()?;
    ds.as_array()?.iter().find_map(|t| {
        let la_chinh = t["type"] == "page" && t["url"].as_str().is_some_and(|u| u.contains(CFG.trang_url_chua.as_str()));
        if la_chinh { t["webSocketDebuggerUrl"].as_str().map(String::from) } else { None }
    })
}

struct KetNoi {
    ws: WebSocket<MaybeTlsStream<TcpStream>>,
    seq: u64,
    id_kiem: Option<u64>,
}

impl KetNoi {
    fn mo(url: &str) -> Result<Self, String> {
        let (mut ws, _) = tungstenite::connect(url).map_err(|e| e.to_string())?;
        if let MaybeTlsStream::Plain(s) = ws.get_mut() {
            // Vong doc thuc moi 50 ms de gui tra loi lenh kip (200 ms thi nut bam thay tre).
            let _ = s.set_read_timeout(Some(Duration::from_millis(50)));
            let _ = s.set_nodelay(true);
        }
        let mut k = KetNoi { ws, seq: 0, id_kiem: None };
        k.gui("Runtime.enable", json!({}))?;
        k.gui("Runtime.addBinding", json!({ "name": CFG.binding }))?;
        Ok(k)
    }

    fn gui(&mut self, method: &str, params: Value) -> Result<u64, String> {
        self.seq += 1;
        let m = json!({ "id": self.seq, "method": method, "params": params }).to_string();
        self.ws.send(Message::text(m)).map_err(|e| e.to_string())?;
        Ok(self.seq)
    }

    fn danh_gia(&mut self, expr: &str) -> Result<u64, String> {
        self.gui("Runtime.evaluate", json!({ "expression": expr, "returnByValue": true }))
    }
}

/// Bieu thuc tra loi cho trang (giong bridge.py cu).
fn bieu_thuc_tra_loi(rid: &Value, kq: Result<Value, String>) -> String {
    let rep = match kq {
        Ok(d) => json!({ "id": rid, "ok": true, "data": d }),
        Err(e) => json!({ "id": rid, "ok": false, "loi": e }),
    };
    let h = &CFG.ham_tra_loi;
    format!("window.{h} && window.{h}({rep})")
}

fn lam_lenh(payload: String, tx: Sender<String>) {
    std::thread::spawn(move || {
        let Ok(req) = serde_json::from_str::<Value>(&payload) else { return };
        let method = req["method"].as_str().unwrap_or("").to_string();
        let data = if req["data"].is_null() { json!({}) } else { req["data"].clone() };
        let kq = lenh::xu_ly(&method, &data);
        if let Err(e) = &kq {
            ghi_log("ERROR", &format!("lenh {method} loi: {e}"));
        }
        let _ = tx.send(bieu_thuc_tra_loi(&req["id"], kq));
    });
}

/// Chay zalo-gon.ps1 (mo lai Zalo kem cong neu can + chen mod) o luong rieng, khong chan vong chinh.
fn chen_lai(dang_chen: &Arc<AtomicBool>, hong: &Arc<AtomicU32>) {
    if dang_chen.swap(true, Ordering::SeqCst) {
        return;
    }
    let (dc, h) = (dang_chen.clone(), hong.clone());
    std::thread::spawn(move || {
        let ps1 = HERE.join(&CFG.chen_lai);
        let ok = Command::new(r"C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe")
            .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File"])
            .arg(&ps1)
            .current_dir(&*HERE)
            .creation_flags(lenh::KHONG_CUA_SO)
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if ok {
            ghi_canh(&format!("Da chen lai mod ({} duoc mo khong qua loi tat / mat mod)", CFG.exe));
            h.store(0, Ordering::SeqCst);
        } else {
            let n = h.fetch_add(1, Ordering::SeqCst) + 1;
            ghi_canh(&format!("Chen khong duoc (lan {n})"));
        }
        dc.store(false, Ordering::SeqCst);
    });
}

fn la_het_gio(e: &tungstenite::Error) -> bool {
    matches!(e, tungstenite::Error::Io(io) if matches!(io.kind(), ErrorKind::WouldBlock | ErrorKind::TimedOut))
}

fn main() {
    // Zalo: cung ten mutex voi bridge.py + zalo-canh.ps1 cu -> ban cu (neu ai lo bat) tu thoat, khong dang ky
    // trung binding. App khac dat mutex rieng trong ung-dung.json. Ban thu (ZALO_GON_PORT) them duoi "_thu".
    if !he_thong::giu_mutex(&CFG.mutex_cau_noi) || !he_thong::giu_mutex(&CFG.mutex_canh) {
        return;
    }
    ghi_log("INFO", &format!("nguoi canh + cau noi (Rust) khoi dong - {} cong {}", CFG.exe, CFG.cong));
    let (tx, rx) = mpsc::channel::<String>();
    let dang_chen = Arc::new(AtomicBool::new(false));
    let hong = Arc::new(AtomicU32::new(0));
    let mut kn: Option<KetNoi> = None;
    let mut lan_kiem = Instant::now() - Duration::from_secs(3600);
    let mut vang_trang = 0u32; // so lan kiem lien tiep Zalo chay ma khong thay trang tren cong
    let mut zalo_chay = true; // trang thai lan kiem truoc (de ghi nhat ky khi Zalo tat / mo)

    loop {
        // ---- Kiem dinh ky (gian cach tang dan khi hong lien tiep, toi da 5 phut)
        let cach = (CHU_KY * u64::from(hong.load(Ordering::SeqCst).max(1))).min(300);
        if lan_kiem.elapsed() >= Duration::from_secs(cach) {
            lan_kiem = Instant::now();
            lenh::don_tho();
            let zalo = !he_thong::pid_theo_ten(&CFG.exe).is_empty();
            // Ghi theo chuyen trang thai (ket noi thuong rot TRUOC luc kiem -> dua vao kn thi khong ghi duoc gi)
            if zalo != zalo_chay {
                ghi_log("INFO", &if zalo { format!("{} mo lai", CFG.exe) } else { format!("{} da dong - cho mo lai (khong tu mo)", CFG.exe) });
                zalo_chay = zalo;
            }
            if !zalo {
                vang_trang = 0;
                kn = None;
            } else if !(!CFG.exe_goi.is_empty() && he_thong::dang_goi(&CFG.exe_goi)) && !dang_chen.load(Ordering::SeqCst) {
                if kn.is_none() {
                    match tim_trang() {
                        Some(url) => match KetNoi::mo(&url) {
                            Ok(k) => {
                                ghi_log("INFO", &format!("Da noi vao {}: {url}", CFG.exe));
                                kn = Some(k);
                            }
                            Err(e) => ghi_log("WARNING", &format!("Noi {} loi: {e}", CFG.exe)),
                        },
                        None => {
                            // Zalo chay ma khong co trang tren cong = mo kieu thuong -> mo lai kem cong.
                            // PHAI thay 2 lan lien tiep (cach CHU_KY): Zalo dang tat do cung "con tien trinh,
                            // mat cong" -> 1 lan da goi thi tu mo lai Zalo nguoi dung vua tat.
                            vang_trang += 1;
                            if vang_trang >= 2 {
                                vang_trang = 0;
                                chen_lai(&dang_chen, &hong);
                            }
                        }
                    }
                    if kn.is_some() {
                        vang_trang = 0;
                    }
                }
                if let Some(k) = kn.as_mut() {
                    match k.danh_gia(&CFG.co_mod) {
                        Ok(id) => k.id_kiem = Some(id),
                        Err(e) => {
                            ghi_log("WARNING", &format!("Mat ket noi trang {}: {e}", CFG.exe));
                            kn = None;
                        }
                    }
                }
            }
        }

        // ---- Doc su kien CDP
        let Some(k) = kn.as_mut() else {
            std::thread::sleep(Duration::from_millis(500));
            continue;
        };
        match k.ws.read() {
            Ok(Message::Text(t)) => {
                let Ok(msg) = serde_json::from_str::<Value>(t.as_str()) else { continue };
                if msg["method"] == "Runtime.bindingCalled" && msg["params"]["name"] == CFG.binding.as_str() {
                    lam_lenh(msg["params"]["payload"].as_str().unwrap_or("").to_string(), tx.clone());
                } else if msg["method"] == "Runtime.executionContextsCleared" {
                    lan_kiem = Instant::now() - Duration::from_secs(CHU_KY - 3); // trang nap lai -> kiem mod som
                } else if k.id_kiem.is_some() && msg["id"].as_u64() == k.id_kiem {
                    k.id_kiem = None;
                    if msg["result"]["result"]["value"] != Value::Bool(true) {
                        chen_lai(&dang_chen, &hong);
                    } else {
                        hong.store(0, Ordering::SeqCst);
                    }
                }
            }
            Ok(Message::Close(_)) => {
                ghi_log("INFO", &format!("Mat ket noi trang {} - se noi lai", CFG.exe));
                kn = None;
                lan_kiem = Instant::now() - Duration::from_secs(CHU_KY - 2);
                continue;
            }
            Ok(_) => {}
            Err(e) if la_het_gio(&e) => {}
            Err(e) => {
                ghi_log("INFO", &format!("Mat ket noi trang {} ({e}) - se noi lai", CFG.exe));
                kn = None;
                lan_kiem = Instant::now() - Duration::from_secs(CHU_KY - 2);
                continue;
            }
        }

        // ---- Gui tra loi cho cac lenh da xong
        while let Ok(expr) = rx.try_recv() {
            if let Err(e) = k.gui("Runtime.evaluate", json!({ "expression": expr })) {
                ghi_log("WARNING", &format!("Tra loi trang loi: {e}"));
                kn = None;
                break;
            }
        }
    }
}
