/* Nandi Go: "Registered and verified" band, shown just above the footer as passport stamps. */
(function () {
  var foot = document.querySelector('footer:not(.lg-foot)'); if (!foot || document.querySelector('.tv')) return;
  var STAMPS = [
    { img: 'msme.png', w: 384, h: 180, ink: '#B3261E', top: 'Udyam registered', bot: 'MSME', tilt: -5 },
    { img: 'karnataka-tourism.png', w: 407, h: 180, ink: '#8E1F3F', top: 'Karnataka', bot: 'Department of Tourism', tilt: 4 },
    { img: 'gba.png', w: 240, h: 240, ink: '#1F3C88', top: 'Trade licence', bot: 'Greater Bengaluru Authority', tilt: -3, round: true },
    { img: 'karmika-ilakhe.png', w: 486, h: 180, ink: '#1F6B45', top: 'Labour Department', bot: 'Govt. of Karnataka', tilt: 6 }
  ];
  var s = document.createElement('section');
  s.className = 'tv'; s.setAttribute('aria-labelledby', 'tvTitle');
  s.innerHTML =
    '<div class="container tv-in">' +
      '<div class="tv-copy">' +
        '<span class="tv-k"><svg class="ic"><use href="#i-shield"/></svg>Registered and verified</span>' +
        '<h2 id="tvTitle">Travel with a <em>registered</em> Indian company</h2>' +
        '<p>Nandi Go is run by L N P Enterprises, a registered business licensed to operate tours from Bengaluru. Every booking is paid on this website and comes with an e-ticket.</p>' +
        '<ul class="tv-points"><li><svg class="ic"><use href="#i-check"/></svg>Registered business</li><li><svg class="ic"><use href="#i-check"/></svg>Licensed in Bengaluru</li><li><svg class="ic"><use href="#i-check"/></svg>Secure online payments</li></ul>' +
      '</div>' +
      '<div class="tv-page" role="list">' + STAMPS.map(function (x, i) {
        return '<figure class="tv-stamp' + (x.round ? ' is-round' : '') + '" role="listitem" style="--ink:' + x.ink + ';--tilt:' + x.tilt + 'deg;--d:' + (i * 0.18) + 's">' +
          '<span class="tv-ring"><span class="tv-top">' + x.top + '</span>' +
          '<img src="assets/trust/' + x.img + '?v=1" alt="' + x.top + ' · ' + x.bot + '" width="' + x.w + '" height="' + x.h + '" loading="lazy">' +
          '<span class="tv-bot">' + x.bot + '</span></span>' +
          '<span class="tv-ok"><svg class="ic"><use href="#i-check"/></svg>Verified</span>' +
        '</figure>';
      }).join('') + '</div>' +
      '<p class="tv-fine">Logos belong to their departments and show where Nandi Go is registered; they do not mean the departments endorse our trips.</p>' +
    '</div>';
  foot.parentNode.insertBefore(s, foot);
  // Stamps press onto the page one by one when the band scrolls into view
  if ('IntersectionObserver' in window && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    s.classList.add('tv-wait');
    new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { s.classList.remove('tv-wait'); s.classList.add('tv-go'); o.disconnect(); } }); }, { threshold: 0.3 }).observe(s);
  }
})();
