/* Nandi Go — package page (trip.html?id=goa&style=girls). Needs icons, data, db, tripui, booking. */
(function () {
  var NG = window.NG, I = window.NGIcon, T = window.NGTrip;
  if (!NG || !T) return;
  var $ = function (id) { return document.getElementById(id); }, esc = T.esc;
  var q = new URLSearchParams(location.search), id = q.get('id'), style = q.get('style');
  var trip = null, pics = [], lbIndex = 0, incTab = 'in';

  function visibleStyles() { return NG.STYLES.filter(function (s) { return !s.hidden; }); }
  function show(elId, on) { $(elId).hidden = !on; }

  function render() {
    trip = NG.trip(id);
    if (!trip) {
      if (!NG.DB.live) return; // wait for the catalogue
      $('pkTitle').textContent = 'This trip is not available';
      $('pkPlace').innerHTML = '<a href="index.html#trips">See all trips</a>';
      return;
    }
    if (!style || !visibleStyles().some(function (s) { return s.id === style; })) style = (visibleStyles()[0] || {}).id;
    document.title = trip.title + ' — Nandi Go';

    // Gallery: one big photo and up to four small ones
    pics = T.photos(trip);
    var g = $('pkGallery');
    g.className = 'pk-gallery n' + Math.min(pics.length, 5);
    g.innerHTML = pics.slice(0, 5).map(function (p, i) {
      return '<button type="button" class="pk-ph' + (i === 0 ? ' big' : '') + '" data-pic="' + i + '" style="background-image:url(\'' + esc(p) + '\')" aria-label="Open photo ' + (i + 1) + '"></button>';
    }).join('') + (pics.length > 1 ? '<button type="button" class="pk-all" data-pic="0">' + I('camera') + 'View all ' + pics.length + ' photos</button>' : '');

    $('pkPlace').innerHTML = I('pin') + esc(T.place(trip));
    $('pkTitle').textContent = trip.title;
    var chips = [];
    if (T.durationLabel(trip)) chips.push(['clock', T.durationLabel(trip)]);
    chips.push(['bus', 'Ex-Bengaluru']);
    if (trip.min_age != null) chips.push(['users', 'Min age ' + trip.min_age + '+']);
    chips.push(['shield', 'No hidden charges']);
    if (trip.badge) chips.push(['sparkle', trip.badge]);
    $('pkChips').innerHTML = chips.map(function (c) { return '<span>' + I(c[0]) + esc(c[1]) + '</span>'; }).join('');

    // Rotating facilities strip (the list is doubled so it loops seamlessly)
    var am = T.amenities(trip);
    show('pkAmenWrap', am.length);
    var one = am.map(function (a) { return '<span class="pk-am">' + I(a.icon) + '<small>' + a.label + '</small></span>'; }).join('');
    $('pkAmen').innerHTML = one + one + one;
    $('pkAmen').style.setProperty('--dur', Math.max(14, am.length * 3) + 's');

    var high = (trip.highlights && trip.highlights.length ? trip.highlights : trip.stops) || [];
    show('pkHighWrap', high.length);
    $('pkHigh').innerHTML = high.map(function (h) { return '<li>' + I('pin') + '<span>' + esc(h) + '</span></li>'; }).join('');
    show('pkAboutWrap', !!trip.description); $('pkAbout').textContent = trip.description || '';

    renderInc();
    var plan = trip.itinerary || [];
    show('pkPlanWrap', plan.length);
    $('pkPlan').innerHTML = plan.map(function (d, i) {
      return '<details' + (i === 0 ? ' open' : '') + '><summary><b>Day ' + (i + 1) + '</b><span>' + esc(d.title || '') + '</span></summary><p>' + esc(d.text || '') + '</p></details>';
    }).join('');
    var pick = trip.pickups || [];
    show('pkPickWrap', pick.length);
    $('pkPick').innerHTML = pick.map(function (p) { return '<li>' + I('pin') + '<b>' + esc(p.place || '') + '</b>' + (p.time ? '<span>' + esc(p.time) + '</span>' : '') + '</li>'; }).join('');
    var carry = trip.carry || [];
    show('pkCarryWrap', carry.length);
    $('pkCarry').innerHTML = carry.map(function (c) { return '<li>' + I('check') + esc(c) + '</li>'; }).join('');

    renderBox();
  }

  function renderInc() {
    var inc = (trip.inclusions && trip.inclusions.length ? trip.inclusions : trip.perks) || [], exc = trip.exclusions || [];
    show('pkIncWrap', inc.length || exc.length);
    document.querySelectorAll('[data-inc]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.inc === incTab); b.hidden = b.dataset.inc === 'ex' && !exc.length; });
    var list = incTab === 'ex' ? exc : inc;
    $('pkInc').className = 'pk-inc ' + incTab;
    $('pkInc').innerHTML = list.map(function (x) { return '<li>' + I(incTab === 'ex' ? 'close' : 'check') + '<span>' + esc(x) + '</span></li>'; }).join('');
  }

  function renderBox() {
    var pr = NG.priceFor(trip, style), was = trip.was && pr.price === trip.price ? trip.was : null;
    $('pkPrice').textContent = NG.fmt(pr.price); $('pkBarPrice').textContent = NG.fmt(pr.price);
    $('pkWas').textContent = was ? NG.fmt(was) : ''; $('pkSave').textContent = was ? 'Save ' + NG.fmt(was - pr.price) : '';
    $('pkSave').hidden = !was;
    $('pkUnit').textContent = 'per ' + pr.unit + (trip.variants ? ' · from' : ''); $('pkBarUnit').textContent = ' / ' + pr.unit;
    $('pkStyles').innerHTML = '<span class="pk-lab">Travel style</span>' + visibleStyles().map(function (s) {
      return '<button type="button" aria-pressed="' + (s.id === style) + '" data-pkstyle="' + s.id + '">' + esc(s.name) + '</button>';
    }).join('');
    var b = T.nextBatches(trip.id, style);
    $('pkNext').innerHTML = '<span class="pk-lab">Next dates</span>' + (b.length ? '<div>' + b.slice(0, 4).map(function (x) { return '<span>' + T.dShort(x.start) + (x.live ? '<small>' + x.left + ' left</small>' : '') + '</span>'; }).join('') + (b.length > 4 ? '<em>+' + (b.length - 4) + ' more</em>' : '') + '</div>' : '<p>Dates on request — pick your preferred date while booking.</p>');
    $('pkWa').href = T.waLink(trip);
  }

  // Events
  document.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-pkstyle]'))) { style = x.dataset.pkstyle; history.replaceState(null, '', T.tripUrl(trip, style)); renderBox(); return; }
    if ((x = e.target.closest('[data-inc]'))) { incTab = x.dataset.inc; renderInc(); return; }
    if ((x = e.target.closest('[data-pic]'))) { openLb(+x.dataset.pic); return; }
  });
  function book() { if (trip) window.NGBooking.open(trip.id, { style: style }); }
  $('pkBook').addEventListener('click', book); $('pkBarBook').addEventListener('click', book);
  $('pkShare').addEventListener('click', function () { if (trip) T.share(trip, style); });

  // Photo viewer
  var lb = $('pkLb');
  function openLb(i) { lbIndex = i; $('pkLbImg').src = pics[i]; lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('open'); }); document.documentElement.classList.add('sp-lock'); }
  function closeLb() { lb.classList.remove('open'); document.documentElement.classList.remove('sp-lock'); setTimeout(function () { lb.hidden = true; }, 200); }
  function step(n) { lbIndex = (lbIndex + n + pics.length) % pics.length; $('pkLbImg').src = pics[lbIndex]; }
  lb.addEventListener('click', function (e) {
    if (e.target.closest('.prev')) return step(-1);
    if (e.target.closest('.next')) return step(1);
    if (e.target.id !== 'pkLbImg') closeLb();
  });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1);
  });

  document.addEventListener('ng:catalog', render);
  document.addEventListener('ng:batches', function () { if (trip) renderBox(); });
  if (NG.trip(id)) render();
})();
