/* ==========================================================================
   La Casa Del Cookie — Pop-up "Roue de la fortune"
   Vanilla JS pur. Injecte le pop-up dans la page, gère la roue SVG,
   le formulaire, l'appel API, l'animation et l'écran de victoire.
   ========================================================================== */
(function () {
  'use strict';

  // --- Configuration -------------------------------------------------------

  // URL de l'API : auto-détection local / production.
  const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  const API_URL = isLocal
    ? 'http://localhost:3000/api/spin'
    : 'https://roue.lacasadelcookie.fr/api/spin';

  const POPUP_DELAY = 5000;            // 5 s après chargement
  const DISMISS_DAYS = 7;              // ré-affichage après fermeture sans jouer
  const SPIN_TURNS = 6;               // tours complets minimum

  // Secteurs de la roue, dans l'ordre horaire à partir du haut.
  // Les wedges démarrent en haut : secteur 1 = 0°→72° (centré à 36°), etc.
  // center = angle horaire (sens des aiguilles, 0 = haut) du centre du secteur.
  const SECTORS = [
    { center: 36,  color: '#E8D9C0', text: '#5C3A1E', lines: ['-10%'] },                       // clair
    { center: 108, color: '#D4B896', text: '#5C3A1E', lines: ['-5%'] },                        // clair
    { center: 180, color: '#C9A47A', text: '#5C3A1E', lines: ['-15%'] },                       // clair
    { center: 252, color: '#8B5A3C', text: '#FFFFFF', lines: ['BOÎTE 6', 'COOKIES', 'OFFERTE'] }, // foncé
    { center: 324, color: '#A0734E', text: '#FFFFFF', lines: ['BOÎTE 4', 'COOKIES', 'OFFERTE'] }, // foncé
  ];

  // Mapping lot renvoyé par le backend -> index du secteur.
  const PRIZE_TO_SECTOR = {
    DISCOUNT_10: 0,
    DISCOUNT_5: 1,
    DISCOUNT_15: 2,
    BOX_6: 3,
    BOX_4: 4,
  };

  // Libellés lisibles pour l'écran de victoire.
  const PRIZE_LABELS = {
    DISCOUNT_5: '5 % de réduction',
    DISCOUNT_10: '10 % de réduction',
    DISCOUNT_15: '15 % de réduction',
    BOX_4: 'Une boîte de 4 cookies offerte',
    BOX_6: 'Une boîte de 6 cookies offerte',
  };

  // --- localStorage helpers ------------------------------------------------

  function hasPlayed() {
    return localStorage.getItem('casa_played') === 'true';
  }
  function isDismissed() {
    const until = localStorage.getItem('casa_popup_dismissed');
    if (!until) return false;
    if (Date.now() > Number(until)) {
      localStorage.removeItem('casa_popup_dismissed');
      return false;
    }
    return true;
  }
  function setDismissed() {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem('casa_popup_dismissed', String(until));
  }
  function setPlayed() {
    localStorage.setItem('casa_played', 'true');
  }

  // --- Géométrie SVG -------------------------------------------------------

  const CX = 160, CY = 160, R = 148;
  const LABEL_R = R * 0.62; // ~92 : labels à 62 % du rayon (spec)

  // Point sur le cercle pour un angle horaire (0 = haut, sens horaire).
  function pointAt(angleDeg, radius) {
    const a = (angleDeg * Math.PI) / 180;
    return {
      x: CX + radius * Math.sin(a),
      y: CY - radius * Math.cos(a),
    };
  }

  // Chemin d'un secteur (wedge) entre deux angles horaires.
  function wedgePath(startDeg, endDeg, radius) {
    const p1 = pointAt(startDeg, radius);
    const p2 = pointAt(endDeg, radius);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${CX} ${CY} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} ` +
           `A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
  }

  // Cookie stylisé (SVG inline) pour le moyeu central.
  function buildCookieHub() {
    // Pépites dispersées de façon naturelle (dx, dy depuis le centre, rayon).
    const chips = [
      [-8, -6, 3], [6, -9, 2.5], [10, 4, 3.5],
      [-5, 8, 3], [2, 1, 2], [-11, 3, 2.5], [8, 11, 2.5],
    ];
    let dots = '';
    chips.forEach(([dx, dy, r]) => {
      dots += `<circle cx="${(CX + dx).toFixed(1)}" cy="${(CY + dy).toFixed(1)}" r="${r}" fill="#3D2817"/>`;
    });
    return `
    <circle cx="${CX}" cy="${CY}" r="40" fill="#5C3A1E" stroke="#FFFFFF" stroke-width="3"/>
    <circle cx="${CX}" cy="${CY}" r="25" fill="#D4B896" stroke="#A0734E" stroke-width="1"/>
    ${dots}`;
  }

  // Construit le SVG complet de la roue.
  function buildWheelSVG() {
    let wedges = '';
    let labels = '';

    SECTORS.forEach((s) => {
      const start = s.center - 36;
      const end = s.center + 36;

      // Wedge
      wedges += `<path d="${wedgePath(start, end, R)}" fill="${s.color}" stroke="#FFFFFF" stroke-width="2"/>`;

      // Label : groupe pivoté sur l'angle du secteur pour suivre l'orientation radiale.
      // On retourne de 180° les secteurs de la moitié basse pour garder une lecture à l'endroit.
      const flip = s.center > 90 && s.center < 270;
      const lp = pointAt(s.center, LABEL_R);
      const rot = flip ? s.center + 180 : s.center;
      const cls = s.lines.length > 1 ? 'casa-roue-label casa-roue-label-box' : 'casa-roue-label casa-roue-label-pct';

      // Texte multi-lignes via <tspan> + dy (centré verticalement sur le point d'ancrage).
      let tspans;
      if (s.lines.length === 1) {
        tspans = `<tspan x="${lp.x.toFixed(1)}">${s.lines[0]}</tspan>`;
      } else {
        tspans = s.lines
          .map((line, i) => {
            const dy = i === 0 ? '-1.05em' : '1.05em';
            return `<tspan x="${lp.x.toFixed(1)}" dy="${dy}">${line}</tspan>`;
          })
          .join('');
      }

      labels += `<g transform="rotate(${rot} ${lp.x.toFixed(1)} ${lp.y.toFixed(1)})">` +
                `<text class="${cls}" x="${lp.x.toFixed(1)}" y="${lp.y.toFixed(1)}" ` +
                `text-anchor="middle" dominant-baseline="middle" fill="${s.text}">${tspans}</text></g>`;
    });

    // Clous décoratifs : 10 points répartis tous les 36° sur la bordure extérieure.
    // Couleur crème (#FAF3E7) pour rester visibles sur la jante brun foncé.
    let studs = '';
    for (let i = 0; i < 10; i++) {
      const p = pointAt(i * 36, R + 2);
      studs += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#FAF3E7"/>`;
    }

    return `
<svg class="casa-roue-svg" viewBox="0 0 320 320" role="img" aria-label="Roue de la fortune La Casa Del Cookie">
  <!-- Partie rotative (secteurs + labels solidaires) -->
  <g class="casa-roue-spin" id="casaRoueSpin">
    <circle cx="${CX}" cy="${CY}" r="${R + 6}" fill="#5C3A1E"/>
    ${wedges}
    ${studs}
    ${labels}
  </g>
  <!-- Moyeu central fixe : cookie stylisé -->
  ${buildCookieHub()}
  <!-- Pointeur fixe en haut -->
  <polygon points="160,40 145,6 175,6" fill="#5C3A1E" stroke="#FFFFFF" stroke-width="2"/>
</svg>`;
  }

  // --- Construction du markup du pop-up -----------------------------------

  // Icônes SVG inline
  const ICON_USER = '<svg class="casa-roue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const ICON_MAIL = '<svg class="casa-roue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>';
  const ICON_PHONE = '<svg class="casa-roue-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function buildPopupHTML() {
    return `
<div class="casa-roue-overlay" id="casaRoueOverlay" role="dialog" aria-modal="true" aria-labelledby="casaRoueTitle" aria-hidden="true">
  <div class="casa-roue-modal">
    <button class="casa-roue-close" id="casaRoueClose" type="button" aria-label="Fermer la fenêtre">${ICON_CLOSE}</button>

    <div class="casa-roue-body">
      <div class="casa-roue-left">
        <div class="casa-roue-wrap">${buildWheelSVG()}</div>
      </div>

      <div class="casa-roue-right">
        <h2 class="casa-roue-title" id="casaRoueTitle">Tente ta chance !</h2>
        <p class="casa-roue-subtitle">Tourne la roue et gagne des réductions exclusives ou des <strong>cookies offerts</strong> !</p>
        <p class="casa-roue-formlabel">Entre tes infos pour jouer ↓</p>

        <form class="casa-roue-form" id="casaRoueForm" novalidate>
          <div class="casa-roue-field">
            ${ICON_USER}
            <input type="text" id="casaFirstName" name="firstName" placeholder="Prénom" autocomplete="given-name" maxlength="50" aria-label="Prénom" required>
          </div>
          <div class="casa-roue-error" data-for="casaFirstName"></div>

          <div class="casa-roue-field">
            ${ICON_USER}
            <input type="text" id="casaLastName" name="lastName" placeholder="Nom" autocomplete="family-name" maxlength="50" aria-label="Nom" required>
          </div>
          <div class="casa-roue-error" data-for="casaLastName"></div>

          <div class="casa-roue-field">
            ${ICON_MAIL}
            <input type="email" id="casaEmail" name="email" placeholder="Email" autocomplete="email" maxlength="254" aria-label="Email" required>
          </div>
          <div class="casa-roue-error" data-for="casaEmail"></div>

          <div class="casa-roue-field">
            ${ICON_PHONE}
            <input type="tel" id="casaPhone" name="phone" placeholder="Téléphone" autocomplete="tel" maxlength="20" aria-label="Téléphone" required>
          </div>
          <div class="casa-roue-error" data-for="casaPhone"></div>

          <button type="submit" class="casa-roue-submit" id="casaRoueSubmit">Je tourne la roue ! ♡</button>
          <div class="casa-roue-global-error" id="casaRoueGlobalError"></div>
          <p class="casa-roue-legal">En participant, vous acceptez d'être contacté(e) par La Casa Del Cookie pour des offres exclusives. Désinscription possible à tout moment.</p>
        </form>
      </div>
    </div>

    <!-- Écran de victoire -->
    <div class="casa-roue-win" id="casaRoueWin" role="status" aria-live="polite">
      <div class="casa-roue-win-cookie">🍪</div>
      <h3 class="casa-roue-win-title" id="casaWinTitle">Bravo !</h3>
      <p class="casa-roue-win-sub">Tu as gagné :</p>
      <p class="casa-roue-win-prize" id="casaWinPrize"></p>
      <div class="casa-roue-win-code" id="casaWinCode"></div>
      <p class="casa-roue-win-note">Un email de confirmation t'a été envoyé. Présente ton code lors de ta prochaine commande chez La Casa Del Cookie.</p>
      <button type="button" class="casa-roue-win-close" id="casaWinClose">Fermer</button>
    </div>
  </div>
</div>`;
  }

  // --- Validation du formulaire -------------------------------------------

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showFieldError(input, message) {
    input.classList.add('has-error');
    const box = document.querySelector(`.casa-roue-error[data-for="${input.id}"]`);
    if (box) { box.textContent = message; box.classList.add('is-visible'); }
  }
  function clearFieldError(input) {
    input.classList.remove('has-error');
    const box = document.querySelector(`.casa-roue-error[data-for="${input.id}"]`);
    if (box) { box.textContent = ''; box.classList.remove('is-visible'); }
  }

  function validateForm(fields) {
    let valid = true;
    const { firstName, lastName, email, phone } = fields;

    [firstName, lastName, email, phone].forEach(clearFieldError);

    if (firstName.value.trim().length < 1) { showFieldError(firstName, 'Prénom requis'); valid = false; }
    if (lastName.value.trim().length < 1) { showFieldError(lastName, 'Nom requis'); valid = false; }
    if (!EMAIL_RE.test(email.value.trim())) { showFieldError(email, 'Email invalide'); valid = false; }

    const digits = (phone.value.match(/\d/g) || []).length;
    if (digits < 8) { showFieldError(phone, 'Téléphone invalide (8 chiffres min.)'); valid = false; }

    return valid;
  }

  // --- Animation de la roue ------------------------------------------------

  function spinTo(prize) {
    const sectorIndex = PRIZE_TO_SECTOR[prize];
    const center = SECTORS[sectorIndex].center;

    // Rotation finale pour amener le centre du secteur sous le pointeur (haut).
    const rest = (360 - center) % 360;
    // Petit jitter ±15° pour ne pas tomber pile au centre (reste dans le secteur).
    const jitter = (Math.random() * 30) - 15;
    const total = SPIN_TURNS * 360 + rest + jitter;

    const spinEl = document.getElementById('casaRoueSpin');
    // Forcer un reflow avant d'appliquer la transition.
    spinEl.classList.add('is-spinning');
    // eslint-disable-next-line no-unused-expressions
    spinEl.getBoundingClientRect();
    spinEl.style.transform = `rotate(${total}deg)`;
  }

  // --- Logique principale --------------------------------------------------

  let lastFocused = null;

  function openPopup() {
    const overlay = document.getElementById('casaRoueOverlay');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    lastFocused = document.activeElement;
    const first = document.getElementById('casaFirstName');
    if (first) setTimeout(() => first.focus(), 100);
  }

  function closePopup() {
    const overlay = document.getElementById('casaRoueOverlay');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function showWin(prize, code, firstName) {
    document.getElementById('casaWinTitle').textContent = `Bravo ${firstName} ! 🎉`;
    document.getElementById('casaWinPrize').textContent = PRIZE_LABELS[prize] || prize;
    document.getElementById('casaWinCode').textContent = code;
    document.getElementById('casaRoueWin').classList.add('is-visible');
  }

  function showGlobalError(message) {
    const box = document.getElementById('casaRoueGlobalError');
    box.textContent = message;
    box.classList.add('is-visible');
  }
  function clearGlobalError() {
    const box = document.getElementById('casaRoueGlobalError');
    box.textContent = '';
    box.classList.remove('is-visible');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    clearGlobalError();

    const fields = {
      firstName: document.getElementById('casaFirstName'),
      lastName: document.getElementById('casaLastName'),
      email: document.getElementById('casaEmail'),
      phone: document.getElementById('casaPhone'),
    };

    if (!validateForm(fields)) return;

    const payload = {
      firstName: fields.firstName.value.trim(),
      lastName: fields.lastName.value.trim(),
      email: fields.email.value.trim(),
      phone: fields.phone.value.trim(),
    };

    const submitBtn = document.getElementById('casaRoueSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Patiente...';

    let res;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Je tourne la roue ! ♡';
      showGlobalError('Une erreur est survenue, réessaie dans un instant');
      return;
    }

    if (res.status === 409) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Je tourne la roue ! ♡';
      showFieldError(fields.email, 'Cet email a déjà tenté sa chance');
      return;
    }
    if (res.status === 429) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Je tourne la roue ! ♡';
      showGlobalError('Trop de tentatives, réessaie plus tard');
      return;
    }
    if (!res.ok) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Je tourne la roue ! ♡';
      showGlobalError('Une erreur est survenue, réessaie dans un instant');
      return;
    }

    const data = await res.json();

    // Lancer l'animation puis afficher l'écran de victoire.
    spinTo(data.prize);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = reduced ? 1100 : 5200;
    setPlayed(); // l'utilisateur a joué : ne plus réafficher
    setTimeout(() => showWin(data.prize, data.code, payload.firstName), wait);
  }

  // --- Focus trap basique --------------------------------------------------

  function trapFocus(e) {
    const overlay = document.getElementById('casaRoueOverlay');
    if (!overlay.classList.contains('is-open')) return;
    if (e.key !== 'Tab') return;
    const focusable = overlay.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    );
    const visible = Array.from(focusable).filter((el) => el.offsetParent !== null);
    if (!visible.length) return;
    const firstEl = visible[0];
    const lastEl = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault(); lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault(); firstEl.focus();
    }
  }

  // --- Initialisation ------------------------------------------------------

  function init() {
    // Ne rien faire si déjà joué ou récemment fermé.
    if (hasPlayed() || isDismissed()) return;

    // Injecter le markup.
    const holder = document.createElement('div');
    holder.innerHTML = buildPopupHTML();
    document.body.appendChild(holder.firstElementChild);

    // Branchements.
    document.getElementById('casaRoueForm').addEventListener('submit', handleSubmit);

    document.getElementById('casaRoueClose').addEventListener('click', () => {
      setDismissed();
      closePopup();
    });

    document.getElementById('casaWinClose').addEventListener('click', () => {
      setPlayed();
      closePopup();
    });

    // ESC ferme (= dismiss si l'utilisateur n'a pas joué).
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('casaRoueOverlay');
        if (overlay && overlay.classList.contains('is-open')) {
          const played = document.getElementById('casaRoueWin').classList.contains('is-visible');
          if (!played) setDismissed();
          closePopup();
        }
      }
      trapFocus(e);
    });

    // Affichage après le délai.
    setTimeout(openPopup, POPUP_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
