/* Nandi Go — Karnataka taluks by district, and a type-to-search taluk picker.
 * NGTalukPicker(input, districtSelect): typing filters the list (matches anywhere in the name);
 * with a district chosen it shows that district's taluks, otherwise it searches all districts and
 * picking one also sets the district. Any typed name is still accepted (for new or renamed taluks). */
(function () {
  var T = {
    'Bagalkote': ['Badami', 'Bagalkote', 'Bilagi', 'Guledgudda', 'Hungund', 'Ilkal', 'Jamkhandi', 'Mudhol', 'Rabkavi Banhatti', 'Teradal'],
    'Ballari': ['Ballari', 'Kampli', 'Kurugodu', 'Sandur', 'Siruguppa'],
    'Belagavi': ['Athani', 'Bailhongal', 'Belagavi', 'Chikkodi', 'Gokak', 'Hukkeri', 'Kagwad', 'Khanapur', 'Kittur', 'Mudalgi', 'Nippani', 'Raibag', 'Ramdurg', 'Savadatti', 'Yaragatti'],
    'Bengaluru Rural': ['Devanahalli', 'Doddaballapura', 'Hosakote', 'Nelamangala'],
    'Bengaluru Urban': ['Anekal', 'Bengaluru East', 'Bengaluru North', 'Bengaluru South', 'Yelahanka'],
    'Bidar': ['Aurad', 'Basavakalyan', 'Bhalki', 'Bidar', 'Chitgoppa', 'Hulsoor', 'Humnabad', 'Kamalnagar'],
    'Chamarajanagar': ['Chamarajanagar', 'Gundlupet', 'Hanur', 'Kollegal', 'Yelandur'],
    'Chikkaballapura': ['Bagepalli', 'Cheluru', 'Chikkaballapura', 'Chintamani', 'Gauribidanur', 'Gudibande', 'Manchenahalli', 'Sidlaghatta'],
    'Chikkamagaluru': ['Ajjampura', 'Chikkamagaluru', 'Kadur', 'Kalasa', 'Koppa', 'Mudigere', 'Narasimharajapura', 'Sringeri', 'Tarikere'],
    'Chitradurga': ['Challakere', 'Chitradurga', 'Hiriyur', 'Holalkere', 'Hosadurga', 'Molakalmuru'],
    'Dakshina Kannada': ['Bantwal', 'Belthangady', 'Kadaba', 'Mangaluru', 'Moodbidri', 'Mulki', 'Puttur', 'Sullia', 'Ullal'],
    'Davanagere': ['Channagiri', 'Davanagere', 'Harihar', 'Honnali', 'Jagalur', 'Nyamathi'],
    'Dharwad': ['Alnavar', 'Annigeri', 'Dharwad', 'Hubballi', 'Hubballi City', 'Kalghatgi', 'Kundgol', 'Navalgund'],
    'Gadag': ['Gadag', 'Gajendragad', 'Lakshmeshwar', 'Mundargi', 'Nargund', 'Ron', 'Shirahatti'],
    'Hassan': ['Alur', 'Arkalgud', 'Arsikere', 'Belur', 'Channarayapatna', 'Hassan', 'Holenarasipur', 'Sakleshpur'],
    'Haveri': ['Byadgi', 'Hanagal', 'Haveri', 'Hirekerur', 'Ranebennur', 'Rattihalli', 'Savanur', 'Shiggaon'],
    'Kalaburagi': ['Afzalpur', 'Aland', 'Chincholi', 'Chittapur', 'Jewargi', 'Kalaburagi', 'Kalagi', 'Kamalapur', 'Sedam', 'Shahabad', 'Yadrami'],
    'Kodagu': ['Kushalnagar', 'Madikeri', 'Ponnampet', 'Somwarpet', 'Virajpet'],
    'Kolar': ['Bangarapet', 'KGF (Robertsonpet)', 'Kolar', 'Malur', 'Mulbagal', 'Srinivaspur'],
    'Koppal': ['Gangavathi', 'Kanakagiri', 'Karatagi', 'Koppal', 'Kukanoor', 'Kushtagi', 'Yelburga'],
    'Mandya': ['Krishnarajpet', 'Maddur', 'Malavalli', 'Mandya', 'Nagamangala', 'Pandavapura', 'Srirangapatna'],
    'Mysuru': ['Heggadadevanakote (H.D. Kote)', 'Hunsur', 'Krishnarajanagara (K.R. Nagar)', 'Mysuru', 'Nanjangud', 'Periyapatna', 'Saligrama', 'Saragur', 'Tirumakudalu Narasipura (T. Narasipura)'],
    'Raichur': ['Devadurga', 'Lingasugur', 'Manvi', 'Maski', 'Raichur', 'Sindhanur', 'Sirwar'],
    'Ramanagara': ['Channapatna', 'Harohalli', 'Kanakapura', 'Magadi', 'Ramanagara'],
    'Shivamogga': ['Bhadravathi', 'Hosanagara', 'Sagara', 'Shikaripura', 'Shivamogga', 'Soraba', 'Thirthahalli'],
    'Tumakuru': ['Chiknayakanhalli', 'Gubbi', 'Koratagere', 'Kunigal', 'Madhugiri', 'Pavagada', 'Sira', 'Tiptur', 'Tumakuru', 'Turuvekere'],
    'Udupi': ['Brahmavar', 'Byndoor', 'Hebri', 'Kapu', 'Karkala', 'Kundapura', 'Udupi'],
    'Uttara Kannada': ['Ankola', 'Bhatkal', 'Dandeli', 'Haliyal', 'Honnavar', 'Joida', 'Karwar', 'Kumta', 'Mundgod', 'Siddapur', 'Sirsi', 'Yellapur'],
    'Vijayanagara': ['Hagaribommanahalli', 'Harapanahalli', 'Hosapete', 'Huvina Hadagali', 'Kotturu', 'Kudligi'],
    'Vijayapura': ['Almel', 'Babaleshwar', 'Basavana Bagewadi', 'Chadchan', 'Devara Hipparagi', 'Indi', 'Kolhar', 'Muddebihal', 'Nidagundi', 'Sindagi', 'Talikoti', 'Tikota', 'Vijayapura'],
    'Yadgir': ['Gurmitkal', 'Hunasagi', 'Shahapur', 'Shorapur', 'Vadagera', 'Yadgir']
  };
  window.NG_TALUKS = T;

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var uid = 0;

  window.NGTalukPicker = function (input, dSelect) {
    if (!input || input.dataset.picker) return;
    input.dataset.picker = '1';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    var wrap = document.createElement('div'); wrap.className = 'tk-combo';
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    var list = document.createElement('ul'); list.className = 'tk-list'; list.id = 'tkList' + (++uid); list.setAttribute('role', 'listbox'); list.hidden = true;
    wrap.appendChild(list); input.setAttribute('aria-controls', list.id);
    var items = [], active = -1;

    function placeholder() { input.placeholder = dSelect && dSelect.value ? 'Type or pick a taluk in ' + dSelect.value : 'Type your taluk (e.g. Gokak)'; }
    function options() {
      var d = dSelect && dSelect.value, out = [];
      Object.keys(T).forEach(function (k) { if (!d || k === d) T[k].forEach(function (t) { out.push({ t: t, d: k }); }); });
      return out;
    }
    function render() {
      var q = input.value.trim().toLowerCase(), d = dSelect && dSelect.value;
      var all = options();
      items = !q ? (d ? all : []) : all.filter(function (o) { return o.t.toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return (b.t.toLowerCase().indexOf(q) === 0) - (a.t.toLowerCase().indexOf(q) === 0) || a.t.localeCompare(b.t); });
      items = items.slice(0, 40); active = -1;
      if (!items.length) {
        list.innerHTML = q ? '<li class="tk-none">No match in the list. You can keep what you typed.</li>' : '';
        open(!!q); return;
      }
      list.innerHTML = items.map(function (o, i) {
        var t = esc(o.t), k = q ? o.t.toLowerCase().indexOf(q) : -1;
        if (k >= 0) t = esc(o.t.slice(0, k)) + '<b>' + esc(o.t.slice(k, k + q.length)) + '</b>' + esc(o.t.slice(k + q.length));
        return '<li role="option" id="' + list.id + '-' + i + '" data-i="' + i + '"><span>' + t + '</span>' + (d ? '' : '<small>' + esc(o.d) + '</small>') + '</li>';
      }).join('');
      open(true);
    }
    function open(on) { list.hidden = !on; input.setAttribute('aria-expanded', String(on)); }
    function pick(i) {
      var o = items[i]; if (!o) return;
      input.value = o.t;
      if (dSelect && dSelect.value !== o.d) { dSelect.value = o.d; dSelect.dispatchEvent(new Event('change', { bubbles: true })); }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      open(false);
    }
    function highlight(n) {
      var lis = list.querySelectorAll('[data-i]'); if (!lis.length) return;
      active = (n + lis.length) % lis.length;
      lis.forEach(function (li, i) { li.classList.toggle('on', i === active); });
      lis[active].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', lis[active].id);
    }
    input.addEventListener('input', function (e) { if (e.isTrusted !== false) render(); });
    input.addEventListener('focus', render);
    input.addEventListener('click', function () { if (list.hidden) render(); });
    input.addEventListener('keydown', function (e) {
      if (list.hidden && (e.key === 'ArrowDown')) { render(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
      else if (e.key === 'Enter' && !list.hidden && active >= 0) { e.preventDefault(); pick(active); }
      else if (e.key === 'Escape' || e.key === 'Tab') open(false);
    });
    list.addEventListener('mousedown', function (e) { var li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); pick(+li.dataset.i); } });
    input.addEventListener('blur', function () { setTimeout(function () { open(false); }, 120); });
    if (dSelect) dSelect.addEventListener('change', function () {
      var d = dSelect.value;
      if (d && input.value && (T[d] || []).indexOf(input.value) < 0) input.value = '';
      placeholder();
    });
    placeholder();
  };
})();
