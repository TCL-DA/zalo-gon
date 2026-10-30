// 98-thanh-nut: cum nut Zalo gon ngay tren thanh cong cu o nhap (sau nut "..." cua Zalo).
// Dung lai class nut cua Zalo (cung co, cung mau); nut dang bat (che chu, cho Claude doc) chuyen xanh.
// Zalo ve lai thanh cong cu khi doi cuoc tro chuyen -> kiem moi 0,8 s, thieu thi gan lai.
(function (G) {
  var svg = function (body) {
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  };
  var BUTTONS = [
    { id: 'kho', title: 'Kho vật tư điện — quét / tra tồn / nhập · xuất (Ctrl+Shift+K)',
      icon: svg('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5"/><path d="M12 12v9"/>'),
      run: function () { G.runHotkey('Ctrl+Shift+KeyK', { tuNut: true }); } },
    { id: 'go-tat', title: 'Câu soạn sẵn (gõ / trong ô nhập)',
      icon: svg('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M14.5 7.5l-5 9"/>'),
      run: function () {
        var c = G.composer.el(); if (!c) return;
        c.focus();
        var r = document.createRange(); r.selectNodeContents(c); r.collapse(false);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        var before = G.composer.text();
        document.execCommand('insertText', false, (before && !/\s$/.test(before) ? ' ' : '') + '/');
      } },
    { id: 'trello', title: 'Tạo thẻ Trello từ tin nhắn (Ctrl+Shift+T)',
      icon: svg('<rect x="3" y="3" width="18" height="18" rx="2.5"/><rect x="6.5" y="6.5" width="4" height="10" rx="1"/><rect x="13.5" y="6.5" width="4" height="6" rx="1"/>'),
      run: function () { G.runHotkey('Ctrl+Shift+KeyT', { tuNut: true }); } },
    { id: 'luu', title: 'Lưu cuộc trò chuyện ra file (Ctrl+Shift+S)',
      icon: svg('<path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>'),
      run: function () { G.runHotkey('Ctrl+Shift+KeyS'); } },
    { id: 'che', title: 'Che chữ riêng tư (Ctrl+Shift+B)',
      icon: svg('<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/><path d="M4 20L20 4"/>'),
      on: function () { return document.documentElement.hasAttribute('data-otl-rieng-tu'); },
      run: function () { G.runHotkey('Ctrl+Shift+KeyB'); } },
    { id: 'claude', title: 'Cho phép / bỏ cho phép Claude đọc cuộc này (Ctrl+Shift+A)',
      icon: svg('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8"/><circle cx="12" cy="4" r="1"/>' +
        '<circle cx="9.5" cy="13" r="1" fill="currentColor"/><circle cx="14.5" cy="13" r="1" fill="currentColor"/><path d="M9.5 16.2h5"/>'),
      on: function () { return !!(G.claudeDoc && G.claudeDoc.isAllowed(G.currentChat().name)); },
      run: function () { G.runHotkey('Ctrl+Shift+KeyA'); } },
    { id: 'tro-giup', title: 'Zalo gọn — tất cả phím tắt (F1)',
      icon: svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.8" r=".6" fill="currentColor"/>'),
      run: function () { G.runHotkey('F1'); } }
  ];

  G.css('otl-gon-thanh-nut-css',
    'li[data-otl-nut-sep]{width:1px;height:20px;background:var(--otl-line);margin:0 6px;align-self:center;list-style:none}' +
    'li[data-otl-nut] .z--btn--v2{display:flex;align-items:center;justify-content:center}' +
    'li[data-otl-nut][data-on] .z--btn--v2{color:var(--otl-blue)}');

  function build(ul) {
    var sep = G.el('li', { 'data-otl-nut-sep': '' });
    ul.appendChild(sep);
    BUTTONS.forEach(function (b) {
      var li = G.el('li', { class: 'chat-box-toolbar-item', 'data-otl-nut': b.id });
      var btn = G.el('div', { class: 'z--btn--v2 btn-tertiary-neutral medium chat-box-toolbar-button --rounded icon-only', title: b.title });
      btn.innerHTML = b.icon;
      // mousedown: giu con tro trong o nhap (khong de nut lay focus)
      btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
      btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); b.run(); setTimeout(refresh, 300); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function refresh() {
    var ul = document.querySelector('ul.chat-box-toolbar');
    if (!ul) return;
    if (!ul.querySelector('li[data-otl-nut]')) build(ul);
    BUTTONS.forEach(function (b) {
      if (!b.on) return;
      var li = ul.querySelector('li[data-otl-nut="' + b.id + '"]');
      if (!li) return;
      if (b.on()) li.setAttribute('data-on', ''); else li.removeAttribute('data-on');
    });
  }

  G.every(refresh, 800);
  G.cleanup(function () { document.querySelectorAll('li[data-otl-nut], li[data-otl-nut-sep]').forEach(function (e) { e.parentNode.removeChild(e); }); });
  refresh();
})(window.__otlGonG);
