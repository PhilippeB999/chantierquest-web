/* ============================================================
   ChantierQuest — logique de jeu (gamification)
   ============================================================ */

const STORAGE_KEY = "chantierquest_state_v3";

function defaultState() {
  return {
    firstLaunchDate: Date.now(), // début de l\'essai gratuit de 7 jours sur cet appareil
    accessCode: "",
    welcomeSeen: false, // écran d'explication du fonctionnement, montré une seule fois
    name: "",
    lang: "fr",
    avatarChar: AVATAR_CHARACTERS[0].id,
    avatarColor: "jaune",
    vehicle: VEHICLE_TYPES[0].id,
    xp: 0,
    completed: {},        // { c01_1: { score: 80, best: 80, attempts: 2 }, c01_2: {...}, ... }
    badges: [],           // competency ids earned (palier Avancé réussi = compétence maîtrisée)
    trophies: [],         // trophy ids earned
    loginDays: [],
    matchesCompleted: 0,  // compteur cumulatif de questions d'association réussies
    createdAt: null
  };
}

let state = loadState();
let draftName = state.name || "";
let draftAccessCode = "";
let accessCodeStatus = null; // null | "checking" | "invalid" | "offline" | "not-configured"
let currentQuest = null;      // compétence (objet COMPETENCIES[i]) en cours
let currentTierLevel = null;  // 1, 2 ou 3 — palier de la compétence en cours
let quizAnswers = [];     // index (dans l'ordre mélangé) choisi par question, ou true pour "match" complété
let quizShuffled = [];    // tableau par question des choix mélangés {fr,en,correct} (null pour "match")
let quizMatchState = [];  // tableau par question de l'état d'association (null si pas de type "match")
let quizIndex = 0;

/* Clé de sauvegarde d'un palier: "c01_2" = compétence c01, palier 2. */
function tierKey(compId, level) { return `${compId}_${level}`; }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultState(), parsed);
      // Les élèves qui avaient déjà un profil avant l'ajout de cet écran
      // n'ont pas à le voir apparaître après une mise à jour de l'app.
      if (parsed.welcomeSeen === undefined && parsed.name) {
        merged.welcomeSeen = true;
      }
      migrateToTiers(merged);
      return merged;
    }
  } catch (e) { /* ignore */ }
  return defaultState();
}

/* Rétrocompatibilité: avant l'ajout des paliers de difficulté, la
   progression était sauvegardée sous une seule clé par compétence
   (ex: "c01"). On la convertit ici en palier 1 ("c01_1") pour ne pas
   effacer la progression des élèves qui utilisaient déjà l'app — leurs
   badges déjà obtenus restent acquis. */
function migrateToTiers(s) {
  if (s.__migratedTiers) return;
  const migrated = {};
  for (const key of Object.keys(s.completed || {})) {
    migrated[/^c\d+$/.test(key) ? tierKey(key, 1) : key] = s.completed[key];
  }
  s.completed = migrated;
  s.__migratedTiers = true;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function t(key) {
  return UI_TEXT[state.lang][key];
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function recordLogin() {
  const d = todayStr();
  if (!state.loginDays.includes(d)) {
    state.loginDays.push(d);
    saveState();
  }
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getLevel() {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (state.xp >= l.min) lvl = l;
  }
  return lvl;
}

function checkTrophies() {
  const newly = [];
  for (const tr of TROPHIES) {
    if (!state.trophies.includes(tr.id) && tr.check(state)) {
      state.trophies.push(tr.id);
      newly.push(tr);
    }
  }
  if (newly.length) saveState();
  return newly;
}

/* ------------------ Avatar (personnage SVG) ------------------ */

function colorHex(id) {
  const c = AVATAR_COLORS.find(c => c.id === id);
  return c ? c.hex : "#f7b500";
}

function shadeColor(hex, amt) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) + amt, g = ((num >> 8) & 0xff) + amt, b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function avatarSVG(charId, colorId, stage, size) {
  size = size || 60;
  const c = AVATAR_CHARACTERS.find(a => a.id === charId) || AVATAR_CHARACTERS[0];
  const accent = colorHex(colorId);
  const skin = c.skin;
  const isCap = charId === "camionneur" || charId === "camionneuse";
  const isFemale = charId === "operatrice_bouteur" || charId === "camionneuse" || charId === "mecanicienne";
  const hasMustache = charId === "camionneur";
  const hasStubble = charId === "contremaitre";
  const hasStripe = charId === "contremaitre";
  const showGlasses = stage >= 2;
  const showEarProtection = stage >= 4 && !isCap;
  const showStar = stage >= 5;
  const darkAccent = shadeColor(accent, -40);
  const lightAccent = shadeColor(accent, 35);
  const hair = "#2b2018";
  const lip = "#b5544a";

  const fringe = isFemale
    ? `<path d="M27,32 Q28,20 37,23 L38,34 Q31,35 27,32 Z" fill="${hair}"/>
       <path d="M73,32 Q72,20 63,23 L62,34 Q69,35 73,32 Z" fill="${hair}"/>
       <path d="M30,26 Q26,32 28,40 L32,40 Q29,33 32,27 Z" fill="${hair}"/>
       <path d="M70,26 Q74,32 72,40 L68,40 Q71,33 68,27 Z" fill="${hair}"/>`
    : `<path d="M30,30 Q32,24 38,26 L38,33 Q33,33 30,30 Z" fill="${hair}"/>
       <path d="M70,30 Q68,24 62,26 L62,33 Q67,33 70,30 Z" fill="${hair}"/>`;

  const ponytail = isFemale
    ? `<path d="M67,40 Q83,46 79,68 Q76,76 70,70 Q75,55 62,45 Z" fill="${hair}"/>
       <ellipse cx="66.5" cy="43" rx="5" ry="3.2" fill="${accent}" transform="rotate(-35 66.5 43)"/>`
    : "";

  const blush = isFemale
    ? `<ellipse cx="35" cy="47" rx="4" ry="2.6" fill="#e8877a" opacity="0.45"/>
       <ellipse cx="65" cy="47" rx="4" ry="2.6" fill="#e8877a" opacity="0.45"/>`
    : "";

  const eyelashes = isFemale
    ? `<path d="M41.7,40 L39,38" stroke="#20242a" stroke-width="1" stroke-linecap="round"/>
       <path d="M58.3,40 L61,38" stroke="#20242a" stroke-width="1" stroke-linecap="round"/>`
    : "";

  let facial = "";
  if (hasMustache) {
    facial = `<path d="M42,54 Q50,58 58,54 L57,57 Q50,60 43,57 Z" fill="${hair}"/>`;
  } else if (hasStubble) {
    facial = `<path d="M38,50 Q50,60 62,50 L62,55 Q50,64 38,55 Z" fill="${hair}" opacity="0.35"/>`;
  }

  const mouth = hasMustache
    ? `<path d="M45,58 Q50,60 55,58" stroke="#8a4a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
    : `<path d="M43,56 Q50,61 57,56" stroke="${isFemale ? lip : '#7a4030'}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;

  const glasses = showGlasses
    ? `<rect x="37" y="38" width="12" height="8" rx="2.5" fill="#dff1ff" stroke="#20242a" stroke-width="1.4" opacity="0.9"/>
       <rect x="51" y="38" width="12" height="8" rx="2.5" fill="#dff1ff" stroke="#20242a" stroke-width="1.4" opacity="0.9"/>
       <line x1="49" y1="41" x2="51" y2="41" stroke="#20242a" stroke-width="1.4"/>`
    : "";

  const earMuffs = showEarProtection
    ? `<path d="M23,36 Q50,15 77,36" stroke="#e8543a" stroke-width="4" fill="none" stroke-linecap="round"/>
       <ellipse cx="23" cy="44" rx="6" ry="8" fill="#e8543a" stroke="#20242a" stroke-width="1"/>
       <ellipse cx="77" cy="44" rx="6" ry="8" fill="#e8543a" stroke="#20242a" stroke-width="1"/>
       <ellipse cx="23" cy="44" rx="2.6" ry="4" fill="#c73a24"/>
       <ellipse cx="77" cy="44" rx="2.6" ry="4" fill="#c73a24"/>`
    : "";

  const star = showStar
    ? `<g transform="translate(66,90)"><path d="M0,-9 L2.1,-2.8 L8.6,-2.8 L3.5,1.1 L5.3,7.3 L0,3.5 L-5.3,7.3 L-3.5,1.1 L-8.6,-2.8 L-2.1,-2.8 Z" fill="#ffd23f" stroke="#a5760a" stroke-width="1"/></g>`
    : "";

  let hat;
  if (isCap) {
    hat = `
      <path d="M29,32 Q30,11 50,10 Q70,11 71,32 L50,32 Z" fill="${accent}"/>
      <path d="M50,10 Q70,11 71,32 L50,32 Z" fill="${darkAccent}" opacity="0.28"/>
      <path d="M32,30 Q50,40 68,30 Q69,34 50,39 Q31,34 32,30 Z" fill="${darkAccent}"/>
      <circle cx="50" cy="12" r="2" fill="${darkAccent}" opacity="0.6"/>
      <path d="M38,15 Q50,11 62,15" stroke="${darkAccent}" stroke-width="1" opacity="0.3" fill="none"/>
    `;
  } else {
    hat = `
      <ellipse cx="50" cy="30" rx="26" ry="5.5" fill="${darkAccent}"/>
      <path d="M25,29 Q26,9 50,8 Q74,9 75,29 Q75,24 50,22 Q25,24 25,29 Z" fill="${accent}"/>
      <path d="M50,8 Q74,9 75,29 Q75,24 50,22 Z" fill="${darkAccent}" opacity="0.3"/>
      <rect x="48" y="10" width="4" height="14" fill="${darkAccent}" opacity="0.4"/>
      <rect x="45" y="12" width="10" height="5" rx="2" fill="${lightAccent}" opacity="0.8"/>
      ${hasStripe ? `<rect x="27" y="26" width="46" height="3" fill="#fff" opacity="0.85"/>` : ""}
    `;
  }

  return `
  <svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="49" fill="#232a31"/>
    <path d="M14,100 Q15,66 50,63 Q85,66 86,100 Z" fill="${accent}"/>
    <path d="M14,100 Q15,66 50,63 Q85,66 86,100 Z" fill="${darkAccent}" opacity="0.12"/>
    ${hasStripe
      ? `<rect x="24" y="76" width="52" height="6" fill="#fff" opacity="0.85"/><rect x="24" y="88" width="52" height="6" fill="#fff" opacity="0.85"/>`
      : `<path d="M36,68 L50,80 L64,68 L64,74 L50,86 L36,74 Z" fill="#e8e8e8" opacity="0.9"/>`}
    <ellipse cx="30" cy="48" rx="5" ry="6" fill="${skin}"/>
    <ellipse cx="70" cy="48" rx="5" ry="6" fill="${skin}"/>
    <rect x="42" y="56" width="16" height="14" fill="${skin}"/>
    <circle cx="50" cy="44" r="19" fill="${skin}"/>
    ${fringe}
    ${ponytail}
    ${blush}
    <path d="M40,36 q4,-3 8,0" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M52,36 q4,-3 8,0" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="44" cy="42" r="2.3" fill="#20242a"/>
    <circle cx="56" cy="42" r="2.3" fill="#20242a"/>
    <circle cx="44.7" cy="41.3" r="0.6" fill="#fff"/>
    <circle cx="56.7" cy="41.3" r="0.6" fill="#fff"/>
    ${eyelashes}
    ${facial}
    ${mouth}
    ${glasses}
    ${hat}
    ${earMuffs}
    ${star}
  </svg>`;
}

/* ------------------ Machine (camion/pelle/etc. qui grossit) ------------------ */

function vehicleGradientDefs(gid, accent) {
  return `
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shadeColor(accent, 45)}"/>
      <stop offset="0.5" stop-color="${accent}"/>
      <stop offset="1" stop-color="${shadeColor(accent, -25)}"/>
    </linearGradient>
    <radialGradient id="${gid}_rim" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#c3c9cf"/>
      <stop offset="1" stop-color="#6b747c"/>
    </radialGradient>`;
}

/* Pneu réaliste: bande de roulement, jante, moyeu, boulons. */
function tireSVG(cx, cy, r, gid) {
  let tread = "";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (r - 1.5), y1 = cy + Math.sin(a) * (r - 1.5);
    const x2 = cx + Math.cos(a) * (r - 4), y2 = cy + Math.sin(a) * (r - 4);
    tread += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#111418" stroke-width="1.3"/>`;
  }
  let bolts = "";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const x = cx + Math.cos(a) * r * 0.28, y = cy + Math.sin(a) * r * 0.28;
    bolts += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 0.09).toFixed(1)}" fill="#2b3036"/>`;
  }
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#181b1f"/>
    ${tread}
    <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="url(#${gid}_rim)"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="#4a5158"/>
    ${bolts}
  `;
}

/* Chenille réaliste: coque en forme de stade avec galets visibles. */
function trackSVG(x, y, w, h, nWheels) {
  const r = h / 2;
  let wheels = "";
  const wr = h * 0.34;
  const step = (w - h) / (nWheels - 1);
  for (let i = 0; i < nWheels; i++) {
    const cx = x + r + i * step;
    wheels += `<circle cx="${cx.toFixed(1)}" cy="${y + r}" r="${wr.toFixed(1)}" fill="#565f67"/>
               <circle cx="${cx.toFixed(1)}" cy="${y + r}" r="${(wr * 0.4).toFixed(1)}" fill="#2b3036"/>`;
  }
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#14171a"/>
    ${wheels}
    <rect x="${x + r * 0.5}" y="${y + 1.5}" width="${w - r}" height="${h * 0.22}" rx="${h * 0.11}" fill="#3a4048" opacity="0.7"/>
    <circle cx="${x + r}" cy="${y + r}" r="${r * 0.92}" fill="#3a4048"/>
    <circle cx="${x + w - r}" cy="${y + r}" r="${r * 0.92}" fill="#3a4048"/>
    <circle cx="${x + r}" cy="${y + r}" r="${r * 0.4}" fill="#1a1d21"/>
    <circle cx="${x + w - r}" cy="${y + r}" r="${r * 0.4}" fill="#1a1d21"/>
  `;
}

/* Vérin hydraulique: corps + tige + articulations. */
function hydraulicSVG(x1, y1, x2, y2, w) {
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2e3338" stroke-width="${w + 2.4}" stroke-linecap="round"/>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c7ccd1" stroke-width="${w}" stroke-linecap="round"/>
    <circle cx="${x1}" cy="${y1}" r="${w * 0.95}" fill="#2a2f35"/>
    <circle cx="${x2}" cy="${y2}" r="${w * 0.95}" fill="#2a2f35"/>
  `;
}

const VEHICLE_DRAWERS = {
  camion: (accent, gid) => {
    const dark = shadeColor(accent, -35);
    const steel = "#525b63";
    return `
      <defs>${vehicleGradientDefs(gid, accent)}</defs>
      <ellipse cx="66" cy="90" rx="62" ry="5" fill="#000" opacity="0.28"/>
      <path d="M6,52 L34,52 Q40,52 40,58 L40,76 L6,76 Q2,76 2,72 L2,58 Q2,52 6,52 Z" fill="url(#${gid})" stroke="${dark}" stroke-width="1"/>
      <path d="M6,52 L34,52 Q40,52 40,58 L40,60 L4,60 L4,56 Q4,52 6,52 Z" fill="${shadeColor(accent, 50)}" opacity="0.4"/>
      <rect x="10" y="55" width="17" height="11" rx="2" fill="#bfe6f5" stroke="${dark}" stroke-width="1"/>
      <line x1="18.5" y1="55" x2="18.5" y2="66" stroke="${dark}" stroke-width="1"/>
      <rect x="4" y="64" width="5" height="9" rx="1" fill="#e9edf0" stroke="${dark}" stroke-width="0.7"/>
      <rect x="4" y="60" width="3" height="6" rx="1" fill="${steel}"/>
      <rect x="30" y="44" width="4" height="12" rx="1.5" fill="${steel}"/>
      <rect x="28" y="42" width="8" height="4" rx="1.5" fill="${shadeColor(steel, -15)}"/>
      <rect x="38" y="26" width="80" height="44" rx="3" fill="url(#${gid})" stroke="${dark}" stroke-width="1"/>
      <rect x="38" y="26" width="80" height="8" fill="${shadeColor(accent, 55)}" opacity="0.45"/>
      <line x1="52" y1="26" x2="52" y2="70" stroke="${dark}" stroke-width="1" opacity="0.5"/>
      <line x1="66" y1="26" x2="66" y2="70" stroke="${dark}" stroke-width="1" opacity="0.5"/>
      <line x1="80" y1="26" x2="80" y2="70" stroke="${dark}" stroke-width="1" opacity="0.5"/>
      <line x1="94" y1="26" x2="94" y2="70" stroke="${dark}" stroke-width="1" opacity="0.5"/>
      <line x1="108" y1="26" x2="108" y2="70" stroke="${dark}" stroke-width="1" opacity="0.5"/>
      <rect x="38" y="66" width="80" height="4" fill="${dark}"/>
      <rect x="0" y="78" width="124" height="6" fill="${dark}"/>
      <rect x="0" y="83" width="7" height="9" rx="1" fill="#15171a"/>
      <rect x="97" y="83" width="7" height="9" rx="1" fill="#15171a"/>
      ${tireSVG(16, 88, 13, gid)}
      ${tireSVG(98, 88, 13, gid)}
      ${tireSVG(116, 88, 13, gid)}
    `;
  },
  pelle: (accent, gid) => {
    const dark = shadeColor(accent, -35);
    const steel = "#525b63";
    return `
      <defs>${vehicleGradientDefs(gid, accent)}</defs>
      <ellipse cx="70" cy="94" rx="62" ry="5" fill="#000" opacity="0.28"/>
      ${trackSVG(12, 76, 100, 16, 5)}
      <path d="M14,76 Q64,60 112,76 Z" fill="${dark}"/>
      <path d="M28,46 Q28,42 32,42 L90,42 Q96,42 96,48 L96,72 L28,72 Z" fill="url(#${gid})" stroke="${dark}" stroke-width="1"/>
      <rect x="36" y="48" width="24" height="16" rx="2" fill="#bfe6f5" stroke="${dark}" stroke-width="1"/>
      <line x1="48" y1="48" x2="48" y2="64" stroke="${dark}" stroke-width="1"/>
      <rect x="86" y="34" width="12" height="16" rx="2" fill="${shadeColor(accent, 15)}" stroke="${dark}" stroke-width="1"/>
      <rect x="28" y="66" width="10" height="8" fill="${dark}"/>
      <path d="M84,44 L120,26 L128,30 L92,48 Z" fill="${steel}"/>
      ${hydraulicSVG(96, 50, 78, 40, 3.4)}
      <path d="M116,24 L142,36 L138,46 L110,34 Z" fill="${shadeColor(steel, -10)}"/>
      ${hydraulicSVG(122, 32, 106, 42, 2.6)}
      <path d="M136,32 L156,30 L154,44 L134,44 Z" fill="${shadeColor(steel, 10)}"/>
      <path d="M136,32 L142,30 L143,34 L138,36 Z" fill="#8a939b"/>
      <path d="M137,44 L133,50 L138,52 L142,46 Z" fill="#8a939b"/>
      <path d="M141,46 L146,50 L142,54 L137,50 Z" fill="#8a939b"/>
    `;
  },
  bouteur: (accent, gid) => {
    const dark = shadeColor(accent, -35);
    const steel = "#525b63";
    return `
      <defs>${vehicleGradientDefs(gid, accent)}</defs>
      <ellipse cx="62" cy="94" rx="60" ry="5" fill="#000" opacity="0.28"/>
      ${trackSVG(16, 74, 96, 15, 5)}
      <path d="M44,46 L100,46 Q104,46 104,50 L104,70 L44,70 Z" fill="url(#${gid})" stroke="${dark}" stroke-width="1"/>
      <rect x="50" y="50" width="20" height="14" rx="2" fill="#bfe6f5" stroke="${dark}" stroke-width="1"/>
      <line x1="60" y1="50" x2="60" y2="64" stroke="${dark}" stroke-width="1"/>
      <rect x="92" y="32" width="7" height="17" rx="2" fill="${dark}"/>
      <rect x="90" y="30" width="11" height="5" rx="1.5" fill="${dark}"/>
      ${hydraulicSVG(44, 52, 24, 58, 3.2)}
      ${hydraulicSVG(44, 66, 24, 72, 3.2)}
      <path d="M18,46 Q28,48 27,58 L25,78 Q24,86 16,88 L10,88 L8,60 Q8,50 18,46 Z" fill="${steel}" stroke="${shadeColor(steel, -25)}" stroke-width="1"/>
      <path d="M18,46 Q26,48 26,55 L14,58 Q13,51 18,46 Z" fill="${shadeColor(steel, 25)}" opacity="0.5"/>
      <rect x="8" y="83" width="18" height="5" rx="1.5" fill="#d7dce0"/>
      <rect x="8" y="86" width="18" height="2.5" fill="#9aa2a9"/>
    `;
  },
  chargeuse: (accent, gid) => {
    const dark = shadeColor(accent, -35);
    const steel = "#525b63";
    return `
      <defs>${vehicleGradientDefs(gid, accent)}</defs>
      <ellipse cx="68" cy="96" rx="62" ry="5" fill="#000" opacity="0.28"/>
      <line x1="72" y1="46" x2="72" y2="78" stroke="${dark}" stroke-width="1.5" opacity="0.5"/>
      <path d="M58,44 L102,44 Q108,44 108,50 L108,76 L58,76 Z" fill="url(#${gid})" stroke="${dark}" stroke-width="1"/>
      <rect x="64" y="48" width="20" height="15" rx="2" fill="#bfe6f5" stroke="${dark}" stroke-width="1"/>
      <line x1="74" y1="48" x2="74" y2="63" stroke="${dark}" stroke-width="1"/>
      <rect x="100" y="30" width="7" height="16" rx="2" fill="${dark}"/>
      <rect x="98" y="28" width="11" height="5" rx="1.5" fill="${dark}"/>
      <rect x="106" y="58" width="9" height="18" fill="${dark}"/>
      ${hydraulicSVG(58, 52, 24, 74, 3.6)}
      ${hydraulicSVG(30, 78, 16, 68, 2.8)}
      <path d="M58,66 L20,80 L20,90 L58,80 Z" fill="${steel}" stroke="${shadeColor(steel, -20)}" stroke-width="1"/>
      <path d="M4,78 Q0,78 0,84 L0,92 Q0,98 8,98 L22,92 L18,78 Z" fill="${steel}"/>
      <path d="M2,92 L4,98 L8,98 L7,91 Z" fill="#8a939b"/>
      <path d="M8,90 L10,97 L14,96 L12,89 Z" fill="#8a939b"/>
      <path d="M14,87 L17,95 L21,93 L18,86 Z" fill="#8a939b"/>
      ${tireSVG(40, 90, 18, gid)}
      ${tireSVG(102, 90, 18, gid)}
    `;
  }
};

/* Boîte de vue (viewBox) ajustée au plus près du contenu réel de chaque
   machine, pour éliminer les grandes zones vides du dessin d'origine
   (viewBox générique 0 0 160 100). Ceci corrige à la fois le centrage
   (le contenu remplit maintenant tout le cadre) et l'impression de
   grossissement (moins d'espace mort = la machine paraît plus grande
   à taille égale). */
const VEHICLE_VIEWBOX = {
  camion:    { x: 0,  y: 20, w: 132, h: 84 },
  pelle:     { x: 6,  y: 18, w: 152, h: 84 },
  bouteur:   { x: 4,  y: 26, w: 112, h: 76 },
  chargeuse: { x: -2, y: 24, w: 124, h: 86 }
};

/* height = hauteur cible en pixels. La largeur est déduite automatiquement
   du ratio propre à chaque machine pour ne jamais déformer le dessin. */
function vehicleSVG(vehicleId, colorId, height) {
  const accent = colorHex(colorId);
  const draw = VEHICLE_DRAWERS[vehicleId] || VEHICLE_DRAWERS.camion;
  const gid = `vgrad_${vehicleId}_${colorId}`;
  const vb = VEHICLE_VIEWBOX[vehicleId] || VEHICLE_VIEWBOX.camion;
  const width = Math.round(height * vb.w / vb.h);
  return `<svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${draw(accent, gid)}</svg>`;
}

/* Hauteur affichée (en pixels) selon le XP actuel — grandit progressivement
   de minHeight à maxHeight, en utilisant presque toute la hauteur du cadre
   (.vehicle-frame) une fois l'XP maximal atteint. */
function vehicleHeight(xp) {
  const g = VEHICLE_GROWTH;
  const ratio = Math.max(0, Math.min(1, xp / g.maxXP));
  return Math.round(g.minHeight + ratio * (g.maxHeight - g.minHeight));
}

/* ------------------ Illustrations de cabine (questions avec image) ------------------
   cabinSVG() dessine une cabine schématique pour une machine donnée, avec ses 4
   commandes numérotées (voir CABIN_CONTROLS dans data.js). Les mêmes coordonnées
   cx/cy servent aussi à positionner les zones cliquables des questions "hotspot"
   (voir hotspotOverlay ci-dessous), donc l'image et les zones restent alignées. */
function cabinControlShape(c) {
  switch (c.kind) {
    case "joystick":
      return `<rect x="${c.cx - 5}" y="${c.cy - 26}" width="10" height="26" rx="4" fill="#555a5f"/>
              <circle cx="${c.cx}" cy="${c.cy - 28}" r="8" fill="#20242a"/>`;
    case "lever":
      return `<g transform="rotate(18 ${c.cx} ${c.cy})">
                <rect x="${c.cx - 4}" y="${c.cy - 28}" width="8" height="28" rx="4" fill="#555a5f"/>
                <circle cx="${c.cx}" cy="${c.cy - 30}" r="7" fill="#c0392b"/>
              </g>`;
    case "pedal":
      return `<rect x="${c.cx - 14}" y="${c.cy - 4}" width="28" height="26" rx="4" fill="#2f333a"/>`;
    case "wheel":
      return `<circle cx="${c.cx}" cy="${c.cy}" r="21" fill="none" stroke="#20242a" stroke-width="6"/>
              <circle cx="${c.cx}" cy="${c.cy}" r="4" fill="#20242a"/>`;
    case "switch":
      return `<rect x="${c.cx - 8}" y="${c.cy - 10}" width="16" height="20" rx="3" fill="#3a3f44"/>
              <circle cx="${c.cx}" cy="${c.cy - 10}" r="3" fill="#f7b500"/>`;
    case "button":
    default:
      return `<circle cx="${c.cx}" cy="${c.cy}" r="8" fill="#e13c3c" stroke="#7a1f1f" stroke-width="1.5"/>`;
  }
}

function cabinNumberBadge(c) {
  const bx = c.cx + 18, by = c.cy - 18;
  return `<line x1="${c.cx + 6}" y1="${c.cy - 6}" x2="${bx - 5}" y2="${by + 5}" stroke="#1c2126" stroke-width="1"/>
          <circle cx="${bx}" cy="${by}" r="9" fill="#f7b500" stroke="#1c2126" stroke-width="1.2"/>
          <text x="${bx}" y="${by + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#1c2126">${c.num}</text>`;
}

function cabinWindshieldHint(machineId) {
  switch (machineId) {
    case "pelle":
      return `<line x1="70" y1="88" x2="185" y2="38" stroke="#8a8f94" stroke-width="7" stroke-linecap="round"/>
              <rect x="176" y="28" width="24" height="17" rx="3" fill="#8a8f94"/>`;
    case "bouteur":
      return `<rect x="55" y="92" width="150" height="20" rx="3" fill="#8a8f94"/>`;
    case "chargeuse":
      return `<rect x="88" y="50" width="20" height="58" fill="#8a8f94"/>
              <rect x="68" y="40" width="60" height="16" rx="3" fill="#8a8f94"/>`;
    case "niveleuse":
      return `<rect x="45" y="103" width="230" height="11" rx="3" fill="#8a8f94"/>`;
    default:
      return "";
  }
}

function cabinSVG(machineId) {
  const controls = CABIN_CONTROLS[machineId] || [];
  const shapes = controls.map(cabinControlShape).join("");
  const badges = controls.map(cabinNumberBadge).join("");
  return `<svg viewBox="0 0 360 220" class="cabin-svg" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="360" height="220" rx="12" fill="#cfd6db"/>
    <rect x="20" y="15" width="320" height="108" rx="8" fill="#bcd6e8"/>
    ${cabinWindshieldHint(machineId)}
    <rect x="10" y="128" width="340" height="30" rx="4" fill="#3a3f44"/>
    <circle cx="58" cy="143" r="13" fill="#20242a" stroke="#6c7378" stroke-width="2"/>
    <line x1="58" y1="143" x2="64" y2="134" stroke="#f7b500" stroke-width="2"/>
    <circle cx="92" cy="143" r="5" fill="#3bb54a"/>
    <circle cx="108" cy="143" r="5" fill="#f7b500"/>
    <circle cx="124" cy="143" r="5" fill="#e13c3c"/>
    ${shapes}
    ${badges}
  </svg>`;
}

/* Zones cliquables superposées à l'image pour les questions "hotspot".
   Positionnées en % (relatif au viewBox 360x220) pour rester alignées
   quelle que soit la taille d'affichage. */
function hotspotOverlay(options, selected) {
  return `<div class="cabin-hotspots">
    ${options.map((op, i) => `
      <button class="hotspot-dot ${selected === i ? 'selected' : ''}"
        style="left:${(op.cx / 360 * 100).toFixed(2)}%; top:${(op.cy / 220 * 100).toFixed(2)}%;"
        onclick="selectChoice(${i})" aria-label="${state.lang === 'fr' ? op.fr : op.en}"></button>`).join("")}
  </div>`;
}

/* ------------------ Rendu ------------------ */

const root = document.getElementById("app");

function render() {
  if (!isAccessGranted()) {
    renderAccessGate();
    document.documentElement.lang = state.lang;
    return;
  }
  if (!state.welcomeSeen) {
    renderWelcome();
    document.documentElement.lang = state.lang;
    return;
  }
  recordLogin();
  if (!state.name) {
    renderOnboarding();
  } else if (currentQuest && currentQuest.__showIntro) {
    renderQuestIntro();
  } else if (currentQuest) {
    renderQuiz();
  } else {
    renderMap();
  }
  document.documentElement.lang = state.lang;
}

function header(activeTab) {
  const lvl = getLevel();
  const lvlName = state.lang === "fr" ? lvl.name_fr : lvl.name_en;
  return `
  <div class="topbar">
    <div class="brand">
      <span class="avatar-chip">${avatarSVG(state.avatarChar, state.avatarColor, lvl.avatarStage, 42)}</span>
      <div>
        <div class="brand-name">${state.name || ""}</div>
        <div class="brand-level">${lvlName} · ${state.xp} ${t("xp")}</div>
      </div>
    </div>
    <div class="topbar-actions">
      <button class="lang-btn" onclick="toggleLang()">${t("switchLang")}</button>
      <button class="reset-btn" onclick="resetProgress()" title="${t('resetProgress')}">🔄</button>
    </div>
  </div>
  <nav class="tabs">
    <button class="${activeTab==='map'?'active':''}" onclick="goMap()">🗺️ ${t("map")}</button>
    <button class="${activeTab==='badges'?'active':''}" onclick="goBadges()">🎖️ ${t("badges")}</button>
    <button class="${activeTab==='trophies'?'active':''}" onclick="goTrophies()">🏆 ${t("trophies")}</button>
    <button class="${activeTab==='leaderboard'?'active':''}" onclick="goLeaderboard()">📊 ${t("leaderboard")}</button>
  </nav>`;
}

function progressPct() {
  return Math.round((state.badges.length / COMPETENCIES.length) * 100);
}

/* ------------------ Essai gratuit de 7 jours + code d'accès (local) ------------------ */

const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // essai gratuit de 7 jours
const ACCESS_CODE = "CHANTIER-2026"; // code fourni au centre de formation après achat de la licence

function isAccessGranted() {
  if (state.accessCode && state.accessCode.trim().toUpperCase() === ACCESS_CODE) return true;
  if (!state.firstLaunchDate) return true; // sécurité : ne jamais bloquer si la date est absente
  return (Date.now() - state.firstLaunchDate) < TRIAL_DURATION_MS;
}

function renderAccessGate() {
  const trialOver = state.firstLaunchDate && (Date.now() - state.firstLaunchDate) >= TRIAL_DURATION_MS;
  root.innerHTML = `
  <div class="onboarding access-gate">
    <div class="lang-toggle-top">
      <button onclick="toggleLang()">${state.lang === 'fr' ? 'English' : 'Français'}</button>
    </div>
    <h1>🏗️ ${UI_TEXT[state.lang].appName}</h1>
    <label class="field-label">${t("accessCodeTitle")}</label>
    <p class="tagline">${trialOver ? t("accessCodeTrialOver") : t("accessCodePrompt")}</p>
    <input id="accessCodeInput" type="text" autocapitalize="characters" maxlength="30"
      placeholder="${t('accessCodePlaceholder')}" value="${draftAccessCode}"
      oninput="draftAccessCode=this.value" onkeydown="if(event.key==='Enter')submitAccessCode()" />
    <button class="cta" onclick="submitAccessCode()">${t("accessCodeSubmit")}</button>
    ${accessCodeStatus === "invalid" ? `<p class="access-error">${t("accessCodeInvalid")}</p>` : ""}
  </div>`;
}

function submitAccessCode() {
  const code = (draftAccessCode || "").trim();
  if (!code) return;
  if (code.toUpperCase() === ACCESS_CODE) {
    state.accessCode = code;
    accessCodeStatus = null;
    saveState();
    render();
  } else {
    accessCodeStatus = "invalid";
    render();
  }
}

function renderWelcome() {
  const steps = UI_TEXT[state.lang].welcomeSteps || [];
  root.innerHTML = `
  <div class="onboarding welcome-screen">
    <div class="lang-toggle-top">
      <button onclick="toggleLang()">${state.lang === 'fr' ? 'English' : 'Français'}</button>
    </div>
    <h1>🏗️ ${UI_TEXT[state.lang].appName}</h1>
    <p class="tagline">${t("welcomeHeading")}</p>
    <p class="welcome-intro">${t("welcomeIntro")}</p>
    <div class="welcome-list">
      ${steps.map(s => `
        <div class="welcome-item">
          <span class="welcome-icon">${s.icon}</span>
          <div class="welcome-item-text">
            <div class="welcome-item-title">${s.title}</div>
            <div class="welcome-item-desc">${s.text}</div>
          </div>
        </div>`).join("")}
    </div>
    <button class="cta" onclick="completeWelcome()">${t("start")}</button>
  </div>`;
}

function completeWelcome() {
  state.welcomeSeen = true;
  saveState();
  render();
}

function renderOnboarding() {
  root.innerHTML = `
  <div class="onboarding">
    <div class="lang-toggle-top">
      <button onclick="toggleLang()">${state.lang === 'fr' ? 'English' : 'Français'}</button>
    </div>
    <h1>🏗️ ${UI_TEXT[state.lang].appName}</h1>
    <p class="tagline">${t("tagline")}</p>
    <p class="program-title">${PROGRAM[state.lang].title} — ${PROGRAM[state.lang].subtitle}</p>

    <label class="field-label">${t("yourName")}</label>
    <input id="nameInput" type="text" maxlength="20" placeholder="${t('yourName')}" value="${draftName}" oninput="draftName=this.value" />

    <label class="field-label">${t("chooseAvatar")}</label>
    <div class="avatar-char-grid">
      ${AVATAR_CHARACTERS.map(c => `
        <button class="avatar-char-btn ${state.avatarChar===c.id?'selected':''}" onclick="selectAvatarChar('${c.id}')">
          ${avatarSVG(c.id, state.avatarColor, 0, 56)}
          <span>${state.lang==='fr'?c.name_fr:c.name_en}</span>
        </button>
      `).join("")}
    </div>

    <div class="color-picker">
      ${AVATAR_COLORS.map(c => `
        <button class="color-swatch ${state.avatarColor===c.id?'selected':''}" style="background:${c.hex}"
          onclick="selectAvatarColor('${c.id}')" title="${state.lang==='fr'?c.name_fr:c.name_en}"></button>
      `).join("")}
    </div>

    <label class="field-label">${t("chooseVehicle")}</label>
    <div class="vehicle-grid">
      ${VEHICLE_TYPES.map(v => `
        <button class="vehicle-btn ${state.vehicle===v.id?'selected':''}" onclick="selectVehicle('${v.id}')">
          ${vehicleSVG(v.id, state.avatarColor, 42)}
          <span>${state.lang==='fr'?v.name_fr:v.name_en}</span>
        </button>
      `).join("")}
    </div>

    <button class="cta" onclick="startGame()">${t("start")}</button>
  </div>`;
}

function selectAvatarChar(id) {
  state.avatarChar = id;
  render();
}
function selectAvatarColor(id) {
  state.avatarColor = id;
  render();
}
function selectVehicle(id) {
  state.vehicle = id;
  render();
}

function toggleLang() {
  state.lang = state.lang === "fr" ? "en" : "fr";
  saveState();
  render();
}

function startGame() {
  const val = (document.getElementById("nameInput").value || draftName).trim();
  if (!val) return;
  state.name = val;
  state.createdAt = state.createdAt || new Date().toISOString();
  saveState();
  render();
}

function renderMap() {
  const newTrophies = checkTrophies();
  const vh = vehicleHeight(state.xp);
  const vType = VEHICLE_TYPES.find(v => v.id === state.vehicle) || VEHICLE_TYPES[0];
  const vName = state.lang === "fr" ? vType.name_fr : vType.name_en;
  const maxed = state.xp >= VEHICLE_GROWTH.maxXP;

  root.innerHTML = header("map") + `
    <div class="content">
      <div class="vehicle-showcase">
        <div class="vehicle-frame">${vehicleSVG(state.vehicle, state.avatarColor, vh)}</div>
        <div class="vehicle-caption">${vName} · ${maxed ? t("maxSize") : t("vehicleGrows")}</div>
      </div>
      <div class="progress-banner">
        <div class="progress-bar"><div class="progress-fill" style="width:${progressPct()}%"></div></div>
        <div class="progress-label">${progressPct()}% — ${state.badges.length}/${COMPETENCIES.length} ${t("masteredLabel")}</div>
      </div>
      <div class="quest-path">
        ${COMPETENCIES.map((c) => questNode(c)).join("")}
      </div>
    </div>
    ${newTrophies.length ? trophyToast(newTrophies[0]) : ""}
  `;
}

/* La compétence est déverrouillée si c'est la première, ou si le palier 1
   (Débutant) de la compétence précédente a été réussi. */
function isUnlocked(comp) {
  if (comp.order === 1) return true;
  const prev = COMPETENCIES.find(c => c.order === comp.order - 1);
  return prev && !!state.completed[tierKey(prev.id, 1)];
}

/* Le palier 1 est déverrouillé si la compétence l'est; les paliers 2 et 3
   se déverrouillent l'un après l'autre en réussissant le précédent. */
function isTierUnlocked(comp, level) {
  if (level === 1) return isUnlocked(comp);
  return !!state.completed[tierKey(comp.id, level - 1)];
}

function questNode(c) {
  const unlocked = isUnlocked(c);
  const title = state.lang === "fr" ? c.title_fr : c.title_en;
  const mastered = state.badges.includes(c.id);
  let cls = "quest-node";
  if (mastered) cls += " done";
  else if (!unlocked) cls += " locked";
  const tierPills = TIER_META.map(tm => {
    const tierDone = state.completed[tierKey(c.id, tm.level)];
    const tierUnlocked = isTierUnlocked(c, tm.level);
    const tName = state.lang === "fr" ? tm.name_fr : tm.name_en;
    let pcls = "tier-pill";
    if (tierDone) pcls += " done";
    else if (!tierUnlocked) pcls += " locked";
    return `<button class="${pcls}" ${tierUnlocked ? `onclick="event.stopPropagation();openQuest('${c.id}',${tm.level})"` : "disabled"}>
      <span class="tier-pill-icon">${tierDone ? "✅" : (tierUnlocked ? tm.icon : "🔒")}</span>
      <span class="tier-pill-name">${tName}</span>
      ${tierDone ? `<span class="tier-pill-score">${tierDone.best}%</span>` : ""}
    </button>`;
  }).join("");
  return `
    <div class="${cls}">
      <div class="quest-node-main" onclick="${unlocked ? `openQuest('${c.id}',1)` : ''}">
        <div class="quest-icon">${unlocked ? c.icon : "🔒"}</div>
        <div class="quest-body">
          <div class="quest-num">${c.order}. ${c.code}</div>
          <div class="quest-title">${title}${mastered ? " 🏆" : ""}</div>
          <div class="quest-meta">${c.hours} ${t("hours")}</div>
        </div>
      </div>
      ${unlocked ? `<div class="tier-row">${tierPills}</div>` : ""}
    </div>`;
}

function openQuest(id, level) {
  currentQuest = COMPETENCIES.find(c => c.id === id);
  currentTierLevel = level || 1;
  currentQuest.__showIntro = true;
  quizAnswers = [];
  quizShuffled = [];
  quizMatchState = [];
  quizIndex = 0;
  render();
}

function currentTier() {
  return currentQuest.tiers[currentTierLevel - 1];
}

function renderQuestIntro() {
  const c = currentQuest;
  const tier = currentTier();
  const tm = TIER_META[currentTierLevel - 1];
  const tierName = state.lang === "fr" ? tm.name_fr : tm.name_en;
  const title = state.lang === "fr" ? c.title_fr : c.title_en;
  const done = state.completed[tierKey(c.id, currentTierLevel)];
  root.innerHTML = header("map") + `
    <div class="content quest-intro">
      <div class="quest-intro-icon">${c.icon}</div>
      <div class="quest-intro-tier">${tm.icon} ${t("tierLabel")} ${currentTierLevel} — ${tierName}</div>
      <h2>${title}</h2>
      <p class="quest-code">${c.code} · ${c.hours} ${t("hours")}</p>
      <p>${tier.questions.length} ${t("question").toLowerCase()}s</p>
      ${done ? `<p class="best-score">${t("score")}: ${done.best}%</p>` : ""}
      <button class="cta" onclick="beginQuiz()">${done ? t("retryQuest") : t("startQuest")}</button>
      <button class="secondary" onclick="goMap()">${t("backToMap")}</button>
    </div>`;
}

/* Construit les options affichées pour une question, mélangées.
   MCQ / mise en situation: on mélange q.choices. Vrai/Faux: on construit
   2 options (Vrai/Faux) à partir de q.isTrue, dans le même format
   {fr,en,correct} pour réutiliser la même logique d'affichage/score.
   Association de termes ("match"): pas d'options à mélanger ici — voir
   initMatchState(), qui gère son propre état interactif. */
function buildOptions(q) {
  if (q.type === "tf") {
    return shuffleArray([
      { fr: UI_TEXT.fr.trueLabel, en: UI_TEXT.en.trueLabel, correct: q.isTrue === true },
      { fr: UI_TEXT.fr.falseLabel, en: UI_TEXT.en.falseLabel, correct: q.isTrue === false }
    ]);
  }
  if (q.type === "hotspot") {
    /* Zones fixes correspondant aux commandes réelles de l'image — on ne
       mélange pas l'ordre (les positions cx/cy doivent rester exactes),
       mais l'affichage sous forme de liste utilise déjà l'ordre naturel. */
    const controls = CABIN_CONTROLS[q.machine] || [];
    return controls.map(cctrl => ({
      fr: cctrl.label_fr, en: cctrl.label_en,
      correct: cctrl.num === q.correctNum,
      cx: cctrl.cx, cy: cctrl.cy, num: cctrl.num
    }));
  }
  if (q.type === "match") return null;
  return shuffleArray(q.choices);
}

/* État interactif d'une question d'association: termOrder/defOrder sont
   les positions mélangées (indices vers q.pairs) des deux colonnes;
   matched contient les indices de paires déjà résolues correctement. */
function initMatchState(q) {
  const idx = q.pairs.map((_, i) => i);
  return {
    termOrder: shuffleArray(idx),
    defOrder: shuffleArray(idx),
    matched: [],
    selectedTermPos: null,
    wrong: null
  };
}

function beginQuiz() {
  currentQuest.__showIntro = false;
  const questions = currentTier().questions;
  quizShuffled = questions.map(q => buildOptions(q));
  quizMatchState = questions.map(q => q.type === "match" ? initMatchState(q) : null);
  quizAnswers = new Array(questions.length).fill(null);
  quizIndex = 0;
  render();
}

/* Zones cliquables d'une question d'association: deux colonnes de
   boutons (termes / définitions) construites à partir de matchState. */
function matchHTML(q, ms) {
  const n = q.pairs.length;
  const terms = ms.termOrder.map((pairIdx, pos) => {
    const p = q.pairs[pairIdx];
    const isMatched = ms.matched.includes(pairIdx);
    const isSelected = ms.selectedTermPos === pos;
    const isWrong = ms.wrong && ms.wrong.term === pos;
    let cls = "match-btn match-term";
    if (isMatched) cls += " matched";
    else if (isSelected) cls += " selected";
    if (isWrong) cls += " wrong";
    return `<button class="${cls}" ${isMatched ? "disabled" : `onclick="matchSelectTerm(${pos})"`}>
      ${state.lang === "fr" ? p.term_fr : p.term_en}
    </button>`;
  }).join("");
  const defs = ms.defOrder.map((pairIdx, pos) => {
    const p = q.pairs[pairIdx];
    const isMatched = ms.matched.includes(pairIdx);
    const isWrong = ms.wrong && ms.wrong.def === pos;
    let cls = "match-btn match-def";
    if (isMatched) cls += " matched";
    if (isWrong) cls += " wrong";
    return `<button class="${cls}" ${isMatched ? "disabled" : `onclick="matchSelectDef(${pos})"`}>
      ${state.lang === "fr" ? p.def_fr : p.def_en}
    </button>`;
  }).join("");
  return `
    <p class="match-prompt">${t("matchPrompt")}</p>
    <div class="match-columns">
      <div class="match-col">${terms}</div>
      <div class="match-col">${defs}</div>
    </div>`;
}

function matchSelectTerm(pos) {
  const ms = quizMatchState[quizIndex];
  if (!ms) return;
  ms.selectedTermPos = pos;
  ms.wrong = null;
  render();
}

function matchSelectDef(pos) {
  const ms = quizMatchState[quizIndex];
  const q = currentTier().questions[quizIndex];
  if (!ms || ms.selectedTermPos === null) return;
  const termPairIdx = ms.termOrder[ms.selectedTermPos];
  const defPairIdx = ms.defOrder[pos];
  if (termPairIdx === defPairIdx) {
    ms.matched.push(termPairIdx);
    ms.selectedTermPos = null;
    if (ms.matched.length === q.pairs.length) {
      state.matchesCompleted = (state.matchesCompleted || 0) + 1;
      saveState();
    }
    render();
  } else {
    ms.wrong = { term: ms.selectedTermPos, def: pos };
    render();
    setTimeout(() => {
      ms.wrong = null;
      ms.selectedTermPos = null;
      render();
    }, 550);
  }
}

function renderQuiz() {
  const tier = currentTier();
  const questions = tier.questions;
  const q = questions[quizIndex];
  const qText = state.lang === "fr" ? q.fr : q.en;
  const choices = quizShuffled[quizIndex];
  const isTF = q.type === "tf";
  const isHotspot = q.type === "hotspot";
  const isMatch = q.type === "match";
  const isScenario = q.type === "scenario";
  const ms = quizMatchState[quizIndex];
  const matchComplete = isMatch && ms && ms.matched.length === q.pairs.length;
  const selected = isMatch ? (matchComplete ? true : null) : quizAnswers[quizIndex];

  const imageHTML = q.machine
    ? `<div class="cabin-wrap">${cabinSVG(q.machine)}${isHotspot ? hotspotOverlay(choices, quizAnswers[quizIndex]) : ""}</div>`
    : "";

  const scenarioBadge = isScenario ? `<div class="scenario-badge">📋 ${t("scenarioLabel")}</div>` : "";

  const choicesHTML = isMatch
    ? matchHTML(q, ms)
    : isHotspot
    ? `<div class="choices hotspot-legend">
        ${choices.map((ch, i) => `
          <button class="choice-btn ${quizAnswers[quizIndex] === i ? 'selected' : ''}" onclick="selectChoice(${i})">
            ${ch.num}. ${state.lang === 'fr' ? ch.fr : ch.en}
          </button>`).join("")}
      </div>`
    : isTF
    ? `<div class="tf-choices">
        ${choices.map((ch, i) => `
          <button class="tf-btn ${quizAnswers[quizIndex] === i ? 'selected' : ''}" onclick="selectChoice(${i})">
            ${(state.lang === 'fr' ? ch.fr : ch.en) === UI_TEXT[state.lang].trueLabel ? '✅' : '❌'}
            ${state.lang === 'fr' ? ch.fr : ch.en}
          </button>`).join("")}
      </div>`
    : `<div class="choices">
        ${choices.map((ch, i) => `
          <button class="choice-btn ${quizAnswers[quizIndex] === i ? 'selected' : ''}" onclick="selectChoice(${i})">
            ${String.fromCharCode(65 + i)}. ${state.lang === 'fr' ? ch.fr : ch.en}
          </button>`).join("")}
      </div>`;

  root.innerHTML = header("map") + `
    <div class="content quiz">
      <div class="quiz-progress">${t("question")} ${quizIndex + 1} ${t("of")} ${questions.length}${isTF ? ` · ${t("tfPrompt")}` : ""}</div>
      ${scenarioBadge}
      <h3 class="quiz-question">${qText}</h3>
      ${imageHTML}
      ${choicesHTML}
      <div class="quiz-nav">
        ${quizIndex > 0 ? `<button class="secondary" onclick="prevQ()">←</button>` : "<span></span>"}
        ${quizIndex < questions.length - 1
          ? `<button class="cta" ${selected===null?'disabled':''} onclick="nextQ()">${t("next")}</button>`
          : `<button class="cta" ${selected===null?'disabled':''} onclick="finishQuiz()">${t("finish")}</button>`}
      </div>
    </div>`;
}

function selectChoice(i) {
  quizAnswers[quizIndex] = i;
  render();
}
function nextQ() { quizIndex++; render(); }
function prevQ() { quizIndex--; render(); }

/* Génère une pluie de confettis en CSS pur (aucune dépendance externe)
   pour célébrer la réussite d'un palier. */
function confettiHTML(count) {
  const colors = ["#f7b500", "#ff7a1a", "#3bb54a", "#2a7de1", "#e13c3c", "#ffffff"];
  let pieces = "";
  for (let i = 0; i < count; i++) {
    const left = (Math.random() * 100).toFixed(1);
    const delay = (Math.random() * 0.35).toFixed(2);
    const dur = (1.5 + Math.random() * 1.1).toFixed(2);
    const rot = Math.round(Math.random() * 360);
    const color = colors[i % colors.length];
    pieces += `<span class="confetti-piece" style="left:${left}%; animation-delay:${delay}s; animation-duration:${dur}s; background:${color}; transform:rotate(${rot}deg);"></span>`;
  }
  return `<div class="confetti-burst">${pieces}</div>`;
}

function finishQuiz() {
  const c = currentQuest;
  const level = currentTierLevel;
  const tier = currentTier();
  const questions = tier.questions;
  let correct = 0;
  questions.forEach((q, i) => {
    if (q.type === "match") {
      const ms = quizMatchState[i];
      if (ms && ms.matched.length === q.pairs.length) correct++;
    } else {
      const chosen = quizShuffled[i][quizAnswers[i]];
      if (chosen && chosen.correct) correct++;
    }
  });
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= 70;
  /* Les paliers plus difficiles rapportent davantage de XP. */
  const tierMultiplier = [1, 1.3, 1.6][level - 1] || 1;
  const xpGained = Math.round((correct * 10 + (passed ? 50 : 0) + (score === 100 ? 25 : 0)) * tierMultiplier);

  const key = tierKey(c.id, level);
  const prevBest = state.completed[key] ? state.completed[key].best : 0;
  let isNewMastery = false;
  if (passed) {
    state.completed[key] = {
      score,
      best: Math.max(score, prevBest),
      attempts: (state.completed[key] ? state.completed[key].attempts : 0) + 1
    };
    if (level === 3 && !state.badges.includes(c.id)) {
      state.badges.push(c.id);
      isNewMastery = true;
    }
  }
  state.xp += xpGained;
  saveState();

  root.innerHTML = header("map") + `
    <div class="content quest-result">
      ${passed ? confettiHTML(isNewMastery ? 46 : 26) : ""}
      <div class="result-icon ${passed ? 'celebrate' : ''}">${passed ? "🎉" : "😕"}</div>
      <h2>${t("questResult")}</h2>
      <p class="result-score">${t("score")}: ${score}% (${correct}/${questions.length})</p>
      <p class="result-xp">+${xpGained} XP</p>
      <p class="${passed ? 'result-pass' : 'result-fail'}">${passed ? t("passed") : t("failed")}</p>
      ${isNewMastery ? `<p class="result-mastery">🏆 ${t("masteryUnlocked")}</p>` : ""}
      <button class="cta" onclick="goMap()">${t("backToMap")}</button>
    </div>`;
  currentQuest = null;
  currentTierLevel = null;
}

function goMap() { currentQuest = null; currentTierLevel = null; render(); }

function renderBadges() {
  root.innerHTML = header("badges") + `
    <div class="content">
      <div class="grid">
        ${COMPETENCIES.map(c => {
          const earned = state.badges.includes(c.id);
          const title = state.lang === "fr" ? c.title_fr : c.title_en;
          return `<div class="badge-card ${earned ? 'earned' : 'locked'}">
            <div class="badge-icon">${earned ? c.icon : "❔"}</div>
            <div class="badge-title">${title}</div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
}
function goBadges() { currentQuest = null; renderBadges(); }

function renderTrophies() {
  root.innerHTML = header("trophies") + `
    <div class="content">
      <div class="grid">
        ${TROPHIES.map(tr => {
          const earned = state.trophies.includes(tr.id);
          const name = state.lang === "fr" ? tr.name_fr : tr.name_en;
          const desc = state.lang === "fr" ? tr.desc_fr : tr.desc_en;
          return `<div class="badge-card ${earned ? 'earned' : 'locked'}">
            <div class="badge-icon">${earned ? tr.icon : "❔"}</div>
            <div class="badge-title">${name}</div>
            <div class="badge-desc">${desc}</div>
          </div>`;
        }).join("")}
      </div>
      <button class="secondary danger" onclick="resetProgress()">${t("resetProgress")}</button>
    </div>`;
}
function goTrophies() { currentQuest = null; renderTrophies(); }

function renderLeaderboard() {
  const lvl = getLevel();
  const playerEntry = {
    name: state.name || t("you"),
    xp: state.xp,
    avatarChar: state.avatarChar,
    avatarColor: state.avatarColor,
    isYou: true
  };
  const all = LEADERBOARD_SEED.map(p => Object.assign({}, p, { isYou: false })).concat([playerEntry]);
  all.sort((a, b) => b.xp - a.xp);

  const medals = ["🥇", "🥈", "🥉"];

  root.innerHTML = header("leaderboard") + `
    <div class="content">
      <div class="leaderboard-list">
        ${all.map((p, i) => {
          const rowLvl = LEVELS.slice().reverse().find(l => p.xp >= l.min) || LEVELS[0];
          return `<div class="leaderboard-row ${p.isYou ? 'you' : ''}">
            <div class="lb-rank">${i < 3 ? medals[i] : (i + 1)}</div>
            <span class="lb-avatar">${avatarSVG(p.avatarChar, p.avatarColor, rowLvl.avatarStage, 36)}</span>
            <div class="lb-name">${p.name}${p.isYou ? ` <span class="lb-you-tag">(${t("you")})</span>` : ""}</div>
            <div class="lb-xp">${p.xp} XP</div>
          </div>`;
        }).join("")}
      </div>
      <p class="leaderboard-note">${t("leaderboardNote")}</p>
    </div>`;
}
function goLeaderboard() { currentQuest = null; renderLeaderboard(); }

function trophyToast(tr) {
  const name = state.lang === "fr" ? tr.name_fr : tr.name_en;
  return `<div class="toast">${t("newTrophy")} ${tr.icon} ${name}</div>`;
}

function resetProgress() {
  if (confirm(t("confirmReset"))) {
    const keepFirstLaunchDate = state.firstLaunchDate;
    const keepAccessCode = state.accessCode;
    const keepWelcomeSeen = state.welcomeSeen;
    state = defaultState();
    // Le code d'accès autorise l'appareil, ce n'est pas une "progression de jeu" —
    // on ne force pas l'élève à le ressaisir juste parce qu'il réinitialise son avatar.
    state.firstLaunchDate = keepFirstLaunchDate;
    state.accessCode = keepAccessCode;
    // L'écran d'explication n'a pas besoin de revenir juste parce que l'élève
    // réinitialise son avatar/sa progression.
    state.welcomeSeen = keepWelcomeSeen;
    draftName = "";
    currentQuest = null;
    currentTierLevel = null;
    quizAnswers = [];
    quizShuffled = [];
    quizMatchState = [];
    quizIndex = 0;
    saveState();
    render();
  }
}

/* ------------------ Init ------------------ */
window.toggleLang = toggleLang;
window.selectAvatarChar = selectAvatarChar;
window.selectAvatarColor = selectAvatarColor;
window.selectVehicle = selectVehicle;
window.startGame = startGame;
window.openQuest = openQuest;
window.beginQuiz = beginQuiz;
window.selectChoice = selectChoice;
window.matchSelectTerm = matchSelectTerm;
window.matchSelectDef = matchSelectDef;
window.nextQ = nextQ;
window.prevQ = prevQ;
window.finishQuiz = finishQuiz;
window.goMap = goMap;
window.goBadges = goBadges;
window.goTrophies = goTrophies;
window.goLeaderboard = goLeaderboard;
window.resetProgress = resetProgress;
window.submitAccessCode = submitAccessCode;
window.completeWelcome = completeWelcome;

render();

/* PWA service worker */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
