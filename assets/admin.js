/* Nandi Go — admin page (Google sign-in through Supabase).
 * Only emails listed in the database table "admins" can read or change data; the rules are enforced by the database. */
(function () {
  var SB_URL = 'https://hvxzgvigrlkovehfwtob.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eHpndmlncmxrb3ZlaGZ3dG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMTMwNzUsImV4cCI6MjEwOTY4OTA3NX0.fdLsA5H8rw-iRTd9-_5uM4lrkfb94dEvkZf8DAltaeg';
  var sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });

  var DISTRICTS = ['Bagalkote','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban','Bidar','Chamarajanagar','Chikkaballapura','Chikkamagaluru','Chitradurga','Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mysuru','Raichur','Ramanagara','Shivamogga','Tumakuru','Udupi','Uttara Kannada','Vijayanagara','Vijayapura','Yadgir'];
  var KIT_TARGET = 10; // confirmed persons before the ₹4,999 kit is refunded
  var S = { batches: [], bookings: [], partners: [], kyc: [], reviews: [], settings: {}, trips: [], styles: [], tab: 'overview' };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return n == null || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN'); };
  var day = function (d) { return d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };
  var range = function (b) { return day(b.start_date) + ' – ' + day(b.end_date); };
  var today = function () { return NG.todayISO(); };
  var seatsOf = function (k) { return k.travellers * (k.unit === 'couple' ? 2 : 1); };
  var tripName = function (id) { var t = byId(S.trips, id) || NG.trip(id); return t ? t.title : id; };
  var styleName = function (id) { var st = NG.style(id); return st ? st.name : (id || ''); };
  var unitFor = function (styleId, trip) { return styleId === 'couples' || (trip && trip.unit === 'couple') ? 'couple' : 'person'; };
  var STATUS_LABEL = { new: 'Awaiting payment', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', open: 'Open', full: 'Full', closed: 'Closed', applied: 'Applied', approved: 'Approved', active: 'Active', paused: 'Paused', rejected: 'Rejected', terminated: 'Terminated' };
  var pill = function (s) { return '<span class="ad-pill s-' + esc(s) + '">' + esc(STATUS_LABEL[s] || s) + '</span>'; };

  function toast(msg, bad) {
    var t = $('adToast'); t.textContent = msg; t.className = 'ad-toast' + (bad ? ' bad' : ''); t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 3600);
  }
  function friendly(e) {
    var m = (e && (e.message || e.error_description)) || String(e);
    if (/partners_one_per_district/.test(m)) return 'This district already has an approved District Partner. Pause or end that partner first.';
    if (/partner_code/.test(m) && /duplicate|unique/i.test(m)) return 'That partner code is already used.';
    if (/bookings_phone_check|partners_phone_check/.test(m)) return 'Phone must be a 10-digit Indian mobile number.';
    if (/end_date >= start_date|batches_check/.test(m)) return 'End date must be on or after the start date.';
    return m;
  }

  /* ---------------- Sign in ---------------- */
  $('adSignIn').addEventListener('click', function () {
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } })
      .then(function (r) { if (r.error) gateMsg('Google sign-in is not switched on yet: ' + r.error.message); });
  });
  function signOut() { sb.auth.signOut().then(function () { location.hash = ''; showGate(); }); }
  $('adSignOut').addEventListener('click', signOut);
  $('adSignOutGate').addEventListener('click', signOut);
  function gateMsg(m) { $('adGateText').textContent = m; }
  function showGate(msg) {
    $('adApp').hidden = true; $('adGate').hidden = false;
    gateMsg(msg || 'Sign in with the Nandi Go Google account to manage batches, bookings and partners.');
    $('adSignOutGate').hidden = !msg;
  }
  var started = false;
  function check(session) {
    if (!session) { showGate(); return; }
    sb.rpc('is_admin').then(function (r) {
      if (r.error || !r.data) { showGate('The account ' + session.user.email + ' is not a Nandi Go admin.'); return; }
      $('adEmail').textContent = session.user.email;
      $('adGate').hidden = true; $('adApp').hidden = false;
      if (!started) { started = true; go((location.hash.slice(1) || 'overview')); loadAll(); }
    });
  }
  sb.auth.getSession().then(function (r) { check(r.data.session); });
  sb.auth.onAuthStateChange(function (ev, session) { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') check(session); });

  /* ---------------- Tabs ---------------- */
  function go(tab) {
    if (!document.querySelector('[data-panel="' + tab + '"]')) tab = 'overview';
    S.tab = tab;
    document.querySelectorAll('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === tab); });
    document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== tab; });
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', '#' + tab);
    if (tab === 'settings') loadMailLog();
  }
  document.querySelector('.ad-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
  addEventListener('hashchange', function () { go(location.hash.slice(1)); });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-reload]')) loadAll(); });

  /* ---------------- Data ---------------- */
  function loadAll() {
    return Promise.all([
      sb.rpc('admin_batches'),
      sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(2000),
      sb.from('partners').select('*').order('created_at', { ascending: false }),
      sb.from('app_settings').select('key,value'),
      sb.from('trips').select('*').order('sort').order('title'),
      sb.from('styles').select('*').order('sort'),
      sb.from('partner_kyc').select('*').order('created_at', { ascending: false }),
      sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(500)
    ]).then(function (r) {
      var bad = r.filter(function (x) { return x.error; })[0];
      if (bad) { toast(friendly(bad.error), true); return; }
      S.batches = r[0].data; S.bookings = r[1].data; S.partners = r[2].data;
      S.settings = {}; r[3].data.forEach(function (x) { S.settings[x.key] = x.value; });
      S.trips = r[4].data; S.styles = r[5].data; S.kyc = r[6].data; S.reviews = r[7].data;
      renderAll();
    });
  }
  function renderAll() { renderOverview(); fillBatchFilters(); renderBatches(); fillBookingFilters(); renderBookings(); renderPartners(); renderSettings(); renderCatalog(); renderReviews(); }

  /* ---------------- Overview ---------------- */
  function renderOverview() {
    var t = today(), month = t.slice(0, 7);
    var newReq = S.bookings.filter(function (k) { return k.status === 'new'; });
    var conf = S.bookings.filter(function (k) { return k.status === 'confirmed' || k.status === 'completed'; });
    var confMonth = conf.filter(function (k) { return k.created_at.slice(0, 7) === month; });
    var live = S.batches.filter(function (b) { return b.end_date >= t && b.status !== 'completed'; });
    var waiting = S.partners.filter(function (p) { return p.status === 'applied'; });
    var refunds = S.partners.filter(function (p) { return refundDue(p); });
    var paid = conf.reduce(function (s, k) { return s + (k.amount_paid || 0); }, 0);
    $('adNewCount').hidden = !newReq.length; $('adNewCount').textContent = newReq.length;
    var stat = function (n, l, tab) { return '<button class="ad-stat" data-goto="' + tab + '"><b>' + n + '</b><span>' + l + '</span></button>'; };
    $('adStats').innerHTML =
      stat(newReq.length, 'New booking requests', 'bookings') +
      stat(confMonth.reduce(function (s, k) { return s + seatsOf(k); }, 0), 'Persons confirmed this month', 'bookings') +
      stat(fmt(paid), 'Amount received (confirmed)', 'bookings') +
      stat(live.length, 'Upcoming batches', 'batches') +
      stat(waiting.length, 'Partner applications to review', 'partners') +
      stat(refunds.length, 'Kit refunds due', 'partners') +
      stat(S.reviews.filter(function (x) { return x.status === 'pending'; }).length, 'Reviews to approve', 'reviews');
    $('adOvBatches').innerHTML = live.length ? live.slice().sort(function (a, b) { return a.start_date < b.start_date ? -1 : 1; }).map(batchRow).join('') : '<p class="ad-empty">No upcoming batches. Create one in Batches.</p>';
    $('adOvBookings').innerHTML = newReq.length ? newReq.slice(0, 6).map(function (k) {
      return '<button class="ad-mini" data-edit-booking="' + k.id + '"><b>' + esc(k.name) + '</b><span>' + esc(k.trip_title) + ' · ' + seatsOf(k) + ' seat' + (seatsOf(k) > 1 ? 's' : '') + '</span><em>' + day(k.created_at.slice(0, 10)) + '</em></button>';
    }).join('') : '<p class="ad-empty">No new requests.</p>';
  }
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });

  /* ---------------- Batches ---------------- */
  function batchRow(b) {
    var pct = Math.min(100, Math.round(b.seats_taken / b.seats_total * 100));
    return '<div class="ad-batch s-' + b.status + '">' +
      '<div class="ad-batch-main"><b>' + esc(tripName(b.trip_id)) + '</b><span><i class="ad-style s-' + esc(b.style_id) + '">' + esc(styleName(b.style_id)) + '</i> ' + esc(b.label) + (b.price ? ' · ' + fmt(b.price) : '') + '</span><em>' + range(b) + '</em></div>' +
      '<div class="ad-seat"><div class="ad-bar"><i style="width:' + pct + '%"></i></div><span><b>' + b.seats_taken + '</b> of ' + b.seats_total + ' seats confirmed' + (b.requests ? ' · ' + b.requests + ' new request' + (b.requests > 1 ? 's' : '') : '') + '</span></div>' +
      pill(b.status) +
      '<div class="ad-row-actions">' +
        '<button class="btn btn-ghost btn-sm" data-edit-batch="' + b.id + '">Edit</button>' +
        (b.status === 'open' ? '<button class="btn btn-ghost btn-sm" data-batch-status="closed" data-id="' + b.id + '">Stop booking</button>' : '') +
        (b.status === 'closed' || b.status === 'full' ? '<button class="btn btn-ghost btn-sm" data-batch-status="open" data-id="' + b.id + '">Reopen</button>' : '') +
        (b.status !== 'completed' ? '<button class="btn btn-ghost btn-sm" data-batch-status="completed" data-id="' + b.id + '">Mark completed</button>' : '') +
        '<button class="btn btn-ghost btn-sm" data-copy-batch="' + b.id + '">Copy as new</button>' +
        '<button class="btn btn-ghost btn-sm" data-goto-batch="' + b.id + '">Bookings</button>' +
      '</div></div>';
  }
  function renderBatches() {
    var t = today(), past = $('adShowPast').checked;
    var ft = $('adBaTrip').value, fs = $('adBaStyle').value;
    var list = S.batches.filter(function (b) { return (past || (b.status !== 'completed' && b.end_date >= t)) && (!ft || b.trip_id === ft) && (!fs || b.style_id === fs); })
      .sort(function (a, b) { return a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0; });
    $('adBatchList').innerHTML = list.length ? list.map(batchRow).join('') : '<p class="ad-empty">No upcoming batches. Use “New batch”.</p>';
  }
  $('adShowPast').addEventListener('change', renderBatches);
  function fillBatchFilters() {
    var tv = $('adBaTrip').value, sv = $('adBaStyle').value;
    $('adBaTrip').innerHTML = '<option value="">All trips</option>' + S.trips.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>'; }).join('');
    $('adBaStyle').innerHTML = '<option value="">All styles</option>' + NG.STYLES.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
    $('adBaTrip').value = tv; $('adBaStyle').value = sv;
  }
  ['adBaTrip', 'adBaStyle'].forEach(function (id) { $(id).addEventListener('input', renderBatches); });
  $('adNewBatch').addEventListener('click', function () { editBatch(null); });

  function tripOptions(sel) {
    return S.trips.map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === sel ? ' selected' : '') + '>' + esc(t.title) + (t.active ? '' : ' (hidden)') + '</option>'; }).join('');
  }
  function styleOptions(sel) { return NG.STYLES.map(function (x) { return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join(''); }
  function editBatch(b, copy) {
    var isNew = !b || copy;
    var firstTrip = ($('adBaTrip').value || (S.trips[0] || {}).id);
    var src = b || { trip_id: firstTrip, style_id: $('adBaStyle').value || null, label: 'Batch ' + (S.batches.filter(function (x) { return x.trip_id === firstTrip; }).length + 1), seats_total: 20, status: 'open' };
    if (copy) src = { trip_id: b.trip_id, style_id: b.style_id, label: nextLabel(b.label), seats_total: b.seats_total, price: b.price, status: 'open', notes: b.notes };
    var styleField = isNew
      ? '<div class="ad-field"><span>Travel style <small>(tick several to create the same dates for each)</small></span><div class="ad-checks">' +
          NG.STYLES.map(function (x) { return '<label class="ad-check"><input type="checkbox" name="style_' + x.id + '"' + (x.id === src.style_id || (!src.style_id && x.id === 'friends') ? ' checked' : '') + '/> ' + esc(x.name) + '</label>'; }).join('') + '</div></div>'
      : '<label>Travel style<select name="style_id">' + styleOptions(src.style_id) + '</select></label>';
    modal(isNew ? 'New batch' : 'Edit batch',
      '<label>Trip<select name="trip_id">' + tripOptions(src.trip_id) + '</select></label>' + styleField +
      '<div class="ad-2"><label>Batch name<input name="label" required maxlength="80" value="' + esc(src.label) + '"/></label>' +
      '<label>Seats <small>(persons; a couple uses 2)</small><input name="seats_total" type="number" min="1" max="500" required value="' + esc(src.seats_total) + '"/></label></div>' +
      '<div class="ad-2"><label>Start date<input name="start_date" type="date" required value="' + esc(src.start_date || '') + '"/></label>' +
      '<label>End date<input name="end_date" type="date" required value="' + esc(src.end_date || '') + '"/></label></div>' +
      '<div class="ad-2"><label>Own price (₹) <small>(optional, else the trip price)</small><input name="price" type="number" min="0" value="' + esc(src.price == null ? '' : src.price) + '"/></label>' +
      (isNew ? '<span></span>' : '<label>Status<select name="status">' + ['open', 'full', 'closed', 'completed'].map(function (x) { return '<option value="' + x + '"' + (x === src.status ? ' selected' : '') + '>' + STATUS_LABEL[x] + '</option>'; }).join('') + '</select></label>') + '</div>' +
      '<label>Notes (only you see these)<textarea name="notes" rows="2">' + esc(src.notes || '') + '</textarea></label>' +
      '<p class="ad-hint">Couple Escape prices are per couple. Leave "Own price" empty to use the trip\'s price for that style.</p>',
      function (v) {
        var row = { trip_id: v.trip_id, label: v.label.trim(), seats_total: +v.seats_total, start_date: v.start_date, end_date: v.end_date,
                    price: v.price === '' ? null : +v.price, notes: v.notes.trim() || null };
        if (!row.label || !row.start_date || !row.end_date || !(row.seats_total > 0)) throw new Error('Please fill name, seats and both dates.');
        if (row.end_date < row.start_date) throw new Error('End date must be on or after the start date.');
        if (!isNew) { row.status = v.status; row.style_id = v.style_id; return sb.from('batches').update(row).eq('id', b.id); }
        var picked = NG.STYLES.filter(function (x) { return v['style_' + x.id]; });
        if (!picked.length) throw new Error('Tick at least one travel style.');
        return sb.from('batches').insert(picked.map(function (x) { return Object.assign({ style_id: x.id }, row); }));
      },
      isNew ? null : function () {
        var n = S.bookings.filter(function (k) { return k.batch_id === b.id; }).length;
        if (!confirm('Delete ' + b.label + '?' + (n ? ' Its ' + n + ' booking(s) stay saved but lose the batch link.' : ''))) return null;
        return sb.from('batches').delete().eq('id', b.id);
      });
  }
  function nextLabel(l) { var m = /^(.*?)(\d+)$/.exec(l); return m ? m[1] + (+m[2] + 1) : l + ' (new)'; }
  document.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-edit-batch]'))) editBatch(byId(S.batches, x.dataset.editBatch));
    else if ((x = e.target.closest('[data-copy-batch]'))) editBatch(byId(S.batches, x.dataset.copyBatch), true);
    else if ((x = e.target.closest('[data-batch-status]'))) setBatchStatus(x.dataset.id, x.dataset.batchStatus);
    else if ((x = e.target.closest('[data-goto-batch]'))) { go('bookings'); $('adBkBatch').value = x.dataset.gotoBatch; renderBookings(); }
  });
  function setBatchStatus(id, status) {
    var b = byId(S.batches, id);
    if (status === 'completed' && !confirm('Mark ' + b.label + ' as completed? An email will be sent.')) return;
    if (status === 'open' && b.seats_taken >= b.seats_total) { toast('All seats are confirmed. Increase the seats (Edit) to reopen.', true); return; }
    sb.from('batches').update({ status: status }).eq('id', id).then(function (r) {
      if (r.error) toast(friendly(r.error), true); else { toast('Batch updated'); loadAll(); }
    });
  }
  var byId = function (list, id) { return list.filter(function (x) { return x.id === id; })[0]; };

  /* ---------------- Bookings ---------------- */
  function fillBookingFilters() {
    var trips = {}; S.bookings.forEach(function (k) { trips[k.trip_id] = k.trip_title; });
    var tv = $('adBkTrip').value, bv = $('adBkBatch').value;
    $('adBkTrip').innerHTML = '<option value="">All trips</option>' + Object.keys(trips).map(function (id) { return '<option value="' + esc(id) + '">' + esc(trips[id]) + '</option>'; }).join('');
    $('adBkBatch').innerHTML = '<option value="">All batches</option>' + S.batches.map(function (b) { return '<option value="' + b.id + '">' + esc(tripName(b.trip_id) + ' · ' + styleName(b.style_id) + ' · ' + b.label + ' · ' + day(b.start_date)) + '</option>'; }).join('');
    $('adBkTrip').value = tv; $('adBkBatch').value = bv;
    var sv = $('adBkStyle').value;
    $('adBkStyle').innerHTML = '<option value="">All styles</option>' + NG.STYLES.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('');
    $('adBkStyle').value = sv;
  }
  function filteredBookings() {
    var q = $('adBkSearch').value.trim().toLowerCase(), st = $('adBkStatus').value, tr = $('adBkTrip').value, ba = $('adBkBatch').value, sy = $('adBkStyle').value;
    return S.bookings.filter(function (k) {
      if (st && k.status !== st) return false;
      if (tr && k.trip_id !== tr) return false;
      if (ba && k.batch_id !== ba) return false;
      if (sy && k.style_id !== sy) return false;
      if (q && [k.ref, k.name, k.phone, k.email, k.partner_code].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function renderBookings() {
    var list = filteredBookings();
    $('adBkEmpty').hidden = !!list.length;
    $('adBkTable').tBodies[0].innerHTML = list.map(function (k) {
      var b = byId(S.batches, k.batch_id);
      return '<tr>' +
        '<td data-l="Reference"><b>' + esc(k.ref) + '</b><small>' + day(k.created_at.slice(0, 10)) + '</small></td>' +
        '<td data-l="Customer"><b>' + esc(k.name) + '</b><small><a href="https://wa.me/91' + esc(k.phone) + '" target="_blank" rel="noopener">' + esc(k.phone) + '</a>' + (k.email ? ' · ' + esc(k.email) : '') + '</small></td>' +
        '<td data-l="Trip">' + esc(k.trip_title) + (k.style_id ? '<small><i class="ad-style s-' + esc(k.style_id) + '">' + esc(styleName(k.style_id)) + '</i></small>' : '') + (k.variant ? '<small>' + esc(k.variant) + '</small>' : '') + (k.partner_code ? '<small>Partner ' + esc(k.partner_code) + '</small>' : '') + '</td>' +
        '<td data-l="Date">' + (b ? esc(b.label) + '<small>' + range(b) + '</small>' : day(k.travel_date)) + '</td>' +
        '<td data-l="Seats">' + seatsOf(k) + (k.unit === 'couple' ? '<small>' + k.travellers + ' couple' + (k.travellers > 1 ? 's' : '') + '</small>' : '') + '</td>' +
        '<td data-l="Estimate">' + fmt(k.estimated_total) + '</td>' +
        '<td data-l="Paid">' + (k.amount_paid ? fmt(k.amount_paid) : (k.advance_paid ? 'Advance' : '—')) + '</td>' +
        '<td data-l="Status">' + pill(k.status) + '</td>' +
        '<td class="ad-td-act">' + (k.status === 'new' ? '<button class="btn btn-gold btn-sm" data-quick-confirm="' + k.id + '">Confirm</button>' : '') +
          '<button class="btn btn-ghost btn-sm" data-edit-booking="' + k.id + '">Open</button></td></tr>';
    }).join('');
  }
  ['adBkSearch', 'adBkStatus', 'adBkTrip', 'adBkBatch', 'adBkStyle'].forEach(function (id) { $(id).addEventListener('input', renderBookings); });
  $('adNewBooking').addEventListener('click', function () { editBooking(null); });
  document.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-edit-booking]'))) editBooking(byId(S.bookings, x.dataset.editBooking));
    else if ((x = e.target.closest('[data-quick-confirm]'))) {
      sb.from('bookings').update({ status: 'confirmed' }).eq('id', x.dataset.quickConfirm).then(function (r) {
        if (r.error) toast(friendly(r.error), true); else { toast('Booking confirmed'); loadAll(); }
      });
    }
  });
  function batchOptions(tripId, styleId, sel) {
    var list = S.batches.filter(function (b) { return b.trip_id === tripId && (!styleId || b.style_id === styleId); });
    return '<option value="">No batch (own date)</option>' + list.map(function (b) {
      return '<option value="' + b.id + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.label + ' · ' + range(b) + ' · ' + b.seats_taken + '/' + b.seats_total + ' (' + (STATUS_LABEL[b.status]) + ')') + '</option>';
    }).join('');
  }
  function guestsBlock(k) {
    var g = k.guests || []; if (!g.length) return '';
    return '<div class="ad-box"><h4>Travellers (' + g.length + ')</h4><dl class="ad-dl">' + g.map(function (x, i) {
      return '<div><dt>' + (i === 0 ? 'Traveller 1 (booked)' : 'Traveller ' + (i + 1)) + '</dt><dd>' + esc(x.name || '') + (x.age != null ? ', ' + esc(x.age) + ' yrs' : '') + '</dd></div>';
    }).join('') + '</dl></div>';
  }
  function editBooking(k) {
    var isNew = !k;
    k = k || { trip_id: (S.trips[0] || {}).id, style_id: 'friends', travellers: 1, status: 'confirmed', unit: 'person' };
    var codes = S.partners.filter(function (p) { return p.partner_code; }).map(function (p) { return '<option value="' + esc(p.partner_code) + '">' + esc(p.name + ' · ' + (p.taluk || p.district)) + '</option>'; }).join('');
    modal(isNew ? 'Add booking' : 'Booking ' + k.ref,
      '<div class="ad-2"><label>Trip<select name="trip_id" id="mTrip">' + tripOptions(k.trip_id) + '</select></label>' +
      '<label>Travel style<select name="style_id" id="mStyle">' + styleOptions(k.style_id || 'friends') + '</select></label></div>' +
      '<div class="ad-2"><label>Batch<select name="batch_id" id="mBatch">' + batchOptions(k.trip_id, k.style_id, k.batch_id) + '</select></label>' +
      '<label>Travel date<input type="date" name="travel_date" value="' + esc(k.travel_date || '') + '"/></label></div>' +
      '<div class="ad-2"><label>Name<input name="name" required maxlength="80" value="' + esc(k.name || '') + '"/></label>' +
      '<label>WhatsApp number<input name="phone" required inputmode="numeric" value="' + esc(k.phone || '') + '"/></label></div>' +
      '<div class="ad-2"><label>Email<input name="email" type="email" value="' + esc(k.email || '') + '"/></label>' +
      '<label><span id="mPaxLabel">' + (k.unit === 'couple' ? 'Couples' : 'Travellers') + '</span><input name="travellers" type="number" min="1" max="30" required value="' + esc(k.travellers) + '"/></label></div>' +
      '<div class="ad-2"><label>Status<select name="status">' + ['new', 'confirmed', 'completed', 'cancelled'].map(function (s) { return '<option value="' + s + '"' + (s === k.status ? ' selected' : '') + '>' + STATUS_LABEL[s] + '</option>'; }).join('') + '</select></label>' +
      '<label>Partner code<input name="partner_code" list="mCodes" value="' + esc(k.partner_code || '') + '"/><datalist id="mCodes">' + codes + '</datalist></label></div>' +
      '<div class="ad-2"><label>Estimated total (₹)<input name="estimated_total" type="number" min="0" value="' + esc(k.estimated_total == null ? '' : k.estimated_total) + '"/></label>' +
      '<label>Amount received (₹)<input name="amount_paid" type="number" min="0" value="' + esc(k.amount_paid || 0) + '"/></label></div>' +
      '<div class="ad-2"><label class="ad-check"><input type="checkbox" name="advance_paid"' + (k.advance_paid ? ' checked' : '') + '/> Advance received</label>' +
      '<label>Payment reference (UPI / bank)<input name="payment_ref" maxlength="80" value="' + esc(k.payment_ref || '') + '"/></label></div>' +
      '<label>Notes<textarea name="admin_notes" rows="2">' + esc(k.admin_notes || '') + '</textarea></label>' +
      (isNew ? '' : guestsBlock(k)) + (isNew ? '' : '<p class="ad-hint">Booked ' + day(k.created_at.slice(0, 10)) + (k.variant ? ' · ' + esc(k.variant) : '') + '. Confirmed seats count towards the batch; when it is full the batch closes and you get an email.</p>'),
      function (v) {
        var t = byId(S.trips, v.trip_id) || { title: v.trip_id, unit: 'person' };
        var phone = v.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
        if (!v.name.trim()) throw new Error('Please enter the name.');
        if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Phone must be a 10-digit Indian mobile number.');
        var row = {
          trip_id: v.trip_id, trip_title: isNew || v.trip_id !== k.trip_id ? t.title : k.trip_title, style_id: v.style_id, unit: unitFor(v.style_id, t),
          batch_id: v.batch_id || null, travel_date: v.travel_date || null, name: v.name.trim(), phone: phone, email: v.email.trim() || null,
          travellers: +v.travellers, status: v.status, partner_code: v.partner_code.trim().toUpperCase() || null,
          estimated_total: v.estimated_total === '' ? null : +v.estimated_total, amount_paid: +v.amount_paid || 0,
          advance_paid: !!v.advance_paid, payment_ref: v.payment_ref.trim() || null, admin_notes: v.admin_notes.trim() || null
        };
        if (isNew) { row.ref = 'NG-A' + Date.now().toString(36).toUpperCase().slice(-6); return sb.from('bookings').insert(row); }
        return sb.from('bookings').update(row).eq('id', k.id);
      },
      isNew ? null : function () {
        if (!confirm('Delete booking ' + k.ref + ' permanently? Usually "Cancelled" is better.')) return null;
        return sb.from('bookings').delete().eq('id', k.id);
      });
    function syncBooking() {
      $('mBatch').innerHTML = batchOptions($('mTrip').value, $('mStyle').value, null);
      $('mPaxLabel').textContent = unitFor($('mStyle').value, byId(S.trips, $('mTrip').value)) === 'couple' ? 'Couples' : 'Travellers';
    }
    $('mTrip').addEventListener('change', syncBooking); $('mStyle').addEventListener('change', syncBooking);
  }
  $('adExport').addEventListener('click', function () {
    var cols = ['ref', 'created_at', 'status', 'trip_title', 'style_id', 'variant', 'travellers_names', 'travel_date', 'travellers', 'unit', 'name', 'phone', 'email', 'estimated_total', 'advance_paid', 'amount_paid', 'payment_ref', 'partner_code', 'admin_notes'];
    var lines = [cols.concat('batch').join(',')].concat(filteredBookings().map(function (k) {
      var b = byId(S.batches, k.batch_id);
      return cols.map(function (c) { return c === 'travellers_names' ? (k.guests || []).map(function (g) { return g.name + (g.age != null ? ' (' + g.age + ')' : ''); }).join('; ') : k[c]; }).concat(b ? b.label + ' ' + b.start_date : '').map(function (v) {
        v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    }));
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }));
    a.download = 'nandigo-bookings-' + today() + '.csv'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  /* ---------------- Trips & styles ---------------- */
  function renderCatalog() {
    $('adStyles').innerHTML = NG.STYLES.map(function (x) {
      var row = byId(S.styles, x.id) || {}, hidden = !!row.hidden;
      var n = S.batches.filter(function (b) { return b.style_id === x.id && b.status !== 'completed' && b.end_date >= today(); }).length;
      return '<div class="ad-stylebox' + (hidden ? ' off' : '') + '"><span class="ad-style-ph" style="background-image:url(\'' + esc(x.photo.replace('w=1000', 'w=300')) + '\')"></span>' +
        '<div><b>' + esc(x.name) + '</b><small>' + esc(x.line) + '</small><small>' + n + ' upcoming batch' + (n === 1 ? '' : 'es') + '</small></div>' +
        '<button class="btn btn-' + (hidden ? 'gold' : 'ghost') + ' btn-sm" data-style-toggle="' + x.id + '">' + (hidden ? 'Show on website' : 'Hide') + '</button></div>';
    }).join('');
    var q = $('adTrSearch').value.trim().toLowerCase();
    var list = S.trips.filter(function (t) { return !q || [t.title, t.dest, t.id].join(' ').toLowerCase().indexOf(q) >= 0; });
    $('adTrTable').tBodies[0].innerHTML = list.map(function (t) {
      var n = S.batches.filter(function (b) { return b.trip_id === t.id && b.status !== 'completed' && b.end_date >= today(); }).length;
      var sp = t.style_prices || {};
      return '<tr' + (t.active ? '' : ' class="ad-off"') + '>' +
        '<td data-l="Trip"><div class="ad-trip"><span style="background-image:url(\'' + esc(tripImg(t.image)) + '\')"></span><div><b>' + esc(t.title) + '</b><small>' + esc((NG.dest(t.dest) || {}).name || t.dest || '') + ' · ' + esc(t.duration || '') + '</small></div></div></td>' +
        '<td data-l="Price">' + fmt(t.price) + '<small>per ' + t.unit + '</small>' + Object.keys(sp).map(function (k) { return '<small>' + esc(styleName(k)) + ': ' + fmt(sp[k]) + '</small>'; }).join('') + '</td>' +
        '<td data-l="Batches">' + n + ' upcoming</td>' +
        '<td data-l="On website">' + (t.active ? pill('active') : '<span class="ad-pill s-closed">Hidden</span>') + '</td>' +
        '<td class="ad-td-act"><button class="btn btn-ghost btn-sm" data-trip-batches="' + esc(t.id) + '">Batches</button>' +
        '<button class="btn btn-ghost btn-sm" data-trip-toggle="' + esc(t.id) + '">' + (t.active ? 'Hide' : 'Show') + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-edit-trip="' + esc(t.id) + '">Edit</button></td></tr>';
    }).join('');
  }
  function tripImg(u) { return !u ? '' : /^https?:/.test(u) ? u : '../' + u.replace(/^\.?\//, ''); }
  $('adTrSearch').addEventListener('input', renderCatalog);
  $('adNewTrip').addEventListener('click', function () { editTrip(null); });
  document.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-style-toggle]'))) {
      var row = byId(S.styles, x.dataset.styleToggle) || {}, hide = !row.hidden;
      if (hide && !confirm('Hide "' + styleName(x.dataset.styleToggle) + '" from the website? Its batches stay saved.')) return;
      sb.from('styles').update({ hidden: hide }).eq('id', x.dataset.styleToggle).then(function (r) { if (r.error) toast(friendly(r.error), true); else { toast(hide ? 'Style hidden' : 'Style shown'); loadAll(); } });
    } else if ((x = e.target.closest('[data-trip-toggle]'))) {
      var t = byId(S.trips, x.dataset.tripToggle);
      sb.from('trips').update({ active: !t.active }).eq('id', t.id).then(function (r) { if (r.error) toast(friendly(r.error), true); else { toast(t.active ? 'Trip hidden' : 'Trip shown'); loadAll(); } });
    } else if ((x = e.target.closest('[data-edit-trip]'))) editTrip(byId(S.trips, x.dataset.editTrip));
    else if ((x = e.target.closest('[data-trip-batches]'))) { go('batches'); $('adBaTrip').value = x.dataset.tripBatches; $('adBaStyle').value = ''; renderBatches(); }
  });
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'trip'; }
  function editTrip(t) {
    var isNew = !t;
    t = t || { price: 0, unit: 'person', perks: [], stops: [], style_prices: {}, active: true, sort: 100 };
    var sp = t.style_prices || {};
    var dests = NG.DESTINATIONS.map(function (d) { return '<option value="' + d.id + '"' + (d.id === t.dest ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('');
    var variants = (t.variants || []).map(function (v) { return v.label + ' | ' + v.price + (v.note ? ' | ' + v.note : ''); }).join('\n');
    modal(isNew ? 'Add trip' : 'Edit trip',
      '<label>Trip name<input name="title" required maxlength="120" value="' + esc(t.title || '') + '"/></label>' +
      '<div class="ad-2"><label>Place on the map<select name="dest"><option value="">Other</option>' + dests + '</select></label>' +
      '<label>Duration<input name="duration" maxlength="60" placeholder="3 Nights · 4 Days" value="' + esc(t.duration || '') + '"/></label></div>' +
      '<div class="ad-2"><label>Price (₹)<input name="price" type="number" min="0" required value="' + esc(t.price) + '"/></label>' +
      '<label>Priced per<select name="unit"><option value="person"' + (t.unit !== 'couple' ? ' selected' : '') + '>Person</option><option value="couple"' + (t.unit === 'couple' ? ' selected' : '') + '>Couple</option></select></label></div>' +
      '<div class="ad-field"><span>Price for a travel style <small>(optional; Couple Escape is per couple, default 2 × price)</small></span><div class="ad-4">' +
        NG.STYLES.map(function (x) { return '<label>' + esc(x.name) + '<input name="sp_' + x.id + '" type="number" min="0" value="' + esc(sp[x.id] == null ? '' : sp[x.id]) + '"/></label>'; }).join('') + '</div></div>' +
      '<div class="ad-2"><label>Old price, shown crossed out (₹)<input name="was" type="number" min="0" value="' + esc(t.was == null ? '' : t.was) + '"/></label>' +
      '<label>Offer note<input name="note" maxlength="80" placeholder="Save Rs 500 with early bird" value="' + esc(t.note || '') + '"/></label></div>' +
      '<div class="ad-field"><span>Photo</span><div class="ad-photo"><span id="mPhotoPrev" style="background-image:url(\'' + esc(tripImg(t.image)) + '\')"></span>' +
        '<div><input name="image" id="mImage" placeholder="Photo link, or upload" value="' + esc(t.image || '') + '"/><label class="btn btn-ghost btn-sm ad-upload">Upload photo<input type="file" id="mUpload" accept="image/jpeg,image/png,image/webp" hidden/></label><small id="mUpMsg">JPG, PNG or WebP, up to 5 MB.</small></div></div></div>' +
      '<label>Description<textarea name="description" rows="3">' + esc(t.description || '') + '</textarea></label>' +
      '<div class="ad-2"><label>What is included <small>(one per line)</small><textarea name="perks" rows="5">' + esc((t.perks || []).join('\n')) + '</textarea></label>' +
      '<label>Places you visit <small>(one per line)</small><textarea name="stops" rows="5">' + esc((t.stops || []).join('\n')) + '</textarea></label></div>' +
      '<label>Packages <small>(optional, one per line: Name | price | note, e.g. Standard | 13999 | Most popular)</small><textarea name="variants" rows="3">' + esc(variants) + '</textarea></label>' +
      '<div class="ad-2"><label>Order on the website <small>(smaller comes first)</small><input name="sort" type="number" value="' + esc(t.sort) + '"/></label>' +
      '<label class="ad-check"><input type="checkbox" name="active"' + (t.active ? ' checked' : '') + '/> Show on the website</label></div>',
      function (v) {
        if (!v.title.trim()) throw new Error('Please enter the trip name.');
        var prices = {}; NG.STYLES.forEach(function (x) { if (v['sp_' + x.id] !== '') prices[x.id] = +v['sp_' + x.id]; });
        var lines = function (txt) { return txt.split('\n').map(function (l) { return l.trim(); }).filter(Boolean); };
        var vars = lines(v.variants).map(function (l, i) {
          var p = l.split('|').map(function (x) { return x.trim(); });
          if (!p[0] || !(+p[1] >= 0)) throw new Error('Package line ' + (i + 1) + ' should be: Name | price | note');
          return { id: slug(p[0]), label: p[0], price: +p[1], note: p[2] || '' };
        });
        var row = { title: v.title.trim(), dest: v.dest || null, duration: v.duration.trim() || null, price: +v.price || 0, unit: v.unit,
          style_prices: prices, was: v.was === '' ? null : +v.was, note: v.note.trim() || null, image: v.image.trim() || null,
          description: v.description.trim() || null, perks: lines(v.perks), stops: lines(v.stops), variants: vars.length ? vars : null,
          sort: +v.sort || 0, active: !!v.active, region: (NG.dest(v.dest) || {}).ka ? 'karnataka' : (t.region || null) };
        if (!isNew) return sb.from('trips').update(row).eq('id', t.id);
        var id = slug(row.title), n = 2; while (byId(S.trips, id)) id = slug(row.title).slice(0, 36) + '-' + n++;
        row.id = id;
        return sb.from('trips').insert(row);
      },
      isNew ? null : function () {
        if (S.batches.some(function (b) { return b.trip_id === t.id; })) { toast('This trip has batches. Hide it instead, or delete its batches first.', true); return null; }
        if (!confirm('Delete "' + t.title + '" permanently? Hiding it keeps it for later.')) return null;
        return sb.from('trips').delete().eq('id', t.id);
      });
    $('mImage').addEventListener('input', function () { $('mPhotoPrev').style.backgroundImage = 'url("' + tripImg(this.value.trim()) + '")'; });
    $('mUpload').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      if (f.size > 5 * 1024 * 1024) { $('mUpMsg').textContent = 'That photo is over 5 MB. Please pick a smaller one.'; return; }
      var path = (t.id || slug($('adModalForm').elements.title.value)) + '/' + Date.now() + '.' + (f.name.split('.').pop() || 'jpg').toLowerCase();
      $('mUpMsg').textContent = 'Uploading…';
      sb.storage.from('trip-photos').upload(path, f, { upsert: true, contentType: f.type }).then(function (r) {
        if (r.error) { $('mUpMsg').textContent = 'Upload failed: ' + r.error.message; return; }
        var url = sb.storage.from('trip-photos').getPublicUrl(path).data.publicUrl;
        $('mImage').value = url; $('mPhotoPrev').style.backgroundImage = 'url("' + url + '")'; $('mUpMsg').textContent = 'Uploaded. Press Save to keep it.';
      });
    });
  }

  /* ---------------- Partners ---------------- */
  function personsFor(code) {
    if (!code) return 0;
    return S.bookings.filter(function (k) { return k.partner_code === code && (k.status === 'confirmed' || k.status === 'completed'); })
      .reduce(function (s, k) { return s + seatsOf(k); }, 0);
  }
  function refundDue(p) { return p.kit_paid_on && !p.kit_refunded_on && personsFor(p.partner_code) >= KIT_TARGET; }
  function renderPartners() {
    var q = $('adPtSearch').value.trim().toLowerCase(), role = $('adPtRole').value, st = $('adPtStatus').value;
    var list = S.partners.filter(function (p) {
      if (role && p.role !== role) return false;
      if (st && p.status !== st) return false;
      if (q && [p.name, p.phone, p.email, p.partner_code, p.district, p.taluk].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    $('adPtEmpty').hidden = !!list.length;
    $('adPtTable').tBodies[0].innerHTML = list.map(function (p) {
      var n = personsFor(p.partner_code);
      var kit = p.kit_refunded_on ? 'Refunded ' + day(p.kit_refunded_on) : p.kit_paid_on ? (n >= KIT_TARGET ? '<b class="ad-due">Refund due</b>' : 'Paid ' + day(p.kit_paid_on)) : 'Not paid';
      var acts = '';
      if (p.status === 'applied') acts += '<button class="btn btn-gold btn-sm" data-pt-status="approved" data-id="' + p.id + '">Approve</button><button class="btn btn-ghost btn-sm" data-pt-status="rejected" data-id="' + p.id + '">Reject</button>';
      if (p.status === 'approved' || p.status === 'paused') acts += '<button class="btn btn-gold btn-sm" data-pt-status="active" data-id="' + p.id + '">Activate</button>';
      if (p.status === 'active') acts += '<button class="btn btn-ghost btn-sm" data-pt-status="paused" data-id="' + p.id + '">Pause</button>';
      if (refundDue(p)) acts += '<button class="btn btn-gold btn-sm" data-pt-refund="' + p.id + '">Mark kit refunded</button>';
      return '<tr>' +
        '<td data-l="Partner"><b>' + esc(p.name) + '</b><small>' + (p.phone ? '<a href="https://wa.me/91' + esc(p.phone) + '" target="_blank" rel="noopener">' + esc(p.phone) + '</a>' : '') + (p.email ? ' · ' + esc(p.email) : '') + '</small>' +
          (p.source === 'website' ? '<small>Applied on the website · ' + day(p.created_at.slice(0, 10)) + '</small>' : '') + kycTag(p) + '</td>' +
        '<td data-l="Role">' + (p.role === 'district' ? 'District' : 'Taluk') + '</td>' +
        '<td data-l="Area">' + esc(p.district) + (p.taluk ? '<small>' + esc(p.taluk) + ' taluk</small>' : '') + '</td>' +
        '<td data-l="Code">' + esc(p.partner_code || '—') + (p.commission_per_person ? '<small>' + fmt(p.commission_per_person) + ' / person</small>' : '') + '</td>' +
        '<td data-l="Persons booked">' + n + (p.kit_paid_on && !p.kit_refunded_on ? '<small>' + Math.min(n, KIT_TARGET) + ' of ' + KIT_TARGET + ' for kit refund</small>' : '') + '</td>' +
        '<td data-l="Kit">' + kit + '</td>' +
        '<td data-l="Status">' + pill(p.status) + '</td>' +
        '<td class="ad-td-act">' + acts + '<button class="btn btn-ghost btn-sm" data-edit-partner="' + p.id + '">Open</button></td></tr>';
    }).join('');
    // District coverage
    var taken = {}; S.partners.forEach(function (p) { if (p.role === 'district' && (p.status === 'approved' || p.status === 'active')) taken[p.district] = p; });
    var talukCount = {}; S.partners.forEach(function (p) { if (p.role === 'taluk' && (p.status === 'approved' || p.status === 'active')) talukCount[p.district] = (talukCount[p.district] || 0) + 1; });
    renderPartnerMap();
    $('adCover').innerHTML = '<h3>District coverage <span>' + Object.keys(taken).length + ' of ' + DISTRICTS.length + ' districts have a partner</span></h3><div class="ad-chips">' +
      DISTRICTS.map(function (d) { return '<span class="ad-chip' + (taken[d] ? ' on' : '') + '" title="' + esc(taken[d] ? taken[d].name : 'Open') + '">' + esc(d) + (talukCount[d] ? ' <i>+' + talukCount[d] + ' taluk</i>' : '') + '</span>'; }).join('') + '</div>';
  }
  ['adPtSearch', 'adPtRole', 'adPtStatus'].forEach(function (id) { $(id).addEventListener('input', renderPartners); });

  /* ----- Map view: click a district to see its District Partner and the Taluk Partners under them ----- */
  var ptView = 'map', selDistrict = null, mapBuilt = false;
  var LIVE = ['approved', 'active'], GONE = ['rejected', 'terminated'];
  function districtInfo(d) {
    var list = S.partners.filter(function (p) { return p.district === d; });
    return {
      list: list,
      dp: list.filter(function (p) { return p.role === 'district' && LIVE.indexOf(p.status) >= 0; }),
      waiting: list.filter(function (p) { return p.status === 'applied'; }),
      taluks: list.filter(function (p) { return p.role === 'taluk' && LIVE.concat(['paused']).indexOf(p.status) >= 0; })
    };
  }
  document.querySelector('.ad-view').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ptview]'); if (!b) return;
    ptView = b.dataset.ptview;
    document.querySelectorAll('[data-ptview]').forEach(function (x) { x.setAttribute('aria-selected', x.dataset.ptview === ptView); });
    $('adPtMapView').hidden = ptView !== 'map'; $('adPtListView').hidden = ptView !== 'list';
  });
  function buildMap() {
    var M = window.NG_MAP, svg = $('adKaMap'); if (!M || !svg) return false;
    var NS = 'http://www.w3.org/2000/svg', b = M.kaBox;
    svg.setAttribute('viewBox', [b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8].join(' '));
    var html = '';
    DISTRICTS.forEach(function (name) { var d = M.districts[name]; if (d) html += '<path class="akd" d="' + d.d + '" data-d="' + esc(name) + '" tabindex="0" role="button" aria-label="' + esc(name) + '"/>'; });
    DISTRICTS.forEach(function (name) { var d = M.districts[name]; if (d) html += '<circle class="akd-dot" cx="' + d.c[0] + '" cy="' + d.c[1] + '" r="1.6" data-dot="' + esc(name) + '"/>'; });
    svg.innerHTML = html;
    var pick = function (el) { selDistrict = el.dataset.d; renderPartnerMap(); };
    svg.addEventListener('click', function (e) { var el = e.target.closest('[data-d]'); if (el) pick(el); });
    svg.addEventListener('keydown', function (e) { var el = e.target.closest('[data-d]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(el); } });
    svg.addEventListener('mousemove', function (e) {
      var el = e.target.closest('[data-d]'), tip = $('adMapTip');
      if (!el) { tip.hidden = true; return; }
      var info = districtInfo(el.dataset.d), box = svg.parentNode.getBoundingClientRect();
      tip.innerHTML = '<b>' + esc(el.dataset.d) + '</b><span>' + (info.dp[0] ? esc(info.dp[0].name) : 'No District Partner') + ' · ' + info.taluks.length + ' taluk' + (info.taluks.length === 1 ? '' : 's') + (info.waiting.length ? ' · ' + info.waiting.length + ' waiting' : '') + '</span>';
      tip.style.left = (e.clientX - box.left) + 'px'; tip.style.top = (e.clientY - box.top) + 'px'; tip.hidden = false;
    });
    svg.addEventListener('mouseleave', function () { $('adMapTip').hidden = true; });
    return true;
  }
  function renderPartnerMap() {
    if (!mapBuilt) mapBuilt = buildMap();
    if (!selDistrict) {
      var withActivity = DISTRICTS.filter(function (d) { return districtInfo(d).list.length; });
      selDistrict = withActivity[0] || 'Mysuru';
    }
    document.querySelectorAll('#adKaMap [data-d]').forEach(function (el) {
      var info = districtInfo(el.dataset.d);
      el.setAttribute('class', 'akd ' + (info.dp.length ? 'on' : info.waiting.length ? 'wait' : 'open') + (el.dataset.d === selDistrict ? ' sel' : ''));
    });
    document.querySelectorAll('#adKaMap [data-dot]').forEach(function (el) { el.style.display = districtInfo(el.dataset.dot).waiting.length ? '' : 'none'; });
    renderDistrictPanel();
  }
  function partnerLine(p, sub) {
    var n = personsFor(p.partner_code), acts = '';
    if (p.status === 'applied') acts += '<button class="btn btn-gold btn-sm" data-pt-status="approved" data-id="' + p.id + '">Approve</button><button class="btn btn-ghost btn-sm" data-pt-status="rejected" data-id="' + p.id + '">Reject</button>';
    if (p.status === 'approved' || p.status === 'paused') acts += '<button class="btn btn-gold btn-sm" data-pt-status="active" data-id="' + p.id + '">Activate</button>';
    if (p.status === 'active') acts += '<button class="btn btn-ghost btn-sm" data-pt-status="paused" data-id="' + p.id + '">Pause</button>';
    return '<div class="ad-pline' + (sub ? ' sub' : '') + '"><div class="ad-pline-main"><b>' + esc(p.name) + '</b><small>' +
      (p.role === 'taluk' ? esc(p.taluk || 'Taluk not given') + ' taluk' : 'District Partner') + (p.partner_code ? ' · ' + esc(p.partner_code) : '') +
      (p.phone ? ' · <a href="https://wa.me/91' + esc(p.phone) + '" target="_blank" rel="noopener">' + esc(p.phone) + '</a>' : '') + '</small>' +
      '<small>' + (p.partner_code ? n + ' persons booked' : 'Applied ' + day(p.created_at.slice(0, 10))) + '</small>' + kycTag(p) + '</div>' +
      pill(p.status) + '<div class="ad-pline-act">' + acts + '<button class="btn btn-ghost btn-sm" data-edit-partner="' + p.id + '">Open</button></div></div>';
  }
  function renderDistrictPanel() {
    var d = selDistrict, info = districtInfo(d);
    var booked = info.dp.concat(info.taluks).reduce(function (s, p) { return s + personsFor(p.partner_code); }, 0);
    var waitingD = info.waiting.filter(function (p) { return p.role === 'district'; });
    var waitingT = info.waiting.filter(function (p) { return p.role === 'taluk'; });
    var gone = info.list.filter(function (p) { return GONE.indexOf(p.status) >= 0 || (p.role === 'district' && p.status === 'paused'); });
    // group taluk partners by taluk name (as typed)
    var groups = {};
    info.taluks.forEach(function (p) { var k = (p.taluk || 'Taluk not given').trim(); var key = k.toLowerCase(); (groups[key] = groups[key] || { name: k, list: [] }).list.push(p); });
    var keys = Object.keys(groups).sort();
    $('adDistrictPanel').innerHTML =
      '<div class="ad-dhead"><div><span class="ad-label">District</span><h3>' + esc(d) + '</h3></div>' +
      '<button class="btn btn-ghost btn-sm" data-add-partner="' + esc(d) + '">Add partner here</button></div>' +
      '<div class="ad-dstats"><span><b>' + info.dp.length + '</b> District Partner</span><span><b>' + info.taluks.length + '</b> Taluk Partners</span><span><b>' + info.waiting.length + '</b> waiting</span><span><b>' + booked + '</b> persons booked</span></div>' +
      '<h4 class="ad-dsec">District Partner</h4>' +
      (info.dp.length ? info.dp.map(function (p) { return partnerLine(p); }).join('') : '<p class="ad-empty">No District Partner yet.</p>') +
      (waitingD.length ? '<h4 class="ad-dsec">District Partner applications <i>' + waitingD.length + '</i></h4>' + waitingD.map(function (p) { return partnerLine(p); }).join('') : '') +
      '<h4 class="ad-dsec">Taluk Partners under ' + (info.dp[0] ? esc(info.dp[0].name) : esc(d)) + '</h4>' +
      (keys.length ? '<div class="ad-tree">' + keys.map(function (k) {
        var g = groups[k];
        return '<div class="ad-taluk"><span class="ad-taluk-name">' + esc(g.name) + (g.list.length > 1 ? ' <i>' + g.list.length + ' partners</i>' : '') + '</span>' + g.list.map(function (p) { return partnerLine(p, true); }).join('') + '</div>';
      }).join('') + '</div>' : '<p class="ad-empty">No Taluk Partners yet.</p>') +
      (waitingT.length ? '<h4 class="ad-dsec">Taluk applications <i>' + waitingT.length + '</i></h4>' + waitingT.map(function (p) { return partnerLine(p, true); }).join('') : '') +
      (gone.length ? '<details class="ad-gone"><summary>' + gone.length + ' paused, rejected or ended</summary>' + gone.map(function (p) { return partnerLine(p, p.role === 'taluk'); }).join('') + '</details>' : '');
  }
  document.addEventListener('click', function (e) {
    var x = e.target.closest('[data-add-partner]'); if (!x) return;
    editPartner(null, x.dataset.addPartner);
  });
  function kycOf(p) { return S.kyc.filter(function (k) { return k.partner_id === p.id; })[0]; }
  function kycTag(p) {
    var k = kycOf(p); if (!k) return (p.status === 'approved' || p.status === 'active') ? '<small class="ad-kyc no">KYC not received</small>' : '';
    return '<small class="ad-kyc ' + (k.verified ? 'ok' : 'wait') + '">' + (k.verified ? 'KYC verified' : 'KYC received · check it') + '</small>';
  }
  function applicationBlock(p) {
    if (p.source !== 'website' && !p.motivation) return '';
    var row = function (l, v) { return v ? '<div><dt>' + l + '</dt><dd>' + esc(v) + '</dd></div>' : ''; };
    return '<div class="ad-box"><h4>Application</h4><dl class="ad-dl">' + row('Applied', day(p.created_at.slice(0, 10))) + row('Age', p.age) + row('Current work', p.occupation) +
      row('Experience', p.experience) + row('Bookings per month', p.expected_bookings) + row('Instagram / Facebook', p.social) + row('Why select me', p.motivation) +
      row('Agreed to terms', p.agreed ? 'Yes' : '') + '</dl></div>';
  }
  var DOCS = [['passport', 'Passport photo'], ['full', 'Full-length photo'], ['selfie', 'Selfie with ID'], ['kyc', 'KYC document'], ['bank', 'Cheque / passbook']];
  function kycBlock(p) {
    var k = kycOf(p); if (!k) return '';
    var row = function (l, v) { return v ? '<div><dt>' + l + '</dt><dd>' + esc(v) + '</dd></div>' : ''; };
    return '<div class="ad-box"><h4>KYC &amp; bank details <span class="ad-pill s-' + (k.verified ? 'active' : 'new') + '">' + (k.verified ? 'Verified' : 'To check') + '</span></h4><dl class="ad-dl">' +
      row('Received', day(k.created_at.slice(0, 10))) + row('Name', k.name) + row('WhatsApp', k.phone) + row('Email', k.email) + row('Area', k.taluk + ', ' + k.district) +
      row('Aadhaar (last 4)', 'XXXX-XXXX-' + k.aadhaar_last4) + row('PAN', k.pan) + row('Account holder', k.bank_holder) + row('Account number', k.account_no) + row('IFSC', k.ifsc) + row('UPI', k.upi) +
      '</dl><div class="ad-docs">' + DOCS.map(function (d) { return k.files && k.files[d[0]] ? '<button type="button" class="btn btn-ghost btn-sm" data-kyc-file="' + esc(k.files[d[0]]) + '">' + d[1] + '</button>' : ''; }).join('') + '</div>' +
      (k.verified ? '' : '<button type="button" class="btn btn-gold btn-sm" data-kyc-verify="' + k.id + '">Mark KYC verified</button>') + '</div>';
  }
  document.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-kyc-file]'))) {
      var w = window.open('', '_blank');
      sb.storage.from('partner-kyc').createSignedUrl(x.dataset.kycFile, 600).then(function (r) {
        if (r.error) { if (w) w.close(); toast(friendly(r.error), true); return; }
        if (w) w.location.href = r.data.signedUrl; else window.open(r.data.signedUrl, '_blank');
      });
    } else if ((x = e.target.closest('[data-kyc-verify]'))) {
      sb.from('partner_kyc').update({ verified: true }).eq('id', x.dataset.kycVerify).then(function (r) {
        if (r.error) toast(friendly(r.error), true); else { toast('KYC marked verified'); closeModal(); loadAll(); }
      });
    }
  });
  $('adNewPartner').addEventListener('click', function () { editPartner(null); });
  document.addEventListener('click', function (e) {
    var x;
    if ((x = e.target.closest('[data-edit-partner]'))) editPartner(byId(S.partners, x.dataset.editPartner));
    else if ((x = e.target.closest('[data-pt-status]'))) setPartner(x.dataset.id, { status: x.dataset.ptStatus });
    else if ((x = e.target.closest('[data-pt-refund]'))) { if (confirm('Mark the ₹4,999 kit as refunded today?')) setPartner(x.dataset.ptRefund, { kit_refunded_on: today() }); }
  });
  function setPartner(id, patch) {
    var p = byId(S.partners, id);
    if ((patch.status === 'approved' || patch.status === 'active') && !p.partner_code) patch.partner_code = suggestCode(p.role, p.district, p.taluk);
    sb.from('partners').update(patch).eq('id', id).then(function (r) {
      if (r.error) toast(friendly(r.error), true); else { toast('Partner updated'); loadAll(); }
    });
  }
  function suggestCode(role, district, taluk) {
    var ab = function (s) { return String(s || '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'XXX'; };
    var base = role === 'taluk' ? 'NG-TP-' + ab(district) + '-' + ab(taluk) + '-' : 'NG-DP-' + ab(district) + '-', i = 1;
    var used = S.partners.map(function (p) { return p.partner_code; });
    while (used.indexOf(base + (i < 10 ? '0' + i : i)) >= 0) i++;
    return base + (i < 10 ? '0' + i : i);
  }
  function editPartner(p, district) {
    var isNew = !p;
    p = p || { role: district ? 'taluk' : 'district', status: 'applied', district: district || '' };
    modal(isNew ? 'Add partner' : p.name,
      '<div class="ad-2"><label>Role<select name="role">' + ['district', 'taluk'].map(function (r) { return '<option value="' + r + '"' + (r === p.role ? ' selected' : '') + '>' + (r === 'district' ? 'District Partner' : 'Taluk Partner') + '</option>'; }).join('') + '</select></label>' +
      '<label>Status<select name="status">' + ['applied', 'approved', 'active', 'paused', 'rejected', 'terminated'].map(function (s) { return '<option value="' + s + '"' + (s === p.status ? ' selected' : '') + '>' + STATUS_LABEL[s] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="ad-2"><label>Full name<input name="name" required maxlength="100" value="' + esc(p.name || '') + '"/></label>' +
      '<label>WhatsApp number<input name="phone" inputmode="numeric" value="' + esc(p.phone || '') + '"/></label></div>' +
      '<div class="ad-2"><label>District<select name="district" required><option value="">Choose</option>' + DISTRICTS.map(function (d) { return '<option' + (d === p.district ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>' +
      '<label>Taluk (Taluk Partners)<input name="taluk" maxlength="60" value="' + esc(p.taluk || '') + '"/></label></div>' +
      '<div class="ad-2"><label>Email<input name="email" type="email" value="' + esc(p.email || '') + '"/></label>' +
      '<label>Partner code<input name="partner_code" maxlength="20" placeholder="Made on approval" value="' + esc(p.partner_code || '') + '"/></label></div>' +
      '<div class="ad-2"><label>Commission per person (₹)<input name="commission_per_person" type="number" min="0" max="5000" placeholder="300 – 500" value="' + esc(p.commission_per_person == null ? '' : p.commission_per_person) + '"/></label>' +
      '<label>Kit (₹4,999) paid on<input name="kit_paid_on" type="date" value="' + esc(p.kit_paid_on || '') + '"/></label></div>' +
      '<div class="ad-2"><label>Kit refunded on<input name="kit_refunded_on" type="date" value="' + esc(p.kit_refunded_on || '') + '"/></label><span></span></div>' +
      '<label>Notes (KYC checked, agreement signed, etc.)<textarea name="notes" rows="3">' + esc(p.notes || '') + '</textarea></label>' +
      (isNew ? '' : '<p class="ad-hint">' + personsFor(p.partner_code) + ' confirmed persons booked with this code.' + (p.partner_code ? ' Partner link: ' + esc((S.settings.site_url || location.origin) + '/?ref=' + p.partner_code) : '') + '</p>' + applicationBlock(p) + kycBlock(p)),
      function (v) {
        var phone = v.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
        if (!v.name.trim() || !v.district) throw new Error('Please enter the name and district.');
        if (phone && !/^[6-9]\d{9}$/.test(phone)) throw new Error('Phone must be a 10-digit Indian mobile number.');
        if (v.role === 'taluk' && !v.taluk.trim()) throw new Error('Please enter the taluk.');
        var row = {
          role: v.role, status: v.status, name: v.name.trim(), phone: phone || null, email: v.email.trim() || null,
          district: v.district, taluk: v.taluk.trim() || null, partner_code: v.partner_code.trim().toUpperCase() || null,
          commission_per_person: v.commission_per_person === '' ? null : +v.commission_per_person,
          kit_paid_on: v.kit_paid_on || null, kit_refunded_on: v.kit_refunded_on || null, notes: v.notes.trim() || null
        };
        if (!row.partner_code && (row.status === 'approved' || row.status === 'active')) row.partner_code = suggestCode(row.role, row.district, row.taluk);
        return isNew ? sb.from('partners').insert(row) : sb.from('partners').update(row).eq('id', p.id);
      },
      isNew ? null : function () {
        if (!confirm('Delete ' + p.name + ' permanently? Usually "Terminated" or "Rejected" is better.')) return null;
        return sb.from('partners').delete().eq('id', p.id);
      });
  }

  /* ---------------- Reviews ---------------- */
  var RV_PHOTO = SB_URL + '/storage/v1/object/public/review-photos/';
  function renderReviews() {
    var waiting = S.reviews.filter(function (x) { return x.status === 'pending'; }).length;
    $('adRvCount').hidden = !waiting; $('adRvCount').textContent = waiting;
    var st = $('adRvStatus').value, list = S.reviews.filter(function (x) { return !st || x.status === st; });
    var stars = function (n) { var o = ''; for (var i = 1; i <= 5; i++) o += '<i' + (i <= n ? ' class="on"' : '') + '>★</i>'; return '<span class="ad-stars">' + o + '</span>'; };
    var label = { pending: 'Waiting', approved: 'On website', hidden: 'Hidden' };
    $('adRvList').innerHTML = list.length ? list.map(function (r) {
      var acts = '';
      if (r.status !== 'approved') acts += '<button class="btn btn-gold btn-sm" data-rv-set="approved" data-id="' + r.id + '">Approve</button>';
      if (r.status !== 'hidden') acts += '<button class="btn btn-ghost btn-sm" data-rv-set="hidden" data-id="' + r.id + '">Hide</button>';
      if (r.status === 'approved') acts += '<button class="btn btn-ghost btn-sm" data-rv-feature="' + r.id + '">' + (r.featured ? 'Unfeature' : 'Feature') + '</button>';
      acts += '<button class="btn btn-ghost btn-sm ad-danger" data-rv-del="' + r.id + '">Delete</button>';
      return '<article class="ad-rv' + (r.featured ? ' feat' : '') + '">' +
        ((r.photos || []).length ? '<div class="ad-rv-ph">' + r.photos.map(function (p) { return '<a href="' + esc(RV_PHOTO + p) + '" target="_blank" rel="noopener" style="background-image:url(\'' + esc(RV_PHOTO + p) + '\')"></a>'; }).join('') + '</div>' : '') +
        '<div class="ad-rv-body"><div class="ad-rv-top">' + stars(r.rating) + '<span class="ad-pill s-' + (r.status === 'approved' ? 'active' : r.status === 'pending' ? 'new' : 'closed') + '">' + label[r.status] + '</span>' +
        (r.featured ? '<span class="ad-pill s-full">Featured</span>' : '') + (r.is_sample ? '<span class="ad-pill">Sample</span>' : '') + '</div>' +
        (r.title ? '<b class="ad-rv-title">' + esc(r.title) + '</b>' : '') + '<p>' + esc(r.body) + '</p>' +
        '<small>' + esc(r.name) + (r.place ? ' · ' + esc(r.place) : '') + (r.phone ? ' · <a href="https://wa.me/91' + esc(r.phone) + '" target="_blank" rel="noopener">' + esc(r.phone) + '</a>' : '') + ' · ' + day(r.created_at.slice(0, 10)) + '</small>' +
        '<small>' + esc(r.trip_title || 'No trip chosen') + (r.style_id ? ' · ' + esc(styleName(r.style_id)) : '') + '</small>' +
        '<div class="ad-row-actions">' + acts + '</div></div></article>';
    }).join('') : '<p class="ad-empty">' + (st === 'pending' ? 'No reviews waiting. New ones from the website appear here.' : 'No reviews here.') + '</p>';
  }
  $('adRvStatus').addEventListener('input', renderReviews);
  document.addEventListener('click', function (e) {
    var x, done = function (msg) { return function (r) { if (r.error) toast(friendly(r.error), true); else { toast(msg); loadAll(); } }; };
    if ((x = e.target.closest('[data-rv-set]'))) sb.from('reviews').update({ status: x.dataset.rvSet }).eq('id', x.dataset.id).then(done(x.dataset.rvSet === 'approved' ? 'Review is on the website' : 'Review hidden'));
    else if ((x = e.target.closest('[data-rv-feature]'))) { var r = byId(S.reviews, x.dataset.rvFeature); sb.from('reviews').update({ featured: !r.featured }).eq('id', r.id).then(done(r.featured ? 'No longer featured' : 'Featured first')); }
    else if ((x = e.target.closest('[data-rv-del]'))) {
      var rv = byId(S.reviews, x.dataset.rvDel);
      if (!confirm('Delete this review' + (rv.photos && rv.photos.length ? ' and its photos' : '') + ' permanently?')) return;
      (rv.photos && rv.photos.length ? sb.storage.from('review-photos').remove(rv.photos) : Promise.resolve()).then(function () {
        return sb.from('reviews').delete().eq('id', rv.id);
      }).then(done('Review deleted'));
    }
  });

  /* ---------------- Settings ---------------- */
  var SETTING_KEYS = ['notify_email', 'mail_webhook_url', 'mail_webhook_secret', 'notify_new_bookings', 'site_url'];
  function renderSettings() {
    var f = $('adSettingsForm');
    SETTING_KEYS.forEach(function (k) { var el = f.elements[k]; if (!el) return; if (el.type === 'checkbox') el.checked = S.settings[k] === 'true'; else el.value = S.settings[k] || ''; });
  }
  $('adSettingsForm').addEventListener('submit', function (e) {
    e.preventDefault(); if (!this.reportValidity()) return;
    var f = this, rows = SETTING_KEYS.filter(function (k) { return k !== 'mail_webhook_secret'; }).map(function (k) {
      var el = f.elements[k]; return { key: k, value: el.type === 'checkbox' ? String(el.checked) : el.value.trim() };
    });
    sb.from('app_settings').upsert(rows).then(function (r) { if (r.error) toast(friendly(r.error), true); else { toast('Settings saved'); loadAll(); } });
  });
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]'); if (!c) return;
    var v = $('adSettingsForm').elements[c.dataset.copy].value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { toast('Copied'); }, function () { toast('Select the text and copy it', true); });
  });
  $('adTestMail').addEventListener('click', function () {
    sb.rpc('admin_test_mail').then(function (r) {
      if (r.error) toast(friendly(r.error), true);
      else { toast(S.settings.mail_webhook_url ? 'Test email sent — check the inbox in a minute' : 'Saved in the log. Add the mail link to really send emails.'); setTimeout(loadMailLog, 4000); }
    });
  });
  function loadMailLog() {
    sb.rpc('admin_mail_log').then(function (r) {
      if (r.error) { $('adMailLog').innerHTML = '<p class="ad-empty">' + esc(friendly(r.error)) + '</p>'; return; }
      $('adMailLog').innerHTML = r.data.length ? r.data.map(function (n) {
        var ok = n.http_status >= 200 && n.http_status < 400;
        return '<div class="ad-log"><span class="ad-dot ' + (ok ? 'ok' : n.error ? 'bad' : '') + '"></span><div><b>' + esc(n.subject) + '</b><small>' +
          new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' · ' +
          esc(ok ? 'Sent' : n.error || (n.http_status ? 'Status ' + n.http_status : 'Sending…')) + '</small></div></div>';
      }).join('') : '<p class="ad-empty">No emails yet.</p>';
    });
  }

  /* ---------------- Dialog ---------------- */
  var M = { save: null, del: null, last: null };
  function modal(title, body, onSave, onDelete) {
    M.save = onSave; M.del = onDelete; M.last = document.activeElement;
    $('adModalTitle').textContent = title; $('adModalBody').innerHTML = body;
    $('adModalError').hidden = true; $('adModalDelete').hidden = !onDelete;
    $('adModal').hidden = false; document.documentElement.classList.add('bk-lock');
    var first = $('adModalBody').querySelector('input:not([type=checkbox]),select'); if (first) first.focus();
  }
  function closeModal() { $('adModal').hidden = true; document.documentElement.classList.remove('bk-lock'); if (M.last && M.last.focus) M.last.focus(); }
  function run(p) {
    if (!p) return;
    $('adModalSave').disabled = true;
    Promise.resolve(p).then(function (r) {
      $('adModalSave').disabled = false;
      if (r && r.error) { $('adModalError').textContent = friendly(r.error); $('adModalError').hidden = false; return; }
      closeModal(); toast('Saved'); loadAll();
    });
  }
  $('adModalForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = {}; [].forEach.call(this.elements, function (el) { if (el.name) v[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
    try { run(M.save(v)); } catch (err) { $('adModalError').textContent = err.message; $('adModalError').hidden = false; }
  });
  $('adModalDelete').addEventListener('click', function () { run(M.del && M.del()); });
  $('adModal').addEventListener('click', function (e) { if (e.target === this || e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('adModal').hidden) closeModal(); });
})();
