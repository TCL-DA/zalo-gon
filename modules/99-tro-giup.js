// 99-tro-giup: F1 hien bang phim tat + trang thai cau noi / Trello.
(function (G) {
  function show() {
    var body = G.el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
    G.hotkeyList().filter(function (h) { return h.moTa; }).forEach(function (h) {
      var r = G.el('div', { style: 'display:flex;gap:12px' });
      var k = h.phim.replace('Digit1', '1').replace('Key', '').replace('Arrow', '').replace(/\+/g, ' + ');
      r.appendChild(G.el('span', { class: 'otl-kbd', style: 'min-width:150px;text-align:left' }, k));
      r.appendChild(G.el('span', {}, h.moTa));
      body.appendChild(r);
    });
    body.appendChild(G.el('div', { class: 'otl-dim', style: 'margin-top:6px' },
      'Gõ tắt: gõ "/" trong ô nhập. Danh sách: rê chuột vào biểu tượng Tin nhắn. Cấu hình: cau-hinh.json trong thu muc Zalo gon'));
    var st = G.el('div', { class: 'otl-box otl-dim' }, 'Đang kiểm tra cầu nối…');
    body.appendChild(st);
    G.panel({ title: 'Zalo gọn — phím tắt', body: body, buttons: [{ text: 'Đóng (Esc)', onClick: function (c) { c(); } }] });
    G.bridge.call('trang_thai', {}, 8000).then(function (s) {
      st.className = 'otl-box';
      st.textContent = 'Cầu nối: ✓ đang chạy\nTrello: ' + (s.trello ? '✓ sẵn sàng' : '✗ ' + (s.trello_loi || 'chưa nạp được')) + '\nThư mục lưu: ' + s.thu_muc_xuat;
    }).catch(function (e) { st.className = 'otl-box otl-err'; st.textContent = 'Cầu nối: ✗ ' + e.message; });
  }
  G.hotkey('F1', show, 'Bảng phím tắt này');
  G.toast('Zalo gọn đã bật — bấm F1 xem phím tắt', 'ok', 3500);
})(window.__otlGonG);
