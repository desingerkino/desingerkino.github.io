/* Секция «Что я делаю на площадке»: стрелки маршрута между 13 этапами и их появление.
   Стрелки рисуются в SVG поверх списка по фактическим координатам этапов, поэтому подходят
   к любой ширине экрана: на компьютере — змейка в две колонки, на телефоне — зигзаг.
   Внутри строки стрелка жёлтая (маркер), при переходе на следующую строку — карандашная.
   Анимация на GSAP + ScrollTrigger; без них или при «уменьшить движение» всё видно сразу. */
(function () {
  var wrap = document.querySelector('#work .rt-wrap');
  if (!wrap) return;
  var svg = wrap.querySelector('.rt-arrows');
  var items = [].slice.call(wrap.querySelectorAll('.rt'));
  if (!svg || items.length < 2) return;

  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(window.ScrollTrigger);
  function animOK() { return hasGsap && !rm.matches && !root.classList.contains('fx-off'); }

  var revealed = [];   // какие стрелки уже прорисованы
  var triggers = [];
  var raf = 0;

  // Координаты относительно .rt-wrap без учёта transform (не сбиваются анимацией появления)
  function box(el) {
    var x = 0, y = 0, n = el;
    while (n && n !== wrap) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight, r: x + el.offsetWidth, b: y + el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
  }

  // небольшая «дрожь руки», одинаковая при каждом пересчёте
  function jit(i, k) { var s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    return e;
  }

  function head(x, y, ang, len) {
    var a1 = ang + Math.PI - 0.5, a2 = ang + Math.PI + 0.45;
    return 'M' + (x + Math.cos(a1) * len).toFixed(1) + ' ' + (y + Math.sin(a1) * len).toFixed(1) +
      'L' + x.toFixed(1) + ' ' + y.toFixed(1) +
      'L' + (x + Math.cos(a2) * len * 0.9).toFixed(1) + ' ' + (y + Math.sin(a2) * len * 0.9).toFixed(1);
  }

  function arrow(i) {
    var a = items[i], b = items[i + 1];
    var A = box(a), B = box(b);
    var aImg = box(a.querySelector('.rt-img')), bN = box(b.querySelector('.rt-n'));
    var mobile = window.innerWidth < 720;
    var sameRow = Math.abs(A.t - B.t) < 30 && B.l > A.r - 4;
    var x0, y0, x1, y1, c1x, c1y, c2x, c2y, yellow;
    if (sameRow) {
      // слева направо внутри строки: от рисунка к номеру следующего этапа, дугой вверх
      x0 = aImg.r + 14; y0 = aImg.t + aImg.h * 0.5;
      x1 = bN.l - 14;  y1 = bN.cy + 2;
      var dx = x1 - x0, lift = Math.min(34, dx * 0.18);
      c1x = x0 + dx * 0.3; c1y = Math.min(y0, y1) - lift + jit(i, 1) * 5;
      c2x = x0 + dx * 0.72; c2y = Math.min(y0, y1) - lift * 0.8 + jit(i, 2) * 5;
      yellow = true;
    } else {
      // переход на следующую строку: из-под этапа к началу следующего
      x0 = mobile ? A.l + A.w * (i % 2 ? 0.27 : 0.73) : aImg.cx; y0 = A.b + 10;
      x1 = mobile ? B.l + B.w * (i % 2 ? 0.73 : 0.27) : bN.cx;  y1 = B.t - 10;
      if (b.classList.contains('rt-final') && !mobile) x1 = bN.cx;
      var dy = Math.max(y1 - y0, 20);
      c1x = x0 + jit(i, 3) * 10; c1y = y0 + dy * 0.85;
      c2x = x1 + jit(i, 4) * 10; c2y = y1 - dy * 0.85;
      yellow = mobile ? i % 2 === 0 : false;
    }
    var d = 'M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' +
      c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
    var ang = Math.atan2(y1 - c2y, x1 - c2x);
    var g = el('g', { 'class': 'ar' });
    var main = el('path', { d: d, 'class': yellow ? 'ar-y' : 'ar-g' });
    g.appendChild(main);
    if (!yellow) {
      // второй, едва заметный штрих — как у карандаша, проведённого дважды
      var d2 = 'M' + (x0 + 1.2).toFixed(1) + ' ' + (y0 + 0.6).toFixed(1) + 'C' + (c1x - 3).toFixed(1) + ' ' + (c1y + 2).toFixed(1) + ' ' +
        (c2x + 3).toFixed(1) + ' ' + (c2y - 2).toFixed(1) + ' ' + (x1 - 0.8).toFixed(1) + ' ' + (y1 - 1).toFixed(1);
      g.appendChild(el('path', { d: d2, 'class': 'ar-g2' }));
    }
    var hd = el('path', { d: head(x1, y1, ang, yellow ? 12 : 10), 'class': (yellow ? 'ar-y' : 'ar-g') + ' ar-head' });
    g.appendChild(hd);
    return g;
  }

  function build() {
    raf = 0;
    triggers.forEach(function (t) { t.kill(); });
    triggers = [];
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '0 0 ' + wrap.offsetWidth + ' ' + wrap.offsetHeight);
    var anim = animOK();
    for (var i = 0; i < items.length - 1; i++) {
      var g = arrow(i);
      svg.appendChild(g);
      if (!anim || revealed[i]) continue;
      (function (i, g) {
        var lines = [].slice.call(g.querySelectorAll('path:not(.ar-head)'));
        var hd = g.querySelector('.ar-head');
        lines.forEach(function (p) { var L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
        hd.style.opacity = 0;
        triggers.push(window.ScrollTrigger.create({
          trigger: items[i + 1], start: 'top 86%', once: true,
          onEnter: function () {
            revealed[i] = true;
            gsap.to(lines, { strokeDashoffset: 0, duration: .9, ease: 'power2.inOut', delay: .15,
              onComplete: function () { lines.forEach(function (p) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }); } });
            gsap.to(hd, { opacity: 1, duration: .25, delay: .95 });
          }
        }));
      })(i, g);
    }
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(build); }

  // Этапы проявляются по очереди при прокрутке, жёлтый маркер под номером дорисовывается
  if (animOK()) {
    gsap.set(items, { opacity: 0, y: 22 });
    gsap.set(wrap.querySelectorAll('.rt-u'), { scaleX: 0 });
    window.ScrollTrigger.batch(items, {
      start: 'top 88%', once: true,
      onEnter: function (els) {
        gsap.to(els, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .12, overwrite: true, clearProps: 'transform,opacity' });
        gsap.to(els.map(function (e) { return e.querySelector('.rt-u'); }), { scaleX: 1, duration: .6, ease: 'power2.out', stagger: .12, delay: .35, clearProps: 'transform' });
      }
    });
  }

  build();
  if ('ResizeObserver' in window) {
    new ResizeObserver(schedule).observe(wrap);
  } else {
    window.addEventListener('resize', schedule);
  }
  [].forEach.call(wrap.querySelectorAll('img'), function (im) { if (!im.complete) im.addEventListener('load', schedule); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
})();
