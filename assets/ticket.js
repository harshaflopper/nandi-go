/* Nandi Go — e-ticket and traveller KYC. URL: ticket?b=<booking ref>&k=<secret ticket key>.
 * Everything goes through the "ticket" Edge Function, which checks the secret key. KYC files are uploaded
 * straight into a private bucket with a one-time signed URL; this page can never read them back. */
(function () {
  var NG = window.NG, I = window.NGIcon;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var q = new URLSearchParams(location.search), REF = (q.get('b') || '').toUpperCase(), KEY = q.get('k') || '';
  var T = null, choice = {}, busy = {};
  var ID_NAMES = { aadhaar: 'Aadhaar (masked)', dl: 'Driving licence', voter: 'Voter ID', passport: 'Passport' };
  var STATUS = { none: ['Not uploaded', 'todo'], submitted: ['Under review', 'wait'], approved: ['Approved', 'ok'], rejected: ['Please upload again', 'bad'] };

  function api(body) {
    body.b = REF; body.ref = REF; body.k = KEY;
    return fetch(NG.DB.url + '/functions/v1/ticket', { method: 'POST', headers: { apikey: NG.DB.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Error ' + r.status); return j; }); });
  }
  function fail(msg) { $('etLoading').innerHTML = '<b>' + esc(msg) + '</b><br><a href="index.html">Go to the home page</a>'; }
  function day(iso) { return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
  function ticketUrl() { return location.origin + '/ticket?b=' + encodeURIComponent(REF) + '&k=' + encodeURIComponent(KEY); }

  function load() {
    if (!REF || !/^[0-9a-f]{32}$/.test(KEY)) return fail('This ticket link is incomplete. Please open the link from your booking message.');
    api({ action: 'get' }).then(function (t) { T = t; render(); }, function (e) { fail(e.message); });
  }

  function render() {
    var t = T, trip = t.trip || {}, dest = NG.dest(trip.dest) || {}, st = t.style_id && NG.style(t.style_id);
    var paid = t.status === 'confirmed' || t.status === 'completed';
    document.title = 'Ticket ' + t.ref + ' — Nandi Go';
    $('etLoading').hidden = true; $('etApp').hidden = false;
    var due = t.balance || 0, dueBy = '';
    var start = (t.batch && t.batch.start_date) || t.travel_date;
    if (start) { var d = new Date(start + 'T00:00:00'); d.setDate(d.getDate() - 3); dueBy = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
    $('etBanner').hidden = paid && !due;
    if (!paid) $('etBanner').innerHTML = I('info') + (t.status === 'cancelled' ? 'This booking was cancelled.' : 'The advance is not paid yet, so seats are not confirmed. Open My trips to pay.');
    else if (due) $('etBanner').innerHTML = I('info') + '<span>Balance of <b>' + NG.fmt(due) + '</b> is due' + (dueBy ? ' by <b>' + dueBy + '</b>' : ' 3 days before the trip') + '. <a href="my-trips">Pay the balance in My trips</a></span>';
    $('etState').className = 'et-state ' + (paid ? 'ok' : 'wait');
    $('etState').innerHTML = paid ? I('check') + 'Confirmed' : 'Payment pending';
    var name = dest.name || trip.place || trip.title || '';
    $('etTo').textContent = (name.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'NG').toUpperCase();
    $('etToName').textContent = name.split('·')[0].trim();
    $('etTitle').textContent = trip.title || t.trip_title;
    var when = t.batch ? day(t.batch.start_date) + (t.batch.end_date && t.batch.end_date !== t.batch.start_date ? ' → ' + day(t.batch.end_date) : '') : (t.travel_date ? day(t.travel_date) : 'Date to be confirmed');
    var meta = [['Travel dates', when], ['Booking ID', t.ref], ['Travel style', st ? st.name : '—'], ['Seats', t.seats + (t.unit === 'couple' ? ' (' + t.travellers + ' couple' + (t.travellers > 1 ? 's' : '') + ')' : '')],
      ['Paid', t.amount_paid ? NG.fmt(t.amount_paid) + (t.estimated_total ? ' of ' + NG.fmt(t.estimated_total) : '') : '—'], ['Balance', due ? NG.fmt(due) + (dueBy ? ' · due ' + dueBy : '') : 'Fully paid'], ['Booked by', t.name + ' · ••' + t.phone_last4]];
    if (t.variant) meta.splice(3, 0, ['Package', t.variant]);
    $('etMeta').innerHTML = meta.map(function (m) { return '<div><span>' + m[0] + '</span><b>' + esc(m[1]) + '</b></div>'; }).join('');
    $('etPax').innerHTML = t.guests.map(function (g, i) {
      var k = kycOf(i), s = STATUS[k ? k.status : 'none'];
      return '<li><b>' + esc(g.name) + '</b>' + (g.age ? '<small>' + g.age + ' yrs</small>' : '') + '<em class="et-chip ' + s[1] + '">' + (k && k.status === 'approved' ? 'ID ✓' : k ? 'ID sent' : 'ID due') + '</em></li>';
    }).join('');
    $('etRef').textContent = t.ref;
    var qr = $('etQr'); qr.innerHTML = '';
    if (window.QRCode) new QRCode(qr, { text: ticketUrl(), width: 148, height: 148, colorDark: '#0F1F18', colorLight: '#FBF6E9', correctLevel: QRCode.CorrectLevel.M });
    var msg = 'My Nandi Go e-ticket ' + t.ref + ' (' + (trip.title || t.trip_title) + ', ' + when + '): ' + ticketUrl();
    $('etWa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);

    var pick = trip.pickups || [];
    $('etPickWrap').hidden = !pick.length;
    $('etPick').innerHTML = pick.map(function (p) { return '<li>' + I('pin') + '<b>' + esc(p.place) + '</b>' + (p.time ? '<span>' + esc(p.time) + '</span>' : '') + '</li>'; }).join('');
    renderKyc();
  }

  function kycOf(i) { return (T.kyc || []).filter(function (k) { return k.guest_index === i; })[0]; }
  function renderKyc() {
    var t = T, paid = t.status === 'confirmed' || t.status === 'completed';
    var done = t.guests.filter(function (_, i) { var k = kycOf(i); return k && k.status !== 'rejected'; }).length;
    $('etKycCount').textContent = done + ' of ' + t.guests.length + ' done';
    $('etKycCount').className = 'et-kyc-count' + (done === t.guests.length ? ' ok' : '');
    var ids = t.kyc_ids;
    $('etIdNote').innerHTML = I('info') + (ids.length === 1 && ids[0] === 'passport' ? 'This is an international trip: a valid <b>passport</b> is required for every traveller.'
      : ids.length === 2 && ids.indexOf('passport') >= 0 && ids.indexOf('aadhaar') >= 0 ? 'This trip includes a flight: please upload a <b>passport</b> or <b>Aadhaar</b> for every traveller. For Aadhaar, use the <b>masked Aadhaar</b> (only the last 4 digits visible) from <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noopener">myaadhaar.uidai.gov.in</a> or DigiLocker.'
      : 'Accepted: masked Aadhaar, driving licence, voter ID or passport. For Aadhaar, use the <b>masked Aadhaar</b> (only the last 4 digits visible) from <a href="https://myaadhaar.uidai.gov.in" target="_blank" rel="noopener">myaadhaar.uidai.gov.in</a> or DigiLocker.');
    if (!paid) { $('etKycList').innerHTML = '<p class="et-muted">ID upload opens once the booking is confirmed.</p>'; return; }
    if (!t.kyc_open) { $('etKycList').innerHTML = '<p class="et-muted">This trip has ended, so ID upload is closed.</p>'; return; }
    $('etKycList').innerHTML = t.guests.map(function (g, i) {
      var k = kycOf(i), s = STATUS[k ? k.status : 'none'], locked = k && k.status === 'approved';
      var sel = choice[i] || (k && ids.indexOf(k.id_type) >= 0 ? k.id_type : ids[0]);
      return '<div class="et-kp ' + s[1] + '" data-i="' + i + '">' +
        '<div class="et-kp-who"><span class="et-kp-n">' + (i + 1) + '</span><div><b>' + esc(g.name) + '</b><small>' + (g.age ? g.age + ' yrs · ' : '') + (k ? ID_NAMES[k.id_type] : 'No ID yet') + '</small></div>' +
          '<em class="et-chip ' + s[1] + '">' + (s[1] === 'ok' ? I('check') : '') + s[0] + '</em></div>' +
        (k && k.status === 'rejected' && k.note ? '<p class="et-kp-note">' + esc(k.note) + '</p>' : '') +
        (locked ? '' : '<div class="et-kp-up"><select data-idtype="' + i + '" aria-label="ID type for ' + esc(g.name) + '">' + ids.map(function (x) { return '<option value="' + x + '"' + (x === sel ? ' selected' : '') + '>' + ID_NAMES[x] + '</option>'; }).join('') + '</select>' +
          '<label class="btn btn-ghost btn-sm et-file">' + I('camera') + '<span>' + (busy[i] || (k ? 'Replace photo' : 'Upload photo or PDF')) + '</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-file="' + i + '" hidden' + (busy[i] ? ' disabled' : '') + '></label></div>') +
      '</div>';
    }).join('');
  }

  /* Phone photos are often 5–10 MB: shrink images to ~1800px JPEG before upload (PDFs go as they are) */
  function prepare(file) {
    if (file.type === 'application/pdf') return file.size <= 5 * 1024 * 1024 ? Promise.resolve(file) : Promise.reject(new Error('This PDF is over 5 MB. Please upload a photo instead.'));
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('Please choose a photo or a PDF.'));
    return new Promise(function (ok, no) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { b && b.size <= 5 * 1024 * 1024 ? ok(b) : no(new Error('This photo is too large. Please try another.')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(new Error('This photo could not be read. Please try a JPG or PNG.')); };
      img.src = url;
    });
  }

  function upload(i, file) {
    if (!$('etConsent').checked) { alert('Please tick the consent box above first.'); return; }
    var type = choice[i] || (document.querySelector('[data-idtype="' + i + '"]') || {}).value;
    busy[i] = 'Uploading…'; renderKyc();
    var blob;
    prepare(file).then(function (b) { blob = b; return api({ action: 'kyc_upload', guest_index: i, id_type: type, content_type: b.type || 'application/pdf' }); })
      .then(function (u) {
        return fetch(u.signed_url, { method: 'PUT', headers: { 'Content-Type': blob.type, 'x-upsert': 'false' }, body: blob })
          .then(function (r) { if (!r.ok) throw new Error('Upload failed. Please check your internet and try again.'); return u.path; });
      })
      .then(function (path) { return api({ action: 'kyc_save', guest_index: i, id_type: type, path: path }); })
      .then(function () { delete busy[i]; return api({ action: 'get' }); })
      .then(function (t) { T = t; render(); toast('ID uploaded for ' + T.guests[i].name); })
      .catch(function (e) { delete busy[i]; renderKyc(); alert(e.message || 'Upload failed. Please try again.'); });
  }

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset.idtype != null) choice[+el.dataset.idtype] = el.value;
    if (el.dataset.file != null && el.files[0]) { upload(+el.dataset.file, el.files[0]); el.value = ''; }
  });
  document.addEventListener('click', function (e) {
    var f = e.target.closest('.et-file');
    if (f && !$('etConsent').checked) { e.preventDefault(); $('etConsent').closest('.et-consent').classList.add('shake'); setTimeout(function () { $('etConsent').closest('.et-consent').classList.remove('shake'); }, 600); }
  });

  $('etCopy').addEventListener('click', function () {
    (navigator.clipboard ? navigator.clipboard.writeText(ticketUrl()) : Promise.reject()).then(function () { toast('Ticket link copied'); }, function () { prompt('Copy your ticket link', ticketUrl()); });
  });
  $('etDownload').addEventListener('click', function () {
    var btn = this; if (!window.html2canvas) return window.print();
    btn.disabled = true;
    html2canvas($('etPass'), { scale: 2, backgroundColor: null, useCORS: true }).then(function (c) {
      var a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'NandiGo-ticket-' + T.ref + '.png'; a.click(); btn.disabled = false;
    }, function () { btn.disabled = false; window.print(); });
  });
  function toast(m) {
    var t = $('etToast'); if (!t) { t = document.createElement('div'); t.id = 'etToast'; t.className = 'tc-toast'; document.body.appendChild(t); }
    t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  load();
})();
