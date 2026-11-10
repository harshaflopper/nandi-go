/* Nandi Go — My trips: the signed-in traveller's bookings, e-tickets and ID progress. */
(function () {
  var NG = window.NG, I = window.NGIcon, A = window.NGAuth;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var trips = [];
  if (!A) { $('mtList').innerHTML = '<p class="bk-error">Sign-in could not load. Please refresh the page.</p>'; return; }

  function day(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; }
  function expired(t) { return t.status === 'new' && Date.now() - new Date(t.created_at).getTime() > 3 * 864e5; }
  function ended(t) { var e = t.end_date || t.travel_date; return e && new Date(e + 'T23:59:59+05:30').getTime() < Date.now(); }
  function state(t) {
    if (t.status === 'cancelled') return ['Cancelled', 'bad'];
    if (expired(t)) return ['Expired (not paid)', 'bad'];
    if (t.status === 'new') return ['Payment pending', 'wait'];
    if (t.status === 'completed' || ended(t)) return ['Completed', 'ok'];
    return ['Confirmed', 'ok'];
  }

  function render() {
    var u = A.user();
    $('mtGate').hidden = !!u; $('mtOut').hidden = !u;
    if (!u) { $('mtList').innerHTML = ''; $('mtHello').textContent = 'Your bookings, e-tickets and traveller IDs in one place.'; return; }
    $('mtHello').innerHTML = 'Signed in as <b>' + esc(u.email) + '</b>';
    if (!trips.length) {
      $('mtList').innerHTML = '<div class="mt-empty">' + I('ticket') + '<h2>No trips yet</h2><p>Bookings you make while signed in with this Google account will appear here.</p><a class="btn btn-gold" href="index.html#trips">' + I('compass') + 'Find a trip</a></div>';
      return;
    }
    $('mtList').innerHTML = trips.map(function (t) {
      var trip = NG.trip(t.trip_id), st = t.style_id && NG.style(t.style_id), s = state(t), pc = trip && NG.POSTCARDS[trip.dest];
      var img = (trip && (trip.image || (trip.photos || [])[0])) || (pc && pc.photo) || '';
      var when = t.batch_label ? t.batch_label + ' · ' + day(t.start_date) + (t.end_date && t.end_date !== t.start_date ? ' – ' + day(t.end_date) : '') : (t.travel_date ? day(t.travel_date) : 'Date to be confirmed');
      var ids = t.ids_done + ' of ' + t.guests_total + ' ID' + (t.guests_total > 1 ? 's' : '');
      var acts = '';
      if (t.status === 'confirmed' && t.balance > 0 && !ended(t)) acts += '<button type="button" class="btn btn-gold btn-sm" data-balance="' + esc(t.ref) + '">' + I('card') + 'Pay balance ' + NG.fmt(t.balance) + '</button>';
      if (t.status === 'confirmed' || t.status === 'completed') acts += '<a class="btn btn-gold btn-sm" href="ticket?b=' + encodeURIComponent(t.ref) + '&k=' + t.ticket_key + '">' + I('ticket') + 'Open e-ticket</a>';
      if (t.status === 'new' && !expired(t)) acts += '<button type="button" class="btn btn-gold btn-sm" data-resume="' + esc(t.ref) + '">' + I('card') + (t.ids_done < t.guests_total ? 'Upload IDs &amp; pay' : 'Pay advance') + '</button>';
      if (s[0] === 'Completed') acts += '<a class="btn btn-ghost btn-sm" href="index.html?review=' + encodeURIComponent(t.ref) + '#reviews">' + I('star') + 'Write a review</a>';
      if (expired(t)) acts += '<a class="btn btn-ghost btn-sm" href="trip?id=' + encodeURIComponent(t.trip_id) + (t.style_id ? '&style=' + t.style_id : '') + '">Book again</a>';
      return '<article class="mt-card">' +
        '<div class="mt-ph" style="background-image:url(\'' + esc(img) + '\')"></div>' +
        '<div class="mt-body"><div class="mt-top"><span class="et-chip ' + s[1] + '">' + s[0] + '</span><small>' + esc(t.ref) + '</small></div>' +
          '<h2>' + esc(t.trip_title) + '</h2>' +
          '<p class="mt-meta"><span>' + I('calendar') + esc(when) + '</span>' + (st ? '<span>' + I('users') + esc(st.name) + '</span>' : '') +
            '<span>' + I('shield') + esc(ids) + (t.ids_rejected ? ' · ' + t.ids_rejected + ' to redo' : '') + '</span>' +
            '<span>' + I('rupee') + (t.amount_paid ? 'Paid ' + NG.fmt(t.amount_paid) + ' of ' + NG.fmt(t.estimated_total || t.amount_paid) + (t.balance > 0 ? ' · Balance ' + NG.fmt(t.balance) + ' due 3 days before the trip' : ' · Fully paid') : 'Total ' + NG.fmt(t.estimated_total || 0)) + '</span></p>' +
          (acts ? '<div class="mt-acts">' + acts + '</div>' : '') +
        '</div></article>';
    }).join('');
  }

  function load() {
    if (!A.user()) { trips = []; render(); return; }
    $('mtList').innerHTML = '<p class="et-muted">Loading your trips…</p>';
    A.client.rpc('my_trips').then(function (r) {
      if (r.error) { $('mtList').innerHTML = '<p class="bk-error">Could not load your trips: ' + esc(r.error.message) + '</p>'; return; }
      trips = r.data || []; render();
    });
  }

  $('mtGoogle').addEventListener('click', function () {
    this.disabled = true;
    A.signIn(location.origin + '/my-trips').then(function (r) { if (r && r.error) throw r.error; }).catch(function (e) { $('mtGoogle').disabled = false; $('mtErr').textContent = 'Google sign-in failed: ' + (e.message || e); $('mtErr').hidden = false; });
  });
  $('mtOut').addEventListener('click', function () { A.signOut(); });
  $('mtList').addEventListener('click', function (e) {
    var pb = e.target.closest('[data-balance]');
    if (pb) { var tb = trips.filter(function (x) { return x.ref === pb.dataset.balance; })[0]; if (tb && window.NGBooking) NGBooking.payBalance(tb.ref, tb.trip_id); return; }
    var b = e.target.closest('[data-resume]'); if (!b) return;
    var t = trips.filter(function (x) { return x.ref === b.dataset.resume; })[0];
    if (t && window.NGBooking) NGBooking.resume(t.ref, t.trip_id, t.estimated_total);
  });
  document.addEventListener('ng:auth', load);
  document.addEventListener('ng:catalog', render);
  // refresh after a payment or ID upload in the booking card
  document.addEventListener('click', function (e) { if (e.target.closest('[data-bk-close]')) setTimeout(load, 300); });
  if (A.ready()) load();
})();
