# -*- coding: utf-8 -*-
"""MCP otl-zalo: Claude doc tin Zalo + soan NHAP cau tra loi (KHONG gui).

Doc qua cua so Zalo dang mo bang loi tat Zalo gon (cong go loi 127.0.0.1:9333), dung cac ham
window.__otlGonG cua Zalo gon. File du lieu Zalo tren dia bi ma hoa -> khong doc file.
Chi cuoc tro chuyen co ten trong claude-doc.json (bat bang Ctrl+Shift+A / nut 🤖 trong Zalo).
MCP nay de TAT mac dinh trong ~/.claude.json - bat bang /mcp khi can (yeu cau chu may 19/10/2026).
"""
import asyncio
import datetime as dt
import json
import os
import re
import urllib.request

import websockets
try:                                        # mcp >= 2.0: FastMCP doi ten thanh MCPServer
    from mcp.server.mcpserver import MCPServer as _Server
    from mcp.server.mcpserver.exceptions import ToolError as _Loi
except ImportError:                         # mcp 1.x (ten cu)
    from mcp.server.fastmcp import FastMCP as _Server
    from mcp.server.fastmcp.exceptions import ToolError as _Loi
# mcp 2.x: loi KHAC ToolError bi coi la sap -> Claude chi thay "Error executing tool ..." (khong ro ly do,
# khong biet nhac chu may bam 🤖). Moi loi luong truoc phai la _Loi (20/11/2026).

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 9333
ALLOW_FILE = os.path.join(HERE, "claude-doc.json")

mcp = _Server("otl-zalo", instructions=(
    "Đọc tin Zalo của chủ máy và soạn NHÁP câu trả lời vào ô nhập — không có lệnh gửi, chủ máy tự bấm Enter. "
    "Chỉ cuộc trò chuyện có dấu 🤖 (danh sách cho phép) mới đọc được; cuộc khác bị từ chối, đừng tìm cách vòng. "
    "Đọc tin = mở cuộc đó trong Zalo nên người kia thấy 'đã xem'. Trả lời khách nước ngoài theo skill sale-otl; "
    "không bịa giá, thông số, ngày giao — chưa rõ thì soạn câu hỏi lại hoặc để chủ máy điền."))


def _norm(s):
    return re.sub(r"\s+", " ", str(s)).strip()


def allowed_names():
    if not os.path.isfile(ALLOW_FILE):
        return []
    with open(ALLOW_FILE, encoding="utf-8-sig") as f:      # chiu duoc BOM (Notepad / PowerShell 5.1 ghi kem)
        return [_norm(x) for x in json.load(f).get("cho_phep", [])]


def check_allowed(ten):
    names = allowed_names()
    if _norm(ten) not in names:
        raise _Loi(f"«{ten}» không có trong danh sách cho phép. Chủ máy mở cuộc đó trong Zalo và bấm nút 🤖 "
                         f"(hoặc Ctrl+Shift+A). Đang cho phép: {', '.join(names) or '(chưa có cuộc nào)'}")


def _page_ws_url():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=3) as r:
            targets = json.load(r)
    except OSError:
        # 26/11/2026: Zalo 26.11.20 tu chan cong go loi; zalo-gon.ps1 ghi "<phien ban>=1" vao chan-go-loi.txt
        chan = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chan-go-loi.txt")
        if os.path.exists(chan):
            with open(chan, encoding="ascii", errors="ignore") as f:
                if "=1" in f.read():
                    raise _Loi("Không thấy cổng 9333: từ bản 26.11.20 Zalo tự chặn cổng gỡ lỗi (anti-debug), máy chủ "
                               "không cho chạy bản cũ — Claude không đọc được Zalo. Nhờ chủ máy dán ảnh chụp.")
        raise _Loi("Zalo chưa mở bằng lối tắt Zalo gọn (không thấy cổng 9333). Mở Zalo từ ô Zalo trong Start.")
    url = next((t["webSocketDebuggerUrl"] for t in targets
                if t.get("type") == "page" and "pc-dist/index.html" in t.get("url", "")), None)
    if not url:
        raise _Loi("Không thấy cửa sổ chính của Zalo")
    return url


def _ket_qua(res):
    r = res.get("result", {})
    if r.get("exceptionDetails"):
        raise _Loi("Lỗi trong Zalo: " + json.dumps(r["exceptionDetails"].get("exception", {}).get("description", ""))[:300])
    val = r.get("result", {}).get("value")
    out = json.loads(val) if isinstance(val, str) else val
    if isinstance(out, dict) and out.get("loi"):
        raise _Loi(out["loi"])
    return out


async def _cdp_session(work, focus=False, timeout=60):
    """Mo 1 phien CDP voi cua so chinh Zalo, chay `await work(call, ev)`; focus=True gia lap cua so dang duoc chon."""
    async with websockets.connect(_page_ws_url(), max_size=None, ping_interval=None) as ws:
        seq = 0

        async def call(method, params=None):
            nonlocal seq
            seq += 1
            my = seq
            await ws.send(json.dumps({"id": my, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout))
                if msg.get("id") == my:
                    return msg

        async def ev(expression):
            return _ket_qua(await call("Runtime.evaluate",
                                       {"expression": expression, "returnByValue": True, "awaitPromise": True}))

        if focus:
            await call("Emulation.setFocusEmulationEnabled", {"enabled": True})
        try:
            return await work(call, ev)
        finally:
            if focus:
                await call("Emulation.setFocusEmulationEnabled", {"enabled": False})

async def cdp_session(work, focus=False, timeout=60):
    """Nhu _cdp_session nhung doi loi ket noi / het gio thanh _Loi co cau de hieu (mcp 2.x giau loi khac)."""
    try:
        return await _cdp_session(work, focus, timeout)
    except _Loi:
        raise
    except (asyncio.TimeoutError, TimeoutError):
        raise _Loi(f"Zalo không trả lời quá {timeout} s (đang bận / treo?) — thử lại sau ít giây.")
    except (OSError, websockets.ConnectionClosed) as e:
        raise _Loi(f"Mất kết nối với Zalo giữa chừng ({type(e).__name__}) — Zalo vừa tắt/mở lại? Gọi lại.")


async def cdp_eval(expression, focus=False, timeout=60):
    """Chay JS trong cua so chinh Zalo; focus=True gia lap cua so dang duoc chon (de chen chu vao o nhap)."""
    async def work(call, ev):
        return await ev(expression)
    return await cdp_session(work, focus, timeout)


# Doc 1 tin (dung chung zalo_doc + zalo_xuat). 23/11/2026: (1) ten nguoi gui o .message-sender-name-content (Zalo chen chu 'a'
# an truoc ten); (2) tin Zalo khong gan [data-component=message-text-content] (tra loi / trich dan / tin cu) bi readBubble
# cat con 80 ky tu trong [...] -> lay lai DAY DU, tach phan trich dan; (3) ghi dia chi anh de chep/tai ve.
JS_DOC = r"""
const doc = b => {
  const r = G.readBubble(b); if (!r) return r;
  const nm = b.querySelector('.message-sender-name-content');
  if (nm && r.ai !== 'Bạn') r.ai = G.txt(nm);
  // Tin o xa man hinh: innerText tra rong -> readBubble roi vao nhanh cat 80 ky tu '[...]'. Doc lai bang textContent.
  if (/^\[/.test(r.noi_dung) && !/^\[(Hình ảnh|Video|Tệp)/.test(r.noi_dung)) {
    const q = b.querySelector('[class*="quote"]');
    const quote = q ? (q.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const tEl = [...b.querySelectorAll(G.SEL.msgText)].find(e => !e.closest('[class*="quote"]'));
    let t = '';
    if (tEl) t = (tEl.innerText || '').trim() || (tEl.textContent || '').replace(/\s+/g, ' ').trim();
    else {
      const c = b.cloneNode(true);
      c.querySelectorAll('.message-reaction-container, .card-send-time, .message-sender-name-wrapper, .opacity-0, [class*="quote"]')
        .forEach(e => e.remove());
      t = (c.textContent || '').replace(/\s+/g, ' ').trim();
    }
    if (t) r.noi_dung = (quote ? '[trả lời: ' + quote.slice(0, 160) + '] ' : '') + t;
    else if (quote) r.noi_dung = '[trả lời: ' + quote.slice(0, 160) + ']';
  }
  const anh = [...b.querySelectorAll('img.zimg-el')].map(i => i.currentSrc || i.src || i.getAttribute('data-src') || '')
    .filter(x => x && !x.startsWith('data:'));
  if (anh.length) r.anh = [...new Set(anh)];
  return r;
};
"""


# Mo cuoc tro chuyen theo ten (cuon danh sach tim neu dang khuat), cho tieu de khop
JS_OPEN = r"""
const G = window.__otlGonG, wait = ms => new Promise(r => setTimeout(r, ms));
if (!G) return JSON.stringify({loi: 'Zalo chưa có Zalo gọn — mở lại Zalo từ lối tắt'});
const bubbleIds = () => Array.from(document.querySelectorAll(G.SEL.bubble), b => b.id);
async function openChat(name) {
  // Danh sach cho phep ghi theo TEN -> hai cuoc trung ten thi khong ro cuoc nao duoc phep.
  // Nguoi ngoai dat duoc ten nhom / biet danh, nen trung ten la tu choi, khong doan.
  const trung = () => G.items().filter(i => G.sameName(i.name, name)).length;
  if (G.sameName(G.currentChat().name, name)) {
    if (trung() > 1) return { ok: false, loi: 'Có ' + trung() + ' cuộc trùng tên «' + name + '» trong danh sách — '
      + 'không rõ cuộc nào được phép. Chủ máy đặt tên/biệt danh khác nhau rồi gọi lại.' };
    return { ok: true };
  }
  const old = new Set(bubbleIds());
  let it = G.findItem(name);
  const grid = document.getElementById('conversationList'), list = grid && grid.parentElement;  // khung cuon that
  if (!it && list) {
    list.scrollTop = 0; await wait(250);
    for (let k = 0; k < 80 && !(it = G.findItem(name)); k++) {
      const before = list.scrollTop; list.scrollTop += 500; await wait(160);
      if (list.scrollTop === before) break;
    }
  }
  if (!it) return { ok: false, loi: 'Không thấy «' + name + '» trong danh sách' };
  if (trung() > 1) return { ok: false, loi: 'Có ' + trung() + ' cuộc trùng tên «' + name + '» trong danh sách — '
    + 'không rõ cuộc nào được phép. Chủ máy đặt tên/biệt danh khác nhau rồi gọi lại.' };
  G.openItem(it);
  for (let k = 0; k < 30; k++) { await wait(100); if (G.sameName(G.currentChat().name, name)) break; }
  if (list) list.scrollTop = 0;
  if (!G.sameName(G.currentChat().name, name)) return { ok: false, loi: 'Mở «' + name + '» không ăn' };
  // Tieu de doi TRUOC khung tin -> cho tin cua cuoc cu bien mat het moi doc (19/10: lan tin nhom khong duoc phep)
  for (let k = 0; k < 50 && bubbleIds().some(i => old.has(i)); k++) await wait(100);
  await wait(300);
  if (!G.sameName(G.currentChat().name, name) || bubbleIds().some(i => old.has(i)))
    return { ok: false, loi: 'Mở «' + name + '» chưa xong (tin của cuộc cũ còn trên màn hình)' };
  return { ok: true };
}
"""


@mcp.tool()
async def zalo_danh_sach() -> str:
    """Các cuộc trò chuyện ĐƯỢC PHÉP đọc (dấu 🤖): tin cuối, ai nhắn cuối, giờ, có đang chờ bạn trả lời không.
    Gọi đầu tiên để biết cuộc nào có tin mới. Cuộc khác trong Zalo không hiện ở đây."""
    names = allowed_names()
    if not names:
        return "Chưa cho phép cuộc nào. Chủ máy mở cuộc trò chuyện công việc trong Zalo và bấm nút 🤖 (Ctrl+Shift+A)."
    js = "(() => { const G = window.__otlGonG; if (!G) return JSON.stringify({loi: 'Zalo chưa có Zalo gọn'});" \
         " return JSON.stringify(G.items().map(i => ({ten: i.name, cuoi: i.sender, gio: i.time, nhom: i.isGroup," \
         " preview: (i.el.querySelector('.z-conv-message') || {innerText: ''}).innerText.replace(/\\s+/g, ' ').trim()," \
         " cho: !!i.el.querySelector('.otl-cho')}))); })()"
    items = await cdp_eval(js)
    seen = {}
    for it in items:
        if _norm(it["ten"]) in names:
            seen[_norm(it["ten"])] = it
    lines = []
    for n in names:
        it = seen.get(n)
        if not it:
            lines.append(f"- {n}: (không nằm trong phần danh sách đang tải — vẫn đọc được bằng zalo_doc)")
            continue
        who = "BẠN nhắn cuối" if it["cuoi"] == "Bạn:" else ("người kia nhắn cuối — CHỜ bạn trả lời" if it["cho"] else "người kia nhắn cuối")
        lines.append(f"- {n}{' [nhóm]' if it['nhom'] else ''} | {it['gio']} | {who} | {it['preview'][:120]}")
    return "Cuộc trò chuyện được phép đọc:\n" + "\n".join(lines)


# Nhan rieng tu: cuoc mang nhan nay KHONG bao gio hien trong ket qua zalo_nhan (ke ca ten)
NHAN_RIENG = {"<3", "Gia đình"}
# Ten kieu khach cua chu may: "Ten, 3kg ..." / "Trinh Ha, 1kg"
MAU_KHACH = re.compile(r"\d+([.,]\d+)?\s*kg", re.I)

# Cuon het danh sach tro chuyen (danh sach ao: chi ve phan dang hien) -> gom ten + nhan; khong mo cuoc nao
JS_NHAN = r"""(async () => {
const G = window.__otlGonG, wait = ms => new Promise(r => setTimeout(r, ms));
if (!G) return JSON.stringify({loi: 'Zalo chưa có Zalo gọn — mở lại Zalo từ lối tắt'});
// Khung cuon that = cha cua #conversationList (Grid ao cao ca danh sach, tu no khong cuon)
const grid = document.getElementById('conversationList'), list = grid && grid.parentElement;
if (!list) return JSON.stringify({loi: 'Không thấy danh sách trò chuyện'});
const keep = list.scrollTop, rows = {}, step = Math.max(300, list.clientHeight - 80);
const collect = () => document.querySelectorAll(G.SEL.item).forEach(it => {
  const i = G.item(it);
  if (!i.name || rows[i.name]) return;
  const lb = it.querySelector('.conv__label');
  rows[i.name] = {ten: i.name, nhan: lb ? (lb.getAttribute('title') || '').trim() : '', nhom: i.isGroup};
});
list.scrollTop = 0; await wait(250); collect();
let same = 0;
for (let k = 0; k < 600 && same < 6; k++) {
  const before = list.scrollTop; list.scrollTop += step; await wait(120); collect();
  same = list.scrollTop === before ? same + 1 : 0;   // het cuon: cho them vai nhip phong Zalo dang tai them
  if (same) await wait(300);
}
list.scrollTop = keep;
return JSON.stringify(Object.values(rows));
})()"""


@mcp.tool()
async def zalo_nhan(liet_ke_het: bool = False) -> str:
    """Thống kê NHÃN phân loại (Khách hàng, OTL...) trên toàn bộ danh sách trò chuyện và liệt kê cuộc có tên kiểu
    khách ("Tên, XXkg") mà CHƯA gắn nhãn Khách hàng. Chỉ đọc tên + nhãn — không mở cuộc nào, không đọc tin.
    Cuộc mang nhãn riêng tư (<3, Gia đình) bị bỏ hẳn. liet_ke_het=true: kèm tên mọi cuộc chưa có nhãn."""
    rows = [r for r in await cdp_eval(JS_NHAN, timeout=180) if r["nhan"] not in NHAN_RIENG]
    dem = {}
    for r in rows:
        dem[r["nhan"] or "(chưa gắn nhãn)"] = dem.get(r["nhan"] or "(chưa gắn nhãn)", 0) + 1
    sai_nhan = [r for r in rows if MAU_KHACH.search(r["ten"]) and r["nhan"] and r["nhan"] != "Khách hàng"]
    thieu = [r for r in rows if MAU_KHACH.search(r["ten"]) and not r["nhan"]]
    con_lai = [r for r in rows if not r["nhan"] and not MAU_KHACH.search(r["ten"])]
    ten = lambda r: r["ten"] + (" [nhóm]" if r["nhom"] else "") + (f" — nhãn «{r['nhan']}»" if r["nhan"] else "")
    out = [f"Đã quét {len(rows)} cuộc (bỏ nhãn riêng tư). Theo nhãn: "
           + ", ".join(f"{k}: {v}" for k, v in sorted(dem.items(), key=lambda x: -x[1]))]
    out.append(f"\nTên kiểu khách CHƯA gắn nhãn ({len(thieu)}):")
    out += [f"- {ten(r)}" for r in thieu] or ["- (không có)"]
    if sai_nhan:
        out.append(f"\nTên kiểu khách nhưng gắn nhãn KHÁC «Khách hàng» ({len(sai_nhan)}):")
        out += [f"- {ten(r)}" for r in sai_nhan]
    out.append(f"\nChưa có nhãn, tên không theo mẫu khách: {len(con_lai)} cuộc"
               + ("" if liet_ke_het else " (gọi liet_ke_het=true để xem tên)"))
    if liet_ke_het:
        out += [f"- {ten(r)}" for r in con_lai]
    return "\n".join(out)


@mcp.tool()
async def zalo_doc(ten: str, so_tin: int = 30) -> str:
    """Mở cuộc trò chuyện `ten` trong Zalo (người kia sẽ thấy 'đã xem') và đọc `so_tin` tin gần nhất
    (tối đa 100): giờ, ai gửi, nội dung. Ảnh/video/tệp hiện dạng [Hình ảnh]/[Video]/[Tệp] tên."""
    check_allowed(ten)
    n = max(1, min(int(so_tin), 100))
    js = "(async () => {" + JS_OPEN + JS_DOC + f"""
const name = {json.dumps(ten)}, want = {n};
const mo = await openChat(name);
if (!mo.ok) return JSON.stringify({{loi: mo.loi + ' (hoặc cuộc này nằm quá sâu trong danh sách)'}});
// 23/11/2026 (Zalo 26.11.12): #messageViewScroll khong con cuon -> leo len tim khung overflow auto/scroll that
const box = (() => {{ let e = document.querySelector(G.SEL.msgScroll), b = e; for (let i = 0; e && i < 4; i++, e = e.parentElement) if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e; return b; }})(), rows = {{}};
let lost = false;
const collect = () => {{
  if (!G.sameName(G.currentChat().name, name)) {{ lost = true; return; }}   // ai do bam sang cuoc khac giua chung
  document.querySelectorAll(G.SEL.bubble).forEach(b => {{ if (rows[b.id]) return; const r = doc(b); if (r) rows[b.id] = r; }});
}};
collect();
for (let k = 0; k < 10 && !lost && Object.keys(rows).length < want && box; k++) {{ box.scrollTop = 0; await wait(700); collect(); }}
if (box) box.scrollTop = box.scrollHeight;
if (lost) return JSON.stringify({{loi: 'Cửa sổ Zalo chuyển sang cuộc khác trong lúc đọc — gọi đọc lại'}});
const list = Object.values(rows).sort((a, b) => a.ms - b.ms).slice(-want);
const chat = G.currentChat();
return JSON.stringify({{ten: chat.name, nhom: chat.isGroup, tin: list}});
}})()"""
    kq = await cdp_eval(js)
    lines = [f"Cuộc trò chuyện: {kq['ten']}{' (nhóm)' if kq['nhom'] else ''} — {len(kq['tin'])} tin gần nhất"]
    day = None
    prev = ""
    for t in kq["tin"]:
        when = dt.datetime.fromtimestamp(t["ms"] / 1000)
        if when.date() != day:
            day = when.date()
            lines.append(f"--- {when:%d/%m/%Y} ---")
        # Tin noi tiep trong nhom khong co ten -> cung nguoi voi tin ngay truoc
        ai = t["ai"] or (kq["ten"] if not kq["nhom"] else (prev if prev and prev != "Bạn" else "(?)"))
        prev = ai
        lines.append(f"{when:%H:%M} {ai}: {t['noi_dung']}")
    return "\n".join(lines)


@mcp.tool()
async def zalo_soan_nhap(ten: str, noi_dung: str, thay_the: bool = False) -> str:
    """Viết `noi_dung` vào Ô NHẬP của cuộc `ten` — KHÔNG gửi; chủ máy đọc lại rồi tự bấm Enter.
    Ô nhập đang có chữ (chủ máy đang gõ dở) thì từ chối, trừ khi thay_the=true. Xuống dòng bằng \\n."""
    check_allowed(ten)
    text = str(noi_dung).strip()
    if not text:
        raise _Loi("Nội dung trống")
    if len(text) > 3000:
        raise _Loi("Nội dung quá dài (> 3000 ký tự)")
    text = "\n".join(l.rstrip() for l in text.replace("\r\n", "\n").split("\n"))
    # 1) mo cuoc, kiem o nhap, xoa sach
    js = "(async () => {" + JS_OPEN + f"""
const name = {json.dumps(ten)}, replace = {json.dumps(bool(thay_the))};
const mo = await openChat(name);
if (!mo.ok) return JSON.stringify({{loi: mo.loi}});
const cur = G.composer.text().trim();
if (cur && !replace) return JSON.stringify({{loi: 'Ô nhập đang có chữ: «' + cur.slice(0, 80) + '» — không ghi đè (gọi lại với thay_the=true nếu chủ máy đồng ý)'}});
const c = G.composer.el(); c.focus();
const r = document.createRange(); r.selectNodeContents(c);
const s = getSelection(); s.removeAllRanges(); s.addRange(r);
document.execCommand('delete');
return JSON.stringify({{ok: true}});
}})()"""
    # Doc o nhap theo tung dong: Zalo giu moi dong la 1 <div id="input_line_N"> (innerText nuot xuong dong)
    JS_DONG = ("JSON.stringify(Array.from(document.querySelectorAll('#richInput [id^=input_line_]'),"
               " d => d.textContent.replace(/\\u00a0/g, ' ')))")
    JS_TEN = "JSON.stringify(window.__otlGonG.currentChat().name)"

    async def work(call, ev):
        await ev(js)
        await asyncio.sleep(0.4)                             # Zalo (React) ve lai o nhap sau khi xoa
        for i, line in enumerate(text.split("\n")):
            if _norm(await ev(JS_TEN)) != _norm(ten):         # ai do bam sang cuoc khac giua chung -> dung
                raise _Loi("Cuộc trò chuyện đổi giữa chừng — đã dừng, kiểm tra ô nhập")
            if i:
                truoc = len(await ev(JS_DONG))
                # Shift+Enter = xuong dong (Enter tron = GUI). Phim gui vao trang Zalo qua CDP, khong phai phim he thong.
                for t in ("rawKeyDown", "keyUp"):
                    await call("Input.dispatchKeyEvent", {"type": t, "modifiers": 8, "key": "Enter",
                                                          "code": "Enter", "windowsVirtualKeyCode": 13})
                await asyncio.sleep(0.15)
                if len(await ev(JS_DONG)) <= truoc:           # khong them dong (vd lo gui) -> dung ngay
                    raise _Loi("Xuống dòng không ăn — đã dừng ở dòng %d, kiểm tra Zalo" % (i + 1))
            if line:
                await call("Input.insertText", {"text": line})
                await asyncio.sleep(0.15)                     # cho React ve xong, khong thi dong sau de dong truoc
        await asyncio.sleep(0.2)
        dong = await ev(JS_DONG)
        if "\n".join(d.rstrip() for d in dong).rstrip() != text.rstrip():
            return {"ok": False, "co": "\n".join(dong)[:300]}
        await ev("window.__otlGonG.toast('🤖 Claude đã soạn nháp — đọc lại rồi tự bấm Enter để gửi', 'ok', 5000), 1")
        return {"ok": True}

    kq = await cdp_session(work, focus=True)
    if not kq.get("ok"):
        return f"Chưa chèn được đúng nội dung (so từng dòng). Ô nhập hiện có: «{kq.get('co', '')}»"
    return f"Đã soạn nháp vào ô nhập của «{ten}» ({text.count(chr(10)) + 1} dòng, CHƯA gửi). Chủ máy đọc lại rồi tự bấm Enter."


# ---------------- zalo_xuat: luu NHIEU tin (toi da 5000) ra file Markdown — 23/11/2026 ----------------
# Khung tin Zalo la danh sach ao: chi giu 1 doan tin quanh cho dang xem. Cuon len dau -> Zalo tai them tin cu,
# tin moi xa thi bi go khoi DOM -> phai GOM DAN theo ma tin (bb_msg_id_<ms>) sau moi lan cuon.
# Chay tung DOT ngan (moi dot 1 lenh CDP ~15-20 s) de khong vuot thoi han CDP; trang thai giu o window.__otlXuat.
XUAT_TOI_DA = 5000            # mac dinh moi cuoc
XUAT_TRAN = 10000             # tran cung (23/11: Thanh can 'it nhat tu thang 4')
XUAT_BUOC_MOI_DOT = 15        # so lan cuon len trong 1 dot
XUAT_HET_SAU = 30             # bao nhieu lan cuon lien tiep khong tai them tin thi coi la het tin cu
XUAT_GIOI_HAN_GIAY = 40 * 60  # chot an toan: toi da 40 phut / cuoc


def _thu_muc_xuat():
    try:
        with open(os.path.join(HERE, "cau-hinh.json"), encoding="utf-8-sig") as f:
            d = (json.load(f).get("xuat") or {}).get("thu_muc")
    except (OSError, ValueError):
        d = None
    return d or os.path.join(HERE, "Zalo-Xuat")


def _doc_ngay(s):
    try:
        return dt.datetime.strptime(str(s).strip(), "%d/%m/%Y")
    except ValueError:
        raise _Loi(f"Ngày «{s}» không đúng dạng dd/mm/yyyy (vd 01/01/2026)")


JS_XUAT_DOT = r"""(async () => {
const G = window.__otlGonG, S = window.__otlXuat, wait = ms => new Promise(r => setTimeout(r, ms));
if (!G || !S) return JSON.stringify({loi: 'Mất trạng thái xuất (Zalo vừa tải lại?) — gọi lại'});
const box = (() => { let e = document.querySelector(G.SEL.msgScroll), b = e; for (let i = 0; e && i < 4; i++, e = e.parentElement) if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e; return b; })();
if (!box) return JSON.stringify({loi: 'Không thấy khung tin nhắn'});
let lost = false;
const t0 = Date.now();
__DOC__
const collect = () => {
  if (!G.sameName(G.currentChat().name, S.name)) { lost = true; return; }   // ai do bam sang cuoc khac
  document.querySelectorAll(G.SEL.bubble).forEach(b => {
    const cu = S.rows[b.id];
    if (cu && (cu.anh || cu.noi_dung !== '[Hình ảnh]')) return;
    const r = doc(b); if (!r) return;
    if (cu && !r.anh) return;                       // anh van chua nap -> doi lan sau
    S.rows[b.id] = r; delete S.sent[b.id];           // tin moi, hoac tin anh vua nap xong -> gui (lai) ve Python
  });
};
const oldest = () => { let m = Infinity; for (const k in S.rows) if (S.rows[k].ms < m) m = S.rows[k].ms; return m; };
collect();
// Trang nang dan (Zalo khong go tin cu khoi DOM) -> moi dot toi da 25 s, de lenh CDP khong qua han
for (let k = 0; k < __BUOC__ && !lost && Date.now() - t0 < 25000; k++) {
  const h = box.scrollHeight, n0 = Object.keys(S.rows).length;
  box.scrollTop = 0; await wait(700); collect();
  if (box.scrollHeight === h && Object.keys(S.rows).length === n0) { S.same++; await wait(500); collect(); }
  else S.same = 0;
  if (S.same >= __HET__ || Object.keys(S.rows).length >= S.max || oldest() < S.tu) break;
}
const n = Object.keys(S.rows).length, o = oldest();
// Gui ve Python phan tin MOI cua dot nay -> Zalo sap giua chung van con phan da gom (23/11: Zalo tu khoi dong lai o ~2300 tin)
const moi = []; for (const k in S.rows) if (!S.sent[k]) { S.sent[k] = 1; moi.push(Object.assign({id: k}, S.rows[k])); }
return JSON.stringify({lost, n, oldest: o === Infinity ? 0 : o, het: S.same >= __HET__, moi});
})()""".replace("__BUOC__", str(XUAT_BUOC_MOI_DOT)).replace("__HET__", str(XUAT_HET_SAU)).replace("__DOC__", JS_DOC)

# Pha BU ANH: anh chi nap khi tin hien tren man hinh -> cuon toi tung tin anh chua co file, cho nap, doc lai
JS_XUAT_ANH = r"""(async () => {
const G = window.__otlGonG, S = window.__otlXuat, wait = ms => new Promise(r => setTimeout(r, ms));
if (!G || !S) return JSON.stringify({loi: 'Mất trạng thái xuất (Zalo vừa tải lại?)'});
__DOC__
const t0 = Date.now();
const thieu = () => Object.keys(S.rows).filter(k => S.rows[k].noi_dung === '[Hình ảnh]' && !S.rows[k].anh);
const quet = () => { for (const k of thieu()) { const b = document.getElementById(k); if (!b) continue;
  const r = doc(b); if (r && r.anh) { S.rows[k] = r; delete S.sent[k]; } } };
quet();
for (const k of thieu()) {
  if (Date.now() - t0 > 22000 || !G.sameName(G.currentChat().name, S.name)) break;
  if ((S.thu[k] || 0) >= 2) continue;
  S.thu[k] = (S.thu[k] || 0) + 1;
  const b = document.getElementById(k); if (!b) continue;
  b.scrollIntoView({block: 'center'}); await wait(900); quet();
}
const moi = []; for (const k in S.rows) if (!S.sent[k]) { S.sent[k] = 1; moi.push(Object.assign({id: k}, S.rows[k])); }
return JSON.stringify({moi, con: thieu().filter(k => (S.thu[k] || 0) < 2).length, thieu: thieu().length,
  lost: !G.sameName(G.currentChat().name, S.name)});
})()""".replace("__DOC__", JS_DOC)

JS_XUAT_LAY = r"""(() => {
const G = window.__otlGonG, S = window.__otlXuat;
if (!S) return JSON.stringify({loi: 'Mất trạng thái xuất'});
const box = (() => { let e = document.querySelector(G.SEL.msgScroll), b = e; for (let i = 0; e && i < 4; i++, e = e.parentElement) if (/(auto|scroll)/.test(getComputedStyle(e).overflowY)) return e; return b; })(); if (box) box.scrollTop = box.scrollHeight;   // tra ve tin moi nhat
const chat = G.currentChat(), out = {ten: chat.name, nhom: chat.isGroup};
delete window.__otlXuat;
const css = document.getElementById('otl-xuat-css'); if (css) css.remove();
return JSON.stringify(out);
})()"""


def _chi_muc_anh_zalo():
    """ms tin -> file anh Zalo da luu (ZaloData/media/<uid>/ZaloDownloads/resource/<cuoc>/{Cache,richThumb}/<ms>_...).
    Anh nap cham hon luc gom tin -> tra theo moc thoi gian (ten file bat dau bang ma tin). Cache (anh to) uu tien."""
    import glob
    goc = os.path.join(os.environ.get("APPDATA", ""), "ZaloData", "media")
    idx = {}
    for sub in ("richThumb", "Cache"):          # Cache ghi sau -> de len richThumb
        for f in glob.glob(os.path.join(goc, "*", "ZaloDownloads", "resource", "*", sub, "*")):
            m = re.match(r"(\d{13})_", os.path.basename(f))
            if m:
                idx.setdefault(int(m.group(1)), {})[sub] = f
    return idx


class _AnhXuat:
    """Chep anh cua tin ra thu muc rieng: file:// (Zalo da luu tren may) -> chep; http(s) (may chu Zalo) -> tai.
    Tra ve ten file tuong doi de ghi vao dong tin; khong lay duoc -> '(không lấy được)'."""

    def __init__(self, thu_muc):
        self.thu_muc, self.ok, self.hong = thu_muc, 0, 0

    def luu(self, src, ms, k):
        import shutil
        import urllib.parse
        ten = f"{dt.datetime.fromtimestamp(ms / 1000):%y%m%d-%H%M%S}_{ms % 100000:05d}_{k}.jpg"
        dich = os.path.join(self.thu_muc, ten)
        try:
            os.makedirs(self.thu_muc, exist_ok=True)
            if src.startswith("file:///"):
                shutil.copyfile(urllib.parse.unquote(src[8:]).replace("/", os.sep), dich)
            elif src.startswith(("http://", "https://")):
                with urllib.request.urlopen(urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"}),
                                            timeout=20) as r, open(dich, "wb") as f:
                    f.write(r.read())
            else:
                raise ValueError(src[:20])
            self.ok += 1
            return os.path.basename(self.thu_muc) + "/" + ten
        except (OSError, ValueError):
            self.hong += 1
            return "(không lấy được)"


async def _xuat(ten, tu_ngay="01/01/2026", toi_da=XUAT_TOI_DA, bao=None):
    """Mo cuoc `ten`, cuon nguoc gom tin tu `tu_ngay` (toi da `toi_da` tin moi nhat) -> file .md. Tra ve tom tat."""
    check_allowed(ten)
    toi_da = max(1, min(int(toi_da), XUAT_TRAN))
    moc = _doc_ngay(tu_ngay)
    tu_ms = int(moc.timestamp() * 1000)
    bat_dau = "(async () => {" + JS_OPEN + f"""
const name = {json.dumps(ten)};
const mo = await openChat(name);
if (!mo.ok) return JSON.stringify({{loi: mo.loi + ' (hoặc cuộc này nằm quá sâu trong danh sách)'}});
window.__otlXuat = {{name, rows: {{}}, sent: {{}}, thu: {{}}, same: 0, max: {toi_da + 50}, tu: {tu_ms}}};
const c = G.currentChat();
return JSON.stringify({{ok: true, ten: c.name, nhom: c.isGroup}});
}})()"""

    gom = {}                                   # id tin -> tin; giu o Python de Zalo sap van con
    cuoc = {"ten": ten, "nhom": True}

    async def work(call, ev):
        cuoc.update({k: v for k, v in (await ev(bat_dau)).items() if k in ("ten", "nhom")})
        t0 = asyncio.get_event_loop().time()
        ly_do = "hết giờ an toàn 40 phút"
        while asyncio.get_event_loop().time() - t0 < XUAT_GIOI_HAN_GIAY:
            try:
                st = await ev(JS_XUAT_DOT)
            except (asyncio.TimeoutError, TimeoutError):
                return "Zalo trả lời quá chậm (trang quá nặng) — đã lưu phần gom được"
            except (OSError, websockets.ConnectionClosed):
                return "Zalo bị tắt / khởi động lại giữa chừng — đã lưu phần gom được"
            for t in st.get("moi", []):
                gom[t["id"]] = t
            if bao:
                cu = dt.datetime.fromtimestamp(st["oldest"] / 1000).strftime("%d/%m/%Y") if st["oldest"] else "-"
                bao(f"  {st['n']} tin, cũ nhất {cu}")
            if st["lost"]:
                await ev("delete window.__otlXuat, 1")
                raise _Loi("Cửa sổ Zalo chuyển sang cuộc khác giữa chừng — đã dừng, chưa lưu. Gọi lại khi không dùng Zalo.")
            if st["oldest"] and st["oldest"] < tu_ms:
                ly_do = f"đã tới trước ngày {tu_ngay}"
                break
            if st["n"] >= toi_da:
                ly_do = f"đủ {toi_da} tin"
                break
            if st["het"]:
                ly_do = "Zalo trên máy không còn tin cũ hơn"
                break
        t1 = asyncio.get_event_loop().time()
        while asyncio.get_event_loop().time() - t1 < 25 * 60:      # bu anh toi da 25 phut
            try:
                st = await ev(JS_XUAT_ANH)
            except (asyncio.TimeoutError, TimeoutError):
                return ly_do + "; bù ảnh dừng vì Zalo chậm"
            except (OSError, websockets.ConnectionClosed):
                return ly_do + "; Zalo tắt giữa lúc bù ảnh"
            for t in st.get("moi", []):
                gom[t["id"]] = t
            if bao:
                bao(f"  bù ảnh: còn {st['thieu']} ảnh chưa có file")
            if st["lost"] or not st["con"]:
                break
        try:
            await ev(JS_XUAT_LAY)                # cuon ve tin moi nhat, go CSS tam, xoa trang thai
        except (_Loi, OSError, asyncio.TimeoutError, TimeoutError, websockets.ConnectionClosed):
            pass
        return ly_do

    try:
        ly_do = await cdp_session(work, timeout=300)
    except _Loi as e:
        if not gom:
            raise
        ly_do = f"lỗi giữa chừng ({e}) — đã lưu phần gom được"
    kq = dict(cuoc)
    tin = sorted((t for t in gom.values() if t["ms"] >= tu_ms), key=lambda t: t["ms"])[-toi_da:]
    os.makedirs(_thu_muc_xuat(), exist_ok=True)
    ten_file = re.sub(r'[\\/:*?"<>|]+', "_", kq["ten"]).strip() or "cuoc"
    duong = os.path.join(_thu_muc_xuat(), f"{dt.datetime.now():%y%m%d-%H%M}_{ten_file}.md")
    lines = [f"# {kq['ten']}{' (nhóm)' if kq['nhom'] else ''}", "",
             f"Xuất lúc {dt.datetime.now():%d/%m/%Y %H:%M} — {len(tin)} tin, từ {tu_ngay}, tối đa {toi_da} tin. "
             f"Dừng vì: {ly_do}.", ""]
    thu_muc_anh = duong[:-3] + "_anh"
    lay_anh = _AnhXuat(thu_muc_anh)
    chi_muc = None
    day, prev = None, ""
    for t in tin:
        when = dt.datetime.fromtimestamp(t["ms"] / 1000)
        if when.date() != day:
            day = when.date()
            lines += ["", f"## {when:%d/%m/%Y}"]
        ai = t["ai"] or (kq["ten"] if not kq["nhom"] else (prev if prev and prev != "Bạn" else "(?)"))
        prev = ai
        dong = f"- {when:%H:%M} **{ai}**: {t['noi_dung'].replace(chr(0), '')}"
        nguon = list(t.get("anh") or [])
        if not nguon and t["noi_dung"] == "[Hình ảnh]":
            if chi_muc is None:
                chi_muc = _chi_muc_anh_zalo()
            f = chi_muc.get(t["ms"], {})
            f = f.get("Cache") or f.get("richThumb")
            if f:
                nguon = ["file:///" + f.replace(os.sep, "/")]
        anh = [lay_anh.luu(src, t["ms"], k) for k, src in enumerate(nguon)]
        if anh:
            dong += " — ảnh: " + ", ".join(a for a in anh if a)
        lines.append(dong)
    lines[2] += f" Ảnh: {lay_anh.ok} file lưu ở «{os.path.basename(thu_muc_anh)}», {lay_anh.hong} không lấy được."
    with open(duong, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    tu = dt.datetime.fromtimestamp(tin[0]["ms"] / 1000).strftime("%d/%m/%Y") if tin else "-"
    den = dt.datetime.fromtimestamp(tin[-1]["ms"] / 1000).strftime("%d/%m/%Y") if tin else "-"
    return (f"Đã lưu {len(tin)} tin của «{kq['ten']}» ({tu} → {den}) vào:\n{duong}\n"
            f"Dừng vì: {ly_do}. Đọc file này bằng công cụ đọc file (không trả cả nội dung ở đây cho đỡ dài).")


@mcp.tool()
async def zalo_xuat(ten: str, tu_ngay: str = "01/01/2026", toi_da: int = XUAT_TOI_DA) -> str:
    """Lưu NHIỀU tin của cuộc `ten` ra file Markdown (tối đa 5000 tin mới nhất, từ ngày `tu_ngay` dd/mm/yyyy).
    Mở cuộc trong Zalo (người kia thấy 'đã xem') rồi cuộn ngược vài phút — chỉ chạy khi chủ máy không dùng Zalo.
    Chỉ lấy được tin Zalo trên máy tính còn giữ. Trả về đường dẫn file; đọc file bằng công cụ đọc file."""
    return await _xuat(ten, tu_ngay, toi_da)


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3 and sys.argv[1] == "--xuat":
        # Chay tay (khong qua MCP): python mcp_zalo.py --xuat "<ten cuoc>" [dd/mm/yyyy] [toi_da]
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        a = sys.argv[2:]
        try:
            print(asyncio.run(_xuat(a[0], a[1] if len(a) > 1 else "01/01/2026",
                                    int(a[2]) if len(a) > 2 else XUAT_TOI_DA, bao=lambda s: print(s, flush=True))))
        except _Loi as e:
            print("LỖI:", e)
            sys.exit(1)
    else:
        mcp.run()
