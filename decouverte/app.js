/* ============================================================
   DécouverteQuest — logique du jeu-questionnaire
   ============================================================
   Une partie = 10 images. Pour chacune, le joueur choisit parmi 4 réponses.
   Les images viennent de Wikipédia / Wikimedia Commons, chargées dans le
   navigateur au début de la partie, avec leur auteur et leur licence. */

const STORAGE_KEY = "decouvertequest_v1";
const NB_QUESTIONS = 10;
const NB_CHOIX = 4;
const POINTS = 10;
const BONUS_SERIE = 5;      // ajouté à partir de 3 bonnes réponses d'affilée
const LARGEUR_IMAGE = 960;  // largeur demandée à Commons (miniature)

// Licences acceptées : domaine public, CC0, CC BY, CC BY-SA (toutes versions).
// Tout le reste (GFDL seule, NC, ND, usage loyal…) est écarté.
const LICENCE_OK = /^(public domain|domaine public|pd\b|pd-|cc0|cc[ -]by(-sa)?[ -]\d)/i;

const state = {
  ecran: "accueil",   // accueil | chargement | question | fin | erreur
  cat: "tout",
  questions: [],
  i: 0,
  score: 0,
  serie: 0,
  choisi: null,       // index du choix cliqué, null tant que non répondu
  bonnes: 0,
  meilleurs: {},      // meilleur score par catégorie
};

/* ------------------ Sauvegarde locale ------------------ */
function charger() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.meilleurs = s.meilleurs || {};
  } catch (e) { /* stockage indisponible : on joue sans */ }
}
function sauver() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ meilleurs: state.meilleurs })); } catch (e) {}
}

/* ------------------ Utilitaires ------------------ */
function melanger(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
// Les métadonnées de Commons contiennent du HTML (liens, balises) : on garde le texte.
function texteSeul(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  return (d.textContent || "").replace(/\s+/g, " ").trim();
}
function resume(txt, max = 280) {
  if (!txt || txt.length <= max) return txt || "";
  const coupe = txt.slice(0, max);
  const fin = coupe.lastIndexOf(". ");
  return (fin > 120 ? coupe.slice(0, fin + 1) : coupe.replace(/\s+\S*$/, "") + "…");
}

/* ------------------ Récupération Wikipédia + Commons ------------------ */
// 1) Résumé de l'article : image principale, extrait, lien.
async function chargerArticle(o) {
  const url = "https://fr.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(o.wiki);
  const r = await fetch(url);
  if (!r.ok) throw new Error("article " + o.wiki + " : " + r.status);
  const j = await r.json();
  if (j.type !== "standard" || !j.originalimage) throw new Error("pas d'image : " + o.wiki);
  const src = j.originalimage.source;
  // On n'accepte que les fichiers hébergés sur Commons (licence vérifiable).
  if (!src.includes("/wikipedia/commons/")) throw new Error("image hors Commons : " + o.wiki);
  const fichier = decodeURIComponent(src.split("/").pop()).replace(/_/g, " ");
  return {
    ...o,
    fichier,
    extrait: j.extract || "",
    lienArticle: (j.content_urls && j.content_urls.mobile && j.content_urls.mobile.page) || "https://fr.wikipedia.org/wiki/" + o.wiki,
  };
}

// 2) Licence, auteur et miniature de toutes les images, en une seule requête.
async function chargerLicences(items) {
  const titres = items.map((it) => "File:" + it.fichier);
  const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=" + LARGEUR_IMAGE +
    "&titles=" + encodeURIComponent(titres.join("|"));
  const r = await fetch(url);
  if (!r.ok) throw new Error("Commons : " + r.status);
  const j = await r.json();
  // Commons peut renommer légèrement un titre (« normalized ») : on suit la correspondance.
  const renomme = {};
  ((j.query && j.query.normalized) || []).forEach((n) => { renomme[n.from] = n.to; });
  const parTitre = {};
  Object.values((j.query && j.query.pages) || {}).forEach((p) => { parTitre[p.title] = p; });

  const ok = [];
  items.forEach((it, k) => {
    const t = titres[k];
    const page = parTitre[renomme[t] || t];
    const info = page && page.imageinfo && page.imageinfo[0];
    if (!info) return;
    const meta = info.extmetadata || {};
    const licence = texteSeul(meta.LicenseShortName && meta.LicenseShortName.value);
    if (!LICENCE_OK.test(licence)) {
      console.info("Écartée (licence " + (licence || "inconnue") + ") :", it.wiki);
      return;
    }
    ok.push({
      ...it,
      image: info.thumburl || info.url,
      licence,
      auteurPhoto: texteSeul(meta.Artist && meta.Artist.value) || "Auteur inconnu",
      lienFichier: info.descriptionurl,
    });
  });
  return ok;
}

async function preparerPartie(cat) {
  const pool = OEUVRES.filter((o) => cat === "tout" || o.cat === cat);
  // On tente plus d'entrées que nécessaire : certaines seront écartées.
  const candidats = melanger(pool).slice(0, NB_QUESTIONS + 8);
  const articles = (await Promise.allSettled(candidats.map(chargerArticle)))
    .filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (!articles.length) throw new Error("aucun article");
  const valides = (await chargerLicences(articles)).slice(0, NB_QUESTIONS);

  return valides.map((q) => {
    // Les mauvaises réponses viennent de la même catégorie que l'image (peinture avec peinture…).
    const leurres = melanger(OEUVRES.filter((o) => o.cat === q.cat && o.reponse !== q.reponse))
      .slice(0, NB_CHOIX - 1).map((o) => o.reponse);
    const choix = melanger([q.reponse, ...leurres]);
    return { ...q, choix, bonne: choix.indexOf(q.reponse) };
  });
}

/* ------------------ Actions ------------------ */
async function demarrer(cat) {
  state.cat = cat;
  state.ecran = "chargement";
  render();
  try {
    const qs = await preparerPartie(cat);
    if (qs.length < 3) throw new Error("trop peu d'images (" + qs.length + ")");
    qs.forEach((q) => { const im = new Image(); im.src = q.image; }); // préchargement
    Object.assign(state, { questions: qs, i: 0, score: 0, serie: 0, bonnes: 0, choisi: null, ecran: "question" });
  } catch (e) {
    console.warn(e);
    state.ecran = "erreur";
  }
  render();
}

function repondre(k) {
  if (state.choisi !== null) return;
  const q = state.questions[state.i];
  state.choisi = k;
  if (k === q.bonne) {
    state.serie++;
    state.bonnes++;
    state.score += POINTS + (state.serie >= 3 ? BONUS_SERIE : 0);
  } else {
    state.serie = 0;
  }
  render();
}

function suivant() {
  state.choisi = null;
  if (state.i + 1 < state.questions.length) {
    state.i++;
  } else {
    state.ecran = "fin";
    if (state.score > (state.meilleurs[state.cat] || 0)) {
      state.meilleurs[state.cat] = state.score;
      state.nouveauRecord = true;
    } else {
      state.nouveauRecord = false;
    }
    sauver();
  }
  render();
  window.scrollTo(0, 0);
}

function accueil() {
  state.ecran = "accueil";
  render();
}

/* ------------------ Écrans ------------------ */
function vueAccueil() {
  return `
    <div class="accueil">
      <div class="logo">🔎</div>
      <h1>DécouverteQuest</h1>
      <p class="sous-titre">Reconnais les grandes œuvres et les monuments du monde.</p>
      <div class="cats">
        ${CATEGORIES.map((c) => `
          <button class="cat" onclick="demarrer('${c.id}')">
            <span class="cat-emoji">${c.emoji}</span>
            <span class="cat-nom">${esc(c.nom)}</span>
            ${state.meilleurs[c.id] ? `<span class="cat-record">Record : ${state.meilleurs[c.id]}</span>` : ""}
          </button>`).join("")}
      </div>
      <p class="note">Images : Wikipédia et Wikimedia Commons, sous licence libre.</p>
    </div>`;
}

function vueChargement() {
  return `<div class="centre"><div class="spinner"></div><p>On décroche les tableaux…</p></div>`;
}

function vueErreur() {
  return `
    <div class="centre">
      <p class="gros">😕</p>
      <p>Impossible de charger les images. Vérifie ta connexion Internet.</p>
      <button class="btn" onclick="demarrer('${state.cat}')">Réessayer</button>
      <button class="btn-lien" onclick="accueil()">Accueil</button>
    </div>`;
}

function vueQuestion() {
  const q = state.questions[state.i];
  const repondu = state.choisi !== null;
  const juste = repondu && state.choisi === q.bonne;
  const pct = Math.round((state.i / state.questions.length) * 100);
  return `
    <div class="haut">
      <button class="btn-lien" onclick="accueil()">✕</button>
      <div class="progres"><div style="width:${pct}%"></div></div>
      <div class="score">⭐ ${state.score}</div>
    </div>
    <div class="cadre"><img src="${esc(q.image)}" alt="Image à identifier" /></div>
    <p class="question">${q.cat === "monument" ? "Quel est ce lieu ?" : "Quelle est cette œuvre ?"}
      <span class="compteur">${state.i + 1} / ${state.questions.length}</span></p>
    <div class="choix">
      ${q.choix.map((c, k) => {
        let cls = "choix-btn";
        if (repondu && k === q.bonne) cls += " bon";
        else if (repondu && k === state.choisi) cls += " mauvais";
        return `<button class="${cls}" onclick="repondre(${k})" ${repondu ? "disabled" : ""}>${esc(c)}</button>`;
      }).join("")}
    </div>
    ${repondu ? `
      <div class="fiche ${juste ? "fiche-bon" : "fiche-mauvais"}">
        <p class="verdict">${juste ? (state.serie >= 3 ? `Bravo ! Série de ${state.serie} 🔥` : "Bravo !") : "Pas tout à fait…"}</p>
        <h2>${esc(q.reponse)}</h2>
        <p class="detail">${esc(q.detail)}</p>
        <p class="extrait">${esc(resume(q.extrait))}</p>
        <a class="lien" href="${esc(q.lienArticle)}" target="_blank" rel="noopener">Lire la suite sur Wikipédia ↗</a>
        <p class="credit">Photo : ${esc(q.auteurPhoto)} — <a href="${esc(q.lienFichier)}" target="_blank" rel="noopener">${esc(q.licence)}</a>, via Wikimedia Commons</p>
        <button class="btn" onclick="suivant()">${state.i + 1 < state.questions.length ? "Suivante →" : "Voir mon score"}</button>
      </div>` : ""}`;
}

function vueFin() {
  const n = state.questions.length;
  const ratio = state.bonnes / n;
  const message = ratio === 1 ? "Parfait ! Un vrai guide de musée 🏆"
    : ratio >= 0.7 ? "Très bon œil ! 👏"
    : ratio >= 0.4 ? "Pas mal, continue d'explorer !"
    : "Chaque partie t'en fait découvrir davantage 🌍";
  return `
    <div class="fin">
      <p class="gros">${ratio >= 0.7 ? "🎉" : "🔎"}</p>
      <h1>${state.bonnes} / ${n}</h1>
      <p class="score-fin">⭐ ${state.score} points ${state.nouveauRecord ? `<span class="record">Nouveau record !</span>` : ""}</p>
      <p>${message}</p>
      <button class="btn" onclick="demarrer('${state.cat}')">Rejouer</button>
      <button class="btn-lien" onclick="accueil()">Changer de catégorie</button>
      <details class="credits">
        <summary>Crédits des images</summary>
        <ul>${state.questions.map((q) => `
          <li><strong>${esc(q.reponse)}</strong> — ${esc(q.auteurPhoto)},
            <a href="${esc(q.lienFichier)}" target="_blank" rel="noopener">${esc(q.licence)}</a></li>`).join("")}
        </ul>
      </details>
    </div>`;
}

function render() {
  const vues = { accueil: vueAccueil, chargement: vueChargement, erreur: vueErreur, question: vueQuestion, fin: vueFin };
  document.getElementById("app").innerHTML = vues[state.ecran]();
}

charger();
render();
