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
from mcp.server.fastmcp import FastMCP

HERE = os.path.dirname(os.path.abspath(__file__))
PORT = 9333
ALLOW_FILE = os.path.join(HERE, "claude-doc.json")

mcp = FastMCP("otl-zalo", instructions=(
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
        raise ValueError(f"«{ten}» không có trong danh sách cho phép. Chủ máy mở cuộc đó trong Zalo và bấm nút 🤖 "
                         f"(hoặc Ctrl+Shift+A). Đang cho phép: {', '.join(names) or '(chưa có cuộc nào)'}")


def _page_ws_url():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=3) as r:
            targets = json.load(r)
    except OSError:
        raise ValueError("Zalo chưa mở bằng lối tắt Zalo gọn (không thấy cổng 9333). Mở Zalo từ ô Zalo trong Start.")
    url = next((t["webSocketDebuggerUrl"] for t in targets
                if t.get("type") == "page" and "pc-dist/index.html" in t.get("url", "")), None)
    if not url:
        raise ValueError("Không thấy cửa sổ chính của Zalo")
    return url


def _ket_qua(res):
    r = res.get("result", {})
    if r.get("exceptionDetails"):
        raise ValueError("Lỗi trong Zalo: " + json.dumps(r["exceptionDetails"].get("exception", {}).get("description", ""))[:300])
    val = r.get("result", {}).get("value")
    out = json.loads(val) if isinstance(val, str) else val
    if isinstance(out, dict) and out.get("loi"):
        raise ValueError(out["loi"])
    return out


async def cdp_session(work, focus=False, timeout=60):
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


async def cdp_eval(expression, focus=False, timeout=60):
    """Chay JS trong cua so chinh Zalo; focus=True gia lap cua so dang duoc chon (de chen chu vao o nhap)."""
    async def work(call, ev):
        return await ev(expression)
    return await cdp_session(work, focus, timeout)


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
    js = "(async () => {" + JS_OPEN + f"""
const name = {json.dumps(ten)}, want = {n};
const mo = await openChat(name);
if (!mo.ok) return JSON.stringify({{loi: mo.loi + ' (hoặc cuộc này nằm quá sâu trong danh sách)'}});
const box = document.querySelector(G.SEL.msgScroll), rows = {{}};
let lost = false;
const collect = () => {{
  if (!G.sameName(G.currentChat().name, name)) {{ lost = true; return; }}   // ai do bam sang cuoc khac giua chung
  document.querySelectorAll(G.SEL.bubble).forEach(b => {{ const r = G.readBubble(b); if (r && !rows[b.id]) rows[b.id] = r; }});
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
        raise ValueError("Nội dung trống")
    if len(text) > 3000:
        raise ValueError("Nội dung quá dài (> 3000 ký tự)")
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
                raise ValueError("Cuộc trò chuyện đổi giữa chừng — đã dừng, kiểm tra ô nhập")
            if i:
                truoc = len(await ev(JS_DONG))
                # Shift+Enter = xuong dong (Enter tron = GUI). Phim gui vao trang Zalo qua CDP, khong phai phim he thong.
                for t in ("rawKeyDown", "keyUp"):
                    await call("Input.dispatchKeyEvent", {"type": t, "modifiers": 8, "key": "Enter",
                                                          "code": "Enter", "windowsVirtualKeyCode": 13})
                await asyncio.sleep(0.15)
                if len(await ev(JS_DONG)) <= truoc:           # khong them dong (vd lo gui) -> dung ngay
                    raise ValueError("Xuống dòng không ăn — đã dừng ở dòng %d, kiểm tra Zalo" % (i + 1))
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


if __name__ == "__main__":
    mcp.run()
