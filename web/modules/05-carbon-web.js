// 05-carbon-web: nen van soi carbon dat sau Zalo Web (dung tren ca trang QR lan app).
//   Phan phu lop toi + lam trong cac mat phang cua Zalo Web se them sau khi dang nhap (can soi DOM that).
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
  var st = document.getElementById('otl-carbon-web') || document.createElement('style');
  st.id = 'otl-carbon-web';
  st.textContent =
    'html[data-otl-carbon]{background:' + NEN + ' #0e0f12!important;background-size:100% 100%,100% 100%,14px 14px!important;background-attachment:fixed!important}' +
    // tren trang QR: lam trong nen xanh nhat cua Zalo de lo van (thanh phan goc giu nguyen)
    'html[data-otl-carbon] body{background:transparent!important}';
  (document.head || document.documentElement).appendChild(st);
  document.documentElement.setAttribute('data-otl-carbon', '1');
})();
