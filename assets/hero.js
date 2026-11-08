/* Nandi Go hero — full-screen photo of the chosen place, a live mini-journey map, and 9 cards.
 * Visitors choose; nothing changes by itself.
 * Choosing a place plays a short journey in the map card: the camera glides in, a bus drives
 * (or a plane flies) from Bengaluru, the distance counts up, and the place pops a photo stamp.
 * Needs data.js, icons.js, map-data.js. */
(function () {
  var NG = window.NG, I = window.NGIcon, M = window.NG_MAP;
  var hero = document.getElementById('home');
  if (!NG || !hero) return;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DEST = NG.DESTINATIONS, N = DEST.length;
  var START = Math.max(0, DEST.map(function (d) { return d.id; }).indexOf('chikkamagaluru'));
  var cur = -1;

  function minPrice(d) { return Math.min.apply(null, d.trips.map(function (id) { return NG.trip(id).from; })); }
  function sized(url, w) { return /images\.unsplash\.com/.test(url) ? url.replace(/w=\d+/, 'w=' + w) : url; }
  function big(d) { return sized(NG.POSTCARDS[d.id].photo, 2000); }
  function small(d) { return sized(NG.POSTCARDS[d.id].photo, 420); }
  function kmNum(d) { var m = /^(\d[\d,]*)\s*km$/i.exec(d.km || ''); return m ? +m[1].replace(/,/g, '') : 0; }

  /* ---------- 9 cards ---------- */
  var rail = $('hxRail');
  rail.innerHTML = DEST.map(function (d, i) {
    return '<button type="button" class="hx-thumb" role="tab" data-i="' + i + '" aria-selected="false">' +
      '<span class="hx-thumb-img"><img src="' + small(d) + '" alt="" loading="lazy" decoding="async"></span>' +
      '<span class="hx-thumb-txt"><b>' + d.name + '</b><em>from ' + NG.fmt(minPrice(d)) + '</em></span></button>';
  }).join('');
  var thumbs = [].slice.call(rail.children);
  if (window.NGScenes && $('hxScape')) NGScenes.build($('hxScape'));

  /* ---------- Map card ---------- */
  var mapSvg = $('hxMap'), stageBox = $('hxMapStage'), tip = $('hxPinTip'), card = hero.querySelector('.hx-map');
  var P = {}, VB = null, INDIA = null, origin = null, raf = 0;
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  if (M && mapSvg) {
    var ib = M.indiaBox;
    INDIA = [ib[0] - 14, ib[1] - 14, ib[2] + 28, ib[3] + 28];
    VB = INDIA.slice();
    mapSvg.setAttribute('viewBox', VB.join(' '));
    mapSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    var defs = el('defs', {}, mapSvg);
    defs.innerHTML = '<linearGradient id="hxKa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EBCB6B"/><stop offset="1" stop-color="#B8932A"/></linearGradient>' +
      '<clipPath id="hxStampClip" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>';
    P.land = el('g', { class: 'hm-land' }, mapSvg);
    P.edges = [];
    for (var e = 5; e >= 1; e--) { var ep = el('path', { d: M.india, class: 'hm-edge2' }, P.land); ep.dataset.n = e; P.edges.push(ep); }
    el('path', { d: M.india, class: 'hm-in' }, P.land);
    el('path', { d: M.states, class: 'hm-st' }, P.land);
    el('path', { d: M.karnataka, class: 'hm-ka2', fill: 'url(#hxKa)' }, P.land);
    P.top = el('g', { class: 'hm-top' }, mapSvg);
    P.ghost = el('path', { class: 'hm-ghost' }, P.top);
    P.route = el('path', { class: 'hm-rt on' }, P.top);
    P.pins = el('g', {}, P.top);
    origin = M.project(NG.ORIGIN.lon, NG.ORIGIN.lat);
    P.list = DEST.map(function (d, i) {
      var xy = M.project(d.lon, d.lat), dx = xy[0] - origin[0], dy = xy[1] - origin[1], len = Math.hypot(dx, dy);
      var bend = Math.min(.3, 20 / Math.max(len, 1) + .12) * (d.mode === 'air' ? 1.35 : 1);
      var cx = (origin[0] + xy[0]) / 2 - dy * bend, cy = (origin[1] + xy[1]) / 2 + dx * bend;
      var g = el('g', { class: 'hm-pn', 'data-i': i, tabindex: '-1' }, P.pins);
      el('circle', { r: 12, class: 'hm-pn-halo' }, g); el('circle', { r: 5, class: 'hm-pn-dot' }, g);
      return { d: d, xy: xy, ctrl: [cx, cy], path: 'M' + origin[0] + ',' + origin[1] + 'Q' + cx + ',' + cy + ' ' + xy[0] + ',' + xy[1], g: g };
    });
    P.og = el('g', { class: 'hm-og' }, P.top);
    el('rect', { x: -5, y: -5, width: 10, height: 10, rx: 2, transform: 'rotate(45)' }, P.og);
    var ogt = el('text', { x: 9, y: 15, class: 'hm-lbl' }, P.og); ogt.textContent = 'Bengaluru';
    // arrival ripple + photo stamp
    P.ripple = el('circle', { r: 6, class: 'hm-ripple' }, P.top);
    P.stamp = el('g', { class: 'hm-stamp' }, P.top);
    el('circle', { r: 19, class: 'hm-stamp-ring' }, P.stamp);
    P.stampImg = el('image', { x: -17, y: -17, width: 34, height: 34, 'clip-path': 'url(#hxStampClip)', preserveAspectRatio: 'xMidYMid slice' }, P.stamp);
    // the vehicle: a shadow and the icon
    P.shadow = el('ellipse', { rx: 7, ry: 2.6, class: 'hm-shadow' }, P.top);
    P.veh = el('g', { class: 'hm-veh' }, P.top);
    P.bus = el('g', {}, P.veh);
    P.bus.innerHTML = '<rect x="-9" y="-5.5" width="18" height="11" rx="3" class="vb"/><rect x="-6.5" y="-3.6" width="4" height="3.4" rx=".8" class="vw"/><rect x="-1.8" y="-3.6" width="4" height="3.4" rx=".8" class="vw"/><rect x="3.2" y="-3.6" width="3.6" height="3.4" rx=".8" class="vw"/><circle cx="-5" cy="5.6" r="1.9" class="vt"/><circle cx="5" cy="5.6" r="1.9" class="vt"/>';
    P.plane = el('g', {}, P.veh);
    P.plane.innerHTML = '<path class="vb" d="M10 0 L3 -1.6 L-1.5 -8 L-4 -8 L-1.5 -1.6 L-6.5 -1.4 L-8.5 -4 L-10 -4 L-9 0 L-10 4 L-8.5 4 L-6.5 1.4 L-1.5 1.6 L-4 8 L-1.5 8 L3 1.6 Z"/>';
  }

  function unitsPerPx(vb) { var r = mapSvg.getBoundingClientRect(); return r.width ? Math.max(vb[2] / r.width, vb[3] / r.height) : 1; }
  function fit() { return mapSvg.getBoundingClientRect().width < 200 ? .68 : 1; }   // smaller markers in the compact phone card
  function frameFor(i) {
    var it = P.list[i], o = origin, xs = [o[0], it.xy[0], it.ctrl[0]], ys = [o[1], it.xy[1], it.ctrl[1]];
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var r = mapSvg.getBoundingClientRect(), A = r.width && r.height ? r.width / r.height : 1;
    var H = Math.max((maxy - miny) * 1.5 + 60, ((maxx - minx) * 1.5 + 60) / A, 130);
    return [(minx + maxx) / 2 - H * A / 2, (miny + maxy) / 2 - H / 2, H * A, H];
  }
  function applyVB(vb) {
    VB = vb; mapSvg.setAttribute('viewBox', vb.join(' '));
    var k = unitsPerPx(vb);
    P.list.forEach(function (it) { it.g.setAttribute('transform', 'translate(' + it.xy[0] + ',' + it.xy[1] + ') scale(' + k + ')'); });
    P.og.setAttribute('transform', 'translate(' + origin[0] + ',' + origin[1] + ') scale(' + k + ')');
    P.edges.forEach(function (p) { p.setAttribute('transform', 'translate(0,' + p.dataset.n * 1.6 * k + ')'); });
    return k;
  }

  /* The journey: camera glide -> vehicle travel + odometer -> arrival pop */
  var odo = { el: null };
  function journey(i, instant) {
    if (!M || !mapSvg) return;
    cancelAnimationFrame(raf);
    var it = P.list[i], d = it.d, air = d.mode === 'air', km = kmNum(d);
    P.route.setAttribute('d', it.path);
    var L = P.route.getTotalLength();
    P.route.style.strokeDasharray = L;
    P.route.classList.toggle('is-air', air);
    P.bus.style.display = air ? 'none' : ''; P.plane.style.display = air ? '' : 'none';
    P.shadow.style.display = air ? '' : 'none';
    P.list.forEach(function (x, j) { x.g.classList.toggle('on', j === i); });
    P.stampImg.setAttribute('href', small(d));
    P.stamp.classList.remove('pop'); P.ripple.classList.remove('go');
    var foot = $('hxMapFoot');
    foot.innerHTML = '<span>' + I(air ? 'plane' : 'bus') + (air ? 'Flight' : 'By road') + '</span><span class="hx-odo">' + I('route') + '<b id="hxOdo">' + (km ? '0 km' : d.km) + '</b></span>';
    odo.el = $('hxOdo');
    var from = VB.slice(), to = frameFor(i);
    var T_CAM = 700, T_GO = air ? 1900 : 1700, t0 = performance.now();
    function place(t) {      // t: 0..1 along the route
      var len = L * t, p = P.route.getPointAtLength(len), q = P.route.getPointAtLength(Math.min(L, len + 2));
      var ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      if (t >= 1) { var p0 = P.route.getPointAtLength(L - 2); ang = Math.atan2(p.y - p0.y, p.x - p0.x) * 180 / Math.PI; }
      var k = unitsPerPx(VB), lift = air ? Math.sin(Math.PI * t) : 0;
      var s = k * fit() * (air ? 1 + .55 * lift : 1);
      P.veh.setAttribute('transform', 'translate(' + p.x + ',' + (p.y - lift * 10 * k) + ') rotate(' + ang + ') scale(' + s + ')');
      P.shadow.setAttribute('transform', 'translate(' + p.x + ',' + (p.y + 4 * k) + ') scale(' + (k * (1 - .35 * lift)) + ')');
      P.shadow.style.opacity = air ? .35 * (1 - .5 * lift) : 0;
      P.route.style.strokeDashoffset = L * (1 - t);
      if (odo.el && km) odo.el.textContent = Math.round(km * t).toLocaleString('en-IN') + ' km';
    }
    function arrive() {
      var k = unitsPerPx(VB);
      P.ripple.setAttribute('cx', it.xy[0]); P.ripple.setAttribute('cy', it.xy[1]);
      P.ripple.style.setProperty('--k', k);
      var f = fit();
      P.stamp.setAttribute('transform', 'translate(' + (it.xy[0] + 20 * k * f) + ',' + (it.xy[1] - 22 * k * f) + ') scale(' + k * f + ')');
      void P.stamp.getBBox(); P.stamp.classList.add('pop'); P.ripple.classList.add('go');
      P.veh.style.opacity = air ? 0 : 1;
      if (odo.el) odo.el.textContent = km ? km.toLocaleString('en-IN') + ' km' : d.km;
    }
    if (instant || reduce) { applyVB(to); place(1); arrive(); return; }
    P.veh.style.opacity = 1;
    (function step(now) {
      var e = now - t0;
      if (e < T_CAM) {               // glide the camera; keep the vehicle at Bengaluru
        var c = easeIO(e / T_CAM), vb = [];
        for (var j = 0; j < 4; j++) vb[j] = from[j] + (to[j] - from[j]) * c;
        applyVB(vb); place(0);
      } else {
        if (VB !== to) applyVB(to);
        var t = clamp((e - T_CAM) / T_GO, 0, 1);
        place(air ? easeIO(t) : easeOut(t) * .15 + t * .85);
        if (t >= 1) { arrive(); return; }
      }
      raf = requestAnimationFrame(step);
    })(t0);
  }

  /* Hover a card -> faint preview of that route on the map */
  function preview(i) {
    if (!M || !mapSvg) return;
    if (i === null || i === cur) { P.ghost.classList.remove('on'); return; }
    P.ghost.setAttribute('d', P.list[i].path); P.ghost.classList.add('on');
    P.list.forEach(function (x, j) { x.g.classList.toggle('peek', j === i); });
  }

  /* ---------- Background photo ---------- */
  var layers = [].slice.call(hero.querySelectorAll('.hx-img')), front = 0;
  function setPhoto(url) {
    var next = layers[1 - front], img = new Image();
    img.onload = img.onerror = function () {
      next.style.backgroundImage = 'url("' + url + '")';
      next.classList.remove('on'); void next.offsetWidth; next.classList.add('on');
      layers[front].classList.remove('on'); front = 1 - front;
    };
    img.src = url;
  }

  /* ---------- Choose a place ---------- */
  var textBox = $('hxText'), swapTimer = 0;
  function fillText(d) {
    var pc = NG.POSTCARDS[d.id], t = NG.trip(d.trips[0]);
    $('hxKicker').innerHTML = I(d.mode === 'air' ? 'plane' : 'pin') + d.name + ' · ' + d.km;
    $('hxTitle').textContent = pc.line;
    $('hxSub').textContent = pc.text;
    $('hxMeta').innerHTML = '<span>' + I('clock') + t.duration + '</span>' +
      '<span>' + I(d.mode === 'air' ? 'plane' : 'bus') + (d.mode === 'air' ? 'Flight from Bengaluru' : 'By road from Bengaluru') + '</span>' +
      '<span class="hx-price">from <b>' + NG.fmt(minPrice(d)) + '</b> / ' + t.unit + '</span>' +
      (d.trips.length > 1 ? '<span>' + I('route') + d.trips.length + ' trips here</span>' : '');
    $('hxBook').dataset.book = t.id; $('hxDetails').dataset.details = t.id;
  }
  function select(i, user) {
    i = (i + N) % N;
    if (i === cur) return;
    var first = cur < 0; cur = i;
    var d = DEST[i];
    setPhoto(big(d));
    if (window.NGScenes) NGScenes.show(d.id);
    clearTimeout(swapTimer);
    if (first || reduce) { fillText(d); textBox.classList.add('in'); }
    else { textBox.classList.remove('in'); swapTimer = setTimeout(function () { fillText(d); void textBox.offsetWidth; textBox.classList.add('in'); }, 260); }
    thumbs.forEach(function (b, j) { b.classList.toggle('on', j === i); b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
    if (user && !matchMedia('(min-width: 901px)').matches) thumbs[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    $('hxMapTo').textContent = d.name;
    preview(null);
    journey(i, false);
    restartAuto();
  }

  /* ---------- Auto-advance: next place every 8 s, silently (no controls, no progress bar) ---------- */
  var AUTO_MS = 8000, autoTimer = 0;
  function restartAuto() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () {
      if (document.hidden) { restartAuto(); return; }   // wait while the tab is in the background
      select(cur + 1, false);
      // keep the active card in view inside the scrolling rail (phones) without moving the page
      if (rail.scrollWidth > rail.clientWidth + 4) {
        var b = thumbs[cur], br = b.getBoundingClientRect(), rr = rail.getBoundingClientRect();
        rail.scrollTo({ left: rail.scrollLeft + (br.left - rr.left) - (rail.clientWidth - br.width) / 2, behavior: reduce ? 'auto' : 'smooth' });
      }
    }, AUTO_MS);
  }

  /* ---------- Events ---------- */
  rail.addEventListener('click', function (e) { var b = e.target.closest('.hx-thumb'); if (b) select(+b.dataset.i, true); });
  rail.addEventListener('mouseover', function (e) { var b = e.target.closest('.hx-thumb'); preview(b ? +b.dataset.i : null); });
  rail.addEventListener('mouseleave', function () { preview(null); P.list && P.list.forEach(function (x) { x.g.classList.remove('peek'); }); });
  rail.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(cur + (e.key === 'ArrowRight' ? 1 : -1), true); thumbs[cur].focus(); }
  });
  $('hxReplay').addEventListener('click', function () { if (!M) return; var c = cur; applyVB(INDIA.slice()); journey(c, false); });
  if (mapSvg) {
    mapSvg.addEventListener('click', function (e) { var g = e.target.closest('.hm-pn'); if (g) select(+g.dataset.i, true); });
    mapSvg.addEventListener('mouseover', function (e) {
      var g = e.target.closest('.hm-pn'); if (!g) { tip.hidden = true; return; }
      var d = DEST[+g.dataset.i], r = g.getBoundingClientRect(), s = card.getBoundingClientRect();
      tip.innerHTML = '<b>' + d.name + '</b><span>from ' + NG.fmt(minPrice(d)) + '</span>';
      tip.style.left = (r.left + r.width / 2 - s.left) + 'px'; tip.style.top = (r.top - s.top) + 'px'; tip.hidden = false;
    });
    mapSvg.addEventListener('mouseleave', function () { tip.hidden = true; });
  }
  // 3D tilt with depth: land and pins drift at different rates (desktop only)
  if (card && !reduce && matchMedia('(hover: hover) and (min-width: 901px)').matches) {
    var tx = 0, ty = 0, cx2 = 0, cy2 = 0, traf = 0;
    var loop = function () {
      cx2 += (tx - cx2) * .1; cy2 += (ty - cy2) * .1;
      card.style.transform = 'perspective(900px) rotateY(' + (cx2 * 10).toFixed(2) + 'deg) rotateX(' + (-cy2 * 8).toFixed(2) + 'deg)';
      if (P.land) { P.land.style.transform = 'translate(' + (-cx2 * 4) + 'px,' + (-cy2 * 4) + 'px)'; P.top.style.transform = 'translate(' + (cx2 * 5) + 'px,' + (cy2 * 5) + 'px)'; }
      traf = (Math.abs(tx - cx2) > .002 || Math.abs(ty - cy2) > .002) ? requestAnimationFrame(loop) : 0;
    };
    card.addEventListener('mousemove', function (e) { var r = card.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; if (!traf) traf = requestAnimationFrame(loop); });
    card.addEventListener('mouseleave', function () { tx = 0; ty = 0; if (!traf) traf = requestAnimationFrame(loop); });
  }
  // swipe on the photo (phones)
  var x0 = null;
  hero.addEventListener('touchstart', function (e) { if (!e.target.closest('.hx-rail') && !e.target.closest('.hx-map')) x0 = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) select(cur + (dx < 0 ? 1 : -1), true); }, { passive: true });
  addEventListener('resize', function () { if (M && mapSvg && cur >= 0) journey(cur, true); });

  select(START, false);
  var warm = function () { DEST.forEach(function (d) { var im = new Image(); im.src = big(d); }); };
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 1500);
})();
