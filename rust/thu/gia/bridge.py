# Python tho GIA cho bai thu zalo-gon.exe: moi lenh co hanh vi rieng de thu han gio / chet / khong gui lai.
import json, sys, time
for line in sys.stdin:
    m = json.loads(line)["method"]
    if m == "ngu":
        time.sleep(10)
    elif m == "dem":
        with open("dem.txt", "a") as f:
            f.write("1\n")
    elif m == "chet_giua_lenh":            # da lam viec (vd tao the) roi chet truoc khi tra loi
        with open("chet.txt", "a") as f:
            f.write("1\n")
        sys.exit(1)
    print(json.dumps({"ok": True, "data": {"lenh": m}}), flush=True)
    if m == "tra_roi_chet":                # tra loi xong moi chet -> lan sau phai tu bat lai
        sys.exit(0)
