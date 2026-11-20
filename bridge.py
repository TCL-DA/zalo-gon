# -*- coding: utf-8 -*-
"""Cau noi Zalo gon <-> may tinh.

Noi vao cong go loi cua Zalo (127.0.0.1:9333, do zalo-gon.ps1 mo), dang ky Runtime.addBinding
'__otlGonBridgeSend'. Trang Zalo goi binding -> o day xu ly -> tra ket qua bang
Runtime.evaluate("window.__otlGonBridgeReply(...)"). Dung binding vi CSP cua Zalo chan fetch toi 127.0.0.1.

Viec lam duoc: chay thu / tao the Trello (otl_trello cua plugin quanly-smb),
luu cuoc tro chuyen ra Markdown + HTML, mo link Trello bang Chrome, mo thu muc da luu.
Trello + So kho goi script rieng cua tung may, khai trong cau-hinh.json muc "duong_dan".
Tu thoat khi Zalo dong. Moi luc chi 1 ban chay (mutex). Nhat ky: bridge.log canh file nay.
"""
import asyncio
import contextlib
import ctypes
import datetime as dt
import html
import io
import json
import logging
import os
import re
import subprocess
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

# websockets: chi che do cau noi cu can (nap o cuoi file) - che do tho cua zalo-gon.exe khong can.

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 9333
BINDING = "__otlGonBridgeSend"
CHROME_MAC_DINH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
LOG = os.path.join(HERE, "bridge.log")

if os.path.exists(LOG) and os.path.getsize(LOG) > 1_000_000:
    os.replace(LOG, LOG + ".cu")
logging.basicConfig(filename=LOG, level=logging.INFO, encoding="utf-8",
                    format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("bridge")


def duong_dan(khoa, mac_dinh=""):
    """Duong dan rieng tung may, khai trong cau-hinh.json muc "duong_dan" (xem cau-hinh.mau.json)."""
    try:
        gt = load_cfg().get("duong_dan", {}).get(khoa, "")
    except Exception:  # noqa: BLE001 - thieu/sai cau hinh thi ve mac dinh
        gt = ""
    return gt or mac_dinh


def chrome():
    return duong_dan("chrome", CHROME_MAC_DINH)


def trong_thu_muc(dd, goc):
    """True khi dd nam trong goc. So theo TUNG DOAN duong dan de "Xuat-khac" khong khop "Xuat"."""
    try:
        a = os.path.normcase(os.path.abspath(dd)).rstrip(os.sep).split(os.sep)
        b = os.path.normcase(os.path.abspath(goc)).rstrip(os.sep).split(os.sep)
    except (OSError, ValueError):
        return False
    return len(a) >= len(b) and a[:len(b)] == b


def load_cfg():
    # utf-8-sig: chiu duoc BOM khi chu may sua file bang Notepad
    with open(os.path.join(HERE, "cau-hinh.json"), encoding="utf-8-sig") as f:
        return json.load(f)


# ============================== Trello ==============================
_trello = None


def trello():
    """Nap otl_trello cua plugin quanly-smb (dung chung dang nhap + luat chan tien/NCC, 4 o dau the)."""
    global _trello
    if _trello is None:
        thu_muc = duong_dan("trello_mcp")
        if not thu_muc:
            raise RuntimeError('Chua khai "duong_dan.trello_mcp" trong cau-hinh.json '
                               '(thu muc chua otl_trello.py). Khong khai thi tat module 70-trello.js.')
        sys.path.insert(0, thu_muc)
        with contextlib.redirect_stdout(io.StringIO()):
            import otl_trello
        _trello = otl_trello
    return _trello


def _tao(data, ghi):
    T = trello()
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            kq = T.tao_the(str(data["board"]), str(data["list"]), str(data["ten"]), str(data.get("mo_ta", "")),
                           (data.get("han_vn") or None), list(data.get("nhan") or []),
                           list(data.get("thanh_vien") or []), data.get("checklist") or None, ghi=ghi)
    except SystemExit as e:                     # TrelloError cua script cu
        return dict(ok=False, loi=[str(e)])
    if not kq.get("ok"):
        return dict(ok=False, loi=kq.get("loi") or ["Không rõ lỗi"])
    log.info("trello %s %s", "TAO" if ghi else "chay thu", kq.get("url") or kq.get("ten"))
    return kq


# ============================== Luu cuoc tro chuyen ==============================
def _safe(name):
    s = re.sub(r'[\\/:*?"<>|\r\n\t]+', " ", name).strip().strip(".")
    return re.sub(r"\s+", " ", s)[:60] or "Zalo"


def do_xuat(data):
    folder = load_cfg().get("xuat", {}).get("thu_muc") or os.path.join(os.path.expanduser("~"), "Documents", "Zalo-Xuat")
    os.makedirs(folder, exist_ok=True)
    ten = str(data.get("ten") or "Zalo")
    tin = data.get("tin") or []
    base = os.path.join(folder, f"{dt.datetime.now():%y%m%d}_{_safe(ten)}")
    k, path = 1, base
    while os.path.exists(path + ".md") or os.path.exists(path + ".html"):
        k += 1
        path = f"{base}_{k}"
    md = [f"# {ten}", "", f"Xuất từ Zalo lúc {dt.datetime.now():%d/%m/%Y %H:%M} — {len(tin)} tin", ""]
    rows, day = [], None
    for t in tin:
        when = dt.datetime.fromtimestamp(int(t["ms"]) / 1000)
        who = t.get("ai") or ten
        body = str(t.get("noi_dung", ""))
        if when.date() != day:
            day = when.date()
            md += ["", f"## {when:%d/%m/%Y}", ""]
            rows.append(f'<h2>{when:%d/%m/%Y}</h2>')
        md.append(f"**{when:%H:%M} — {who}:** " + body.replace("\n", "  \n"))
        md.append("")
        me = ' class="me"' if who == "Bạn" else ""
        rows.append(f'<div{me}><span class="t">{when:%H:%M}</span> <b>{html.escape(who)}</b><br>'
                    f'{html.escape(body).replace(chr(10), "<br>")}</div>')
    with open(path + ".md", "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    page = ("<!doctype html><meta charset='utf-8'><title>" + html.escape(ten) + "</title><style>"
            "body{font:14px/1.5 Segoe UI,Arial,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#1d1f23}"
            "h1{font-size:20px}h2{font-size:14px;color:#666;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:22px}"
            "div{margin:8px 0;padding:8px 10px;border-radius:8px;background:#f2f4f7}div.me{background:#e3efff}"
            ".t{color:#777;font-size:12px}@media print{div{break-inside:avoid}}</style>"
            f"<h1>{html.escape(ten)}</h1><p>Xuất từ Zalo lúc {dt.datetime.now():%d/%m/%Y %H:%M} — {len(tin)} tin</p>"
            + "".join(rows))
    with open(path + ".html", "w", encoding="utf-8") as f:
        f.write(page)
    log.info("xuat %s tin -> %s", len(tin), path)
    return dict(so_tin=len(tin), md=path + ".md", html=path + ".html")


# ============================== So kho vat tu dien (so_kho.py rieng, xem duong_dan.so_kho) ==============================
_kho = None


def kho():
    global _kho
    if _kho is None:
        thu_muc = duong_dan("so_kho")
        if not thu_muc:
            raise RuntimeError('Chua khai "duong_dan.so_kho" trong cau-hinh.json '
                               '(thu muc chua so_kho.py). Khong khai thi tat module 85-kho.js.')
        sys.path.insert(0, thu_muc)
        import so_kho
        _kho = so_kho
    return _kho


def kho_lenh(method, data):
    K = kho()
    if method == "kho_tim":
        return dict(ket_qua=K.tim(str(data.get("q", "")), int(data.get("gioi_han", 30))))
    if method == "kho_goi_y":
        return K.goi_y(str(data.get("text", "")))
    if method == "kho_luu":
        kq = K.luu_phieu(data)
        log.info("kho phieu %s %s dong", kq["so"], len(kq["dong"]))
        return kq
    if method == "kho_lich_su":
        return dict(lich_su=K.lich_su(str(data.get("sku", ""))))
    if method == "kho_bao_cao":
        return K.bao_cao()
    if method == "kho_quet":
        return K.quet(str(data.get("code", "")))
    if method == "kho_gan_ma":
        return K.gan_ma_vach(str(data.get("code", "")), str(data.get("sku", "")))
    if method == "kho_in_tem":
        kq = K.in_tem(list(data.get("skus") or []) or None, chi_co_ton=bool(data.get("chi_co_ton")))
        subprocess.Popen([chrome(), kq["file"]])            # chu may: HTML/PDF luon mo bang Chrome
        return kq
    raise ValueError(f"Không có lệnh {method}")


# ============================== Danh sach cho Claude doc ==============================
CLAUDE_DOC = os.path.join(HERE, "claude-doc.json")


def claude_doc_lay():
    if not os.path.isfile(CLAUDE_DOC):
        return dict(cho_phep=[])
    with open(CLAUDE_DOC, encoding="utf-8-sig") as f:
        return dict(cho_phep=[str(x) for x in json.load(f).get("cho_phep", [])])


def claude_doc_doi(data):
    """Bat/tat 1 ten trong danh sach cho phep (so ten bo khoang trang thua)."""
    ten = re.sub(r"\s+", " ", str(data.get("ten", ""))).strip()
    if not ten:
        raise ValueError("Thiếu tên cuộc trò chuyện")
    ds = claude_doc_lay()["cho_phep"]
    co = [x for x in ds if re.sub(r"\s+", " ", x).strip() == ten]
    ds = [x for x in ds if x not in co] if co else ds + [ten]
    tmp = CLAUDE_DOC + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"_ghi_chu": "Cuoc tro chuyen Claude (MCP otl-zalo) duoc doc + soan nhap. Doi bang Ctrl+Shift+A trong Zalo.",
                   "cho_phep": ds}, f, ensure_ascii=False, indent=2)
    os.replace(tmp, CLAUDE_DOC)
    log.info("claude_doc %s: %s", "bo" if co else "them", ten)
    return dict(cho_phep=ds, duoc_phep=not co)


# ============================== Dieu phoi ==============================
def handle(method, data):
    if method == "trang_thai":
        st = dict(trello=False, thu_muc_xuat=load_cfg().get("xuat", {}).get("thu_muc", ""))
        try:
            trello()
            st["trello"] = True
        except Exception as e:  # noqa: BLE001 - chi bao trang thai
            st["trello_loi"] = f"{type(e).__name__}: {e}"
        return st
    if method.startswith("kho_"):
        return kho_lenh(method, data)
    if method == "claude_doc_lay":
        return claude_doc_lay()
    if method == "claude_doc_doi":
        return claude_doc_doi(data)
    if method == "trello_chay_thu":
        return _tao(data, ghi=False)
    if method == "trello_tao":
        return _tao(data, ghi=True)
    if method == "xuat":
        return do_xuat(data)
    if method == "mo_chrome":
        url = str(data.get("url", ""))
        if not re.match(r"^https://trello\.com/", url):
            raise ValueError("Chỉ mở link Trello")
        subprocess.Popen([chrome(), url])
        return dict(ok=True)
    if method == "mo_thu_muc":
        # Chi mo trong thu muc luu cuoc tro chuyen hoac thu muc bao cao so kho
        goc = [load_cfg().get("xuat", {}).get("thu_muc", "")]
        try:
            goc.append(os.path.join(kho().SO_KHO, "BaoCao"))
        except Exception:  # noqa: BLE001 - chua khai so kho thi chi con thu muc xuat
            pass
        dd = os.path.abspath(str(data.get("duong_dan", "")))
        if not os.path.exists(dd) or not any(trong_thu_muc(dd, g) for g in goc if g):
            raise ValueError("Chỉ mở được thư mục lưu cuộc trò chuyện / báo cáo kho")
        subprocess.Popen(["explorer", "/select,", dd])
        return dict(ok=True)
    raise ValueError(f"Không có lệnh {method}")


def find_page():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=3) as r:
        targets = json.load(r)
    for t in targets:
        if t.get("type") == "page" and "pc-dist/index.html" in t.get("url", ""):
            return t["webSocketDebuggerUrl"]
    return None


async def wait_page(seconds=90):
    """Cho trang chinh Zalo hien tren cong go loi; het gio thi tra None (= Zalo da tat that)."""
    for _ in range(seconds):
        try:
            url = find_page()
        except OSError:
            url = None
        if url:
            return url
        await asyncio.sleep(1)
    return None


async def run():
    # Ket noi CDP co the rot trong khi Zalo van chay (20/11/2026: rot luc 09:01, trang van nguyen
    # -> cau noi thoat, nut 🤖 / sua tieng Anh / Trello im lang). Nen: rot thi noi lai,
    # chi thoat khi trang chinh bien mat khoi cong 90 s (Zalo tat that).
    pool = ThreadPoolExecutor(max_workers=4)
    lan = 0
    while True:
        url = await wait_page()
        if not url:
            if lan == 0:
                log.error("Khong thay trang chinh Zalo tren cong %s", PORT)
            else:
                log.info("Zalo da dong - cau noi thoat")
            return
        if lan:
            log.info("Ket noi rot nhung Zalo van chay - noi lai")
        lan += 1
        try:
            await serve(url, pool)
        except (OSError, websockets.InvalidHandshake, websockets.ConnectionClosed) as e:
            log.warning("Ket noi Zalo loi: %s", e)
        await asyncio.sleep(2)


async def serve(url, pool):
    loop = asyncio.get_running_loop()
    async with websockets.connect(url, max_size=None, ping_interval=None) as ws:
        seq = 0

        async def send(method, params=None):
            nonlocal seq
            seq += 1
            await ws.send(json.dumps({"id": seq, "method": method, "params": params or {}}))

        async def work(payload):
            try:
                req = json.loads(payload)
            except json.JSONDecodeError:
                return
            rid = req.get("id")
            try:
                data = await loop.run_in_executor(pool, handle, str(req.get("method")), req.get("data") or {})
                reply = dict(id=rid, ok=True, data=data)
            except Exception as e:  # noqa: BLE001 - moi loi deu tra ve trang de hien cho nguoi dung
                log.exception("lenh %s loi", req.get("method"))
                reply = dict(id=rid, ok=False, loi=str(e) or type(e).__name__)
            expr = "window.__otlGonBridgeReply && window.__otlGonBridgeReply(" + json.dumps(reply, ensure_ascii=True) + ")"
            await send("Runtime.evaluate", {"expression": expr})

        await send("Runtime.enable")
        await send("Runtime.addBinding", {"name": BINDING})
        log.info("Da noi vao Zalo: %s", url)
        try:
            async for raw in ws:
                msg = json.loads(raw)
                if msg.get("method") == "Runtime.bindingCalled" and msg["params"].get("name") == BINDING:
                    asyncio.create_task(work(msg["params"].get("payload", "")))
        except websockets.ConnectionClosed:
            pass                                   # rot ket noi -> run() kiem Zalo con chay khong
    log.info("Mat ket noi trang Zalo")


def single_instance():
    ctypes.windll.kernel32.CreateMutexW(None, False, "Local\\OtlZaloGonBridge")
    return ctypes.windll.kernel32.GetLastError() != 183      # ERROR_ALREADY_EXISTS


def tho():
    """Che do tho cho zalo-gon.exe (Rust): moi dong stdin = 1 lenh JSON {method, data},
    tra 1 dong JSON {ok, data | loi} ra stdout. Chi phuc vu lenh can Python (Trello, so kho)."""
    out = sys.stdout
    sys.stdout = sys.stderr                        # print lac cua otl_trello / so_kho khong lam ban kenh
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            rep = dict(ok=True, data=handle(str(req.get("method")), req.get("data") or {}))
        except Exception as e:  # noqa: BLE001 - moi loi deu tra ve trang
            log.exception("lenh tho loi")
            rep = dict(ok=False, loi=str(e) or type(e).__name__)
        out.write(json.dumps(rep, ensure_ascii=True) + "\n")
        out.flush()


if __name__ == "__main__":
    if "--tho" in sys.argv:
        tho()
        sys.exit(0)
    import websockets  # noqa: E402 - gan vao bien toan cuc cua module
    if not single_instance():
        sys.exit(0)
    try:
        asyncio.run(run())
    except Exception:  # noqa: BLE001
        log.exception("cau noi dung vi loi")
