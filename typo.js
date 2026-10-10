/* Типографика текстов: неразрывные пробелы, чтобы строки не заканчивались предлогом, союзом
   или коротким словом («в», «и», «на», «Я»…), тире не начинало строку, число не отрывалось от слова,
   а последнее слово абзаца не оставалось на строке одно.
   Обрабатывает статичные тексты страницы, а для карточек проектов отдаёт функцию window.typo. */
(function () {
  var NB = ' ';
  // Слова из 1–2 букв и частые короткие предлоги/союзы привязываются к следующему слову
  var SHORT = /(^|[\s(«„"])([А-Яа-яЁёA-Za-z]{1,2}|для|без|под|над|при|про|или)[ \t]+(?=\S)/gi;
  // Частицы «же», «ли», «бы» держатся за предыдущее слово
  var PART = /[ \t]+(же|ли|бы|ль|б)(?=[\s.,!?;:»)]|$)/gi;

  function line(s) {
    var prev;
    do { prev = s; s = s.replace(SHORT, function (m, a, w) { return a + w + NB; }); } while (s !== prev);
    s = s.replace(PART, NB + '$1');
    s = s.replace(/[ \t]+(—|–)/g, NB + '$1');                  // тире остаётся в конце строки, а не в начале
    s = s.replace(/(\d)[ \t]+(?=[А-Яа-яЁёA-Za-z%])/g, '$1' + NB); // «1910 год», «30 дней»
    s = s.replace(/(№|§)[ \t]+/g, '$1' + NB);
    return s;
  }

  // Переносы по слогам для русского текста (правила Христова/Хмелёва): мягкий перенос \u00AD
  // ставится только в словах от 5 букв и не ближе двух букв к краю слова
  var SHY = '\u00AD';
  var V = 'аеёиоуыэюя', C = 'бвгджзклмнпрстфхцчшщ', X = 'йъь';
  function cls(ch) { return V.indexOf(ch) > -1 ? 'v' : C.indexOf(ch) > -1 ? 'c' : X.indexOf(ch) > -1 ? 'x' : ''; }
  function hyphWord(w) {
    if (w.length < 5) return w;
    var lw = w.toLowerCase(), t = [], i, out = '', last = 0;
    for (i = 0; i < lw.length; i++) t.push(cls(lw[i]));
    var at = function (k) { return t[k] || ''; };
    for (i = 2; i <= w.length - 2; i++) {
      if (i - last < 2) continue;
      var ok =
        (at(i - 1) === 'x' && at(i) && at(i + 1)) ||
        (at(i - 1) === 'v' && at(i) === 'v' && at(i + 1)) ||
        (at(i - 2) === 'v' && at(i - 1) === 'c' && at(i) === 'c' && at(i + 1) === 'v') ||
        (at(i - 2) === 'c' && at(i - 1) === 'v' && at(i) === 'c' && at(i + 1) === 'v') ||
        (at(i - 2) === 'v' && at(i - 1) === 'c' && at(i) === 'c' && at(i + 1) === 'c' && at(i + 2) === 'v') ||
        (at(i - 3) === 'v' && at(i - 2) === 'c' && at(i - 1) === 'c' && at(i) === 'c' && at(i + 1) === 'c' && at(i + 2) === 'v');
      // не рвать сочетание «ств» и не оставлять кусок без гласной
      if (ok && lw.slice(i - 1, i + 2) === 'ств') ok = false;
      if (ok && lw.slice(i - 2, i + 1) === 'ств') ok = false;
      if (ok && /[аеёиоуыэюя]/.test(lw.slice(last, i)) && /[аеёиоуыэюя]/.test(lw.slice(i))) {
        out += w.slice(last, i) + SHY; last = i;
      }
    }
    return out + w.slice(last);
  }
  function hyph(s) {
    // последнее слово абзаца не переносим
    var m = s.match(/^([\s\S]*?)([^\s\u00A0]+)(\s*)$/);
    var head = m ? m[1] : s, tail = m ? m[2] + m[3] : '';
    return head.replace(/[А-Яа-яЁё]{5,}/g, hyphWord) + tail;
  }

  // Последнее слово абзаца переносится вместе с предыдущим
  function widow(s) {
    return s.replace(/[ \t]+([^\s]{1,10})\s*$/, NB + '$1');
  }

  function typo(s, withHyph) {
    if (!s) return s;
    return s.split('\n').map(function (p) {
      if (!p.trim()) return p;
      p = widow(line(p));
      return withHyph ? hyph(p) : p;
    }).join('\n');
  }
  window.typo = typo;

  // Статичные тексты страницы
  var sel = '.lead, .w-lead, .st-txt p, .st-sub, .st-tags li, .w-parts dd, .p-head h2, .work h2, footer h2';
  var justified = '.lead, .w-lead, .st-txt p';
  [].forEach.call(document.querySelectorAll(sel), function (el) {
    var doHyph = el.matches(justified);
    var nodes = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (t, k) {
      var v = line(t.nodeValue);
      var isEnd = k === nodes.length - 1 || (t.nextSibling && t.nextSibling.nodeName === 'BR');
      if (isEnd) v = widow(v);
      if (doHyph) v = isEnd ? hyph(v) : v.replace(/[А-Яа-яЁё]{5,}/g, hyphWord);
      if (v !== t.nodeValue) t.nodeValue = v;
    });
  });
})();
