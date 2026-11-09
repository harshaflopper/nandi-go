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
    $('rvHello').hidden = !p.first_name;
    if (p.first_name) $('rvHello').textContent = 'Hi ' + p.first_name + '! How was ' + (p.trip_title || 'your trip') + '? Enter the WhatsApp number you booked with to get the Verified traveller badge.';
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
    return '<div class="sbx' + (MODE === 'trip' ? ' compact' : '') + '">' +
      '<div class="sbx-head"><span class="sbx-lock">' + I('lock') + '</span><div><h3>Nandi Secret Box</h3><p>Your voice, 100% private.</p></div>' +
        '<span class="sbx-pill">' + I('shield') + 'Only the Nandi Go team reads this · Your name is never shared</span></div>' +
      '<div class="sbx-cards">' + SB_KINDS.map(function (k, i) {
        return '<button type="button" class="sbx-card" data-secret="' + k[0] + '"><span class="sbx-n">' + (i + 1) + '</span><span class="sbx-ic">' + I(k[1]) + '</span><b>' + k[2] + '</b><small>' + k[3] + '</small></button>';
      }).join('') + '</div>' +
      '<div class="sbx-foot"><button type="button" class="btn btn-gold sbx-go" data-secret="experience">' + I('lock') + 'Share secretly</button><small>Your feedback stays secret with us. It is never shown on the website.</small></div>' +
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
  if (/[?&]secret\b/.test(location.search)) sbOpen();
  // Review link from WhatsApp: nandigo.co/?review=NG-XXXX opens the form, prefilled for that booking
  var inviteRef = new URLSearchParams(location.search).get('review');
  if (inviteRef) {
    NG.DB.rpc('review_invite', { p_ref: inviteRef }).then(function (d) {
      invite = d || { ref: inviteRef.toUpperCase() };
      mount.scrollIntoView({ block: 'start' }); openForm(invite);
    }).catch(function () { invite = { ref: inviteRef.toUpperCase() }; openForm(invite); });
  }
})();
