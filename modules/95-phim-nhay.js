// 95-phim-nhay (tinh nang 9): Ctrl+1..9 mo cuoc tro chuyen da ghim thu 1..9;
// Alt+Mui ten len/xuong chuyen sang cuoc tren/duoi cuoc dang mo. Khong can mo danh sach.
(function (G) {
  var openItem = G.openItem;
  function sorted() { return G.items().sort(function (a, b) { return a.top - b.top; }); }

  function pinned(n) {
    var list = document.getElementById('conversationList');
    var go = function () {
      var p = sorted().filter(function (i) { return i.pinned; });
      if (p[n - 1]) { openItem(p[n - 1]); G.toast(n + ' · ' + p[n - 1].name); }
      else G.toast('Chưa có cuộc ghim thứ ' + n + ' (đang ghim ' + p.length + ')');
    };
    // Cuoc ghim nam dau danh sach; neu danh sach dang cuon xuong thi cuon len truoc
    if (list && list.scrollTop > 0) { list.scrollTop = 0; setTimeout(go, 200); } else go();
  }
  for (var n = 1; n <= 9; n++) {
    (function (k) { G.hotkey('Ctrl+Digit' + k, function () { pinned(k); }, k === 1 ? 'Ctrl+1 … Ctrl+9: mở cuộc đã ghim thứ 1…9' : null); })(n);
  }

  function step(dir) {
    var all = sorted(), i = -1;
    for (var k = 0; k < all.length; k++) if (all[k].selected) { i = k; break; }
    if (i < 0) { G.toast('Cuộc đang mở không nằm trong phần danh sách đang hiện'); return; }
    var next = all[i + dir];
    if (!next) {
      var list = document.getElementById('conversationList');
      if (list && dir > 0) { list.scrollTop += 78 * 3; setTimeout(function () { step(dir); }, 200); }
      return;
    }
    openItem(next); G.toast(next.name);
  }
  G.hotkey('Alt+ArrowUp', function () { step(-1); }, 'Alt+↑ / Alt+↓: sang cuộc trên / dưới');
  G.hotkey('Alt+ArrowDown', function () { step(1); }, null);
})(window.__otlGonG);
