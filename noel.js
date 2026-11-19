/* ==========================================================================
   La Casa Del Cookie — Thème Noël
   Actif jusqu'au 31 décembre inclus, puis disparaît tout seul.
   Aperçu forcé : ?noel=1 · désactivation : ?noel=0
   ========================================================================== */
(function(){
  var FIN = new Date(2027, 0, 1); // 1er janvier 2027, 00h00 (heure locale)
  var param = new URLSearchParams(location.search).get('noel');
  if (param === '0') return;
  if (param !== '1' && new Date() >= FIN) return;

  var root = document.documentElement;
  root.classList.add('noel');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  /* --- Bonnet de Père Noël posé sur le logo -------------------------------- */
  var HAT =
    '<svg viewBox="0 0 64 58" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="noelHatRed" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#d9463b"/><stop offset=".6" stop-color="#b2271f"/><stop offset="1" stop-color="#7d1914"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<path d="M9 41 C9 23 21 8 39 7 C51 6 60 14 58 27 L52 27 C52 20 47 16 43 18 C40 25 44 33 49 41 Z" fill="url(#noelHatRed)"/>' +
      '<path d="M18 30 C22 20 30 14 38 12" stroke="#fff" stroke-opacity=".18" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<rect x="4" y="38" width="50" height="14" rx="7" fill="#fbf7f1"/>' +
      '<path d="M8 45 h42" stroke="#e6ddd0" stroke-width="2" stroke-dasharray="1 4" stroke-linecap="round"/>' +
      '<circle cx="55" cy="30" r="6.5" fill="#fbf7f1"/>' +
      '<circle cx="53" cy="28" r="2" fill="#fff"/>' +
    '</svg>';

  /* --- Guirlande lumineuse sous l'en-tête ---------------------------------- */
  var BULBS = ['#c8352b', '#e9a83a', '#2f6b4f', '#e9772a', '#c8352b', '#f3e7cf'];
  function garlandSVG(w){
    var step = w < 600 ? 64 : 88, dip = 9, h = 26;
    var n = Math.ceil(w / step) + 1, d = 'M0 2', bulbs = '';
    for (var i = 0; i < n; i++){
      var x0 = i * step, x1 = x0 + step, mx = x0 + step / 2;
      d += ' Q' + mx + ' ' + (2 + dip * 2) + ' ' + x1 + ' 2';
      var by = 2 + dip; // point le plus bas de la boucle
      var c = BULBS[i % BULBS.length];
      var delay = ((i * 0.37) % 2.4).toFixed(2);
      bulbs +=
        '<g class="noel-bulb" style="animation-delay:' + delay + 's" transform="translate(' + mx + ' ' + by + ') rotate(' + ((i % 3) - 1) * 8 + ')">' +
          '<rect x="-2.2" y="-1" width="4.4" height="4" rx="1" fill="#5b4a3a"/>' +
          '<path d="M0 3 C4 3 5 9 4 12 C3 15 -3 15 -4 12 C-5 9 -4 3 0 3 Z" fill="' + c + '"/>' +
          '<ellipse cx="-1.4" cy="7" rx="1" ry="2" fill="#fff" opacity=".45"/>' +
        '</g>';
    }
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="#3d4a3a" stroke-width="1.4" stroke-linecap="round"/>' + bulbs + '</svg>';
  }

  /* --- Traîneau du Père Noël (pied de page) -------------------------------- */
  function reindeer(x, lead){
    return '<g transform="translate(' + x + ' 0)">' +
      '<path d="M134 42 C134 35 142 33 152 34 C158 34 162 36 163 39 C163 44 156 46 146 46 C139 46 134 45 134 42 Z" fill="#6b4630"/>' +
      '<path d="M158 37 C161 33 163 29 165 25 L170 27 C168 31 166 36 163 40 Z" fill="#6b4630"/>' +
      '<ellipse cx="171" cy="24" rx="6" ry="3.6" fill="#6b4630"/>' +
      '<path d="M166 21 l-3 -8 M164 16 l-5 -2 M169 21 l1 -9 M169.6 15 l4 -3" stroke="#a9845f" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M139 45 l-7 8 M143 46 l-3 10 M155 45 l6 8 M159 44 l9 4" stroke="#6b4630" stroke-width="2.2" fill="none" stroke-linecap="round" class="noel-legs"/>' +
      '<path d="M134 39 l-4 -3" stroke="#f3e7cf" stroke-width="2" stroke-linecap="round"/>' +
      (lead ? '<circle cx="177" cy="24.5" r="2.4" fill="#e0342a"/>' : '<circle cx="176.6" cy="24.5" r="1.4" fill="#3a2418"/>') +
      '<path d="M155 37 l6 0" stroke="#b2271f" stroke-width="2.2"/>' +
    '</g>';
  }
  var SLEIGH =
    '<svg viewBox="0 0 270 66" aria-hidden="true">' +
      '<path d="M60 30 C90 36 110 38 140 38 M60 30 C120 36 150 40 182 38" stroke="#9b7b5c" stroke-width="1" fill="none"/>' +
      reindeer(0, false) + reindeer(52, true) +
      '<circle cx="26" cy="21" r="10" fill="#8a5a3b"/><path d="M22 12 l4 -5 l4 5" fill="#8a5a3b"/>' +
      '<rect x="18" y="14" width="6" height="7" rx="1" fill="#2f6b4f" transform="rotate(-12 21 17)"/>' +
      '<circle cx="47" cy="25" r="9" fill="#b2271f"/>' +
      '<circle cx="50" cy="13" r="5" fill="#f1d2b6"/>' +
      '<path d="M45 14 C46 21 54 21 55 14 C54 18 46 18 45 14 Z" fill="#fbf7f1"/>' +
      '<path d="M45 11 C46 4 52 2 56 5 L60 9 L55 9 C53 7 50 8 45 11 Z" fill="#b2271f"/><circle cx="60" cy="9.5" r="2" fill="#fbf7f1"/>' +
      '<rect x="44.5" y="9.8" width="11" height="2.8" rx="1.4" fill="#fbf7f1"/>' +
      '<path d="M12 28 C10 46 24 49 34 49 L70 49 C78 49 80 44 81 38 L84 30 C76 33 70 33 66 32 L14 28 Z" fill="#a8322d"/>' +
      '<path d="M16 34 C30 37 54 38 78 36" stroke="#e9a83a" stroke-width="1.4" fill="none"/>' +
      '<path d="M28 49 v8 M68 49 v8" stroke="#3a2418" stroke-width="2"/>' +
      '<path d="M4 57 L80 57 C92 57 94 47 87 45" stroke="#3a2418" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  /* --- Neige : quelques vrais flocons dessinés, pas des points ------------- */
  function snow(){
    if (reduce) return;
    var c = el('canvas', 'noel-snow'), ctx = c.getContext('2d');
    if (!ctx) return;
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var W, H, dpr, flakes = [];
    function size(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      c.width = W * dpr; c.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.round(Math.min(26, Math.max(10, W / 55)));
      while (flakes.length < want) flakes.push(make(true));
      flakes.length = want;
    }
    function make(anywhere){
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : -20,
        r: 3 + Math.random() * 6, vy: 0.25 + Math.random() * 0.45,
        sway: Math.random() * Math.PI * 2, sw: 0.004 + Math.random() * 0.008,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.01,
        a: 0.35 + Math.random() * 0.4
      };
    }
    function drawFlake(f){
      ctx.save();
      ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.globalAlpha = f.a;
      ctx.strokeStyle = '#9fb6c6'; ctx.lineWidth = Math.max(0.8, f.r / 6); ctx.lineCap = 'round';
      for (var k = 0; k < 6; k++){
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, -f.r);
        ctx.moveTo(0, -f.r * 0.55); ctx.lineTo(-f.r * 0.28, -f.r * 0.8);
        ctx.moveTo(0, -f.r * 0.55); ctx.lineTo(f.r * 0.28, -f.r * 0.8);
        ctx.stroke();
      }
      ctx.restore();
    }
    var running = true;
    document.addEventListener('visibilitychange', function(){ running = !document.hidden; if (running) requestAnimationFrame(tick); });
    function tick(){
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++){
        var f = flakes[i];
        f.sway += f.sw; f.y += f.vy; f.x += Math.sin(f.sway) * 0.35; f.rot += f.vr;
        if (f.y > H + 20) flakes[i] = make(false);
        drawFlake(f);
      }
      requestAnimationFrame(tick);
    }
    window.addEventListener('resize', size);
    size(); requestAnimationFrame(tick);
  }

  function init(){
    // Bonnet sur le premier logo de l'en-tête
    var logo = document.querySelector('header .logo-img');
    if (logo) logo.appendChild(el('span', 'noel-hat', HAT));

    // Guirlande
    var header = document.querySelector('body > header');
    if (header){
      var g = el('div', 'noel-garland');
      header.appendChild(g);
      var lastW = 0;
      var draw = function(){ var w = header.offsetWidth; if (w !== lastW){ lastW = w; g.innerHTML = garlandSVG(w); } };
      draw(); window.addEventListener('resize', draw);
    }

    // Petit clin d'œil dans le badge de l'accueil
    var badge = document.querySelector('.hero-badge');
    if (badge){
      var ico = badge.querySelector('span'), txt = badge.querySelector('p');
      if (ico) ico.textContent = '🎄';
      if (txt) txt.innerHTML = 'Collection Noël : <a href="#edition-speciale">L’Orangette est arrivée</a>';
    }

    // Traîneau qui traverse le pied de page
    var footer = document.querySelector('body > footer');
    if (footer && !reduce){
      var s = el('div', 'noel-sleigh', SLEIGH);
      footer.appendChild(s);
      if ('IntersectionObserver' in window){
        var io = new IntersectionObserver(function(es){
          es.forEach(function(e){ if (e.isIntersecting){ s.classList.add('is-flying'); io.disconnect(); } });
        }, { threshold: 0.2 });
        io.observe(footer);
      } else { s.classList.add('is-flying'); }
    }

    snow();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
