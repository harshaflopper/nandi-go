/* Nandi Go: Corporate Getaway — banner under the travel styles, a services pop-up and a WhatsApp enquiry. */
(function () {
  var mount = document.getElementById('corpMount'); if (!mount) return;
  var WA = (window.NG && NG.CONTACT && NG.CONTACT.WHATSAPP) || '919513646646';
  var I = function (n) { return '<svg class="ic"><use href="#i-' + n + '"/></svg>'; };
  var GROUPS = [
    ['bus', 'Travel, sorted', ['AC luxury bus', 'Experienced driver', 'Customised itinerary', 'Best corporate price']],
    ['users', 'Team time', ['Team outing', 'Team-building activities', 'Conference and training trips', 'Office tours', 'Employee family tours']],
    ['flame', 'Evenings', ['Welcome drink', 'Bonfire', 'DJ night', 'Gala dinner', 'Candle-light dinner', 'Award night']],
    ['lotus', 'Wellness and memories', ['Yoga', 'Meditation', 'Massage', 'Wellness sessions', 'Professional photography']]
  ];
  var SIZES = ['12 – 20 people', '21 – 40 people', '41 – 80 people', '80+ people'];
  var IDEAS = ['Coorg', 'Chikkamagaluru', 'Nandi Hills', 'Ooty', 'Goa', 'Kerala', 'Not sure yet'];

  var TILES = [['bus', 'AC luxury bus', 'with experienced driver'], ['users', 'Team building', 'games, award night'], ['flame', 'Gala and DJ night', 'bonfire, candle-light dinner'], ['lotus', 'Wellness', 'yoga, meditation, massage']];
  mount.innerHTML =
    '<article class="cg">' +
      '<button type="button" class="cg-poster" data-corp-open aria-label="Corporate Getaway: see what is included">' +
        '<img src="assets/styles/style-corporate.webp?v=1" srcset="assets/styles/style-corporate-sm.webp?v=1 720w, assets/styles/style-corporate.webp?v=1 1280w" sizes="(max-width: 760px) 100vw, 26vw" alt="Corporate Getaway: your team, your tour" loading="lazy" width="1280" height="853">' +
        '<span class="cg-rib">' + I('sparkle') + 'New · for companies</span>' +
      '</button>' +
      '<div class="cg-txt">' +
        '<span class="cg-k">' + I('building') + 'Corporate special package · 12+ members</span>' +
        '<h3>Corporate <em>Getaway</em></h3>' +
        '<ul class="cg-tiles">' + TILES.map(function (t) { return '<li><span class="cg-ti">' + I(t[0]) + '</span><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span></li>'; }).join('') + '</ul>' +
        '<div class="cg-cta"><button type="button" class="btn btn-gold cg-go" data-corp-open><span>Plan a team trip</span>' + I('arrow') + '</button>' +
        '<small>' + I('chat') + 'Plan and price on WhatsApp within a day</small></div>' +
      '</div>' +
    '</article>';

  var box = document.createElement('div');
  box.className = 'cp'; box.id = 'cp'; box.hidden = true;
  box.innerHTML =
    '<div class="cp-card" role="dialog" aria-modal="true" aria-labelledby="cpTitle">' +
      '<button type="button" class="sp-close cp-x" data-corp-close aria-label="Close">' + I('close') + '</button>' +
      '<div class="cp-head">' +
        '<img src="assets/styles/style-corporate-sm.webp?v=1" alt="" width="720" height="480">' +
        '<div><span class="cg-k">' + I('building') + 'Corporate Getaway · 12+ members</span><h3 id="cpTitle">Your company, <em>your tour</em></h3></div>' +
      '</div>' +
      '<div class="cp-body">' +
        '<p class="cp-lead">Pick a place, the days and the add-ons you want. We send a plan and a per-person price on WhatsApp.</p>' +
        '<div class="cp-groups">' + GROUPS.map(function (g) {
          return '<section class="cp-g"><h4>' + I(g[0]) + g[1] + '</h4><ul>' + g[2].map(function (x) { return '<li>' + I('check') + x + '</li>'; }).join('') + '</ul></section>';
        }).join('') + '</div>' +
        '<form class="cp-form" id="cpForm" novalidate>' +
          '<h4>Get a plan and price</h4>' +
          '<div class="cp-grid">' +
            '<label>Company name<input name="company" maxlength="80" autocomplete="organization" placeholder="Example: Infosys, Mysuru"></label>' +
            '<label>Your name<input name="name" maxlength="60" autocomplete="name" placeholder="Full name"></label>' +
            '<label>Team size<select name="size"><option value="">Choose</option>' + SIZES.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></label>' +
            '<div class="cp-month"><span class="cp-lab" id="cpMonthLab">Preferred month</span>' +
              '<button type="button" class="cp-month-btn" id="cpMonthBtn" aria-haspopup="true" aria-expanded="false" aria-labelledby="cpMonthLab cpMonthBtn">' + I('calendar') + '<span id="cpMonthTxt">Choose a month</span></button>' +
              '<input type="hidden" name="month" id="cpMonth">' +
              '<div class="cp-cal" id="cpCal" role="dialog" aria-label="Choose a month" hidden></div></div>' +
            '<label class="cp-two">Where would you like to go?<select name="place"><option value="">Choose</option>' + IDEAS.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select></label>' +
            '<label class="cp-wide">Anything else? <small>(optional)</small><textarea name="note" rows="2" maxlength="400" placeholder="Days, budget per person, award night, conference hall…"></textarea></label>' +
          '</div>' +
          '<p class="cp-err" id="cpErr" role="alert" hidden></p>' +
          '<div class="cp-actions"><button type="submit" class="btn btn-forest">' + I('chat') + 'Send on WhatsApp</button><a class="btn btn-ghost" href="tel:+919513646646">' + I('phone') + 'Call 9513 646 646</a></div>' +
          '<p class="cp-fine">Message us and our team will contact you. Calls and WhatsApp: 9513 646 646 · 9071 22 88 22</p>' +
        '</form>' +
      '</div>' +
    '</div>';
  document.body.appendChild(box);

  var last = null;
  function open() {
    last = document.activeElement; box.hidden = false; box.querySelector('.cp-card').scrollTop = 0;
    requestAnimationFrame(function () { box.classList.add('open'); });
    document.documentElement.classList.add('sp-lock');
    box.querySelector('[data-corp-close]').focus({ preventScroll: true });
    if (history.replaceState && location.hash !== '#corporate') history.replaceState(null, '', '#corporate');
  }
  function close() {
    box.classList.remove('open'); document.documentElement.classList.remove('sp-lock');
    setTimeout(function () { box.hidden = true; }, 200);
    if (location.hash === '#corporate' && history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    if (last && last.focus) last.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-corp-open]')) { e.preventDefault(); open(); }
    else if (!box.hidden && (e.target === box || e.target.closest('[data-corp-close]'))) close();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden && cal.hidden) close(); });
  if (location.hash === '#corporate') setTimeout(open, 300);

  /* Month picker: the next 12 months as tiles, plus "Flexible" */
  var cal = document.getElementById('cpCal'), mBtn = document.getElementById('cpMonthBtn'), mIn = document.getElementById('cpMonth');
  function months() {
    var d = new Date(), out = [];
    for (var i = 0; i < 12; i++) { var x = new Date(d.getFullYear(), d.getMonth() + i, 1); out.push(x); }
    return out;
  }
  function drawCal() {
    var list = months(), year = null;
    cal.innerHTML = '<div class="cp-cal-grid">' + list.map(function (x) {
      var v = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0');
      var yr = x.getFullYear() !== year; year = x.getFullYear();
      return '<button type="button" data-m="' + v + '"' + (mIn.value === v ? ' class="on" aria-pressed="true"' : '') + '><b>' + x.toLocaleDateString('en-IN', { month: 'short' }) + '</b><small>' + (yr ? x.getFullYear() : '&nbsp;') + '</small></button>';
    }).join('') + '</div><button type="button" class="cp-cal-flex' + (mIn.value === 'flex' ? ' on' : '') + '" data-m="flex">Flexible, any month works</button>';
  }
  function openCal(on) {
    if (on) drawCal();
    cal.hidden = !on; mBtn.setAttribute('aria-expanded', String(on));
    if (on) { var f = cal.querySelector('.on') || cal.querySelector('[data-m]'); setTimeout(function () { cal.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); f.focus({ preventScroll: true }); }, 0); }
  }
  mBtn.addEventListener('click', function () { openCal(cal.hidden); });
  cal.addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]'); if (!b) return;
    mIn.value = b.dataset.m;
    document.getElementById('cpMonthTxt').textContent = b.dataset.m === 'flex' ? 'Flexible' : new Date(b.dataset.m + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    mBtn.classList.add('set'); openCal(false); mBtn.focus();
  });
  document.addEventListener('click', function (e) { if (!cal.hidden && !e.target.closest('.cp-month')) openCal(false); });
  cal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); openCal(false); mBtn.focus(); return; }
    var bs = [].slice.call(cal.querySelectorAll('.cp-cal-grid [data-m]')), i = bs.indexOf(document.activeElement); if (i < 0) return;
    var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key]; if (!step) return;
    e.preventDefault(); var n = bs[Math.max(0, Math.min(bs.length - 1, i + step))]; n.focus();
  });

  function bad(el, msg) {
    box.querySelectorAll('.cp-bad').forEach(function (n) { n.classList.remove('cp-bad'); });
    var err = document.getElementById('cpErr'); err.textContent = msg; err.hidden = false;
    var lab = el.closest('label'); lab.classList.add('cp-bad');
    lab.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { el.focus({ preventScroll: true }); }, 300);
  }
  document.getElementById('cpForm').addEventListener('input', function () { document.getElementById('cpErr').hidden = true; box.querySelectorAll('.cp-bad').forEach(function (n) { n.classList.remove('cp-bad'); }); });
  document.getElementById('cpForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = this;
    if (f.company.value.trim().length < 2) return bad(f.company, 'Please enter your company name.');
    if (f.name.value.trim().length < 2) return bad(f.name, 'Please enter your name.');
    if (!f.size.value) return bad(f.size, 'Please choose the team size.');
    var month = f.month.value && f.month.value !== 'flex' ? new Date(f.month.value + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Flexible';
    var msg = 'Hi Nandi Go, we would like a Corporate Getaway plan.\n\n' +
      '• Company: ' + f.company.value.trim() + '\n• Contact: ' + f.name.value.trim() + '\n• Team size: ' + f.size.value +
      '\n• Month: ' + month + '\n• Place: ' + (f.place.value || 'Not sure yet') + (f.note.value.trim() ? '\n• Notes: ' + f.note.value.trim() : '');
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });
})();
