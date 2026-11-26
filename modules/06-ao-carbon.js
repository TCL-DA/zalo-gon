// 06-ao-carbon: ao soi carbon cho Zalo (26/11/2026) - cung van det voi OTL Start (twill 2/2).
//   Dung giao dien TOI co san cua Zalo (class 'dark' tren <body>, 211 luat chay san), chi thay LOP NEN:
//   mat phang chinh trong suot de lo van carbon ve tren <body>; the / bong bong la kinh toi mo de chu doc ro.
//   Van det = 1 o SVG 4x4 o soi (bo soi doc sang, bo ngang toi, lech 1 o moi hang -> gan cheo), lap lai
//   bang background-repeat; them 1 dai sang lot cheo nhu anh chup tam carbon. Khong anh ngoai, khong JS moi khung.
//   Bat/tat: Ctrl+Shift+U hoac nut tren thanh cong cu. Bat ao carbon thi tat ao TE (2 ao khong chong nhau).
// Khong sua file nao cua Zalo: go thuoc tinh data-otl-skin la ve y nhu cu.
(function (G) {
  var KEY = 'ao-carbon';
  var bat = G.store.get(KEY, true);

  // ---- 1. O van det: 4 x 4 o, moi o 4 px (o SVG 16 px) ----
  function oVan() {
    var O = 4, s = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">' +
      '<defs>' +
      // Bo soi doc: sang o giua (soi tron), toi o mep (khe giua 2 bo)
      '<linearGradient id="d" x1="0" x2="1" y1="0" y2="0">' +
      '<stop offset="0" stop-color="#121317"/><stop offset=".5" stop-color="#3a3c42"/><stop offset="1" stop-color="#121317"/></linearGradient>' +
      // Bo soi ngang: toi hon (soi nam ngang it bat sang)
      '<linearGradient id="n" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0" stop-color="#0b0c0f"/><stop offset=".5" stop-color="#1f2025"/><stop offset="1" stop-color="#0b0c0f"/></linearGradient>' +
      '</defs>';
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        s += '<rect x="' + i * O + '" y="' + j * O + '" width="' + O + '" height="' + O +
             '" fill="url(#' + ((i + j) % 4 < 2 ? 'd' : 'n') + ')"/>';
      }
    }
    return 'url("data:image/svg+xml,' + encodeURIComponent(s + '</svg>') + '")';
  }

  // Dai sang lot cheo + toi 4 goc: tam carbon nhin nghieng duoi den
  var NEN = 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.07) 48%, rgba(255,255,255,0) 66%),' +
            'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%),' + oVan();

  // ---- 2. Bien thiet ke cua Zalo (ten bien lay tu 05-ao-te, da do that tren Zalo) ----
  var KINH = 'rgba(20,21,25,.86)', KINH_RE = 'rgba(38,40,46,.90)', KINH_CHON = 'rgba(52,55,62,.92)';
  var BIEN = {
    'surface-background': 'transparent', 'surface-background-overlay': 'transparent',
    'surface-background-subtle': 'rgba(255,255,255,.04)', 'surface-alt': KINH,
    'layer-background-CSC': 'transparent',
    'layer-background': KINH, 'layer-background-hover': KINH_RE, 'layer-background-subtle': KINH_RE,
    'layer-background-selected': KINH_CHON, 'layer-background-pinned': 'rgba(255,255,255,.05)',
    'layer-background-leftmenu': 'rgba(0,0,0,.55)', 'layer-background-leftmenu-hover': 'rgba(255,255,255,.10)',
    'layer-background-leftmenu-selected': 'rgba(255,255,255,.16)',
    'layer-background-navbar-normal': 'rgba(0,0,0,.55)',
    'border': 'rgba(255,255,255,.10)', 'border-subtle': 'rgba(255,255,255,.07)',
    'divider': 'rgba(255,255,255,.08)', 'divider-subtle': 'rgba(255,255,255,.05)',
    'text-primary': '#eceef1', 'text-secondary': '#a7abb2'
  };
  var dongBien = Object.keys(BIEN).map(function (k) { return '--' + k + ':' + BIEN[k] + '!important'; }).join(';');
  var CHON = 'html[data-otl-skin="carbon"]';

  G.css('otl-gon-ao-carbon-css',
    // Bien Zalo khai o ':root .dark' -> dat len body.dark va #app-page cho chac (do uu tien cao hon)
    CHON + ' body.dark,' + CHON + ' .dark,' + CHON + ' #app-page{' + dongBien + '}' +
    CHON + ',' + CHON + ' body{background:' + NEN + ' #0e0f12!important;' +
      'background-size:100% 100%,100% 100%,14px 14px!important;background-attachment:fixed!important}' +
    // Thanh cuon mo, khong che van
    CHON + ' ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16)!important}');

  function apply() {
    var h = document.documentElement;
    if (bat) {
      if (G.aoTe && G.aoTe.dangBat()) G.aoTe.doi();   // 2 ao khong chong nhau
      document.body.classList.add('dark');
      h.setAttribute('data-otl-skin', 'carbon');
    } else if (h.getAttribute('data-otl-skin') === 'carbon') {
      h.removeAttribute('data-otl-skin');
    }
  }
  apply();

  G.aoCarbon = {
    // Ao TE bat sau thi no gianh thuoc tinh -> coi nhu carbon tat
    dangBat: function () { return bat && document.documentElement.getAttribute('data-otl-skin') === 'carbon'; },
    doi: function () {
      bat = !G.aoCarbon.dangBat();
      G.store.set(KEY, bat);
      apply();
      G.toast(bat ? '▮ ÁO SỢI CARBON: BẬT' : '▯ ÁO SỢI CARBON: TẮT', 'ok');
    }
  };
  G.hotkey('Ctrl+Shift+KeyU', function () { G.aoCarbon.doi(); }, 'Áo sợi carbon (bật / tắt)');
})(window.__otlGonG);
