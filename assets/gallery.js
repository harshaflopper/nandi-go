/* Nandi Go — "Window seat" gallery: YouTube reels playing inside airplane windows,
 * a split-flap "now showing" board, a plane flying a dotted route between the windows,
 * drifting clouds, floating travel icons and a ticker. Videos come from the gallery_videos table (admin → Gallery). */
(function () {
  var NG = window.NG, I = window.NGIcon, mount = document.getElementById('wsMount');
  if (!mount || !I) return;
  var $ = function (s, r) { return (r || mount).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FALLBACK = [{ youtube_id: 'vrinCZiKodI', title: 'Disco lights, dance and friends', place: 'Bengaluru trips' }, { youtube_id: 'A-IOtpmo500', title: 'Inside our party bus', place: 'Weekend getaway' }];
  var vids = [], live = 0, boardTimer = 0, started = false;

  var FLOAT = [['camera', 6, 14, .9], ['compass', 92, 10, .6], ['mountain', 3, 70, .7], ['beach', 95, 66, .8], ['flame', 14, 42, .5], ['hiker', 86, 38, .55], ['coffee', 24, 88, .6], ['ticket', 76, 88, .7], ['binoculars', 50, 6, .45]];
  var TICK = [['mountain', 'Treks'], ['beach', 'Beaches'], ['coffee', 'Coffee estates'], ['flame', 'Bonfires'], ['bus', 'Road trips'], ['camera', 'Moments'], ['boat', 'Backwaters'], ['snow', 'Snow trails'], ['hiker', 'Sunrise hikes'], ['sunrise', 'Golden hours']];
  var PLANE = 'M1 12.2 8.6 11 12.9 3.4h2.3l-2 7.4h6.6l2.1-2.5h1.6L22.4 12l1.1 3.7h-1.6l-2.1-2.5h-6.6l2 7.4h-2.3L8.6 13 1 12.2Z';

  function shell() {
    mount.innerHTML =
      '<div class="ws-head"><span class="kicker">' + I('camera') + 'Window seat</span><h2>Moments from the <em>road</em></h2><p>Real reels from Nandi Go trips. Take the window seat and see what the journey feels like.</p></div>' +
      '<div class="ws-board" aria-live="polite"><span class="ws-board-l">' + I('plane') + '<b>Now showing</b></span><span class="ws-flaps" id="wsFlaps" aria-hidden="true"></span><span class="ws-board-r"><small>Gate</small><b>NG</b></span><span class="sr-only" id="wsBoardText"></span></div>' +
      '<div class="ws-stage" id="wsStage">' +
        '<div class="ws-clouds" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i></div>' +
        '<div class="ws-floats" aria-hidden="true">' + FLOAT.map(function (f, i) { return '<span class="ws-float" data-depth="' + f[3] + '" style="left:' + f[1] + '%;top:' + f[2] + '%;--d:' + (i * .7) + 's">' + I(f[0]) + '</span>'; }).join('') + '</div>' +
        '<svg class="ws-path" id="wsPath" aria-hidden="true"><path id="wsRoute" d="" /><g class="ws-plane"><path d="' + PLANE + '" transform="translate(-12,-12)"/>' +
          (calm ? '' : '<animateMotion dur="11s" repeatCount="indefinite" rotate="auto"><mpath href="#wsRoute"/></animateMotion>') + '</g></svg>' +
        '<span class="ws-tag from">BLR</span><span class="ws-tag to">Anywhere</span>' +
        '<div class="ws-wins" id="wsWins"></div>' +
      '</div>' +
      '<div class="ws-ticker" aria-hidden="true"><div class="ws-tick">' + (function () { var h = TICK.map(function (t) { return '<span>' + I(t[0]) + t[1] + '</span>'; }).join(''); return h + h; })() + '</div></div>' +
      '<div class="ws-cta"><a class="btn btn-gold" href="https://www.instagram.com/nandigo2026" target="_blank" rel="noopener">' + I('camera') + 'Follow our trips on Instagram</a><a class="btn btn-ghost" href="https://www.youtube.com/@NandiGo-h9u" target="_blank" rel="noopener">' + I('play') + 'Watch more on YouTube</a></div>';
    if (!document.getElementById('wsLb')) document.body.insertAdjacentHTML('beforeend', '<div class="ws-lb" id="wsLb" hidden><button type="button" class="ws-lb-x" aria-label="Close video">' + I('close') + '</button><div class="ws-lb-frame" id="wsLbFrame"></div></div>');
  }

  function poster(id) { return 'https://i.ytimg.com/vi/' + id + '/hq2.jpg'; }
  function embed(id, sound) {
    return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=' + (sound ? 0 : 1) + '&loop=1&playlist=' + id + '&controls=' + (sound ? 1 : 0) + '&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1';
  }
  function renderWins() {
    $('#wsWins').classList.toggle('many', vids.length > 2);
    $('#wsWins').innerHTML = vids.map(function (v, i) {
      return '<button type="button" class="ws-win" data-ws="' + i + '" style="--i:' + i + '" aria-label="Play: ' + esc(v.title) + '">' +
        '<span class="ws-frame"><span class="ws-glass">' +
          '<img src="' + poster(v.youtube_id) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/' + esc(v.youtube_id) + '/hqdefault.jpg\'">' +
          '<span class="ws-vid"></span><span class="ws-shade"><i></i></span><span class="ws-glare"></span>' +
          '<span class="ws-live">Live</span><span class="ws-play">' + I('play') + '</span>' +
        '</span></span>' +
        '<span class="ws-cap"><b>' + esc(v.title) + '</b>' + (v.place ? '<small>' + I('pin') + esc(v.place) + '</small>' : '') + '</span></button>';
    }).join('');
    requestAnimationFrame(drawRoute);
  }

  /* ---------- split-flap board ---------- */
  var CH = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&·-';
  function cells() { var b = $('#wsFlaps'); return Math.max(10, Math.min(30, Math.floor(b.clientWidth / (innerWidth < 640 ? 14 : 23)))); }
  function setBoard(text) {
    var b = $('#wsFlaps'), n = cells(), t = text.toUpperCase().replace(/[^A-Z0-9&·\- ]/g, ' ');
    if (t.length > n) t = t.slice(0, n - 1).replace(/\s+\S*$/, '') || t.slice(0, n);
    t = t.replace(/[\s·&-]+$/, '');
    var pad = Math.floor((n - t.length) / 2); t = (' '.repeat(pad) + t).padEnd(n, ' ');
    if (b.children.length !== n) b.innerHTML = Array.apply(null, Array(n)).map(function () { return '<i> </i>'; }).join('');
    $('#wsBoardText').textContent = 'Now showing: ' + text;
    [].forEach.call(b.children, function (cell, k) {
      var target = t[k]; if (cell.textContent === target) return;
      if (calm) { cell.textContent = target; return; }
      var spins = 3 + Math.floor(Math.random() * 5), step = 0;
      setTimeout(function tick() {
        cell.classList.remove('flip'); void cell.offsetWidth; cell.classList.add('flip');
        cell.textContent = ++step >= spins ? target : CH[1 + Math.floor(Math.random() * 36)];
        if (step < spins) setTimeout(tick, 55);
      }, k * 22);
    });
  }
  function showLive(i) {
    live = i;
    mount.querySelectorAll('.ws-win').forEach(function (w, k) { w.classList.toggle('live', k === i); });
    var v = vids[i]; if (v) setBoard(v.title);
  }
  function cycle() { clearInterval(boardTimer); if (vids.length > 1 && !calm) boardTimer = setInterval(function () { showLive((live + 1) % vids.length); }, 7000); }

  /* ---------- dotted route + plane between the windows ---------- */
  function drawRoute() {
    var st = $('#wsStage'), wins = mount.querySelectorAll('.ws-win .ws-frame'); if (!st || !wins.length) return;
    var R = st.getBoundingClientRect(), svg = $('#wsPath');
    svg.setAttribute('viewBox', '0 0 ' + R.width + ' ' + R.height); svg.setAttribute('width', R.width); svg.setAttribute('height', R.height);
    var pts = [].map.call(wins, function (w) { var r = w.getBoundingClientRect(); return [r.left - R.left + r.width / 2, r.top - R.top - Math.min(46, R.height * .08)]; });
    var vertical = innerWidth < 700 && !$('#wsWins').classList.contains('many') && false;
    var y0 = R.height * .62, d = 'M -20 ' + y0.toFixed(1);
    var prev = [-20, y0];
    pts.forEach(function (p) {
      var cx = (prev[0] + p[0]) / 2; d += ' C ' + cx.toFixed(1) + ' ' + prev[1].toFixed(1) + ', ' + cx.toFixed(1) + ' ' + p[1].toFixed(1) + ', ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); prev = p;
    });
    var end = [R.width + 20, R.height * .58], cx2 = (prev[0] + end[0]) / 2;
    d += ' C ' + cx2.toFixed(1) + ' ' + prev[1].toFixed(1) + ', ' + cx2.toFixed(1) + ' ' + end[1].toFixed(1) + ', ' + end[0].toFixed(1) + ' ' + end[1].toFixed(1);
    $('#wsRoute').setAttribute('d', d);
    void vertical;
  }

  /* ---------- start when the section comes into view: shades slide up, reels load ---------- */
  function start() {
    if (started) return; started = true;
    mount.classList.add('open');
    mount.querySelectorAll('.ws-win').forEach(function (w, i) {
      setTimeout(function () {
        var v = vids[+w.dataset.ws], box = w.querySelector('.ws-vid');
        box.innerHTML = '<iframe src="' + embed(v.youtube_id) + '" title="' + esc(v.title) + '" allow="autoplay; encrypted-media; picture-in-picture" loading="lazy" tabindex="-1"></iframe>';
        box.firstChild.addEventListener('load', function () { w.classList.add('ready'); });
      }, calm ? 0 : 700 + i * 350);
    });
    showLive(0); cycle();
  }

  /* ---------- full-screen with sound ---------- */
  var lb;
  function openLb(i) {
    var v = vids[i]; if (!v) return;
    lb = document.getElementById('wsLb');
    document.getElementById('wsLbFrame').innerHTML = '<iframe src="' + embed(v.youtube_id, true) + '" title="' + esc(v.title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('open'); }); document.documentElement.classList.add('sp-lock');
    showLive(i);
  }
  function closeLb() { if (!lb) return; lb.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { lb.hidden = true; document.getElementById('wsLbFrame').innerHTML = ''; }, 220); }
  document.addEventListener('click', function (e) {
    var w = e.target.closest('.ws-win'); if (w && mount.contains(w)) { openLb(+w.dataset.ws); return; }
    if (lb && !lb.hidden && (e.target === lb || e.target.closest('.ws-lb-x'))) closeLb();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb && !lb.hidden) closeLb(); });

  /* ---------- floating icons follow the mouse a little ---------- */
  if (!calm && matchMedia('(pointer:fine)').matches) mount.addEventListener('mousemove', function (e) {
    var r = mount.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width - .5, my = (e.clientY - r.top) / r.height - .5;
    mount.querySelectorAll('.ws-float').forEach(function (f) { var d = +f.dataset.depth * 26; f.style.translate = (mx * d).toFixed(1) + 'px ' + (my * d).toFixed(1) + 'px'; });
  });

  function begin(list) {
    vids = (list && list.length ? list : FALLBACK).slice(0, 8);
    renderWins(); setBoard('Boarding now · window seat');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { start(); io.disconnect(); } }, { rootMargin: '0px 0px -20% 0px' });
      io.observe($('#wsStage'));
    } else start();
  }
  addEventListener('resize', function () { clearTimeout(begin.t); begin.t = setTimeout(function () { drawRoute(); if (vids[live]) setBoard(vids[live].title); }, 150); });

  shell();
  if (NG && NG.DB) NG.DB.get('gallery_videos?select=youtube_id,title,place&active=eq.true&order=sort.asc,created_at.asc').then(begin, function () { begin(FALLBACK); });
  else begin(FALLBACK);
})();
