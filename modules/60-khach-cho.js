// 60-khach-cho (tinh nang 5): chat 1-1 ma nguoi kia nhan sau cung (dong xem truoc KHONG co "Ban:")
// va da qua >= gio_toi_thieu -> cham do "cho 3 g" canh gio. Bo qua nhom, chat da tat thong bao, ten trong bo_qua.
(function (G) {
  var c = G.cfg.khach_cho || {};
  var minH = c.gio_toi_thieu || 2, maxH = (c.ngay_toi_da || 3) * 24;
  var skip = (c.bo_qua_ten_chua || []).map(function (s) { return s.toLowerCase(); });

  G.css('otl-gon-cho-css',
    '.otl-cho{display:inline-block;margin-right:6px;padding:0 6px;border-radius:9px;font-size:11px;line-height:16px;' +
      'background:var(--otl-red);color:#fff;font-weight:600;white-space:nowrap}' +
    '.otl-cho[data-muc="1"]{background:var(--otl-amber);color:#1b1b1b}');

  // "Vai giay" / "N phut" / "N gio" / "N ngay" / "Hom qua" / "dd/mm" -> so gio da troi qua
  function hoursAgo(t) {
    var s = (t || '').toLowerCase(), m;
    if (!s) return null;
    if (/vài giây|vừa xong/.test(s)) return 0;
    if ((m = s.match(/(\d+)\s*phút/))) return +m[1] / 60;
    if ((m = s.match(/(\d+)\s*giờ/))) return +m[1];
    if ((m = s.match(/(\d+)\s*ngày/))) return +m[1] * 24;
    if (/hôm qua/.test(s)) return 24;
    if ((m = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))) {
      var now = new Date(), y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
      var d = new Date(y, +m[2] - 1, +m[1]);
      if (d > now) d.setFullYear(y - 1);
      return (now - d) / 3600000;
    }
    return null;
  }
  function label(h) { return h < 24 ? Math.floor(h) + ' g' : Math.floor(h / 24) + ' ngày'; }

  function mark() {
    G.items().forEach(function (info) {
      var slot = info.el.querySelector('.conv-item-title__more');
      if (!slot) return;
      var old = slot.querySelector('.otl-cho');
      var n = info.name.toLowerCase();
      var h = hoursAgo(info.time);
      var waiting = !info.isGroup && !info.muted && !info.fromMe && !info.sender && h !== null &&
        h >= minH && h <= maxH && !skip.some(function (s) { return s && n.indexOf(s) >= 0; });
      if (!waiting) { if (old) old.parentNode.removeChild(old); return; }
      var text = '⏳ ' + label(h);
      if (old && old.textContent === text) return;
      var b = old || G.el('span', { class: 'otl-cho', title: 'Khách nhắn sau cùng, bạn chưa trả lời' });
      b.textContent = text; b.setAttribute('data-muc', h < 6 ? '1' : '2');
      if (!old) slot.insertBefore(b, slot.firstChild);
    });
  }
  G.onListChange(mark);
  G.cleanup(function () { document.querySelectorAll('.otl-cho').forEach(function (e) { e.parentNode.removeChild(e); }); });
  mark();
})(window.__otlGonG);
