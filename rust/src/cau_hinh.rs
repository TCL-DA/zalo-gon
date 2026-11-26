//! Cau hinh ung dung duoc canh (20/11/2026: them WhatsApp). Doc `ung-dung.json` canh exe;
//! khong co file / thieu khoa thi lay gia tri Zalo (giu nguyen cach chay cu cua zalo-gon.exe).
//! Bien moi truong ZALO_GON_PORT / ZALO_GON_EXE / ZALO_GON_CALL_EXE (chi de thu voi app gia) de len file.

use crate::HERE;
use serde_json::Value;
use std::sync::LazyLock;

pub struct UngDung {
    /// Cong go loi CDP (chi 127.0.0.1)
    pub cong: u16,
    /// Trang chinh = trang co url chua chuoi nay
    pub trang_url_chua: String,
    /// Ten ham trang goi de gui lenh (Runtime.addBinding) / ham tra loi
    pub binding: String,
    pub ham_tra_loi: String,
    /// Bieu thuc JS tra true khi mod da chen
    pub co_mod: String,
    /// Ten tien trinh ung dung / tien trinh cuoc goi (de trong = khong kiem dang goi)
    pub exe: String,
    pub exe_goi: String,
    /// Script chen lai mod (+ mo lai app kem cong neu can), canh exe
    pub chen_lai: String,
    pub mutex_cau_noi: String,
    pub mutex_canh: String,
    pub log_canh: String,
}

fn chuoi(v: &Value, khoa: &str, mac_dinh: &str) -> String {
    v[khoa].as_str().map(String::from).unwrap_or_else(|| mac_dinh.into())
}

fn moi_truong(ten: &str) -> Option<String> {
    std::env::var(ten).ok().filter(|s| !s.is_empty())
}

pub static CFG: LazyLock<UngDung> = LazyLock::new(|| {
    let v: Value = std::fs::read_to_string(HERE.join("ung-dung.json"))
        .ok()
        .and_then(|s| serde_json::from_str(s.trim_start_matches('\u{feff}')).ok())
        .unwrap_or(Value::Null);
    let thu = moi_truong("ZALO_GON_PORT");
    // Ban thu (app gia) doi ten mutex de chay song song ban that
    let duoi = if thu.is_some() { "_thu" } else { "" };
    UngDung {
        cong: thu.and_then(|p| p.parse().ok()).or_else(|| v["cong"].as_u64().map(|c| c as u16)).unwrap_or(9333),
        trang_url_chua: chuoi(&v, "trang_url_chua", "pc-dist/index.html"),
        binding: chuoi(&v, "binding", "__otlGonBridgeSend"),
        ham_tra_loi: chuoi(&v, "ham_tra_loi", "__otlGonBridgeReply"),
        co_mod: chuoi(&v, "co_mod", "!!window.__otlGonG"),
        exe: moi_truong("ZALO_GON_EXE").unwrap_or_else(|| chuoi(&v, "exe", "Zalo.exe")),
        exe_goi: moi_truong("ZALO_GON_CALL_EXE").unwrap_or_else(|| chuoi(&v, "exe_goi", "ZaloCall.exe")),
        chen_lai: chuoi(&v, "chen_lai", "zalo-gon.ps1"),
        mutex_cau_noi: chuoi(&v, "mutex_cau_noi", "Local\\OtlZaloGonBridge") + duoi,
        mutex_canh: chuoi(&v, "mutex_canh", "Global\\OtlZaloCanh") + duoi,
        log_canh: chuoi(&v, "log_canh", "zalo-canh.log"),
    }
});
