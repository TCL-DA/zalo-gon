// 20-tin-cu: giu va hien TIN CU tren Zalo Web (bo moc "chi hien 14 ngay gan nhat").
// Zalo Web co cau hinh roll_msg (module cau hinh "NDmK", may chu day xuong cho ban web):
//   enable         -> AN tin cu hon expired_time (14 ngay) + hien "Su dung Zalo PC de tim tin nhan truoc ngay ..."
//   enable_roll_db -> XOA han tin cu khoi IndexedDB moi 12 h (bat dau khi da qua 14 ngay ke tu lan dang nhap dau)
// Mac dinh goc trong ma Zalo la ca hai = false (ham validate fallback) -> ep lai false, chi trong app nay,
// khong dung may chu. Cac ham moc (G/j/V/H trong module yWVE) gap enable=false thi bo moc: V() = 0, j() = false.
// May chu gui cau hinh moi = gan de ca object roll_msg -> dung getter/setter giu hai co luon false.
(function () {
  var TAT = { enable: false, enable_roll_db: false };

  function layReq() {
    if (window.__otlReq) return window.__otlReq;
    if (!window.webpackJsonp || !window.webpackJsonp.push) return null;
    var id = 'otl-tin-cu-' + Date.now();
    var m = {};
    m[id] = function (mod, ex, req) { window.__otlReq = req; };
    try { window.webpackJsonp.push([[id], m, [[id]]]); } catch (e) { return null; }
    return window.__otlReq || null;
  }

  function timCauHinh(req) {
    var c = req && req.c;
    if (!c) return null;
    var goc = c.NDmK && c.NDmK.exports && c.NDmK.exports.default;
    if (goc && goc.roll_msg) return goc;
    for (var k in c) {  // ban Zalo moi doi ma module -> do theo noi dung
      try {
        var d = c[k].exports && c[k].exports.default;
        if (d && typeof d === 'object' && d.roll_msg && 'expired_time' in d.roll_msg) return d;
      } catch (e) { /* module loi exports -> bo qua */ }
    }
    return null;
  }

  function vaCauHinh(cfg) {
    var mo = Object.getOwnPropertyDescriptor(cfg, 'roll_msg');
    if (mo && mo.get && mo.get.__otlTinCu) return true;  // da va (chen lai mod)
    var hienTai = Object.assign({}, cfg.roll_msg, TAT);
    var get = function () { return hienTai; };
    get.__otlTinCu = true;
    Object.defineProperty(cfg, 'roll_msg', {
      configurable: true,
      enumerable: true,
      get: get,
      set: function (v) { hienTai = Object.assign({}, v || {}, TAT); }
    });
    return cfg.roll_msg.enable === false && cfg.roll_msg.enable_roll_db === false;
  }

  // --- Dong bo tu dien thoai (nut "Dong bo ngay") ---
  // May chu dat manual_sync.*.max_time_range_d = 14 -> web chi xin dien thoai tin 14 ngay; ham createThresholdRange
  // gap range <= 0 thi fromTs = 0 (khong gioi han). Dong bo tay con chi lay cuoc co thay doi tu lan dong bo truoc
  // (lastSyncConvSuccessTs) -> khi NGUOI DUNG bam thi cho = 0 de xin lai tat ca cac cuoc.
  // Dong bo tu dong luc dang nhap (nguon 0 = AUTO_SYNC) giu nguyen nhu Zalo.
  var NGUON_TU_DONG = 0;
  var HAM_KHOANG = ['getSyncConvListMaxRange', 'getSyncLastAndRecentChatMaxRange',
    'getSyncAllRemainingMsgMaxRange', 'getSyncRecentChatMaxRange'];

  function timMC(c) {
    for (var k in c) {
      try {
        var e = c[k].exports;
        if (e && e.ModuleContainer && typeof e.ModuleContainer.resolve === 'function') return e.ModuleContainer;
      } catch (x) { /* bo qua */ }
    }
    return null;
  }

  function vaDongBo(req) {
    var c = req && req.c;
    var MC = c && timMC(c);
    var v4 = c && c.V4WO && c.V4WO.exports;
    var cz = c && c.czbv && c.czbv.exports;
    if (!MC || !v4 || !v4.SyncController || !cz || !cz.o) return false;
    var svc = MC.resolve(cz.o), sc = MC.resolve(v4.SyncController);
    if (!svc || !sc || typeof sc.manualSync !== 'function') return false;
    if (!svc.__otlTinCu) {
      HAM_KHOANG.forEach(function (m) {
        var goc = svc[m];
        if (typeof goc !== 'function') return;
        svc[m] = function (nguon) { return nguon === NGUON_TU_DONG ? goc.call(svc, nguon) : -1; };
      });
      svc.__otlTinCu = true;
    }
    if (!sc.__otlTinCu) {
      var gocTay = sc.manualSync;  // arrow fn cua Zalo, doc this.getLastSyncConvSuccessTs() ngay dau ham
      sc.manualSync = function (nguon) {
        sc.getLastSyncConvSuccessTs = function () { return 0; };
        try { return gocTay(nguon); } finally { delete sc.getLastSyncConvSuccessTs; }
      };
      sc.__otlTinCu = true;
    }
    return svc.getThresholdRanges(11).otherMessages.fromTs === 0;
  }

  var lan = 0;
  function thu() {
    lan++;
    var req = layReq();
    var cfg = timCauHinh(req);
    var dongBo = false;
    try { dongBo = vaDongBo(req); } catch (e) { console.error('[otl] 20-tin-cu: va dong bo loi', e); }
    if (cfg) {
      var ok = vaCauHinh(cfg);
      window.__otlTinCu = { ok: ok, dongBo: dongBo, lan: lan, roll_msg: cfg.roll_msg };
      if (!ok) console.error('[otl] 20-tin-cu: va roll_msg khong an');
      if (dongBo || lan >= 120) return;  // dich vu dong bo co the nap muon hon cau hinh -> thu tiep
    }
    if (lan < 120) setTimeout(thu, 1000);  // trang chua nap xong module -> doi toi 2 phut
    else console.error('[otl] 20-tin-cu: khong thay module cau hinh roll_msg / dong bo');
  }
  thu();
})();
