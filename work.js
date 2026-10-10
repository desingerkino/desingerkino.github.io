/* Блок «Что я делаю на площадке»: 13 карточек этапов, открыта одна за раз.
   Карточка — обычная <button> с aria-expanded, поэтому работают мышь, касание и клавиатура
   (Enter/Пробел, стрелки вверх/вниз, Home/End).
   При раскрытии короткий текст сворачивается, а на его месте раскрывается полное описание.
   Анимация на GSAP; без GSAP или при «уменьшить движение» всё переключается сразу. */
(function () {
  var sec = document.getElementById('work');
  if (!sec) return;
  var list = sec.querySelector('.st-list');
  var items = [].slice.call(sec.querySelectorAll('.st'));
  var parts = [].slice.call(sec.querySelectorAll('.w-parts > li'));
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
    var li = items[i], btn = q(li, '.st-btn'), panel = q(li, '.st-p'), inner = q(li, '.st-in'), short = q(li, '.st-short');
    var startH = panel.hidden ? 0 : panel.offsetHeight;
    var shortH = short ? short.offsetHeight : 0;
    kill(i);
    li.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!animOK()) { panel.style.height = ''; inner.style.opacity = ''; refreshST(); return; }

    var text = qa(li, '.st-txt p, .st-tags li');
    gsap.set(inner, { clearProps: 'opacity' });
    var tl = gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: function () {
        gsap.set(panel, { clearProps: 'height' });
        if (short) gsap.set(short, { clearProps: 'all' });
        tls[i] = null; refreshST();
      }
    });
    if (short && shortH) {
      // короткий текст плавно уходит, пока не завершится раскрытие (CSS прячет его у открытой карточки)
      gsap.set(short, { display: 'block', overflow: 'hidden' });
      tl.fromTo(short, { height: shortH, opacity: 1 }, { height: 0, opacity: 0, duration: .4, ease: 'power2.inOut' }, 0);
    }
    tl.fromTo(panel, { height: startH }, { height: 'auto', duration: .6, ease: 'power3.inOut' }, 0)
      .fromTo(text, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .55, ease: 'power3.out', stagger: .05, clearProps: 'transform,opacity' }, .18);
    tls[i] = tl;
  }

  function collapse(i, onUpdate) {
    var li = items[i], btn = q(li, '.st-btn'), panel = q(li, '.st-p'), inner = q(li, '.st-in'), short = q(li, '.st-short');
    kill(i);
    li.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    if (!animOK() || panel.hidden) { panel.hidden = true; panel.style.height = ''; if (short) short.style.cssText = ''; refreshST(); return; }

    var tl = gsap.timeline({
      onUpdate: onUpdate || null,
      onComplete: function () {
        panel.hidden = true;
        gsap.set(panel, { clearProps: 'height' });
        gsap.set(inner, { clearProps: 'opacity' });
        if (short) gsap.set(short, { clearProps: 'all' });
        if (onUpdate) onUpdate();
        tls[i] = null;
        refreshST();
      }
    });
    tl.to(inner, { opacity: 0, duration: .2, ease: 'power1.out' }, 0)
      .fromTo(panel, { height: panel.offsetHeight }, { height: 0, duration: .46, ease: 'power3.inOut' }, 0);
    if (short) {
      gsap.set(short, { overflow: 'hidden' });
      tl.fromTo(short, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: .46, ease: 'power3.inOut' }, 0);
    }
    tls[i] = tl;
  }

  function toggle(i) {
    var btn = q(items[i], '.st-btn');
    var top0 = btn.getBoundingClientRect().top;
    // Если закрывается карточка выше нажатой, держим нажатую на месте, без скачка страницы
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

  // Три составляющие профессии: при наведении подсвечиваются номера их этапов
  parts.forEach(function (p) {
    var key = p.getAttribute('data-part');
    function hl(on) {
      items.forEach(function (li) { li.classList.toggle('is-part', on && li.getAttribute('data-part') === key); });
    }
    p.addEventListener('mouseenter', function () { hl(true); });
    p.addEventListener('mouseleave', function () { hl(false); });
  });
})();
