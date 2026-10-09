// Блок «Кино — это движение»: тележка долли едет по рельсам, огибая страницу за кадром; крутятся маленькие колёса
(function () {
  var sec = document.getElementById('dolly');
  if (!sec) return;
  var box = sec.querySelector('.d-dolly'), img = box.querySelector('img'), cv = box.querySelector('canvas');
  var tcEl = sec.querySelector('.d-tc'), stage = sec.querySelector('.d-stage');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SW = 990, SH = 652, X0 = 555;
  // большие колёса (центр и радиус в координатах спрайта)
  var BIG = [{ x: 770.8 - X0, y: 572.1, r: 74.9 }, { x: 1364.9 - X0, y: 571.5, r: 75.5 }];
  // маленькие колёса по бокам оси: эллипсы (виден ракурс)
  var SMALL = [
    { x: 710 - X0, y: 567, a: 38, b: 43, big: 0 }, { x: 838 - X0, y: 565, a: 38, b: 43, big: 0 },
    { x: 1303 - X0, y: 567, a: 38, b: 43, big: 1 }, { x: 1431 - X0, y: 565, a: 38, b: 43, big: 1 }
  ];
  var ctx = null, dpr = 1, ready = false;
  function setup() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(SW * dpr); cv.height = Math.round(SH * dpr);
    ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ready = true; draw(0);
  }
  function drawBig(b, ang) {
    ctx.save();
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r - .8, 0, 6.2832); ctx.clip();
    ctx.translate(b.x, b.y); ctx.rotate(ang);
    ctx.drawImage(img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, -b.r, -b.r, b.r * 2, b.r * 2);
    ctx.restore();
  }
  function drawSmall(s, ang) {
    var b = BIG[s.big];
    ctx.save();
    ctx.beginPath(); ctx.ellipse(s.x, s.y, s.a, s.b, 0, 0, 6.2832); ctx.clip();
    ctx.beginPath(); ctx.rect(0, 0, SW, SH); ctx.arc(b.x, b.y, b.r + .5, 0, 6.2832, true); ctx.clip('evenodd');
    ctx.save();
    ctx.translate(s.x, s.y); ctx.scale(s.a / b.r, s.b / b.r); ctx.rotate(ang);
    ctx.drawImage(img, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, -b.r, -b.r, b.r * 2, b.r * 2);
    ctx.restore();
    // тень от большого колеса на маленькое
    var g = ctx.createRadialGradient(b.x, b.y, b.r, b.x, b.y, b.r + 16);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
    ctx.restore();
  }
  function draw(theta) { // theta — путь тележки в пикселях спрайта
    if (!ready) return;
    ctx.clearRect(0, 0, SW, SH);
    var i;
    for (i = 0; i < SMALL.length; i++) drawSmall(SMALL[i], theta / 43);
  }
  if (img.complete && img.naturalWidth) setup(); else img.addEventListener('load', setup);

  function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
  function timecode(ms) {
    var f = Math.floor(ms / 1000 * 24), fr = f % 24, s = Math.floor(f / 24), m = Math.floor(s / 60), h = Math.floor(m / 60);
    return pad(h, 2) + ':' + pad(m % 60, 2) + ':' + pad(s % 60, 2) + ':' + pad(fr, 2);
  }
  // тележка едет в одну сторону: уезжает за правый край и заново выезжает слева, за кадром — короткая пауза
  var TRAVEL = 18000, PAUSE = 900, CYCLE = TRAVEL + PAUSE;
  function pos(t) { var c = t % CYCLE; return c < TRAVEL ? c / TRAVEL : 1; }
  var running = false, t0 = 0, lastX = null, theta = 0, raf = 0, visible = false;
  function frame(now) {
    if (!running) return;
    var t = now - t0, W = stage.clientWidth, dw = box.clientWidth, k = dw / SW;
    var x = -dw * 1.02 + (W + dw * 1.04) * pos(t);
    box.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    if (lastX !== null && x > lastX) theta += (x - lastX) / k; // пиксели пути в координатах спрайта
    lastX = x; draw(theta);
    if (tcEl) tcEl.textContent = timecode(t);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduce) return;
    running = true; t0 = performance.now() - (lastX === null ? 0 : (performance.now() - t0)); lastX = null;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  if (reduce) { box.style.transform = 'translate3d(' + ((stage.clientWidth - box.clientWidth) / 2) + 'px,0,0)'; window.addEventListener('resize', function () { box.style.transform = 'translate3d(' + ((stage.clientWidth - box.clientWidth) / 2) + 'px,0,0)'; }); return; }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { visible = true; start(); } else { visible = false; stop(); } }); }, { threshold: .05 }).observe(sec);
  } else start();
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (visible) start(); });
})();
