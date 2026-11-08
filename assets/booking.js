/* Nandi Go booking card — shared by every page.
 * Step 1: travel style + date (a calendar of that trip's batches for the style).
 * Step 2: traveller details. The request is saved in Supabase and sent on WhatsApp.
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
    '    <p class="bk-sum-pay">' + I('shield') + '<span>Pay only to Nandi Go\'s official UPI / bank account, after our coordinator confirms your booking.</span></p>' +
    '   </div>' +
    '  </aside>' +
    '  <div class="bk-main">' +
    '   <div id="bkFormView">' +
    '    <div class="bk-steps" aria-hidden="true"><span id="bkS1" class="on">1 · Dates</span><i></i><span id="bkS2">2 · Your details</span></div>' +
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
    '     <label class="bk-field"><span>Full name</span><input id="bkName" autocomplete="name" required maxlength="80" placeholder="Your name"></label>' +
    '     <label class="bk-field"><span>WhatsApp number</span><input id="bkPhone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="10-digit mobile"></label>' +
    '     <label class="bk-field"><span>Email <small>(optional)</small></span><input id="bkEmail" type="email" autocomplete="email" placeholder="you@example.com"></label>' +
    '     <div class="bk-total bk-wide"><div><span>Estimated total</span><strong id="bkTotal"></strong><small id="bkTotalNote"></small></div><div class="bk-adv" id="bkAdvance"></div></div>' +
    '     <p class="bk-error bk-wide" id="bkError" role="alert" hidden></p>' +
    '     <button type="submit" class="btn btn-forest bk-submit bk-wide">' + I('send') + 'Send booking request</button>' +
    '     <p class="bk-fine bk-wide">This saves your request and opens WhatsApp with your details for the Nandi Go team. No payment is taken on this website.</p>' +
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
  function renderStep2() {
    var t = state.trip, st = NG.style(state.style), b = batchObj(), p = priceNow();
    state.pax = Math.min(state.pax, maxPax());
    $('bkPicked').innerHTML = '<div><b>' + esc(t.title) + '</b><span>' + esc(st ? st.name : '') + (state.variant ? ' · ' + esc(t.variants.filter(function (v) { return v.id === state.variant; })[0].label) : '') + '</span>' +
      '<span>' + I('calendar') + (b ? esc(b.label) + ' · ' + dateRange(b) : (state.date ? 'Preferred: ' + shortDate(state.date) + ' ' + state.date.slice(0, 4) : 'Dates flexible')) + '</span></div>' +
      '<button type="button" class="bk-link" data-back>Change</button>';
    $('bkPaxLabel').textContent = p.unit === 'couple' ? 'Couples' : 'Travellers';
    $('bkPaxNote').textContent = b && b.live ? b.left + ' seat' + (b.left === 1 ? '' : 's') + ' left in this batch' : '';
    renderTotal();
  }
  function renderTotal() {
    var p = priceNow();
    $('bkPax').textContent = state.pax;
    $('bkTotal').textContent = NG.fmt(p.price * state.pax);
    $('bkTotalNote').textContent = NG.fmt(p.price) + ' × ' + state.pax + ' ' + unitWord(p.unit, state.pax);
    $('bkAdvance').innerHTML = state.trip.group === 'retreat'
      ? '<b>₹1,000 advance</b><span>reserves your seat · balance on arrival</span>'
      : '<b>Advance on confirmation</b><span>amount shared by our coordinator</span>';
  }

  function go(step) {
    state.step = step;
    $('bkStep1').hidden = step !== 1; form.hidden = step !== 2;
    $('bkS1').classList.toggle('on', step === 1); $('bkS2').classList.toggle('on', step === 2);
    $('bkTitle').textContent = step === 1 ? 'Choose your dates' : 'Your details';
    if (step === 1) renderStep1(); else renderStep2();
    bk.querySelector('.bk-main').scrollTop = 0;
  }

  function open(id, opts) {
    opts = opts || {};
    var t = NG.trip(id) || state.trip || NG.TRIPS[0];
    var styleOk = function (s) { return s && visibleStyles().some(function (x) { return x.id === s; }); };
    state.trip = t;
    state.style = styleOk(opts.style) ? opts.style : (styleOk(state.style) ? state.style : (visibleStyles()[0] || NG.STYLES[0]).id);
    state.batch = opts.batch || null; state.variant = opts.variant || null; state.month = null; state.date = '';
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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = state.trip, name = $('bkName').value.trim(), phone = cleanPhone($('bkPhone').value), email = $('bkEmail').value.trim();
    var err = '';
    if (!name) err = 'Please enter your name.';
    else if (!/^[6-9]\d{9}$/.test(phone)) err = 'Please enter a valid 10-digit mobile number.';
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err = 'Please check the email address.';
    if (err) { $('bkError').textContent = err; $('bkError').hidden = false; return; }
    $('bkError').hidden = true;

    var st = NG.style(state.style), b = batchObj(), p = priceNow();
    var variant = t.variants ? t.variants.filter(function (v) { return v.id === state.variant; })[0] : null;
    var when = b ? b.label + ' (' + dateRange(b) + ')' : (state.date ? new Date(state.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' (preferred)' : 'Flexible');
    state.ref = 'NG-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 4).replace(/[^A-Z0-9]/g, '0');
    var rows = [
      ['Reference', state.ref], ['Trip', t.title + (variant ? ' — ' + variant.label : '')], ['Travel style', st ? st.name : ''], ['Date', when],
      ['Travellers', state.pax + ' ' + unitWord(p.unit, state.pax)], ['Estimated total', NG.fmt(p.price * state.pax)],
      ['Name', name], ['WhatsApp', phone]
    ];
    if (email) rows.push(['Email', email]);
    if (refCode()) rows.push(['Partner code', refCode()]);
    $('bkReceipt').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    var msg = 'Hi Nandi Go! I would like to book a trip.\n\n' + rows.map(function (r) { return '• ' + r[0] + ': ' + r[1]; }).join('\n') +
      '\n\nPlease confirm availability and share the payment details.';
    state.summary = 'NANDI GO — BOOKING REQUEST\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
      '\n\nPay only to Nandi Go\'s official UPI / bank account after confirmation.\nWhatsApp: ' + NG.PHONES[0];
    var link = 'https://wa.me/' + NG.WHATSAPP + '?text=' + encodeURIComponent(msg);
    $('bkWa').href = link;

    var row = {
      ref: state.ref, trip_id: t.id, trip_title: t.title, style_id: state.style, variant: variant ? variant.label : null,
      batch_id: b && b.live ? b.id : null, travel_date: b ? b.start : (state.date || null),
      travellers: state.pax, unit: p.unit, estimated_total: p.price * state.pax,
      name: name.slice(0, 80), phone: phone, email: email || null, partner_code: refCode()
    };
    var submitBtn = form.querySelector('[type=submit]');
    var w = window.open('', '_blank'); // open now so the pop-up is not blocked
    if (submitBtn) submitBtn.disabled = true;
    var save = NG.DB ? NG.DB.insert('bookings', row) : Promise.resolve(false);
    save.then(finish, function (e) {
      console.warn('Nandi Go: booking not saved', e);
      if (/no longer open/i.test(e.message)) {
        if (w) w.close();
        if (submitBtn) submitBtn.disabled = false;
        if (NG.refreshBatches) NG.refreshBatches().then(function () { go(1); $('bkError1').textContent = 'Sorry, that batch just filled up. Please choose another date.'; $('bkError1').hidden = false; });
        return;
      }
      finish();
    });
    function finish() {
      if (submitBtn) submitBtn.disabled = false;
      $('bkFormView').hidden = true; $('bkDoneView').hidden = false;
      if (w) { try { w.opener = null; w.location.href = link; } catch (x) { window.open(link, '_blank', 'noopener'); } }
    }
  });

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
    if ((x = e.target.closest('[data-step]'))) { state.pax = Math.max(1, Math.min(maxPax(), state.pax + Number(x.dataset.step))); renderTotal(); }
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
  window.NGBooking = { open: open, close: close };
})();
