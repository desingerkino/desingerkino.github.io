/* Анимации сайта на GSAP: появление шапки, заголовки через SplitText, появление блоков при прокрутке
   через ScrollTrigger, плавное обновление карточки проекта.
   Постеры в шапке, киноплёнка и «апельсиновый» эффект не затрагиваются.
   Если GSAP не загрузился или включено «уменьшить движение», сайт показывается как раньше
   (на html ставится класс fx-off, и работают прежние CSS-анимации). */
(function () {
  var root = document.documentElement;
  function off() { root.classList.add('fx-off'); }

  if (!window.gsap) { off(); window.__fxReady = true; return; }

  var hasST = !!window.ScrollTrigger;
  var hasSplit = !!window.SplitText;
  try {
    var plugins = [];
    if (hasST) plugins.push(window.ScrollTrigger);
    if (hasSplit) plugins.push(window.SplitText);
    if (plugins.length) gsap.registerPlugin.apply(gsap, plugins);
    if (hasST) ScrollTrigger.config({ ignoreMobileResize: true });
  } catch (e) { off(); window.__fxReady = true; return; }
  window.__fxReady = true;

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return gsap.utils.toArray(s, ctx); };
  var EASE_OUT = 'power3.out';

  // Строки заголовка выезжают снизу. autoSplit пересобирает строки при смене ширины или загрузке шрифта,
  // поэтому анимация создаётся внутри onSplit (так требует документация SplitText).
  function revealLines(el, opts) {
    if (!el) return;
    opts = opts || {};
    function make(targets) {
      var vars = { opacity: 0, duration: opts.duration || 1.1, ease: 'expo.out', stagger: .1, delay: opts.delay || 0 };
      if (targets.length > 1 || opts.split) vars.yPercent = 55; else vars.y = 28;
      if (opts.trigger && hasST) vars.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
      return gsap.from(targets, vars);
    }
    if (hasSplit) {
      SplitText.create(el, {
        type: 'lines',
        autoSplit: true,
        onSplit: function (self) { return make(self.lines.length ? self.lines : [el]); }
      });
    } else {
      make([el]);
    }
  }

  // Простое появление блока при прокрутке
  function revealOnScroll(targets, vars) {
    if (!hasST) return;
    $$(targets).forEach(function (el) {
      gsap.from(el, Object.assign({
        y: 24, opacity: 0, duration: .9, ease: EASE_OUT,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      }, vars || {}));
    });
  }

  var mm = gsap.matchMedia();

  // Пользователь просит меньше движения: ничего не анимируем
  mm.add('(prefers-reduced-motion: reduce)', function () {
    off();
    return function () { root.classList.remove('fx-off'); };
  });

  mm.add('(prefers-reduced-motion: no-preference)', function () {
    root.classList.remove('fx-off');
    try {
      build();
    } catch (err) {
      // Что-то пошло не так: откатываем все анимации и показываем сайт как раньше
      if (window.console) console.error('fx.js:', err);
      window.fxModalIn = null;
      mm.revert();
      off();
    }
    return function () { window.fxModalIn = null; };
  });

  function build() {

    // ---- Шапка: бейдж, заголовок, текст, кнопка ----
    var h1 = $('.hero-text h1');
    var badge = $('.hero-text .badge');
    var lead = $('.hero-text .lead');
    var buttons = $('.hero-text .buttons');

    if (badge) gsap.fromTo(badge, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: EASE_OUT, delay: .05, clearProps: 'transform' });
    if (h1) { gsap.set(h1, { opacity: 1 }); revealLines(h1, { delay: .15, split: true }); }
    if (lead) gsap.fromTo(lead, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: EASE_OUT, delay: .5, clearProps: 'transform' });
    if (buttons) gsap.fromTo(buttons, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: EASE_OUT, delay: .65, clearProps: 'transform' });

    // ---- Прокрутка: ScrollTrigger ----
    if (hasST) {
      revealOnScroll('.p-head .badge', { y: 14, duration: .7 });
      revealLines($('.p-head h2'), { trigger: true });

      // Блок «Что я делаю на площадке»: заголовок, вступление, кадры плёнки по порядку, затем этапы
      revealLines($('.work h2'), { trigger: true });
      revealOnScroll('.w-lead', { y: 16, duration: .8 });
      var reelFrames = $$('.w-reel li');
      if (reelFrames.length) {
        gsap.from(reelFrames, {
          opacity: 0, y: 8, duration: .5, ease: EASE_OUT, stagger: .035, clearProps: 'transform,opacity',
          scrollTrigger: { trigger: '.w-reel', start: 'top 92%', once: true }
        });
      }
      revealOnScroll('.w-parts > div', { y: 14, duration: .7 });
      gsap.set('.st', { y: 22, opacity: 0 });
      ScrollTrigger.batch('.st', {
        start: 'top 94%',
        once: true,
        onEnter: function (els) {
          gsap.to(els, { y: 0, opacity: 1, duration: .8, ease: EASE_OUT, stagger: .06, overwrite: true, clearProps: 'transform,opacity' });
        }
      });

      revealLines($('footer h2'), { trigger: true });
      revealOnScroll('footer .contacts', { y: 16, duration: .8 });

      // Высота страницы может поменяться после загрузки шрифтов и картинок
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }

    // ---- Карточка проекта: данные появляются по очереди ----
    window.fxModalIn = function () {
      var card = $('#modal .m-card');
      if (!card) return;
      var poster = $$('.m-poster > *', card);
      var items = $$('.m-meta, .m-title, .m-facts dt, .m-facts dd, .m-desc, .m-foot', card);
      gsap.killTweensOf(poster.concat(items));
      if (poster.length) gsap.fromTo(poster, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .6, ease: EASE_OUT, delay: .1, clearProps: 'transform,opacity' });
      gsap.fromTo(items, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: EASE_OUT, stagger: .04, delay: .14, clearProps: 'transform,opacity' });
    };
  }
})();
