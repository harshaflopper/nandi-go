/* Nandi Go — cinematic gallery.
 * Intro (once, when the section comes into view): letterboxed fly-through the clouds (real footage) → white flash →
 * dive onto a ghat road with a bus (real aerial footage) → the road softens and the camera "zooms into a window",
 * a tall screen where the trip reels play. Each reel plays to its end (YouTube IFrame API), then the road clears for a
 * beat and the next reel slides in. Videos come from the gallery_videos table (admin → Gallery). Footage: Pexels (free licence). */
(function () {
  var NG = window.NG, I = window.NGIcon, mount = document.getElementById('wsMount');
  if (!mount || !I) return;
  var $ = function (s) { return mount.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FALLBACK = [{ youtube_id: 'vrinCZiKodI', title: 'Disco lights, dance and friends', place: 'Bengaluru trips' }, { youtube_id: 'A-IOtpmo500', title: 'Inside our party bus', place: 'Weekend getaway' }];
  var vids = [], cur = 0, player = null, ytReady = false, wantPlay = false, muted = true, introDone = false, visible = false, progT = 0, busy = false;
  var G = function () { return window.gsap; };
  function two(n) { return (n < 10 ? '0' : '') + n; }
  function poster(id) { return 'https://i.ytimg.com/vi/' + id + '/hq2.jpg'; }

  function shell() {
    mount.innerHTML =
      '<div class="cn" id="cn">' +
        '<video class="cn-bg cn-road" muted playsinline loop preload="none" poster="assets/film/road.jpg" data-src="assets/film/road.mp4" aria-hidden="true"></video>' +
        '<video class="cn-bg cn-clouds" muted playsinline preload="none" poster="assets/film/clouds.jpg" data-src="assets/film/clouds.mp4" aria-hidden="true"></video>' +
        '<div class="cn-flash" aria-hidden="true"></div><div class="cn-shade" aria-hidden="true"></div><div class="cn-grain" aria-hidden="true"></div>' +
        '<div class="cn-bar top" aria-hidden="true"></div><div class="cn-bar bot" aria-hidden="true"></div>' +
        '<p class="cn-line l1" aria-hidden="true">Somewhere above Karnataka…</p><p class="cn-line l2" aria-hidden="true">…the road begins.</p>' +
        '<div class="cn-wrap">' +
          '<div class="cn-copy">' +
            '<span class="cn-k">' + I('play') + 'Nandi Go films</span>' +
            '<h2 class="cn-h">Moments from the <em>road</em></h2>' +
            '<div class="cn-now"><span class="cn-count"><b id="cnNo">01</b> / <span id="cnAll">02</span></span><b class="cn-title" id="cnTitle"></b><small class="cn-place" id="cnPlace"></small></div>' +
            '<div class="cn-prog"><i id="cnProg"></i></div>' +
            '<div class="cn-ctrl"><button type="button" class="cn-btn" id="cnSound">' + I('play') + '<span>Tap for sound</span></button>' +
              '<button type="button" class="cn-ic" id="cnPrev" aria-label="Previous reel">' + I('prev') + '</button><button type="button" class="cn-ic" id="cnNext" aria-label="Next reel">' + I('next') + '</button></div>' +
            '<div class="cn-links"><a href="https://www.instagram.com/nandigo2026" target="_blank" rel="noopener">' + I('camera') + 'Instagram</a><a href="https://www.youtube.com/@NandiGo-h9u" target="_blank" rel="noopener">' + I('play') + 'YouTube</a></div>' +
          '</div>' +
          '<div class="cn-screen" id="cnScreen"><div class="cn-glass"><img id="cnPoster" alt=""><div id="cnPlayer"></div><span class="cn-reflect" aria-hidden="true"></span></div></div>' +
          '<button type="button" class="cn-next" id="cnUp" aria-label="Play next reel"><span class="cn-next-k">Up next</span><span class="cn-next-ph" id="cnUpPh"></span><b id="cnUpT"></b></button>' +
        '</div>' +
      '</div>';
  }

  /* ---------- reel info ---------- */
  function info() {
    var v = vids[cur], n = vids[(cur + 1) % vids.length];
    $('#cnNo').textContent = two(cur + 1); $('#cnAll').textContent = two(vids.length);
    $('#cnTitle').textContent = v.title; $('#cnPlace').innerHTML = v.place ? I('pin') + esc(v.place) : '';
    $('#cnPoster').src = poster(v.youtube_id);
    $('#cnPoster').onerror = function () { this.onerror = null; this.src = 'https://i.ytimg.com/vi/' + v.youtube_id + '/hqdefault.jpg'; };
    $('#cnUp').hidden = vids.length < 2;
    if (n) { $('#cnUpPh').style.backgroundImage = 'url(' + poster(n.youtube_id) + ')'; $('#cnUpT').textContent = n.title; }
    $('#cnProg').style.width = '0%';
  }

  /* ---------- YouTube player (one player, reused for every reel) ---------- */
  var apiReady = false;
  function loadYT() {
    if (window.YT && window.YT.Player) { apiReady = true; if (wantPlay) create(); return; }
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) prev(); apiReady = true; if (wantPlay) create(); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  }
  // The player autoplays from its own URL (muted), which avoids YouTube's pause overlay; the API only watches for the end.
  function create() {
    if (player) return;
    var id = vids[cur].youtube_id, holder = document.getElementById('cnPlayer');
    holder.outerHTML = '<iframe id="cnYT" title="' + esc(vids[cur].title) + '" allow="autoplay; encrypted-media; picture-in-picture" src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1&origin=' + encodeURIComponent(location.origin) + '"></iframe>';
    player = new YT.Player('cnYT', {
      events: {
        onReady: function () { ytReady = true; if (!muted) player.unMute(); if (!visible) player.pauseVideo(); },
        onStateChange: function (e) {
          if (e.data === 1) { setTimeout(function () { mount.querySelector('.cn-screen').classList.add('playing'); }, 700); tickProgress(); }
          if (e.data === 0) next();
        }
      }
    });
  }
  function tickProgress() {
    clearInterval(progT);
    progT = setInterval(function () {
      if (!player || !player.getDuration) return;
      var d = player.getDuration(), t = player.getCurrentTime(); if (d > 0) $('#cnProg').style.width = Math.min(100, t / d * 100) + '%';
    }, 250);
  }
  function play() { wantPlay = true; if (!player) { if (apiReady) create(); } else if (ytReady && visible) player.playVideo(); }

  /* ---------- switching reels: screen out → road clears for a beat → next screen in ---------- */
  function go(i) {
    if (busy || !vids.length) return; busy = true;
    var g = G(), scr = $('#cnScreen'), road = $('.cn-road');
    var swap = function () {
      cur = (i + vids.length) % vids.length; info();
      scr.classList.remove('playing');
      if (ytReady) { player.loadVideoById(vids[cur].youtube_id); if (muted) player.mute(); else player.unMute(); }
    };
    if (!g || calm) { swap(); busy = false; return; }
    g.timeline({ onComplete: function () { busy = false; } })
      .to(scr, { scale: .82, opacity: 0, duration: .55, ease: 'power3.in' })
      .to(road, { filter: 'blur(0px) brightness(.85)', scale: 1.04, duration: .7, ease: 'power2.out' }, '<.1')
      .add(swap)
      .to(road, { filter: 'blur(7px) brightness(.5)', scale: 1.12, duration: .8, ease: 'power2.inOut' }, '+=.55')
      .fromTo(scr, { scale: .35, opacity: 0, y: 30 }, { scale: 1, opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, '<.25');
  }
  function next() { go(cur + 1); }

  /* ---------- the intro ---------- */
  function srcs() { mount.querySelectorAll('video[data-src]').forEach(function (v) { if (!v.src) { v.src = v.dataset.src; v.load(); } }); }
  function intro() {
    if (introDone) return; introDone = true;
    srcs(); loadYT();
    var g = G(), cl = $('.cn-clouds'), road = $('.cn-road'), cn = $('#cn');
    if (!g || calm) {
      cl.style.opacity = 0; road.play().catch(function () {}); cn.classList.add('ready'); play(); return;
    }
    cl.currentTime = 0; cl.play().catch(function () {});
    road.play().catch(function () {});
    var tl = g.timeline();
    tl.set(cn, { className: 'cn intro' })
      .fromTo('.cn-bar', { height: '13%' }, { height: '13%', duration: .01 })
      .fromTo(cl, { scale: 1.02 }, { scale: 1.45, duration: 3.2, ease: 'power2.in' }, 0)
      .fromTo('.cn-line.l1', { opacity: 0, y: 14, letterSpacing: '.5em' }, { opacity: 1, y: 0, letterSpacing: '.28em', duration: 1, ease: 'power2.out' }, .25)
      .to('.cn-line.l1', { opacity: 0, y: -10, duration: .5 }, 1.9)
      .to('.cn-flash', { opacity: .95, duration: .35, ease: 'power2.in' }, 2.75)
      .set(cl, { opacity: 0 }, 3.1)
      .fromTo(road, { scale: 1.45, filter: 'blur(0px) brightness(.95)' }, { scale: 1.06, duration: 1.6, ease: 'expo.out' }, 3.1)
      .to('.cn-flash', { opacity: 0, duration: .7, ease: 'power2.out' }, 3.1)
      .fromTo('.cn-line.l2', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .7, ease: 'power2.out' }, 3.3)
      .to('.cn-line.l2', { opacity: 0, duration: .45 }, 4.4)
      .to(road, { filter: 'blur(7px) brightness(.5)', scale: 1.12, duration: 1.1, ease: 'power2.inOut' }, 4.5)
      .to('.cn-bar', { height: '0%', duration: 1, ease: 'power3.inOut' }, 4.5)
      .add(function () { cn.classList.add('ready'); play(); }, 4.7)
      .fromTo('#cnScreen', { scale: .18, opacity: 0, y: 40 }, { scale: 1, opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, 4.7)
      .fromTo('.cn-copy > *', { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: .8, stagger: .08, ease: 'power3.out' }, 5)
      .fromTo('#cnUp', { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: .8, ease: 'power3.out' }, 5.2);
  }

  /* ---------- controls ---------- */
  $('#cnSound') && 0;
  function wire() {
    $('#cnSound').addEventListener('click', function () {
      if (!ytReady) return;
      muted = !muted; if (muted) player.mute(); else { player.unMute(); player.setVolume(85); player.playVideo(); }
      this.classList.toggle('on', !muted); this.querySelector('span').textContent = muted ? 'Tap for sound' : 'Sound on';
    });
    $('#cnNext').addEventListener('click', function () { go(cur + 1); });
    $('#cnPrev').addEventListener('click', function () { go(cur - 1); });
    $('#cnUp').addEventListener('click', function () { go(cur + 1); });
    $('#cnScreen').addEventListener('click', function () { $('#cnSound').click(); });
  }

  /* ---------- start when seen, pause when away ---------- */
  function watch() {
    if (!('IntersectionObserver' in window)) { visible = true; intro(); return; }
    var near = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { srcs(); near.disconnect(); } }, { rootMargin: '400px 0px' });
    near.observe(mount);
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      var road = $('.cn-road');
      if (visible) { intro(); if (introDone) { road.play().catch(function () {}); if (ytReady && wantPlay) player.playVideo(); } }
      else { road.pause(); if (ytReady) player.pauseVideo(); }
    }, { threshold: .35 }).observe(mount);
  }

  function begin(list) {
    vids = (list && list.length ? list : FALLBACK).slice(0, 10);
    info(); wire(); watch();
  }
  shell();
  if (NG && NG.DB) NG.DB.get('gallery_videos?select=youtube_id,title,place&active=eq.true&order=sort.asc,created_at.asc').then(begin, function () { begin(FALLBACK); });
  else begin(FALLBACK);
})();
