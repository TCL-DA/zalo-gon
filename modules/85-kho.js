// 85-kho: so kho vat tu dien tren Zalo - QUET LA CHINH.
//   Quy trinh: [quet ma o bat ky dau trong Zalo -> bang Kho tu mo] -> quet tiep (cung mon = +1) -> Ctrl+Enter luu.
//   Hoac bam nut 📦 / Ctrl+Shift+K (dien san tu tin nhan: chu boi den / tin dang re chuot / tin moi nhat).
//   Tem QR OTL = 880xxxxx (chi chu so). Ma vach hang (EAN...) la: chon mat hang 1 lan -> nho, lan sau tu nhan.
//   May quet go phim rat nhanh + Enter: bat o window (truoc Zalo) -> chan Enter (khong gui tin), xoa ky tu da go.
// Du lieu: BOM_VatTu\SoKho\so_kho_dien.db qua bridge.py -> so_kho.py. Khong ghi file Excel nao cua chu may.
(function (G) {
  var LOAI = { NHAP: 'Nhập kho', XUAT: 'Xuất kho', KIEM_KE: 'Kiểm kê' };
  var SCAN_GAP_MS = 45, SCAN_MIN_LEN = 6;      // may quet: < 45 ms/ky tu; nguoi go tay ~100+ ms
  var ctl = null;                               // bang Kho dang mo (de may quet them vao)

  G.css('otl-gon-kho-css',
    '.otl-kho-seg{display:flex;gap:6px;align-items:center}.otl-kho-seg .otl-btn[data-on]{background:var(--otl-blue);border-color:var(--otl-blue);color:#fff}' +
    '.otl-kho-q{font-size:15px;padding:9px 10px}' +
    '.otl-kho-kq{max-height:180px;overflow:auto;border:1px solid var(--otl-line);border-radius:6px}.otl-kho-kq:empty{display:none}' +
    '.otl-kho-kq .r{display:grid;grid-template-columns:150px 1fr 96px 54px;gap:8px;padding:5px 8px;cursor:pointer;align-items:center}' +
    '.otl-kho-kq .r:hover{background:var(--otl-bg2)}.otl-kho-kq .r b{font-weight:600}' +
    '.otl-kho-ton{text-align:right;font-variant-numeric:tabular-nums}.otl-kho-ton[data-am]{color:var(--otl-red)}' +
    '.otl-kho-dong{display:grid;grid-template-columns:1fr 104px 92px 28px;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--otl-line)}' +
    '.otl-kho-dong[data-moi-quet]{background:rgba(0,104,255,.18);transition:background .6s}' +
    '.otl-kho-x{cursor:pointer;color:var(--otl-dim);text-align:center}.otl-kho-x:hover{color:var(--otl-red)}' +
    '.otl-kho-2c{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}' +
    '.otl-kho-gan{border:1px solid var(--otl-amber);border-radius:6px;padding:6px 10px;gap:10px;align-items:center}');

  function fmtNum(n) { return (Math.round((+n || 0) * 1000) / 1000).toLocaleString('vi-VN'); }
  // Tieng bip: quet nhan duoc (cao) / ma la (thap) - kho on, khong can nhin man hinh
  var audio = null;
  function beep(ok) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = ok ? 1320 : 330; g.gain.value = 0.06;
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + (ok ? 0.07 : 0.25));
    } catch (e) { /* khong co am thanh cung duoc */ }
  }

  function open(opts) {
    opts = opts || {};
    if (ctl && document.body.contains(ctl.body)) { ctl.focus(); return ctl; }
    var m = opts.tuQuet ? { text: '' } : G.pickMessage(opts);
    var chat = G.currentChat();
    var state = { loai: G.store.get('kho-loai', 'XUAT'), dong: [], pendingCode: null };

    var body = G.el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
    var seg = G.el('div', { class: 'otl-kho-seg' });
    Object.keys(LOAI).forEach(function (k) {
      var b = G.el('button', { class: 'otl-btn', 'data-loai': k }, LOAI[k]);
      b.addEventListener('click', function () { setLoai(k); q.focus(); });
      seg.appendChild(b);
    });
    seg.appendChild(G.el('span', { class: 'otl-dim', style: 'margin-left:auto;font-size:12px' }, 'Quét lại cùng món = +1 · Ctrl+Enter = lưu'));
    body.appendChild(seg);

    var q = G.el('input', { class: 'otl-in otl-kho-q', placeholder: '▮ Quét mã QR / mã vạch — hoặc gõ mã hãng, tên để tra tồn…' });
    var gan = G.el('div', { class: 'otl-kho-gan', style: 'display:none' });
    var kq = G.el('div', { class: 'otl-kho-kq' });
    body.appendChild(q); body.appendChild(gan); body.appendChild(kq);

    var lines = G.el('div');
    body.appendChild(lines);

    var duAn = G.el('input', { class: 'otl-in', placeholder: 'Máy / dự án (vd Máy 30kg 051226)' });
    var doiTac = G.el('input', { class: 'otl-in' });
    var nguoiIn = G.el('input', { class: 'otl-in', placeholder: 'Người lập' }); nguoiIn.value = G.store.get('kho-nguoi', 'Thành');
    var grid = G.el('div', { class: 'otl-kho-2c' });
    grid.appendChild(duAn); grid.appendChild(doiTac); grid.appendChild(nguoiIn);
    body.appendChild(grid);

    var more = G.el('details');
    more.appendChild(G.el('summary', { class: 'otl-dim', style: 'cursor:pointer;font-size:12px' }, 'Thêm: ghi chú · mặt hàng chưa có trong danh mục'));
    var ghiChu = G.el('input', { class: 'otl-in', placeholder: 'Ghi chú phiếu', style: 'margin-top:6px' });
    var newName = G.el('input', { class: 'otl-in', placeholder: 'Tên mặt hàng mới (chưa có mã)' });
    var newDvt = G.el('input', { class: 'otl-in', placeholder: 'ĐVT', style: 'width:80px' }); newDvt.value = 'Cái';
    var newBtn = G.el('button', { class: 'otl-btn' }, '+ Thêm');
    var newRow = G.el('div', { style: 'display:flex;gap:8px;margin-top:6px' }); newRow.appendChild(newName); newRow.appendChild(newDvt); newRow.appendChild(newBtn);
    more.appendChild(ghiChu); more.appendChild(newRow);
    body.appendChild(more);

    var nguon = 'Zalo' + (chat.name ? ' — ' + chat.name : '') + (m.time ? ' — ' + G.fmtTime(m.time) : '') + (m.text ? ' — «' + m.text.slice(0, 160) + '»' : '');
    var choAmWrap = G.el('label', { style: 'display:none;gap:8px;align-items:center;cursor:pointer' });
    var choAm = G.el('input', { type: 'checkbox' });
    choAmWrap.appendChild(choAm); choAmWrap.appendChild(document.createTextNode('Vẫn xuất (tồn âm — sổ tồn đầu kỳ chưa cập nhật)'));
    body.appendChild(choAmWrap);
    var result = G.el('div', { class: 'otl-box otl-dim' }, 'Tồn đầu kỳ = cột "Tồn kho 18/07" của file kho; từ đó cộng nhập, trừ xuất.');
    body.appendChild(result);

    function setLoai(k) {
      state.loai = k; G.store.set('kho-loai', k);
      seg.querySelectorAll('.otl-btn').forEach(function (b) { if (b.getAttribute('data-loai') === k) b.setAttribute('data-on', ''); else b.removeAttribute('data-on'); });
      doiTac.placeholder = k === 'NHAP' ? 'Nhà cung cấp / người giao' : k === 'XUAT' ? 'Người nhận / tổ' : 'Người kiểm';
      renderLines();
    }
    function renderLines(flashSku) {
      lines.innerHTML = '';
      if (!state.dong.length) { lines.appendChild(G.el('div', { class: 'otl-dim' }, '(chưa có mặt hàng — quét mã hoặc tìm ở ô trên)')); return; }
      var head = G.el('div', { class: 'otl-kho-dong otl-dim', style: 'font-size:12px' });
      ['Mặt hàng (' + state.dong.length + ')', 'Tồn hiện tại', state.loai === 'KIEM_KE' ? 'Đếm thực tế' : 'Số lượng', ''].forEach(function (h) { head.appendChild(G.el('div', {}, h)); });
      lines.appendChild(head);
      state.dong.forEach(function (d, i) {
        var row = G.el('div', { class: 'otl-kho-dong' });
        if (flashSku && d.sku === flashSku) { row.setAttribute('data-moi-quet', ''); setTimeout(function () { row.removeAttribute('data-moi-quet'); }, 700); }
        var name = G.el('div', {}, (d.ten || d.ten_moi) + (d.ma_hang ? '  · ' + d.ma_hang : '') + (d.ten_moi ? '  · MỚI' : ''));
        name.title = (d.sku || 'mặt hàng mới') + (d.trung && d.trung.length ? '\nTrùng mã hãng với: ' + d.trung.join(', ') : '');
        var ton = G.el('div', { class: 'otl-kho-ton' }, d.ten_moi ? '—' : fmtNum(d.ton) + ' ' + (d.dvt || ''));
        if ((d.ton || 0) < 0) ton.setAttribute('data-am', '');
        var sl = G.el('input', { class: 'otl-in', type: 'number', step: 'any', min: '0' }); sl.value = d.so_luong;
        sl.addEventListener('input', function () { d.so_luong = sl.value; });
        var x = G.el('div', { class: 'otl-kho-x', title: 'Bỏ dòng' }, '✕');
        x.addEventListener('click', function () { state.dong.splice(i, 1); renderLines(); });
        row.appendChild(name); row.appendChild(ton); row.appendChild(sl); row.appendChild(x);
        lines.appendChild(row);
      });
    }
    // Them / cong don 1 mat hang (quet lai cung mon = +1)
    function addItem(it, qty) {
      var have = state.dong.filter(function (d) { return d.sku && d.sku === it.sku; })[0];
      if (have) have.so_luong = (+have.so_luong || 0) + (qty || 1);
      else state.dong.push(Object.assign({}, it, { so_luong: qty || it.so_luong || 1 }));
      renderLines(it.sku);
    }
    function showResults(list, title) {
      kq.innerHTML = '';
      if (title) kq.appendChild(G.el('div', { class: 'otl-dim', style: 'padding:5px 8px;font-size:12px' }, title));
      list.forEach(function (it) {
        var row = G.el('div', { class: 'r', title: it.sku + (it.qr ? ' · tem ' + it.qr : '') + (it.dung_cho ? '\nDùng cho: ' + it.dung_cho : '') });
        row.appendChild(G.el('b', {}, it.ma_hang || it.sku));
        row.appendChild(G.el('span', {}, it.ten + (it.hang ? ' — ' + it.hang : '')));
        var t = G.el('span', { class: 'otl-kho-ton' }, fmtNum(it.ton) + ' ' + it.dvt); if (it.ton < 0) t.setAttribute('data-am', '');
        row.appendChild(t);
        row.appendChild(G.el('span', { class: 'otl-dim' }, state.pendingCode ? 'gán mã' : '+ thêm'));
        row.addEventListener('click', function () { pick(it); });
        kq.appendChild(row);
      });
    }
    function pick(it) {
      if (!state.pendingCode) { addItem(it); q.value = ''; kq.innerHTML = ''; q.focus(); return; }
      var code = state.pendingCode;
      G.bridge.call('kho_gan_ma', { code: code, sku: it.sku }, 15000).then(function (r) {
        state.pendingCode = null; gan.style.display = 'none'; q.value = ''; kq.innerHTML = '';
        addItem(r.mat_hang); beep(true); G.toast('Đã nhớ mã ' + code + ' = ' + (it.ma_hang || it.sku) + ' — lần sau quét tự nhận', 'ok'); q.focus();
      }).catch(function (e) { G.toast(e.message, 'loi', 5000); });
    }
    // Ma tu may quet (hoac go tay roi Enter)
    function addScan(code) {
      code = String(code).trim(); if (!code) return;
      q.value = '';
      G.bridge.call('kho_quet', { code: code }, 15000).then(function (r) {
        if (r.thay) { state.pendingCode = null; gan.style.display = 'none'; kq.innerHTML = ''; addItem(r.mat_hang); beep(true); return; }
        beep(false);
        state.pendingCode = r.code;
        gan.style.display = 'flex'; gan.innerHTML = '';
        gan.appendChild(G.el('span', { style: 'flex:1' }, '⚠ Mã «' + r.code + '» chưa biết. Gõ tên / mã hãng vào ô trên rồi bấm đúng mặt hàng để GÁN (chỉ 1 lần — lần sau quét tự nhận).'));
        var skip = G.el('button', { class: 'otl-btn' }, 'Bỏ qua');
        skip.addEventListener('click', function () { state.pendingCode = null; gan.style.display = 'none'; q.focus(); });
        gan.appendChild(skip);
        kq.innerHTML = ''; q.focus();
      }).catch(function (e) { beep(false); G.toast(e.message, 'loi', 5000); });
    }

    var timer = null;
    q.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var v = q.value.trim();
        if (v.length < 2) { kq.innerHTML = ''; return; }
        G.bridge.call('kho_tim', { q: v, gioi_han: 12 }, 15000).then(function (r) {
          if (!r.ket_qua.length) { kq.innerHTML = ''; kq.appendChild(G.el('div', { class: 'otl-dim', style: 'padding:6px 8px' }, 'Không thấy — mở mục "Thêm" ở dưới để ghi mặt hàng mới')); return; }
          showResults(r.ket_qua, state.pendingCode ? 'Bấm mặt hàng đúng để gán mã ' + state.pendingCode + ':' : '');
        }).catch(function (e) { kq.innerHTML = ''; kq.appendChild(G.el('div', { class: 'otl-err', style: 'padding:6px 8px' }, e.message)); });
      }, 200);
    });
    q.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.ctrlKey) return;
      e.preventDefault();
      var first = kq.querySelector('.r');
      if (first && !/^\S+$/.test(q.value.trim())) { first.click(); return; }   // go ten roi Enter -> chon dong dau
      if (first && state.pendingCode) { first.click(); return; }
      addScan(q.value);                                                       // go ma roi Enter -> nhu quet
    });
    newBtn.addEventListener('click', function () {
      var t = newName.value.trim(); if (!t) return;
      state.dong.push({ ten_moi: t, dvt: newDvt.value.trim() || 'Cái', so_luong: 1 }); newName.value = ''; renderLines();
    });

    function save() {
      if (!state.dong.length) { G.toast('Phiếu chưa có mặt hàng nào', 'loi'); return; }
      var data = {
        loai: state.loai, nguoi: nguoiIn.value.trim(), doi_tac: doiTac.value.trim(), du_an: duAn.value.trim(), ghi_chu: ghiChu.value.trim(),
        nguon: nguon, cho_am: choAm.checked,
        dong: state.dong.map(function (d) { return d.sku ? { sku: d.sku, so_luong: d.so_luong } : { ten_moi: d.ten_moi, dvt: d.dvt, so_luong: d.so_luong }; })
      };
      var btn = document.getElementById('otl-kho-luu'); if (btn) btn.disabled = true;
      result.className = 'otl-box otl-dim'; result.textContent = 'Đang lưu…';
      G.bridge.call('kho_luu', data, 20000).then(function (r) {
        G.store.set('kho-nguoi', data.nguoi);
        beep(true);
        result.className = 'otl-box otl-ok';
        result.textContent = '✓ Đã lưu ' + r.so + ' (' + LOAI[r.loai] + ') — quét tiếp để làm phiếu mới\n' + r.dong.map(function (d) {
          return '• ' + d.ten + ': ' + (r.loai === 'KIEM_KE' ? 'chênh ' + (d.so_luong > 0 ? '+' : '') + fmtNum(d.so_luong) : fmtNum(d.so_luong)) + ' → tồn ' + fmtNum(d.ton) + ' ' + (d.dvt || '');
        }).join('\n');
        state.dong = []; renderLines(); choAm.checked = false; choAmWrap.style.display = 'none';
        if (btn) btn.disabled = false; q.focus();
      }).catch(function (e) {
        if (btn) btn.disabled = false; beep(false);
        result.className = 'otl-box otl-err'; result.textContent = '✗ ' + e.message;
        if (/XUẤT QUÁ TỒN/.test(e.message)) choAmWrap.style.display = 'flex';
      });
    }
    function inTem(btn) {
      var skus = state.dong.filter(function (d) { return d.sku; }).map(function (d) { return d.sku; });
      if (!skus.length && !window.confirm('Phiếu đang trống — in tem QR cho MỌI mặt hàng đang có tồn?')) return;
      btn.disabled = true; result.className = 'otl-box otl-dim'; result.textContent = 'Đang tạo tem…';
      G.bridge.call('kho_in_tem', skus.length ? { skus: skus } : { chi_co_ton: true }, 60000).then(function (r) {
        btn.disabled = false; result.className = 'otl-box otl-ok';
        result.textContent = '✓ ' + r.so_tem + ' tem (' + r.so_to + ' tờ A4 24 tem) — đã mở bằng Chrome, bấm Ctrl+P để in\n' + r.file;
      }).catch(function (e) { btn.disabled = false; result.className = 'otl-box otl-err'; result.textContent = e.message; });
    }

    body.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); save(); } });

    G.panel({
      title: '📦 Kho vật tư điện', width: 860, body: body,
      onClose: function () { ctl = null; },
      buttons: [
        { text: 'Đóng (Esc)', onClick: function (c) { c(); } },
        { text: 'In tem QR', onClick: function (c, btn) { inTem(btn); } },
        { text: 'Báo cáo Excel', onClick: function (c, btn) {
          btn.disabled = true; result.className = 'otl-box otl-dim'; result.textContent = 'Đang xuất báo cáo…';
          G.bridge.call('kho_bao_cao', {}, 60000).then(function (r) {
            btn.disabled = false; result.className = 'otl-box otl-ok';
            result.textContent = '✓ Đã xuất (file mới, không ghi đè):\n' + r.files.join('\n');
            var o = G.el('button', { class: 'otl-btn' }, 'Mở thư mục'); o.addEventListener('click', function () { G.bridge.call('mo_thu_muc', { duong_dan: r.files[0] }); });
            result.appendChild(G.el('br')); result.appendChild(o);
          }).catch(function (e) { btn.disabled = false; result.className = 'otl-box otl-err'; result.textContent = e.message; });
        } },
        { text: 'Lưu phiếu (Ctrl+Enter)', chinh: true, id: 'otl-kho-luu', onClick: function () { save(); } }
      ]
    });
    setLoai(state.loai);
    q.focus();

    // Mo tu nut / phim tat: dien san tu tin nhan
    if (m.text) {
      G.bridge.call('kho_goi_y', { text: m.text }, 15000).then(function (g) {
        if (!document.body.contains(body) || !(g.dong || []).length) return;
        setLoai(g.loai || state.loai);
        if (g.du_an) duAn.value = g.du_an;
        g.dong.forEach(function (d) { addItem(d, d.so_luong); });
        result.className = 'otl-box';
        result.textContent = 'Đã điền sẵn ' + g.dong.length + ' mặt hàng từ tin nhắn (' + LOAI[g.loai] + '). Kiểm lại rồi Ctrl+Enter để lưu.';
      }).catch(function () { /* khong doan duoc thi de trong */ });
    }

    ctl = { body: body, addScan: addScan, focus: function () { q.focus(); } };
    return ctl;
  }
  G.kho = { open: open };

  // ---------- Nhan dien may quet o bat ky dau trong Zalo ----------
  var buf = '', firstAt = 0, lastAt = 0;
  G.on(window, 'keydown', function (e) {
    var now = performance.now();
    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (now - lastAt > SCAN_GAP_MS) { buf = ''; firstAt = now; }
      buf += e.key; lastAt = now;
      return;
    }
    if (e.key !== 'Enter') return;
    var code = buf, fast = code.length >= SCAN_MIN_LEN && now - lastAt <= SCAN_GAP_MS * 2 &&
      (lastAt - firstAt) / Math.max(code.length - 1, 1) < SCAN_GAP_MS;
    buf = '';
    if (!fast) return;
    // La may quet: chan Enter (khong gui tin / khong chon dong), xoa ky tu may quet vua go vao o dang focus
    e.preventDefault(); e.stopImmediatePropagation();
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) {
      var v = t.value; if (v.slice(-code.length) === code) t.value = v.slice(0, -code.length);
    } else if (t && t.closest && t.closest('[contenteditable="true"], [contenteditable=""]')) {
      for (var i = 0; i < code.length; i++) document.execCommand('delete');
    }
    (ctl && document.body.contains(ctl.body) ? ctl : open({ tuQuet: true })).addScan(code);
  });

  G.hotkey('Ctrl+Shift+KeyK', function (opts) { open(opts); }, 'Kho vật tư điện: quét / tra tồn / nhập · xuất · kiểm kê');
})(window.__otlGonG);
