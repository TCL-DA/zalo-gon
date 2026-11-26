// 10-an-web: an cac thanh moi chao rieng cua Zalo Web (ban PC khong co):
//   - thanh he thong tren cung "Su dung Zalo PC de luu tru..." (chi an thanh co chu "Zalo PC";
//     thanh he thong khac - mat ket noi, canh bao - van hien)
//   - o quang cao zBusiness trong cot danh sach (.conversation-list__banner__full-mode)
// An thanh tren cung thi cot danh sach (10-an-danh-sach, position:fixed) phai cap nhat lai --otl-gon-top.
(function () {
  var st = document.getElementById('otl-an-web') || document.createElement('style');
  st.id = 'otl-an-web';
  st.textContent = '.conversation-list__banner__full-mode{display:none!important}' +
    '[data-otl-an-web]{display:none!important}' +
    // khung chua thanh he thong giu cho 32 px -> an khi khong con thanh nao hien
    '.system-banner__container:not(:has(.system-banner__item__wrapper:not([data-otl-an-web]))){display:none!important}';
  (document.head || document.documentElement).appendChild(st);

  function quet() {
    document.querySelectorAll('.system-banner__item__wrapper:not([data-otl-an-web])').forEach(function (b) {
      if (/Zalo PC/.test(b.textContent || '')) b.setAttribute('data-otl-an-web', '1');
    });
    var tabs = document.querySelector('.nav__tabs');
    var nav = tabs && tabs.parentElement;
    if (nav && nav.hasAttribute('data-otl-gon-nav')) {
      var top = Math.round(nav.getBoundingClientRect().top) + 'px';
      var root = document.documentElement.style;
      if (root.getPropertyValue('--otl-gon-top') !== top) root.setProperty('--otl-gon-top', top);
    }
  }
  clearInterval(window.__otlAnWebTimer);
  window.__otlAnWebTimer = setInterval(quet, 1500);
  quet();
})();
