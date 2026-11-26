// 05-carbon-web: nen van soi carbon dat sau Zalo Web + ao toi cho giao dien sau dang nhap.
//   Zalo Web chi co 1 bo bien mau sang (:root,:root .light). Ghi de cac bien do tren body (body thua ke
//   thang hon :root) -> moi khung dung var(--layer-background...) thanh kinh toi trong suot, lo van carbon.
(function () {
  function oVan() {
    var O = 4, s = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><defs>' +
      '<linearGradient id="d" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#121317"/><stop offset=".5" stop-color="#3a3c42"/><stop offset="1" stop-color="#121317"/></linearGradient>' +
      '<linearGradient id="n" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0b0c0f"/><stop offset=".5" stop-color="#1f2025"/><stop offset="1" stop-color="#0b0c0f"/></linearGradient></defs>';
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++)
      s += '<rect x="' + i * O + '" y="' + j * O + '" width="' + O + '" height="' + O + '" fill="url(#' + ((i + j) % 4 < 2 ? 'd' : 'n') + ')"/>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(s + '</svg>') + '")';
  }
  var NEN = 'linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.07) 48%,rgba(255,255,255,0) 66%),' +
            'radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,.45) 100%),' + oVan();

  // Bang mau kinh toi: khung = den mo de lo van; chu sang; xanh Zalo giu cho diem nhan.
  var K = {
    '--bg-default': 'rgba(14,15,18,.55)',
    '--layer-background': 'rgba(16,17,21,.62)',
    '--layer-background-subtle': 'rgba(255,255,255,.06)',
    '--layer-background-hover': 'rgba(255,255,255,.08)',
    '--layer-background-disabled': 'rgba(255,255,255,.05)',
    '--layer-background-selected': 'rgba(0,104,255,.28)',
    '--layer-background-inverse': 'rgba(16,17,21,.9)',
    '--layer-background-CSC': 'rgba(255,255,255,.06)',
    '--layer-background-pinned': 'rgba(255,255,255,.03)',
    '--layer-background-leftmenu': 'rgba(6,7,9,.72)',
    '--layer-background-leftmenu-hover': 'rgba(255,255,255,.10)',
    '--layer-background-leftmenu-selected': '#0068ff',
    '--layer-background-navbar-normal': 'rgba(6,7,9,.72)',
    '--layer-background-navbar-sublevel-normal': 'rgba(16,17,21,.9)',
    '--layer-background-navbar-sublevel-hover': 'rgba(255,255,255,.08)',
    '--layer-background-navbar-sublevel-selected': 'rgba(0,104,255,.28)',
    '--layer-error-background': 'rgba(195,24,24,.18)',
    '--layer-success-background': 'rgba(55,179,97,.16)',
    '--layer-warning-background': 'rgba(224,172,0,.16)',
    '--layer-information-background': 'rgba(0,104,255,.16)',
    '--layer-neutral-information-background': 'rgba(255,255,255,.06)',
    '--layer-accent-message': 'rgba(255,255,255,.03)',
    '--surface-background': 'rgba(10,11,14,.35)',
    '--surface-background-subtle': 'rgba(255,255,255,.05)',
    '--surface-alt': 'rgba(16,17,21,.62)',
    '--surface-background-overlay': 'rgba(16,17,21,.75)',
    '--title-bar': 'rgba(10,11,14,.7)',
    '--item-wa-hover': 'rgba(255,255,255,.08)',
    '--item-wa-select': 'rgba(0,104,255,.25)',
    '--icon-hover-bg': 'rgba(255,255,255,.10)',
    '--text-primary': '#e8eaed',
    '--text-secondary': '#a3abb8',
    '--text-placeholder': '#7f8896',
    '--text-disabled': '#6b7380',
    '--text-quote': '#b8c0cc',
    '--text-navbar-sublevel-normal': '#e8eaed',
    '--text-navbar-sublevel-selected': '#ffffff',
    '--text-mention': '#5fa2ff',
    '--text-information': '#5fa2ff',
    '--tab-txt': '#a3abb8',
    '--title-ptv': '#e8eaed',
    '--icon-primary': '#e8eaed',
    '--icon-secondary': '#a3abb8',
    '--icon-disabled': '#6b7380',
    '--icon-navbar-sublevel-normal': '#5fa2ff',
    '--icon-navbar-sublevel-selected': '#5fa2ff',
    '--border': 'rgba(255,255,255,.12)',
    '--border-subtle': 'rgba(255,255,255,.08)',
    '--border-hover': 'rgba(255,255,255,.22)',
    '--border-disabled': 'rgba(255,255,255,.08)',
    '--border-vanish': 'rgba(255,255,255,.10)',
    '--divider': 'rgba(255,255,255,.10)',
    '--divider-subtle': 'rgba(255,255,255,.05)',
    '--divider-bold': 'rgba(255,255,255,.14)',
    '--input-field-bg-filled': 'rgba(255,255,255,.07)',
    '--input-field-bg-filled-hover': 'rgba(255,255,255,.10)',
    '--input-field-bg-filled-pressed': 'rgba(255,255,255,.12)',
    '--input-field-bg-outline': 'rgba(255,255,255,.05)',
    '--input-field-bg-outline-hover': 'rgba(255,255,255,.08)',
    '--background-inactiveness': 'rgba(255,255,255,.06)',
    '--blue-message': 'rgba(0,92,230,.42)',
    '--blue-message-selected': 'rgba(0,104,255,.6)',
    '--white-message': 'rgba(40,42,48,.82)',
    '--white-message-selected': 'rgba(0,104,255,.45)',
    '--shadow-bubble': '0 1px 2px rgba(0,0,0,.5)',
    '--floating-menu': 'rgba(22,23,28,.92)',
    '--bg-message-info': 'rgba(22,23,28,.85)',
    '--jump-to-message': 'rgba(0,104,255,.3)',
    '--skeleton': 'rgba(255,255,255,.10)',
    '--skeleton-subtle': 'rgba(255,255,255,.06)',
    '--reaction-background': 'rgba(40,42,48,.95)',
    '--emoji-status-bubble-color': 'rgba(40,42,48,.95)',
    // nut/icon trung tinh (thanh cong cu nhap tin, dau khung chat) - mac dinh mau chu toi #081b3a
    '--cta-link-neutral': '#e8eaed',
    '--input-white': 'rgba(255,255,255,.06)',
    '--input-placeholder-wh': '#7f8896',
    '--border-bold': 'rgba(255,255,255,.4)',
    '--partial-quote-floating': 'rgba(40,42,48,.95)',
    '--button-secondary-neutral-normal': 'rgba(255,255,255,.10)',
    '--button-secondary-neutral-hover': 'rgba(255,255,255,.16)',
    '--button-secondary-neutral-pressed': 'rgba(255,255,255,.22)',
    '--button-secondary-neutral-disabled': 'rgba(255,255,255,.05)',
    '--button-secondary-neutral-text': '#e8eaed',
    '--button-secondary-neutral-focus-bg': 'rgba(0,104,255,.28)',
    '--button-secondary-neutral-focus-text': '#5fa2ff',
    '--button-tertiary-neutral-hover': 'rgba(255,255,255,.10)',
    '--button-tertiary-neutral-pressed': 'rgba(255,255,255,.16)',
    '--button-tertiary-neutral-text': '#d4d8de',
    '--button-tertiary-neutral-text-disabled': '#6b7380',
    '--button-tertiary-neutral-focus-bg': 'rgba(0,104,255,.28)',
    '--button-tertiary-neutral-focus-text': '#5fa2ff',
    '--button-ghost-neutral-hover': 'rgba(255,255,255,.10)',
    '--button-ghost-neutral-pressed': 'rgba(255,255,255,.16)',
    '--button-ghost-neutral-text': '#d4d8de',
    '--button-ghost-neutral-container-outline': 'rgba(255,255,255,.2)',
    '--button-ghost-neutral-focus-bg': 'rgba(0,104,255,.28)',
    '--button-ghost-neutral-focus-text': '#5fa2ff'
  };
  var bien = Object.keys(K).map(function (k) { return k + ':' + K[k] + '!important'; }).join(';');

  var st = document.getElementById('otl-carbon-web') || document.createElement('style');
  st.id = 'otl-carbon-web';
  st.textContent =
    'html[data-otl-carbon]{background:' + NEN + ' #0e0f12!important;background-size:100% 100%,100% 100%,14px 14px!important;background-attachment:fixed!important;color-scheme:dark}' +
    'html[data-otl-carbon] body{background:transparent!important;' + bien + '}' +
    // gio gui tin + khung trich dan: mau cung trong CSS cua Zalo
    'html[data-otl-carbon] .card-send-time__sendTime{color:#8b93a1!important}' +
    'html[data-otl-carbon] .message-quote-fragment__container{background:rgba(255,255,255,.07)!important}' +
    // Cot danh sach tu an (10-an-danh-sach) truot ra sau cot bieu tuong: 2 khung nay PHAI dac,
    // neu de kinh trong suot thi danh sach da an van lo chu sau cot bieu tuong.
    'html[data-otl-carbon] [data-otl-gon-nav]>.nav__tabs{background:#0b0c0f!important}' +
    'html[data-otl-carbon] [data-otl-gon="auto"]{background:rgba(17,18,22,.97)!important;backdrop-filter:blur(10px)}' +
    'html[data-otl-carbon] ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18)!important;border-radius:6px}' +
    'html[data-otl-carbon] ::-webkit-scrollbar-track{background:transparent!important}';
  (document.head || document.documentElement).appendChild(st);
  document.documentElement.setAttribute('data-otl-carbon', '1');
})();
