/* LaParusia — the eight-slice pizza builder.
 *
 * The client asked for a pizza "divided in 8 parts", sizes in inches, English
 * only, rose theme. The eight parts are not decoration: each slice carries its
 * own toppings, and a topping on one slice costs an eighth of what it costs on
 * the whole pizza. That arithmetic is the reason to cut it into eight at all —
 * without it, eight slices is just a drawing.
 *
 * NOTHING IS PRICED IN THIS FILE. Every figure comes from data/menu.json, and
 * every figure in that file is marked a placeholder. A price written into code
 * is a price nobody can correct without a developer.
 *
 * If this script fails to load, the page still reads: the markup carries the
 * headings, the bakery section fills from the same JSON, and no content is
 * hidden behind a class that only JavaScript removes.
 */
(function () {
  'use strict';

  var CX = 210, CY = 210, R_CHEESE = 172, R_CRUST = 196, N = 8;

  var menu = null;
  var etat = {
    taille: null,
    base: null,
    part: 0,                 /* la part choisie, 0..7 */
    parts: []                /* parts[i] = { cle_garniture: true } */
  };
  for (var i = 0; i < N; i++) etat.parts.push({});

  /* ---------------------------------------------------------------- */
  /* petits utilitaires                                                */
  /* ---------------------------------------------------------------- */

  function $(s) { return document.querySelector(s); }

  function argent(n) {
    /* Une seule façon d'écrire un montant sur toute la page. */
    return '$' + n.toFixed(2);
  }

  /* Un tirage DÉTERMINISTE, semé par la part et la garniture : la même part
     avec les mêmes garnitures donne toujours exactement le même dessin. Avec
     Math.random(), les rondelles sauteraient à chaque re-rendu — on ne
     verrait pas un choix, on verrait un scintillement. */
  function semer(a) {
    var x = a >>> 0;
    return function () {
      x ^= x << 13; x >>>= 0;
      x ^= x >> 17;
      x ^= x << 5;  x >>>= 0;
      return x / 4294967296;
    };
  }

  function hache(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function ang(i) { return (i * 360 / N - 90) * Math.PI / 180; }

  function pointSur(r, a) {
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }

  function cheminPart(i, r) {
    var a1 = ang(i), a2 = ang(i + 1);
    var p1 = pointSur(r, a1), p2 = pointSur(r, a2);
    return 'M' + CX + ' ' + CY + ' L' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
           ' A' + r + ' ' + r + ' 0 0 1 ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + ' Z';
  }

  function svgEl(nom, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', nom);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ---------------------------------------------------------------- */
  /* la pizza                                                          */
  /* ---------------------------------------------------------------- */

  function couleurBase() {
    var b = menu.bases.filter(function (x) { return x.key === etat.base; })[0];
    return b ? b.colour : '#C8402F';
  }

  /* Des points bien répartis À L'INTÉRIEUR d'une part.
     On tire en coordonnées polaires avec sqrt sur le rayon : sans le sqrt,
     tout s'entasse près de la pointe, parce qu'une part a beaucoup plus de
     surface près de la croûte qu'au centre. */
  function pointsDansPart(i, graine, combien) {
    var rnd = semer(graine);
    var a1 = ang(i), a2 = ang(i + 1);
    var out = [];
    var essais = 0;
    while (out.length < combien && essais < combien * 40) {
      essais++;
      var a = a1 + (a2 - a1) * (0.12 + rnd() * 0.76);
      var r = Math.sqrt(0.10 + rnd() * 0.80) * (R_CHEESE - 20);
      var p = pointSur(r, a);
      var trop = out.some(function (q) {
        var dx = q[0] - p[0], dy = q[1] - p[1];
        return dx * dx + dy * dy < 400;          /* 20 px entre deux morceaux */
      });
      if (!trop) out.push(p);
    }
    return out;
  }

  function dessinerGarniture(g, groupe, i) {
    var t = menu.toppings.filter(function (x) { return x.key === g; })[0];
    if (!t) return;
    var n = { disc: 5, ring: 6, cap: 4, blob: 6, arc: 5, leaf: 4 }[t.shape] || 5;
    var pts = pointsDansPart(i, hache(g + '#' + i), n);
    var rnd = semer(hache('rot' + g + i));

    pts.forEach(function (p) {
      var x = p[0], y = p[1], rot = Math.floor(rnd() * 360);
      if (t.shape === 'disc') {
        groupe.appendChild(svgEl('circle', { cx: x, cy: y, r: 9,
          fill: t.colour, stroke: 'rgba(0,0,0,.14)', 'stroke-width': 1 }));
      } else if (t.shape === 'ring') {
        groupe.appendChild(svgEl('circle', { cx: x, cy: y, r: 7.5,
          fill: 'none', stroke: t.colour, 'stroke-width': 3.4 }));
      } else if (t.shape === 'cap') {
        groupe.appendChild(svgEl('path', {
          d: 'M' + (x - 8) + ' ' + y + ' a8 7 0 0 1 16 0 z',
          fill: t.colour, transform: 'rotate(' + rot + ' ' + x + ' ' + y + ')' }));
      } else if (t.shape === 'blob') {
        groupe.appendChild(svgEl('ellipse', { cx: x, cy: y, rx: 9, ry: 7,
          fill: t.colour, opacity: .92,
          transform: 'rotate(' + rot + ' ' + x + ' ' + y + ')' }));
      } else if (t.shape === 'arc') {
        groupe.appendChild(svgEl('path', {
          d: 'M' + (x - 9) + ' ' + y + ' a9 9 0 0 1 18 0',
          fill: 'none', stroke: t.colour, 'stroke-width': 3,
          'stroke-linecap': 'round',
          transform: 'rotate(' + rot + ' ' + x + ' ' + y + ')' }));
      } else {
        groupe.appendChild(svgEl('path', {
          d: 'M' + x + ' ' + (y - 8) + ' q7 8 0 16 q-7 -8 0 -16 z',
          fill: t.colour,
          transform: 'rotate(' + rot + ' ' + x + ' ' + y + ')' }));
      }
    });
  }

  function dessinerPizza() {
    var g = $('#slices');
    g.textContent = '';

    for (var i = 0; i < N; i++) {
      var part = svgEl('g', {
        class: 'slice' + (i === etat.part ? ' on' : ''),
        tabindex: '0', role: 'button',
        'aria-pressed': i === etat.part ? 'true' : 'false',
        'aria-label': etiquettePart(i)
      });

      part.appendChild(svgEl('path', {
        class: 'slice-hit', d: cheminPart(i, R_CHEESE), fill: couleurBase()
      }));

      var gg = svgEl('g', {});
      var liste = Object.keys(etat.parts[i]);
      liste.forEach(function (cle) { dessinerGarniture(cle, gg, i); });
      part.appendChild(gg);

      part.appendChild(svgEl('path', {
        class: 'slice-ring', d: cheminPart(i, R_CHEESE - 3)
      }));

      (function (idx) {
        part.addEventListener('click', function () { choisirPart(idx); });
        part.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisirPart(idx); }
        });
      })(i);

      g.appendChild(part);
    }

    /* Les traits de découpe, par-dessus tout le reste. */
    var c = $('#cuts');
    c.textContent = '';
    for (var k = 0; k < N; k++) {
      var p = pointSur(R_CRUST, ang(k));
      c.appendChild(svgEl('line', {
        x1: CX, y1: CY, x2: p[0].toFixed(1), y2: p[1].toFixed(1),
        stroke: 'rgba(255,255,255,.55)', 'stroke-width': 2
      }));
    }
    c.appendChild(svgEl('circle', {
      cx: CX, cy: CY, r: R_CHEESE, fill: 'none',
      stroke: 'rgba(0,0,0,.10)', 'stroke-width': 2
    }));
  }

  function etiquettePart(i) {
    var liste = Object.keys(etat.parts[i]).map(nomGarniture);
    return 'Slice ' + (i + 1) + (liste.length ? ', with ' + liste.join(', ') : ', plain');
  }

  function nomGarniture(cle) {
    var t = menu.toppings.filter(function (x) { return x.key === cle; })[0];
    return t ? t.label.toLowerCase() : cle;
  }

  /* ---------------------------------------------------------------- */
  /* les commandes                                                     */
  /* ---------------------------------------------------------------- */

  function construireTailles() {
    var z = $('#sizes');
    z.textContent = '';
    menu.sizes.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', s.key === etat.taille ? 'true' : 'false');
      b.innerHTML = '<span>' + s.label + '</span><small>' + s.serves + '</small>';
      b.addEventListener('click', function () { etat.taille = s.key; tout(); });
      z.appendChild(b);
    });
  }

  function construireBases() {
    var z = $('#bases');
    z.textContent = '';
    menu.bases.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', s.key === etat.base ? 'true' : 'false');
      b.textContent = s.label;
      b.addEventListener('click', function () { etat.base = s.key; tout(); });
      z.appendChild(b);
    });
  }

  function construireOnglets() {
    var z = $('#sliceTabs');
    z.textContent = '';
    for (var i = 0; i < N; i++) {
      (function (idx) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'stab' + (Object.keys(etat.parts[idx]).length ? ' filled' : '');
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', idx === etat.part ? 'true' : 'false');
        b.setAttribute('aria-label', etiquettePart(idx));
        b.innerHTML = (idx + 1) + '<span class="dot"></span>';
        b.addEventListener('click', function () { choisirPart(idx); });
        z.appendChild(b);
      })(i);
    }
  }

  function construireGarnitures() {
    var z = $('#tops');
    z.textContent = '';
    menu.toppings.forEach(function (t) {
      var pose = !!etat.parts[etat.part][t.key];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'top-btn';
      b.setAttribute('aria-pressed', pose ? 'true' : 'false');
      b.innerHTML =
        '<span class="top-swatch" style="background:' + t.colour + '"></span>' +
        '<span class="top-name">' + t.label + '</span>' +
        '<span class="top-price">' + argent(t.whole / N) + '</span>';
      b.addEventListener('click', function () {
        if (etat.parts[etat.part][t.key]) delete etat.parts[etat.part][t.key];
        else etat.parts[etat.part][t.key] = true;
        tout();
      });
      z.appendChild(b);
    });
  }

  function choisirPart(i) {
    etat.part = i;
    tout();
  }

  /* ---------------------------------------------------------------- */
  /* l'addition                                                        */
  /* ---------------------------------------------------------------- */

  function calculer() {
    var s = menu.sizes.filter(function (x) { return x.key === etat.taille; })[0];
    var base = s ? s.base : 0;
    var garnitures = 0, partsGarnies = 0;

    etat.parts.forEach(function (p) {
      var cles = Object.keys(p);
      if (cles.length) partsGarnies++;
      cles.forEach(function (cle) {
        var t = menu.toppings.filter(function (x) { return x.key === cle; })[0];
        if (t) garnitures += t.whole / N;      /* un huitième, par part */
      });
    });

    return { base: base, garnitures: garnitures, parts: partsGarnies,
             total: base + garnitures, taille: s };
  }

  function peindreAddition() {
    var c = calculer();
    $('#tSize').textContent = c.taille ? c.taille.label : '—';
    $('#tBase').textContent = argent(c.base);
    $('#tCount').textContent = c.parts === 0 ? 'none yet'
      : (c.parts === 1 ? '1 slice topped' : c.parts + ' slices topped');
    $('#tTops').textContent = argent(c.garnitures);
    $('#tTotal').textContent = argent(c.total);
    $('#sizeNote').textContent = c.taille
      ? c.taille.inches + ' inches across, cut into eight. Serves ' + c.taille.serves + '.'
      : '';
  }

  function peindreIndices() {
    var liste = Object.keys(etat.parts[etat.part]).map(nomGarniture);
    $('#pieHint').textContent = liste.length
      ? 'Slice ' + (etat.part + 1) + ' — ' + liste.join(', ')
      /* Pas « a droite » : sur un telephone les garnitures passent DESSOUS.
         Une phrase qui decrit une disposition qui n'existe pas a cette largeur
         envoie le client chercher au mauvais endroit. */
      : 'Slice ' + (etat.part + 1) + ' selected — choose its toppings.';
    $('#toppingFor').textContent = '— slice ' + (etat.part + 1);
  }

  function tout() {
    construireTailles();
    construireBases();
    construireOnglets();
    construireGarnitures();
    dessinerPizza();
    peindreAddition();
    peindreIndices();
  }

  /* ---------------------------------------------------------------- */
  /* la boulangerie                                                    */
  /* ---------------------------------------------------------------- */

  function boulangerie() {
    var z = $('#bakeryList');
    if (!z) return;
    z.textContent = '';
    menu.bakery.forEach(function (x) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + x.label + '</span><b>' + argent(x.price) + '</b>';
      z.appendChild(li);
    });
  }

  /* ---------------------------------------------------------------- */
  /* mise en route                                                     */
  /* ---------------------------------------------------------------- */

  function outils() {
    $('#allSame').addEventListener('click', function () {
      var modele = etat.parts[etat.part];
      for (var i = 0; i < N; i++) {
        if (i === etat.part) continue;
        etat.parts[i] = {};
        Object.keys(modele).forEach(function (k) { etat.parts[i][k] = true; });
      }
      tout();
    });
    $('#clearSlice').addEventListener('click', function () {
      etat.parts[etat.part] = {};
      tout();
    });
  }

  fetch('data/menu.json')
    .then(function (r) {
      if (!r.ok) throw new Error('menu.json — HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      menu = d;
      /* La deuxième taille par défaut : la plus petite fait passer le reste
         de la carte pour cher, la plus grande gonfle le total d'entrée. */
      etat.taille = (menu.sizes[1] || menu.sizes[0]).key;
      etat.base = menu.bases[0].key;
      tout();
      boulangerie();
      outils();
    })
    .catch(function (e) {
      /* On le DIT. Un constructeur muet ressemble à une page cassée, et
         personne ne pense à ouvrir la console. */
      var z = $('#pieHint');
      if (z) z.textContent = 'The menu could not be loaded (' + e.message +
        '). The page is fine — the prices live in data/menu.json.';
      if (window.console) console.error('LaParusia :', e);
    });
})();
