// 15-cua-so-80: anh/file trong Zalo Web mo bang CUA SO RIENG = 80% man hinh, nam giua.
// 1) Bat che do cua so rieng cua Zalo: cau hinh enable_photoviewer_popup (module "NDmK"; may chu de 0 = xem anh
//    phu kin trong app) -> ep = 1 (getter/setter: may chu gan lai van giu 1). Zalo mo chat.zalo.me/popup-viewer.html.
// 2) App thanh-tcl.exe cho phep cua so trong / cung trang chat.zalo.me mo NGAY TRONG APP (link ngoai van sang Chrome).
// 3) Kich thuoc: Zalo tu tinh = 80% BE NGANG CUA SO APP, ti le 16:9, nho co lan truoc, roi goi resizeTo sau khi mo
//    -> chan resizeTo/moveTo cua cua so con: luon ve CA KHUNG = 80% vung lam viec man hinh, nam giua.
//    Luc mo: width/height trong dac tinh la phan RUOT -> tru san vien khung (do outerWidth-innerWidth, nho theo
//    devicePixelRatio; mac dinh 16 x 70 px do 27/11/2026) de khong giat co.
// Nap 2 duong: exe nap ngay luc tai trang (doc file LUC KHOI DONG app) + nguoi canh chen lai (file moi nhat)
// -> co so phien ban BAN: ban moi hon thay ban cu (boc lai tu window.open GOC luu o __otlOpenGoc).
(function () {
  var BAN = 3;
  if (window.__otlCuaSo80 && window.__otlCuaSo80.ban >= BAN) return;
  var TI_LE = 0.8;
  var VIEN_MAC_DINH = { w: 16, h: 70 };
  var KHOA = 'otl-gon-cua-so-80-vien';
  var KHOA_VI_TRI = /^\s*(width|height|left|top|innerwidth|innerheight|outerwidth|outerheight|screenx|screeny)\s*=/i;
  var goc = window.__otlOpenGoc || (window.__otlOpenGoc = window.open);

  function trongApp(url) {
    var u = url == null ? '' : String(url);
    return u === '' || u === 'about:blank' || u.charAt(0) === '/' || u.indexOf(location.origin + '/') === 0;
  }

  function vien() {
    try {
      var v = JSON.parse(localStorage.getItem(KHOA) || 'null');
      if (v && v.dpr === window.devicePixelRatio && v.w >= 0 && v.h >= 0) return v;
    } catch (e) { /* localStorage hong -> dung mac dinh */ }
    return VIEN_MAC_DINH;
  }

  function khung80() {
    var s = window.screen;
    var rong = s.availWidth, cao = s.availHeight;
    var w = Math.round(rong * TI_LE), h = Math.round(cao * TI_LE);
    return { w: w, h: h, l: Math.round((s.availLeft || 0) + (rong - w) / 2), t: Math.round((s.availTop || 0) + (cao - h) / 2) };
  }

  // Giu cua so con dung 80%: Zalo goi resizeTo/moveTo theo co cua no -> doi thanh co 80%; them vai nhip ep lai
  // sau khi trang trong cua so nap xong (Window cua trang moi co the khong giu ham da thay).
  function giuCo(cs, k) {
    var r = cs.resizeTo, m = cs.moveTo;
    function ep() {
      try {
        if (cs.closed) return;
        if (cs.outerWidth !== k.w || cs.outerHeight !== k.h) r.call(cs, k.w, k.h);
        if (cs.screenX !== k.l || cs.screenY !== k.t) m.call(cs, k.l, k.t);
      } catch (e) { /* cua so dong giua chung */ }
    }
    try {
      cs.resizeTo = function () { ep(); };
      cs.moveTo = function () { ep(); };
    } catch (e) { /* khong gan duoc -> chi con nhip ep */ }
    [300, 900, 1800, 3500].forEach(function (t) { setTimeout(ep, t); });
    setTimeout(function () {
      try {
        var w = cs.outerWidth - cs.innerWidth, h = cs.outerHeight - cs.innerHeight;
        if (w >= 0 && h >= 0 && w < 200 && h < 300) {
          localStorage.setItem(KHOA, JSON.stringify({ w: w, h: h, dpr: window.devicePixelRatio }));
        }
      } catch (e) { /* cua so da dong */ }
    }, 1000);
  }

  window.open = function (url, ten, dacTinh) {
    if (!trongApp(url)) return goc.call(window, url, ten, dacTinh);
    var k = khung80(), v = vien();
    var giu = String(dacTinh || '').split(',').filter(function (x) { return x.trim() && !KHOA_VI_TRI.test(x); });
    giu.push('width=' + Math.max(200, k.w - v.w), 'height=' + Math.max(150, k.h - v.h), 'left=' + k.l, 'top=' + k.t);
    var cs = goc.call(window, url, ten, giu.join(','));
    if (cs) giuCo(cs, k);
    return cs;
  };

  // --- bat che do xem anh bang cua so rieng (enable_photoviewer_popup = 1) ---
  function layReq() {
    if (window.__otlReq) return window.__otlReq;
    if (!window.webpackJsonp || !window.webpackJsonp.push) return null;
    var id = 'otl-cua-so-' + Date.now();
    var md = {};
    md[id] = function (mod, ex, req) { window.__otlReq = req; };
    try { window.webpackJsonp.push([[id], md, [[id]]]); } catch (e) { return null; }
    return window.__otlReq || null;
  }

  function batCuaSo() {
    var req = layReq(), c = req && req.c;
    var cfg = c && c.NDmK && c.NDmK.exports && c.NDmK.exports.default;
    if (!cfg || !('enable_photoviewer_popup' in cfg)) return false;
    var mo = Object.getOwnPropertyDescriptor(cfg, 'enable_photoviewer_popup');
    if (mo && mo.get && mo.get.__otlCuaSo) return true;
    var get = function () { return 1; };
    get.__otlCuaSo = true;
    Object.defineProperty(cfg, 'enable_photoviewer_popup', { configurable: true, enumerable: true, get: get, set: function () {} });
    return cfg.enable_photoviewer_popup === 1;
  }

  var lan = 0;
  (function thu() {
    lan++;
    var ok = false;
    try { ok = batCuaSo(); } catch (e) { console.error('[otl] 15-cua-so-80: bat cua so rieng loi', e); }
    window.__otlCuaSo80 = { ban: BAN, tiLe: TI_LE, cuaSoRieng: ok };
    if (!ok && lan < 120) setTimeout(thu, 1000);  // trang chua nap xong module cau hinh -> doi toi 2 phut
  })();
})();
