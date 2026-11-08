/* Nandi Go — Supabase connection (bookings, batches, appointed districts).
 * The publishable key is safe in the browser: the database rules only let visitors
 * create a booking request and read open batches. Everything else needs the admin's Google sign-in.
 * Load after data.js. */
(function () {
  var URL = 'https://hvxzgvigrlkovehfwtob.supabase.co';
  var KEY = 'sb_publishable_HXEl_gW6Y6e5WHfyXqyWKQ_r5fq0GtX';
  var H = { apikey: KEY, 'Content-Type': 'application/json' };

  function rpc(name, args) {
    return fetch(URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: H, body: JSON.stringify(args || {}) })
      .then(function (r) { if (!r.ok) throw new Error('rpc ' + name + ' ' + r.status); return r.json(); });
  }
  function insert(table, row) {
    return fetch(URL + '/rest/v1/' + table, { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify(row) })
      .then(function (r) {
        if (r.ok) return true;
        return r.json().catch(function () { return {}; }).then(function (e) { var err = new Error(e.message || ('insert ' + r.status)); err.status = r.status; throw err; });
      });
  }

  var NG = window.NG = window.NG || {};
  NG.DB = { url: URL, key: KEY, rpc: rpc, insert: insert, live: false };

  /* Live retreat batches replace the fallback list in data.js */
  NG.refreshBatches = function () { return rpc('open_batches').then(function (rows) {
    var list = rows.filter(function (b) { return b.trip_id === 'retreat'; }).map(function (b) {
      return { id: b.id, label: b.label, start: b.start_date, end: b.end_date, seats: b.seats_total, left: b.seats_left, status: b.status, live: true };
    });
    if (NG.RETREAT_BATCHES) { NG.RETREAT_BATCHES.length = 0; Array.prototype.push.apply(NG.RETREAT_BATCHES, list); }
    NG.DB.live = true;
    document.dispatchEvent(new CustomEvent('ng:batches'));
    return list;
  }).catch(function (e) { console.warn('Nandi Go: using batch dates from data.js', e); return null; }); };
  NG.batchesReady = NG.refreshBatches();

  /* Only batches that are open (not full) can be booked */
  var base = NG.openBatches;
  if (base) NG.openBatches = function () { return base().filter(function (b) { return b.status !== 'full'; }); };
})();
