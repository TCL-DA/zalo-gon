// 90-go-tat (tinh nang 8): cau soan san. Go "/" trong o nhap -> bang goi y; go them de loc;
// mui ten len/xuong chon, Tab hoac Enter chen, Esc dong. Go du ma (vd /dc) roi Tab cung chen.
// Noi dung lay tu cau-hinh.json "go_tat"; ma de trong hien "(chua co noi dung)".
(function (G) {
  var snippets = {};
  Object.keys(G.cfg.go_tat || {}).forEach(function (k) { if (k.charAt(0) === '/') snippets[k] = G.cfg.go_tat[k]; });
  var keys = Object.keys(snippets);
  if (!keys.length) return;
  var state = null;   // {node, start, end, matches, idx}

  G.css('otl-gon-go-tat-css',
    '#otl-go-tat{position:fixed;z-index:2147481600;width:420px;max-height:300px;overflow:auto;background:var(--otl-bg);' +
      'color:var(--otl-text);border:1px solid var(--otl-line);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-size:13px}' +
    '#otl-go-tat .r{padding:6px 10px;cursor:pointer;display:flex;gap:10px}' +
    '#otl-go-tat .r[data-on]{background:var(--otl-blue);color:#fff}' +
    '#otl-go-tat .k{font-weight:600;min-width:52px}#otl-go-tat .v{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.85}' +
    '#otl-go-tat .h{padding:4px 10px;color:var(--otl-dim);font-size:11px;border-top:1px solid var(--otl-line)}');

  function close() { state = null; var p = document.getElementById('otl-go-tat'); if (p) p.parentNode.removeChild(p); }
  G.goTat = { isOpen: function () { return !!state; } };

  // Lay "/abc" ngay truoc con tro trong cung text node
  function tokenAtCaret() {
    var s = window.getSelection();
    if (!s || !s.rangeCount || !s.isCollapsed) return null;
    var node = s.anchorNode, off = s.anchorOffset;
    if (!node || node.nodeType !== 3) return null;
    var before = node.data.slice(0, off);
    var m = before.match(/(?:^|[\s ])(\/[\w-]*)$/);
    if (!m) return null;
    return { node: node, start: off - m[1].length, end: off, token: m[1] };
  }

  function render() {
    var old = document.getElementById('otl-go-tat'); if (old) old.parentNode.removeChild(old);
    if (!state || !state.matches.length) { state = null; return; }
    var box = G.el('div', { id: 'otl-go-tat' });
    state.matches.forEach(function (k, i) {
      var r = G.el('div', { class: 'r' });
      if (i === state.idx) r.setAttribute('data-on', '');
      r.appendChild(G.el('span', { class: 'k' }, k));
      r.appendChild(G.el('span', { class: 'v' }, snippets[k] ? snippets[k].replace(/\n/g, ' ⏎ ') : '(chưa có nội dung — điền trong cau-hinh.json)'));
      r.addEventListener('mousedown', function (e) { e.preventDefault(); state.idx = i; choose(); });
      box.appendChild(r);
    });
    box.appendChild(G.el('div', { class: 'h' }, '↑↓ chọn · Tab/Enter chèn · Esc đóng'));
    var c = G.composer.el(), rc = c.getBoundingClientRect();
    box.style.left = Math.round(rc.left) + 'px';
    box.style.bottom = Math.round(window.innerHeight - rc.top + 8) + 'px';
    document.body.appendChild(box);
  }

  function choose() {
    if (!state) return;
    var k = state.matches[state.idx], text = snippets[k];
    if (!text) { G.toast('Mã ' + k + ' chưa có nội dung — điền trong cau-hinh.json', 'loi'); close(); return; }
    var r = document.createRange();
    r.setStart(state.node, state.start); r.setEnd(state.node, state.end);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    close();
    G.insertText(text);
  }

  G.on(document, 'input', function (e) {
    if (!(e.target.closest && e.target.closest(G.SEL.composer))) return;
    var t = tokenAtCaret();
    if (!t) { close(); return; }
    var matches = keys.filter(function (k) { return k.indexOf(t.token.toLowerCase()) === 0; })
      .sort(function (a, b) { return (!snippets[a]) - (!snippets[b]) || a.localeCompare(b); });
    state = { node: t.node, start: t.start, end: t.end, matches: matches, idx: 0 };
    render();
  });
  G.on(window, 'keydown', function (e) {
    var inComposer = e.target.closest && e.target.closest(G.SEL.composer);
    if (!inComposer) return;
    if (!state) {
      // Go du ma roi Tab (khong mo bang) cung chen
      if (e.key === 'Tab') {
        var t = tokenAtCaret();
        if (t && snippets.hasOwnProperty(t.token)) { e.preventDefault(); e.stopImmediatePropagation(); state = { node: t.node, start: t.start, end: t.end, matches: [t.token], idx: 0 }; choose(); }
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); e.stopImmediatePropagation();
      state.idx = (state.idx + (e.key === 'ArrowDown' ? 1 : -1) + state.matches.length) % state.matches.length; render();
    } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault(); e.stopImmediatePropagation(); choose();
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation(); close();
    }
  });
  G.on(document, 'mousedown', function (e) { if (state && !(e.target.closest && e.target.closest('#otl-go-tat'))) close(); });
  G.cleanup(close);
})(window.__otlGonG);
