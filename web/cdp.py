# Helper CDP cho cua so Zalo Web (Chrome --app, cong 9334). Dung de nhoi mod + chup luc phat trien.
#   python cdp.py title            -> in title + url
#   python cdp.py shot <file.png>  -> chup trang
#   python cdp.py eval "<js>"      -> chay JS, in ket qua
#   python cdp.py mod              -> nhoi tat ca web/modules/*.js (kem favicon datauri)
import asyncio, json, sys, os, glob, base64, urllib.request
import websockets

PORT = 9334
BASE = os.path.dirname(os.path.abspath(__file__))


def page_ws():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json", timeout=3) as r:
        tg = json.load(r)
    for t in tg:
        if t.get("type") == "page" and "zalo" in t.get("url", ""):
            return t["webSocketDebuggerUrl"]
    raise SystemExit("khong thay trang Zalo Web tren cong 9334")


async def call(ws, mid, method, params=None):
    await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
    while True:
        m = json.loads(await ws.recv())
        if m.get("id") == mid:
            return m


GOC = os.path.dirname(BASE)  # thu muc zalo-gon (ban Zalo PC): cau-hinh.json + modules/ dung chung
# Ao rieng cua ban PC -> bo, de ao carbon web (web/modules/05-carbon-web.js) lam chu giao dien
BO_QUA_PC = {"05-ao-te.js", "06-ao-carbon.js"}


# Lua chon cua Thanh ben Zalo PC nam trong localStorage cua Zalo PC (leveldb nen, khong doc ra duoc) -> ho so
# moi cua app Thanh TCL lay mac dinh nay (chi dat khi CHUA co: Thanh doi bang phim tat thi giu lua chon moi).
MAC_DINH = {"an-danh-sach": True}


def _mac_dinh():
    return ("(function(m){for(var k in m){if(localStorage.getItem('otl-gon-'+k)===null)"
            "localStorage.setItem('otl-gon-'+k,JSON.stringify(m[k]));}})(" + json.dumps(MAC_DINH) + ");")


def _boc(f):
    code = open(f, encoding="utf-8").read()
    ten = json.dumps(os.path.basename(f))
    return ("try{\n" + code + "\n}catch(e){console.error('[otl]'," + ten + ",e);"
            "window.__otlGonErr.push(" + ten + "+': '+e.message);}")


def bundle():
    du = open(os.path.join(BASE, "assets", "favicon-datauri.txt")).read().strip()
    try:
        cfg = open(os.path.join(GOC, "cau-hinh.json"), encoding="utf-8-sig").read()
        json.loads(cfg)
    except (OSError, ValueError):
        cfg = "{}"
    parts = ["window.__OTL_FAVICON=" + json.dumps(du) + ";", "window.__otlGonErr=[];window.__otlGonCfg=" + cfg + ";", _mac_dinh()]
    # 1) tinh nang ban PC (Zalo PC = chinh web Zalo boc Electron -> DOM giong), 2) module rieng web (ao, ten)
    for f in sorted(glob.glob(os.path.join(GOC, "modules", "*.js"))):
        if os.path.basename(f) not in BO_QUA_PC:
            parts.append(_boc(f))
    for f in sorted(glob.glob(os.path.join(BASE, "modules", "*.js"))):
        parts.append(_boc(f))
    return "\n".join(parts) + "\nJSON.stringify({ok:!!window.__otlGonG,loi:window.__otlGonErr})"


async def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "title"
    async with websockets.connect(page_ws(), max_size=None, ping_interval=None) as ws:
        if cmd == "title":
            r = await call(ws, 1, "Runtime.evaluate",
                           {"expression": "JSON.stringify({t:document.title,u:location.href})", "returnByValue": True})
            print(r["result"]["result"]["value"])
        elif cmd == "shot":
            r = await call(ws, 1, "Page.captureScreenshot", {"format": "png"})
            open(sys.argv[2], "wb").write(base64.b64decode(r["result"]["data"]))
            print("chup xong:", sys.argv[2])
        elif cmd == "eval":
            r = await call(ws, 1, "Runtime.evaluate",
                           {"expression": sys.argv[2], "returnByValue": True, "awaitPromise": True})
            res = r.get("result", {}).get("result", {})
            print(json.dumps(res.get("value", res), ensure_ascii=False))
        elif cmd == "mod":
            r = await call(ws, 1, "Runtime.evaluate", {"expression": bundle(), "returnByValue": True})
            print(r["result"]["result"].get("value", r["result"]))
        else:
            print("lenh khong biet:", cmd)

asyncio.run(main())
