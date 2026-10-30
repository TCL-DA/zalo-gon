// 00-loi: phan dung chung cho moi tinh nang Zalo gon.
//   G.cfg            cau hinh tu cau-hinh.json (zalo-gon.ps1 chen vao window.__otlGonCfg)
//   G.on / G.every   gan su kien / vong lap, tu go khi chen lai
//   G.hotkey         dang ky phim tat (1 bo nghe keydown chung)
//   G.toast / G.panel  thong bao nho / bang noi
//   G.bridge.call    goi cau noi Python (bridge.py) qua Runtime.addBinding
//   G.item / G.items / G.currentChat / G.composer  doc giao dien Zalo
(function () {
  // Chen lai: chay ham don dep cua lan truoc
  (window.__otlGonCleanups || []).forEach(function (fn) { try { fn(); } catch (e) { /* bo qua */ } });
  window.__otlGonCleanups = [];

  var G = window.__otlGonG = {};
  G.cfg = window.__otlGonCfg || {};
  G.cleanup = function (fn) { window.__otlGonCleanups.push(fn); };

  G.on = function (target, type, fn, capture) {
    target.addEventListener(type, fn, capture !== false);
    G.cleanup(function () { target.removeEventListener(type, fn, capture !== false); });
  };
  G.every = function (fn, ms) {
    var id = setInterval(function () { try { fn(); } catch (e) { console.error('[zalo-gon]', e); } }, ms);
    G.cleanup(function () { clearInterval(id); });
  };
  G.store = {
    get: function (k, d) { try { var v = localStorage.getItem('otl-gon-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('otl-gon-' + k, JSON.stringify(v)); } catch (e) { /* bo qua */ } }
  };

  // ---------- CSS ----------
  G.css = function (id, text) {
    var el = document.getElementById(id) || document.createElement('style');
    el.id = id; el.textContent = text;
    if (!el.parentNode) document.head.appendChild(el);
  };
  G.css('otl-gon-loi-css',
    ':root{--otl-bg:#2b3035;--otl-bg2:#22262b;--otl-line:#3c434b;--otl-text:#e8eaed;--otl-dim:#a3abb5;' +
      '--otl-blue:#0068ff;--otl-red:#e5484d;--otl-green:#2fb36d;--otl-amber:#f0a020}' +
    '.otl-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483000;' +
      'background:var(--otl-bg);color:var(--otl-text);border:1px solid var(--otl-line);border-radius:8px;' +
      'padding:8px 14px;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.4);pointer-events:none;max-width:70vw}' +
    '.otl-toast[data-kieu=loi]{border-color:var(--otl-red)}.otl-toast[data-kieu=ok]{border-color:var(--otl-green)}' +
    '.otl-panel{position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:2147482000;width:min(620px,92vw);' +
      'max-height:calc(100vh - 120px);overflow:auto;background:var(--otl-bg);color:var(--otl-text);' +
      'border:1px solid var(--otl-line);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.5);font-size:13px}' +
    '.otl-panel__head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--otl-line);' +
      'font-weight:600;font-size:14px}.otl-panel__head span{flex:1}' +
    '.otl-panel__x{cursor:pointer;color:var(--otl-dim);padding:2px 6px;border-radius:4px}.otl-panel__x:hover{background:var(--otl-bg2)}' +
    '.otl-panel__body{padding:14px 16px;display:flex;flex-direction:column;gap:10px;line-height:1.5}' +
    '.otl-panel__foot{display:flex;gap:8px;justify-content:flex-end;padding:10px 16px;border-top:1px solid var(--otl-line)}' +
    '.otl-btn{background:var(--otl-bg2);color:var(--otl-text);border:1px solid var(--otl-line);border-radius:6px;' +
      'padding:6px 14px;font-size:13px;cursor:pointer}.otl-btn:hover{border-color:var(--otl-dim)}' +
    '.otl-btn[data-chinh]{background:var(--otl-blue);border-color:var(--otl-blue);color:#fff}' +
    '.otl-btn:disabled{opacity:.45;cursor:default}' +
    '.otl-lbl{color:var(--otl-dim);font-size:12px;margin-bottom:2px}' +
    '.otl-in{width:100%;box-sizing:border-box;background:var(--otl-bg2);color:var(--otl-text);border:1px solid var(--otl-line);' +
      'border-radius:6px;padding:6px 8px;font:inherit}textarea.otl-in{min-height:64px;resize:vertical}' +
    '.otl-box{background:var(--otl-bg2);border:1px solid var(--otl-line);border-radius:6px;padding:8px 10px;white-space:pre-wrap;word-break:break-word}' +
    '.otl-ok{color:var(--otl-green)}.otl-err{color:var(--otl-red)}.otl-dim{color:var(--otl-dim)}' +
    '.otl-kbd{display:inline-block;min-width:16px;padding:0 5px;border:1px solid var(--otl-line);border-radius:4px;' +
      'background:var(--otl-bg2);font-size:12px;text-align:center}');

  // ---------- Thong bao nho ----------
  var toastTimer = null;
  G.toast = function (msg, kieu, ms) {
    var el = document.getElementById('otl-toast') || document.createElement('div');
    el.id = 'otl-toast'; el.className = 'otl-toast'; el.textContent = msg; el.setAttribute('data-kieu', kieu || '');
    if (!el.parentNode) document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms || 2600);
  };

  // ---------- Bang noi (1 bang tai 1 thoi diem) ----------
  // opts: {title, body: Node, buttons: [{text, chinh, onClick(close)}], onClose}
  G.panel = function (opts) {
    G.closePanel();
    var p = document.createElement('div');
    p.className = 'otl-panel'; p.id = 'otl-panel';
    if (opts.width) p.style.width = 'min(' + opts.width + 'px,94vw)';
    var head = document.createElement('div'); head.className = 'otl-panel__head';
    var t = document.createElement('span'); t.textContent = opts.title || '';
    var x = document.createElement('div'); x.className = 'otl-panel__x'; x.textContent = '✕'; x.title = 'Đóng (Esc)';
    head.appendChild(t); head.appendChild(x);
    var body = document.createElement('div'); body.className = 'otl-panel__body';
    if (opts.body) body.appendChild(opts.body);
    p.appendChild(head); p.appendChild(body);
    var close = function () { G.closePanel(); };
    if (opts.buttons && opts.buttons.length) {
      var foot = document.createElement('div'); foot.className = 'otl-panel__foot';
      opts.buttons.forEach(function (b) {
        var btn = document.createElement('button'); btn.className = 'otl-btn'; btn.textContent = b.text;
        if (b.chinh) btn.setAttribute('data-chinh', '');
        if (b.id) btn.id = b.id;
        btn.addEventListener('click', function () { b.onClick && b.onClick(close, btn); });
        foot.appendChild(btn);
      });
      p.appendChild(foot);
    }
    x.addEventListener('click', close);
    p.__onClose = opts.onClose;
    document.body.appendChild(p);
    return { el: p, body: body, close: close };
  };
  G.closePanel = function () {
    var p = document.getElementById('otl-panel');
    if (!p) return false;
    var cb = p.__onClose; p.parentNode.removeChild(p);
    if (cb) try { cb(); } catch (e) { /* bo qua */ }
    return true;
  };
  // O nhap co nhan phia tren (bang Trello, Kho dung chung)
  G.field = function (label, input) {
    var w = document.createElement('div');
    var l = document.createElement('div'); l.className = 'otl-lbl'; l.textContent = label;
    w.appendChild(l); w.appendChild(input);
    return w;
  };
  G.el = function (tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // ---------- Phim tat ----------
  // ten phim: 'Ctrl+Shift+KeyL', 'Alt+ArrowUp', 'F1', 'Ctrl+Digit1' (theo e.code)
  var hotkeys = {};
  G.hotkey = function (combo, fn, moTa) { hotkeys[combo] = { fn: fn, moTa: moTa }; };
  G.hotkeyList = function () { return Object.keys(hotkeys).map(function (k) { return { phim: k, moTa: hotkeys[k].moTa }; }); };
  // Chay tinh nang cua 1 phim tat (nut tren thanh cong cu dung lai cung ham)
  G.runHotkey = function (combo, opts) {
    var h = hotkeys[combo];
    if (!h) return;
    try { h.fn(opts || {}); } catch (err) { console.error('[zalo-gon]', err); G.toast('Lỗi: ' + err.message, 'loi'); }
  };
  // Gan o window (pha capture) de chay TRUOC moi bo nghe phim cua Zalo
  G.on(window, 'keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('otl-panel')) { G.closePanel(); e.preventDefault(); e.stopPropagation(); return; }
    var combo = (e.ctrlKey ? 'Ctrl+' : '') + (e.altKey ? 'Alt+' : '') + (e.shiftKey ? 'Shift+' : '') + e.code;
    var h = hotkeys[combo];
    if (!h) return;
    e.preventDefault(); e.stopPropagation();
    try { h.fn(e); } catch (err) { console.error('[zalo-gon]', err); G.toast('Lỗi: ' + err.message, 'loi'); }
  });

  // ---------- Cau noi Python (bridge.py goi Runtime.addBinding '__otlGonBridgeSend') ----------
  var pending = {}, seq = 0;
  window.__otlGonBridgeReply = function (msg) {
    var p = pending[msg.id];
    if (!p) return;
    delete pending[msg.id];
    if (msg.ok) p.resolve(msg.data); else p.reject(new Error(msg.loi || 'Lỗi cầu nối'));
  };
  G.bridge = {
    ready: function () { return typeof window.__otlGonBridgeSend === 'function'; },
    call: function (method, data, timeoutMs) {
      if (!G.bridge.ready()) return Promise.reject(new Error('Cầu nối chưa chạy — đóng Zalo rồi mở lại bằng lối tắt Zalo.'));
      var id = ++seq;
      return new Promise(function (resolve, reject) {
        pending[id] = { resolve: resolve, reject: reject };
        setTimeout(function () { if (pending[id]) { delete pending[id]; reject(new Error('Cầu nối không trả lời (quá giờ).')); } }, timeoutMs || 60000);
        window.__otlGonBridgeSend(JSON.stringify({ id: id, method: method, data: data || {} }));
      });
    }
  };

  // ---------- Doc giao dien Zalo ----------
  G.SEL = {
    item: '#conversationListId .msg-item',
    composer: '#richInput',
    bubble: '[data-component="bubble-message"]',
    msgText: '[data-component="message-text-content"]',
    msgScroll: '#messageViewScroll'
  };
  G.txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
  G.item = function (it) {
    var name = G.txt(it.querySelector('.conv-item-title__name'));
    var senderEl = it.querySelector('.z-conv-message__preview-sender-name');
    var sender = senderEl ? G.txt(senderEl) : '';
    var conv = it.querySelector('.conv-item') || it;
    var community = !!it.querySelector('.community__conv-indicator');
    var multi = !!it.querySelector('.zavatar-multi');
    return {
      el: it, conv: conv, name: name, sender: sender,
      time: G.txt(it.querySelector('.preview-time')),
      fromMe: sender === 'Bạn:',
      isGroup: community || multi || (!!sender && sender !== 'Bạn:'),
      muted: !!it.querySelector('[class*=mute], [class*=Mute]'),
      pinned: /\bpinned\b/.test(it.className),
      selected: /\bselected\b/.test(conv.className),
      top: parseFloat(it.style.top) || 0
    };
  };
  G.items = function () { return Array.prototype.map.call(document.querySelectorAll(G.SEL.item), G.item); };
  // So sanh ten khong phan biet khoang trang la (Zalo dung NBSP trong ten)
  G.sameName = function (a, b) { return String(a).replace(/\s+/g, ' ').trim() === String(b).replace(/\s+/g, ' ').trim(); };
  G.findItem = function (name) { return G.items().filter(function (i) { return G.sameName(i.name, name); })[0] || null; };
  // Mo 1 cuoc tro chuyen trong danh sach (phim nhay + MCP otl-zalo dung chung)
  G.openItem = function (info) {
    ['mousedown', 'mouseup', 'click'].forEach(function (t) {
      info.conv.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window, button: 0 }));
    });
    setTimeout(function () { var c = G.composer.el(); if (c) c.focus(); }, 150);
  };
  // Doc 1 tin nhan (bubble) -> {ms, ai, noi_dung}; ms lay tu id bb_msg_id_<epoch ms>
  G.readBubble = function (b) {
    var m = (b.id || '').match(/bb_msg_id_(\d{13})/);
    if (!m) return null;
    var me = !!b.querySelector('[data-id^="div_SentMsg"]') || !!b.querySelector('.card-send-time.me, .me');
    var t = b.querySelector(G.SEL.msgText);
    var text = t ? t.innerText.trim() : '';
    if (!text) {
      var ft = b.querySelector('.file-message__content-title');
      if (ft) {
        // Zalo tach ten tep thanh nhieu doan chu trong .file-message__content-title -> textContent ghep lai
        var size = G.txt(b.querySelector('.file-message__content-info-size'));
        text = '[Tệp] ' + ft.textContent.trim() + (size ? ' (' + size + ')' : '');
      } else if (b.querySelector('[id$="_VideoMessageNonCaption_undefined"], video')) text = '[Video]';
      else if (b.querySelector('[id*="ImageMessage"], [id*="ImageGroupMessage"], img[id^="img-"]')) text = '[Hình ảnh]';
      else {
        // Loai tin khac: bo phan cam xuc + gio gui de khong lan chu thua
        var c2 = b.cloneNode(true);
        c2.querySelectorAll('.message-reaction-container, .card-send-time').forEach(function (e) { e.remove(); });
        text = '[' + (G.txt(c2).slice(0, 80) || 'Tin không phải chữ') + ']';
      }
    }
    var senderEl = b.querySelector('[class*="sender-name"], [class*="message-sender"], [class*="chat-message__name"]');
    return { ms: +m[1], ai: me ? 'Bạn' : (senderEl ? G.txt(senderEl) : ''), noi_dung: text };
  };
  G.currentChat = function () {
    var title = G.txt(document.querySelector('#header .header-title'));
    var sel = G.items().filter(function (i) { return i.selected; })[0];
    var sub = G.txt(document.querySelector('#header .header-subtitle'));
    var memberMatch = sub.match(/(\d+)\s*thành viên/i);
    return {
      name: title, item: sel || null,
      isGroup: !!memberMatch || !!(sel && sel.isGroup) || !!document.querySelector('#header .zavatar-multi'),
      members: memberMatch ? parseInt(memberMatch[1], 10) : null
    };
  };
  // ---------- Chon tin nhan lam nguon (Trello, Kho dung chung) ----------
  var hoveredBubble = null;
  G.on(document, 'mouseover', function (e) {
    var b = e.target.closest && e.target.closest(G.SEL.bubble);
    if (b) hoveredBubble = b;
  });
  G.bubbleText = function (b) { var t = b && b.querySelector(G.SEL.msgText); return t ? t.innerText.trim() : ''; };
  G.bubbleTime = function (b) { var m = ((b && b.id) || '').match(/bb_msg_id_(\d{13})/); return m ? new Date(+m[1]) : null; };
  // Tin chu moi nhat cua nguoi kia; khong co (vd My Documents) thi tin chu moi nhat bat ky
  G.latestIncoming = function () {
    var all = document.querySelectorAll(G.SEL.bubble), anyText = null;
    for (var i = all.length - 1; i >= 0; i--) {
      if (!all[i].querySelector(G.SEL.msgText)) continue;
      if (!anyText) anyText = all[i];
      var r = G.readBubble(all[i]);
      if (r && r.ai !== 'Bạn') return all[i];
    }
    return anyText;
  };
  // Chu boi den -> tin dang re chuot (khi bam phim) -> tin moi nhat cua nguoi kia.
  // opts.tuNut (bam nut tren thanh cong cu): bo qua tin dang re chuot vi chuot vua di ngang khung chat.
  G.pickMessage = function (opts) {
    var s = window.getSelection(), picked = s && s.toString().trim();
    var b = !(opts && opts.tuNut) && hoveredBubble && document.body.contains(hoveredBubble) ? hoveredBubble : null;
    if (!picked && !b) b = G.latestIncoming();
    return { text: picked || G.bubbleText(b), bubble: b, time: G.bubbleTime(b) };
  };
  G.fmtTime = function (d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  };

  G.composer = {
    el: function () { return document.querySelector(G.SEL.composer); },
    text: function () { var c = G.composer.el(); return c ? c.innerText.replace(/ /g, ' ').replace(/\n+$/, '') : ''; },
    // Thay toan bo noi dung o nhap (dung execCommand de React cua Zalo nhan biet)
    setText: function (text) {
      var c = G.composer.el(); if (!c) return false;
      c.focus();
      var r = document.createRange(); r.selectNodeContents(c);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      G.insertText(text);
      return true;
    }
  };
  // Chen chu tai con tro, xuong dong bang insertLineBreak (tranh Enter = gui)
  G.insertText = function (text) {
    var lines = String(text).split('\n');
    lines.forEach(function (line, i) {
      if (i > 0) document.execCommand('insertLineBreak');
      if (line) document.execCommand('insertText', false, line);
    });
  };

  // ---------- Theo doi danh sach thay doi (virtualized: Zalo ve lai khi cuon) ----------
  var listFns = [], listTimer = null;
  G.onListChange = function (fn) { listFns.push(fn); };
  function runList() { listTimer = null; listFns.forEach(function (fn) { try { fn(); } catch (e) { console.error('[zalo-gon]', e); } }); }
  G.kickList = function () { if (!listTimer) listTimer = setTimeout(runList, 120); };
  var mo = new MutationObserver(G.kickList);
  var observed = null;
  G.every(function () {
    var root = document.getElementById('conversationListId');
    if (root && root !== observed) { mo.disconnect(); mo.observe(root, { childList: true, subtree: true, characterData: true }); observed = root; G.kickList(); }
  }, 1500);
  G.every(G.kickList, 30000);   // gio "N phut" doi theo thoi gian
  G.cleanup(function () { mo.disconnect(); });
})();
