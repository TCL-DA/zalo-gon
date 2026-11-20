// 05-ao-te: ao "teenage engineering" cho Zalo.
//   Nen sang #f6f8f7, net ke den, 0 bo goc, 0 do bong, 0 chuyen mau; mau chi de bao TRANG THAI.
//   Chu CO Y DAM (600/700) cho de doc - khac ban goc TE dung net 100 manh nhu soi toc.
//   Bat/tat: Ctrl+Shift+Y hoac nut o vuong tren thanh cong cu. Mac dinh BAT, nho qua localStorage.
//
// Cach lam - 3 lop, lop sau vet not cho lop truoc:
//   1. Bo class 'dark' cua <body>. Giao dien toi cua Zalo chi la 211 luat phu len class nay,
//      go ra la co ban SANG day du, chay san.
//   2. Viet de 640 BIEN THIET KE cua Zalo (--text-primary, --layer-background, --cta-link...).
//      Zalo ve gan nhu ca ung dung bang bo bien nay, nen doi bien la doi luon ca nhung man hinh
//      chua mo bao gio (cai dat, danh ba, tim kiem, hop thoai).
//   3. Mot it luat viet tay cho nhung cho Zalo cam thang ma mau, cong them luat hinh khoi
//      (bo goc, do bong, do dam chu) va net rieng cua TE (cot trai den, tin cua minh = khoi den).
// Khong sua file nao cua Zalo: go thuoc tinh data-otl-skin la ve y nhu cu.
(function (G) {
  var KEY = 'ao-te';
  var bat = G.store.get(KEY, true);

  // ================= 1. Bang mau =================
  var M = {
    canvas: '#f6f8f7',   // nen chinh
    giay:   '#ffffff',   // the / bong bong nguoi khac
    xam1:   '#eceeed',   // re chuot
    xam2:   '#e4e7e6',   // dang chon
    carbon: '#0f0e12',   // khoi den (cot trai, tin cua minh, nut chinh)
    carbon2:'#2a2a30',   // khoi den khi re chuot
    net:    '#d2d4d3',   // net ke thuong (dam hon chuan TE #e5e5e5 cho de thay)
    netMo:  '#e2e4e3',
    muc:    '#000000',
    phu:    '#45474b',   // chu phu (dam hon chuan TE #b2b2b2 cho doc duoc)
    mo:     '#9a9d9b',
    lien:   '#0071bb'    // mau lien ket cua chinh TE - mau "khong trung tinh" duy nhat duoc giu
  };

  // ================= 2. Viet de bien thiet ke cua Zalo =================
  // Bien nao KHONG co o day la co y giu nguyen: do / vang / xanh la cua canh bao, loi, thanh cong -
  // TE cho phep mau khi mau mang nghia TRANG THAI.
  var BIEN = {
    // --- chu ---
    'text-primary': M.muc, 'text-secondary': M.phu, 'text-quote': M.phu,
    'text-placeholder': '#6b6e72', 'text-disabled': M.mo, 'text-on-color': M.canvas,
    'text-on-disabled-color': M.mo, 'text-information': M.muc, 'text-mention': M.muc,
    'text-navbar-sublevel-normal': M.muc, 'text-navbar-sublevel-selected': M.muc,
    // --- bieu tuong ---
    'icon-primary': M.muc, 'icon-secondary': M.phu, 'icon-disabled': M.mo,
    'icon-on-color': M.canvas, 'icon-on-disabled-color': M.mo, 'icon-information': M.muc,
    'icon-hover-bg': M.xam2, 'icon-navbar-normal': M.canvas,
    'icon-navbar-disabled': 'rgba(246,248,247,.45)',
    'icon-navbar-sublevel-normal': M.muc, 'icon-navbar-sublevel-selected': M.muc,
    'input-icon-gr': M.muc, 'input-icon-wh': M.muc,
    // --- mat phang ---
    'surface-background': M.canvas, 'surface-background-subtle': M.xam1,
    'surface-background-overlay': M.canvas, 'surface-alt': M.giay,
    'layer-background': M.giay, 'layer-background-hover': M.xam1,
    'layer-background-subtle': M.xam1, 'layer-background-selected': M.xam2,
    'layer-background-disabled': M.xam1, 'layer-background-CSC': M.canvas,
    'layer-background-pinned': 'rgba(0,0,0,.04)',
    'layer-background-inverse': M.giay, 'layer-background-inverse-subtle': M.carbon,
    'layer-information-background': M.xam1, 'layer-neutral-information-background': M.xam1,
    'reaction-background': M.giay,
    // --- cot bieu tuong trai = "buc tuong tu kinh" ---
    'layer-background-leftmenu': M.carbon, 'layer-background-leftmenu-hover': M.carbon2,
    'layer-background-leftmenu-selected': M.carbon2,
    'layer-background-navbar-normal': M.carbon,
    'layer-background-navbar-hover': 'rgba(246,248,247,.14)',
    'layer-background-navbar-selected': 'rgba(246,248,247,.22)',
    'layer-background-navbar-sublevel-normal': M.giay,
    'layer-background-navbar-sublevel-hover': M.xam1,
    'layer-background-navbar-sublevel-selected': M.xam2,
    // --- net ke: TE to chuc trang bang net 1 px chu khong bang nen hay bong ---
    'border': M.net, 'border-subtle': M.netMo, 'border-vanish': M.netMo,
    'border-bold': M.muc, 'border-hover': M.muc, 'border-focused': M.muc,
    'border-highlight': M.muc, 'border-information': M.muc, 'border-on-color': M.canvas,
    'border-support-neutral': M.net, 'border-support-information': M.net,
    'border-disabled': M.netMo,
    'divider': M.net, 'divider-bold': M.muc, 'divider-subtle': M.netMo,
    // --- cong tac / trang thai bat tat: BAT = den dac, TAT = trang vien ---
    'background-activeness': M.carbon, 'background-activeness-disabled': M.mo,
    'background-inactiveness': M.giay, 'background-inactiveness-subtle': '#b2b2b2',
    'background-inactiveness-disabled': M.xam1,
    'background-hovertips': M.carbon, 'background-popover-tips': M.carbon,
    'background-control-alpha': 'rgba(15,14,18,.78)',
    'background-control-alpha-hover': 'rgba(15,14,18,.9)',
    // --- lien ket: giu DUNG MOT mau khong trung tinh, dung mau cua chinh TE ---
    'cta-link': M.lien, 'cta-link-primary': M.lien, 'cta-link-hover': '#005a95',
    'cta-link-pressed': '#00456f', 'cta-link-disabled': M.mo, 'cta-link-neutral': M.muc,
    'cta-link-neutral-disable': M.mo, 'link': M.lien,
    // --- nut ---
    'button-primary-text': M.canvas, 'button-primary-focus-text': M.canvas,
    'button-primary-text-disabled': M.mo,
    'button-primary-tonal-text': M.muc, 'button-primary-tonal-focus-text': M.muc,
    'button-primary-on-color-text': M.muc, 'button-primary-on-color-focus-text': M.muc,
    'button-secondary-neutral-text': M.muc, 'button-secondary-neutral-focus-text': M.muc,
    'button-tertiary-neutral-text': M.muc, 'button-tertiary-neutral-focus-text': M.muc,
    'button-tertiary-primary-text': M.muc, 'button-tertiary-primary-focus-text': M.muc,
    'button-tertiary-on-color-text': M.canvas, 'button-tertiary-on-color-focus-text': M.canvas,
    'button-ghost-neutral-text': M.muc, 'button-ghost-neutral-focus-text': M.muc,
    'button-ghost-primary-text': M.muc, 'button-ghost-primary-focus-text': M.muc,
    'button-ghost-on-color-text': M.canvas,
    // --- nhom "accent xanh" cua Zalo: dua het ve den / xam ---
    'accent-blue-text': M.muc, 'accent-blue-text-bold': M.muc, 'accent-blue-text-subtle': M.phu,
    'accent-blue-icon': M.muc, 'accent-blue-icon-bold': M.muc, 'accent-blue-icon-subtle': M.phu,
    'accent-blue-border': M.muc, 'accent-blue-border-bold': M.muc, 'accent-blue-border-subtle': M.net
  };

  // Bien duoc khai bao o ':root .default' / ':root .dark' (do uu tien 0,2,0) nen phai co !important
  var dongBien = Object.keys(BIEN).map(function (k) { return '--' + k + ':' + BIEN[k] + '!important'; }).join(';');

  // ================= 3. Quet bat nhung cho Zalo cam thang ma mau =================
  // Con mot it luat khong dung bien (mau xanh Zalo, nen xanh nhat cua bong bong). Quet mot luot
  // qua styleSheets, luat nao dat dung nhung mau do thi sinh luat de len, giu nguyen bo chon goc.
  // Bo qua luat cua giao dien toi (.dark) vi ao chay tren nen sang.
  var DOI_CHU = {
    'rgb(8, 27, 58)': M.muc, 'rgb(68, 84, 111)': M.phu, 'rgb(90, 105, 129)': M.phu,
    'rgb(119, 133, 156)': M.phu, 'rgb(0, 104, 255)': M.muc, 'rgb(0, 90, 224)': M.muc
  };
  var DOI_NEN = {
    'rgb(0, 104, 255)': M.carbon, 'rgb(0, 90, 224)': M.carbon,
    'rgb(229, 241, 255)': M.giay, 'rgb(199, 224, 255)': M.xam2, 'rgb(235, 236, 240)': M.xam1
  };
  var DOI_VIEN = {
    'rgb(0, 104, 255)': M.muc, 'rgb(0, 90, 224)': M.muc, 'rgb(199, 224, 255)': M.net
  };
  function datTruoc(sel) {
    return sel.split(',').map(function (s) {
      s = s.trim();
      if (!s) return s;
      if (/^(html|:root)/i.test(s)) return s.replace(/^(html|:root)/i, 'html[data-otl-skin="te"]');
      return 'html[data-otl-skin="te"] ' + s;
    }).join(',');
  }
  // ---- Doc duoc mau that cua mot gia tri CSS (ke ca var(--x)) ----
  // Phai tra bien theo BIEN cua MINH truoc: bang nay nap vao trang TRUOC bang dinh nghia bien,
  // nen luc quet ma hoi trinh duyet thi van ra gia tri cu cua Zalo -> tinh sai.
  // Zalo khai ~640 bien o ":root .default" - tuc la tren #app-page, KHONG phai tren <body>.
  // Luc quet thi ao chua ap, body chua co bien nao -> hoi getComputedStyle(body) se ra rong
  // va moi mau var(--x) deu khong doc duoc (do that: 541/556 mau tra ve null).
  // Nen tu dung lay mot BANG BIEN tu chinh bang CSS cua Zalo, roi phu bo cua minh len tren.
  var BANG_BIEN = null;
  function bangBien() {
    if (BANG_BIEN) return BANG_BIEN;
    var t = {};
    for (var i = 0; i < document.styleSheets.length; i++) {
      var ss = document.styleSheets[i], r;
      if (ss.ownerNode && /^otl-gon-/.test(ss.ownerNode.id || '')) continue;
      try { r = ss.cssRules; } catch (e) { continue; }
      for (var j = 0; j < r.length; j++) {
        var rl = r[j];
        if (!rl.style || !rl.selectorText || /\.dark/.test(rl.selectorText)) continue;
        for (var k = 0; k < rl.style.length; k++) {
          var pr = rl.style[k];
          if (pr.slice(0, 2) === '--') t[pr.slice(2)] = rl.style.getPropertyValue(pr).trim();
        }
      }
    }
    for (var k2 in BIEN) t[k2] = String(BIEN[k2]);   // ao cua minh de len tren cung
    BANG_BIEN = t;
    return t;
  }
  function giaTriBien(ten) {
    var v = bangBien()[ten.replace(/^--/, '')];
    return v == null ? '' : v;
  }
  // Doi mot gia tri mau CSS ra so. KHONG tu viet bo doc mau nua: ban tu viet bang bieu thuc
  // chinh quy tra ve null cho 541/556 mau (hut cac dang hsl, color-mix, chuoi nhieu lop...).
  // Cach chac an: dung mot the an co san CA 797 bien, gan mau vao roi doc lai - trinh duyet
  // tu lo phan doi, dung het moi cu phap mau no ho tro.
  var THE_THU = null;
  function theThu() {
    if (THE_THU) return THE_THU;
    var e = document.createElement('span');
    e.setAttribute('aria-hidden', 'true');
    e.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;pointer-events:none';
    var t = bangBien();
    for (var k in t) { try { e.style.setProperty('--' + k, t[k]); } catch (x) {} }
    (document.body || document.documentElement).appendChild(e);
    THE_THU = e;
    return e;
  }
  function raMau(v) {
    if (!v) return null;
    v = String(v).trim();
    // Nhung tu khoa nay phu thuoc ngu canh -> khong doan duoc, bo qua chu dung doan bua
    if (!v || /gradient|url\(/i.test(v)) return null;
    if (/^(inherit|initial|unset|revert|revert-layer|currentcolor|transparent|none|auto)$/i.test(v)) return null;
    var e = theThu();
    e.style.color = '';
    e.style.color = v;
    if (!e.style.color) return null;          // trinh duyet khong hieu gia tri nay
    var m = getComputedStyle(e).color.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var a = m[1].split(',').map(parseFloat);
    if (a.length > 3 && a[3] < 0.5) return null;   // qua trong suot thi khong biet nen that
    return a;
  }
  function sangCua(c) {
    var a = c.slice(0, 3).map(function (x) {
      x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function tpMau(f, b) {
    var x = sangCua(f), y = sangCua(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  var MUC_RGB = [15, 14, 18], GIAY_RGB = [246, 248, 247];

  function quetBangMau() {
    var ra = [], da = {}, n = 0;
    for (var i = 0; i < document.styleSheets.length; i++) {
      var ss = document.styleSheets[i], r;
      if (ss.ownerNode && /^otl-gon-/.test(ss.ownerNode.id || '')) continue;
      try { r = ss.cssRules; } catch (e) { continue; }
      for (var j = 0; j < r.length && n < 4000; j++) {
        var sel = r[j].selectorText, st = r[j].style;
        if (!sel || !st || /\.dark\b/.test(sel)) continue;
        var doi = [];
        if (st.color && DOI_CHU[st.color]) doi.push('color:' + DOI_CHU[st.color]);
        if (st.backgroundColor && DOI_NEN[st.backgroundColor]) doi.push('background-color:' + DOI_NEN[st.backgroundColor]);
        ['borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']
          .forEach(function (p) {
            if (st[p] && DOI_VIEN[st[p]]) {
              doi.push(p.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + ':' + DOI_VIEN[st[p]]);
            }
          });
        // TE khong co chuyen mau: tat rieng tung luat co gradient, KHONG tat ca background-image
        // (anh dai dien / anh xem truoc cua Zalo cung ve bang background-image)
        if (st.backgroundImage && /gradient/.test(st.backgroundImage)) doi.push('background-image:none');
        // Zalo tach cac lop NOI (menu, popover, hop thoai, nut troi) CHI bang do bong.
        // Ao TE tat het do bong -> chung thanh khoi trang tren nen trang, mat han duong vien.
        // Tra lai bang NET KE 1px. Dung outline chu khong phai border: outline khong day lai
        // bo cuc, offset -1px cho net nam gon ben trong, khong trum ra ngoai.
        // KHONG tra net cho do choi be xiu cua phan tha cam xuc: mot o den 1px quanh nut
        // 24x24 nhin nhu loi ("cai icon khong"). Chan ngay tu luc sinh luat, chu viet luat
        // de len thi thua - luat goc cua Zalo nhieu khi cu the hon nen no thang.
        var bs = st.boxShadow;
        if (bs && bs !== 'none' && bs.indexOf('inset') < 0 && !/react/i.test(sel)) {
          doi.push('outline:1px solid ' + M.carbon);
          doi.push('outline-offset:-1px');
        }
        // ---- Soat cap CHU/NEN nam trong CUNG MOT LUAT ----
        // Day la cho ao de lo nhieu nhat: Zalo dung --text-on-color (chu tren nen mau) cho ca
        // nhung be mat ma ao nay da doi thanh SANG -> chu sang tren nen sang, mat hut.
        // Vi du that: .chat-info-general__action__item__icon::after = 1,07:1;
        // nhom .user-mode-icon-avt > i.* = 1,09:1 (mat ca loat bieu tuong anh / lien ket).
        // Nguoi canh luc chay khong voi toi duoc cho nay vi chung la ::after, khong co chu that.
        // Bo qua hai truong hop CO Y: chu trung mau nen (cham tron, mui bong nhac ve bang
        // currentColor) va trang thai bi khoa (disabled - mo nhat la dung).
        if (st.color && (st.backgroundColor || st.background) && !/disabled/i.test(sel)) {
          var nenRaw = st.backgroundColor || st.background;
          var cMau = raMau(DOI_CHU[st.color] || st.color);
          var nMau = raMau(DOI_NEN[st.backgroundColor] || nenRaw);
          if (cMau && nMau && String(st.color).trim() !== String(nenRaw).trim() && tpMau(cMau, nMau) < 4.5) {
            doi.push('color:' + (tpMau(MUC_RGB, nMau) >= tpMau(GIAY_RGB, nMau) ? M.muc : M.canvas));
          }
        }
        if (!doi.length) continue;
        var dong = datTruoc(sel) + '{' + doi.join('!important;') + '!important}';
        if (da[dong]) continue;
        da[dong] = 1; ra.push(dong); n++;
      }
    }
    return ra.join('\n');
  }
  // Nap TRUOC khoi CSS chinh de khoi chinh thang khi trung do uu tien
  G.css('otl-gon-ao-te-map-css', quetBangMau());
  // Zalo nap them tep CSS sau khi vao (man hinh goi, vi, mini app) -> quet lai mot lan nua.
  // Quet het ~16.000 luat chi vai chuc mili giay, chay 1 lan nua khong anh huong gi.
  var soTep = document.styleSheets.length;
  setTimeout(function () {
    if (document.styleSheets.length !== soTep) G.css('otl-gon-ao-te-map-css', quetBangMau());
  }, 8000);

  // ================= 4. Luat hinh khoi + net rieng cua TE =================
  var S = 'html[data-otl-skin="te"] ';
  G.css('otl-gon-ao-te-css',
    'html[data-otl-skin="te"]{--te-canvas:' + M.canvas + ';--te-paper:' + M.giay + ';' +
      '--te-carbon:' + M.carbon + ';--te-line:' + M.net + ';--te-ink:' + M.muc + ';--te-dim:' + M.phu + ';' +
      // 10-an-danh-sach doc mau nen cot nav luc chen -> ep lai cho khop ao (dat inline nen can !important)
      '--otl-gon-bg:' + M.canvas + '!important;' +
      // Cac bang cua chinh Zalo gon (Kho, Trello, go tat, F1) ve bang bo bien o 00-loi.js.
      // Khong doi thi ao sang ma bang van den si - lech han. (00-loi dat o :root, do uu tien thap hon.)
      '--otl-bg:' + M.giay + ';--otl-bg2:' + M.canvas + ';--otl-line:' + M.net + ';' +
      '--otl-text:' + M.muc + ';--otl-dim:' + M.phu + ';--otl-blue:' + M.carbon + '}' +
    S + '.otl-panel,' + S + '.otl-toast,' + S + '#otl-go-tat{border:1px solid ' + M.muc + '!important}' +
    S + '.otl-btn[data-chinh]{color:' + M.canvas + '!important}' +
    S + '.otl-kbd{font-weight:700!important}' +
    // Viet de bo bien thiet ke cua Zalo (xem muc 2)
    'html[data-otl-skin="te"] body{' + dongBien + '}' +
    'html[data-otl-skin="te"] body{background:' + M.canvas + '!important;color:' + M.muc + '!important}' +

    // --- Hinh khoi: 0 bo goc, 0 do bong, 0 chuyen mau ---
    // (khong dat background-image:none o day: Zalo ve anh dai dien, anh xem truoc, nhan dan
    //  bang background-image - cat het la mat anh. Chuyen mau bi tat trong quetBangMau.)
    // Anh dai dien giu TRON - nhan ra nguoi quen nhanh hon o danh sach dai.
    // (Truoc dung [class*="avatar"] - kieu chon nay bat Chromium do chuoi class cua MOI
    //  phan tu moi lan ve lai khung. Doi sang ten class co that.)
    S + '.avatar img,' + S + '.zavatar img,' + S + '.avatar-img img,' + S + '.a-child{border-radius:50%!important}' +

    // --- Chu DAM cho de doc: xem bang 'chung' o duoi ---
    S + 'h1,' + S + 'h2,' + S + 'h3,' + S + 'h4,' + S + 'button,' + S + '.z--btn--v2,' +
      S + '.header-title,' + S + '.conv-item-title__name,' + S + '.chat-info__header,' +
      S + '.chat-info-general__section__header{font-weight:700!important}' +

    // --- Khung chat: Zalo phu them mot lop xam-xanh len day ---
    S + '#chatView,' + S + '#chatViewContainer,' + S + '.message-view__blur__overlay,' +
      S + '.message-view__blur__overlay_noavatar,' + S + '#messageViewScroll,' + S + '#titleBar{' +
      'background:var(--te-canvas)!important}' +
    S + '#titleBar{border-bottom:1px solid var(--te-line)!important}' +

    // --- Net ke thay cho do bong / nen xam ---
    S + '#header,' + S + '#contact-search,' + S + '.msg-filters-bar,' + S + '#chat-box-bar-id,' +
      S + '.chat-info__header,' + S + '.chat-group-topic-outer{border-bottom:1px solid var(--te-line)!important}' +
    S + '#chatInput{border-top:1px solid var(--te-line)!important}' +
    // Zalo KHONG co #chatInfo (0 luat trong bang CSS) - bang thong tin ben phai la .chat-info
    S + '.chat-info{border-left:1px solid var(--te-line)!important}' +
    S + '[data-otl-gon="auto"]{background:var(--te-canvas)!important;' +
      'border-right:1px solid var(--te-ink)!important;box-shadow:none!important}' +

    // --- Danh sach tro chuyen: hang ke, khong the bo goc ---
    S + '.msg-item{border-bottom:1px solid var(--te-line)!important}' +
    S + '.msg-item .conv-item.selected,' + S + '.conv-item.selected{border-left:3px solid var(--te-ink)!important}' +

    // --- Bong bong tin nhan: tin CUA MINH = khoi den, tin nguoi khac = giay vien den ---
    S + '.card{background:var(--te-paper)!important;border:1px solid var(--te-ink)!important;color:var(--te-ink)!important}' +
    S + '.card.me{background:var(--te-carbon)!important;border-color:var(--te-carbon)!important;color:#f6f8f7!important}' +
    S + '.card.me *{color:#f6f8f7!important}' +
    S + '.card.me a,' + S + '.card.me .text-is-link{color:#9fc8ff!important}' +
    // Bong bong anh: khong ve vien de khong cat vao anh
    S + '.img-msg-v2__bub,' + S + '.img-center-box{border:none!important;background:#e9ebea!important}' +

    // --- Moc thoi gian giua dong tin: nhan ky thuat, khong phai vien thuoc xam ---
    S + '.chat-date .content,' + S + '.block-date .content{background:transparent!important;' +
      'color:var(--te-dim)!important;border:1px solid var(--te-line)!important;padding:1px 10px!important;' +
      'font-size:11px!important;letter-spacing:.06em!important;text-transform:uppercase}' +
    // Gio gui trong bong bong: chi la chu phu, KHONG phai the den (the den trong bong bong trang
    // nhin nhu loi); rieng gio DE LEN ANH thi moi can khoi den de doc duoc tren moi anh
    S + '.card-send-time__sendTime{background:transparent!important;color:var(--te-dim)!important;' +
      'padding:0!important}' +
    S + '.card.me .card-send-time__sendTime{color:#b2b2b2!important}' +
    S + '.img-msg-v2__bub .card-send-time__sendTime,' + S + '.bubble-message-time,' +
      S + '.img-center-box .card-send-time__sendTime{background:var(--te-carbon)!important;' +
      'color:#f6f8f7!important;padding:1px 6px!important}' +
    // Ten nguoi gui NOI tren anh (ban --float): khoi den chu trang. Ban thuong nam tren nen giay
    // thi de nguyen chu phu - truoc day to den ca hai, ten tren nen den thanh xam tren den (1:2).
    S + '.message-sender-name-bubble--float,' + S + '.message-sender-name-bubble--float *{' +
      'background:var(--te-carbon)!important;color:#f6f8f7!important}' +

    // --- Trich dan tin cu: vach den ben trai thay vi mang xanh ---
    S + '.message-quote-fragment__container{background:#e4e7e6!important;' +
      'border:none!important;border-left:3px solid var(--te-ink)!important;padding-left:8px!important}' +
    S + '.card.me .message-quote-fragment__container{background:#2a2a30!important;' +
      'border-left-color:#f6f8f7!important}' +

    // --- O nhap, nut ---
    S + 'input,' + S + 'textarea,' + S + '#contact-search-input{background:var(--te-paper)!important;' +
      'border:1px solid var(--te-line)!important;color:var(--te-ink)!important}' +
    S + '.z--btn--v2{border:1px solid var(--te-ink)!important}' +
    S + '.z--btn--v2.btn-neutral,' + S + '.z--btn--v2.btn-tertiary-neutral{background:var(--te-paper)!important}' +

    // --- Menu / hop thoai noi: giay vien den thay vi the bo goc co bong ---
    S + '.popover-v3,' + S + '.zdialog,' + S + '.zl-modal,' + S + '.zl-modal__dialog,' +
      S + '.modal,' + S + '.modal-dialog,' + S + '.reaction-emoji-list{' +
      'background:var(--te-paper)!important;border:1px solid var(--te-ink)!important}' +

    // --- Thanh cuon vuong + boi den dao mau ---
    S + '::-webkit-scrollbar{width:10px;height:10px}' +
    S + '::-webkit-scrollbar-track{background:var(--te-canvas)}' +
    S + '::-webkit-scrollbar-thumb{background:#9a9d9b;border:2px solid var(--te-canvas)}' +
    S + '::-webkit-scrollbar-thumb:hover{background:var(--te-carbon)}' +
    S + '::selection{background:var(--te-carbon);color:#f6f8f7}' +

    // ===== Phan hoi khi re chuot / bam =====
    // TE khong co bong do hay anh sang -> bao hieu bang DAO MAU (den <-> trang) va net ke den.
    S + 'button,' + S + '.z--btn--v2,' + S + '.conv-item,' + S + '.msg-item,' + S + '.tab-item,' +
      S + '.chat-info-general__item,' + S + '.chat-info-general__action__item,' + S + '[role="button"]{' +
      'transition:background-color .08s linear,color .08s linear,border-color .08s linear!important}' +
    S + '.z--btn--v2:active,' + S + 'button:active,' + S + '[role="button"]:active,' +
      S + '.chat-info-general__item:active{background:var(--te-carbon)!important;color:#f6f8f7!important;' +
      'border-color:var(--te-carbon)!important}' +
    S + '.z--btn--v2:active *,' + S + 'button:active *,' + S + '[role="button"]:active *,' +
      S + '.chat-info-general__item:active *{color:#f6f8f7!important;fill:#f6f8f7!important}' +

    // ===== Trang thai BAT / TAT doc duoc ngay =====
    S + '.fa-toggle-checked-24,' + S + '.fa-toggle-checked-32{color:var(--te-carbon)!important}' +
    S + '.fa-toggle-unchecked-24,' + S + '.fa-toggle-unchecked-32{color:#b2b2b2!important}' +
    S + '.z-toggle{transform:scale(1.15);transform-origin:right center}' +
    // The dang chon: gach chan DEN day, chu den dam
    S + '.tab-item{border-bottom:2px solid transparent!important;color:var(--te-dim)!important}' +
    S + '.tab-item:hover{color:var(--te-ink)!important}' +
    S + '.tab-item.selected{color:var(--te-ink)!important;border-bottom-color:var(--te-ink)!important;' +
      'font-weight:700!important}' +

    // ===== Chua lai cho luat "do bong -> net ke" lam qua tay =====
    // Luat o muc 3 tra net cho MOI thu tung co do bong. Dung cho menu / hop thoai, nhung
    // voi may thu be xiu cua phan tha cam xuc thi mot o den 1px nhin nhu loi: nut tha cam
    // xuc nhanh (24x24) thanh cai khung den rong - Thanh bao "cai icon khong".
    // Nut do phai im lang: bo vien han. (Da kiem: anh icon van ve 12x14 du bat hay tat ao,
    //  khong phai icon bi mat - chi la cai khung den bao quanh no.)
    // The dem cam xuc ("cuoi 1") van can vien de tach khoi bong bong - net nhat, khong net den.
    S + '.reacts-list{outline:1px solid var(--te-line)!important;outline-offset:-1px;' +
      'background:var(--te-paper)!important}' +

    // ===== Nut cua Zalo gon tren thanh cong cu: BAT = o den dac, TAT = o trang vien manh =====
    S + 'li[data-otl-nut] .z--btn--v2{border:1px solid var(--te-line)!important;' +
      'background:var(--te-paper)!important;color:var(--te-ink)!important;width:30px;height:30px}' +
    S + 'li[data-otl-nut] .z--btn--v2:hover{border-color:var(--te-ink)!important;background:#e4e7e6!important}' +
    S + 'li[data-otl-nut][data-on] .z--btn--v2{background:var(--te-carbon)!important;' +
      'border-color:var(--te-carbon)!important;color:#f6f8f7!important}' +
    S + 'li[data-otl-nut][data-on] .z--btn--v2 svg{stroke-width:2.1}' +
    S + 'li[data-otl-nut-sep]{background:var(--te-line)!important}' +

    // ===== Nhay mot cai khi bat / tat ao (de thay ngay la da doi) =====
    'html[data-otl-skin-flash="1"]{filter:invert(1);transition:filter .12s linear}');

  // ================= 4a. Bang "chung" - cac luat quet MOI phan tu =================
  // Do thuc te: ca bang ao (56 luat) ton ~2,7 ms moi lan tinh lai kieu, gan het la do BA luat
  // dung dau sao (*). Luat "html[data-otl-skin=te] *" bat Chromium, voi TUNG phan tu trong
  // ~1.500 phan tu, phai leo nguoc len to tien xem co thuoc tinh do khong - moi lan ve lai khung.
  // Hai cach chua:
  //   1. Gop BA luat dau sao thanh MOT -> quet mot luot thay vi ba.
  //   2. Bo tien to di, bat/tat bang cach cho ca bang nay nghi (sheet.disabled) -> khong con
  //      phai leo nguoc len to tien nua.
  G.css('otl-gon-ao-te-chung-css',
    '*{border-radius:0!important;box-shadow:none!important;text-shadow:none!important;' +
      'backdrop-filter:none!important;-webkit-backdrop-filter:none!important;' +
      'font-weight:600!important;letter-spacing:0!important}' +
    '*:focus-visible{outline:2px solid ' + M.muc + '!important;outline-offset:-2px}');
  function bangChung(tat) {
    var e = document.getElementById('otl-gon-ao-te-chung-css');
    if (e && e.sheet) e.sheet.disabled = tat;
  }

  // ================= 4b. Canh tuong phan (tu vá) =================
  // Bai hoc: toast bao tin moi cua Zalo la chu TRANG tren nen toi. Ao doi nen thanh sang
  // nhung chu van trang -> tin hien ra VO HINH (do tuong phan 1,07:1). Vá tung cho se khong
  // bao gio het, vi con hang chuc man hinh chua mo bao gio (vi, mini app, cuoc goi, hop thoai).
  // Nen bat mot nguoi canh: nhin mau chu THUC TE so voi nen THUC TE, cho nao khong doc duoc
  // thi doi lai cho doc duoc. Quet theo nhanh DOM vua them, co han muc, nen khong ton gi.
  var NGUONG = 2.6;          // duoi muc nay coi nhu khong doc duoc
  var MOI_LUOT = 400;        // tran so phan tu moi luot, khong de chiem khung hinh

  function soMau(v) { var m = (v || '').match(/[\d.]+/g); return m ? m.map(Number) : null; }
  function doSang(c) {
    var a = c.slice(0, 3).map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function tuongPhan(f, b) {
    var x = doSang(f), y = doSang(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function nenThat(e) {
    var n = e;
    while (n && n !== document.documentElement) {
      var c = soMau(getComputedStyle(n).backgroundColor);
      if (c && (c.length < 4 || c[3] > 0.5)) return c;
      n = n.parentElement;
    }
    return [246, 248, 247];
  }
  function coChuRieng(e) {
    for (var i = 0; i < e.childNodes.length; i++) {
      var n = e.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) return true;
    }
    return false;
  }
  function vaMot(e) {
    if (e.nodeType !== 1 || e.hasAttribute('data-otl-tp')) return;
    // .emoji-sizer giau chu that sau anh emoji - doi mau la lo chu ra
    if (/emoji-sizer/.test((e.className || '').toString())) return;
    if (!coChuRieng(e)) return;
    var r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    var cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    var f = soMau(cs.color);
    if (!f || (f.length > 3 && f[3] < 0.4)) return;
    var nen = nenThat(e);
    if (tuongPhan(f, nen) >= NGUONG) return;
    // Chon muc hay giay: ben nao doc ro hon thi lay ben do
    var muc = [15, 14, 18], giay = [246, 248, 247];
    e.style.setProperty('color', tuongPhan(muc, nen) >= tuongPhan(giay, nen) ? M.muc : M.canvas, 'important');
    e.setAttribute('data-otl-tp', '1');
  }
  // Hang cho: nap CA cay vao hang roi xu ly tung lat MOI_LUOT phan tu moi luot ranh.
  // (Ban dau cat cung o 400 phan tu -> body co ~1.500 node nen chip "Da gui" nam ngoai
  //  tam quet va van vo hinh. Phai rut het hang chu khong duoc cat ngang.)
  var hangPT = [], dangCho = false;
  function nap(goc) {
    if (!goc || goc.nodeType !== 1) return;
    hangPT.push(goc);
    var ds = goc.querySelectorAll ? goc.querySelectorAll('*') : [];
    for (var i = 0; i < ds.length; i++) hangPT.push(ds[i]);
  }
  // Dang cuon thi khoan da: lui lai den khi tay roi ra, khoi gianh khung hinh voi cu cuon
  var lucCuon = 0;
  addEventListener('scroll', function () { lucCuon = Date.now(); }, true);
  function hen() {
    if (dangCho) return;
    dangCho = true;
    var chay = function () {
      dangCho = false;
      if (!bat) { hangPT = []; return; }
      if (Date.now() - lucCuon < 200) { hen(); return; }   // con dang cuon -> hen lan sau
      var n = 0;
      while (hangPT.length && n < MOI_LUOT) { vaMot(hangPT.shift()); n++; }
      if (hangPT.length) hen();   // con nua thi lam tiep luot sau, khong om het mot lan
    };
    // Lam luc may ranh, khong tranh khung hinh voi hoat anh
    if (window.requestIdleCallback) requestIdleCallback(chay, { timeout: 600 });
    else setTimeout(chay, 120);
  }
  function xepLich(goc) { nap(goc); hen(); }
  // Khong theo doi 'class' nua: bang thong tin ben phai la luoi ao (ReactVirtualized),
  // cuon mot cai la ra hang tram lan doi class -> moi lan lai xoa mau roi do lai, lam nang
  // them dung luc dang giat. Phan mau doi theo class gio da co bo sinh luat tinh lo (muc 3),
  // nen bo dong ho nay di la lanh. Do that: 2 giay cuon bang phai = 122 lan bao doi.
  var moTP = new MutationObserver(function (ds) {
    for (var i = 0; i < ds.length; i++) {
      var m = ds[i];
      for (var j = 0; j < m.addedNodes.length; j++) {
        var n = m.addedNodes[j];
        if (n.nodeType === 1) xepLich(n);
      }
    }
  });

  // ================= 5. Bat / tat =================
  // Zalo ve lai co the gan lai class 'dark' -> theo doi de bo lien.
  var mo = new MutationObserver(function () {
    if (bat && document.body.classList.contains('dark')) document.body.classList.remove('dark');
  });

  // Nho giao dien goc (sang hay toi) de khi tat ao con tra ve dung
  if (!G.store.get('ao-te-da-nho', false)) {
    G.store.set('ao-te-dark-cu', document.body.classList.contains('dark'));
    G.store.set('ao-te-da-nho', true);
  }

  function apply() {
    var h = document.documentElement;
    if (bat) {
      h.setAttribute('data-otl-skin', 'te');
      bangChung(false);
      document.body.classList.remove('dark');
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      moTP.observe(document.body, { childList: true, subtree: true });
      xepLich(document.body);
    } else {
      mo.disconnect();
      bangChung(true);
      moTP.disconnect();
      document.querySelectorAll('[data-otl-tp]').forEach(function (e) {
        e.style.removeProperty('color'); e.removeAttribute('data-otl-tp');
      });
      h.removeAttribute('data-otl-skin');
      if (G.store.get('ao-te-dark-cu', true)) document.body.classList.add('dark');
    }
  }
  apply();
  G.cleanup(function () {
    mo.disconnect(); moTP.disconnect();
    if (THE_THU && THE_THU.parentNode) THE_THU.parentNode.removeChild(THE_THU);
  });

  // Nut tren thanh cong cu (98-thanh-nut) doc 2 ham nay de ve dung trang thai
  G.aoTe = {
    dangBat: function () { return bat; },
    doi: function () {
      bat = !bat;
      G.store.set(KEY, bat);
      apply();
      // Dao mau ca cua so 0,12 s: nhin la biet vua doi ao, khong phai do xem khac cho nao
      var h = document.documentElement;
      h.setAttribute('data-otl-skin-flash', '1');
      setTimeout(function () { h.removeAttribute('data-otl-skin-flash'); }, 120);
      G.toast(bat ? '▮ ÁO TEENAGE ENGINEERING: BẬT' : '▯ ÁO TEENAGE ENGINEERING: TẮT', 'ok');
    }
  };
  // Ctrl+Shift+T da la Trello -> ao dung Ctrl+Shift+Y
  G.hotkey('Ctrl+Shift+KeyY', function () { G.aoTe.doi(); }, 'Áo teenage engineering (bật / tắt)');
})(window.__otlGonG);
