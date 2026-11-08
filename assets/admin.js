/* Nandi Go — admin page (Google sign-in through Supabase).
 * Only emails listed in the database table "admins" can read or change data; the rules are enforced by the database. */
(function () {
  var SB_URL = 'https://hvxzgvigrlkovehfwtob.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eHpndmlncmxrb3ZlaGZ3dG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxMTMwNzUsImV4cCI6MjEwOTY4OTA3NX0.fdLsA5H8rw-iRTd9-_5uM4lrkfb94dEvkZf8DAltaeg';
  var sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });

  var DISTRICTS = ['Bagalkote','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban','Bidar','Chamarajanagar','Chikkaballapura','Chikkamagaluru','Chitradurga','Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mysuru','Raichur','Ramanagara','Shivamogga','Tumakuru','Udupi','Uttara Kannada','Vijayanagara','Vijayapura','Yadgir'];
  var KIT_TARGET = 10; // confirmed persons before the ₹4,999 kit is refunded
  var S = { batches: [], bookings: [], partners: [], settings: {}, tab: 'overview' };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return n == null || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN'); };
  var day = function (d) { return d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };
  var range = function (b) { return day(b.start_date) + ' – ' + day(b.end_date); };
  var today = function () { return NG.todayISO(); };
  var seatsOf = function (k) { return k.travellers * (k.unit === 'couple' ? 2 : 1); };
  var tripName = function (id) { if (id === 'retreat') return 'Coffee Estate Retreat (all packages)'; var t = NG.trip(id); return t ? t.title : id; };
  var STATUS_LABEL = { new: 'New request', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed', open: 'Open', full: 'Full', closed: 'Closed', applied: 'Applied', approved: 'Approved', active: 'Active', paused: 'Paused', rejected: 'Rejected', terminated: 'Terminated' };
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
      sb.from('app_settings').select('key,value')
    ]).then(function (r) {
      var bad = r.filter(function (x) { return x.error; })[0];
      if (bad) { toast(friendly(bad.error), true); return; }
      S.batches = r[0].data; S.bookings = r[1].data; S.partners = r[2].data;
      S.settings = {}; r[3].data.forEach(function (x) { S.settings[x.key] = x.value; });
      renderAll();
    });
  }
  function renderAll() { renderOverview(); renderBatches(); fillBookingFilters(); renderBookings(); renderPartners(); renderSettings(); }

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
      stat(refunds.length, 'Kit refunds due', 'partners');
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
      '<div class="ad-batch-main"><b>' + esc(b.label) + '</b><span>' + esc(tripName(b.trip_id)) + '</span><em>' + range(b) + '</em></div>' +
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
    var list = S.batches.filter(function (b) { return past || (b.status !== 'completed' && b.end_date >= t); })
      .sort(function (a, b) { return a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0; });
    $('adBatchList').innerHTML = list.length ? list.map(batchRow).join('') : '<p class="ad-empty">No upcoming batches. Use “New batch”.</p>';
  }
  $('adShowPast').addEventListener('change', renderBatches);
  $('adNewBatch').addEventListener('click', function () { editBatch(null); });

  function tripOptions(sel, withRetreat) {
    var o = withRetreat ? '<option value="retreat"' + (sel === 'retreat' ? ' selected' : '') + '>Coffee Estate Retreat (all 3 packages share seats)</option>' : '';
    return o + NG.TRIPS.map(function (t) { return '<option value="' + t.id + '"' + (t.id === sel ? ' selected' : '') + '>' + esc(t.title) + '</option>'; }).join('');
  }
  function editBatch(b, copy) {
    var isNew = !b || copy;
    var src = b || { trip_id: 'retreat', label: 'Batch ' + (S.batches.filter(function (x) { return x.trip_id === 'retreat'; }).length + 1), seats_total: 20, status: 'open' };
    if (copy) src = { trip_id: b.trip_id, label: nextLabel(b.label), seats_total: b.seats_total, status: 'open', notes: b.notes };
    modal(isNew ? 'New batch' : 'Edit batch',
      '<label>Trip<select name="trip_id">' + tripOptions(src.trip_id, true) + '</select></label>' +
      '<div class="ad-2"><label>Batch name<input name="label" required maxlength="80" value="' + esc(src.label) + '"/></label>' +
      '<label>Seats<input name="seats_total" type="number" min="1" max="500" required value="' + esc(src.seats_total) + '"/></label></div>' +
      '<div class="ad-2"><label>Start date<input name="start_date" type="date" required value="' + esc(src.start_date || '') + '"/></label>' +
      '<label>End date<input name="end_date" type="date" required value="' + esc(src.end_date || '') + '"/></label></div>' +
      (isNew ? '' : '<label>Status<select name="status">' + ['open', 'full', 'closed', 'completed'].map(function (s) { return '<option value="' + s + '"' + (s === src.status ? ' selected' : '') + '>' + STATUS_LABEL[s] + '</option>'; }).join('') + '</select></label>') +
      '<label>Notes (only you see these)<textarea name="notes" rows="2">' + esc(src.notes || '') + '</textarea></label>',
      function (v) {
        var row = { trip_id: v.trip_id, label: v.label.trim(), seats_total: +v.seats_total, start_date: v.start_date, end_date: v.end_date, notes: v.notes.trim() || null };
        if (!row.label || !row.start_date || !row.end_date || !(row.seats_total > 0)) throw new Error('Please fill name, seats and both dates.');
        if (row.end_date < row.start_date) throw new Error('End date must be on or after the start date.');
        if (!isNew) row.status = v.status;
        return isNew ? sb.from('batches').insert(row) : sb.from('batches').update(row).eq('id', b.id);
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
    $('adBkBatch').innerHTML = '<option value="">All batches</option>' + S.batches.map(function (b) { return '<option value="' + b.id + '">' + esc(b.label + ' · ' + day(b.start_date)) + '</option>'; }).join('');
    $('adBkTrip').value = tv; $('adBkBatch').value = bv;
  }
  function filteredBookings() {
    var q = $('adBkSearch').value.trim().toLowerCase(), st = $('adBkStatus').value, tr = $('adBkTrip').value, ba = $('adBkBatch').value;
    return S.bookings.filter(function (k) {
      if (st && k.status !== st) return false;
      if (tr && k.trip_id !== tr) return false;
      if (ba && k.batch_id !== ba) return false;
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
        '<td data-l="Trip">' + esc(k.trip_title) + (k.variant ? '<small>' + esc(k.variant) + '</small>' : '') + (k.partner_code ? '<small>Partner ' + esc(k.partner_code) + '</small>' : '') + '</td>' +
        '<td data-l="Date">' + (b ? esc(b.label) + '<small>' + range(b) + '</small>' : day(k.travel_date)) + '</td>' +
        '<td data-l="Seats">' + seatsOf(k) + (k.unit === 'couple' ? '<small>' + k.travellers + ' couple' + (k.travellers > 1 ? 's' : '') + '</small>' : '') + '</td>' +
        '<td data-l="Estimate">' + fmt(k.estimated_total) + '</td>' +
        '<td data-l="Paid">' + (k.amount_paid ? fmt(k.amount_paid) : (k.advance_paid ? 'Advance' : '—')) + '</td>' +
        '<td data-l="Status">' + pill(k.status) + '</td>' +
        '<td class="ad-td-act">' + (k.status === 'new' ? '<button class="btn btn-gold btn-sm" data-quick-confirm="' + k.id + '">Confirm</button>' : '') +
          '<button class="btn btn-ghost btn-sm" data-edit-booking="' + k.id + '">Open</button></td></tr>';
    }).join('');
  }
  ['adBkSearch', 'adBkStatus', 'adBkTrip', 'adBkBatch'].forEach(function (id) { $(id).addEventListener('input', renderBookings); });
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
  function batchOptions(tripId, sel) {
    var t = NG.trip(tripId), list = S.batches.filter(function (b) { return b.trip_id === tripId || (b.trip_id === 'retreat' && t && t.group === 'retreat'); });
    return '<option value="">No batch (own date)</option>' + list.map(function (b) {
      return '<option value="' + b.id + '"' + (b.id === sel ? ' selected' : '') + '>' + esc(b.label + ' · ' + range(b) + ' · ' + b.seats_taken + '/' + b.seats_total + ' (' + (STATUS_LABEL[b.status]) + ')') + '</option>';
    }).join('');
  }
  function editBooking(k) {
    var isNew = !k;
    k = k || { trip_id: 'chikka-mix', travellers: 1, status: 'confirmed', unit: 'person' };
    var codes = S.partners.filter(function (p) { return p.partner_code; }).map(function (p) { return '<option value="' + esc(p.partner_code) + '">' + esc(p.name + ' · ' + (p.taluk || p.district)) + '</option>'; }).join('');
    modal(isNew ? 'Add booking' : 'Booking ' + k.ref,
      '<label>Trip<select name="trip_id" id="mTrip">' + tripOptions(k.trip_id, false) + '</select></label>' +
      '<div class="ad-2"><label>Batch<select name="batch_id" id="mBatch">' + batchOptions(k.trip_id, k.batch_id) + '</select></label>' +
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
      (isNew ? '' : '<p class="ad-hint">Requested ' + day(k.created_at.slice(0, 10)) + (k.variant ? ' · ' + esc(k.variant) : '') + '. Confirmed seats count towards the batch; when it is full the batch closes and you get an email.</p>'),
      function (v) {
        var t = NG.trip(v.trip_id) || { title: v.trip_id, unit: 'person' };
        var phone = v.phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
        if (!v.name.trim()) throw new Error('Please enter the name.');
        if (!/^[6-9]\d{9}$/.test(phone)) throw new Error('Phone must be a 10-digit Indian mobile number.');
        var row = {
          trip_id: v.trip_id, trip_title: isNew || v.trip_id !== k.trip_id ? t.title : k.trip_title, unit: t.unit === 'couple' ? 'couple' : 'person',
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
    $('mTrip').addEventListener('change', function () {
      $('mBatch').innerHTML = batchOptions(this.value, null);
      var t = NG.trip(this.value); $('mPaxLabel').textContent = t && t.unit === 'couple' ? 'Couples' : 'Travellers';
    });
  }
  $('adExport').addEventListener('click', function () {
    var cols = ['ref', 'created_at', 'status', 'trip_title', 'variant', 'travel_date', 'travellers', 'unit', 'name', 'phone', 'email', 'estimated_total', 'advance_paid', 'amount_paid', 'payment_ref', 'partner_code', 'admin_notes'];
    var lines = [cols.concat('batch').join(',')].concat(filteredBookings().map(function (k) {
      var b = byId(S.batches, k.batch_id);
      return cols.map(function (c) { return k[c]; }).concat(b ? b.label + ' ' + b.start_date : '').map(function (v) {
        v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"';
      }).join(',');
    }));
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' }));
    a.download = 'nandigo-bookings-' + today() + '.csv'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

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
    var link = S.settings.applications_sheet_url; $('adSheetLink').hidden = !link; if (link) $('adSheetLink').href = link;
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
        '<td data-l="Partner"><b>' + esc(p.name) + '</b><small>' + (p.phone ? '<a href="https://wa.me/91' + esc(p.phone) + '" target="_blank" rel="noopener">' + esc(p.phone) + '</a>' : '') + (p.email ? ' · ' + esc(p.email) : '') + '</small></td>' +
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
    $('adCover').innerHTML = '<h3>District coverage <span>' + Object.keys(taken).length + ' of ' + DISTRICTS.length + ' districts have a partner</span></h3><div class="ad-chips">' +
      DISTRICTS.map(function (d) { return '<span class="ad-chip' + (taken[d] ? ' on' : '') + '" title="' + esc(taken[d] ? taken[d].name : 'Open') + '">' + esc(d) + (talukCount[d] ? ' <i>+' + talukCount[d] + ' taluk</i>' : '') + '</span>'; }).join('') + '</div>';
  }
  ['adPtSearch', 'adPtRole', 'adPtStatus'].forEach(function (id) { $(id).addEventListener('input', renderPartners); });
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
    var base = role === 'taluk' ? 'NG-TP-' + ab(taluk) + '-' : 'NG-DP-' + ab(district) + '-', i = 1;
    var used = S.partners.map(function (p) { return p.partner_code; });
    while (used.indexOf(base + (i < 10 ? '0' + i : i)) >= 0) i++;
    return base + (i < 10 ? '0' + i : i);
  }
  function editPartner(p) {
    var isNew = !p;
    p = p || { role: 'district', status: 'applied', district: '' };
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
      (isNew ? '' : '<p class="ad-hint">' + personsFor(p.partner_code) + ' confirmed persons booked with this code.</p>'),
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

  /* ---------------- Settings ---------------- */
  var SETTING_KEYS = ['notify_email', 'mail_webhook_url', 'mail_webhook_secret', 'notify_new_bookings', 'site_url', 'district_form_url', 'taluk_form_url', 'applications_sheet_url'];
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
