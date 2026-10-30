// 75-cho-claude-doc: Ctrl+Shift+A cho phep / bo cho phep Claude doc cuoc tro chuyen dang mo
// (MCP otl-zalo chi doc + soan nhap trong cac cuoc co ten trong claude-doc.json; mac dinh khong cuoc nao).
// Cuoc duoc phep co dau 🤖 trong danh sach.
(function (G) {
  var allowed = [];

  G.css('otl-gon-claude-css',
    '.otl-claude{display:inline-block;margin-right:4px;font-size:11px;line-height:16px}');

  function isAllowed(name) { return allowed.some(function (a) { return G.sameName(a, name); }); }
  G.claudeDoc = { isAllowed: isAllowed };

  function mark() {
    G.items().forEach(function (info) {
      var slot = info.el.querySelector('.conv-item-title__more');
      if (!slot) return;
      var old = slot.querySelector('.otl-claude');
      if (isAllowed(info.name)) {
        if (!old) slot.insertBefore(G.el('span', { class: 'otl-claude', title: 'Claude được đọc cuộc này (Ctrl+Shift+A để bỏ)' }, '🤖'), slot.firstChild);
      } else if (old) old.parentNode.removeChild(old);
    });
  }

  function load() {
    if (!G.bridge.ready()) return;
    G.bridge.call('claude_doc_lay', {}, 8000).then(function (kq) { allowed = kq.cho_phep || []; mark(); }).catch(function () { /* cau noi chua chay */ });
  }

  G.hotkey('Ctrl+Shift+KeyA', function () {
    var chat = G.currentChat();
    if (!chat.name) { G.toast('Mở một cuộc trò chuyện trước rồi bấm Ctrl+Shift+A'); return; }
    // Danh sach cho phep ghi theo TEN: trung ten thi khong ro cuoc nao duoc phep
    // (ten nhom / biet danh do nguoi ngoai dat duoc) -> canh bao truoc khi cho phep.
    var trung = G.items().filter(function (i) { return G.sameName(i.name, chat.name); }).length;
    if (trung > 1 && !isAllowed(chat.name)) {
      G.toast('Có ' + trung + ' cuộc trùng tên «' + chat.name + '» — đổi tên/biệt danh cho khác nhau rồi hãy cho phép', 'loi', 6000);
      return;
    }
    G.bridge.call('claude_doc_doi', { ten: chat.name }, 8000).then(function (kq) {
      allowed = kq.cho_phep || []; mark();
      G.toast(kq.duoc_phep ? '🤖 Cho phép Claude đọc «' + chat.name + '»' : 'Đã bỏ: Claude không đọc «' + chat.name + '» nữa', kq.duoc_phep ? 'ok' : '');
    }).catch(function (e) { G.toast(e.message, 'loi', 5000); });
  }, 'Cho phép / bỏ cho phép Claude đọc cuộc đang mở (dấu 🤖)');

  G.onListChange(mark);
  G.every(load, 60000);                       // file co the bi sua tay
  setTimeout(load, 1500);                     // cau noi bat sau khi chen ma
  G.cleanup(function () { document.querySelectorAll('.otl-claude').forEach(function (e) { e.parentNode.removeChild(e); }); });
})(window.__otlGonG);
