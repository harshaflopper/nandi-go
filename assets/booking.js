/* Nandi Go booking card — shared by every page.
 * Any element with data-book opens it:  data-book="goa"  (trip id, optional)  data-batch="batch2" (optional)
 * Nothing is stored on the website: the request is sent to Nandi Go on WhatsApp. */
(function () {
  var NG = window.NG, I = window.NGIcon;
  if (!NG || !I) return;
  var state = { trip: null, variant: null, batch: null, pax: 2, lastFocus: null, ref: '', summary: '' };

  var groups = [
    ['Coffee Estate Retreat', 'retreat'], ['Tour packages', 'tour'], ['Nandi Hills experiences', 'experience']
  ];
  var tripOptions = groups.map(function (g) {
    return '<optgroup label="' + g[0] + '">' + NG.TRIPS.filter(function (t) { return t.group === g[1]; })
      .map(function (t) { return '<option value="' + t.id + '">' + t.title + '</option>'; }).join('') + '</optgroup>';
  }).join('');

  var html =
    '<div class="bk" id="bk" hidden>' +
    ' <div class="bk-card" role="dialog" aria-modal="true" aria-labelledby="bkTitle">' +
    '  <button type="button" class="bk-close" data-bk-close aria-label="Close booking">' + I('close') + '</button>' +
    '  <aside class="bk-summary">' +
    '   <div class="bk-photo" id="bkPhoto"></div>' +
    '   <div class="bk-sum-body">' +
    '    <span class="bk-sum-kicker" id="bkSumKicker"></span>' +
    '    <h3 id="bkSumTitle"></h3>' +
    '    <div class="bk-sum-meta"><span>' + I('clock') + '<em id="bkSumDuration"></em></span><span>' + I('rupee') + '<em id="bkSumPrice"></em></span></div>' +
    '    <ul class="bk-sum-perks" id="bkSumPerks"></ul>' +
    '    <p class="bk-sum-pay">' + I('shield') + '<span>Pay only to Nandi Go\'s official UPI / bank account, after our coordinator confirms your booking.</span></p>' +
    '   </div>' +
    '  </aside>' +
    '  <div class="bk-main">' +
    '   <div id="bkFormView">' +
    '    <span class="bk-kicker">' + I('ticket') + 'Booking request</span>' +
    '    <h2 id="bkTitle">Book your trip</h2>' +
    '    <form id="bkForm" novalidate>' +
    '     <label class="bk-field bk-wide"><span>Trip</span><select id="bkTrip" required>' + tripOptions + '</select></label>' +
    '     <div class="bk-field bk-wide" id="bkVariantWrap" hidden><span>Package</span><div class="bk-seg" id="bkVariants" role="radiogroup"></div></div>' +
    '     <div class="bk-field bk-wide" id="bkBatchWrap" hidden><span>Batch</span><div class="bk-seg bk-batches" id="bkBatches" role="radiogroup"></div></div>' +
    '     <label class="bk-field" id="bkDateWrap"><span>Preferred date</span><input type="date" id="bkDate"></label>' +
    '     <div class="bk-field"><span id="bkPaxLabel">Travellers</span><div class="bk-stepper"><button type="button" data-step="-1" aria-label="Fewer">' + I('minus') + '</button><output id="bkPax">2</output><button type="button" data-step="1" aria-label="More">' + I('plus') + '</button></div></div>' +
    '     <label class="bk-field"><span>Full name</span><input id="bkName" autocomplete="name" required maxlength="80" placeholder="Your name"></label>' +
    '     <label class="bk-field"><span>WhatsApp number</span><input id="bkPhone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="10-digit mobile"></label>' +
    '     <label class="bk-field bk-wide"><span>Email <small>(optional)</small></span><input id="bkEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>' +
    '     <div class="bk-total bk-wide"><div><span>Estimated total</span><strong id="bkTotal"></strong><small id="bkTotalNote"></small></div><div class="bk-adv" id="bkAdvance"></div></div>' +
    '     <p class="bk-error bk-wide" id="bkError" role="alert" hidden></p>' +
    '     <button type="submit" class="btn btn-forest bk-submit bk-wide">' + I('send') + 'Send booking request</button>' +
    '     <p class="bk-fine bk-wide">This opens WhatsApp with your details for the Nandi Go team. No payment is taken on this website.</p>' +
    '    </form>' +
    '   </div>' +
    '   <div id="bkDoneView" class="bk-done" hidden>' +
    '    <div class="bk-done-mark">' + I('check') + '</div>' +
    '    <h2>Request ready</h2>' +
    '    <p>Send the WhatsApp message to confirm. Our coordinator will reply with availability and payment details.</p>' +
    '    <dl class="bk-receipt" id="bkReceipt"></dl>' +
    '    <div class="bk-done-actions"><a class="btn btn-forest" id="bkWa" target="_blank" rel="noopener">' + I('chat') + 'Open WhatsApp</a><button type="button" class="btn btn-ghost" id="bkDownload">' + I('download') + 'Save summary</button></div>' +
    '    <button type="button" class="bk-link" data-bk-close>Done</button>' +
    '   </div>' +
    '  </div>' +
    ' </div>' +
    '</div>' +
    '<button type="button" class="book-fab" data-book aria-label="Book a trip">' + I('ticket') + '<span>Book a trip</span></button>';

  var root = document.createElement('div');
  root.innerHTML = html;
  while (root.firstChild) document.body.appendChild(root.firstChild);

  var $ = function (id) { return document.getElementById(id); };
  var bk = $('bk'), form = $('bkForm');
  $('bkDate').min = NG.todayISO();

  function currentPrice() {
    var t = state.trip; if (!t) return 0;
    if (t.variants) { var v = t.variants.filter(function (x) { return x.id === state.variant; })[0] || t.variants[0]; return v.price; }
    return t.price;
  }

  function renderTrip() {
    var t = state.trip;
    $('bkPhoto').style.backgroundImage = 'url("' + t.image + '")';
    $('bkSumKicker').textContent = t.group === 'retreat' ? 'Coffee Estate Retreat · Chikkamagalur' : (NG.dest(t.dest) || {}).name || '';
    $('bkSumTitle').textContent = t.group === 'retreat' ? t.short : t.title;
    $('bkSumDuration').textContent = t.duration;
    $('bkSumPrice').textContent = (t.variants ? 'from ' : '') + NG.fmt(t.from) + ' / ' + t.unit;
    $('bkSumPerks').innerHTML = (t.perks || []).slice(0, 4).map(function (p) { return '<li>' + I('check') + '<span>' + p + '</span></li>'; }).join('');

    // Variants (e.g. Nepal Budget / Standard / Premium)
    $('bkVariantWrap').hidden = !t.variants;
    if (t.variants) {
      if (!t.variants.some(function (v) { return v.id === state.variant; })) state.variant = t.variants[1] ? t.variants[1].id : t.variants[0].id;
      $('bkVariants').innerHTML = t.variants.map(function (v) {
        return '<button type="button" role="radio" aria-checked="' + (v.id === state.variant) + '" data-variant="' + v.id + '"><b>' + v.label + '</b><span>' + NG.fmt(v.price) + '</span><small>' + v.note + '</small></button>';
      }).join('');
    }

    // Fixed batches for the retreat, otherwise a preferred date
    var batches = t.batches ? NG.openBatches() : [];
    $('bkBatchWrap').hidden = !t.batches;
    $('bkDateWrap').hidden = !!t.batches;
    if (t.batches) {
      if (!batches.some(function (b) { return b.id === state.batch; })) state.batch = batches[0] ? batches[0].id : null;
      $('bkBatches').innerHTML = batches.length ? batches.map(function (b) {
        return '<button type="button" role="radio" aria-checked="' + (b.id === state.batch) + '" data-batch="' + b.id + '"><b>' + b.label + '</b><span>' + dateRange(b) + '</span><small>' + (b.live ? b.left + ' of ' + b.seats + ' seats left' : b.seats + ' seats per batch') + '</small></button>';
      }).join('') : '<p class="bk-muted">New batch dates will be announced soon. Send a request and we will contact you first.</p>';
    }
    $('bkPaxLabel').textContent = t.unit === 'couple' ? 'Couples' : 'Travellers';
    renderTotal();
  }

  function dateRange(b) {
    var o = { day: 'numeric', month: 'short' };
    var s = new Date(b.start + 'T00:00:00'), e = new Date(b.end + 'T00:00:00');
    return s.toLocaleDateString('en-IN', o) + ' – ' + e.toLocaleDateString('en-IN', o) + ' ' + e.getFullYear();
  }

  function renderTotal() {
    var t = state.trip, price = currentPrice();
    $('bkPax').textContent = state.pax;
    $('bkTotal').textContent = NG.fmt(price * state.pax);
    $('bkTotalNote').textContent = NG.fmt(price) + ' × ' + state.pax + ' ' + (t.unit === 'couple' ? (state.pax > 1 ? 'couples' : 'couple') : (state.pax > 1 ? 'travellers' : 'traveller'));
    $('bkAdvance').innerHTML = t.group === 'retreat'
      ? '<b>₹1,000 advance</b><span>reserves your seat · balance on arrival</span>'
      : '<b>Advance on confirmation</b><span>amount shared by our coordinator</span>';
  }

  function open(id, opts) {
    opts = opts || {};
    var t = NG.trip(id) || state.trip || NG.trip('chikka-mix');
    state.trip = t; state.batch = opts.batch || state.batch; state.variant = opts.variant || state.variant;
    $('bkTrip').value = t.id;
    $('bkFormView').hidden = false; $('bkDoneView').hidden = true; $('bkError').hidden = true;
    renderTrip();
    state.lastFocus = document.activeElement;
    bk.hidden = false;
    requestAnimationFrame(function () { bk.classList.add('open'); });
    document.documentElement.classList.add('bk-lock');
    setTimeout(function () { (opts.focus === false ? $('bkTrip') : $('bkName')).focus({ preventScroll: true }); }, 60);
  }
  function close() {
    bk.classList.remove('open');
    document.documentElement.classList.remove('bk-lock');
    setTimeout(function () { bk.hidden = true; }, 220);
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus({ preventScroll: true });
  }

  /* Partner referral: links like ?ref=NG-DP-MYS-01 are remembered for 30 days on this device */
  var REF_RE = /^NG-[A-Z0-9-]{2,20}$/;
  (function () {
    var m = /[?&]ref=([^&#]+)/i.exec(location.search), c = m ? decodeURIComponent(m[1]).trim().toUpperCase() : '';
    if (REF_RE.test(c)) try { localStorage.setItem('ng_ref', JSON.stringify({ c: c, t: Date.now() })); } catch (e) {}
  })();
  function refCode() {
    try { var r = JSON.parse(localStorage.getItem('ng_ref') || 'null'); if (r && REF_RE.test(r.c) && Date.now() - r.t < 30 * 864e5) return r.c; } catch (e) {}
    return null;
  }

  function cleanPhone(v) { var d = v.replace(/[^\d]/g, ''); if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2); if (d.length === 11 && d[0] === '0') d = d.slice(1); return d; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = state.trip, name = $('bkName').value.trim(), phone = cleanPhone($('bkPhone').value), email = $('bkEmail').value.trim();
    var err = '';
    if (!name) err = 'Please enter your name.';
    else if (!/^[6-9]\d{9}$/.test(phone)) err = 'Please enter a valid 10-digit mobile number.';
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err = 'Please check the email address.';
    else if (t.batches && !state.batch && NG.openBatches().length) err = 'Please choose a batch.';
    if (err) { $('bkError').textContent = err; $('bkError').hidden = false; return; }
    $('bkError').hidden = true;

    var variant = t.variants ? t.variants.filter(function (v) { return v.id === state.variant; })[0] : null;
    var batch = t.batches ? NG.RETREAT_BATCHES.filter(function (b) { return b.id === state.batch; })[0] : null;
    var when = batch ? batch.label + ' (' + dateRange(batch) + ')' : ($('bkDate').value ? new Date($('bkDate').value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible');
    var unitWord = t.unit === 'couple' ? (state.pax > 1 ? 'couples' : 'couple') : (state.pax > 1 ? 'travellers' : 'traveller');
    state.ref = 'NG-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 4).replace(/[^A-Z0-9]/g, '0');
    var rows = [
      ['Reference', state.ref], ['Trip', t.title + (variant ? ' — ' + variant.label : '')], ['Date', when],
      ['Travellers', state.pax + ' ' + unitWord], ['Estimated total', NG.fmt(currentPrice() * state.pax)],
      ['Name', name], ['WhatsApp', phone]
    ];
    if (email) rows.push(['Email', email]);
    if (refCode()) rows.push(['Partner code', refCode()]);
    $('bkReceipt').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + escapeHtml(r[1]) + '</dd></div>'; }).join('');
    var msg = 'Hi Nandi Go! I would like to book a trip.\n\n' + rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') +
      '\n\nPlease confirm availability and share the payment details.';
    state.summary = 'NANDI GO — BOOKING REQUEST\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
      '\n\nPay only to Nandi Go\'s official UPI / bank account after confirmation.\nWhatsApp: ' + NG.PHONES[0];
    var link = 'https://wa.me/' + NG.WHATSAPP + '?text=' + encodeURIComponent(msg);
    $('bkWa').href = link;

    // Save the request in Supabase (the admin sees it in admin.html). WhatsApp still opens if saving fails.
    var row = {
      ref: state.ref, trip_id: t.id, trip_title: t.title, variant: variant ? variant.label : null,
      batch_id: batch && batch.live ? batch.id : null,
      travel_date: batch ? batch.start : ($('bkDate').value || null),
      travellers: state.pax, unit: t.unit === 'couple' ? 'couple' : 'person',
      estimated_total: currentPrice() * state.pax, name: name.slice(0, 80), phone: phone, email: email || null,
      partner_code: refCode()
    };
    var submitBtn = form.querySelector('[type=submit]');
    var w = window.open('', '_blank'); // open now so the pop-up is not blocked
    if (submitBtn) submitBtn.disabled = true;
    var save = NG.DB ? NG.DB.insert('bookings', row) : Promise.resolve(false);
    save.then(function () { finish(true); }, function (e) {
      console.warn('Nandi Go: booking not saved', e);
      if (/no longer open/i.test(e.message)) {
        if (w) w.close();
        if (submitBtn) submitBtn.disabled = false;
        $('bkError').textContent = 'Sorry, this batch just filled up. Please choose another batch.';
        $('bkError').hidden = false;
        if (NG.refreshBatches) NG.refreshBatches();
        return;
      }
      finish(false);
    });
    function finish() {
      if (submitBtn) submitBtn.disabled = false;
      $('bkFormView').hidden = true; $('bkDoneView').hidden = false;
      if (w) { try { w.opener = null; w.location.href = link; } catch (x) { window.open(link, '_blank', 'noopener'); } }
    }
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  $('bkDownload').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([state.summary], { type: 'text/plain' }));
    a.download = state.ref + '.txt'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('bkTrip').addEventListener('change', function () { state.trip = NG.trip(this.value); renderTrip(); });
  bk.addEventListener('click', function (e) {
    if (e.target === bk || e.target.closest('[data-bk-close]')) { close(); return; }
    var v = e.target.closest('[data-variant]'); if (v) { state.variant = v.dataset.variant; renderTrip(); return; }
    var b = e.target.closest('#bkBatches [data-batch]'); if (b) { state.batch = b.dataset.batch; renderTrip(); return; }
    var s = e.target.closest('[data-step]');
    if (s) { state.pax = Math.max(1, Math.min(30, state.pax + Number(s.dataset.step))); renderTotal(); }
  });
  document.addEventListener('keydown', function (e) {
    if (bk.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // keep focus inside the card
      var f = [].slice.call(bk.querySelectorAll('button,select,input,a[href]')).filter(function (el) { return !el.closest('[hidden]') && el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-book]');
    if (!el || el.closest('#bk')) return;
    e.preventDefault();
    open(el.dataset.book || null, { batch: el.dataset.batch, variant: el.dataset.variant });
  });
  // Floating button hides near the page footer so it never covers footer links
  var fab = document.querySelector('.book-fab'), foot = document.querySelector('footer');
  // Hidden over the footer, and over the home-page map (it has its own Book buttons)
  var hero = document.getElementById('map'), top = document.getElementById('home'), hidden = { foot: false, hero: false, top: false };
  function syncFab() { fab.classList.toggle('away', hidden.foot || hidden.hero || hidden.top); }
  if (fab && 'IntersectionObserver' in window) {
    if (foot) new IntersectionObserver(function (en) { hidden.foot = en[0].isIntersecting; syncFab(); }, { threshold: 0.15 }).observe(foot);
    if (top) new IntersectionObserver(function (en) { hidden.top = en[0].intersectionRatio > 0.35; syncFab(); }, { threshold: [0, 0.35, 0.6, 1] }).observe(top);
    if (hero) new IntersectionObserver(function (en) { hidden.hero = en[0].intersectionRatio > 0.35; syncFab(); }, { threshold: [0, 0.35, 0.6, 1] }).observe(hero);
  }
  if (/^#book/.test(location.hash)) { var id = location.hash.split('=')[1]; setTimeout(function () { open(id); }, 300); }
  document.addEventListener('ng:batches', function () { if (!bk.hidden && state.trip) renderTrip(); });
  window.NGBooking = { open: open, close: close };
})();
