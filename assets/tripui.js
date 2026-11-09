/* Nandi Go — trip card + helpers shared by the home page pop-up and the package page. Load after icons.js and data.js. */
(function () {
  var NG = window.NG, I = window.NGIcon;
  if (!NG || !I) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* Facilities shown as icons (admin ticks them per trip) */
  var AMENITIES = {
    stay: ['bed', 'Stay'], transport: ['bus', 'Transport'], meals: ['meal', 'Meals'], sightseeing: ['binoculars', 'Sightseeing'],
    guide: ['guide', 'Guide'], trek: ['hiker', 'Trek'], campfire: ['flame', 'Campfire'], jeep: ['jeep', 'Jeep ride'],
    boat: ['boat', 'Houseboat'], beach: ['beach', 'Beach'], snow: ['snow', 'Snow'], snorkel: ['snorkel', 'Snorkelling'],
    flight: ['plane', 'Flight'], temple: ['temple', 'Temples'], camera: ['camera', 'Photo stops']
  };
  function amenity(key) { var a = AMENITIES[key]; return a ? { key: key, icon: a[0], label: a[1] } : null; }
  function amenities(t) { return (t.amenities || []).map(amenity).filter(Boolean); }

  function durationLabel(t) {
    if (t.days === 1 && !t.nights) return 'Day trip';
    if (t.days && t.nights != null) return t.days + ' Day' + (t.days > 1 ? 's' : '') + ' / ' + t.nights + ' Night' + (t.nights === 1 ? '' : 's');
    if (t.nights) return t.nights + ' Night' + (t.nights === 1 ? '' : 's');
    return t.duration || '';
  }
  function photos(t) {
    var out = [];
    (t.photos || []).concat([t.image, (NG.POSTCARDS[t.dest] || {}).photo]).forEach(function (p) { if (p && out.indexOf(p) < 0) out.push(p); });
    return out;
  }
  function place(t) { return t.place || (NG.dest(t.dest) || {}).name || ''; }
  function nextBatches(tripId, styleId) { return NG.batchesFor(tripId, styleId).filter(function (b) { return b.status !== 'full'; }); }
  function dShort(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  function tripUrl(t, styleId) { return 'trip.html?id=' + encodeURIComponent(t.id) + (styleId ? '&style=' + encodeURIComponent(styleId) : ''); }
  function waLink(t) { return 'https://wa.me/' + NG.WHATSAPP + '?text=' + encodeURIComponent('Hi Nandi Go! I would like to know more about ' + t.title + '.'); }

  function card(t, styleId) {
    var pr = NG.priceFor(t, styleId), ph = photos(t)[0], am = amenities(t).slice(0, 5), dates = nextBatches(t.id, styleId);
    var was = t.was && pr.price === t.price ? t.was : null;
    return '<article class="tc" tabindex="0" role="link" aria-label="' + esc(t.title) + '" data-trip-open="' + esc(t.id) + '" data-style="' + esc(styleId || '') + '">' +
      '<div class="tc-ph" style="background-image:url(\'' + esc(ph) + '\')">' +
        (t.badge ? '<span class="tc-ribbon">' + esc(t.badge) + '</span>' : '') +
        '<div class="tc-tags"><span class="tc-ex">Ex-Bengaluru</span>' + (durationLabel(t) ? '<span class="tc-dur">' + esc(durationLabel(t)) + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="tc-body">' +
        (am.length ? '<div class="tc-icons">' + am.map(function (a) { return '<span title="' + a.label + '">' + I(a.icon) + '<small>' + a.label + '</small></span>'; }).join('') + '</div>' : '') +
        '<h3>' + esc(t.title) + '</h3>' +
        '<p class="tc-place">' + I('pin') + esc(place(t)) + '</p>' +
        '<div class="tc-price"><b>' + NG.fmt(pr.price) + '</b>' + (was ? '<del>' + NG.fmt(was) + '</del><span class="tc-save">Save ' + NG.fmt(was - pr.price) + '</span>' : '') + '<small>per ' + pr.unit + '</small></div>' +
        '<div class="tc-dates">' + (dates.length ? dates.slice(0, 3).map(function (b) { return '<span>' + dShort(b.start) + '</span>'; }).join('') + (dates.length > 3 ? '<em>+' + (dates.length - 3) + ' more</em>' : '') : '<em class="tc-req">Dates on request</em>') + '</div>' +
        '<div class="tc-acts"><a class="tc-ic" href="' + waLink(t) + '" target="_blank" rel="noopener" aria-label="Ask on WhatsApp">' + I('chat') + '</a>' +
          '<button type="button" class="tc-ic" data-trip-share="' + esc(t.id) + '" aria-label="Share">' + I('send') + '</button>' +
          '<button type="button" class="btn btn-gold tc-book" data-book="' + esc(t.id) + '" data-style="' + esc(styleId || '') + '">' + I('ticket') + 'Book now</button></div>' +
      '</div></article>';
  }

  function share(t, styleId) {
    var url = new URL(tripUrl(t, styleId), location.href).href.replace('/trip.html?', '/trip?');
    if (navigator.share) { navigator.share({ title: t.title, text: t.title + ' — Nandi Go', url: url }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast('Link copied'); }, function () { prompt('Copy this link', url); });
  }
  function toast(msg) {
    var t = document.getElementById('tcToast');
    if (!t) { t = document.createElement('div'); t.id = 'tcToast'; t.className = 'tc-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  // Card clicks: the card opens the package page; its buttons do their own thing
  document.addEventListener('click', function (e) {
    var sh = e.target.closest('[data-trip-share]');
    if (sh) { e.preventDefault(); e.stopPropagation(); var tt = NG.trip(sh.dataset.tripShare), c = sh.closest('[data-trip-open]'); if (tt) share(tt, c && c.dataset.style); return; }
    if (e.target.closest('a,button,[data-book]')) return;
    var cardEl = e.target.closest('[data-trip-open]'); if (!cardEl) return;
    var t = NG.trip(cardEl.dataset.tripOpen); if (t) location.href = tripUrl(t, cardEl.dataset.style);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var cardEl = e.target.closest && e.target.closest('[data-trip-open]'); if (cardEl && e.target === cardEl) cardEl.click();
  });

  window.NGTrip = { card: card, amenities: amenities, amenity: amenity, durationLabel: durationLabel, photos: photos, place: place, nextBatches: nextBatches, dShort: dShort, tripUrl: tripUrl, waLink: waLink, share: share, esc: esc, AMENITIES: AMENITIES };
})();
