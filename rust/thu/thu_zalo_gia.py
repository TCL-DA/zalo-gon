"""Zalo GIA (CDP tren cong 9444) de thu zalo-gon.exe ma khong dung Zalo that.
Chay: python thu_zalo_gia.py <thu muc thu-exe>"""
import asyncio, json, os, subprocess, sys, time
from http import HTTPStatus
import websockets

PORT = 9444
DIR = sys.argv[1]
S = dict(co_trang=True, mod_co=True, ket_noi=0, binding=0, tra_loi={}, ws=None)
KQ = []


def ok(ten, dung, ghi=""):
    KQ.append((ten, dung))
    print(("PASS " if dung else "FAIL ") + ten + (f"  ({ghi})" if ghi else ""), flush=True)


def http(conn, req):
    if req.path == "/json":
        ds = [{"type": "page", "url": "file:///x/pc-dist/index.html",
               "webSocketDebuggerUrl": f"ws://127.0.0.1:{PORT}/devtools/page/GIA"}] if S["co_trang"] else []
        return conn.respond(HTTPStatus.OK, json.dumps(ds))
    if not S["co_trang"]:
        return conn.respond(HTTPStatus.NOT_FOUND, "")
    return None


async def phien(ws):
    S["ket_noi"] += 1
    S["ws"] = ws
    try:
        async for raw in ws:
            m = json.loads(raw)
            if m.get("method") == "Runtime.addBinding":
                S["binding"] += 1
            res = {}
            if m.get("method") == "Runtime.evaluate":
                e = m["params"]["expression"]
                if e == "!!window.__otlGonG":
                    res = {"result": {"type": "boolean", "value": S["mod_co"]}}
                elif e.startswith("window.__otlGonBridgeReply"):
                    rep = json.loads(e[e.index("Reply(") + 6:-1])
                    S["tra_loi"][rep["id"]] = rep
            await ws.send(json.dumps({"id": m["id"], "result": res}))
    except websockets.ConnectionClosed:
        pass


async def cho(dk, giay):
    t = time.time()
    while time.time() - t < giay:
        if dk():
            return time.time() - t
        await asyncio.sleep(0.1)
    return None


async def goi(rid, method, data=None, giay=8):
    await S["ws"].send(json.dumps({"method": "Runtime.bindingCalled", "params": {
        "name": "__otlGonBridgeSend", "payload": json.dumps({"id": rid, "method": method, "data": data or {}})}}))
    t = await cho(lambda: rid in S["tra_loi"], giay)
    return S["tra_loi"].get(rid), t


def dem_dong(ten):
    p = os.path.join(DIR, ten)
    return open(p).read().count("\n") if os.path.exists(p) else 0


async def main():
    for f in ("dem.txt", "chet.txt", "ps1-da-goi.txt", "bridge.log", "zalo-canh.log"):
        if os.path.exists(os.path.join(DIR, f)):
            os.remove(os.path.join(DIR, f))
    with open(os.path.join(DIR, "claude-doc.json"), "w", encoding="utf-8") as f:
        json.dump({"_ghi_chu": "x", "cho_phep": ["Khách A"]}, f, ensure_ascii=False)
    def bat_zalo():   # "Zalo.exe" gia = ban chep ping.exe chay lau, khong cua so
        return subprocess.Popen([os.path.join(DIR, "ZaloGia.exe"), "-n", "100000", "127.0.0.1"],
                                stdout=subprocess.DEVNULL, creationflags=0x08000000)

    zalo = bat_zalo()
    async with websockets.serve(phien, "127.0.0.1", PORT, process_request=http):
        env = dict(os.environ, ZALO_GON_PORT=str(PORT), ZALO_GON_THO_GIAY="3",
                   ZALO_GON_EXE="ZaloGia.exe", ZALO_GON_CALL_EXE="CallGia.exe")
        exe = subprocess.Popen([os.path.join(DIR, "zalo-gon.exe")], cwd=DIR, env=env)
        try:
            t = await cho(lambda: S["ket_noi"] == 1 and S["binding"] == 1, 15)
            ok("1. noi vao trang + addBinding", t is not None, f"{t:.1f}s" if t else "")

            r, t = await goi(1, "claude_doc_lay")
            ok("2. claude_doc_lay doc dung danh sach", r and r["ok"] and r["data"]["cho_phep"] == ["Khách A"], f"{t and round(t, 2)}s")
            r, _ = await goi(2, "claude_doc_doi", {"ten": "  Khách   B "})
            ok("3. nut robot: bat 'Khách B' (gon khoang trang)", r and r["data"]["duoc_phep"] is True and "Khách B" in r["data"]["cho_phep"])
            r, _ = await goi(3, "claude_doc_doi", {"ten": "Khách B"})
            ok("4. nut robot: tat lai", r and r["data"]["duoc_phep"] is False and r["data"]["cho_phep"] == ["Khách A"])

            # ---- Loi goc 20/11: ket noi rot ma Zalo van chay -> phai tu noi lai
            await S["ws"].close()
            t = await cho(lambda: S["ket_noi"] == 2 and S["binding"] == 2, 15)
            ok("5. RỚT KẾT NỐI -> tu noi lai + dang ky lai binding", t is not None, f"{t:.1f}s" if t else "khong noi lai")
            r, _ = await goi(4, "claude_doc_lay")
            ok("6. nut bam chay sau khi noi lai", bool(r and r["ok"]))

            # ---- Python tho
            r, t = await goi(5, "ngu", giay=8)
            ok("7. Python treo -> bao loi sau ~3 s, khong treo cau noi", r and not r["ok"] and "quá 3 s" in r["loi"], f"{t and round(t, 1)}s: {r and r.get('loi')}")
            r, _ = await goi(6, "dem")
            ok("8. sau khi treo: Python moi chay duoc", bool(r and r["ok"]) and dem_dong("dem.txt") == 1)
            r, _ = await goi(7, "chet_giua_lenh")
            await asyncio.sleep(1)
            ok("9. Python chet giua lenh -> bao loi, KHONG gui lai (khong tao the doi)", r and not r["ok"] and dem_dong("chet.txt") == 1, r and r.get("loi"))
            r, _ = await goi(8, "tra_roi_chet")
            await asyncio.sleep(1)
            r, _ = await goi(9, "dem")
            ok("10. Python tu chet giua 2 lan bam -> tu bat lai, lenh chi chay 1 lan", bool(r and r["ok"]) and dem_dong("dem.txt") == 2)

            # ---- Mat mod (trang nap lai) -> goi zalo-gon.ps1
            S["mod_co"] = False
            t = await cho(lambda: dem_dong("ps1-da-goi.txt") >= 1, 20)
            ok("11. mat mod -> goi zalo-gon.ps1 chen lai", t is not None, f"{t:.1f}s" if t else "")
            S["mod_co"] = True
            await asyncio.sleep(2)
            n0 = dem_dong("ps1-da-goi.txt")

            # ---- Mat cong (cảnh Zalo dang tat do): 1 lan khong thay trang KHONG duoc goi ps1
            S["co_trang"] = False
            await S["ws"].close()
            t1 = time.time()
            await asyncio.sleep(7)
            ok("12. khong thay trang 1 lan -> CHUA goi ps1 (khong tu mo lai Zalo vua tat)", dem_dong("ps1-da-goi.txt") == n0)
            t = await cho(lambda: dem_dong("ps1-da-goi.txt") > n0, 15)
            ok("13. 2 lan lien tiep khong thay trang -> moi goi ps1", t is not None, f"sau {time.time() - t1:.1f}s tu luc mat cong")
            S["co_trang"] = True
            t = await cho(lambda: S["ket_noi"] == 3, 25)
            ok("14. cong co lai -> noi lai", t is not None)

            # ---- Zalo TAT HAN: khong duoc tu mo lai
            n0 = dem_dong("ps1-da-goi.txt")
            zalo.kill(); zalo.wait()
            S["co_trang"] = False
            await S["ws"].close()
            await asyncio.sleep(25)
            log = open(os.path.join(DIR, "bridge.log"), encoding="utf-8").read()
            ok("15. Zalo TẮT HẲN 25 s -> khong goi ps1, khong tu mo lai Zalo",
               dem_dong("ps1-da-goi.txt") == n0 and "Zalo da dong" in log)

            # ---- Mo Zalo kieu thuong (bieu tuong goc, khong cong) -> mo lai kem cong
            zalo = bat_zalo()
            t = await cho(lambda: dem_dong("ps1-da-goi.txt") > n0, 30)
            ok("16. mo Zalo kieu thuong (khong cong) -> goi ps1 mo lai kem cong", t is not None, f"{t:.1f}s" if t else "")
            S["co_trang"] = True
            t = await cho(lambda: S["ket_noi"] == 4, 25)
            ok("17. Zalo co cong -> noi vao", t is not None)

            # ---- Dang goi dien: mat mod cung de yen
            goi_dt = subprocess.Popen([os.path.join(DIR, "CallGia.exe")])
            await asyncio.sleep(2)
            n1 = dem_dong("ps1-da-goi.txt")
            S["mod_co"] = False
            await asyncio.sleep(20)
            ok("18. DANG GỌI (ZaloCall co cua so) -> de yen 20 s du mat mod", dem_dong("ps1-da-goi.txt") == n1)
            goi_dt.kill(); goi_dt.wait()
            t = await cho(lambda: dem_dong("ps1-da-goi.txt") > n1, 30)
            ok("19. goi xong -> chen lai mod", t is not None, f"{t:.1f}s" if t else "")
            S["mod_co"] = True
        finally:
            exe.kill()
            zalo.kill()
    log = open(os.path.join(DIR, "bridge.log"), encoding="utf-8").read()
    print("---- bridge.log (exe thu)\n" + log)
    print(f"==== {sum(d for _, d in KQ)}/{len(KQ)} PASS")


asyncio.run(main())
