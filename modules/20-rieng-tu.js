// 20-rieng-tu (tinh nang 1): Ctrl+Shift+B lam mo anh dai dien, ten, dong xem truoc, noi dung chat.
// Re chuot vao dong / tin nhan nao thi cho do ro. Nho trang thai giua cac lan mo.
(function (G) {
  var px = (G.cfg.che_rieng_tu || {}).do_mo_px || 7;
  var blur = 'filter:blur(' + px + 'px)!important;transition:filter .08s';
  // Chi chen CSS khi DANG che: selector duoi '*' bat trinh duyet do MOI phan tu moi lan tinh style
  // (19/10: de san luc tat lam chuyen chat cham them ~25 % thoi gian tinh style)
  var CSS =
    'html[data-otl-rieng-tu] #conversationListId .msg-item .conv-item-title__name,' +
    'html[data-otl-rieng-tu] #conversationListId .msg-item .conv-item-body,' +
    'html[data-otl-rieng-tu] #conversationListId .msg-item .conv-item__avatar,' +
    'html[data-otl-rieng-tu] ' + G.SEL.bubble + ',' +
    'html[data-otl-rieng-tu] #header .header-title,' +
    'html[data-otl-rieng-tu] #header .threadChat__avatar{' + blur + '}' +
    'html[data-otl-rieng-tu] #conversationListId .msg-item:hover *,' +
    'html[data-otl-rieng-tu] ' + G.SEL.bubble + ':hover,' +
    'html[data-otl-rieng-tu] #header:hover *{filter:none!important}' +
    '#otl-rieng-tu-dau{position:fixed;top:2px;left:50%;transform:translateX(-50%);z-index:2147481000;' +
      'font-size:11px;padding:1px 8px;border-radius:0 0 6px 6px;background:var(--otl-bg);color:var(--otl-dim);' +
      'border:1px solid var(--otl-line);border-top:0;pointer-events:none}';

  function set(on) {
    var st = document.getElementById('otl-gon-rieng-tu-css');
    if (on) { G.css('otl-gon-rieng-tu-css', CSS); document.documentElement.setAttribute('data-otl-rieng-tu', ''); }
    else { document.documentElement.removeAttribute('data-otl-rieng-tu'); if (st) st.parentNode.removeChild(st); }
    var dau = document.getElementById('otl-rieng-tu-dau');
    if (on && !dau) { dau = G.el('div', { id: 'otl-rieng-tu-dau' }, 'Đang che chữ — Ctrl+Shift+B để tắt'); document.body.appendChild(dau); }
    if (!on && dau) dau.parentNode.removeChild(dau);
    G.store.set('rieng-tu', on);
  }
  G.hotkey('Ctrl+Shift+KeyB', function () {
    var on = !document.documentElement.hasAttribute('data-otl-rieng-tu');
    set(on); G.toast(on ? 'Đã che chữ — rê chuột vào đâu thì chỗ đó rõ' : 'Đã bỏ che chữ');
  }, 'Che chữ riêng tư (khi có người ngồi cạnh)');
  G.cleanup(function () { set(false); });
  set(G.store.get('rieng-tu', false));
})(window.__otlGonG);
