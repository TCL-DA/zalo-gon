// 80-chan-gui-nham (tinh nang 7): sap gui vao NHOM ma tin co bao gia / so tien / so tai khoan
// -> chan Enter lan 1, hien canh bao; Enter lan 2 (trong 10 s, noi dung khong doi) moi gui; Esc = huy.
// Khong tu gui tin: lan 2 la phim Enter that cua nguoi dung, chi khong chan nua.
(function (G) {
  var cfg = G.cfg.chan_gui_nham || {};
  var patterns = (cfg.mau || []).map(function (p) { try { return new RegExp(p, 'i'); } catch (e) { console.error('[zalo-gon] mau sai', p); return null; } }).filter(Boolean);
  if (!patterns.length) return;
  var SEND_BTN = '[data-otl-nut-gui]';   // nut Gui duoc danh dau boi markSendButton()
  var armed = null;                      // {text, until}

  G.css('otl-gon-chan-css',
    '#otl-canh-bao{position:fixed;z-index:2147481500;background:var(--otl-bg);color:var(--otl-text);' +
      'border:1px solid var(--otl-amber);border-radius:8px;padding:8px 12px;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.4)}' +
    '#otl-canh-bao b{color:var(--otl-amber)}');

  function hit(text) {
    for (var i = 0; i < patterns.length; i++) { var m = text.match(patterns[i]); if (m) return m[0]; }
    return null;
  }
  function hideWarn() { var w = document.getElementById('otl-canh-bao'); if (w) w.parentNode.removeChild(w); }
  function showWarn(found, chat) {
    hideWarn();
    var c = G.composer.el(); if (!c) return;
    var r = c.getBoundingClientRect();
    var w = G.el('div', { id: 'otl-canh-bao' });
    w.innerHTML = '⚠ Tin có <b></b> sắp gửi vào nhóm <b></b>' + (chat.members ? ' (' + chat.members + ' người)' : '') +
      '. Bấm <span class="otl-kbd">Enter</span> lần nữa để gửi · <span class="otl-kbd">Esc</span> để huỷ.';
    var bs = w.querySelectorAll('b'); bs[0].textContent = '«' + found + '»'; bs[1].textContent = '«' + (chat.name || '?') + '»';
    w.style.left = Math.round(r.left) + 'px';
    w.style.bottom = Math.round(window.innerHeight - r.top + 8) + 'px';
    document.body.appendChild(w);
  }

  // Tra true neu duoc gui; false neu da chan
  function guard(e) {
    if (G.goTat && G.goTat.isOpen()) return true;          // bang go tat dang mo -> Enter la chon ma
    var chat = G.currentChat();
    if (cfg.chi_trong_nhom !== false && !chat.isGroup) return true;
    var text = G.composer.text();
    var found = hit(text);
    if (!found) return true;
    if (armed && armed.text === text && Date.now() < armed.until) { armed = null; hideWarn(); return true; }
    e.preventDefault(); e.stopImmediatePropagation();
    armed = { text: text, until: Date.now() + 10000 };
    showWarn(found, chat);
    return false;
  }

  G.on(window, 'keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('otl-canh-bao')) { armed = null; hideWarn(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    if (!(e.target.closest && e.target.closest(G.SEL.composer))) return;
    guard(e);
  });
  G.on(window, 'click', function (e) {
    if (e.target.closest && e.target.closest(SEND_BTN)) guard(e);
  });
  G.on(document, 'input', function (e) {
    if (e.target.closest && e.target.closest(G.SEL.composer) && armed && G.composer.text() !== armed.text) { armed = null; hideWarn(); }
  });

  // Nut Gui (may bay giay) chi hien khi o nhap co chu; nhan dien theo bieu tuong / tieu de
  function markSendButton() {
    document.querySelectorAll('[icon], [data-translate-title]').forEach(function (b) {
      var key = (b.getAttribute('icon') || '') + ' ' + (b.getAttribute('data-translate-title') || '') + ' ' + (b.getAttribute('data-id') || '');
      if (/(^|\W)(Send_|STR_SEND\b|STR_SEND_MESSAGE|btn_Chat_Send|div_Send)/.test(key) && !b.hasAttribute('data-otl-nut-gui')) b.setAttribute('data-otl-nut-gui', '');
    });
  }
  G.every(markSendButton, 1500);
  G.cleanup(hideWarn);
})(window.__otlGonG);
