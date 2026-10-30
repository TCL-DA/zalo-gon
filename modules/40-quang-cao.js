// 40-quang-cao (tinh nang 3): an o quang cao trong cot danh sach (vd "Toi uu cong viec voi zBusiness Pro").
// Tim chu theo cau-hinh.json, an khoi bao quanh (cao 30-160 px), KHONG bao gio an khoi chua danh sach/o nhap.
// Banner dau danh sach la ANH NEN khong co chu (19/10: "Toi uu cong viec voi zBusiness Pro" van hien) -> an theo class.
(function (G) {
  // Danh sach ao hoa dat chat dau o top:72px chua cho banner -> an banner thi keo khung cuon len 72 px
  // (:has tu het tac dung khi Zalo bo banner, khong de lech)
  G.css('otl-gon-qc-css', '[data-otl-qc],[class*="conversation-list__banner"]{display:none!important}' +
    '.ReactVirtualized__Grid__innerScrollContainer:has(> [class*="conversation-list__banner"]){margin-top:-72px}');
  var words = ((G.cfg.quang_cao || {}).chuoi || []).filter(Boolean);
  if (!words.length) return;

  function column() {
    var tabs = document.querySelector('.nav__tabs');
    if (!tabs || !tabs.parentElement) return null;
    var kids = tabs.parentElement.children;
    for (var i = 0; i < kids.length; i++) if (kids[i] !== tabs) return kids[i];
    return null;
  }
  function sweep() {
    var col = column();
    if (!col) return;
    var walker = document.createTreeWalker(col, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) {
      var t = n.data;
      if (!words.some(function (w) { return t.indexOf(w) >= 0; })) continue;
      var box = n.parentElement, pick = null;
      for (var k = 0; box && box !== col && k < 10; k++, box = box.parentElement) {
        if (box.querySelector('#conversationListId, input, [contenteditable]')) break;
        var h = box.getBoundingClientRect().height;
        if (h >= 30 && h <= 160) pick = box;
      }
      if (pick && !pick.hasAttribute('data-otl-qc')) pick.setAttribute('data-otl-qc', '');
    }
  }
  G.every(sweep, 2000);
  G.onListChange(sweep);
  G.cleanup(function () { document.querySelectorAll('[data-otl-qc]').forEach(function (e) { e.removeAttribute('data-otl-qc'); }); });
  sweep();
})(window.__otlGonG);
