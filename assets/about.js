/* Nandi Go About section — numbers count up, the route line draws in,
 * and the collage photos drift at slightly different speeds as you scroll. */
(function () {
  var sec = document.getElementById('about');
  if (!sec) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var route = document.getElementById('abRoute'), stats = document.getElementById('abStats');

  function countUp(el) {
    var end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1300;
    if (reduce) { el.textContent = pre + end.toLocaleString('en-IN') + suf; return; }
    (function step(now) {
      var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      el.textContent = pre + Math.round(end * e).toLocaleString('en-IN') + suf;
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en, obs) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        if (x.target === route) route.classList.add('on');
        if (x.target === stats) [].forEach.call(stats.querySelectorAll('[data-count]'), countUp);
        obs.unobserve(x.target);
      });
    }, { threshold: 0.35 }).observe(route);
    var io2 = new IntersectionObserver(function (en, obs) {
      if (en[0].isIntersecting) { [].forEach.call(stats.querySelectorAll('[data-count]'), countUp); obs.disconnect(); }
    }, { threshold: 0.5 });
    io2.observe(stats);
  } else { route.classList.add('on'); }

  // Gentle depth: each layer moves a few pixels at its own rate while the section is on screen
  if (reduce) return;
  var layers = [].slice.call(sec.querySelectorAll('[data-depth]')), ticking = false;
  function drift() {
    ticking = false;
    var r = sec.getBoundingClientRect(), mid = r.top + r.height / 2 - innerHeight / 2;
    if (r.bottom < 0 || r.top > innerHeight) return;
    layers.forEach(function (l) {
      var y = -mid * (+l.dataset.depth);
      l.style.transform = 'translateY(' + y.toFixed(1) + 'px)' + (l.classList.contains('ab-pol') ? ' rotate(var(--r))' : '');
    });
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
  drift();
})();
