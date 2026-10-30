// 70-trello (tinh nang 6): Ctrl+Shift+T tao the Trello tu tin nhan dang re chuot (hoac doan chu boi den).
// Bang nhap: loai the -> board/list/nhan/thanh vien mac dinh (cau-hinh.json). "Kiem tra" = chay thu qua
// otl_trello.tao_the(ghi=False) (luat 4 o, chan tien/NCC). "Tao the" chi bat sau khi kiem tra dat.
(function (G) {
  var cfg = G.cfg.trello || {};
  var types = cfg.loai || [];
  var fmt = G.fmtTime, field = G.field;
  function defaultDue() {
    var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(17, 0, 0, 0);
    return fmt(d);
  }

  function openForm(text, when) {
    var chat = G.currentChat();
    var body = G.el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    var sel = G.el('select', { class: 'otl-in' });
    types.forEach(function (t, i) { var o = G.el('option', { value: String(i) }, t.ten + '  →  ' + t.board + ' / ' + t.list); sel.appendChild(o); });
    var name = G.el('input', { class: 'otl-in' }); name.value = text.split('\n')[0].slice(0, 80);
    var desc = G.el('textarea', { class: 'otl-in', rows: '5' });
    var due = G.el('input', { class: 'otl-in', placeholder: 'YYYY-MM-DD HH:MM (giờ VN)' }); due.value = defaultDue();
    var labels = G.el('input', { class: 'otl-in' });
    var members = G.el('input', { class: 'otl-in' });
    var checklist = G.el('textarea', { class: 'otl-in', rows: '3' });
    var result = G.el('div', { class: 'otl-box otl-dim' }, 'Bấm "Kiểm tra" để chạy thử trước khi tạo thẻ.');

    function fill() {
      var t = types[+sel.value] || {};
      var src = '— Nguồn: Zalo' + (t.ghi_ten_cuoc_tro_chuyen && chat.name ? ' — ' + chat.name : '') + (when ? ' — ' + fmt(when) : '');
      desc.value = text + '\n\n' + src;
      labels.value = (t.nhan || []).join(', ');
      members.value = (t.thanh_vien || []).join(', ');
      checklist.value = (t.checklist || []).join('\n');
      if (!t.ghi_ten_cuoc_tro_chuyen) {
        result.className = 'otl-box otl-dim';
        result.textContent = 'Board này KHÔNG được ghi tên khách / SĐT / địa chỉ — sửa tên thẻ & mô tả nếu tin nhắn có.';
      }
    }
    sel.addEventListener('change', fill);
    body.appendChild(field('Loại thẻ', sel));
    body.appendChild(field('Tên thẻ (tự thêm tiền tố [AI])', name));
    body.appendChild(field('Mô tả', desc));
    body.appendChild(field('Hạn (giờ VN)', due));
    body.appendChild(field('Nhãn (cách nhau dấu phẩy)', labels));
    body.appendChild(field('Thành viên (cách nhau dấu phẩy)', members));
    body.appendChild(field('Checklist "Việc cần làm" (mỗi dòng 1 việc)', checklist));
    body.appendChild(result);
    fill();

    var checked = null;   // du lieu da kiem tra dat; sua bat ky o nao -> phai kiem lai
    function payload() {
      var t = types[+sel.value] || {};
      var split = function (s) { return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };
      var items = checklist.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      return { board: t.board, list: t.list, ten: name.value.trim(), mo_ta: desc.value, han_vn: due.value.trim(),
               nhan: split(labels.value), thanh_vien: split(members.value),
               checklist: items.length ? { 'Việc cần làm': items } : null };
    }
    [sel, name, desc, due, labels, members, checklist].forEach(function (el) {
      el.addEventListener('input', function () { checked = null; var b = document.getElementById('otl-trello-tao'); if (b) b.disabled = true; });
    });

    G.panel({
      title: 'Tạo thẻ Trello từ tin nhắn',
      body: body,
      buttons: [
        { text: 'Huỷ (Esc)', onClick: function (c) { c(); } },
        { text: 'Kiểm tra (chạy thử)', onClick: function (c, btn) {
          var data = payload(); btn.disabled = true; result.className = 'otl-box otl-dim'; result.textContent = 'Đang chạy thử…';
          G.bridge.call('trello_chay_thu', data).then(function (kq) {
            btn.disabled = false;
            if (kq.ok) {
              checked = JSON.stringify(data);
              result.className = 'otl-box otl-ok';
              result.textContent = '✓ Chạy thử đạt — ' + kq.ten + '\nBoard: ' + data.board + ' / ' + kq.list + '\nHạn: ' + (data.han_vn || '—') +
                '\nBấm "Tạo thẻ" để ghi thật lên Trello.';
              document.getElementById('otl-trello-tao').disabled = false;
            } else {
              result.className = 'otl-box otl-err';
              result.textContent = '✗ Chưa đạt:\n' + (kq.loi || []).map(function (l) { return '• ' + l; }).join('\n');
            }
          }).catch(function (e) { btn.disabled = false; result.className = 'otl-box otl-err'; result.textContent = e.message; });
        } },
        { text: 'Tạo thẻ', chinh: true, id: 'otl-trello-tao', onClick: function (c, btn) {
          var data = payload();
          if (checked !== JSON.stringify(data)) { G.toast('Nội dung đã đổi — bấm "Kiểm tra" lại', 'loi'); btn.disabled = true; return; }
          btn.disabled = true; result.className = 'otl-box otl-dim'; result.textContent = 'Đang tạo thẻ…';
          G.bridge.call('trello_tao', data).then(function (kq) {
            if (!kq.ok) { result.className = 'otl-box otl-err'; result.textContent = '✗ ' + (kq.loi || []).join('\n'); return; }
            result.className = 'otl-box otl-ok';
            result.textContent = '✓ Đã tạo thẻ: ' + kq.url;
            var open = G.el('button', { class: 'otl-btn' }, 'Mở thẻ bằng Chrome');
            open.addEventListener('click', function () { G.bridge.call('mo_chrome', { url: kq.url }); });
            result.appendChild(G.el('br')); result.appendChild(open);
          }).catch(function (e) { result.className = 'otl-box otl-err'; result.textContent = e.message; });
        } }
      ]
    });
    document.getElementById('otl-trello-tao').disabled = true;
    name.focus();
  }

  // Nguon: chu boi den -> tin dang re chuot -> tin moi nhat cua nguoi kia (G.pickMessage)
  G.hotkey('Ctrl+Shift+KeyT', function (opts) {
    if (!types.length) { G.toast('Chưa khai báo loại thẻ trong cau-hinh.json', 'loi'); return; }
    var m = G.pickMessage(opts);
    if (!m.text) { G.toast('Chưa có tin chữ nào để tạo thẻ — bôi đen đoạn chữ hoặc rê chuột vào một tin'); return; }
    openForm(m.text, m.time);
  }, 'Tạo thẻ Trello từ tin nhắn (chữ bôi đen / tin đang rê chuột / tin mới nhất)');
})(window.__otlGonG);
