// 97-xuat (tinh nang 10): Ctrl+Shift+S luu cuoc tro chuyen dang mo ra Markdown + HTML (qua bridge.py).
// Khung chat Zalo chi giu mot doan tin -> tuy chon cuon len de tai them tin cu, gom dan theo ma tin (bb_msg_id_<ms>).
(function (G) {
  var cfg = G.cfg.xuat || {};

  function collect(into) {
    document.querySelectorAll(G.SEL.bubble).forEach(function (b) {
      var r = G.readBubble(b);
      if (r && !into[b.id]) into[b.id] = r;
    });
  }
  function scrollUp(times, onStep) {
    var box = document.querySelector(G.SEL.msgScroll);
    return new Promise(function (resolve) {
      var n = 0, lastH = -1;
      (function tick() {
        onStep(n);
        if (!box || n >= times) return resolve();
        if (box.scrollHeight === lastH && box.scrollTop === 0 && n > 0) return resolve();   // het tin cu
        lastH = box.scrollHeight; box.scrollTop = 0; n++;
        setTimeout(tick, 700);
      })();
    });
  }

  G.hotkey('Ctrl+Shift+KeyS', function () {
    var chat = G.currentChat();
    if (!document.querySelector(G.SEL.bubble)) { G.toast('Mở một cuộc trò chuyện trước rồi bấm Ctrl+Shift+S'); return; }
    var body = G.el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    var chk = G.el('input', { type: 'checkbox', id: 'otl-xuat-cu' });
    var lab = G.el('label', { for: 'otl-xuat-cu', style: 'display:flex;gap:8px;align-items:center;cursor:pointer' });
    lab.appendChild(chk); lab.appendChild(document.createTextNode('Tải thêm tin cũ (cuộn lên tối đa ' + (cfg.so_lan_cuon_len_toi_da || 30) + ' lần)'));
    var status = G.el('div', { class: 'otl-box otl-dim' }, 'Lưu vào: ' + (cfg.thu_muc || '(mặc định)'));
    body.appendChild(G.el('div', {}, 'Cuộc trò chuyện: «' + (chat.name || '?') + '»'));
    body.appendChild(lab); body.appendChild(status);
    G.panel({
      title: 'Lưu cuộc trò chuyện ra file',
      body: body,
      buttons: [
        { text: 'Huỷ (Esc)', onClick: function (c) { c(); } },
        { text: 'Lưu', chinh: true, onClick: function (c, btn) {
          btn.disabled = true;
          var rows = {}, box = document.querySelector(G.SEL.msgScroll), keep = box ? box.scrollTop : 0;
          var times = chk.checked ? (cfg.so_lan_cuon_len_toi_da || 30) : 0;
          scrollUp(times, function (n) { collect(rows); status.textContent = 'Đang gom tin… ' + Object.keys(rows).length + ' tin' + (times ? ' (lần cuộn ' + n + ')' : ''); })
            .then(function () {
              collect(rows);
              if (box && times) box.scrollTop = box.scrollHeight;  // ve lai cuoi cuoc tro chuyen
              else if (box) box.scrollTop = keep;
              var list = Object.keys(rows).map(function (k) { return rows[k]; }).sort(function (a, b) { return a.ms - b.ms; });
              status.textContent = 'Đang lưu ' + list.length + ' tin…';
              return G.bridge.call('xuat', { ten: chat.name || 'Zalo', thu_muc: cfg.thu_muc, tin: list });
            })
            .then(function (kq) {
              status.className = 'otl-box otl-ok';
              status.textContent = '✓ Đã lưu ' + kq.so_tin + ' tin:\n' + kq.md + '\n' + kq.html;
              var open = G.el('button', { class: 'otl-btn' }, 'Mở thư mục');
              open.addEventListener('click', function () { G.bridge.call('mo_thu_muc', { duong_dan: kq.md }); });
              status.appendChild(G.el('br')); status.appendChild(open);
            })
            .catch(function (e) { btn.disabled = false; status.className = 'otl-box otl-err'; status.textContent = e.message; });
        } }
      ]
    });
  }, 'Lưu cuộc trò chuyện đang mở ra Markdown + HTML');
})(window.__otlGonG);
