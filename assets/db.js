/* Nandi Go — Supabase connection for the public pages.
 * Loads the trip catalogue, hidden styles and open batches, and saves booking requests.
 * The publishable key is safe in the browser: visitors can only read the catalogue and
 * create a booking request. Everything else needs the admin's Google sign-in. Load after data.js. */
(function () {
  var URL = 'https://hvxzgvigrlkovehfwtob.supabase.co';
  var KEY = 'sb_publishable_HXEl_gW6Y6e5WHfyXqyWKQ_r5fq0GtX';
  var H = { apikey: KEY, 'Content-Type': 'application/json' };

  function ok(r, what) { if (!r.ok) throw new Error(what + ' ' + r.status); return r.json(); }
  function rpc(name, args) {
    return fetch(URL + '/rest/v1/rpc/' + name, { method: 'POST', headers: H, body: JSON.stringify(args || {}) }).then(function (r) { return ok(r, 'rpc ' + name); });
  }
  function get(path) { return fetch(URL + '/rest/v1/' + path, { headers: H }).then(function (r) { return ok(r, 'get ' + path); }); }
  function insert(table, row) {
    return fetch(URL + '/rest/v1/' + table, { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify(row) })
      .then(function (r) {
        if (r.ok) return true;
        return r.json().catch(function () { return {}; }).then(function (e) { var err = new Error(e.message || ('insert ' + r.status)); err.status = r.status; throw err; });
      });
  }

  var NG = window.NG = window.NG || {};
  NG.DB = { url: URL, key: KEY, rpc: rpc, get: get, insert: insert, live: false };

  function replace(arr, items) { arr.length = 0; Array.prototype.push.apply(arr, items); }
  function fire(name) { document.dispatchEvent(new CustomEvent(name)); }

  /* Batches only (used again after a booking fails because a batch just filled) */
  NG.refreshBatches = function () {
    return rpc('open_batches').then(function (rows) {
      replace(NG.BATCHES, rows.map(function (b) {
        return { id: b.id, trip_id: b.trip_id, style_id: b.style_id, label: b.label, start: b.start_date, end: b.end_date,
                 seats: b.seats_total, left: b.seats_left, status: b.status, price: b.price, live: true };
      }));
      NG.DB.live = true;
      fire('ng:batches');
    });
  };

  NG.catalogReady = Promise.all([
    get('trips?select=*&active=eq.true&order=sort.asc,title.asc'),
    get('styles?select=id,hidden,sort&order=sort.asc'),
    NG.refreshBatches()
  ]).then(function (r) {
    var trips = r[0].map(function (t) {
      var old = NG.trip && NG.trip(t.id) || {};
      return {
        id: t.id, title: t.title, short: old.short || t.title, dest: t.dest, region: t.region, duration: t.duration || '',
        image: t.image || old.image, description: t.description || '', perks: t.perks || [], stops: t.stops && t.stops.length ? t.stops : null,
        price: t.price, was: t.was, unit: t.unit, variants: t.variants && t.variants.length ? t.variants : null,
        style_prices: t.style_prices || {}, note: t.note, group: t.id === 'chikka-retreat' ? 'retreat' : (old.group || 'tour'),
        from: t.variants && t.variants.length ? Math.min.apply(null, t.variants.map(function (v) { return v.price; })) : t.price
      };
    });
    if (trips.length) replace(NG.TRIPS, trips);
    r[1].forEach(function (s) { var st = NG.style(s.id); if (st) { st.hidden = s.hidden; st.sort = s.sort; } });
    NG.STYLES.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
    fire('ng:catalog');
  }).catch(function (e) { console.warn('Nandi Go: using the offline trip list', e); fire('ng:catalog'); });
})();
