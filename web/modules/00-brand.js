// 00-brand: dat ten cua so = "Thanh TCL" + favicon Zalo net (chong Zalo ghi de).
(function () {
  var TEN = 'Th\u00e0nh TCL';
  var ICON = window.__OTL_FAVICON || '';
  function set() {
    if (document.title !== TEN) document.title = TEN;
    if (!ICON) return;
    var cur = document.querySelector('link#otl-favicon');
    if (cur) return;
    document.querySelectorAll("link[rel*='icon']").forEach(function (l) { if (l.id !== 'otl-favicon') l.remove(); });
    var l = document.createElement('link');
    l.id = 'otl-favicon'; l.rel = 'icon'; l.type = 'image/png'; l.href = ICON;
    (document.head || document.documentElement).appendChild(l);
  }
  set();
  clearInterval(window.__otlBrandTimer);
  // Zalo Web doi lai title/favicon theo tin moi -> giu lai moi 1,5 s
  window.__otlBrandTimer = setInterval(function () {
    if (document.title !== TEN) document.title = TEN;
    if (ICON && !document.querySelector('link#otl-favicon')) set();
  }, 1500);
})();
