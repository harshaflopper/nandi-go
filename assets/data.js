/* Nandi Go — trips and map destinations.
 * Trips and batches are managed in the admin page (Supabase); this file is the offline fallback plus map data. */
(function () {
  var U = function (id) { return 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=1000&q=80'; };

  /* Travel styles. Every trip can run batches in any style; the admin page can only hide a style.
   * Couple Escape is priced per couple (twice the per-person price unless the trip sets its own). */
  var STYLES = [
    { id: 'girls', name: 'Girls Only Getaway', line: 'No boys, no worries, just us.', unit: 'person',
      blurb: 'Women-only batches with verified stays and a woman coordinator on every trip.', photo: 'assets/styles/style-girls.webp?v=2' },
    { id: 'friends', name: 'Strangers to Friends', line: 'Meet strangers, leave as friends.', unit: 'person',
      blurb: 'Open group batches for solo travellers and friends. Come alone, leave with a gang.', photo: 'assets/styles/style-friends.webp?v=2' },
    { id: 'couples', name: 'Couple Escape', line: 'Just you two.', unit: 'couple',
      blurb: 'Couples-only batches with private rooms and an easy, slow pace.', photo: 'assets/styles/style-couples.webp?v=2' },
    { id: 'family', name: 'One Tribe, All Ages', line: 'Travel together, grow together.', unit: 'person',
      blurb: 'Family batches for grandparents to kids, with comfortable travel and easy days.', photo: 'assets/styles/style-family.webp?v=2' }
  ];

  var TRIPS = [
    /* ---- Chikkamagalur Coffee Estate Retreat (one trip, batches per style) ---- */
    { id: 'chikka-retreat', group: 'retreat', title: 'Coffee Estate Retreat, Chikkamagaluru', short: 'Coffee Estate Retreat',
      region: 'karnataka', dest: 'chikkamagaluru', price: 5999, was: 6499, unit: 'person', style_prices: { girls: 6499, couples: 7499 },
      duration: '1 Night · 2 Days', image: U('photo-1695448124696-3f73e3b779c2'), note: 'Save Rs 500 with early bird',
      description: 'One night and two days inside a Chikkamagalur coffee estate: 4x4 jeep safari to Jhari Falls, bonfire music night, sunrise yoga and authentic Malnad meals.',
      perks: ['Homestay inside the coffee estate', 'All meals — fresh Malnad cuisine', '4x4 jeep safari to Jhari Falls', 'Starlit bonfire and music night', 'Sunrise yoga and plantation trail', 'Wellness massage and local guide', 'Bus transport from Chikkamagalur'] },

    /* ---- Tour packages ---- */
    { id: 'nandi-daytrip', group: 'tour', title: 'Nandi Hills Day Trip', region: 'karnataka', type: 'Adventure', dest: 'nandi',
      price: 999, unit: 'person', duration: 'Day trip', image: 'assets/skandagiri-trek.jpg',
      description: 'A scenic hill getaway with trekking and sunrise, 60 km from Bengaluru. Meals and transport included, with guided tours.',
      perks: ['Meals and transport included', 'Guided tours', 'Safe, comfortable travel'],
      stops: ['Nandi Hills Sunrise Point', 'Tipu Drop', 'Bhoga Nandeeshwara Temple', 'Yoga Nandeeshwara Temple'] },
    { id: 'coorg-ooty', group: 'tour', title: 'Coorg + Ooty Hill Stations', region: 'south', type: 'Family', dest: 'coorg',
      price: 5499, unit: 'person', duration: 'Hill stations combo', image: U('photo-1560357647-62a43d9897bb'),
      description: 'Hill stations and tea estates combo — 270 km + 280 km from Bengaluru — with resort stay and meals, guided sightseeing and photography stops.',
      perks: ['Comfortable travel', 'Resort stay and meals', 'Guided sightseeing', 'Photography stops'],
      stops: ['Raja Seat, Coorg — scenic viewpoint', 'Abbey Falls', 'Doddabetta Peak — 2,636 m', 'Ooty tea estates', 'Botanical Garden and Rose Garden'] },
    { id: 'goa', group: 'tour', title: 'Goa Beaches & Coastal Vibes', region: 'south', type: 'Adventure', dest: 'goa',
      price: 6499, unit: 'person', duration: '2 nights · by bus', image: U('photo-1512343879784-a960bf40e7f2'),
      description: 'Return bus Bangalore–Goa–Bangalore, hotel for 2 nights (quad sharing), daily breakfast, and North + South Goa sightseeing.',
      perks: ['Return bus from Bangalore', '2 nights hotel, quad sharing', 'Daily breakfast', 'North + South Goa sightseeing'],
      stops: ['Baga Beach', 'Calangute Beach', 'Fort Aguada', 'Basilica of Bom Jesus', 'Anjuna Beach'] },
    { id: 'kerala', group: 'tour', title: 'Kerala Backwaters', region: 'south', type: 'Family', dest: 'kerala',
      price: 5499, unit: 'person', duration: '3 Nights · 4 Days', image: U('photo-1593693411515-c20261bcad6e'),
      description: '3 nights / 4 days with houseboat, stay, meals and travel included.',
      perks: ['Houseboat included', 'Stay and meals', 'Travel included'],
      stops: ['Alleppey backwaters', 'Munnar', 'Kovalam Beach', 'Kochi Fort'] },
    { id: 'manali-shimla', group: 'tour', title: 'Manali + Shimla', region: 'north', type: 'Adventure', dest: 'manali',
      price: 12999, unit: 'person', duration: '5 Nights · 6 Days', image: U('photo-1712388430474-ace0c16051e2'),
      description: 'All-inclusive snow peaks, valleys and adventure: comfortable transport, stays and meals, guided tours and 24/7 support.',
      perks: ['Comfortable transport', 'Stays and meals', 'Guided tours', '24/7 support'],
      stops: ['Solang Valley', 'Rohtang Pass', 'Hadimba Temple', 'Mall Road, Shimla', 'Kufri'] },
    { id: 'lakshadweep', group: 'tour', title: 'Lakshadweep via Kochi', region: 'south', type: 'Romantic', dest: 'lakshadweep',
      price: 18999, unit: 'person', duration: '3 Nights · 4 Days', image: U('photo-1572431447238-425af66a273b'),
      description: 'Island paradise with flight via Kochi, island stay and snorkelling included — crystal-clear lagoons and guided snorkelling tours.',
      perks: ['Flight via Kochi', 'Island stay', 'Guided snorkelling'],
      stops: ['Agatti Island', 'Bangaram Island', 'Kavaratti', 'Minicoy Island'] },
    { id: 'nepal', group: 'tour', title: 'Nepal: Kathmandu, Pokhara & Nagarkot', region: 'international', type: 'Adventure', dest: 'nepal',
      price: 9999, unit: 'person', duration: '3 Nights · 4 Days', image: U('photo-1562462181-b228e3cff9ad'),
      description: 'Return flight Bangalore – Kathmandu, 3 nights hotel, daily breakfast, all tours and transfers, and a local English-speaking guide. Customisable, GST included.',
      perks: ['Flights from Bangalore', '3 nights hotel', 'Daily breakfast', 'English-speaking guide', 'GST included'],
      variants: [{ id: 'budget', label: 'Budget', price: 9999, note: 'Basic package' },
                 { id: 'standard', label: 'Standard', price: 13999, note: 'Most popular' },
                 { id: 'premium', label: 'Premium', price: 18999, note: 'Luxury experience' }],
      stops: ['Pashupatinath Temple, Kathmandu', 'Phewa Lake, Pokhara', 'Sarangkot sunrise', 'Nagarkot Himalaya view'] },

    /* ---- Nandi Hills experiences ---- */
    { id: 'sunrise', group: 'experience', title: 'Sunrise Trail Experience', region: 'karnataka', type: 'Adventure', dest: 'nandi',
      price: 1499, unit: 'person', duration: 'Half day', image: U('photo-1500534314209-a25ddb2bd429'),
      description: 'Chase the first light and savour sweeping views over the waking hills.', perks: ['Half day', 'Scenic viewpoints', 'Guided experience'] },
    { id: 'wellness', group: 'experience', title: 'Hilltop Wellness Retreat', region: 'karnataka', type: 'Wellness', dest: 'nandi',
      price: 2999, unit: 'person', duration: 'Full day', image: U('photo-1470252649378-9c29740c9fa8'),
      description: 'Unplug from the everyday with nature, stillness and restorative moments.', perks: ['Full day', 'Wellness activities', 'Nature immersion'] },
    { id: 'couple', group: 'experience', title: 'Romantic Hillside Escape', region: 'karnataka', type: 'Romantic', dest: 'nandi',
      price: 3999, unit: 'person', duration: 'Day experience', image: U('photo-1464822759023-fed622ff2c3b'),
      description: 'A picturesque getaway created for meaningful time together.', perks: ['Couple experience', 'Scenic setting', 'Relaxed pace'] },
    { id: 'adventure', group: 'experience', title: 'Explorer’s Day Out', region: 'karnataka', type: 'Adventure', dest: 'nandi',
      price: 1999, unit: 'person', duration: 'Full day', image: U('photo-1472396961693-142e6e269027'),
      description: 'Discover open trails, fresh air and unforgettable countryside views.', perks: ['Full day', 'Outdoor trails', 'Photo stops'] },
    { id: 'family', group: 'experience', title: 'Family Nature Getaway', region: 'karnataka', type: 'Family', dest: 'nandi',
      price: 2499, unit: 'person', duration: 'Day experience', image: U('photo-1447752875215-b2761acb3c5d'),
      description: 'Create carefree memories in a beautiful outdoor setting.', perks: ['Flexible group size', 'Leisure time', 'Nature walks'] },
    { id: 'forest', group: 'experience', title: 'Forest Calm Experience', region: 'karnataka', type: 'Wellness', dest: 'nandi',
      price: 2799, unit: 'person', duration: 'Half day', image: U('photo-1448375240586-882707db888b'),
      description: 'A gentle reset surrounded by greenery and the sounds of nature.', perks: ['Half day', 'Quiet surroundings', 'Unwind and explore'] }
  ];

  /* Map pins. km = road distance from Bengaluru as quoted by Nandi Go (or air for far trips). */
  var DESTINATIONS = [
    { id: 'nandi', name: 'Nandi Hills', lon: 77.683, lat: 13.370, km: '60 km', mode: 'road', ka: true },
    { id: 'chikkamagaluru', name: 'Chikkamagaluru', lon: 75.775, lat: 13.318, km: '245 km', mode: 'road', ka: true },
    { id: 'coorg', name: 'Coorg', lon: 75.738, lat: 12.424, km: '270 km', mode: 'road', ka: true, alsoTrips: [] },
    { id: 'ooty', name: 'Ooty', lon: 76.695, lat: 11.410, km: '280 km', mode: 'road', ka: true, trips: ['coorg-ooty'] },
    { id: 'goa', name: 'Goa', lon: 73.95, lat: 15.40, km: '590 km', mode: 'road' },
    { id: 'kerala', name: 'Kerala', lon: 76.34, lat: 9.50, km: 'Backwaters', mode: 'road' },
    { id: 'lakshadweep', name: 'Lakshadweep', lon: 72.18, lat: 10.86, km: 'via Kochi', mode: 'air' },
    { id: 'manali', name: 'Manali + Shimla', lon: 77.19, lat: 32.24, km: 'Himachal', mode: 'air' },
    { id: 'nepal', name: 'Nepal', lon: 85.32, lat: 27.70, km: 'International', mode: 'air' }
  ];
  var ORIGIN = { name: 'Bengaluru', lon: 77.594, lat: 12.972 };

  /* Hero postcards — one per destination: headline, photo and hotspot labels (x%, y%) for "Step inside". */
  var POSTCARDS = {
    nandi: { line: 'Above the clouds, before the city wakes.', text: 'Sunrise viewpoints, cool forest trails and hilltop temples — 60 km from Bengaluru.', photo: U('photo-1500534314209-a25ddb2bd429'),
      hot: [['Sunrise Point', 60, 28], ['Tipu Drop', 72, 58], ['Bhoga Nandeeshwara', 58, 72]] },
    chikkamagaluru: { line: 'Wake up inside a coffee estate.', text: 'One night in the Malnad hills: waterfalls, bonfire, sunrise yoga and fresh estate meals.', photo: U('photo-1695448124696-3f73e3b779c2'),
      hot: [['Estate homestay', 62, 30], ['Jhari Falls', 72, 56], ['Plantation trail', 58, 72]] },
    coorg: { line: 'Mist, waterfalls and tea-green hills.', text: 'Raja Seat sunsets, Abbey Falls and the Nilgiri tea country on one easy combo.', photo: U('photo-1560357647-62a43d9897bb'),
      hot: [['Raja Seat', 60, 30], ['Abbey Falls', 72, 58], ['Doddabetta Peak', 58, 72]] },
    ooty: { line: 'Tea gardens up in the Nilgiris.', text: 'Rolling tea estates, a lake town and rose gardens — paired with Coorg.', photo: U('photo-1638886540342-240980f60d25'),
      hot: [['Tea estates', 62, 30], ['Botanical Garden', 72, 58], ['Rose Garden', 58, 72]] },
    goa: { line: 'Sun, sand and a coast that never sleeps.', text: 'Beaches, forts and old churches — by bus from Bangalore, with hotel and breakfast.', photo: U('photo-1512343879784-a960bf40e7f2'),
      hot: [['Baga Beach', 62, 30], ['Fort Aguada', 72, 56], ['Bom Jesus', 58, 72]] },
    kerala: { line: 'Drift through the backwaters.', text: 'A houseboat on Alleppey, tea hills in Munnar and the old streets of Kochi.', photo: U('photo-1593693411515-c20261bcad6e'),
      hot: [['Alleppey houseboat', 60, 30], ['Munnar', 72, 56], ['Kochi Fort', 58, 72]] },
    lakshadweep: { line: 'Lagoons so clear you can see the reef.', text: 'Fly via Kochi to coral islands, white sand and guided snorkelling.', photo: U('photo-1572431447238-425af66a273b'),
      hot: [['Agatti', 62, 30], ['Bangaram', 72, 56], ['Snorkelling point', 58, 72]] },
    manali: { line: 'Snow peaks and pine valleys.', text: 'Solang, Rohtang, Hadimba Temple and Shimla’s Mall Road in one 6-day loop.', photo: U('photo-1712388430474-ace0c16051e2'),
      hot: [['Solang Valley', 62, 30], ['Rohtang Pass', 72, 56], ['Mall Road', 58, 72]] },
    nepal: { line: 'Sunrise over the Himalaya.', text: 'Kathmandu, Pokhara and Nagarkot — flights from Bangalore, three ways to travel.', photo: U('photo-1562462181-b228e3cff9ad'),
      hot: [['Pashupatinath', 62, 30], ['Phewa Lake', 72, 56], ['Sarangkot sunrise', 58, 72]] }
  };

  TRIPS.forEach(function (t) { t.from = t.variants ? Math.min.apply(null, t.variants.map(function (v) { return v.price; })) : t.price; });
  DESTINATIONS.forEach(function (d) {
    var own = TRIPS.filter(function (t) { return t.dest === d.id; }).map(function (t) { return t.id; });
    d.trips = (d.trips || []).concat(own.filter(function (id) { return (d.trips || []).indexOf(id) < 0; }));
  });

  var fmt = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };
  var todayISO = function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  var style = function (id) { return STYLES.filter(function (x) { return x.id === id; })[0]; };
  /* Price for a trip in a style: batch price > trip's own style price > (couples: 2 x per-person) > trip price */
  var priceFor = function (t, styleId, batch, variantId) {
    var v = t.variants ? (t.variants.filter(function (x) { return x.id === variantId; })[0] || t.variants[0]) : null;
    var base = v ? v.price : t.price, sp = (t.style_prices || {})[styleId];
    var st = style(styleId), unit = st && st.unit === 'couple' ? 'couple' : (t.unit || 'person');
    var price = batch && batch.price ? batch.price : (!v && sp ? sp : (unit === 'couple' && t.unit !== 'couple' ? base * 2 : base));
    return { price: price, unit: unit };
  };
  var BATCHES = []; /* filled from the database by db.js */
  var batchesFor = function (tripId, styleId) {
    var t = todayISO();
    return BATCHES.filter(function (b) { return b.trip_id === tripId && (!styleId || b.style_id === styleId) && b.end >= t; })
      .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  };

  window.NG = { TRIPS: TRIPS, STYLES: STYLES, BATCHES: BATCHES, DESTINATIONS: DESTINATIONS, ORIGIN: ORIGIN, POSTCARDS: POSTCARDS,
    style: style, priceFor: priceFor, batchesFor: batchesFor,
    trip: function (id) { return TRIPS.filter(function (t) { return t.id === id; })[0]; },
    dest: function (id) { return DESTINATIONS.filter(function (d) { return d.id === id; })[0]; },
    fmt: fmt, todayISO: todayISO,
    WHATSAPP: '919513646646', PHONES: ['+91 95136 46646', '+91 90712 28822'], EMAIL: 'nandigo2026@gmail.com' };
})();
