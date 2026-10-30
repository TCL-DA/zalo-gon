// 30-gio-lam (tinh nang 2): trong gio lam viec lam mo cac cuoc tro chuyen "on ao"
// (da tat thong bao, hoac ten chua chuoi trong cau-hinh.json). Re chuot vao thi ro lai.
// Ctrl+Shift+G doi: TU DONG (theo gio) -> LUON BAT -> TAT.
// Danh sach Zalo la "virtualized" (vi tri tuyet doi) nen chi lam mo duoc, khong doi thu tu.
(function (G) {
  var c = G.cfg.gio_lam || {};
  var names = (c.ten_chua || []).map(function (s) { return s.toLowerCase(); });
  var MODES = ['tu-dong', 'bat', 'tat'];
  var NHAN = { 'tu-dong': 'TỰ ĐỘNG theo giờ làm (' + (c.tu || '08:00') + '–' + (c.den || '17:00') + ')', 'bat': 'LUÔN BẬT', 'tat': 'TẮT' };
  var mode = G.store.get('gio-lam', 'tu-dong');

  G.css('otl-gon-gio-lam-css',
    '#conversationListId .msg-item[data-otl-on-ao]{opacity:.3;transition:opacity .1s}' +
    '#conversationListId .msg-item[data-otl-on-ao]:hover{opacity:1}');

  function toMin(hhmm) { var p = String(hhmm || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function inWorkHours() {
    var d = new Date(), m = d.getHours() * 60 + d.getMinutes();
    var days = c.ngay_trong_tuan || [1, 2, 3, 4, 5, 6];
    return days.indexOf(d.getDay()) >= 0 && m >= toMin(c.tu || '08:00') && m < toMin(c.den || '17:00');
  }
  function active() { return mode === 'bat' || (mode === 'tu-dong' && inWorkHours()); }
  function noisy(info) {
    if (info.selected) return false;                       // dang mo thi khong lam mo
    if (c.lam_mo_cuoc_da_tat_thong_bao !== false && info.muted) return true;
    var n = info.name.toLowerCase();
    return names.some(function (s) { return s && n.indexOf(s) >= 0; });
  }
  function mark() {
    var on = active();
    G.items().forEach(function (info) {
      var want = on && noisy(info);
      if (want && !info.el.hasAttribute('data-otl-on-ao')) info.el.setAttribute('data-otl-on-ao', '');
      if (!want && info.el.hasAttribute('data-otl-on-ao')) info.el.removeAttribute('data-otl-on-ao');
    });
  }
  G.onListChange(mark);
  G.every(mark, 60000);
  G.hotkey('Ctrl+Shift+KeyG', function () {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length]; G.store.set('gio-lam', mode); mark();
    G.toast('Làm mờ chat ồn ào: ' + NHAN[mode]);
  }, 'Giờ làm việc: làm mờ chat ồn ào (tự động → luôn bật → tắt)');
  G.cleanup(function () { document.querySelectorAll('[data-otl-on-ao]').forEach(function (e) { e.removeAttribute('data-otl-on-ao'); }); });
  mark();
})(window.__otlGonG);
