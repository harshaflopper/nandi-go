/* Nandi Go booking card — shared by every page.
 * Step 1: travel style + date (a calendar of that trip's batches for the style).
 * Step 2: lead traveller's contact, every traveller's name and age, total.
 * Then: Google sign-in (the typed details are kept), Step 3: one ID per traveller, then Pay (Razorpay) and the e-ticket.
 * Open it from any element:  data-book="goa"  data-style="girls"  data-batch="<batch id>"  data-variant="standard" (all optional) */
(function () {
  var NG = window.NG, I = window.NGIcon;
  if (!NG || !I) return;
  var state = { trip: null, style: null, batch: null, variant: null, pax: 2, step: 1, month: null, date: '', lastFocus: null, ref: '', summary: '' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
    '    <p class="bk-sum-pay">' + I('shield') + '<span>Book with an advance and pay the balance before the trip, online through Razorpay (UPI, cards, net banking). Nandi Go never asks you to pay a partner or a personal account.</span></p>' +
    '   </div>' +
    '  </aside>' +
    '  <div class="bk-main">' +
    '   <div id="bkFormView">' +
    '    <div class="bk-steps" aria-hidden="true"><span id="bkS1" class="on">1 · Dates</span><i></i><span id="bkS2">2 · Your details</span><i></i><span id="bkS3">3 · IDs &amp; payment</span></div>' +
    '    <h2 id="bkTitle">Choose your dates</h2>' +
    '    <div id="bkStep1">' +
    '     <label class="bk-field bk-wide"><span>Trip</span><select id="bkTrip"></select></label>' +
    '     <div class="bk-field bk-wide"><span>Travel style</span><div class="bk-styles" id="bkStyles" role="radiogroup"></div></div>' +
    '     <div class="bk-field bk-wide" id="bkVariantWrap" hidden><span>Package</span><div class="bk-seg" id="bkVariants" role="radiogroup"></div></div>' +
    '     <div class="bk-field bk-wide"><span>Dates</span><div class="bk-cal" id="bkCal"></div><div class="bk-batches" id="bkBatches"></div></div>' +
    '     <p class="bk-error" id="bkError1" role="alert" hidden></p>' +
    '     <button type="button" class="btn btn-forest bk-submit" id="bkNext">Continue' + I('arrow') + '</button>' +
    '    </div>' +
    '    <form id="bkForm" novalidate hidden>' +
    '     <div class="bk-picked bk-wide" id="bkPicked"></div>' +
    '     <div class="bk-field"><span id="bkPaxLabel">Travellers</span><div class="bk-stepper"><button type="button" data-step="-1" aria-label="Fewer">' + I('minus') + '</button><output id="bkPax">2</output><button type="button" data-step="1" aria-label="More">' + I('plus') + '</button></div><small class="bk-pax-note" id="bkPaxNote"></small></div>' +
    '     <label class="bk-field"><span>WhatsApp number</span><input id="bkPhone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="10-digit mobile"></label>' +
    '     <label class="bk-field bk-wide"><span>Email <small>(for your booking confirmation)</small></span><input id="bkEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>' +
    '     <div class="bk-field bk-wide"><span>Who is travelling</span><div class="bk-guests" id="bkGuests"></div></div>' +
    '     <div class="bk-total bk-wide"><div><span>Total amount</span><strong id="bkTotal"></strong><small id="bkTotalNote"></small></div><div class="bk-adv" id="bkAdvance"></div></div>' +
    '     <p class="bk-error bk-wide" id="bkError" role="alert" hidden></p>' +
    '     <div class="bk-tc bk-wide" id="bkTc">' +
    '      <div class="bk-tc-head"><b>' + I('scroll') + 'Terms &amp; Conditions</b><button type="button" class="bk-link" id="bkTcFull">Read full screen</button><button type="button" class="bk-tc-done" id="bkTcDone">Done</button></div>' +
    '      <p class="bk-tc-adv" id="bkTcAdv"></p>' +
    '      <div class="bk-tc-text" id="bkTcText" tabindex="0" aria-label="Terms and Conditions"><p class="et-muted">Loading the terms…</p></div>' +
    '      <p class="bk-tc-hint" id="bkTcHint">' + I('arrow') + 'Scroll to the end of the terms to accept</p>' +
    '      <label class="bk-terms" id="bkTermsBox"><input type="checkbox" id="bkTerms" disabled><span><b>I have read and accept all the Terms &amp; Conditions above</b>, including the advance, cancellation, no-show, late-arrival, non-transferable and ID rules.</span></label>' +
    '     </div>' +
    '     <p class="bk-signed bk-wide" id="bkSigned" hidden></p>' +
    '     <button type="submit" class="btn btn-forest bk-submit bk-wide" id="bkPay"><span id="bkPayText">Continue</span>' + I('arrow') + '</button>' +
    '     <p class="bk-fine bk-wide">' + I('shield') + 'Next: sign in with Google and upload one ID per traveller, then pay securely with Razorpay.</p>' +
    '    </form>' +
    '    <div class="bk-auth" id="bkAuth" hidden><div class="bk-auth-ic">' + I('lock') + '</div><h3>Sign in to continue</h3>' +
    '     <p>Sign in with Google so your booking, traveller IDs and e-ticket are saved to your account. You can open them any time from <b>My trips</b>.</p>' +
    '     <button type="button" class="bk-google" id="bkGoogle"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</button>' +
    '     <p class="bk-error" id="bkAuthErr" role="alert" hidden></p>' +
    '     <button type="button" class="bk-link" data-auth-back>Back to your details</button></div>' +
    '    <div id="bkIds" hidden>' +
    '     <div class="bk-picked bk-wide" id="bkIdsPicked"></div>' +
    '     <p class="bk-ids-why">Hotels and homestays must see a government ID for every guest. Upload one ID per traveller to unlock payment.</p>' +
    '     <div class="et-kyc-note" id="bkIdNote"></div>' +
    '     <label class="et-consent"><input type="checkbox" id="bkConsent"><span>I agree that Nandi Go may use these IDs only for hotel check-in and travel permits for this trip. They are stored privately and deleted 30 days after the trip (or after 3 days if the booking is not paid).</span></label>' +
    '     <div class="et-kyc-list" id="bkIdList"><p class="et-muted">Loading…</p></div>' +
    '     <div class="bk-payopts" id="bkPayOpts" role="radiogroup" aria-label="How much to pay now"></div>' +
    '     <p class="bk-error" id="bkError3" role="alert" hidden></p>' +
    '     <button type="button" class="btn btn-forest bk-submit" id="bkPayNow" disabled>' + I('card') + '<span id="bkPayNowText">Pay</span></button>' +
    '     <p class="bk-fine">' + I('lock') + '<span id="bkIdsFine">Pay unlocks when every traveller has an ID. Close this any time and finish later from My trips.</span></p>' +
    '    </div>' +
    '   </div>' +
    '   <div id="bkDoneView" class="bk-done" hidden>' +
    '    <div class="bk-done-mark">' + I('check') + '</div>' +
    '    <h2 id="bkDoneTitle">Booking saved</h2>' +
    '    <p id="bkDoneText">Online payment is being switched on. Our team will contact you on WhatsApp shortly to complete the payment and confirm your seats.</p>' +
    '    <dl class="bk-receipt" id="bkReceipt"></dl>' +
    '    <div class="bk-done-actions"><a class="btn btn-gold bk-ticket" id="bkTicket" hidden>' + I('ticket') + 'Open my e-ticket</a><button type="button" class="btn btn-gold" id="bkRetry" hidden>' + I('card') + '<span>Pay now</span></button><a class="btn btn-ghost" id="bkMyTrips" href="my-trips">' + I('users') + 'My trips</a><a class="btn btn-forest" id="bkWa" target="_blank" rel="noopener">' + I('chat') + 'Chat on WhatsApp</a><button type="button" class="btn btn-ghost" id="bkDownload">' + I('download') + 'Save summary</button></div>' +
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
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var iso = function (y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); };
  var shortDate = function (s) { return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  function dateRange(b) {
    var e = new Date(b.end + 'T00:00:00');
    return (b.start === b.end ? '' : shortDate(b.start) + ' – ') + shortDate(b.end) + ' ' + e.getFullYear();
  }
  var visibleStyles = function () { return NG.STYLES.filter(function (s) { return !s.hidden; }); };

  function fillTrips() {
    $('bkTrip').innerHTML = NG.TRIPS.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('');
    if (state.trip) $('bkTrip').value = state.trip.id;
  }
  fillTrips();

  function priceNow() { return NG.priceFor(state.trip, state.style, batchObj(), state.variant); }
  function batchObj() { return state.batch ? NG.BATCHES.filter(function (b) { return b.id === state.batch; })[0] || null : null; }
  function unitWord(unit, n) { return unit === 'couple' ? (n > 1 ? 'couples' : 'couple') : (n > 1 ? 'travellers' : 'traveller'); }

  /* ---------- Summary column ---------- */
  function renderSummary() {
    var t = state.trip, st = NG.style(state.style), p = priceNow();
    $('bkPhoto').style.backgroundImage = 'url("' + t.image + '")';
    $('bkSumKicker').textContent = [(NG.dest(t.dest) || {}).name, st && st.name].filter(Boolean).join(' · ');
    $('bkSumTitle').textContent = t.title;
    $('bkSumDuration').textContent = t.duration;
    $('bkSumPrice').textContent = (t.variants && !state.variant ? 'from ' : '') + NG.fmt(p.price) + ' / ' + p.unit;
    $('bkSumPerks').innerHTML = (t.perks || []).slice(0, 4).map(function (x) { return '<li>' + I('check') + '<span>' + esc(x) + '</span></li>'; }).join('');
  }

  /* ---------- Step 1: style, package, calendar ---------- */
  function renderStep1() {
    var t = state.trip;
    $('bkStyles').innerHTML = visibleStyles().map(function (s) {
      var n = NG.batchesFor(t.id, s.id).filter(function (b) { return b.status !== 'full'; }).length;
      return '<button type="button" role="radio" aria-checked="' + (s.id === state.style) + '" data-style="' + s.id + '"><b>' + esc(s.name) + '</b><small>' +
        (n ? n + ' date' + (n > 1 ? 's' : '') : 'Dates on request') + '</small></button>';
    }).join('');
    $('bkVariantWrap').hidden = !t.variants;
    if (t.variants) {
      if (!t.variants.some(function (v) { return v.id === state.variant; })) state.variant = t.variants[1] ? t.variants[1].id : t.variants[0].id;
      $('bkVariants').innerHTML = t.variants.map(function (v) {
        return '<button type="button" role="radio" aria-checked="' + (v.id === state.variant) + '" data-variant="' + v.id + '"><b>' + esc(v.label) + '</b><span>' + NG.fmt(NG.priceFor(t, state.style, null, v.id).price) + '</span><small>' + esc(v.note) + '</small></button>';
      }).join('');
    } else state.variant = null;
    var list = NG.batchesFor(t.id, state.style);
    if (state.batch && !list.some(function (b) { return b.id === state.batch && b.status !== 'full'; })) state.batch = null;
    if (!state.batch) { var first = list.filter(function (b) { return b.status !== 'full'; })[0]; state.batch = first ? first.id : null; }
    var sel = batchObj();
    if (!state.month || (sel && state.month !== sel.start.slice(0, 7))) state.month = (sel ? sel.start : (state.date || NG.todayISO())).slice(0, 7);
    renderCalendar(list);
    if (list.length) {
      $('bkBatches').innerHTML = list.map(function (b) {
        var full = b.status === 'full', p = NG.priceFor(t, state.style, b, state.variant);
        return '<button type="button" class="bk-batch' + (full ? ' is-full' : '') + '" aria-pressed="' + (b.id === state.batch) + '" data-batch="' + b.id + '"' + (full ? ' disabled' : '') + '>' +
          '<b>' + esc(b.label) + '</b><span>' + dateRange(b) + '</span><em>' + (full ? 'Batch full' : (b.live ? b.left + ' seat' + (b.left === 1 ? '' : 's') + ' left' : '')) + '</em><strong>' + NG.fmt(p.price) + '<small> / ' + p.unit + '</small></strong></button>';
      }).join('');
    } else {
      $('bkBatches').innerHTML = '<div class="bk-nodates"><p>No fixed dates for ' + esc((NG.style(state.style) || {}).name || 'this style') + ' on this trip yet. Pick the date you would like and we will plan it with you.</p>' +
        '<label class="bk-field"><span>Preferred date <small>(optional)</small></span><input type="date" id="bkDate" min="' + NG.todayISO() + '" value="' + esc(state.date) + '"></label></div>';
    }
    renderSummary();
  }

  function renderCalendar(list) {
    var y = +state.month.slice(0, 4), m = +state.month.slice(5, 7) - 1;
    var first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), lead = (first.getDay() + 6) % 7, today = NG.todayISO();
    var nowMonth = today.slice(0, 7);
    var cells = '';
    for (var i = 0; i < lead; i++) cells += '<span class="bk-day blank"></span>';
    for (var d = 1; d <= days; d++) {
      var ds = iso(y, m, d), cls = 'bk-day', hit = null;
      list.forEach(function (b) { if (ds >= b.start && ds <= b.end && (!hit || b.id === state.batch)) hit = b; });
      if (ds < today) cls += ' past';
      if (ds === today) cls += ' today';
      if (hit) {
        cls += hit.status === 'full' ? ' full' : ' open';
        if (hit.id === state.batch) cls += ' sel';
        if (ds === hit.start) cls += ' first';
        if (ds === hit.end) cls += ' last';
        cells += '<button type="button" class="' + cls + '" data-batch="' + hit.id + '"' + (hit.status === 'full' ? ' disabled' : '') + ' aria-label="' + esc(hit.label + ', ' + dateRange(hit)) + '">' + d + '</button>';
      } else if (!list.length && ds >= today) {
        cells += '<button type="button" class="' + cls + ' pick' + (ds === state.date ? ' sel first last' : '') + '" data-date="' + ds + '">' + d + '</button>';
      } else cells += '<span class="' + cls + '">' + d + '</span>';
    }
    $('bkCal').innerHTML =
      '<div class="bk-cal-head"><button type="button" data-month="-1" aria-label="Previous month"' + (state.month <= nowMonth ? ' disabled' : '') + '>' + I('prev') + '</button>' +
      '<b>' + MONTHS[m] + ' ' + y + '</b><button type="button" data-month="1" aria-label="Next month">' + I('next') + '</button></div>' +
      '<div class="bk-cal-grid">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<span class="bk-dow">' + x + '</span>'; }).join('') + cells + '</div>' +
      (list.length ? '<p class="bk-cal-key"><i class="k-open"></i>Open batch <i class="k-full"></i>Full</p>' : '');
  }

  function shiftMonth(n) {
    var y = +state.month.slice(0, 4), m = +state.month.slice(5, 7) - 1 + n;
    var dt = new Date(y, m, 1); state.month = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    renderCalendar(NG.batchesFor(state.trip.id, state.style));
  }

  /* ---------- Step 2: details ---------- */
  function maxPax() {
    var b = batchObj(), p = priceNow();
    return b && b.live ? Math.max(1, Math.min(30, Math.floor(b.left / (p.unit === 'couple' ? 2 : 1)))) : 30;
  }
  function guestCount() { var p = priceNow(); return state.pax * (p.unit === 'couple' ? 2 : 1); }
  function renderGuests() {
    var box = $('bkGuests'), n = guestCount(), p = priceNow(), keep = state.guests || [];
    // keep what was typed when the number of travellers changes
    box.querySelectorAll('.bk-guest').forEach(function (row, i) { keep[i] = { name: row.querySelector('[data-g=name]').value, age: row.querySelector('[data-g=age]').value }; });
    state.guests = keep;
    var html = '';
    for (var i = 0; i < n; i++) {
      var g = keep[i] || { name: '', age: '' };
      var label = p.unit === 'couple' ? 'Couple ' + (Math.floor(i / 2) + 1) + ' · person ' + (i % 2 + 1) : 'Traveller ' + (i + 1);
      if (i === 0) label += ' (you)';
      html += '<div class="bk-guest"><span>' + label + '</span><input data-g="name" maxlength="80" placeholder="Full name" value="' + esc(g.name) + '"' + (i === 0 ? ' autocomplete="name" id="bkName"' : '') + '>' +
        '<input data-g="age" type="number" min="0" max="110" inputmode="numeric" placeholder="Age" value="' + esc(g.age) + '"></div>';
    }
    box.innerHTML = html;
  }
  function renderStep2() {
    var t = state.trip, st = NG.style(state.style), b = batchObj(), p = priceNow();
    state.pax = Math.min(state.pax, maxPax());
    $('bkPicked').innerHTML = '<div><b>' + esc(t.title) + '</b><span>' + esc(st ? st.name : '') + (state.variant ? ' · ' + esc(t.variants.filter(function (v) { return v.id === state.variant; })[0].label) : '') + '</span>' +
      '<span>' + I('calendar') + (b ? esc(b.label) + ' · ' + dateRange(b) : (state.date ? 'Preferred: ' + shortDate(state.date) + ' ' + state.date.slice(0, 4) : 'Dates flexible')) + '</span></div>' +
      '<button type="button" class="bk-link" data-back>Change</button>';
    $('bkPaxLabel').textContent = p.unit === 'couple' ? 'Couples' : 'Travellers';
    $('bkPaxNote').textContent = b && b.live ? b.left + ' seat' + (b.left === 1 ? '' : 's') + ' left in this batch' : '';
    renderGuests();
    renderTotal();
    var tt = state.trip;
    $('bkTcAdv').innerHTML = I('info') + '<span>Advance for this trip: <b>' + (tt.advance_per_person ? NG.fmt(tt.advance_per_person) + ' per traveller</b> (flight trip)' : NG.fmt(500) + ' per traveller or 50% of the total</b>, whichever is higher') + '. Balance due 3 days before the trip.</span>';
    loadTerms();
    var u = window.NGAuth && NGAuth.user();
    $('bkSigned').hidden = !u;
    if (u) {
      $('bkSigned').innerHTML = I('check') + 'Signed in as <b>' + esc(u.email) + '</b> <button type="button" class="bk-link" data-signout>Not you?</button>';
      if (!$('bkEmail').value) $('bkEmail').value = u.email || '';
    }
  }
  function renderTotal() {
    var p = priceNow();
    $('bkPax').textContent = state.pax;
    $('bkTotal').textContent = NG.fmt(p.price * state.pax);
    $('bkTotalNote').textContent = NG.fmt(p.price) + ' × ' + state.pax + ' ' + unitWord(p.unit, state.pax);
    var tot = p.price * state.pax, adv = NG.advanceFor(state.trip, tot, guestCount());
    $('bkAdvance').innerHTML = '<b>Advance ' + NG.fmt(adv) + '</b><span>' + (tot > adv ? 'Balance ' + NG.fmt(tot - adv) + ' due 3 days before the trip' : 'Paid in full now') + '</span>';
    $('bkPayText').textContent = 'Continue';
  }

  function go(step) {
    state.step = step;
    $('bkStep1').hidden = step !== 1; form.hidden = step !== 2; $('bkIds').hidden = step !== 3; $('bkAuth').hidden = step !== 'auth';
    $('bkS1').classList.toggle('on', step === 1); $('bkS2').classList.toggle('on', step === 2 || step === 'auth'); $('bkS3').classList.toggle('on', step === 3);
    $('bkTitle').textContent = step === 1 ? 'Choose your dates' : step === 3 ? 'Traveller IDs' : step === 'auth' ? 'Almost there' : 'Your details';
    if (step === 1) renderStep1(); else if (step === 2) renderStep2(); else if (step === 3) renderIdsHead();
    bk.querySelector('.bk-main').scrollTop = 0;
  }

  function open(id, opts) {
    opts = opts || {};
    var t = NG.trip(id) || state.trip || NG.TRIPS[0];
    var styleOk = function (s) { return s && visibleStyles().some(function (x) { return x.id === s; }); };
    state.trip = t;
    state.style = styleOk(opts.style) ? opts.style : (styleOk(state.style) ? state.style : (visibleStyles()[0] || NG.STYLES[0]).id);
    state.batch = opts.batch || null; state.variant = opts.variant || null; state.month = null; state.date = ''; state.guests = []; $('bkGuests').innerHTML = '';
    state.paidRef = null; state.T = null; state.idChoice = {}; state.idBusy = {}; state.payKind = 'advance';
    if ($('bkTerms')) { $('bkTerms').checked = false; termsRead(false); $('bkTcText').scrollTop = 0; }
    fillTrips();
    $('bkFormView').hidden = false; $('bkDoneView').hidden = true; $('bkError').hidden = true; $('bkError1').hidden = true;
    go(1);
    state.lastFocus = document.activeElement;
    bk.hidden = false;
    requestAnimationFrame(function () { bk.classList.add('open'); });
    document.documentElement.classList.add('bk-lock');
    setTimeout(function () { var f = bk.querySelector('#bkStyles [aria-checked="true"]') || $('bkTrip'); f.focus({ preventScroll: true }); }, 60);
  }
  function close() {
    bk.classList.remove('open');
    document.documentElement.classList.remove('bk-lock');
    setTimeout(function () { bk.hidden = true; }, 220);
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus({ preventScroll: true });
  }

  function cleanPhone(v) { var d = v.replace(/[^\d]/g, ''); if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2); if (d.length === 11 && d[0] === '0') d = d.slice(1); return d; }

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

  $('bkNext').addEventListener('click', function () {
    var b = batchObj(), list = NG.batchesFor(state.trip.id, state.style).filter(function (x) { return x.status !== 'full'; });
    if (list.length && !b) { $('bkError1').textContent = 'Please choose a batch date.'; $('bkError1').hidden = false; return; }
    $('bkError1').hidden = true;
    go(2);
    setTimeout(function () { $('bkName').focus({ preventScroll: true }); }, 30);
  });

  /* ---------- Razorpay payment ---------- */
  function payApi(body) {
    return fetch(NG.DB.url + '/functions/v1/razorpay', { method: 'POST', headers: { apikey: NG.DB.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { j._status = r.status; return j; }); });
  }
  var rzLoading = null;
  function loadCheckout() {
    if (window.Razorpay) return Promise.resolve();
    if (!rzLoading) rzLoading = new Promise(function (ok, no) {
      var sc = document.createElement('script'); sc.src = 'https://checkout.razorpay.com/v1/checkout.js';
      sc.onload = ok; sc.onerror = function () { rzLoading = null; no(new Error('checkout')); }; document.head.appendChild(sc);
    });
    return rzLoading;
  }
  function doneState(kind, extra) {
    var ref = state.paidRef || state.ref, sbtn = form.querySelector('[type=submit]');
    if (sbtn) sbtn.disabled = false;
    $('bkFormView').hidden = true; $('bkDoneView').hidden = false;
    $('bkRetry').hidden = kind !== 'pending';
    $('bkTicket').hidden = !(kind === 'paid' && extra && extra.ticket_key);
    $('bkDoneView').classList.toggle('is-pending', kind === 'pending');
    if (kind === 'paid') {
      $('bkDoneTitle').textContent = 'Booking confirmed';
      $('bkDoneText').textContent = (extra.kind === 'balance' ? 'Balance of ' : extra.kind === 'full' ? 'Full payment of ' : 'Advance of ') + NG.fmt(extra.amount || 0) + ' received. Booking ' + ref + ' is confirmed. ' +
        (extra.balance > 0 ? 'Balance ' + NG.fmt(extra.balance) + ' is due 3 days before the trip: pay it any time from My trips or your e-ticket. ' : 'Fully paid. ') + 'Your e-ticket is always in My trips.';
      if (extra.ticket_key) {
        var url = 'ticket?b=' + encodeURIComponent(extra.ref || ref) + '&k=' + extra.ticket_key;
        $('bkTicket').href = url;
        try { var list = JSON.parse(localStorage.getItem('ng_tickets') || '[]'); list.unshift({ ref: extra.ref || ref, url: url, t: Date.now() }); localStorage.setItem('ng_tickets', JSON.stringify(list.slice(0, 10))); } catch (e) {}
      }
    } else if (kind === 'pending') {
      $('bkDoneTitle').textContent = 'Payment not completed';
      $('bkDoneText').textContent = (extra && extra.msg ? extra.msg + ' ' : '') + (state.payKind === 'balance' ? 'The balance for booking ' + ref + ' is not paid yet. You can pay it any time from My trips.' : 'Your booking ' + ref + ' is saved, but seats are confirmed only after the advance is paid. You can pay any time in the next 3 days from My trips.');
      $('bkRetry').querySelector('span').textContent = state.payKind === 'balance' ? 'Pay balance now' : 'Pay now';
    } else {
      $('bkDoneTitle').textContent = 'Booking saved';
      $('bkDoneText').textContent = (extra && extra.msg ? extra.msg + ' ' : '') + 'Our team will contact you on WhatsApp shortly to complete the payment and confirm your seats.';
    }
  }
  function startPayment() {
    var ref = state.paidRef, btn = form.querySelector('[type=submit]');
    $('bkRetry').disabled = true;
    Promise.all([payApi({ action: 'order', ref: ref, kind: state.payKind || 'advance' }), loadCheckout()]).then(function (r) {
      var o = r[0];
      $('bkRetry').disabled = false;
      if (o.paid) return doneState('paid', {});
      if (o.kyc_missing) { $('bkFormView').hidden = false; $('bkDoneView').hidden = true; go(3); loadIds(); $('bkError3').textContent = o.error; $('bkError3').hidden = false; return; }
      if (o.not_configured || !o.order_id) return doneState(o.not_configured ? 'saved' : 'pending', { msg: o.not_configured ? '' : o.error });
      var rzp = new window.Razorpay({
        key: o.key_id, order_id: o.order_id, amount: o.amount, currency: o.currency,
        name: 'Nandi Go', description: o.description, image: location.origin + '/logo.png',
        prefill: o.prefill, notes: { booking_ref: ref }, theme: { color: '#1A3D2E' },
        handler: function (resp) {
          payApi({ action: 'verify', razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature })
            .then(function (v) { v.ok ? doneState('paid', { amount: v.amount, ref: v.ref, ticket_key: v.ticket_key, balance: v.balance, kind: v.kind }) : doneState('pending', { msg: v.error || 'We could not confirm the payment.' }); },
                  function () { doneState('pending', { msg: 'We could not confirm the payment yet. If money was debited, it will be confirmed automatically.' }); });
        },
        modal: { ondismiss: function () { doneState('pending', {}); } }
      });
      rzp.on('payment.failed', function (resp) { console.warn('Nandi Go: payment failed', resp && resp.error); });
      rzp.open();
    }, function () {
      $('bkRetry').disabled = false;
      doneState('pending', { msg: 'The payment window could not open. Please check your internet and try again.' });
    });
  }
  $('bkRetry').addEventListener('click', startPayment);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = state.trip, phone = cleanPhone($('bkPhone').value), email = $('bkEmail').value.trim();
    var guests = [].map.call($('bkGuests').querySelectorAll('.bk-guest'), function (row) {
      return { name: row.querySelector('[data-g=name]').value.trim().slice(0, 80), age: row.querySelector('[data-g=age]').value === '' ? null : +row.querySelector('[data-g=age]').value };
    });
    var name = guests[0] ? guests[0].name : '';
    var err = '';
    var missing = guests.findIndex(function (g) { return !g.name; }), badAge = guests.findIndex(function (g) { return g.age === null || !(g.age >= 0 && g.age <= 110); });
    if (missing >= 0) err = missing === 0 ? 'Please enter your full name.' : 'Please enter the name of traveller ' + (missing + 1) + '.';
    else if (badAge >= 0) err = 'Please enter the age of ' + (badAge === 0 ? 'yourself' : 'traveller ' + (badAge + 1)) + '.';
    else if (!/^[6-9]\d{9}$/.test(phone)) err = 'Please enter a valid 10-digit mobile number.';
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err = 'Please check the email address.';
    else if (!$('bkTerms').checked) err = $('bkTerms').disabled ? 'Please read the Terms & Conditions to the end, then tick to accept.' : 'Please tick the box to accept the Terms & Conditions.';
    if (err) { $('bkError').textContent = err; $('bkError').hidden = false; if (/Terms/.test(err)) { var tb = $('bkTc'); tb.classList.add('shake'); setTimeout(function () { tb.classList.remove('shake'); }, 600); } return; }
    $('bkError').hidden = true;

    var st = NG.style(state.style), b = batchObj(), p = priceNow();
    var variant = t.variants ? t.variants.filter(function (v) { return v.id === state.variant; })[0] : null;
    var when = b ? b.label + ' (' + dateRange(b) + ')' : (state.date ? new Date(state.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (preferred)' : 'Flexible');
    state.ref = 'NG-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 4).replace(/[^A-Z0-9]/g, '0');
    var rows = [
      ['Reference', state.ref], ['Trip', t.title + (variant ? ' — ' + variant.label : '')], ['Travel style', st ? st.name : ''], ['Date', when],
      ['Travellers', state.pax + ' ' + unitWord(p.unit, state.pax) + ': ' + guests.map(function (g) { return g.name + ' (' + g.age + ')'; }).join(', ')],
      ['Total', NG.fmt(p.price * state.pax)], ['Booked by', name], ['WhatsApp', phone]
    ];
    if (email) rows.push(['Email', email]);
    if (refCode()) rows.push(['Partner code', refCode()]);
    $('bkReceipt').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    var msg = 'Hi Nandi Go! I have booked on the website and would like to complete the payment.\n\n' + rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n');
    state.summary = 'NANDI GO — BOOKING\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
      '\n\nNandi Go never asks you to pay a partner or a personal account.\nWhatsApp: ' + NG.PHONES[0];
    var link = 'https://wa.me/' + NG.WHATSAPP + '?text=' + encodeURIComponent(msg);
    $('bkWa').href = link;

    var row = {
      ref: state.ref, trip_id: t.id, trip_title: t.title, style_id: state.style, variant: variant ? variant.label : null,
      batch_id: b && b.live ? b.id : null, travel_date: b ? b.start : (state.date || null),
      travellers: state.pax, unit: p.unit, estimated_total: p.price * state.pax,
      name: name.slice(0, 80), phone: phone, email: email || null, partner_code: refCode(), guests: guests,
      terms_accepted_at: new Date().toISOString()
    };
    if (!window.NGAuth || !NGAuth.user()) { saveDraft(guests, phone, email); go('auth'); return; }
    var submitBtn = form.querySelector('[type=submit]');
    if (submitBtn) submitBtn.disabled = true;
    state.paidRef = state.ref; state.payTotal = p.price * state.pax;
    var save = NGAuth.client.from('bookings').insert(row).then(function (r) { if (r.error) throw new Error(r.error.message); });
    save.then(function () { if (submitBtn) submitBtn.disabled = false; go(3); loadIds(); }, function (e) {
      console.warn('Nandi Go: booking not saved', e);
      if (submitBtn) submitBtn.disabled = false;
      if (/no longer open/i.test(e.message)) {
        if (NG.refreshBatches) NG.refreshBatches().then(function () { go(1); $('bkError1').textContent = 'Sorry, that batch just filled up. Please choose another date.'; $('bkError1').hidden = false; });
        return;
      }
      $('bkError').innerHTML = 'Sorry, we could not save your booking. Please try again, or <a href="' + link + '" target="_blank" rel="noopener">book on WhatsApp</a>.';
      $('bkError').hidden = false;
    });
  });



  /* ---------- Full Terms & Conditions inside the booking (read to the end, then accept) ---------- */
  var termsHtml = null, termsLoading = null;
  function loadTerms() {
    if (termsHtml) return showTerms();
    if (termsLoading) return;
    termsLoading = fetch('terms.html', { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, 'text/html'), art = doc.querySelector('.lg-doc');
      if (!art) throw new Error('no terms');
      ['.lg-k', 'h1', '.lg-upd', '.lg-contact'].forEach(function (sel) { art.querySelectorAll(sel).forEach(function (n) { n.remove(); }); });
      art.querySelectorAll('a[href]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
      termsHtml = art.innerHTML; showTerms();
    }).catch(function () {
      termsLoading = null;
      $('bkTcText').innerHTML = '<p>The terms could not load here. Please read them on the <a href="terms" target="_blank" rel="noopener">Terms page</a>, then tick to accept.</p>';
      termsRead(true);
    });
  }
  function showTerms() {
    var box = $('bkTcText');
    if (!box.dataset.loaded) { box.innerHTML = termsHtml; box.dataset.loaded = '1'; }
    if (!state.termsRead) box.scrollTop = 0;
    checkRead();
  }
  function termsRead(on) {
    state.termsRead = on;
    $('bkTerms').disabled = !on;
    $('bkTc').classList.toggle('read', on);
    $('bkTcHint').innerHTML = on ? I('check') + 'You have read the terms. Tick the box to accept.' : I('arrow') + 'Scroll to the end of the terms to accept';
  }
  function checkRead() {
    var b = $('bkTcText');
    if (!state.termsRead && b.scrollTop + b.clientHeight >= b.scrollHeight - 12) termsRead(true);
  }
  $('bkTcText').addEventListener('scroll', checkRead, { passive: true });
  $('bkTcFull').addEventListener('click', function () { $('bkTc').classList.add('full'); document.documentElement.classList.add('bk-tc-lock'); setTimeout(checkRead, 50); });
  $('bkTcDone').addEventListener('click', function () { $('bkTc').classList.remove('full'); document.documentElement.classList.remove('bk-tc-lock'); });

  /* ---------- Google sign-in (details are kept across the sign-in page) ---------- */
  var DRAFT = 'ng_bk_draft';
  function saveDraft(guests, phone, email) {
    try { sessionStorage.setItem(DRAFT, JSON.stringify({ trip: state.trip.id, style: state.style, batch: state.batch, variant: state.variant, date: state.date, pax: state.pax, guests: guests, phone: phone, email: email, terms: $('bkTerms').checked, t: Date.now() })); } catch (e) {}
  }
  $('bkGoogle').addEventListener('click', function () {
    if (!window.NGAuth) { $('bkAuthErr').textContent = 'Sign-in could not load. Please refresh the page.'; $('bkAuthErr').hidden = false; return; }
    this.disabled = true;
    NGAuth.signIn().then(function (r) { if (r && r.error) throw r.error; }).catch(function (e) {
      $('bkGoogle').disabled = false; $('bkAuthErr').textContent = 'Google sign-in failed: ' + (e.message || e); $('bkAuthErr').hidden = false;
    });
  });
  function resumeDraft() {
    var d; try { d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); } catch (e) {}
    if (!d || Date.now() - d.t > 3600e3 || !NG.trip(d.trip) || !NGAuth.user()) return;
    sessionStorage.removeItem(DRAFT);
    open(d.trip, { style: d.style, batch: d.batch, variant: d.variant });
    state.date = d.date || ''; state.pax = d.pax || 1; state.guests = d.guests || [];
    go(2);
    $('bkPhone').value = d.phone || ''; if (d.email) $('bkEmail').value = d.email; if (d.terms) { termsRead(true); $('bkTerms').checked = true; }
    setTimeout(function () { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }, 50);
  }
  document.addEventListener('ng:auth', function () {
    if (window.NGAuth && NGAuth.user()) { if (NG.DB && NG.DB.live) resumeDraft(); else document.addEventListener('ng:catalog', function once() { document.removeEventListener('ng:catalog', once); resumeDraft(); }); }
    if (!bk.hidden && state.step === 2) renderStep2();
  });

  /* ---------- Step 3: one ID per traveller, then pay ---------- */
  var ID_NAMES = { aadhaar: 'Aadhaar (masked)', dl: 'Driving licence', voter: 'Voter ID', passport: 'Passport' };
  function renderIdsHead() {
    var t = state.trip, st = NG.style(state.style);
    $('bkIdsPicked').innerHTML = '<div><b>' + esc(t.title) + '</b><span>' + esc(st ? st.name : '') + ' · Booking ' + esc(state.paidRef || '') + '</span></div>';
    $('bkError3').hidden = true;
    renderPayOpts();
  }
  function amounts() {
    var total = state.payTotal || 0, n = (state.T && state.T.seats) || guestCount();
    var adv = NG.advanceFor(state.trip, total, n);
    return { total: total, adv: adv, bal: total - adv };
  }
  function renderPayOpts() {
    var a = amounts(); if (a.adv >= a.total) state.payKind = 'full';
    if (!state.payKind) state.payKind = 'advance';
    $('bkPayOpts').innerHTML = (a.adv < a.total ? '<button type="button" role="radio" aria-checked="' + (state.payKind === 'advance') + '" data-paykind="advance"><b>Pay advance ' + NG.fmt(a.adv) + '</b><small>Balance ' + NG.fmt(a.bal) + ' due 3 days before the trip</small></button>' : '') +
      '<button type="button" role="radio" aria-checked="' + (state.payKind === 'full') + '" data-paykind="full"><b>Pay full ' + NG.fmt(a.total) + '</b><small>Nothing more to pay later</small></button>' +
      '<p class="bk-paytotal">Trip total <b>' + NG.fmt(a.total) + '</b>' + (state.trip && state.trip.advance_per_person ? ' · Flight trip advance ' + NG.fmt(state.trip.advance_per_person) + ' per traveller' : ' · Advance is ₹500 per traveller or 50%, whichever is higher') + '</p>';
    $('bkPayNowText').textContent = state.payKind === 'full' ? 'Pay ' + NG.fmt(a.total) : 'Pay advance ' + NG.fmt(a.adv);
    syncPay();
  }
  function syncPay() {
    var T = state.T; if (!T) { $('bkPayNow').disabled = true; return; }
    var done = T.guests.filter(function (_, i) { var k = kycOf(i); return k && k.status !== 'rejected'; }).length;
    $('bkPayNow').disabled = done !== T.guests.length;
  }
  function loadIds() {
    $('bkIdList').innerHTML = '<p class="et-muted">Loading…</p>';
    return NGAuth.fn('ticket', { action: 'get', ref: state.paidRef }).then(function (T) { state.T = T; renderIds(); }, function (e) {
      $('bkIdList').innerHTML = '<p class="bk-error">' + esc(e.message) + '</p>';
    });
  }
  function kycOf(i) { return ((state.T && state.T.kyc) || []).filter(function (k) { return k.guest_index === i; })[0]; }
  function renderIds() {
    var T = state.T, ids = T.kyc_ids;
    $('bkIdNote').innerHTML = I('info') + (ids.length === 1 && ids[0] === 'passport' ? 'This is an international trip: a valid <b>passport</b> is required for every traveller.'
      : ids.length === 2 && ids.indexOf('passport') >= 0 && ids.indexOf('aadhaar') >= 0 ? 'This trip includes a flight: please upload a <b>passport</b> or <b>Aadhaar</b> for every traveller. For Aadhaar, use the <b>masked Aadhaar</b> (only the last 4 digits visible) from <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noopener">myaadhaar.uidai.gov.in</a> or DigiLocker.'
      : 'Accepted: masked Aadhaar, driving licence, voter ID or passport. For Aadhaar, use the <b>masked Aadhaar</b> (only the last 4 digits visible) from <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noopener">myaadhaar.uidai.gov.in</a> or DigiLocker.');
    var done = 0;
    $('bkIdList').innerHTML = T.guests.map(function (g, i) {
      var k = kycOf(i), ok = k && k.status !== 'rejected'; if (ok) done++;
      var cls = !k ? 'todo' : k.status === 'approved' ? 'ok' : k.status === 'rejected' ? 'bad' : 'wait';
      var label = !k ? 'ID needed' : k.status === 'approved' ? 'Approved' : k.status === 'rejected' ? 'Please upload again' : 'Uploaded';
      var sel = state.idChoice[i] || (k && ids.indexOf(k.id_type) >= 0 ? k.id_type : ids[0]);
      return '<div class="et-kp ' + cls + '"><div class="et-kp-who"><span class="et-kp-n">' + (i + 1) + '</span><div><b>' + esc(g.name) + '</b><small>' + (g.age != null ? g.age + ' yrs · ' : '') + (k ? ID_NAMES[k.id_type] : 'No ID yet') + '</small></div>' +
        '<em class="et-chip ' + cls + '">' + (ok ? I('check') : '') + label + '</em></div>' +
        (k && k.status === 'rejected' && k.note ? '<p class="et-kp-note">' + esc(k.note) + '</p>' : '') +
        (k && k.status === 'approved' ? '' : '<div class="et-kp-up"><select data-idtype="' + i + '" aria-label="ID type for ' + esc(g.name) + '">' + ids.map(function (x) { return '<option value="' + x + '"' + (x === sel ? ' selected' : '') + '>' + ID_NAMES[x] + '</option>'; }).join('') + '</select>' +
          '<label class="btn btn-ghost btn-sm et-file">' + I('camera') + '<span>' + (state.idBusy[i] || (k ? 'Replace' : 'Upload photo or PDF')) + '</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-idfile="' + i + '" hidden' + (state.idBusy[i] ? ' disabled' : '') + '></label></div>') +
      '</div>';
    }).join('');
    var all = done === T.guests.length;
    renderPayOpts();
    $('bkIdsFine').textContent = all ? 'All IDs are in. Pay to confirm your seats.' : (T.guests.length - done) + ' of ' + T.guests.length + ' ID' + (T.guests.length > 1 ? 's' : '') + ' still needed. Pay unlocks when every traveller has an ID. You can also finish later from My trips.';
  }
  // Phone photos are often 5–10 MB: shrink images to ~1800px JPEG before upload (PDFs go as they are)
  function prepareFile(file) {
    if (file.type === 'application/pdf') return file.size <= 5 * 1024 * 1024 ? Promise.resolve(file) : Promise.reject(new Error('This PDF is over 5 MB. Please upload a photo instead.'));
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('Please choose a photo or a PDF.'));
    return new Promise(function (ok, no) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var sc = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b && b.size <= 5 * 1024 * 1024 ? ok(b) : no(new Error('This photo is too large. Please try another.')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error('This photo could not be read. Please try a JPG or PNG.')); };
      img.src = url;
    });
  }
  function uploadId(i, file) {
    $('bkError3').hidden = true;
    var type = state.idChoice[i] || (bk.querySelector('[data-idtype="' + i + '"]') || {}).value, blob;
    state.idBusy[i] = 'Uploading…'; renderIds();
    prepareFile(file).then(function (b) { blob = b; return NGAuth.fn('ticket', { action: 'kyc_upload', ref: state.paidRef, guest_index: i, id_type: type, content_type: b.type || 'application/pdf' }); })
      .then(function (u) { return fetch(u.signed_url, { method: 'PUT', headers: { 'Content-Type': blob.type, 'x-upsert': 'false' }, body: blob }).then(function (r) { if (!r.ok) throw new Error('Upload failed. Please check your internet and try again.'); return u.path; }); })
      .then(function (path) { return NGAuth.fn('ticket', { action: 'kyc_save', ref: state.paidRef, guest_index: i, id_type: type, path: path }); })
      .then(function () { delete state.idBusy[i]; return loadIds(); })
      .catch(function (e) { delete state.idBusy[i]; renderIds(); $('bkError3').textContent = e.message || 'Upload failed. Please try again.'; $('bkError3').hidden = false; });
  }
  bk.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.idtype != null) state.idChoice[+el.dataset.idtype] = el.value;
    if (el.dataset.idfile != null && el.files[0]) { var f = el.files[0]; el.value = ''; uploadId(+el.dataset.idfile, f); }
  });
  bk.addEventListener('click', function (e) {
    if (e.target.closest('.et-file') && !$('bkConsent').checked) {
      e.preventDefault(); var c = $('bkConsent').closest('.et-consent'); c.classList.add('shake'); setTimeout(function () { c.classList.remove('shake'); }, 600);
      $('bkError3').textContent = 'Please tick the consent box first.'; $('bkError3').hidden = false; return;
    }
    if (e.target.closest('[data-auth-back]')) { go(2); return; }
    if (e.target.closest('[data-signout]')) { NGAuth.signOut().then(function () { renderStep2(); }); }
  });
  $('bkPayNow').addEventListener('click', function () { startPayment(); });
  $('bkTerms').addEventListener('change', function () { if (this.checked) $('bkError').hidden = true; });
  $('bkPayOpts').addEventListener('click', function (e) { var b = e.target.closest('[data-paykind]'); if (b) { state.payKind = b.dataset.paykind; renderPayOpts(); } });

  // Continue an unpaid booking (from My trips)
  function resume(ref, tripId, total) {
    open(tripId);
    state.paidRef = ref; state.payTotal = total || 0; state.payKind = 'advance';
    go(3); loadIds();
  }
  // Pay the balance after the advance (from My trips)
  function payBalance(ref, tripId) {
    open(tripId);
    state.paidRef = ref; state.ref = ref; state.payKind = 'balance';
    $('bkFormView').hidden = true; $('bkDoneView').hidden = false; $('bkDoneView').classList.remove('is-pending');
    $('bkDoneTitle').textContent = 'Pay balance'; $('bkDoneText').textContent = 'Opening the secure payment page…';
    $('bkReceipt').innerHTML = ''; ['bkRetry', 'bkTicket'].forEach(function (id) { $(id).hidden = true; });
    startPayment();
  }

  $('bkDownload').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([state.summary], { type: 'text/plain' }));
    a.download = state.ref + '.txt'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('bkTrip').addEventListener('change', function () { state.trip = NG.trip(this.value); state.batch = null; state.month = null; renderStep1(); });
  bk.addEventListener('change', function (e) { if (e.target.id === 'bkDate') { state.date = e.target.value; renderCalendar([]); } });
  bk.addEventListener('click', function (e) {
    var x;
    if (e.target === bk || e.target.closest('[data-bk-close]')) { close(); return; }
    if ((x = e.target.closest('#bkStyles [data-style]'))) { state.style = x.dataset.style; state.batch = null; state.month = null; renderStep1(); return; }
    if ((x = e.target.closest('#bkVariants [data-variant]'))) { state.variant = x.dataset.variant; renderStep1(); return; }
    if ((x = e.target.closest('#bkStep1 [data-batch]'))) { state.batch = x.dataset.batch; $('bkError1').hidden = true; renderStep1(); return; }
    if ((x = e.target.closest('#bkCal [data-date]'))) { state.date = x.dataset.date; var di = $('bkDate'); if (di) di.value = state.date; renderCalendar([]); return; }
    if ((x = e.target.closest('#bkCal [data-month]'))) { shiftMonth(+x.dataset.month); return; }
    if (e.target.closest('[data-back]')) { go(1); return; }
    if ((x = e.target.closest('[data-step]'))) { state.pax = Math.max(1, Math.min(maxPax(), state.pax + Number(x.dataset.step))); renderGuests(); renderTotal(); }
  });
  document.addEventListener('keydown', function (e) {
    if (bk.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // keep focus inside the card
      var f = [].slice.call(bk.querySelectorAll('button:not([disabled]),select,input,a[href]')).filter(function (el) { return !el.closest('[hidden]') && el.offsetParent !== null; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-book]');
    if (!el || el.closest('#bk')) return;
    e.preventDefault();
    open(el.dataset.book || null, { style: el.dataset.style, batch: el.dataset.batch, variant: el.dataset.variant });
  });
  // Floating button hides near the page footer and over the home hero (it has its own Book buttons)
  var fab = document.querySelector('.book-fab'), foot = document.querySelector('footer');
  var hero = document.getElementById('map'), top = document.getElementById('home'), hidden = { foot: false, hero: false, top: false };
  function syncFab() { fab.classList.toggle('away', hidden.foot || hidden.hero || hidden.top); }
  if (fab && 'IntersectionObserver' in window) {
    if (foot) new IntersectionObserver(function (en) { hidden.foot = en[0].isIntersecting; syncFab(); }, { threshold: 0.15 }).observe(foot);
    if (top) new IntersectionObserver(function (en) { hidden.top = en[0].intersectionRatio > 0.35; syncFab(); }, { threshold: [0, 0.35, 0.6, 1] }).observe(top);
    if (hero) new IntersectionObserver(function (en) { hidden.hero = en[0].intersectionRatio > 0.35; syncFab(); }, { threshold: [0, 0.35, 0.6, 1] }).observe(hero);
  }
  document.addEventListener('ng:catalog', function () { fillTrips(); if (!bk.hidden && state.trip) { state.trip = NG.trip(state.trip.id) || NG.TRIPS[0]; go(state.step); } });
  document.addEventListener('ng:batches', function () { if (!bk.hidden && state.trip && state.step === 1) renderStep1(); });
  if (/^#book/.test(location.hash)) { var id = location.hash.split('=')[1]; setTimeout(function () { open(id); }, 300); }
  window.NGBooking = { open: open, close: close, resume: resume, payBalance: payBalance };
  if (window.NGAuth && NGAuth.ready() && NGAuth.user()) resumeDraft();
})();
