/* Выравнивание по ширине без переносов слов и без «дыр» между словами.
   Браузер разбивает абзац на строки «жадно», и на узком экране в строке остаются 2–3 слова
   с огромными пробелами. Здесь строки подбираются сразу для всего абзаца (как в вёрстке книг):
   выбирается разбиение с самыми ровными пробелами, а остаток места немного распределяется
   между буквами. Каждая строка выводится отдельным блоком, текст и порядок слов не меняются.
   Пересчитывается при смене ширины, после загрузки шрифтов и при открытии карточек. */
(function () {
  var SEL = '.lead, .w-lead, .st-txt p, .st-short, .m-desc';
  var store = new WeakMap();
  var cv = document.createElement('canvas');
  var ctx = cv.getContext && cv.getContext('2d');
  if (!ctx) return;

  // Исходный текст элемента: абзацы разделены <br> или пустой строкой
  function source(el) {
    if (store.has(el)) return store.get(el);
    var parts = [], cur = '';
    [].forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) cur += n.nodeValue;
      else if (n.nodeName === 'BR') { parts.push(cur); cur = ''; }
      else cur += n.textContent;
    });
    parts.push(cur);
    var paras = [];
    parts.forEach(function (p) {
      p.split(/\n/).forEach(function (q) { paras.push(q.replace(/[ \t\r]+/g, ' ').trim()); });
    });
    // убрать пустые строки в начале и в конце, но сохранить пустые между абзацами
    while (paras.length && !paras[0]) paras.shift();
    while (paras.length && !paras[paras.length - 1]) paras.pop();
    var src = { paras: paras, text: el.textContent };
    store.set(el, src);
    return src;
  }

  // Стоимость разрыва строки после токена: обычный пробел — бесплатно, неразрывный — дорого,
  // перед тире — почти запрещено
  function sepPenalty(prevTok, sep, next) {
    if (sep === ' ') return 0;
    if (/^[—–]/.test(next)) return 1e8;   // тире не начинает строку
    if (/\d$/.test(prevTok) || /^№/.test(prevTok)) return 1e6; // «1910 год», «№ 7»
    if (/^[вскуоВСКУО]$/.test(prevTok)) return 12000; // «в», «с», «к» в конце строки — почти никогда
    return 3500;                          // предлог/короткое слово оторвано от следующего
  }

  // Строка может немного растянуться (пробелы, затем буквы) или сжаться (пробелы до 75 %, буквы чуть плотнее)
  function fit(w, gaps, chars, sp, C, lsMax) {
    var slack = C - w;
    if (slack >= 0) {
      var ls = Math.min(Math.max(0, slack - gaps * sp * 0.6), chars * lsMax);
      return { ok: true, ls: ls / Math.max(chars, 1), ws: 0, rest: slack - ls };
    }
    var need = -slack, gs = gaps * sp * 0.25, cs = chars * lsMax * 0.4;
    if (need > gs + cs) return { ok: false };
    var g = Math.min(need, gs), c = need - g;
    return { ok: true, ws: gaps ? -g / gaps : 0, ls: -c / Math.max(chars, 1), shrink: need / (gs + cs) };
  }

  function breakLines(tok, widths, pen, sp, C, lsMax) {
    var n = tok.length, best = [0], prev = [0], i, j;
    for (j = 1; j <= n; j++) {
      best[j] = Infinity; prev[j] = j - 1;
      var w = 0, chars = 0;
      for (i = j - 1; i >= 0; i--) {
        w += widths[i] + (i < j - 1 ? sp : 0);
        chars += tok[i].length;
        var gaps = j - 1 - i, cost;
        if (j === n) {
          if (w > C && i < j - 1) break;
          cost = (w < C * 0.3 && n > 3 ? 300 : 0) + (i === j - 1 && n > 1 ? 3000 : 0);
        } else {
          var f = fit(w, gaps, chars, sp, C, lsMax);
          if (!f.ok) { if (i < j - 1) break; cost = 1e9; }
          else if (f.shrink !== undefined) cost = 100 * f.shrink * f.shrink * f.shrink + 1;
          else if (gaps === 0) cost = f.rest > C * 0.08 ? 1e8 + f.rest : f.rest;
          else { var r = f.rest / (gaps * sp); cost = 100 * r * r * r + 1; }
          cost += pen[j - 1];
        }
        if (best[i] + cost < best[j]) { best[j] = best[i] + cost; prev[j] = i; }
      }
    }
    var lines = [];
    for (j = n; j > 0; j = prev[j]) lines.unshift([prev[j], j]);
    return lines;
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function run(el) {
    var cs = getComputedStyle(el);
    var C = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!el.clientWidth || C <= 0 || cs.textAlign !== 'justify') return;
    var src = source(el);
    ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var fs = parseFloat(cs.fontSize);
    var sp = ctx.measureText(' ').width;
    var avail = C - 3;
    var html = '';
    src.paras.forEach(function (p, pi) {
      if (!p) { html += '<span class="jl jl-gap"> </span>'; return; }
      var parts = p.split(/( | )/), tok = [], pen = [];
      for (var k0 = 0; k0 < parts.length; k0 += 2) {
        if (!parts[k0]) continue;
        tok.push(parts[k0]);
        pen.push(k0 + 2 < parts.length ? sepPenalty(parts[k0], parts[k0 + 1], parts[k0 + 2]) : 0);
      }
      var widths = tok.map(function (w) { return ctx.measureText(w).width; });
      var lsMax = fs * 0.05;
      var lines = breakLines(tok, widths, pen, sp, avail, lsMax);
      lines.forEach(function (ln, k) {
        var txt = tok.slice(ln[0], ln[1]).join(' ');
        var last = k === lines.length - 1;
        var style = '';
        if (!last) {
          var w = 0, chars = 0, x;
          for (x = ln[0]; x < ln[1]; x++) { w += widths[x]; chars += tok[x].length; }
          var gaps = ln[1] - ln[0] - 1;
          var f = fit(w + gaps * sp, gaps, chars, sp, avail, lsMax);
          var st = [];
          if (f.ok && Math.abs(f.ls) > 0.03) st.push('letter-spacing:' + f.ls.toFixed(2) + 'px');
          if (f.ok && f.ws < -0.05) st.push('word-spacing:' + f.ws.toFixed(2) + 'px');
          if (st.length) style = ' style="' + st.join(';') + '"';
        }
        html += '<span class="jl' + (last ? ' jl-last' : '') + '"' + style + '>' + esc(txt) + '</span>';
      });
    });
    el.innerHTML = html;
    el.classList.add('is-justified');
  }

  function all(scope) {
    [].forEach.call((scope || document).querySelectorAll(SEL), function (el) {
      try { run(el); } catch (e) { /* оставить обычный текст */ }
    });
  }

  // Новый текст (карточка проекта) — сбросить запомненный исходник
  function reset(el) { store.delete(el); el.classList.remove('is-justified'); }

  window.justifyText = function (scope, fresh) {
    if (scope && scope.nodeType === 1 && scope.matches && scope.matches(SEL)) {
      if (fresh) reset(scope);
      try { run(scope); } catch (e) {}
    } else all(scope);
  };

  all();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { all(); });
  var lastW = window.innerWidth, t = 0;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(t); t = setTimeout(function () { all(); }, 120);
  });
})();
