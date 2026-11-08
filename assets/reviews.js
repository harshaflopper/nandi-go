/* Nandi Go — traveller reviews on the home page.
 * Shows approved reviews (with photos) and lets visitors write one. New reviews wait for approval in admin. */
(function () {
  var NG = window.NG, I = window.NGIcon, box = document.getElementById('rvList');
  if (!NG || !I || !box || !NG.DB) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var PHOTO = NG.DB.url + '/storage/v1/object/public/review-photos/';
  var all = [], filter = 'all', shown = 6;

  function stars(n, cls) { var s = ''; for (var i = 1; i <= 5; i++) s += '<i class="' + (i <= n ? 'on' : '') + '">★</i>'; return '<span class="rv-stars ' + (cls || '') + '" aria-label="' + n + ' out of 5">' + s + '</span>'; }
  function initials(n) { return String(n).trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }
  function when(d) { return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }); }

  function load() {
    NG.DB.get('public_reviews?select=*&order=featured.desc,created_at.desc&limit=60').then(function (rows) { all = rows; render(); })
      .catch(function () { box.innerHTML = '<p class="rv-empty">Reviews could not be loaded right now.</p>'; });
  }
  function render() {
    // the score counts real reviews only, never the samples
    var real = all.filter(function (r) { return !r.is_sample; });
    var avg = real.length ? real.reduce(function (s, r) { return s + r.rating; }, 0) / real.length : 0;
    $('rvAvg').textContent = real.length ? avg.toFixed(1) : 'New';
    $('rvAvg').classList.toggle('rv-new', !real.length);
    $('rvAvgStars').innerHTML = real.length ? stars(Math.round(avg), 'lg') : '';
    $('rvCount').textContent = real.length ? real.length + ' traveller review' + (real.length === 1 ? '' : 's') : 'Be the first to review';
    var styles = NG.STYLES.filter(function (s) { return !s.hidden; });
    $('rvChips').innerHTML = '<button type="button" class="chip' + (filter === 'all' ? ' active' : '') + '" data-rvf="all">All</button>' +
      styles.map(function (s) { return '<button type="button" class="chip' + (filter === s.id ? ' active' : '') + '" data-rvf="' + s.id + '">' + esc(s.name) + '</button>'; }).join('');
    var list = all.filter(function (r) { return filter === 'all' || r.style_id === filter; });
    box.innerHTML = list.length ? list.slice(0, shown).map(card).join('') : '<p class="rv-empty">No reviews for this style yet. Travelled with us? Be the first to write one.</p>';
    $('rvMore').hidden = list.length <= shown;
  }
  function card(r) {
    var st = r.style_id && NG.style(r.style_id), ph = (r.photos || []);
    return '<article class="rv-card' + (r.featured ? ' featured' : '') + '">' +
      (ph.length ? '<div class="rv-photos n' + ph.length + '">' + ph.map(function (p, i) { return '<button type="button" class="rv-ph" data-photo="' + esc(PHOTO + p) + '" aria-label="Open photo ' + (i + 1) + '" style="background-image:url(\'' + esc(PHOTO + p) + '\')"></button>'; }).join('') + '</div>' : '') +
      '<div class="rv-body">' + stars(r.rating) + (r.is_sample ? '<span class="rv-sample">Sample</span>' : '') +
      (r.title ? '<h3>' + esc(r.title) + '</h3>' : '') + '<p class="rv-text">' + esc(r.body) + '</p>' +
      '<div class="rv-who"><span class="rv-av">' + esc(initials(r.name)) + '</span><div><b>' + esc(r.name) + '</b><small>' + esc([r.place, when(r.created_at)].filter(Boolean).join(' · ')) + '</small></div></div>' +
      (r.trip_title || st ? '<div class="rv-tags">' + (r.trip_title ? '<span>' + I('pin') + esc(r.trip_title) + '</span>' : '') + (st ? '<span>' + I('users') + esc(st.name) + '</span>' : '') + '</div>' : '') +
      '</div></article>';
  }
  $('rvChips').addEventListener('click', function (e) { var b = e.target.closest('[data-rvf]'); if (b) { filter = b.dataset.rvf; shown = 6; render(); } });
  $('rvMore').addEventListener('click', function () { shown += 6; render(); });
  document.addEventListener('ng:catalog', function () { if (all.length) render(); fillTrips(); });

  /* Photo viewer */
  var lb = $('rvLightbox');
  box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-photo]'); if (!b) return;
    $('rvLbImg').src = b.dataset.photo; lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('open'); });
  });
  lb.addEventListener('click', function () { lb.classList.remove('open'); setTimeout(function () { lb.hidden = true; $('rvLbImg').src = ''; }, 200); });

  /* Write a review */
  var pm = $('rvForm'), form = $('rvFormEl'), rating = 0, files = [];
  function fillTrips() {
    $('rvTrip').innerHTML = '<option value="">Choose the trip</option>' + NG.TRIPS.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('') + '<option value="other">Another trip</option>';
    $('rvStyle').innerHTML = '<option value="">How did you travel?</option>' + NG.STYLES.map(function (s) { return '<option value="' + s.id + '">' + esc(s.name) + '</option>'; }).join('');
  }
  fillTrips();
  function setRating(n) {
    rating = n;
    $('rvPick').querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('on', i < n); b.setAttribute('aria-checked', i + 1 === n); });
    $('rvPickLabel').textContent = ['Tap to rate', 'Poor', 'Okay', 'Good', 'Very good', 'Excellent'][n];
  }
  $('rvPick').innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="false" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '" data-rate="' + n + '">★</button>'; }).join('');
  $('rvPick').addEventListener('click', function (e) { var b = e.target.closest('[data-rate]'); if (b) setRating(+b.dataset.rate); });
  $('rvPick').addEventListener('mouseover', function (e) { var b = e.target.closest('[data-rate]'); if (!b) return; var n = +b.dataset.rate; $('rvPick').querySelectorAll('button').forEach(function (x, i) { x.classList.toggle('hover', i < n); }); });
  $('rvPick').addEventListener('mouseleave', function () { $('rvPick').querySelectorAll('button').forEach(function (x) { x.classList.remove('hover'); }); });

  function renderFiles() {
    $('rvThumbs').innerHTML = files.map(function (f, i) { return '<span class="rv-thumb" style="background-image:url(\'' + f.url + '\')"><button type="button" data-rm="' + i + '" aria-label="Remove photo">×</button></span>'; }).join('') +
      (files.length < 3 ? '<label class="rv-add">' + I('camera') + '<span>Add photo</span><input type="file" id="rvFiles" accept="image/jpeg,image/png,image/webp" multiple hidden></label>' : '');
  }
  $('rvThumbs').addEventListener('change', function (e) {
    if (e.target.id !== 'rvFiles') return;
    [].slice.call(e.target.files).forEach(function (f) {
      if (files.length >= 3) return;
      if (f.size > 5 * 1024 * 1024) { showErr('Each photo must be 5 MB or smaller.'); return; }
      files.push({ file: f, url: URL.createObjectURL(f) });
    });
    renderFiles();
  });
  $('rvThumbs').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { URL.revokeObjectURL(files[+b.dataset.rm].url); files.splice(+b.dataset.rm, 1); renderFiles(); } });

  function open() {
    form.reset(); files = []; renderFiles(); setRating(0);
    $('rvErr').hidden = true; $('rvFormBox').hidden = false; $('rvDone').hidden = true;
    pm.hidden = false; requestAnimationFrame(function () { pm.classList.add('open'); });
    document.documentElement.classList.add('sp-lock');
  }
  function close() { pm.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { pm.hidden = true; }, 200); }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-write-review]')) { e.preventDefault(); open(); } });
  pm.addEventListener('click', function (e) { if (e.target === pm || e.target.closest('[data-rv-close]')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !pm.hidden) close(); if (e.key === 'Escape' && !lb.hidden) lb.click(); });
  function showErr(m) { $('rvErr').textContent = m; $('rvErr').hidden = false; }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); $('rvErr').hidden = true;
    var f = form.elements, name = f.name.value.trim(), body = f.body.value.trim(), phone = f.phone.value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!rating) return showErr('Please tap the stars to rate your trip.');
    if (!name) return showErr('Please enter your name.');
    if (body.length < 10) return showErr('Please write a few more words about your trip.');
    if (phone && !/^[6-9]\d{9}$/.test(phone)) return showErr('Please check the WhatsApp number, or leave it empty.');
    if (!f.consent.checked) return showErr('Please tick the box to let us show your review.');
    var t = NG.trip(f.trip.value), btn = $('rvSubmit'); btn.disabled = true; btn.lastChild.textContent = files.length ? 'Uploading photos…' : 'Sending…';
    var stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    Promise.all(files.map(function (x, i) {
      var ext = (x.file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'), path = 'reviews/' + stamp + '-' + i + '.' + ext;
      return fetch(NG.DB.url + '/storage/v1/object/review-photos/' + path, { method: 'POST', headers: { apikey: NG.DB.key, 'Content-Type': x.file.type }, body: x.file })
        .then(function (r) { if (!r.ok) throw new Error('upload'); return path; });
    })).then(function (paths) {
      return NG.DB.insert('reviews', { name: name.slice(0, 60), place: f.place.value.trim() || null, trip_id: t ? t.id : null, trip_title: t ? t.title : (f.trip.value === 'other' ? 'Another trip' : null),
        style_id: f.style.value || null, rating: rating, title: f.title.value.trim() || null, body: body.slice(0, 1200), photos: paths, phone: phone || null });
    }).then(function () {
      btn.disabled = false; btn.lastChild.textContent = 'Post my review';
      $('rvFormBox').hidden = true; $('rvDone').hidden = false;
    }, function () {
      btn.disabled = false; btn.lastChild.textContent = 'Post my review';
      showErr('Sorry, your review could not be sent. Please try again.');
    });
  });

  load();
})();
