// 10-an-danh-sach: khung danh sach tro chuyen TU AN.
//   re chuot / bam bieu tuong Tin nhan hoac Danh ba -> truot ra de len khung chat;
//   chuot sang khung chat / bieu tuong khac / ra ngoai cua so -> tu thu (tre 0,25 s);
//   Esc thu ngay; Ctrl+Shift+L doi TU AN <-> LUON HIEN.
(function (G) {
  var TRIGGER = '[data-id="div_Main_TabMsg"], [data-translate-title="STR_TAB_CONTACT"]';
  var HIDE_DELAY = 250;
  var auto = G.store.get('an-danh-sach', localStorage.getItem('otl-gon-hidden') === '1');
  var hideTimer = null;

  // CSS theo thuoc tinh data-* (React khong dung toi thuoc tinh la -> ve lai khong mat)
  // z-index: khung chat (MAIN) = 10; menu "..." cua chat (.popover-v3) va thong bao nho = 20 (19/10: cot de 50
  // che mat nua menu); hop thoai 100 / 999 / 9999 -> danh sach 15, cot bieu tuong 16 (tren chat, duoi MOI menu).
  // Phai !important: CSS Zalo dat z-index 5 cho cot nay.
  G.css('otl-gon-an-css',
    '[data-otl-gon-nav]{width:auto!important;min-width:0!important;max-width:none!important}' +
    '[data-otl-gon-nav]>.nav__tabs{position:relative;z-index:16!important;background:var(--otl-gon-bg)}' +
    '[data-otl-gon="auto"]{position:fixed!important;left:64px;top:var(--otl-gon-top);' +
      'height:calc(100vh - var(--otl-gon-top))!important;width:var(--otl-gon-w)!important;z-index:15!important;' +
      'background:var(--otl-gon-bg);box-shadow:4px 0 16px rgba(0,0,0,.45);' +
      // An = day ra ngoai (ca bong do) + khong nhan chuot; KHONG dung visibility:hidden -> cot giu ban ve san,
      // truot ra khong phai ve lai ca danh sach (19/10: khung khung khi mo)
      'transform:translateX(calc(-100% - 24px));pointer-events:none;transition:transform .12s ease-out}' +
    '[data-otl-gon="auto"][data-otl-gon-open]{transform:none;pointer-events:auto}');

  // NAV = cot bieu tuong (.nav__tabs) + cot danh sach (con con lai cua NAV)
  function parts() {
    var tabs = document.querySelector('.nav__tabs');
    if (!tabs || !tabs.parentElement) return null;
    var nav = tabs.parentElement, col = null;
    for (var i = 0; i < nav.children.length; i++) {
      if (nav.children[i] !== tabs && nav.children[i].tagName === 'DIV') { col = nav.children[i]; break; }
    }
    return col ? { nav: nav, tabs: tabs, col: col, pane: nav.nextElementSibling } : null;
  }

  function apply() {
    var p = parts();
    if (!p) return false;
    if (!auto) {
      if (p.col.getAttribute('data-otl-gon') === 'auto') {
        p.col.removeAttribute('data-otl-gon'); p.col.removeAttribute('data-otl-gon-open'); p.nav.removeAttribute('data-otl-gon-nav');
      }
      var w = Math.round(p.col.getBoundingClientRect().width);
      if (w > 200 && w < 600) G.store.set('rong-danh-sach', w);
      return true;
    }
    if (p.col.getAttribute('data-otl-gon') !== 'auto') {
      var root = document.documentElement.style;
      root.setProperty('--otl-gon-top', Math.round(p.nav.getBoundingClientRect().top) + 'px');
      root.setProperty('--otl-gon-w', G.store.get('rong-danh-sach', 344) + 'px');
      root.setProperty('--otl-gon-bg', getComputedStyle(p.nav).backgroundColor || 'rgb(34,38,43)');
      p.col.setAttribute('data-otl-gon', 'auto'); p.nav.setAttribute('data-otl-gon-nav', '1');
    }
    return true;
  }

  function isOpen() { var p = parts(); return !!(p && p.col.hasAttribute('data-otl-gon-open')); }
  function open() {
    if (!auto) return;
    clearTimeout(hideTimer); hideTimer = null; apply();
    var p = parts(); if (p) p.col.setAttribute('data-otl-gon-open', '');
  }
  function typingInColumn() {
    var p = parts(), a = document.activeElement;
    if (!p || !a || !p.col.contains(a)) return false;
    return a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable;
  }
  function close() {
    hideTimer = null;
    if (typingInColumn()) return;
    var p = parts(); if (p) p.col.removeAttribute('data-otl-gon-open');
  }
  function scheduleClose(ms) { if (auto && isOpen() && !hideTimer) hideTimer = setTimeout(close, ms); }

  G.on(document, 'mouseover', function (e) {
    if (!auto) return;
    var p = parts(); if (!p) return;
    var t = e.target;
    if (t.closest && t.closest(TRIGGER)) { open(); return; }
    if (p.col.contains(t)) { clearTimeout(hideTimer); hideTimer = null; return; }
    // Sang khung chat hoac bieu tuong khac -> thu; menu noi (chuot phai...) nam ngoai 2 vung nay -> giu
    if ((p.pane && p.pane.contains(t)) || p.tabs.contains(t)) scheduleClose(HIDE_DELAY);
  });
  G.on(document, 'click', function (e) { if (auto && e.target.closest && e.target.closest(TRIGGER)) open(); });
  G.on(document, 'mouseout', function (e) { if (!e.relatedTarget) scheduleClose(HIDE_DELAY * 2); });
  // Cot an van nhan focus (khong con visibility:hidden) -> focus vao o tim kiem (vd Ctrl+F) thi mo cot
  G.on(document, 'focusin', function (e) {
    var p = auto && parts();
    if (p && p.col.contains(e.target) && !isOpen()) open();
  });
  G.on(document, 'focusout', function () { setTimeout(function () { if (!typingInColumn()) scheduleClose(HIDE_DELAY); }, 0); });
  G.on(document, 'keydown', function (e) {
    if (e.key === 'Escape' && auto && isOpen() && !document.getElementById('otl-panel')) close();
  });

  G.anDanhSach = { open: open, close: close, isOpen: isOpen, isAuto: function () { return auto; } };
  G.hotkey('Ctrl+Shift+KeyL', function () {
    auto = !auto; G.store.set('an-danh-sach', auto);
    clearTimeout(hideTimer); hideTimer = null; apply();
    G.toast(auto ? 'Danh sách: TỰ ẨN (rê chuột vào biểu tượng Tin nhắn để mở)' : 'Danh sách: LUÔN HIỆN');
  }, 'Danh sách trò chuyện: tự ẩn ↔ luôn hiện');

  // Go dau vet cac ban cu (an bang display:none / phim tat rieng)
  if (window.__otlGonTimer) clearInterval(window.__otlGonTimer);
  (window.__otlGonEvents || []).forEach(function (h) { document.removeEventListener(h[0], h[1], true); });
  if (window.__otlGonKey) document.removeEventListener('keydown', window.__otlGonKey, true);
  window.__otlGonEvents = []; window.__otlGonKey = null; window.__otlGonTimer = null;
  document.querySelectorAll('[data-otl-gon="1"]').forEach(function (el) { el.removeAttribute('data-otl-gon'); el.style.display = ''; });

  G.every(apply, 1000);   // React ve lai giao dien co the thay phan tu
  apply();
})(window.__otlGonG);
