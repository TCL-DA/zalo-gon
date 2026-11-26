//! Lenh tu trang Zalo (binding __otlGonBridgeSend).
//! Lam thang: claude_doc_lay, claude_doc_doi, xuat, mo_chrome.
//! Con lai (trang_thai, trello_*, kho_*, mo_thu_muc) chuyen cho Python `bridge.py --tho`
//! vi dung chung otl_trello / so_kho voi noi khac - khong viet lai 2 ban.

use crate::he_thong::Gio;
use crate::{ghi_log, HERE};
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub const KHONG_CUA_SO: u32 = 0x0800_0000; // CREATE_NO_WINDOW
const CHROME_MAC_DINH: &str = r"C:\Program Files\Google\Chrome\Application\chrome.exe";
const GHI_CHU_CLAUDE: &str =
    "Cuoc tro chuyen Claude (MCP otl-zalo / otl-whatsapp) duoc doc + soan nhap. Doi bang nut 🤖 / Ctrl+Shift+A trong app.";
/// Python nhan roi qua lau thi tat cho nhe may (lan bam sau tu bat lai, mat ~1 s).
pub const THO_NGHI: Duration = Duration::from_secs(600);

pub fn xu_ly(method: &str, data: &Value) -> Result<Value, String> {
    match method {
        "claude_doc_lay" => Ok(json!({ "cho_phep": claude_doc_lay() })),
        "claude_doc_doi" => claude_doc_doi(data),
        "xuat" => xuat(data),
        "mo_chrome" => mo_chrome(data),
        _ => tho_goi(method, data),
    }
}

fn doc_json(p: &Path) -> Result<Value, String> {
    let s = std::fs::read_to_string(p).map_err(|e| format!("{}: {e}", p.display()))?;
    serde_json::from_str(s.trim_start_matches('\u{feff}')).map_err(|e| format!("{}: {e}", p.display()))
}

fn cau_hinh() -> Value {
    doc_json(&HERE.join("cau-hinh.json")).unwrap_or(Value::Null)
}

fn chu(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        o => o.to_string(),
    }
}

fn gon_khoang_trang(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

// ============================== Danh sach cho Claude doc ==============================
fn claude_doc_lay() -> Vec<String> {
    let p = HERE.join("claude-doc.json");
    if !p.is_file() {
        return Vec::new();
    }
    match doc_json(&p) {
        Ok(v) => v["cho_phep"].as_array().map(|a| a.iter().map(chu).collect()).unwrap_or_default(),
        Err(e) => {
            ghi_log("ERROR", &format!("doc claude-doc.json loi: {e}"));
            Vec::new()
        }
    }
}

fn claude_doc_doi(data: &Value) -> Result<Value, String> {
    let ten = gon_khoang_trang(&chu(&data["ten"]));
    if ten.is_empty() {
        return Err("Thiếu tên cuộc trò chuyện".into());
    }
    let mut ds = claude_doc_lay();
    let co = ds.iter().any(|x| gon_khoang_trang(x) == ten);
    if co {
        ds.retain(|x| gon_khoang_trang(x) != ten);
    } else {
        ds.push(ten.clone());
    }
    let p = HERE.join("claude-doc.json");
    let tmp = HERE.join("claude-doc.json.tmp");
    let noi_dung = serde_json::to_string_pretty(&json!({ "_ghi_chu": GHI_CHU_CLAUDE, "cho_phep": ds }))
        .map_err(|e| e.to_string())?;
    std::fs::write(&tmp, noi_dung).map_err(|e| format!("Ghi claude-doc.json lỗi: {e}"))?;
    std::fs::rename(&tmp, &p).map_err(|e| format!("Ghi claude-doc.json lỗi: {e}"))?;
    ghi_log("INFO", &format!("claude_doc {}: {ten}", if co { "bo" } else { "them" }));
    Ok(json!({ "cho_phep": ds, "duoc_phep": !co }))
}

// ============================== Mo link Trello ==============================
fn chrome() -> String {
    let c = chu(&cau_hinh()["duong_dan"]["chrome"]);
    if c.is_empty() { CHROME_MAC_DINH.into() } else { c }
}

fn mo_chrome(data: &Value) -> Result<Value, String> {
    let url = chu(&data["url"]);
    if !url.starts_with("https://trello.com/") {
        return Err("Chỉ mở link Trello".into());
    }
    Command::new(chrome()).arg(&url).spawn().map_err(|e| format!("Không mở được Chrome: {e}"))?;
    Ok(json!({ "ok": true }))
}

// ============================== Luu cuoc tro chuyen ==============================
fn ten_an_toan(name: &str) -> String {
    let mut s = String::new();
    let mut lien = false;
    for c in name.chars() {
        if "\\/:*?\"<>|\r\n\t".contains(c) {
            if !lien {
                s.push(' ');
            }
            lien = true;
        } else {
            s.push(c);
            lien = false;
        }
    }
    let s = gon_khoang_trang(s.trim().trim_matches('.'));
    let s: String = s.chars().take(60).collect();
    if s.is_empty() { "Zalo".into() } else { s }
}

fn thoat_html(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;").replace('\'', "&#x27;")
}

fn xuat(data: &Value) -> Result<Value, String> {
    let cfg_tm = chu(&cau_hinh()["xuat"]["thu_muc"]);
    let folder = if cfg_tm.is_empty() {
        PathBuf::from(std::env::var("USERPROFILE").unwrap_or_default()).join("Documents").join("Zalo-Xuat")
    } else {
        PathBuf::from(cfg_tm)
    };
    std::fs::create_dir_all(&folder).map_err(|e| format!("Không tạo được {}: {e}", folder.display()))?;
    let mut ten = chu(&data["ten"]);
    if ten.is_empty() {
        ten = "Zalo".into();
    }
    let tin = data["tin"].as_array().cloned().unwrap_or_default();
    let now = Gio::bay_gio();
    let base = folder.join(format!("{}_{}", now.yymmdd(), ten_an_toan(&ten)));
    let mut path = base.clone().into_os_string();
    let mut k = 1;
    while Path::new(&format!("{}.md", path.to_string_lossy())).exists()
        || Path::new(&format!("{}.html", path.to_string_lossy())).exists()
    {
        k += 1;
        path = format!("{}_{k}", base.to_string_lossy()).into();
    }
    let path = path.to_string_lossy().to_string();
    let luc = format!("{} {}", now.ngay_vn(), now.hhmm());
    let mut md = vec![format!("# {ten}"), String::new(), format!("Xuất từ Zalo lúc {luc} — {} tin", tin.len()), String::new()];
    let mut rows = Vec::new();
    let mut ngay = None;
    for t in &tin {
        let ms = match &t["ms"] {
            Value::Number(n) => n.as_f64().unwrap_or(0.0) as i64,
            o => chu(o).trim().parse::<f64>().unwrap_or(0.0) as i64,
        };
        let when = Gio::tu_unix_ms(ms).ok_or_else(|| format!("Giờ tin sai: {ms}"))?;
        let mut who = chu(&t["ai"]);
        if who.is_empty() {
            who = ten.clone();
        }
        let body = chu(&t["noi_dung"]);
        if !ngay.is_some_and(|n: Gio| n.cung_ngay(&when)) {
            ngay = Some(when);
            let d = when.ngay_vn();
            md.extend([String::new(), format!("## {d}"), String::new()]);
            rows.push(format!("<h2>{d}</h2>"));
        }
        let gio = when.hhmm();
        md.push(format!("**{gio} — {who}:** {}", body.replace('\n', "  \n")));
        md.push(String::new());
        let me = if who == "Bạn" { " class=\"me\"" } else { "" };
        rows.push(format!(
            "<div{me}><span class=\"t\">{gio}</span> <b>{}</b><br>{}</div>",
            thoat_html(&who),
            thoat_html(&body).replace('\n', "<br>")
        ));
    }
    std::fs::write(format!("{path}.md"), md.join("\n")).map_err(|e| e.to_string())?;
    let page = format!(
        "<!doctype html><meta charset='utf-8'><title>{t}</title><style>\
body{{font:14px/1.5 Segoe UI,Arial,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#1d1f23}}\
h1{{font-size:20px}}h2{{font-size:14px;color:#666;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:22px}}\
div{{margin:8px 0;padding:8px 10px;border-radius:8px;background:#f2f4f7}}div.me{{background:#e3efff}}\
.t{{color:#777;font-size:12px}}@media print{{div{{break-inside:avoid}}}}</style>\
<h1>{t}</h1><p>Xuất từ Zalo lúc {luc} — {n} tin</p>{r}",
        t = thoat_html(&ten),
        n = tin.len(),
        r = rows.concat()
    );
    std::fs::write(format!("{path}.html"), page).map_err(|e| e.to_string())?;
    ghi_log("INFO", &format!("xuat {} tin -> {path}", tin.len()));
    Ok(json!({ "so_tin": tin.len(), "md": format!("{path}.md"), "html": format!("{path}.html") }))
}

// ============================== Tho Python (Trello, so kho) ==============================
struct Tho {
    con: Child,
    vao: ChildStdin,
    /// Dong tra loi do luong doc rieng chuyen sang -> cho duoc co han gio (Python treo khong keo treo ca cau noi).
    ra: Receiver<String>,
    dung_luc: Instant,
}

/// Han cho 1 lenh Python (Trello tao the co the ~10 s). ZALO_GON_THO_GIAY chi de thu.
fn han_tho() -> Duration {
    Duration::from_secs(std::env::var("ZALO_GON_THO_GIAY").ok().and_then(|v| v.parse().ok()).unwrap_or(60))
}

fn doc_ra(ra: ChildStdout, tx: Sender<String>) {
    std::thread::spawn(move || {
        for dong in BufReader::new(ra).lines() {
            let Ok(dong) = dong else { break };
            if tx.send(dong).is_err() {
                break;
            }
        }
    });
}

static THO: Mutex<Option<Tho>> = Mutex::new(None);

fn tim_python() -> PathBuf {
    let goc = PathBuf::from(std::env::var("LOCALAPPDATA").unwrap_or_default()).join("Programs").join("Python");
    let mut ds: Vec<PathBuf> = std::fs::read_dir(&goc)
        .map(|r| r.flatten().map(|e| e.path().join("python.exe")).filter(|p| p.is_file()).collect())
        .unwrap_or_default();
    ds.sort();
    ds.pop().unwrap_or_else(|| PathBuf::from("python.exe"))
}

fn bat_tho() -> Result<Tho, String> {
    let mut con = Command::new(tim_python())
        .args(["-W", "ignore", "bridge.py", "--tho"])
        .current_dir(&*HERE)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .creation_flags(KHONG_CUA_SO)
        .spawn()
        .map_err(|e| format!("Không bật được Python cho Trello/kho: {e}"))?;
    let vao = con.stdin.take().ok_or("thiếu stdin")?;
    let (tx, ra) = mpsc::channel();
    doc_ra(con.stdout.take().ok_or("thiếu stdout")?, tx);
    Ok(Tho { con, vao, ra, dung_luc: Instant::now() })
}

/// Gui 1 lenh cho Python dang song. `Err(None)` = CHUA gui duoc (Python cu da chet) -> an toan de bat Python
/// moi gui lai. `Err(Some(loi))` = da gui roi -> KHONG gui lai (trello_tao co the da tao the, gui lai = the doi).
fn hoi_tho(t: &mut Tho, dong: &str) -> Result<Value, Option<String>> {
    if !matches!(t.con.try_wait(), Ok(None)) {
        return Err(None);
    }
    if t.vao.write_all(dong.as_bytes()).and_then(|_| t.vao.flush()).is_err() {
        return Err(None);
    }
    let tl = match t.ra.recv_timeout(han_tho()) {
        Ok(tl) => tl,
        Err(RecvTimeoutError::Timeout) => {
            return Err(Some(format!("Python quá {} s không trả lời — đã tắt, bấm lại để thử", han_tho().as_secs())))
        }
        Err(RecvTimeoutError::Disconnected) => return Err(Some("Python thoát ngang giữa lệnh — xem bridge.log".into())),
    };
    serde_json::from_str(&tl).map_err(|e| Some(format!("Python trả về sai: {e}")))
}

fn tho_goi(method: &str, data: &Value) -> Result<Value, String> {
    let dong = format!("{}\n", json!({ "method": method, "data": data }));
    let mut g = THO.lock().unwrap_or_else(|p| p.into_inner());
    for _ in 0..2 {
        if g.is_none() {
            *g = Some(bat_tho()?);
        }
        let t = g.as_mut().expect("vua bat");
        match hoi_tho(t, &dong) {
            Ok(rep) => {
                t.dung_luc = Instant::now();
                return if rep["ok"].as_bool() == Some(true) {
                    Ok(rep["data"].clone())
                } else {
                    Err(chu(&rep["loi"]))
                };
            }
            Err(loi) => {
                if let Some(mut cu) = g.take() {
                    let _ = cu.con.kill();
                    let _ = cu.con.wait();
                }
                match loi {
                    None => ghi_log("INFO", "tho Python cu da chet - bat lai roi gui"),
                    Some(e) => {
                        ghi_log("WARNING", &format!("tho Python loi o lenh {method}: {e}"));
                        return Err(e);
                    }
                }
            }
        }
    }
    Err("Không bật được Python cho Trello/kho — xem bridge.log".into())
}

/// Goi dinh ky tu vong chinh: Python ngoi khong qua THO_NGHI thi tat.
pub fn don_tho() {
    if let Ok(mut g) = THO.try_lock() {
        if g.as_ref().is_some_and(|t| t.dung_luc.elapsed() > THO_NGHI) {
            if let Some(mut t) = g.take() {
                let _ = t.con.kill();
                let _ = t.con.wait();
            }
        }
    }
}
