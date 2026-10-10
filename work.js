/* Блок «Что я делаю на площадке»: 13 этапов, открыт один этап за раз.
   Кнопки этапов — обычные <button> с aria-expanded, так что работают мышь, касание и клавиатура
   (Enter/Пробел, стрелки вверх/вниз, Home/End).
   Анимация на GSAP: панель раскрывается по высоте, слои иллюстрации выезжают с разной скоростью,
   линии рисунка «прорисовываются». Без GSAP или при «уменьшить движение» всё переключается сразу. */
(function () {
  var sec = document.getElementById('work');
  if (!sec) return;
  var list = sec.querySelector('.st-list');
  var items = [].slice.call(sec.querySelectorAll('.st'));
  var frames = [].slice.call(sec.querySelectorAll('.w-reel li'));
  var parts = [].slice.call(sec.querySelectorAll('.w-parts > div'));
  if (!list || !items.length) return;

  var root = document.documentElement;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var open = -1;
  var tls = [];
  var refreshTimer = 0;

  function animOK() { return !!window.gsap && !rm.matches && !root.classList.contains('fx-off'); }
  function q(li, s) { return li.querySelector(s); }
  function qa(li, s) { return [].slice.call(li.querySelectorAll(s)); }

  // Позиции ScrollTrigger зависят от высоты списка: пересчитываем после раскрытия/закрытия
  function refreshST() {
    if (!window.ScrollTrigger) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { window.ScrollTrigger.refresh(); }, 60);
  }

  function kill(i) {
    if (tls[i]) { tls[i].kill(); tls[i] = null; }
  }

  function expand(i) {
    var li = items[i], btn = q(li, '.st-btn'), panel = q(li, '.st-p'), inner = q(li, '.st-in');
    var startH = panel.hidden ? 0 : panel.offsetHeight;
    kill(i);
    li.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!animOK()) { panel.style.height = ''; inner.style.opacity = ''; refreshST(); return; }

    var text = qa(li, '.st-txt p, .st-tags li');
    gsap.set(inner, { clearProps: 'opacity' });

    var tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: function () { gsap.set(panel, { clearProps: 'height' }); tls[i] = null; refreshST(); }
    });
    tl.fromTo(panel, { height: startH }, { height: 'auto', duration: .62, ease: 'power3.inOut' }, 0)
      .fromTo(text, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .55, ease: 'power3.out', stagger: .05, clearProps: 'transform,opacity' }, .15);
    tls[i] = tl;
  }

  function collapse(i, onUpdate) {
    var li = items[i], btn = q(li, '.st-btn'), panel = q(li, '.st-p'), inner = q(li, '.st-in');
    kill(i);
    li.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (!animOK() || panel.hidden) { panel.hidden = true; panel.style.height = ''; refreshST(); return; }

    var tl = gsap.timeline({
      onUpdate: onUpdate || null,
      onComplete: function () {
        panel.hidden = true;
        gsap.set(panel, { clearProps: 'height' });
        gsap.set(inner, { clearProps: 'opacity' });
        if (onUpdate) onUpdate();
        tls[i] = null;
        refreshST();
      }
    });
    tl.to(inner, { opacity: 0, duration: .22, ease: 'power1.out' }, 0)
      .fromTo(panel, { height: panel.offsetHeight }, { height: 0, duration: .48, ease: 'power3.inOut' }, 0);
    tls[i] = tl;
  }

  function sync() {
    frames.forEach(function (f, k) { f.classList.toggle('is-open', k === open); });
  }

  function toggle(i) {
    var btn = q(items[i], '.st-btn');
    var top0 = btn.getBoundingClientRect().top;
    // Если закрывается этап выше нажатого, держим нажатый заголовок на месте, без скачка страницы
    function keep() {
      var d = btn.getBoundingClientRect().top - top0;
      if (Math.abs(d) > .5) window.scrollTo({ top: window.pageYOffset + d, left: 0, behavior: 'instant' });
    }
    var prev = open;
    if (prev === i) {
      collapse(i);
      open = -1;
    } else {
      if (prev > -1) collapse(prev, prev < i ? keep : null);
      expand(i);
      open = i;
      if (!animOK() && prev > -1 && prev < i) keep();
    }
    sync();
  }

  items.forEach(function (li, i) {
    var btn = q(li, '.st-btn'), panel = q(li, '.st-p');
    panel.hidden = true;
    btn.addEventListener('click', function () { toggle(i); });
    btn.addEventListener('keydown', function (e) {
      var to = -1;
      if (e.key === 'ArrowDown') to = (i + 1) % items.length;
      else if (e.key === 'ArrowUp') to = (i - 1 + items.length) % items.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = items.length - 1;
      if (to < 0) return;
      e.preventDefault();
      q(items[to], '.st-btn').focus();
    });
  });
  list.classList.add('st-ready');

  // Кадры плёнки слева: нажатие открывает этап и подводит к нему
  frames.forEach(function (f) {
    f.addEventListener('click', function () {
      var i = +f.getAttribute('data-i');
      var btn = q(items[i], '.st-btn');
      if (open !== i) toggle(i);
      var r = btn.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        btn.scrollIntoView({ block: 'start', behavior: animOK() ? 'smooth' : 'auto' });
      }
      btn.focus({ preventScroll: true });
    });
  });

  // Три составляющие профессии: при наведении подсвечиваются их этапы
  parts.forEach(function (p) {
    var key = p.getAttribute('data-part');
    function hl(on) {
      frames.forEach(function (f) { f.classList.toggle('is-part', on && f.getAttribute('data-part') === key); });
      items.forEach(function (li) { li.classList.toggle('is-part', on && li.getAttribute('data-part') === key); });
    }
    p.addEventListener('mouseenter', function () { hl(true); });
    p.addEventListener('mouseleave', function () { hl(false); });
  });

  // Линия последовательности заполняется по мере прокрутки, кадр плёнки отмечает этап у центра экрана
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(window.ScrollTrigger);
    var mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      if (root.classList.contains('fx-off')) return;
      var fill = sec.querySelector('.st-line i');
      if (fill) {
        gsap.fromTo(fill, { scaleY: 0 }, {
          scaleY: 1, ease: 'none',
          scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: .4 }
        });
      }
      items.forEach(function (li, k) {
        if (!frames[k]) return;
        window.ScrollTrigger.create({
          trigger: li, start: 'top 60%', end: 'bottom 60%',
          onToggle: function (self) { frames[k].classList.toggle('is-here', self.isActive); }
        });
      });
      return function () { frames.forEach(function (f) { f.classList.remove('is-here'); }); };
    });
  }
})();
