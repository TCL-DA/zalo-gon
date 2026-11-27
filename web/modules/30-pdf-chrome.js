// 30-pdf-chrome: bam file PDF/TXT trong Zalo Web -> mo FILE GOC bang trinh xem PDF cua Chrome.
// Zalo Web xem truoc PDF bang hop thoai nhung iframe "drive.google.com/viewerng/viewer?url=<file>&embedded=true":
// Google tai file roi doi tung trang ra anh -> CHAM, va do la trang web nen Ctrl+lan chuot KHONG zoom PDF.
// File goc tren may chu Zalo (…dlfl.vn) tra Content-Type application/pdf + Content-Disposition inline
// -> Chrome hien thang bang trinh xem PDF cua no (nhanh, Ctrl+lan zoom duoc).
// Cach lam: chan lenh Redux TOGGLE_FILE_PREVIEW (store "emRR") co preview qua Google -> window.open(url goc);
// app thanh-tcl.exe nhan yeu cau cua so moi -> mo bang Chrome (main.rs mo_ngoai). Word/Excel (view.officeapps) giu nguyen.
(function () {
  var LOAI = null;  // ma lenh THAT cua Zalo (PopupActions.TOGGLE_FILE_PREVIEW = so, vd 202) - KHONG phai chuoi ten

  function timLoai(req) {
    var c = req && req.c;
    if (!c) return null;
    var pa = c['97kL'] && c['97kL'].exports && c['97kL'].exports.PopupActions;
    if (pa && pa.TOGGLE_FILE_PREVIEW !== undefined) return pa.TOGGLE_FILE_PREVIEW;
    for (var k in c) {
      try {
        var p = c[k].exports && c[k].exports.PopupActions;
        if (p && p.TOGGLE_FILE_PREVIEW !== undefined) return p.TOGGLE_FILE_PREVIEW;
      } catch (x) { /* bo qua */ }
    }
    return null;
  }

  function layReq() {
    if (window.__otlReq) return window.__otlReq;
    if (!window.webpackJsonp || !window.webpackJsonp.push) return null;
    var id = 'otl-pdf-' + Date.now();
    var m = {};
    m[id] = function (mod, ex, req) { window.__otlReq = req; };
    try { window.webpackJsonp.push([[id], m, [[id]]]); } catch (e) { return null; }
    return window.__otlReq || null;
  }

  function timStore(req) {
    var c = req && req.c;
    if (!c) return null;
    var s = c.emRR && c.emRR.exports && c.emRR.exports.default;
    if (s && s.dispatch && s.getState && s.getState().popup) return s;
    for (var k in c) {  // ban Zalo moi doi ma module -> do theo hinh dang store
      try {
        var e = c[k].exports;
        for (var n in e) {
          var v = e[n];
          if (v && typeof v.dispatch === 'function' && typeof v.getState === 'function') {
            var st = v.getState();
            if (st && st.popup && st.chatview) return v;
          }
        }
      } catch (x) { /* module loi exports -> bo qua */ }
    }
    return null;
  }

  function quaGoogle(p) {
    return !!(p && p.isAlive && typeof p.preview === 'string' && p.preview.indexOf('drive.google.com/viewerng') >= 0 &&
      typeof p.url === 'string' && /^https:\/\//.test(p.url));
  }

  function moChrome(url) {
    try { window.open(url, '_blank'); } catch (e) { console.error('[otl] 30-pdf-chrome: window.open loi', e); }
  }

  function va(store) {
    if (store.__otlPdf) return;
    var goc = store.dispatch;
    store.dispatch = function (a) {
      if (a && a.type === LOAI && quaGoogle(a.payload)) {
        moChrome(a.payload.url);
        return a;  // khong mo hop thoai Google
      }
      return goc.apply(this, arguments);
    };
    // Luoi an toan: noi giu ban dispatch cu (callback da nho tu truoc khi va) van mo duoc hop thoai -> dong ngay.
    var daCo = (store.getState().popup || {}).filePreview;  // hop dang mo luc chen mod: de nguoi dung tu dong
    var dangDong = false;
    store.subscribe(function () {
      if (dangDong) return;
      var fp = (store.getState().popup || {}).filePreview;
      if (!quaGoogle(fp) || fp === daCo) return;
      dangDong = true;
      try {
        moChrome(fp.url);
        goc({ type: LOAI });  // y het cach Zalo dong hop xem file (_hide)
      } finally { dangDong = false; }
    });
    store.__otlPdf = true;
  }

  var lan = 0;
  function thu() {
    lan++;
    var req = layReq();
    var store = timStore(req);
    LOAI = timLoai(req);
    if (store && LOAI !== null) {
      va(store);
      window.__otlPdfChrome = { ok: true, lan: lan, loai: LOAI };
      return;
    }
    if (lan < 120) setTimeout(thu, 1000);  // trang chua nap xong -> doi toi 2 phut
    else console.error('[otl] 30-pdf-chrome: khong thay store Redux');
  }
  thu();
})();
