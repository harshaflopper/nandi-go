/* Nandi Go — landscape silhouettes behind the hero cards, one scene per destination.
 * Each scene is a few layered SVG silhouettes in the brand greens plus drifting fog.
 * NGScenes.build(el) once, then NGScenes.show('goa') to cross-fade. */
(function () {
  var W = 1600, H = 300, NS = 'http://www.w3.org/2000/svg';
  var C = { far: '#2F5F46', mid: '#1F4433', near: '#14302A', front: '#0F1C18', snow: '#E4E9E4', water: '#1A3D2E', gold: '#E6C766' };

  // small seeded random so the shapes are the same on every visit
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function hills(y, amp, n, seed) {          // smooth rolling ridge
    var r = rng(seed), pts = [];
    for (var i = 0; i <= n; i++) pts.push([i * W / n, y - amp * (0.35 + 0.65 * r())]);
    var d = 'M0,' + H + ' L0,' + pts[0][1];
    for (var j = 0; j < pts.length - 1; j++) {
      var a = pts[j], b = pts[j + 1], mx = (a[0] + b[0]) / 2;
      d += ' C' + mx + ',' + a[1] + ' ' + mx + ',' + b[1] + ' ' + b[0] + ',' + b[1];
    }
    return { d: d + ' L' + W + ',' + H + ' Z', pts: pts };
  }
  function peaks(y, hgt, n, seed, snowy) {   // jagged mountains, optional snow caps
    var r = rng(seed), d = 'M0,' + H + ' L0,' + y, caps = '', x = 0, step = W / n;
    for (var i = 0; i < n; i++) {
      var px = x + step * (0.35 + 0.3 * r()), py = y - hgt * (0.55 + 0.45 * r()), nx = x + step, ny = y - hgt * 0.15 * r();
      d += ' L' + px + ',' + py + ' L' + nx + ',' + ny;
      if (snowy) {
        var s = 0.22 + 0.1 * r(), lx = px - (px - x) * s, ly = py + (y - py) * s, rx = px + (nx - px) * s, ry = py + (ny - py) * s;
        caps += 'M' + px + ',' + py + ' L' + rx + ',' + ry + ' L' + (px + (rx - px) * .45) + ',' + (ry - (ry - py) * .2) + ' L' + px + ',' + (py + (ly - py) * .7) + ' L' + (lx + (px - lx) * .4) + ',' + (ly - (ly - py) * .15) + ' L' + lx + ',' + ly + ' Z';
      }
      x = nx;
    }
    return { d: d + ' L' + W + ',' + H + ' Z', caps: caps };
  }
  function ridge(y, amp, n, seed) {         // just the top line of a ridge (for tea terraces)
    var d = hills(y, amp, n, seed).d;
    return d.replace(/^M0,300 L0,/, 'M0,').replace(/ L1600,300 Z$/, '');
  }
  function waves(y, amp, n, phase) {
    var d = 'M0,' + H + ' L0,' + y, step = W / n;
    for (var i = 0; i < n; i++) {
      var x0 = i * step;
      d += ' Q' + (x0 + step / 4) + ',' + (y - amp * (i % 2 ? 1 : -1) * phase) + ' ' + (x0 + step / 2) + ',' + y +
           ' T' + (x0 + step) + ',' + y;
    }
    return d + ' L' + W + ',' + H + ' Z';
  }
  function palm(x, y, h, lean) {
    var tx = x + lean * h * .35, ty = y - h;
    var trunk = 'M' + (x - 4) + ',' + y + ' Q' + (x + lean * h * .1) + ',' + (y - h * .5) + ' ' + (tx - 2) + ',' + ty + ' L' + (tx + 2) + ',' + ty + ' Q' + (x + lean * h * .1 + 6) + ',' + (y - h * .5) + ' ' + (x + 4) + ',' + y + ' Z';
    var leaves = '';
    [[-1, .1], [-.7, -.35], [.7, -.35], [1, .1], [-.2, -.6], [.25, -.6]].forEach(function (a) {
      var ex = tx + a[0] * h * .42, ey = ty + a[1] * h * .3 + h * .12;
      leaves += 'M' + tx + ',' + ty + ' Q' + (tx + a[0] * h * .25) + ',' + (ty - h * .16) + ' ' + ex + ',' + ey + ' Q' + (tx + a[0] * h * .2) + ',' + (ty - h * .06) + ' ' + tx + ',' + ty + ' Z';
    });
    return trunk + leaves;
  }
  function pine(x, y, h) {
    var w = h * .42;
    return 'M' + x + ',' + (y - h) + ' L' + (x + w * .55) + ',' + (y - h * .55) + ' L' + (x + w * .3) + ',' + (y - h * .55) + ' L' + (x + w) / 1 + ',' + (y - h * .12) + ' L' + (x + 3) + ',' + (y - h * .12) + ' L' + (x + 3) + ',' + y + ' L' + (x - 3) + ',' + y + ' L' + (x - 3) + ',' + (y - h * .12) + ' L' + (x - w) + ',' + (y - h * .12) + ' L' + (x - w * .3) + ',' + (y - h * .55) + ' L' + (x - w * .55) + ',' + (y - h * .55) + ' Z';
  }
  function along(pts, x) {   // y on a hill ridge at x
    for (var i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) {
      var t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), e = t * t * (3 - 2 * t);
      return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * e;
    }
    return pts[pts.length - 1][1];
  }

  function layer(cls, d, fill, extra) { return '<path class="sl ' + cls + '" d="' + d + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function front(seed) { return layer('l4', hills(235, 30, 8, seed).d, C.front); }
  function sun(x, y, r) { return '<circle class="sl l0" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + C.gold + '" opacity=".22"/><circle class="sl l0" cx="' + x + '" cy="' + y + '" r="' + r * 2.2 + '" fill="' + C.gold + '" opacity=".07"/>'; }

  var SCENES = {
    nandi: function () {
      var a = hills(150, 70, 6, 11), b = hills(190, 60, 7, 23);
      return sun(1180, 120, 34) + layer('l1', a.d, C.far, ' opacity=".55"') + layer('l2', b.d, C.mid, ' opacity=".85"') + layer('l3', hills(220, 40, 9, 5).d, C.near) + front(7);
    },
    chikkamagaluru: function () {
      var a = hills(150, 60, 5, 31), b = hills(200, 55, 6, 41), bushes = '';
      for (var x = 20; x < W; x += 34) { var y = along(b.pts, x); bushes += 'M' + (x - 13) + ',' + (y + 4) + ' a13,11 0 1,1 26,0 Z'; }
      return layer('l1', a.d, C.far, ' opacity=".55"') + layer('l2', b.d, C.mid) + layer('l2', bushes, C.near, ' opacity=".9"') + front(17);
    },
    coorg: function () {
      var a = hills(140, 80, 5, 51), b = hills(190, 60, 6, 61), trees = '';
      for (var x = 15; x < W; x += 26 + (x % 3) * 9) { var y = along(b.pts, x) + 6; trees += pine(x, y, 40 + (x % 5) * 6); }
      return layer('l1', a.d, C.far, ' opacity=".5"') + layer('l2', b.d, C.mid) + layer('l3', trees, C.near) + front(27);
    },
    ooty: function () {
      var a = hills(130, 70, 5, 71), b = hills(185, 70, 5, 81), lines = '';
      for (var k = 0; k < 7; k++) lines += ridge(195 + k * 12, 70, 5, 81);
      return layer('l1', a.d, C.far, ' opacity=".5"') + layer('l2', b.d, C.mid) +
        '<path class="sl l2" d="' + lines + '" fill="none" stroke="#2F5F46" stroke-width="2" opacity=".55"/>' +
        '<rect class="sl l3" x="0" y="232" width="1600" height="14" fill="#1A3D2E" opacity=".9"/>' + front(37);
    },
    goa: function () {
      var p = '';
      [[90, 240, 150, .5], [190, 245, 115, -.35], [1380, 240, 160, -.5], [1500, 246, 120, .4]].forEach(function (q) { p += palm(q[0], q[1], q[2], q[3]); });
      return sun(800, 150, 46) + layer('l1', waves(175, 6, 16, 1), C.far, ' opacity=".5"') + layer('l2', waves(200, 8, 12, 1), C.mid, ' opacity=".85"') + layer('l3', waves(222, 9, 10, 1), C.near) + layer('l3', p, C.front) + front(47);
    },
    kerala: function () {
      var a = hills(165, 40, 6, 91), p = '';
      [[160, 222, 130, .45], [250, 224, 105, .25], [1300, 222, 140, -.4], [1420, 224, 110, -.2]].forEach(function (q) { p += palm(q[0], q[1], q[2], q[3]); });
      var boat = 'M640,214 L900,214 L880,232 L665,232 Z M680,214 Q700,186 760,186 L820,186 Q860,186 870,214 Z';
      return layer('l1', a.d, C.far, ' opacity=".55"') + '<rect class="sl l2" x="0" y="205" width="1600" height="95" fill="' + C.water + '"/>' +
        '<path class="sl l2" d="M120,240 H380 M500,252 H760 M980,244 H1240 M1320,258 H1560" stroke="#E4E9E4" stroke-opacity=".12" stroke-width="2"/>' +
        layer('l3', p + boat, C.front) + layer('l4', 'M0,262 L1600,262 L1600,300 L0,300 Z', C.front);
    },
    lakshadweep: function () {
      var isl = 'M250,206 Q330,184 420,206 Z M1120,200 Q1230,176 1330,200 Z', p = palm(300, 196, 70, .3) + palm(350, 198, 56, -.2) + palm(1200, 190, 76, -.3) + palm(1260, 192, 60, .25);
      return sun(820, 135, 40) + layer('l1', waves(190, 4, 18, 1), '#2F5F46', ' opacity=".45"') + layer('l2', isl + p, C.mid) +
        layer('l3', waves(214, 7, 14, 1), '#1F4433') + layer('l3', waves(236, 9, 10, 1), C.near) + front(57);
    },
    manali: function () {
      var a = peaks(170, 120, 7, 101, true), b = peaks(205, 80, 9, 111, false), trees = '';
      for (var x = 10; x < W; x += 22 + (x % 4) * 7) trees += pine(x, 238, 46 + (x % 6) * 7);
      return layer('l1', a.d, C.far, ' opacity=".7"') + layer('l1', a.caps, C.snow, ' opacity=".8"') + layer('l2', b.d, C.mid) + layer('l3', trees, C.near) + front(67);
    },
    nepal: function () {
      var a = peaks(185, 165, 5, 121, true), b = peaks(215, 70, 8, 131, false), flags = '', cols = ['#3F6B8A', '#F5F1E8', '#B84A4A', '#2D7F5F', '#D49A3D'];
      flags += '<path class="sl l3" d="M120,150 Q600,215 1100,160" fill="none" stroke="#F5F1E8" stroke-opacity=".5" stroke-width="1.5"/>';
      for (var i = 0; i < 18; i++) {
        var t = i / 17, fx = 120 + 980 * t, fy = 150 + (1 - (2 * t - 1) * (2 * t - 1)) * 32 - t * 4;
        flags += '<rect class="sl l3" x="' + (fx - 9) + '" y="' + fy + '" width="18" height="22" fill="' + cols[i % 5] + '" opacity=".75"/>';
      }
      return layer('l1', a.d, C.far, ' opacity=".7"') + layer('l1', a.caps, C.snow, ' opacity=".85"') + flags + layer('l2', b.d, C.mid) + layer('l3', hills(232, 26, 9, 141).d, C.near) + front(77);
    }
  };

  var box, current = null;
  window.NGScenes = {
    build: function (el) {
      box = el;
      box.innerHTML = Object.keys(SCENES).map(function (id) {
        return '<svg class="sc" data-scene="' + id + '" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' + SCENES[id]() + '</svg>';
      }).join('') + '<div class="fog f1"></div><div class="fog f2"></div>';
    },
    show: function (id) {
      if (!box || id === current) return;
      current = id;
      [].forEach.call(box.querySelectorAll('.sc'), function (s) { s.classList.toggle('on', s.dataset.scene === id); });
    }
  };
})();
