/* Nandi Go — traveller reviews.
 * Home page: rating summary + sliding review cards. Trip page: summary for that trip, photo wall, sort and filters.
 * Mount: <div id="rvMount" data-mode="home|trip"></div>. Needs icons, data, db. New reviews wait for approval in admin. */
(function () {
  var NG = window.NG, I = window.NGIcon, mount = document.getElementById('rvMount');
  if (!NG || !I || !mount || !NG.DB) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var PHOTO = NG.DB.url + '/storage/v1/object/public/review-photos/';
  var MODE = mount.dataset.mode || 'home', TRIP = MODE === 'trip' ? new URLSearchParams(location.search).get('id') : null;
  var SUBS = [['r_stay', 'Stay'], ['r_food', 'Food'], ['r_captain', 'Trip captain'], ['r_value', 'Value for money']];
  var SOURCES = { booking: 'Verified traveller', whatsapp: 'Shared on WhatsApp', google: 'From Google', instagram: 'From Instagram' };
  var all = [], filter = 'all', sort = 'top', shown = 6, invite = null;

  /* ---------- helpers ---------- */
  function stars(n, cls) { var s = ''; for (var i = 1; i <= 5; i++) s += '<i class="' + (i <= Math.round(n) ? 'on' : '') + '">★</i>'; return '<span class="rv-stars ' + (cls || '') + '" aria-label="' + (+n).toFixed(1) + ' out of 5">' + s + '</span>'; }
  function initials(n) { return String(n).trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function monthYear(d) { return new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); }
  function photosOf(r) { return (r.photos || []).map(function (p) { return /^https?:/.test(p) ? p : PHOTO + p; }); }
  function avg(list, key) { var v = list.map(function (r) { return r[key]; }).filter(function (x) { return x; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : 0; }
  function tripLink(r) { var t = r.trip_id && NG.trip(r.trip_id); return t ? 'trip.html?id=' + encodeURIComponent(t.id) + (r.style_id ? '&style=' + encodeURIComponent(r.style_id) : '') : null; }
  var AVATAR = ['#1A3D2E', '#2F5F46', '#8A6A1F', '#5B4636', '#3D5A6C'];
  function avColor(n) { var h = 0; String(n).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 997; }); return AVATAR[h % AVATAR.length]; }

  /* ---------- markup ---------- */
  function shell() {
    if (MODE === 'home') {
      mount.innerHTML =
        '<div class="rs-head"><div><span class="kicker">' + I('star') + 'Traveller reviews</span><h2>What our travellers <em>say</em></h2>' +
          '<p>Honest ratings and photos from people who travelled with Nandi Go.</p></div>' +
          '<button type="button" class="btn btn-gold rs-write-top" data-write-review>' + I('star') + 'Write a review</button></div>' +
        '<div class="rs">' +
          '<aside class="rs-sum" id="rvSum"></aside>' +
          '<div class="rs-main">' +
            '<div class="rs-bar"><div class="chips rv-chips" id="rvChips" role="tablist" aria-label="Filter by travel style"></div>' +
              '<div class="rs-nav"><button type="button" class="rs-arr" data-rs="-1" aria-label="Previous reviews">' + I('prev') + '</button><button type="button" class="rs-arr" data-rs="1" aria-label="Next reviews">' + I('next') + '</button></div></div>' +
            '<div class="rs-track" id="rvList"></div>' +
            '<div class="rs-dots" id="rsDots"></div>' +
          '</div>' +
        '</div>' + secretBand();
      if (!$('rvForm')) document.body.insertAdjacentHTML('beforeend', formHtml() + secretHtml() + viewHtml());
      return;
    }
    var head = MODE === 'home'
      ? '<div class="section-head rvx-head"><span class="kicker">' + I('star') + 'Traveller stories</span><h2>Told by the people who <em>went</em></h2><p>Real words and photos from Nandi Go travellers. Back from a trip? Tell us how it went.</p></div>'
      : '<div class="rvx-thead"><h2>Reviews <span id="rvTotal"></span></h2><button type="button" class="btn btn-ghost btn-sm" data-write-review>' + I('star') + 'Write a review</button></div>';
    mount.innerHTML = head +
      '<div class="rvx ' + MODE + '">' +
        '<aside class="rvx-sum" id="rvSum"></aside>' +
        '<div class="rvx-main">' +
          (MODE === 'trip' ? '<div class="rvx-wall" id="rvWall" hidden></div>' : '') +
          '<div class="rvx-bar"><div class="chips rv-chips" id="rvChips" role="tablist" aria-label="Filter by travel style"></div>' +
            (MODE === 'trip' ? '<label class="rvx-sort">Sort<select id="rvSort"><option value="top">Most helpful</option><option value="new">Newest</option><option value="high">Highest rated</option><option value="low">Lowest rated</option><option value="photos">With photos</option></select></label>'
              : '<div class="rvx-arrows"><button type="button" class="rvx-arr" data-rv-scroll="-1" aria-label="Previous reviews">' + I('prev') + '</button><button type="button" class="rvx-arr" data-rv-scroll="1" aria-label="Next reviews">' + I('next') + '</button></div>') +
          '</div>' +
          '<div class="' + (MODE === 'home' ? 'rvx-track' : 'rvx-list') + '" id="rvList"><p class="rv-empty">Loading reviews…</p></div>' +
          (MODE === 'trip' ? '<div class="rv-more-wrap"><button type="button" class="btn btn-ghost" id="rvMore" hidden>Show more reviews</button></div>' : '') +
        '</div>' +
      '</div>';
    mount.insertAdjacentHTML('beforeend', secretBand());
    if (!$('rvForm')) document.body.insertAdjacentHTML('beforeend', formHtml() + secretHtml());
  }

  function summary(list) {
    var n = list.length, a = avg(list, 'rating'), dist = [5, 4, 3, 2, 1].map(function (s) { return list.filter(function (r) { return r.rating === s; }).length; });
    var subs = SUBS.map(function (s) { return [s[1], avg(list, s[0])]; }).filter(function (s) { return s[1]; });
    var verified = list.filter(function (r) { return r.verified; }).length;
    if (!n) return '<div class="rvx-score new"><b>New</b><div>' + stars(0, 'lg') + '<small>No reviews yet</small></div></div>' +
      '<p class="rvx-first">' + (MODE === 'trip' ? 'Been on this trip? Your review helps the next traveller decide.' : 'We have just opened reviews. Travelled with Nandi Go? Be the first to tell others how it went.') + '</p>' +
      '<button type="button" class="btn btn-gold rvx-write" data-write-review>' + I('star') + 'Be the first to review</button>';
    return '<div class="rvx-score"><b>' + a.toFixed(1) + '</b><div>' + stars(a, 'lg') + '<small>' + n + ' review' + (n === 1 ? '' : 's') + (verified ? ' · ' + verified + ' verified' : '') + '</small></div></div>' +
      '<div class="rvx-dist">' + dist.map(function (c, i) {
        return '<button type="button" class="rvx-drow" data-rv-star="' + (5 - i) + '"><span>' + (5 - i) + ' ★</span><i><em style="width:' + (n ? c / n * 100 : 0) + '%"></em></i><small>' + c + '</small></button>';
      }).join('') + '</div>' +
      (subs.length ? '<div class="rvx-subs">' + subs.map(function (s) { return '<div><span>' + s[0] + '</span><i><em style="width:' + s[1] / 5 * 100 + '%"></em></i><b>' + s[1].toFixed(1) + '</b></div>'; }).join('') + '</div>' : '') +
      '<button type="button" class="btn btn-gold rvx-write" data-write-review>' + I('star') + 'Write a review</button>';
  }

  function card(r) {
    var ph = photosOf(r), link = tripLink(r), st = r.style_id && NG.style(r.style_id), long = (r.body || '').length > 200;
    var badge = r.verified ? '<span class="rvx-badge ok">' + I('check') + 'Verified traveller</span>' : (SOURCES[r.source] ? '<span class="rvx-badge">' + SOURCES[r.source] + '</span>' : '');
    return '<article class="rvx-card' + (r.featured ? ' featured' : '') + '">' +
      '<header><span class="rv-av" style="background:' + avColor(r.name) + '">' + esc(initials(r.name)) + '</span>' +
        '<div><b>' + esc(r.name) + '</b><small>' + esc([r.place, r.travel_month ? 'Travelled ' + monthYear(r.travel_month) : 'Reviewed ' + monthYear(r.created_at)].filter(Boolean).join(' · ')) + '</small></div>' +
        '<span class="rvx-rate">' + I('star') + r.rating + '</span></header>' +
      (badge || st ? '<div class="rvx-meta">' + badge + (st ? '<span class="rvx-style">' + esc(st.name) + '</span>' : '') + '</div>' : '') +
      (r.title ? '<h3>' + esc(r.title) + '</h3>' : '') +
      '<p class="rvx-text' + (long ? ' clamp' : '') + '">' + esc(r.body) + '</p>' + (long ? '<button type="button" class="rvx-more" data-rv-expand>Read more</button>' : '') +
      (ph.length ? '<div class="rvx-ph">' + ph.slice(0, 4).map(function (p, i) { return '<button type="button" data-photo="' + esc(p) + '" data-set="' + esc(ph.join('|')) + '" data-i="' + i + '" style="background-image:url(\'' + esc(p) + '\')" aria-label="Open photo ' + (i + 1) + '"></button>'; }).join('') + '</div>' : '') +
      (r.trip_title && MODE === 'home' ? (link ? '<a class="rvx-trip" href="' + link + '">' : '<span class="rvx-trip">') + I('pin') + esc(r.trip_title) + (link ? '</a>' : '</span>') : '') +
      '</article>';
  }

  /* ---------- render ---------- */
  function scoped() { return all.filter(function (r) { return !TRIP || r.trip_id === TRIP; }); }
  function render() {
    if (MODE === 'home') { renderHome(); if (!renderHome.wired) { renderHome.wired = 1; $('rvList').addEventListener('scroll', syncDots, { passive: true }); } return; }
    var base = scoped();
    $('rvSum').innerHTML = summary(base);
    mount.querySelector('.rvx').classList.toggle('empty', !base.length);
    if ($('rvTotal')) $('rvTotal').textContent = base.length ? '(' + base.length + ')' : '';
    var styles = NG.STYLES.filter(function (s) { return !s.hidden && base.some(function (r) { return r.style_id === s.id; }); });
    $('rvChips').innerHTML = styles.length ? '<button type="button" class="chip' + (filter === 'all' ? ' active' : '') + '" data-rvf="all">All</button>' +
      styles.map(function (s) { return '<button type="button" class="chip' + (filter === s.id ? ' active' : '') + '" data-rvf="' + s.id + '">' + esc(s.name) + '</button>'; }).join('') +
      (/^\d$/.test(filter) ? '<button type="button" class="chip active" data-rvf="all">' + filter + ' ★ only ×</button>' : '') : '';
    $('rvChips').closest('.rvx-bar').hidden = !base.length;

    var list = base.filter(function (r) { return filter === 'all' || r.style_id === filter || String(r.rating) === filter; });
    var by = {
      top: function (a, b) { return (b.featured - a.featured) || (b.verified - a.verified) || (photosOf(b).length - photosOf(a).length) || (b.body.length - a.body.length); },
      new: function (a, b) { return a.created_at < b.created_at ? 1 : -1; },
      high: function (a, b) { return b.rating - a.rating; }, low: function (a, b) { return a.rating - b.rating; },
      photos: function (a, b) { return photosOf(b).length - photosOf(a).length; }
    };
    list = list.slice().sort(by[MODE === 'home' ? 'top' : sort]);
    if (MODE === 'home') {
      $('rvList').innerHTML = list.length ? list.slice(0, 20).map(card).join('') : (base.length ? '<p class="rv-empty">No reviews here yet.</p>' : emptyCard());
    } else {
      $('rvList').innerHTML = list.length ? list.slice(0, shown).map(card).join('') : (base.length ? '<p class="rv-empty">No reviews match this filter.</p>' : '');
      $('rvMore').hidden = list.length <= shown;
      var pics = []; base.forEach(function (r) { photosOf(r).forEach(function (p) { pics.push(p); }); });
      $('rvWall').hidden = !pics.length;
      $('rvWall').innerHTML = '<span class="rvx-lab">' + I('camera') + 'Traveller photos</span><div>' + pics.slice(0, 8).map(function (p, i) {
        return '<button type="button" data-photo="' + esc(p) + '" data-set="' + esc(pics.join('|')) + '" data-i="' + i + '" style="background-image:url(\'' + esc(p) + '\')">' + (i === 7 && pics.length > 8 ? '<em>+' + (pics.length - 8) + '</em>' : '') + '</button>';
      }).join('') + '</div>';
    }
  }

  /* ---------- home: rating summary + review carousel ---------- */
  var LABEL = ['', 'Poor', 'Okay', 'Good', 'Very good', 'Excellent'];
  function summaryHome(list) {
    var n = list.length, a = avg(list, 'rating'), ver = list.filter(function (r) { return r.verified; }).length;
    var dist = [5, 4, 3, 2, 1].map(function (x) { return list.filter(function (r) { return r.rating === x; }).length; });
    var subs = SUBS.map(function (x) { return [x[1], avg(list, x[0])]; });
    var tops = {}; list.forEach(function (r) { if (r.trip_id) tops[r.trip_id] = (tops[r.trip_id] || 0) + 1; });
    return '<div class="rt-top">' +
        '<div class="rt-route"><span>BLR</span><i>' + I('plane') + '</i><span>Anywhere</span></div>' +
        '<span class="rt-k">Traveller rating</span>' +
        '<div class="rt-score' + (n ? '' : ' new') + '"><b>' + (n ? a.toFixed(1) : 'New') + '</b><div>' + stars(n ? a : 0, 'lg') + '<span>' + (n ? LABEL[Math.round(a)] + ' · ' + n + ' review' + (n === 1 ? '' : 's') : 'Be the first to rate us') + '</span></div></div>' +
        (ver ? '<span class="rt-ver">' + I('check') + ver + ' verified traveller' + (ver === 1 ? '' : 's') + '</span>' : '') +
        '<span class="rt-stamp" aria-hidden="true"><span>Real<br>reviews<br>only</span></span>' +
      '</div>' +
      '<div class="rt-cut" aria-hidden="true"></div>' +
      '<div class="rt-bot">' +
        '<div class="rs-dist">' + dist.map(function (c, i) {
          return '<button type="button" class="rs-drow' + (filter === String(5 - i) ? ' on' : '') + '" data-rv-star="' + (5 - i) + '"' + (c ? '' : ' disabled') + '><span>' + (5 - i) + '<i>★</i></span><span class="rs-track-bar"><em data-w="' + (n ? c / n * 100 : 0) + '"></em></span><small>' + c + '</small></button>';
        }).join('') + '</div>' +
        '<div class="rs-subs">' + subs.map(function (x) {
          return '<div><span>' + x[0] + '</span><span class="rs-track-bar sm"><em data-w="' + (x[1] / 5 * 100) + '"></em></span><b>' + (x[1] ? x[1].toFixed(1) : '–') + '</b></div>';
        }).join('') + '</div>' +
        '<button type="button" class="btn btn-gold rs-write" data-write-review>' + I('star') + (n ? 'Write a review' : 'Be the first to review') + '</button>' +
      '</div>';
  }
  function cardPhoto(r) {
    var ph = photosOf(r); if (ph.length) return { url: ph[0], own: true, all: ph };
    var t = r.trip_id && NG.trip(r.trip_id), pc = t && NG.POSTCARDS[t.dest];
    return { url: (pc && pc.photo) || (t && t.image) || '', own: false, all: [] };
  }
  function placeOf(r) { var t = r.trip_id && NG.trip(r.trip_id), d = t && NG.dest(t.dest); return (d && d.name) || (t && t.place) || r.trip_title || 'Nandi Go'; }
  function reviewCard(r) {
    var ph = cardPhoto(r), st = r.style_id && NG.style(r.style_id), long = (r.body || '').length > 200, where = placeOf(r);
    var code = (where.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'NGO').toUpperCase();
    return '<article class="rc pc">' +
      '<div class="pc-pic" style="background-image:url(\'' + esc(ph.url) + '\')">' +
        (ph.own ? '<button type="button" class="pc-zoom" data-photo="' + esc(ph.url) + '" data-set="' + esc(ph.all.join('|')) + '" data-i="0" aria-label="Open traveller photos">' + I('camera') + ph.all.length + '</button>' : '') +
        '<span class="pc-place">' + esc(where.split('·')[0].trim()) + '</span>' +
      '</div>' +
      '<div class="pc-note">' +
        '<span class="pc-stamp" aria-label="' + r.rating + ' out of 5"><b>' + r.rating + '.0</b><i>' + '★★★★★'.slice(0, r.rating) + '</i></span>' +
        '<span class="pc-mark" aria-hidden="true"><span>BLR → ' + code + '<br>' + esc(monthYear(r.travel_month || r.created_at)) + '</span></span>' +
        (r.title ? '<h3>' + esc(r.title) + '</h3>' : '<h3>Dear Nandi Go,</h3>') +
        '<p class="pc-text">' + esc(r.body) + '</p>' +
        (long ? '<button type="button" class="pc-more" data-rv-open="' + esc(r.id) + '">Read the full postcard</button>' : '') +
        '<div class="pc-sign"><span class="rv-av" style="background:' + avColor(r.name) + '">' + esc(initials(r.name)) + '</span><div>' +
          '<b>' + esc(r.name) + (r.verified ? '<span class="rc-ok">' + I('check') + 'Verified</span>' : '') + '</b>' +
          '<small>' + esc([st && st.name, r.place].filter(Boolean).join(' · ') || r.trip_title || '') + '</small></div></div>' +
      '</div>' +
    '</article>';
  }
  function renderHome() {
    var list = all.filter(function (r) { return filter === 'all' || r.style_id === filter || String(r.rating) === filter; })
      .sort(function (a, b) { return (b.featured - a.featured) || (b.verified - a.verified) || (photosOf(b).length - photosOf(a).length) || (a.created_at < b.created_at ? 1 : -1); });
    $('rvSum').innerHTML = summaryHome(all);
    var styles = NG.STYLES.filter(function (x) { return !x.hidden && all.some(function (r) { return r.style_id === x.id; }); });
    $('rvChips').innerHTML = all.length ? '<button type="button" class="chip' + (filter === 'all' ? ' active' : '') + '" data-rvf="all">All reviews</button>' +
      styles.map(function (x) { return '<button type="button" class="chip' + (filter === x.id ? ' active' : '') + '" data-rvf="' + x.id + '">' + esc(x.name) + '</button>'; }).join('') +
      (/^\d$/.test(filter) ? '<button type="button" class="chip active" data-rvf="all">' + filter + '★ only ×</button>' : '') : '';
    mount.querySelector('.rs').classList.toggle('empty', !all.length);
    $('rvList').innerHTML = list.length ? list.slice(0, 24).map(reviewCard).join('') : (all.length ? '<div class="rc pc-none"><p>No reviews match this filter.</p></div>' : emptyHome());
    $('rvList').scrollLeft = 0;
    dots(); animateBars();
  }
  function emptyHome() {
    var t = NG.trip('coorg-ooty') || NG.TRIPS[0] || {}, pc = (t.dest && NG.POSTCARDS[t.dest]) || {};
    return '<div class="rc pc pc-blank">' +
      '<div class="pc-pic" style="background-image:url(\'' + esc(pc.photo || t.image || '') + '\')"><span class="pc-place">Wish you were here</span></div>' +
      '<div class="pc-note">' +
        '<span class="pc-stamp blank"><b>' + I('star') + '</b><i>your stars</i></span>' +
        '<span class="pc-mark" aria-hidden="true"><span>NANDI GO<br>REVIEWS OPEN</span></span>' +
        '<h3>Your postcard goes here</h3>' +
        '<p class="pc-text">Back from a trip with us? Send future travellers a postcard: rate the stay, the food and the trip captain, add your photos, and tell them what to look forward to.</p>' +
        '<div class="pc-lines" aria-hidden="true"><i></i><i></i></div>' +
        '<button type="button" class="btn btn-gold" data-write-review>' + I('send') + 'Write the first postcard</button>' +
      '</div>' +
    '</div>';
  }
  function dots() {
    var tr = $('rvList'), cards = tr.querySelectorAll('.rc:not(.pc-none)'), per = Math.max(1, Math.round(tr.clientWidth / ((cards[0] || {}).offsetWidth || 340)));
    var pages = Math.ceil(cards.length / per);
    mount.querySelector('.rs-nav').hidden = pages < 2;
    $('rsDots').innerHTML = pages > 1 ? Array.apply(null, Array(pages)).map(function (_, i) { return '<button type="button" data-dot="' + i + '" aria-label="Page ' + (i + 1) + '"></button>'; }).join('') : '';
    syncDots();
  }
  function syncDots() {
    var tr = $('rvList'), d = $('rsDots').children; if (!d.length) return;
    var i = Math.round(tr.scrollLeft / Math.max(1, tr.scrollWidth - tr.clientWidth) * (d.length - 1));
    [].forEach.call(d, function (x, k) { x.classList.toggle('on', k === i); });
  }
  function slide(dir) {
    var tr = $('rvList'), c = tr.querySelector('.rc'); if (!c) return;
    var step = (c.offsetWidth + 20) * Math.max(1, Math.floor(tr.clientWidth / (c.offsetWidth + 20)));
    if (dir > 0 && tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 4) tr.scrollTo({ left: 0, behavior: 'smooth' });
    else tr.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
  var io = null, auto = 0;
  function animateBars() {
    var el = $('rvSum');
    var go = function () { el.querySelectorAll('[data-w]').forEach(function (e) { e.style.width = e.dataset.w + '%'; }); };
    if (!('IntersectionObserver' in window)) return go();
    if (io) io.disconnect();
    io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { go(); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
  }
  if (MODE === 'home') {
    mount.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-rs]'))) slide(+b.dataset.rs);
      else if ((b = e.target.closest('[data-dot]'))) { var tr = $('rvList'); tr.scrollTo({ left: (tr.scrollWidth - tr.clientWidth) * (+b.dataset.dot) / Math.max(1, $('rsDots').children.length - 1), behavior: 'smooth' }); }
    });
    // gentle auto-advance, paused while the visitor hovers or touches the reviews
    var paused = false;
    mount.addEventListener('mouseenter', function () { paused = true; }); mount.addEventListener('mouseleave', function () { paused = false; });
    mount.addEventListener('touchstart', function () { paused = true; }, { passive: true });
    setInterval(function () { if (!paused && !document.hidden && $('rvList') && $('rvList').querySelectorAll('.rc').length > 3 && !matchMedia('(prefers-reduced-motion: reduce)').matches) slide(1); }, 7000);
    addEventListener('resize', function () { if ($('rsDots')) dots(); });
  }
  function viewHtml() {
    return '<div class="pm rvv" id="rvView" hidden><div class="pm-card" role="dialog" aria-modal="true"><button type="button" class="pm-close" data-rvv-close aria-label="Close">' + I('close') + '</button><div class="pm-body" id="rvViewBody"></div></div></div>';
  }
  function openView(id) {
    var r = all.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var saveMode = MODE; $('rvViewBody').innerHTML = card(r).replace(' clamp', '').replace(/<button type="button" class="rvx-more"[^>]*>Read more<\/button>/, '');
    var pm = $('rvView'); pm.hidden = false; requestAnimationFrame(function () { pm.classList.add('open'); }); document.documentElement.classList.add('sp-lock');
  }
  function closeView() { var pm = $('rvView'); pm.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { pm.hidden = true; }, 200); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rv-open]'); if (b) { openView(b.dataset.rvOpen); return; }
    if ($('rvView') && (e.target === $('rvView') || e.target.closest('[data-rvv-close]'))) closeView();
    var ph = $('rvView') && !$('rvView').hidden && e.target.closest('#rvView [data-photo]'); if (ph) { closeView(); openLb(ph.dataset.set.split('|'), +ph.dataset.i); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && $('rvView') && !$('rvView').hidden) closeView();
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.rvOpen) openView(e.target.dataset.rvOpen);
  });

  function emptyCard() {
    return '<div class="rvx-empty"><span>' + I('heart') + '</span><b>Your story could be the first one here</b><p>Every review is from a real Nandi Go traveller. Travelled with us? Tell others what it was like.</p></div>';
  }

  function load() {
    NG.DB.get('public_reviews?select=*&order=created_at.desc&limit=200' + (TRIP ? '&trip_id=eq.' + encodeURIComponent(TRIP) : ''))
      .then(function (rows) { all = rows.filter(function (r) { return !r.is_sample; }); render(); })
      .catch(function () { $('rvList').innerHTML = '<p class="rv-empty">Reviews could not be loaded right now.</p>'; });
  }

  /* ---------- events ---------- */
  mount.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-rvf]'))) { filter = b.dataset.rvf; shown = 6; render(); return; }
    if ((b = e.target.closest('[data-rv-star]'))) { filter = filter === b.dataset.rvStar ? 'all' : b.dataset.rvStar; shown = 6; render(); (MODE === 'trip' ? $('rvList') : mount).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
    if ((b = e.target.closest('[data-rv-expand]'))) { var t = b.previousElementSibling; t.classList.toggle('clamp'); b.textContent = t.classList.contains('clamp') ? 'Read more' : 'Show less'; return; }
    if ((b = e.target.closest('[data-rv-scroll]'))) { var tr = $('rvList'), c = tr.querySelector('.rvx-card'); tr.scrollBy({ left: (+b.dataset.rvScroll) * ((c ? c.offsetWidth : 320) + 18), behavior: 'smooth' }); return; }
    if ((b = e.target.closest('[data-photo]'))) { openLb(b.dataset.set.split('|'), +b.dataset.i); }
  });
  if ($('rvSort')) $('rvSort').addEventListener('input', function () { sort = this.value; shown = 6; render(); });
  if ($('rvMore')) $('rvMore').addEventListener('click', function () { shown += 6; render(); });
  document.addEventListener('ng:catalog', function () { render(); fillTrips(); });

  /* ---------- photo viewer ---------- */
  var lbSet = [], lbI = 0;
  function openLb(set, i) {
    lbSet = set; lbI = i; var lb = $('rvLightbox');
    $('rvLbImg').src = set[i]; lb.classList.toggle('one', set.length < 2); lb.hidden = false;
    requestAnimationFrame(function () { lb.classList.add('open'); }); document.documentElement.classList.add('sp-lock');
  }
  function closeLb() { var lb = $('rvLightbox'); lb.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { lb.hidden = true; $('rvLbImg').src = ''; }, 200); }
  function stepLb(n) { lbI = (lbI + n + lbSet.length) % lbSet.length; $('rvLbImg').src = lbSet[lbI]; }

  /* ---------- write a review ---------- */
  function formHtml() {
    return '<div class="pm" id="rvForm" hidden><div class="pm-card rv-pm" role="dialog" aria-modal="true" aria-labelledby="rvFormTitle">' +
      '<button type="button" class="pm-close" data-rv-close aria-label="Close">' + I('close') + '</button>' +
      '<div class="pm-body" id="rvFormBox"><span class="kicker">Share your trip</span><h3 id="rvFormTitle">Write a review</h3>' +
      '<p class="rv-hello" id="rvHello" hidden></p>' +
      '<form id="rvFormEl" novalidate>' +
        '<div class="rv-rate"><div class="rv-pick" id="rvPick" role="radiogroup" aria-label="Your overall rating"></div><span id="rvPickLabel">Tap to rate</span></div>' +
        '<div class="rv-subpick"><span class="rv-lab">Rate the details <small>(optional)</small></span>' + SUBS.map(function (s) {
          return '<div class="rv-subrow"><span>' + s[1] + '</span><div class="rv-mini" data-sub="' + s[0] + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-v="' + n + '" aria-label="' + s[1] + ' ' + n + ' of 5">★</button>'; }).join('') + '</div></div>';
        }).join('') + '</div>' +
        '<div class="rv-grid">' +
          '<label>Your name *<input name="name" maxlength="60" autocomplete="name" placeholder="As you want it shown"></label>' +
          '<label>Where are you from<input name="place" maxlength="60" placeholder="Bengaluru"></label>' +
          '<label>Trip<select name="trip" id="rvTrip"></select></label>' +
          '<label>Travel style<select name="style" id="rvStyle"></select></label>' +
          '<label class="rv-full">Headline<input name="title" maxlength="90" placeholder="Sum it up in a line"></label>' +
          '<label class="rv-full">Your review *<textarea name="body" maxlength="1200" rows="5" placeholder="What did you love? The stay, the food, the people, the moments…"></textarea></label>' +
          '<div class="rv-full"><span class="rv-lab">Photos <small>(up to 4)</small></span><div class="rv-thumbs" id="rvThumbs"></div></div>' +
          '<label><span>Booking ID <small>(gets you a Verified badge)</small></span><input name="ref" maxlength="20" placeholder="From your booking message" autocapitalize="characters"></label>' +
          '<label><span>WhatsApp number <small>(not shown)</small></span><input name="phone" type="tel" inputmode="numeric" maxlength="14" placeholder="The one you booked with"></label>' +
          '<label class="ng-check rv-full"><input type="checkbox" name="consent"><span>Nandi Go may show my name, review and photos on its website.</span></label>' +
        '</div>' +
        '<p class="pm-error" id="rvErr" role="alert" hidden></p>' +
        '<button type="submit" class="btn btn-forest rv-submit" id="rvSubmit">' + I('send') + '<span>Post my review</span></button>' +
        '<p class="rv-note">Reviews appear after a quick check by our team, usually within a day.</p>' +
      '</form></div>' +
      '<div class="pm-body pm-done" id="rvDone" hidden><div class="pm-mark">' + I('heart') + '</div><h3>Thank you!</h3><p id="rvDoneText">Your review is with our team and will appear here soon. We are so glad you travelled with Nandi Go.</p><button type="button" class="green-btn" data-rv-close>Done</button></div>' +
      '</div></div>' +
      '<div class="rv-lb" id="rvLightbox" hidden><button type="button" class="rv-lb-nav prev" aria-label="Previous photo">‹</button><img id="rvLbImg" alt="Traveller photo"><button type="button" class="rv-lb-nav next" aria-label="Next photo">›</button></div>';
  }

  var rating = 0, subs = {}, files = [];
  function fillTrips() {
    if (!$('rvTrip')) return;
    var cur = $('rvTrip').value;
    $('rvTrip').innerHTML = '<option value="">Choose the trip</option>' + NG.TRIPS.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('') + '<option value="other">Another trip</option>';
    $('rvStyle').innerHTML = '<option value="">How did you travel?</option>' + NG.STYLES.filter(function (s) { return !s.hidden; }).map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('');
    if (cur) $('rvTrip').value = cur;
  }
  function setRating(n) {
    rating = n;
    $('rvPick').querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i < n); b.setAttribute('aria-checked', i + 1 === n); });
    $('rvPickLabel').textContent = ['Tap to rate', 'Poor', 'Okay', 'Good', 'Very good', 'Excellent'][n];
  }
  function setSub(key, n) { subs[key] = n; document.querySelectorAll('[data-sub="' + key + '"] button').forEach(function (b, i) { b.classList.toggle('on', i < n); }); }
  function renderFiles() {
    $('rvThumbs').innerHTML = files.map(function (f, i) { return '<span class="rv-thumb" style="background-image:url(\'' + f.url + '\')"><button type="button" data-rm="' + i + '" aria-label="Remove photo">×</button></span>'; }).join('') +
      (files.length < 4 ? '<label class="rv-add">' + I('camera') + '<span>Add photo</span><input type="file" id="rvFiles" accept="image/jpeg,image/png,image/webp" multiple hidden></label>' : '');
  }
  function showErr(m) { $('rvErr').textContent = m; $('rvErr').hidden = false; }

  function openForm(prefill) {
    var form = $('rvFormEl'), pm = $('rvForm');
    form.reset(); files = []; subs = {}; renderFiles(); setRating(0); SUBS.forEach(function (s) { setSub(s[0], 0); });
    fillTrips();
    $('rvErr').hidden = true; $('rvFormBox').hidden = false; $('rvDone').hidden = true;
    var p = prefill || {};
    if (TRIP) form.elements.trip.value = TRIP;
    if (p.trip_id) form.elements.trip.value = p.trip_id;
    if (p.style_id) form.elements.style.value = p.style_id;
    if (p.ref) form.elements.ref.value = p.ref;
    $('rvHello').hidden = !p.trip_title;
    if (p.trip_title) $('rvHello').textContent = 'How was ' + p.trip_title + '? Enter the WhatsApp number you booked with to get the Verified traveller badge.';
    pm.hidden = false; requestAnimationFrame(function () { pm.classList.add('open'); });
    document.documentElement.classList.add('sp-lock');
  }
  function closeForm() { var pm = $('rvForm'); pm.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { pm.hidden = true; }, 200); }

  function wireForm() {
    $('rvPick').innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="false" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '" data-rate="' + n + '">★</button>'; }).join('');
    $('rvPick').addEventListener('click', function (e) { var b = e.target.closest('[data-rate]'); if (b) setRating(+b.dataset.rate); });
    $('rvPick').addEventListener('mouseover', function (e) { var b = e.target.closest('[data-rate]'); if (!b) return; var n = +b.dataset.rate; $('rvPick').querySelectorAll('button').forEach(function (x, i) { x.classList.toggle('hover', i < n); }); });
    $('rvPick').addEventListener('mouseleave', function () { $('rvPick').querySelectorAll('button').forEach(function (x) { x.classList.remove('hover'); }); });
    document.querySelector('.rv-subpick').addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; var k = b.parentNode.dataset.sub; setSub(k, subs[k] === +b.dataset.v ? 0 : +b.dataset.v); });
    $('rvThumbs').addEventListener('change', function (e) {
      if (e.target.id !== 'rvFiles') return;
      [].slice.call(e.target.files).forEach(function (f) {
        if (files.length >= 4) return;
        if (f.size > 5 * 1024 * 1024) { showErr('Each photo must be 5 MB or smaller.'); return; }
        files.push({ file: f, url: URL.createObjectURL(f) });
      });
      renderFiles();
    });
    $('rvThumbs').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { URL.revokeObjectURL(files[+b.dataset.rm].url); files.splice(+b.dataset.rm, 1); renderFiles(); } });
    $('rvForm').addEventListener('click', function (e) { if (e.target === $('rvForm') || e.target.closest('[data-rv-close]')) closeForm(); });
    $('rvLightbox').addEventListener('click', function (e) {
      if (e.target.closest('.prev')) return stepLb(-1);
      if (e.target.closest('.next')) return stepLb(1);
      if (e.target.id !== 'rvLbImg') closeLb();
    });
    document.addEventListener('keydown', function (e) {
      if (!$('rvLightbox').hidden) { if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') stepLb(-1); if (e.key === 'ArrowRight') stepLb(1); return; }
      if (e.key === 'Escape' && !$('rvForm').hidden) closeForm();
    });
    $('rvFormEl').addEventListener('submit', submit);
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-write-review]')) { e.preventDefault(); openForm(invite); } });

  function submit(e) {
    e.preventDefault(); $('rvErr').hidden = true;
    var f = this.elements, name = f.name.value.trim(), body = f.body.value.trim(), ref = f.ref.value.trim().toUpperCase();
    var phone = f.phone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!rating) return showErr('Please tap the stars to rate your trip.');
    if (!name) return showErr('Please enter your name.');
    if (body.length < 10) return showErr('Please write a few more words about your trip.');
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return showErr('Please check the WhatsApp number, or leave it empty.');
    if (ref && !phone) return showErr('Please add the WhatsApp number you booked with, so we can match your Booking ID.');
    if (!f.consent.checked) return showErr('Please tick the box to let us show your review.');
    var t = NG.trip(f.trip.value), btn = $('rvSubmit'); btn.disabled = true; btn.lastChild.textContent = files.length ? 'Uploading photos…' : 'Sending…';
    var stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    Promise.all(files.map(function (x, i) {
      var ext = (x.file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'), path = 'reviews/' + stamp + '-' + i + '.' + ext;
      return fetch(NG.DB.url + '/storage/v1/object/review-photos/' + path, { method: 'POST', headers: { apikey: NG.DB.key, 'Content-Type': x.file.type }, body: x.file })
        .then(function (r) { if (!r.ok) throw new Error('upload'); return path; });
    })).then(function (paths) {
      var row = { name: name.slice(0, 60), place: f.place.value.trim() || null, trip_id: t ? t.id : null, trip_title: t ? t.title : (f.trip.value === 'other' ? 'Another trip' : null),
        style_id: f.style.value || null, rating: rating, title: f.title.value.trim() || null, body: body.slice(0, 1200), photos: paths, phone: phone || null, booking_ref: ref || null };
      SUBS.forEach(function (s) { if (subs[s[0]]) row[s[0]] = subs[s[0]]; });
      return NG.DB.insert('reviews', row);
    }).then(function () {
      btn.disabled = false; btn.lastChild.textContent = 'Post my review';
      $('rvDoneText').textContent = 'Your review is with our team and will appear here soon' + (ref ? ' (we match your Booking ID for the Verified badge)' : '') + '. We are so glad you travelled with Nandi Go.';
      $('rvFormBox').hidden = true; $('rvDone').hidden = false;
    }, function () {
      btn.disabled = false; btn.lastChild.textContent = 'Post my review';
      showErr('Sorry, your review could not be sent. Please try again.');
    });
  }


  /* ---------- Nandi Secret Box: private feedback only the team reads ---------- */
  var SB_KINDS = [
    ['experience', 'chat', 'Share your experience', 'How was your tour with us?', 'Tell us how the trip went — the good and the not so good.'],
    ['suggestion', 'bulb', 'Give your suggestion', 'How can we make it better?', 'One idea that would make the next trip better for you.'],
    ['secret', 'shield', 'Tell us secretly', 'Anything you want to tell only us.', 'Anything at all — a concern about a person, a stay or safety. Only the Nandi Go team reads this.']
  ];
  function secretBand() {
    var btn = ['Share privately', 'Send an idea', 'Tell us secretly'];
    return '<div class="sb4' + (MODE === 'trip' ? ' compact' : '') + '">' +
      '<div class="sb4-env" aria-hidden="true"><div class="sb4-paper"><span>To: Nandi Go team</span><span>Private &amp; confidential</span><i></i><i></i><i></i></div><div class="sb4-front"></div><div class="sb4-flap"></div><div class="sb4-seal">' + I('lock') + '</div></div>' +
      '<div class="sb4-body">' +
        '<span class="sb4-k">' + I('lock') + 'Only our team reads this</span>' +
        '<h3>Nandi Secret Box</h3>' +
        '<p>Not everything belongs in a public review. Drop a private note straight into our box. Your name is optional and nothing here is ever posted.</p>' +
        '<div class="sb4-cards">' + SB_KINDS.map(function (k, i) {
          return '<button type="button" class="sb4-card" data-secret="' + k[0] + '">' +
            '<span class="sb4-ic">' + I(k[1]) + '<em>' + (i + 1) + '</em></span>' +
            '<b>' + k[2] + '</b><small>' + k[3] + '</small>' +
            '<span class="sb4-go">' + btn[i] + I('next') + '</span></button>';
        }).join('') + '</div>' +
        '<ul class="sb4-trust"><li>' + I('shield') + '100% confidential</li><li>' + I('users') + 'Name optional</li><li>' + I('heart') + 'Read by the founders</li></ul>' +
      '</div>' +
    '</div>';
  }
  function secretHtml() {
    return '<div class="pm sbx-pm" id="sbForm" hidden><div class="pm-card" role="dialog" aria-modal="true" aria-labelledby="sbTitle">' +
      '<button type="button" class="pm-close" data-sb-close aria-label="Close">' + I('close') + '</button>' +
      '<div class="pm-body" id="sbBox"><span class="kicker sbx-k">' + I('lock') + 'Nandi Secret Box</span><h3 id="sbTitle">Share secretly</h3>' +
        '<div class="sbx-tabs" role="tablist">' + SB_KINDS.map(function (k, i) { return '<button type="button" role="tab" data-sbk="' + k[0] + '"><em>' + (i + 1) + '</em>' + ['Experience', 'Suggestion', 'Secret'][i] + '</button>'; }).join('') + '</div>' +
        '<p class="sbx-hint" id="sbHint"></p>' +
        '<form id="sbFormEl" novalidate>' +
          '<div class="rv-rate" id="sbRateRow"><div class="rv-pick" id="sbPick" role="radiogroup" aria-label="Rate your tour">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-rate="' + n + '" aria-label="' + n + ' of 5">★</button>'; }).join('') + '</div><span id="sbPickLabel">Rate your tour (optional)</span></div>' +
          '<div class="rv-grid">' +
            '<label class="rv-full"><span>Which trip? <small>(optional)</small></span><select name="trip" id="sbTrip"></select></label>' +
            '<label class="rv-full"><span id="sbMsgLab">Your message *</span><textarea name="message" maxlength="3000" rows="6"></textarea></label>' +
            '<label><span>Name <small>(optional)</small></span><input name="name" maxlength="80" autocomplete="name" placeholder="Leave empty to stay anonymous"></label>' +
            '<label><span>WhatsApp <small>(optional, if you want a reply)</small></span><input name="phone" type="tel" inputmode="numeric" maxlength="14"></label>' +
          '</div>' +
          '<p class="sbx-safe">' + I('shield') + 'Private and confidential. Only the Nandi Go team reads this. It is never posted on the website, and your name is never shared.</p>' +
          '<p class="pm-error" id="sbErr" role="alert" hidden></p>' +
          '<button type="submit" class="btn btn-gold rv-submit" id="sbSubmit">' + I('lock') + '<span>Send secretly</span></button>' +
        '</form></div>' +
      '<div class="pm-body pm-done" id="sbDone" hidden><div class="pm-mark">' + I('lock') + '</div><h3>Received, privately</h3><p>Thank you for trusting us. Only the Nandi Go team will read this' + '.</p><p class="sbx-also" id="sbAlso" hidden>Loved the trip? You can also <a href="#" data-sb-public>write a public review</a> so other travellers can see it.</p><button type="button" class="green-btn" data-sb-close>Done</button></div>' +
      '</div></div>';
  }
  var sbKind = 'experience', sbRating = 0;
  function sbSetKind(k) {
    sbKind = k; var d = SB_KINDS.filter(function (x) { return x[0] === k; })[0];
    document.querySelectorAll('[data-sbk]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.sbk === k); });
    $('sbHint').textContent = d[4]; $('sbRateRow').hidden = k !== 'experience';
    $('sbFormEl').elements.message.placeholder = d[3];
  }
  function sbSetRating(n) { sbRating = n; $('sbPick').querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i < n); }); $('sbPickLabel').textContent = n ? ['', 'Poor', 'Okay', 'Good', 'Very good', 'Excellent'][n] : 'Rate your tour (optional)'; }
  function sbOpen(kind) {
    var f = $('sbFormEl'); f.reset(); sbSetRating(0);
    $('sbTrip').innerHTML = '<option value="">Choose the trip</option>' + NG.TRIPS.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('');
    if (TRIP) $('sbTrip').value = TRIP;
    sbSetKind(kind || 'experience');
    $('sbErr').hidden = true; $('sbBox').hidden = false; $('sbDone').hidden = true;
    var pm = $('sbForm'); pm.hidden = false; requestAnimationFrame(function () { pm.classList.add('open'); });
    document.documentElement.classList.add('sp-lock');
  }
  function sbClose() { var pm = $('sbForm'); pm.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { pm.hidden = true; }, 200); }
  function wireSecret() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-secret]'); if (b) { e.preventDefault(); sbOpen(b.dataset.secret); }
    });
    $('sbForm').addEventListener('click', function (e) {
      var b;
      if (e.target === $('sbForm') || e.target.closest('[data-sb-close]')) return sbClose();
      if ((b = e.target.closest('[data-sbk]'))) return sbSetKind(b.dataset.sbk);
      if ((b = e.target.closest('#sbPick [data-rate]'))) return sbSetRating(+b.dataset.rate === sbRating ? 0 : +b.dataset.rate);
      if (e.target.closest('[data-sb-public]')) { e.preventDefault(); sbClose(); setTimeout(function () { openForm(invite); }, 220); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sbForm').hidden) sbClose(); });
    $('sbFormEl').addEventListener('submit', function (e) {
      e.preventDefault(); $('sbErr').hidden = true;
      var f = this.elements, msg = f.message.value.trim(), phone = f.phone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
      var err = function (m) { $('sbErr').textContent = m; $('sbErr').hidden = false; };
      if (msg.length < 3) return err('Please write your message.');
      if (phone && !/^[6-9]\d{9}$/.test(phone)) return err('Please check the WhatsApp number, or leave it empty.');
      var t = NG.trip(f.trip.value), btn = $('sbSubmit'); btn.disabled = true; btn.lastChild.textContent = 'Sending…';
      NG.DB.insert('feedback', { kind: sbKind, rating: sbKind === 'experience' && sbRating ? sbRating : null, message: msg.slice(0, 3000),
        name: f.name.value.trim() || null, phone: phone || null, trip_id: t ? t.id : null, trip_title: t ? t.title : null })
        .then(function () {
          btn.disabled = false; btn.lastChild.textContent = 'Send secretly';
          $('sbAlso').hidden = !(sbKind === 'experience' && sbRating >= 4);
          $('sbBox').hidden = true; $('sbDone').hidden = false;
        }, function () { btn.disabled = false; btn.lastChild.textContent = 'Send secretly'; err('Sorry, it could not be sent. Please try again.'); });
    });
  }

  /* ---------- start ---------- */
  shell(); wireForm(); wireSecret(); load();
  // Secret Box link (?secret): open once the live trip list has loaded, so the trip menu is current
  if (/[?&]secret\b/.test(location.search)) {
    var sbOnce = function () { if (sbOnce.done) return; sbOnce.done = 1; sbOpen(); };
    if (NG.DB.live) sbOnce(); else { document.addEventListener('ng:catalog', sbOnce); setTimeout(sbOnce, 2500); }
  }
  document.addEventListener('ng:catalog', function () {
    var sel = $('sbTrip'); if (!sel || $('sbForm').hidden) return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">Choose the trip</option>' + NG.TRIPS.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('');
    sel.value = cur;
  });
  // Review link from WhatsApp: nandigo.co/?review=NG-XXXX opens the form, prefilled for that booking
  var inviteRef = new URLSearchParams(location.search).get('review');
  if (inviteRef) {
    NG.DB.rpc('review_invite', { p_ref: inviteRef }).then(function (d) {
      invite = d || { ref: inviteRef.toUpperCase() };
      mount.scrollIntoView({ block: 'start' }); openForm(invite);
    }).catch(function () { invite = { ref: inviteRef.toUpperCase() }; openForm(invite); });
  }
})();
