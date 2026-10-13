/* ==========================================================================
   La Casa Del Cookie — Thème Halloween
   S'active tout seul jusqu'au 1er novembre inclus, puis disparaît.
   Aperçu forcé : ?halloween=1 · désactivation : ?halloween=0
   ========================================================================== */
(function(){
  var FIN = new Date(2026, 10, 2); // 2 novembre 2026, 00h00 (heure locale)
  var param = new URLSearchParams(location.search).get('halloween');
  if (param === '0') return;
  if (param !== '1' && new Date() >= FIN) return;

  document.documentElement.classList.add('halloween');

  var uid = 0;
  function el(tag, cls, html){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  /* --- Dessins SVG ----------------------------------------------------------- */
  function spider(){
    var id = 'hwsp' + (uid++);
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="' + id + 'a" cx="40%" cy="30%" r="75%"><stop offset="0" stop-color="#4a372c"/><stop offset=".55" stop-color="#1d1410"/><stop offset="1" stop-color="#080504"/></radialGradient>' +
        '<radialGradient id="' + id + 'c" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#3a2a21"/><stop offset="1" stop-color="#0b0706"/></radialGradient>' +
      '</defs>' +
      '<g fill="none" stroke="#120c09" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
        '<g class="hw-legs-l">' +
          '<path d="M45 68 L31 79 L25 95"/><path d="M44 65 L26 71 L13 86"/><path d="M44 62 L25 56 L11 64"/><path d="M45 59 L31 45 L21 31"/>' +
        '</g>' +
        '<g class="hw-legs-r">' +
          '<path d="M55 68 L69 79 L75 95"/><path d="M56 65 L74 71 L87 86"/><path d="M56 62 L75 56 L89 64"/><path d="M55 59 L69 45 L79 31"/>' +
        '</g>' +
      '</g>' +
      '<ellipse cx="50" cy="40" rx="14" ry="17" fill="url(#' + id + 'a)"/>' +
      '<path d="M50 28 L46 36 L50 40 L54 36 Z M50 44 L47 49 L50 52 L53 49 Z" fill="#7a2a12" opacity=".55"/>' +
      '<ellipse cx="45" cy="33" rx="4" ry="6" fill="#fff" opacity=".10"/>' +
      '<ellipse cx="50" cy="63" rx="9" ry="8" fill="url(#' + id + 'c)"/>' +
      '<circle cx="47" cy="67" r="1.4" fill="#c62d1a"/><circle cx="53" cy="67" r="1.4" fill="#c62d1a"/>' +
      '<circle cx="44.5" cy="65" r=".9" fill="#c62d1a" opacity=".8"/><circle cx="55.5" cy="65" r=".9" fill="#c62d1a" opacity=".8"/>' +
      '<path d="M48 70 Q47 74 48.5 75 M52 70 Q53 74 51.5 75" stroke="#120c09" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '</svg>';
  }

  function pumpkin(){
    var id = 'hwpk' + (uid++);
    var face =
      '<polygon points="34,58 47,45 51,62"/>' +
      '<polygon points="86,58 73,45 69,62"/>' +
      '<polygon points="60,63 55,72 65,72"/>' +
      '<path d="M32 77 Q60 99 88 77 L82 80 L78 74 L71 83 L65 77 L60 86 L55 77 L49 83 L42 74 L38 80 Z"/>';
    return '<svg viewBox="0 0 120 112" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="' + id + 'b" cx="45%" cy="35%" r="75%"><stop offset="0" stop-color="#ffb055"/><stop offset=".5" stop-color="#ec7417"/><stop offset="1" stop-color="#9c3d08"/></radialGradient>' +
        '<radialGradient id="' + id + 'g" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".45" stop-color="#ffc93a"/><stop offset="1" stop-color="#ff8a00"/></radialGradient>' +
        '<linearGradient id="' + id + 's" x1="0" x2="1"><stop offset="0" stop-color="#3f4a1f"/><stop offset="1" stop-color="#6d6a2c"/></linearGradient>' +
        '<filter id="' + id + 'f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>' +
      '</defs>' +
      '<ellipse cx="60" cy="108" rx="44" ry="4" fill="#000" opacity=".18"/>' +
      '<g fill="url(#' + id + 'b)" stroke="#7a2e05" stroke-opacity=".35" stroke-width="1">' +
        '<ellipse cx="30" cy="68" rx="25" ry="37"/><ellipse cx="90" cy="68" rx="25" ry="37"/>' +
        '<ellipse cx="45" cy="67" rx="24" ry="41"/><ellipse cx="75" cy="67" rx="24" ry="41"/>' +
        '<ellipse cx="60" cy="67" rx="21" ry="43"/>' +
      '</g>' +
      '<path d="M44 34 Q60 28 76 34" fill="none" stroke="#7a2e05" stroke-opacity=".35" stroke-width="2"/>' +
      '<path d="M56 28 C55 18 58 10 67 5 L71 9 C65 14 63 20 64 29 Z" fill="url(#' + id + 's)"/>' +
      '<path d="M66 12 C74 10 80 14 82 20" fill="none" stroke="#4d5a22" stroke-width="2" stroke-linecap="round"/>' +
      '<g class="hw-pk-face">' +
        '<g fill="#ffb12e" filter="url(#' + id + 'f)" opacity=".9">' + face + '</g>' +
        '<g fill="url(#' + id + 'g)" stroke="#6a2604" stroke-width="1.2" stroke-linejoin="round">' + face + '</g>' +
      '</g>' +
    '</svg>';
  }

  function web(){
    var s = '<svg class="hw-web-svg" viewBox="0 0 150 150" aria-hidden="true" fill="none" stroke="#5a4a40" stroke-width="0.9" stroke-linecap="round">';
    var angles = [0, 15, 30, 45, 60, 75, 90];
    angles.forEach(function(a){
      var r = a * Math.PI / 180;
      s += '<line x1="0" y1="0" x2="' + (150 * Math.cos(r)).toFixed(1) + '" y2="' + (150 * Math.sin(r)).toFixed(1) + '"/>';
    });
    [26, 50, 76, 104, 134].forEach(function(rad){
      var d = '';
      for (var i = 0; i < angles.length; i++){
        var a = angles[i] * Math.PI / 180;
        var x = rad * Math.cos(a), y = rad * Math.sin(a);
        if (i === 0){ d += 'M' + x.toFixed(1) + ' ' + y.toFixed(1); continue; }
        var m = (angles[i] - 7.5) * Math.PI / 180, sag = rad * 0.86;
        d += ' Q' + (sag * Math.cos(m)).toFixed(1) + ' ' + (sag * Math.sin(m)).toFixed(1) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      s += '<path d="' + d + '"/>';
    });
    return s + '</svg>';
  }

  function bat(){
    return '<svg viewBox="0 0 100 50" aria-hidden="true"><path fill="#1a1210" d="M50 18 C47 12 45 11 44 14 C40 10 33 8 22 10 C14 11 7 16 1 22 C8 21 13 23 15 28 C19 24 25 25 28 30 C31 26 37 27 40 32 C43 29 46 30 50 36 C54 30 57 29 60 32 C63 27 69 26 72 30 C75 25 81 24 85 28 C87 23 92 21 99 22 C93 16 86 11 78 10 C67 8 60 10 56 14 C55 11 53 12 50 18 Z"/><circle cx="47.5" cy="19" r="1" fill="#ff6a2a"/><circle cx="52.5" cy="19" r="1" fill="#ff6a2a"/></svg>';
  }

  function zombie(){
    var id = 'hwz' + (uid++);
    return '<svg viewBox="0 0 140 200" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="' + id + 'k" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#b3c69a"/><stop offset=".55" stop-color="#7d9868"/><stop offset="1" stop-color="#4c6640"/></radialGradient>' +
        '<linearGradient id="' + id + 't" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55657a"/><stop offset="1" stop-color="#2f3a48"/></linearGradient>' +
      '</defs>' +
      /* épaules + chemise déchirée */
      '<path d="M40 200 C42 160 60 140 88 136 L140 132 L140 200 Z" fill="url(#' + id + 't)"/>' +
      '<path d="M58 150 L64 162 L70 150 L76 164 L82 148" fill="none" stroke="#1f2833" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M76 118 L96 118 L100 142 L72 142 Z" fill="#6d895c"/>' +
      /* tête */
      '<path d="M30 86 C28 52 48 32 74 32 C100 32 116 52 114 84 C113 110 98 130 72 130 C46 130 31 112 30 86 Z" fill="url(#' + id + 'k)"/>' +
      /* oreille abîmée */
      '<path d="M30 80 C20 76 18 92 26 98 L29 94 L27 90 L31 88 Z" fill="#6f8b5d"/>' +
      /* cheveux en bataille */
      '<path d="M30 74 C26 42 50 22 76 24 C102 26 118 44 114 72 L108 58 L101 66 L95 50 L86 60 L78 44 L70 56 L61 42 L53 58 L45 48 L40 64 L34 56 Z" fill="#2a2520"/>' +
      /* cicatrice + points de suture */
      '<path d="M50 62 L86 55" stroke="#4a2e2a" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M55 57 L57 66 M63 56 L65 65 M71 54 L73 63 M79 53 L81 62" stroke="#2b1c1a" stroke-width="1.4" stroke-linecap="round"/>' +
      /* orbites + yeux dépareillés */
      '<ellipse cx="56" cy="80" rx="12" ry="10" fill="#2e3324"/>' +
      '<ellipse cx="89" cy="82" rx="10" ry="8.5" fill="#2e3324"/>' +
      '<g class="hw-z-eye">' +
        '<circle cx="57" cy="81" r="6" fill="#efeccc"/><circle cx="55" cy="82" r="2.2" fill="#7a1010"/>' +
        '<circle cx="88" cy="83" r="4.4" fill="#e3dfb8"/><circle cx="87" cy="84" r="1.6" fill="#7a1010"/>' +
      '</g>' +
      '<path d="M46 92 Q56 96 66 92 M80 93 Q89 96 98 93" stroke="#56704a" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      /* nez */
      '<path d="M71 92 L67 104 L74 104" fill="none" stroke="#56704a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      /* blessure joue */
      '<ellipse cx="98" cy="104" rx="7" ry="5" fill="#8a3a2e" opacity=".55"/>' +
      /* bouche ouverte + dents */
      '<path d="M52 110 Q72 120 94 108 Q88 126 72 128 Q56 127 52 110 Z" fill="#3a1414"/>' +
      '<path d="M57 113 L60 119 L63 115 L67 120 L70 116 L74 121 L77 116 L81 119 L84 114 L88 116 L90 111" fill="#e5ddb8" stroke="#3a1414" stroke-width=".6" stroke-linejoin="round"/>' +
      /* main qui s\'agrippe */
      '<path d="M140 168 L104 160 C96 158 92 164 96 170 L140 182 Z" fill="url(#' + id + 't)"/>' +
      '<path d="M100 158 C88 154 78 158 74 164 C72 170 78 176 90 176 C98 176 104 172 104 166 Z" fill="#7d9868"/>' +
      '<g fill="none" stroke="#7d9868" stroke-width="6" stroke-linecap="round">' +
        '<path d="M80 160 C70 156 62 160 58 168"/><path d="M78 166 C68 164 60 170 58 178"/><path d="M80 172 C72 174 66 180 66 188"/><path d="M84 157 C80 150 74 148 68 150"/>' +
      '</g>' +
      '<g fill="#3b3a2c"><circle cx="58" cy="169" r="1.8"/><circle cx="58" cy="179" r="1.8"/><circle cx="66" cy="189" r="1.8"/><circle cx="68" cy="150" r="1.8"/></g>' +
    '</svg>';
  }

  function hand(){
    return '<svg viewBox="0 0 60 150" aria-hidden="true">' +
      '<path d="M18 150 L20 70 L42 70 L44 150 Z" fill="#4b5a6b"/>' +
      '<path d="M18 76 L22 84 L26 76 L31 86 L35 76 L39 84 L43 76" fill="none" stroke="#2f3a48" stroke-width="1.5"/>' +
      '<path d="M20 72 C18 56 20 46 30 44 C40 44 44 54 42 72 Z" fill="#7d9868"/>' +
      '<g class="hw-fingers" fill="none" stroke="#7d9868" stroke-width="6" stroke-linecap="round">' +
        '<path d="M22 50 C18 38 14 30 10 26"/><path d="M27 46 C26 32 24 20 22 12"/><path d="M33 46 C34 32 36 22 38 14"/><path d="M38 50 C42 40 46 34 50 30"/><path d="M41 60 C46 58 50 54 52 50"/>' +
      '</g>' +
      '<g fill="#3b3a2c"><circle cx="10" cy="26" r="1.8"/><circle cx="22" cy="12" r="1.8"/><circle cx="38" cy="14" r="1.8"/><circle cx="50" cy="30" r="1.8"/></g>' +
      '<path d="M24 58 L34 54" stroke="#8a3a2e" stroke-width="1.6" opacity=".6"/>' +
    '</svg>';
  }

  function tomb(text){
    var id = 'hwt' + (uid++);
    return '<svg viewBox="0 0 60 70" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#9a958c"/><stop offset="1" stop-color="#6b665e"/></linearGradient></defs>' +
      '<path d="M6 70 L6 26 C6 10 18 2 30 2 C42 2 54 10 54 26 L54 70 Z" fill="url(#' + id + ')"/>' +
      '<path d="M40 5 L37 12 L41 16 L38 22" fill="none" stroke="#4e4a44" stroke-width="1.2"/>' +
      '<text x="30" y="36" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="700" fill="#4e4a44">' + text + '</text>' +
      '<path d="M2 70 C8 64 14 66 18 62 C22 66 30 63 34 66 C40 62 48 66 58 70 Z" fill="#3e5a2a"/>' +
    '</svg>';
  }

  /* --- Montage ---------------------------------------------------------------- */
  function build(){
    var header = document.querySelector('header');

    // Bandeau d'annonce
    if (header && !document.querySelector('.hw-banner')){
      var banner = el('a', 'hw-banner', '🎃 <strong>Halloween à La Casa</strong> : le Cookie Araignée est arrivé, en édition limitée ! <span>Découvrir</span>');
      banner.href = 'produits.html';
      header.insertAdjacentElement('afterend', banner);
    }

    // Calque fixe : toiles, araignées, chauves-souris, zombie, citrouille
    var layer = el('div', 'hw-layer');
    layer.setAttribute('aria-hidden', 'true');

    var wl = el('div', 'hw-web hw-web--l', web());
    var wr = el('div', 'hw-web hw-web--r', web());
    layer.appendChild(wl); layer.appendChild(wr);

    [
      {style: 'left:3%;--drop:140px;--delay:.6s'},
      {style: 'right:5%;--drop:230px;--delay:1.4s;--size:38px'},
      {style: 'left:48%;--drop:200px;--delay:4s', cls: 'hw-spider--cycle hw-spider--wide'},
      {style: 'right:24%;--drop:120px;--delay:11s;--size:34px', cls: 'hw-spider--cycle hw-spider--wide'}
    ].forEach(function(o){
      var s = el('div', 'hw-spider' + (o.cls ? ' ' + o.cls : ''));
      s.setAttribute('style', o.style);
      s.appendChild(el('div', 'hw-spider-inner', spider()));
      layer.appendChild(s);
    });

    [
      {style: '--top:14%;--delay:3s;--dur:26s'},
      {style: '--top:22%;--delay:3.8s;--dur:26s;--size:38px'},
      {style: '--top:9%;--delay:17s;--dur:30s;--size:46px'}
    ].forEach(function(o){
      var b = el('div', 'hw-bat', bat());
      b.setAttribute('style', o.style);
      layer.appendChild(b);
    });

    layer.appendChild(el('div', 'hw-zombie', zombie()));
    layer.appendChild(el('div', 'hw-pumpkin-fixed', pumpkin()));
    document.body.appendChild(layer);

    // Petit cimetière juste au-dessus du footer
    var footer = document.querySelector('footer');
    if (footer){
      var g = el('div', 'hw-graveyard');
      g.setAttribute('aria-hidden', 'true');
      g.innerHTML =
        '<svg class="hw-ground" viewBox="0 0 1000 46" preserveAspectRatio="none"><path d="M0 18 C80 8 160 22 250 14 C340 6 420 20 520 12 C620 4 700 22 800 14 C880 8 950 16 1000 12 L1000 46 L0 46 Z" fill="#3b2a1e"/><path d="M0 18 C80 8 160 22 250 14 C340 6 420 20 520 12 C620 4 700 22 800 14 C880 8 950 16 1000 12" fill="none" stroke="#4f6b33" stroke-width="5"/></svg>';
      var items = [
        {cls: 'hw-tomb hw-hide-mobile', style: 'left:6%;--w:54px', html: tomb('RIP')},
        {cls: 'hw-grave-pumpkin', style: 'left:16%;--w:66px;--fd:.7s', html: pumpkin()},
        {cls: 'hw-hand', style: 'left:34%;--w:40px;--delay:1s', html: hand()},
        {cls: 'hw-tomb', style: 'left:46%;--w:62px', html: tomb('RIP')},
        {cls: 'hw-hand hw-hide-mobile', style: 'left:60%;--w:36px;--delay:5.5s', html: hand()},
        {cls: 'hw-grave-pumpkin', style: 'left:74%;--w:52px;--fd:1.6s', html: pumpkin()},
        {cls: 'hw-tomb hw-hide-mobile', style: 'left:88%;--w:48px', html: tomb('BOO')}
      ];
      items.forEach(function(it){
        var d = el('div', it.cls, it.html);
        d.setAttribute('style', it.style);
        g.appendChild(d);
      });
      footer.parentNode.insertBefore(g, footer);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
