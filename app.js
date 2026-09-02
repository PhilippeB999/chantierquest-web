/* ============================================================
   ChantierQuest — logique de jeu (gamification)
   ============================================================ */

const STORAGE_KEY = "chantierquest_state_v3";

/* ------------------ Totem d'atelier ------------------
   L'élève ne saisit jamais son vrai nom : l'app lui attribue un totem
   (animal + qualité), qu'il peut régénérer. Le genre de l'adjectif s'accorde
   avec celui de l'animal. Le totem reste en français — c'est un surnom. */
// emoji, nom FR, nom EN, genre. Chaque emoji montre bien l'animal nommé.
const TOTEM_NOUNS = [
  ["🦊","Renard","Fox","m"],["🦦","Loutre","Otter","f"],["🦫","Castor","Beaver","m"],
  ["🦉","Hibou","Owl","m"],["🦡","Blaireau","Badger","m"],["🐺","Loup","Wolf","m"],
  ["🦅","Aigle","Eagle","m"],["🐿️","Écureuil","Squirrel","m"],["🐗","Sanglier","Boar","m"],
  ["🦔","Hérisson","Hedgehog","m"],["🐻","Ours","Bear","m"],["🦌","Cerf","Stag","m"],
  ["🦆","Canard","Duck","m"],["🐇","Lièvre","Hare","m"],["🐢","Tortue","Turtle","f"],
  ["🐸","Grenouille","Frog","f"],["🐝","Abeille","Bee","f"],["🐜","Fourmi","Ant","f"]
];
// adjectif FR masculin, FR féminin, EN
const TOTEM_ADJ = [
  ["Vaillant","Vaillante","Valiant"],["Rusé","Rusée","Cunning"],["Débrouillard","Débrouillarde","Resourceful"],
  ["Malin","Maligne","Clever"],["Adroit","Adroite","Deft"],["Curieux","Curieuse","Curious"],
  ["Ingénieux","Ingénieuse","Ingenious"],["Tenace","Tenace","Tenacious"],["Habile","Habile","Skillful"],
  ["Vif","Vive","Quick"],["Futé","Futée","Sharp"],["Astucieux","Astucieuse","Astute"],
  ["Persévérant","Persévérante","Persistent"],["Audacieux","Audacieuse","Bold"],["Minutieux","Minutieuse","Meticulous"],
  ["Agile","Agile","Agile"],["Bricoleur","Bricoleuse","Handy"],["Éveillé","Éveillée","Bright"],
  ["Appliqué","Appliquée","Diligent"],["Costaud","Costaude","Sturdy"]
];
function genTotem() {
  const n = TOTEM_NOUNS[Math.floor(Math.random() * TOTEM_NOUNS.length)];
  const a = TOTEM_ADJ[Math.floor(Math.random() * TOTEM_ADJ.length)];
  return { emoji: n[0], nounFr: n[1], nounEn: n[2], adjFr: n[3] === "f" ? a[1] : a[0], adjEn: a[2] };
}
// Rendu du totem selon la langue : FR « Castor Minutieux », EN « Meticulous Beaver ».
function totemLabel(t, lang) {
  if (!t || !t.nounFr) return "";
  return lang === "en" ? `${t.adjEn} ${t.nounEn}` : `${t.nounFr} ${t.adjFr}`;
}

function defaultState() {
  return {
    firstLaunchDate: Date.now(), // début de l\'essai gratuit de 7 jours sur cet appareil
    accessCode: "",
    welcomeSeen: false, // écran d'explication du fonctionnement, montré une seule fois
    totem: null,        // objet { emoji, nounFr, nounEn, adjFr, adjEn } — attribué, jamais saisi
    classCode: "",      // code du centre de formation — rattache à une classe, ne déverrouille rien
    shared: false,      // l'élève a-t-il accepté de partager sa progression avec l'enseignant ?
    cfpNom: "",         // nom du CFP rattaché au code (rempli par info_classe) — affiché dans l'app
    cfpLogo: "",        // URL du logo du CFP si présent (nullable) ; sinon on n'affiche que le nom
    programme: "",      // programme de la classe (info_classe) — informatif
    lang: "fr",
    avatarChar: AVATAR_CHARACTERS[0].id,
    avatarColor: "jaune",
    vehicle: VEHICLE_TYPES[0].id,
    xp: 0,
    completed: {},        // { c01_1: { score: 80, best: 80, attempts: 2 }, c01_2: {...}, ... } — PALIERS RÉUSSIS uniquement (déverrouillage, badges)
    scores: {},           // { c01_1: 25, c01_2: 80, ... } — meilleur score de CHAQUE palier tenté (réussi OU raté) → sert à la synchro (pastille rouge côté enseignant)
    badges: [],           // competency ids earned (palier Avancé réussi = compétence maîtrisée)
    trophies: [],         // trophy ids earned
    loginDays: [],
    matchesCompleted: 0,  // compteur cumulatif de questions d'association réussies
    createdAt: null
  };
}

let state = loadState();
// Totem provisoire de l'écran de profil : repris de l'état s'il existe, sinon tiré au sort.
let draftTotem = (state.totem && state.totem.nounFr) ? state.totem : genTotem();
let draftAccessCode = "";
let accessCodeStatus = null; // null | "checking" | "invalid" | "offline" | "not-configured"
let draftPremiumCode = "";   // saisie du code dans la pop-up "Licence requise" (module verrouillé)
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
      // Ancien format : totem stocké en chaîne. On repart du choix de totem.
      if (typeof merged.totem === "string") merged.totem = null;
      // Les élèves qui avaient déjà un profil avant l'ajout de cet écran
      // n'ont pas à le voir apparaître après une mise à jour de l'app.
      if (parsed.welcomeSeen === undefined && parsed.name) {
        merged.welcomeSeen = true;
      }
      migrateToTiers(merged);
      migrateScores(merged);
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

/* Rétrocompatibilité: state.scores (meilleur score de CHAQUE palier tenté, réussi
   ou raté) a été ajouté après state.completed (paliers réussis seulement). Pour un
   élève existant, on amorce scores à partir de completed afin qu'il continue de
   synchroniser ses réussites déjà acquises sans avoir à rejouer. Les échecs,
   eux, n'existaient pas encore en mémoire : ils se rempliront au prochain quiz. */
function migrateScores(s) {
  if (!s.scores || typeof s.scores !== "object") s.scores = {};
  if (Object.keys(s.scores).length > 0) return;
  for (const key of Object.keys(s.completed || {})) {
    const v = s.completed[key] || {};
    const best = v.best != null ? v.best : (v.score || 0);
    s.scores[key] = best;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* Échappe le HTML pour toute valeur affichée qui ne vient pas d'une liste
   fixe codée en dur (nom/logo/programme de CFP, code de classe) — ces
   valeurs transitent par Supabase (info_classe) ou l'URL (?code=) et ne
   doivent jamais être insérées telles quelles dans un template innerHTML. */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* Le logo de CFP doit en plus être une vraie URL http(s) — sinon on
   l'ignore plutôt que de risquer un schéma javascript:/data: dans un src. */
function safeImageUrl(url) {
  try {
    const u = new URL(url, location.href);
    return (u.protocol === "https:" || u.protocol === "http:") ? u.href : "";
  } catch {
    return "";
  }
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
  if (!state.totem) {
    renderOnboarding();
  } else if (showClassJoin) {
    renderClassJoin();
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
        <div class="brand-name">${state.totem ? state.totem.emoji + " " + totemLabel(state.totem, state.lang) : ""}</div>
        <div class="brand-level">${state.shared && state.classCode
          ? `👥 ${escapeHtml(state.cfpNom || state.classCode)}`
          : `${lvlName} · ${state.xp} ${t("xp")}`}</div>
      </div>
    </div>
    <div class="topbar-actions">
      <button class="reset-btn" onclick="goClassJoin()" title="${state.lang==='fr'?'Ma classe':'My class'}">👥</button>
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
// Liste des codes de licence valides. Le premier est le code « maître » de l'app ;
// les suivants sont les codes clients (centres ayant acheté une licence).
const ACCESS_CODES = ["CHANTIER-2026-MGLG", "ESHORE-2026-UNEN"]; // client : Eastern Shore / ESSB
const ACCESS_CODE = ACCESS_CODES[0]; // code maître (rétrocompatibilité)

function isAccessGranted() {
  if (state.accessCode && ACCESS_CODES.includes(state.accessCode.trim().toUpperCase())) return true;
  if (!state.firstLaunchDate) return true; // sécurité : ne jamais bloquer si la date est absente
  return (Date.now() - state.firstLaunchDate) < TRIAL_DURATION_MS;
}

/* ------------------ Accès freemium (licence vs gratuit) ------------------
   Modèle d'affaires : sans licence (essai, démo, URL nue), l'usager accède
   aux FREE_COMPETENCIES premières compétences (tous les paliers). Les
   compétences suivantes (ordre > FREE_COMPETENCIES) restent VISIBLES mais
   verrouillées « premium ». La licence (accessCode === ACCESS_CODE) débloque
   tout. Ce verrou est INDÉPENDANT de l'essai de 7 jours : il ne dépend que
   de isLicensed(). */
const FREE_COMPETENCIES = 3; // nombre de compétences gratuites sans licence (ajustable)

function isLicensed() {
  return !!(state.accessCode && ACCESS_CODES.includes(state.accessCode.trim().toUpperCase()));
}

/* true = compétence bloquée faute de licence (visible mais non jouable). */
function isPremiumLocked(comp) {
  return !isLicensed() && comp.order > FREE_COMPETENCIES;
}

/* Appel à l'action bilingue, rendu via state.lang. */
function premiumLockText() {
  const T = {
    fr: {
      badge: "🔒 Licence requise",
      title: "Contenu réservé aux centres licenciés",
      body: `Les ${FREE_COMPETENCIES} premiers modules sont gratuits. Tu as un code d'accès ? Entre-le ci-dessous pour débloquer tout le programme.`,
      or: "ou",
      cta: "Nous écrire pour une licence",
      close: "Fermer"
    },
    en: {
      badge: "🔒 License required",
      title: "Reserved for licensed training centers",
      body: `The first ${FREE_COMPETENCIES} modules are free. Already have an access code? Enter it below to unlock the full program.`,
      or: "or",
      cta: "Contact us for a license",
      close: "Close"
    }
  };
  return T[state.lang] || T.fr;
}

/* Overlay non bloquant : montre le champ de code (+ solution de repli "nous
   écrire") sans quitter la carte. Ajouté à <body> (hors #app) pour survivre
   au prochain render(). */
function showPremiumLock() {
  const existing = document.getElementById("premiumLockOverlay");
  if (existing) existing.remove();
  const L = premiumLockText();
  draftPremiumCode = "";
  const el = document.createElement("div");
  el.id = "premiumLockOverlay";
  el.className = "premium-overlay";
  el.innerHTML = `
    <div class="premium-dialog" role="dialog" aria-modal="true">
      <div class="premium-badge">${L.badge}</div>
      <h2>${L.title}</h2>
      <p>${L.body}</p>
      <label class="field-label" style="text-align:center;">${t("accessCodeTitle")}</label>
      <input id="premiumCodeInput" class="access-code-input" type="text" autocapitalize="characters" maxlength="30"
        placeholder="${t('accessCodePlaceholder')}" value=""
        oninput="draftPremiumCode=this.value" onkeydown="if(event.key==='Enter')submitPremiumCode()" />
      <button class="cta" onclick="submitPremiumCode()">${t("accessCodeSubmit")}</button>
      <p id="premiumCodeError" class="access-error" style="display:none;">${t("accessCodeInvalid")}</p>
      <p class="premium-or">${L.or}</p>
      <a class="secondary" href="mailto:philippe.beaubien@gmail.com?subject=Licence%20Quest">${L.cta}</a>
      <button class="secondary" onclick="document.getElementById('premiumLockOverlay').remove()">${L.close}</button>
    </div>`;
  el.addEventListener("click", (ev) => { if (ev.target === el) el.remove(); });
  document.body.appendChild(el);
}

/* Valide le code saisi dans la pop-up "Licence requise". Succès : mêmes
   codes que la porte d'accès (ACCESS_CODES) ; débloque tout le programme
   immédiatement, sans passer par l'écran plein-page. */
function submitPremiumCode() {
  const code = (draftPremiumCode || "").trim();
  if (!code) return;
  if (ACCESS_CODES.includes(code.toUpperCase())) {
    state.accessCode = code;
    saveState();
    const overlay = document.getElementById("premiumLockOverlay");
    if (overlay) overlay.remove();
    draftPremiumCode = "";
    render();
  } else {
    const err = document.getElementById("premiumCodeError");
    if (err) err.style.display = "block";
  }
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
    <input id="accessCodeInput" class="access-code-input" type="text" autocapitalize="characters" maxlength="30"
      placeholder="${t('accessCodePlaceholder')}" value="${draftAccessCode}"
      oninput="draftAccessCode=this.value" onkeydown="if(event.key==='Enter')submitAccessCode()" />
    <button class="cta" onclick="submitAccessCode()">${t("accessCodeSubmit")}</button>
    ${accessCodeStatus === "invalid" ? `<p class="access-error">${t("accessCodeInvalid")}</p>` : ""}
  </div>`;
}

function submitAccessCode() {
  const code = (draftAccessCode || "").trim();
  if (!code) return;
  if (ACCESS_CODES.includes(code.toUpperCase())) {
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
    ${privacyFooter()}
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

    <label class="field-label">${state.lang === 'fr' ? "Ton totem d'atelier" : "Your workshop totem"}</label>
    <div class="totem-card">
      <div class="totem-emoji">${draftTotem.emoji}</div>
      <div class="totem-name">${state.lang === 'en'
        ? `<b>${draftTotem.adjEn}</b> ${draftTotem.nounEn}`
        : `${draftTotem.nounFr} <b>${draftTotem.adjFr}</b>`}</div>
      <div class="totem-hint">${state.lang === 'fr' ? "Ton surnom dans l'application. Personne ne connaît ton vrai nom." : "Your nickname in the app. No one knows your real name."}</div>
    </div>
    <button type="button" class="totem-reroll" onclick="regenTotem()">🎲 ${state.lang === 'fr' ? "M'en donner un autre" : "Give me another one"}</button>

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

function regenTotem() {
  draftTotem = genTotem();
  render();
}

/* ------------------ Rejoindre ma classe ------------------
   Le code rattache l'élève à sa cohorte ; il ne déverrouille rien.
   Le partage est un choix explicite : sans lui, rien n'est transmis. */
let showClassJoin = false;
let draftClassCode = "";
let draftShared = false;
let joinStatus = null; // null | "checking" | "invalid" — état de validation du code de classe

function goClassJoin() {
  draftClassCode = state.classCode || "";
  draftShared = state.shared || false;
  joinStatus = null;
  showClassJoin = true;
  render();
}
function closeClassJoin() {
  showClassJoin = false;
  render();
}
function toggleDraftShare() {
  draftShared = !draftShared;
  render();
}
function joinClass() {
  const code = (document.getElementById("classCodeInput").value || draftClassCode).trim().toUpperCase();
  // Partager sans code n'a pas de sens : on exige le code seulement si l'élève partage.
  if (draftShared && !code) { draftShared = false; render(); return; }
  // Aucun code : on détache proprement (retrait de la classe).
  if (!code) {
    state.classCode = ""; state.shared = false;
    state.cfpNom = ""; state.cfpLogo = ""; state.programme = "";
    joinStatus = null;
    saveState();
    closeClassJoin();
    return;
  }
  // On valide le code auprès du serveur avant de l'accepter (fini le code fantôme).
  draftClassCode = code;
  joinStatus = "checking";
  render();
  lookupClassInfo(code).then((info) => {
    if (info === "invalid") { joinStatus = "invalid"; render(); return; }
    // Valide, OU hors-ligne / échec réseau (info === null) : on accepte de façon optimiste.
    joinStatus = null;
    state.classCode = code;
    state.shared = draftShared && !!code;
    if (info && typeof info === "object") {
      state.cfpNom = info.nom || "";
      state.cfpLogo = info.logo_url || "";
      state.programme = info.programme || "";
    }
    saveState();
    if (state.shared) syncProgress();   // première remontée
    closeClassJoin();
  });
}

/* Interroge la fonction security-definer info_classe pour un code de classe.
   Retourne { nom, programme, logo_url } si le code existe, la chaîne "invalid" si
   le serveur ne connaît pas ce code, ou null en cas d'échec réseau / hors-ligne
   (dans ce cas l'app accepte le code de façon optimiste et le revalidera plus tard).
   N'expose aucune donnée d'élève — la fonction ne renvoie que nom + programme + logo. */
async function lookupClassInfo(code) {
  if (!navigator.onLine) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/info_classe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      body: JSON.stringify({ p_code: code })
    });
    if (!res.ok) return null;                    // erreur serveur : on reste optimiste
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.nom) return "invalid";      // code inconnu / inactif
    return { nom: row.nom, programme: row.programme || "", logo_url: row.logo_url || "" };
  } catch (e) {
    return null;                                 // hors-ligne / échec réseau : optimiste
  }
}

/* Récupère le nom du CFP pour un élève déjà rattaché mais dont le state n'a pas encore
   cfpNom (rattaché avant cette version, ou rejoint hors-ligne). Silencieux si hors-ligne. */
async function maybeBackfillCfp() {
  if (!state.classCode || state.cfpNom || !navigator.onLine) return;
  const info = await lookupClassInfo(state.classCode);
  if (info && typeof info === "object") {
    state.cfpNom = info.nom || "";
    state.cfpLogo = info.logo_url || "";
    state.programme = info.programme || "";
    saveState();
    render();
  }
}

/* Synchronisation vers le serveur de classe (Supabase).
   Écriture par la fonction `soumettre_progression` — jamais d'accès direct aux
   tables (RLS). Hors-ligne : la charge reste en file locale et repart au réseau. */
const SUPABASE_URL = "https://gejmaxobebsamvfkkpoj.supabase.co";
const SUPABASE_KEY = "sb_publishable_jqf5eYy0Coka5d0-E86JJQ_bCiQDyvD";
const SYNC_KEY = "chantierquest_sync_pending";

/* Transforme state.scores ({ c01_1: 25, c01_2: 80, ... }) en tableau { module, niveau, score }.
   On itère state.scores (tous les paliers TENTÉS, réussis OU ratés) et non state.completed
   (réussis seulement), pour que les échecs (< 70) remontent en pastille rouge côté enseignant.
   L'id de compétence est libre ; on isole le niveau 1-3 en suffixe. */
function buildProgressArray() {
  const out = [];
  for (const key in state.scores) {
    const m = key.match(/^(.+)_([123])$/);
    if (!m) continue;
    const sc = state.scores[key];
    out.push({ module: m[1], niveau: parseInt(m[2], 10), score: typeof sc === "number" ? sc : 0 });
  }
  return out;
}

function syncProgress() {
  if (!state.shared || !state.classCode) return; // sans partage, rien ne part
  const payload = {
    p_code: state.classCode,
    p_eleve: deviceId(),
    p_totem: totemLabel(state.totem, state.lang),   // dans la langue de l'élève (FR ou EN)
    p_progress: buildProgressArray()
  };
  // On garde la dernière charge : un upsert idempotent, la plus récente prime.
  localStorage.setItem(SYNC_KEY, JSON.stringify(payload));
  flushSync();
}

async function flushSync() {
  const raw = localStorage.getItem(SYNC_KEY);
  if (!raw) return;
  if (!navigator.onLine) return;               // on réessaiera au retour du réseau
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/soumettre_progression`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      body: raw
    });
    if (res.ok) localStorage.removeItem(SYNC_KEY);  // succès : on vide la file
    // sinon on garde la file pour un prochain essai
  } catch (e) { /* hors ligne / échec réseau : la file reste */ }
}

// Au retour du réseau, on vide ce qui attendait et on récupère le nom du CFP si besoin.
window.addEventListener("online", flushSync);
window.addEventListener("online", maybeBackfillCfp);

/* Identifiant d'appareil anonyme, stable, généré localement (pas de vrai nom). */
function deviceId() {
  let id = localStorage.getItem("chantierquest_device_id");
  if (!id) {
    id = "cq-" + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem("chantierquest_device_id", id);
  }
  return id;
}

function renderClassJoin() {
  const fr = state.lang === "fr";
  root.innerHTML = `
  <div class="onboarding">
    <div class="lang-toggle-top">
      <button onclick="closeClassJoin()">${fr ? "← Retour" : "← Back"}</button>
    </div>
    <h1>👥 ${fr ? "Ma classe" : "My class"}</h1>
    ${state.cfpNom ? `<div class="cfp-banner">
      ${safeImageUrl(state.cfpLogo) ? `<img class="cfp-logo" src="${escapeHtml(safeImageUrl(state.cfpLogo))}" alt="" />` : ""}
      <div class="cfp-text">
        <div class="cfp-name">${escapeHtml(state.cfpNom)}</div>
        ${state.programme ? `<div class="cfp-prog">${escapeHtml(state.programme)}</div>` : ""}
      </div>
    </div>` : ""}
    <p class="welcome-intro">${fr
      ? "Ton enseignant t'a remis un code ? Saisis-le pour rejoindre ta classe. L'application fonctionne pareil avec ou sans."
      : "Got a code from your teacher? Enter it to join your class. The app works the same with or without."}</p>

    <label class="field-label">${fr ? "Code de la classe" : "Class code"}</label>
    <input id="classCodeInput" type="text" maxlength="20" autocapitalize="characters"
      placeholder="${fr ? "ex. BONAV-5220" : "e.g. BONAV-5220"}"
      value="${escapeHtml(draftClassCode)}" oninput="draftClassCode=this.value"
      style="text-transform:uppercase;letter-spacing:1px;text-align:center" />

    <div class="share-toggle ${draftShared ? "on" : ""}" onclick="toggleDraftShare()">
      <div class="tog"></div>
      <div class="share-lbl">
        <b>${fr ? "Partager avec mon enseignant" : "Share with my teacher"}</b>
        <small>${fr ? "Il verra ma progression sous mon totem, sans savoir qui je suis." : "They'll see my progress under my totem, without knowing who I am."}</small>
      </div>
    </div>
    <p class="share-status ${draftShared ? "on" : ""}">${draftShared
      ? (fr ? "✓ Ta progression sera partagée avec ta classe." : "✓ Your progress will be shared with your class.")
      : (fr ? "Non partagé : tu révises en solo, rien n'est transmis." : "Not shared: you study solo, nothing is sent.")}</p>

    ${joinStatus === "invalid" ? `<p class="join-error">${fr ? "⚠️ Code invalide ou inactif. Vérifie auprès de ton enseignant." : "⚠️ Invalid or inactive code. Check with your teacher."}</p>` : ""}

    <button class="cta" onclick="joinClass()" ${joinStatus === "checking" ? "disabled" : ""}>${joinStatus === "checking" ? (fr ? "Vérification…" : "Checking…") : (fr ? "Enregistrer" : "Save")}</button>
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
  // Le totem tiré à l'écran de profil se fige ici, au démarrage.
  state.totem = { ...draftTotem };   // fige l'objet totem (neutre en langue)
  state.createdAt = state.createdAt || new Date().toISOString();
  saveState();
  render();
}

/* Loi 25 : lien discret et persistant vers la politique de confidentialité,
   affiché en pied de page sur la carte et l'écran « Comment ça marche ».
   Ouvre la politique hébergée sur le site corporatif dans un nouvel onglet. */
function privacyFooter() {
  return `<footer class="privacy-footer"><a href="https://productions-imedias.com/confidentialite.html" target="_blank" rel="noopener">${t("privacy")}</a></footer>`;
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
    ${privacyFooter()}
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
  const premiumLocked = isPremiumLocked(c);
  const playable = unlocked && !premiumLocked;
  const title = state.lang === "fr" ? c.title_fr : c.title_en;
  const mastered = state.badges.includes(c.id);
  let cls = "quest-node";
  if (mastered) cls += " done";
  else if (!playable) cls += " locked";
  if (premiumLocked) cls += " premium-locked";
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
  const mainClick = premiumLocked ? "showPremiumLock()" : (playable ? `openQuest('${c.id}',1)` : "");
  return `
    <div class="${cls}">
      <div class="quest-node-main" onclick="${mainClick}">
        <div class="quest-icon">${playable ? c.icon : "🔒"}</div>
        <div class="quest-body">
          <div class="quest-num">${c.order}. ${c.code}</div>
          <div class="quest-title">${title}${mastered ? " 🏆" : ""}</div>
          ${premiumLocked ? `<div class="quest-premium-note">${premiumLockText().badge}</div>` : `<div class="quest-meta">${c.hours} ${t("hours")}</div>`}
        </div>
      </div>
      ${playable ? `<div class="tier-row">${tierPills}</div>` : ""}
    </div>`;
}

function openQuest(id, level) {
  const comp = COMPETENCIES.find(c => c.id === id);
  if (comp && isPremiumLocked(comp)) { showPremiumLock(); return; }
  currentQuest = comp;
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
      ${(c.code || c.hours) ? `<p class="quest-code">${[c.code, c.hours ? `${c.hours} ${t("hours")}` : null].filter(Boolean).join(" · ")}</p>` : ""}
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
    wrong: null,
    errors: 0        // associations fautives : une seule suffit à rater la question
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
    ms.errors++;   // une association fautive : la question ne comptera plus comme réussie
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

/* Revue des erreurs : pour chaque question ratée, la réponse donnée, la bonne
   réponse et l'explication. Transforme le résultat en moment d'apprentissage. */
function reviewHTML(questions) {
  const fr = state.lang === "fr";
  const items = [];
  questions.forEach((q, i) => {
    let wrong = false, yours = null, good = null;
    if (q.type === "match") {
      const ms = quizMatchState[i];
      wrong = !(ms && ms.matched.length === q.pairs.length && ms.errors === 0);
    } else {
      const choices = quizShuffled[i] || [];
      const chosen = choices[quizAnswers[i]];
      const goodChoice = choices.find(ch => ch.correct);
      wrong = !(chosen && chosen.correct);
      yours = chosen ? (fr ? chosen.fr : chosen.en) : "—";
      good = goodChoice ? (fr ? goodChoice.fr : goodChoice.en) : "";
    }
    if (!wrong) return;
    const qText = (fr ? q.fr : q.en) || "";
    const expl = fr ? q.explFr : q.explEn;
    items.push(`
      <div class="review-item">
        <div class="review-q">${qText}</div>
        ${yours !== null ? `<div class="review-line yours">✗ ${yours}</div>` : ""}
        ${good ? `<div class="review-line good">✓ ${good}</div>` : ""}
        ${expl ? `<div class="review-expl">${expl}</div>` : ""}
      </div>`);
  });
  if (!items.length) return "";
  return `
    <div class="review">
      <h3 class="review-title">${fr ? "Revois tes erreurs" : "Review your mistakes"}</h3>
      ${items.join("")}
    </div>`;
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
      // Réussie seulement si toutes les paires sont trouvées SANS erreur.
      if (ms && ms.matched.length === q.pairs.length && ms.errors === 0) correct++;
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
  // Magasin de TOUS les essais (réussis ou ratés) : meilleur score par palier tenté.
  // Alimente la synchro → l'échec apparaît en rouge côté enseignant. Ne touche PAS
  // à state.completed (réservé aux réussites : déverrouillage, pastilles « fait », badges).
  state.scores = state.scores || {};
  state.scores[key] = Math.max(score, state.scores[key] || 0);
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
  syncProgress();   // remonte la progression si l'élève partage avec sa classe

  root.innerHTML = header("map") + `
    <div class="content quest-result">
      ${passed ? confettiHTML(isNewMastery ? 46 : 26) : ""}
      <div class="result-icon ${passed ? 'celebrate' : ''}">${passed ? "🎉" : "😕"}</div>
      <h2>${t("questResult")}</h2>
      <p class="result-score">${t("score")}: ${score}% (${correct}/${questions.length})</p>
      <p class="result-xp">+${xpGained} XP</p>
      <p class="${passed ? 'result-pass' : 'result-fail'}">${passed ? t("passed") : t("failed")}</p>
      ${isNewMastery ? `<p class="result-mastery">🏆 ${t("masteryUnlocked")}</p>` : ""}
      ${reviewHTML(questions)}
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
    name: state.totem ? (state.totem.emoji + " " + totemLabel(state.totem, state.lang)) : t("you"),
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
    draftTotem = genTotem();
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
window.showPremiumLock = showPremiumLock;
window.completeWelcome = completeWelcome;
window.regenTotem = regenTotem;
window.goClassJoin = goClassJoin;
window.closeClassJoin = closeClassJoin;
window.toggleDraftShare = toggleDraftShare;
window.joinClass = joinClass;

/* ------------------ Code de classe dans l'URL (?code=) ------------------
   Un lien du type .../?code=DEMO-5220 rattache l'élève à sa cohorte
   automatiquement : validation + personnalisation via info_classe (cfpNom,
   cfpLogo, programme), sans qu'il ait à chercher l'icône « Ma classe ».
   IMPORTANT : on n'active PAS le partage (state.shared reste à sa valeur).
   Le partage demeure un choix explicite (Loi 25) et cela évite qu'une partie
   de prospect pollue les données du tableau de bord démo. On nettoie l'URL
   pour ne pas ré-appliquer en boucle au rafraîchissement. */
function applyUrlCode() {
  let code = "";
  try { code = (new URLSearchParams(location.search).get("code") || "").trim().toUpperCase(); } catch (e) { return; }
  if (!code) return;
  // On retire ?code= tout de suite (URL propre, pas de ré-application au refresh).
  try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) { /* ignore */ }
  lookupClassInfo(code).then((info) => {
    if (info === "invalid") return;   // code invalide dans le lien : on ignore proprement
    // Valide, OU hors-ligne / échec réseau (info === null) : rattachement optimiste.
    state.classCode = code;
    // On NE touche PAS à state.shared — le partage reste un choix explicite de l'élève.
    if (info && typeof info === "object") {
      state.cfpNom = info.nom || "";
      state.cfpLogo = info.logo_url || "";
      state.programme = info.programme || "";
    }
    saveState();
    render();
  });
}

render();
flushSync();   // vide une éventuelle file en attente d'un envoi précédent
maybeBackfillCfp();   // récupère le nom du CFP si l'élève est déjà rattaché sans nom
applyUrlCode();   // rattache l'élève automatiquement si un ?code= est présent dans le lien

/* PWA service worker */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
