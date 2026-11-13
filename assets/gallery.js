/* Nandi Go — "Film reel" gallery: YouTube reels as frames on a 35mm film strip.
 * Calm, cinematic: the sprocket holes glide slowly, the featured frame is bright and slightly larger,
 * and the feature moves to the next frame every few seconds. Click a frame to watch with sound.
 * Videos come from the gallery_videos table (admin → Gallery). */
(function () {
  var NG = window.NG, I = window.NGIcon, mount = document.getElementById('wsMount');
  if (!mount || !I) return;
  var $ = function (s) { return mount.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FALLBACK = [{ youtube_id: 'vrinCZiKodI', title: 'Disco lights, dance and friends', place: 'Bengaluru trips' }, { youtube_id: 'A-IOtpmo500', title: 'Inside our party bus', place: 'Weekend getaway' }];
  var vids = [], cur = 0, timer = 0, started = false;

  function poster(id) { return 'https://i.ytimg.com/vi/' + id + '/hq2.jpg'; }
  function embed(id, sound) {
    return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&mute=' + (sound ? 0 : 1) + '&loop=1&playlist=' + id + '&controls=' + (sound ? 1 : 0) + '&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1';
  }
  function two(n) { return (n < 10 ? '0' : '') + n; }

  function shell() {
    mount.innerHTML =
      '<div class="fr-head"><span class="fr-k">' + I('play') + 'Nandi Go films</span><h2>Moments from the <em>road</em></h2><p>Real reels from our trips, straight from the bus, the bonfire and the dance floor.</p></div>' +
      '<div class="fr-strip" id="frStrip">' +
        '<div class="fr-holes top" aria-hidden="true"></div>' +
        '<div class="fr-edge top" aria-hidden="true"><span>NANDI GO 400</span><span>BLR ▸</span><span>NANDI GO 400</span><span>▸ 12A</span></div>' +
        '<div class="fr-frames" id="frFrames"></div>' +
        '<div class="fr-edge bottom" aria-hidden="true"><span>▸ 13</span><span>SAFETY FILM</span><span>▸ 14A</span><span>NANDI GO</span></div>' +
        '<div class="fr-holes bottom" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="fr-info"><div class="fr-count"><b id="frNow">01</b><i></i><span id="frAll">02</span></div>' +
        '<div class="fr-title"><b id="frTitle"></b><small id="frPlace"></small></div>' +
        '<div class="fr-nav"><button type="button" class="fr-arr" data-fr="-1" aria-label="Previous reel">' + I('prev') + '</button><button type="button" class="fr-arr" data-fr="1" aria-label="Next reel">' + I('next') + '</button></div></div>' +
      '<div class="fr-cta"><a class="btn btn-gold" href="https://www.instagram.com/nandigo2026" target="_blank" rel="noopener">' + I('camera') + 'Follow our trips on Instagram</a><a class="btn fr-ghost" href="https://www.youtube.com/@NandiGo-h9u" target="_blank" rel="noopener">' + I('play') + 'More on YouTube</a></div>';
    if (!document.getElementById('wsLb')) document.body.insertAdjacentHTML('beforeend', '<div class="ws-lb" id="wsLb" hidden><button type="button" class="ws-lb-x" aria-label="Close video">' + I('close') + '</button><div class="ws-lb-frame" id="wsLbFrame"></div></div>');
  }

  function render() {
    $('#frAll').textContent = two(vids.length);
    $('#frFrames').innerHTML = vids.map(function (v, i) {
      return '<button type="button" class="fr-frame" data-fr-i="' + i + '" aria-label="Watch with sound: ' + esc(v.title) + '">' +
        '<span class="fr-pic"><img src="' + poster(v.youtube_id) + '" alt="" loading="lazy" onerror="this.onerror=null;this.src=\'https://i.ytimg.com/vi/' + esc(v.youtube_id) + '/hqdefault.jpg\'"><span class="fr-vid"></span>' +
        '<span class="fr-sound">' + I('play') + 'Watch with sound</span></span>' +
        '<span class="fr-no">' + two(i + 1) + 'A</span></button>';
    }).join('');
    feature(0);
  }
  function feature(i) {
    cur = (i + vids.length) % vids.length;
    mount.querySelectorAll('.fr-frame').forEach(function (f, k) { f.classList.toggle('on', k === cur); });
    var v = vids[cur];
    $('#frNow').textContent = two(cur + 1);
    $('#frTitle').textContent = v.title; $('#frPlace').innerHTML = v.place ? I('pin') + esc(v.place) : '';
  }
  function loop() { clearInterval(timer); if (vids.length > 1 && !calm) timer = setInterval(function () { feature(cur + 1); }, 9000); }

  function start() {
    if (started) return; started = true;
    mount.classList.add('rolling');
    mount.querySelectorAll('.fr-frame').forEach(function (f, i) {
      setTimeout(function () {
        var v = vids[+f.dataset.frI], box = f.querySelector('.fr-vid');
        box.innerHTML = '<iframe src="' + embed(v.youtube_id) + '" title="' + esc(v.title) + '" allow="autoplay; encrypted-media; picture-in-picture" tabindex="-1"></iframe>';
        // keep the cover until the player has had time to start, so a frame is never black
        box.firstChild.addEventListener('load', function () { setTimeout(function () { f.classList.add('ready'); }, 1600); });
      }, i * 400);
    });
    loop();
  }

  /* full screen with sound */
  var lb;
  function openLb(i) {
    var v = vids[i]; if (!v) return;
    lb = document.getElementById('wsLb');
    document.getElementById('wsLbFrame').innerHTML = '<iframe src="' + embed(v.youtube_id, true) + '" title="' + esc(v.title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('open'); }); document.documentElement.classList.add('sp-lock');
    feature(i); clearInterval(timer);
  }
  function closeLb() { if (!lb) return; lb.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { lb.hidden = true; document.getElementById('wsLbFrame').innerHTML = ''; }, 220); loop(); }
  document.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('.fr-frame')) && mount.contains(x)) { openLb(+x.dataset.frI); return; }
    if ((x = e.target.closest('[data-fr]')) && mount.contains(x)) { feature(cur + (+x.dataset.fr)); loop(); return; }
    if (lb && !lb.hidden && (e.target === lb || e.target.closest('.ws-lb-x'))) closeLb();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb && !lb.hidden) closeLb(); });
  mount.addEventListener('mouseenter', function () { clearInterval(timer); });
  mount.addEventListener('mouseleave', loop);

  function begin(list) {
    vids = (list && list.length ? list : FALLBACK).slice(0, 6);
    render();
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { start(); io.disconnect(); } }, { rootMargin: '0px 0px -15% 0px' });
      io.observe($('#frStrip'));
    } else start();
  }
  shell();
  if (NG && NG.DB) NG.DB.get('gallery_videos?select=youtube_id,title,place&active=eq.true&order=sort.asc,created_at.asc').then(begin, function () { begin(FALLBACK); });
  else begin(FALLBACK);
})();
