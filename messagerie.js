/* ============================================================
   Messagerie enseignant → élève (SENS UNIQUE) — module générique
   ============================================================
   L'enseignant écrit depuis le tableau de bord (prof.questedu.ca) ; l'élève
   lit ici. Il ne peut PAS répondre par écrit : il a deux accusés,
   « 👍 Compris » et « ✋ J'en parle en classe ». Ouvrir l'écran des messages
   les marque « lus ».

   Totalement indépendant du carnet de stage (StageQuest) : autres tables,
   autres fonctions, aucune option de licence. La messagerie fait partie du
   tableau de bord de base.

   SERVEUR (voir quest-enseignant/supabase_messagerie.sql)
     messagerie_eleve_lire(p_code, p_eleve)                       → ses messages
     messagerie_eleve_accuser(p_code, p_eleve, p_messages, p_accuse)
   Deux fonctions `security definer` : l'app n'a AUCUN accès direct aux
   tables. Le serveur vérifie que l'identifiant d'appareil appartient bien à
   la classe du code, et ne renvoie jamais le courriel de l'enseignant.

   QUAND ÇA MARCHE
     Seulement si l'élève est rattaché à une classe ET a activé le partage.
     Sans partage, rien ne part (même pas une relecture) : c'est la règle de
     la plateforme, et c'est le partage qui crée la fiche de l'élève côté
     serveur. « Ma classe » l'explique à l'élève.

   HORS LIGNE
     Le dernier état connu est gardé dans le localStorage et affiché ; les
     accusés partent dans une petite file, vidée au retour du réseau. Rien
     ici ne bloque l'app : toute erreur est silencieuse.

   RELECTURE
     Au démarrage, au retour au premier plan, au retour du réseau, et toutes
     les 60 s SEULEMENT si l'app est visible, en ligne et rattachée.

   DÉPENDANCES (fournies par app.js, chargé APRÈS ce fichier) :
     state, root, render(), escapeHtml(), deviceId(), SUPABASE_URL,
     SUPABASE_KEY, showClassJoin, currentQuest.
   Ce fichier ne fait que déclarer ; rien ne s'exécute avant msgDemarrer(),
   appelé à la fin de app.js.

   ⚠️ SÉCURITÉ : le texte du message est écrit par un adulte, mais il arrive
   par le réseau. TOUT ce qui vient du serveur passe par escapeHtml() avant
   d'entrer dans le HTML, et les identifiants sont revalidés (format UUID)
   avant d'entrer dans un attribut onclick.
   ============================================================ */

/* localStorage est propre à chaque sous-domaine (une app = une origine) :
   ces clés ne peuvent pas entrer en collision entre deux apps Quest. */
const MSG_CACHE_KEY = "quest_msg_cache";   // { code, eleve, list:[…], maj }
const MSG_FILE_KEY = "quest_msg_file";     // accusés en attente d'envoi
const MSG_PERIODE_MS = 60000;
const MSG_MAX = 280;
const MSG_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MSG_ACCUSES = ["compris", "en_classe"];

let msgEcranOuvert = false;
let msgNouveauxAOuverture = [];   // non lus au moment de l'ouverture : mis en évidence
let msgHorsLigne = false;         // dernière relecture échouée (réseau)
let msgRelectureEnCours = false;
let msgFileEnCours = false;
let msgDemarre = false;

function msgFr() { return !(state && state.lang === "en"); }

/* La messagerie n'existe que pour un élève rattaché ET qui partage. */
function msgActif() {
  return !!(state && state.totem && state.classCode && state.shared);
}

/* ------------------ Stockage local ------------------ */

function msgLireJSON(cle, defaut) {
  try {
    const v = JSON.parse(localStorage.getItem(cle) || "null");
    return v == null ? defaut : v;
  } catch (e) { return defaut; }
}
function msgEcrireJSON(cle, v) {
  try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* stockage plein : on ignore */ }
}

/* La liste n'est valable que pour CETTE classe et CET appareil : un
   changement de code de classe (ou une réinitialisation) la rend muette. */
function msgListe() {
  const c = msgLireJSON(MSG_CACHE_KEY, null);
  if (!c || !Array.isArray(c.list)) return [];
  if (c.code !== state.classCode || c.eleve !== deviceId()) return [];
  return c.list;
}
function msgMaj() {
  const c = msgLireJSON(MSG_CACHE_KEY, null);
  return c && c.code === state.classCode ? c.maj || null : null;
}
function msgEnregistrerListe(list, maj) {
  msgEcrireJSON(MSG_CACHE_KEY, {
    code: state.classCode, eleve: deviceId(), list,
    maj: maj || msgMaj() || null
  });
}
function msgNonLus() { return msgListe().filter((m) => !m.lu_le); }

/* Une ligne venue du serveur est revalidée avant d'être gardée. */
function msgNettoyer(r) {
  if (!r || typeof r !== "object") return null;
  const id = String(r.id || "");
  if (!MSG_UUID.test(id)) return null;
  const texte = String(r.texte == null ? "" : r.texte).slice(0, MSG_MAX);
  if (!texte.trim()) return null;
  return {
    id,
    texte,
    auteur: r.auteur ? String(r.auteur).slice(0, 60) : null,
    pour_moi: r.pour_moi === true,
    cree_le: r.cree_le ? String(r.cree_le) : null,
    lu_le: r.lu_le ? String(r.lu_le) : null,
    accuse: MSG_ACCUSES.indexOf(r.accuse) !== -1 ? r.accuse : null,
    accuse_le: r.accuse_le ? String(r.accuse_le) : null
  };
}

/* ------------------ File des accusés (hors ligne) ------------------ */

function msgFile() {
  const f = msgLireJSON(MSG_FILE_KEY, []);
  return Array.isArray(f) ? f : [];
}
function msgEnfiler(ids, accuse) {
  const f = msgFile();
  const quand = new Date().toISOString();
  // Un nouvel accusé sur le même message remplace l'ancien en attente.
  const reste = accuse === "lu" ? f : f.filter((it) => !(it.accuse !== "lu" && it.ids[0] === ids[0]));
  reste.push({ ids, accuse, code: state.classCode, eleve: deviceId(), t: quand });
  msgEcrireJSON(MSG_FILE_KEY, reste.slice(-100));
}
function msgEnAttente(id) {
  return msgFile().some((it) => it.accuse !== "lu" && it.ids.indexOf(id) !== -1);
}

/* Les accusés pas encore partis sont rejoués sur la liste reçue du serveur,
   pour qu'une relecture ne fasse pas « revenir » un message déjà lu. */
function msgAppliquerFile(list) {
  const f = msgFile().filter((it) => it.code === state.classCode && it.eleve === deviceId());
  f.forEach((it) => {
    list.forEach((m) => {
      if (it.ids.indexOf(m.id) === -1) return;
      if (!m.lu_le) m.lu_le = it.t;
      if (it.accuse !== "lu") { m.accuse = it.accuse; m.accuse_le = it.t; }
    });
  });
  return list;
}

async function msgViderFile() {
  if (msgFileEnCours || !navigator.onLine) return;
  msgFileEnCours = true;
  try {
    let f = msgFile();
    while (f.length) {
      const it = f[0];
      // Accusé d'une ancienne classe ou d'un ancien appareil : on le jette.
      if (!it || !Array.isArray(it.ids) || it.code !== state.classCode || it.eleve !== deviceId()) {
        f.shift(); msgEcrireJSON(MSG_FILE_KEY, f); continue;
      }
      let res;
      try {
        res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/messagerie_eleve_accuser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
          },
          body: JSON.stringify({ p_code: it.code, p_eleve: it.eleve, p_messages: it.ids, p_accuse: it.accuse })
        });
      } catch (e) { break; }                         // hors ligne : on garde la file
      // Succès, ou requête refusée pour de bon (400/401/403) : on retire.
      // Erreur serveur, fonction absente (404), trop de requêtes : on réessaiera.
      if (res.ok || (res.status >= 400 && res.status < 500 && [404, 408, 429].indexOf(res.status) === -1)) {
        f = msgFile(); f.shift(); msgEcrireJSON(MSG_FILE_KEY, f);
      } else {
        break;
      }
    }
  } finally {
    msgFileEnCours = false;
  }
}

/* ------------------ Relecture ------------------ */

async function msgRelire() {
  if (!msgActif() || !navigator.onLine || msgRelectureEnCours) return;
  msgRelectureEnCours = true;
  const code = state.classCode;
  const eleve = deviceId();
  try {
    await msgViderFile();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/messagerie_eleve_lire`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      body: JSON.stringify({ p_code: code, p_eleve: eleve })
    });
    // 404 = SQL pas encore exécuté ; 5xx = incident. Dans les deux cas : on
    // garde le dernier état connu, sans rien dire.
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    // La classe a changé pendant l'aller-retour : on jette la réponse.
    if (state.classCode !== code || deviceId() !== eleve) return;
    const avant = JSON.stringify(msgListe());
    const list = msgAppliquerFile(data.map(msgNettoyer).filter(Boolean));
    msgEnregistrerListe(list, new Date().toISOString());
    const etaitHorsLigne = msgHorsLigne;
    msgHorsLigne = false;
    if (JSON.stringify(list) !== avant || etaitHorsLigne) msgRafraichir();
  } catch (e) {
    msgHorsLigne = true;                              // réseau : dernier état connu
  } finally {
    msgRelectureEnCours = false;
  }
}

/* Mise à jour de l'affichage SANS changer d'écran. render() ramènerait à la
   carte un élève qui est dans Badges ou Trophées (ces onglets ne passent pas
   par render()) : on remplace donc seulement les emplacements prévus. */
function msgRafraichir() {
  if (msgEcranOuvert) { render(); return; }
  document.querySelectorAll("[data-msg-slot='banniere']").forEach((el) => { el.innerHTML = msgBanniereHTML(); });
  document.querySelectorAll("[data-msg-slot='point']").forEach((el) => { el.innerHTML = msgPointHTML(); });
  document.querySelectorAll("[data-msg-slot='classe']").forEach((el) => { el.innerHTML = msgClasseHTML(); });
}

/* ------------------ Actions de l'élève ------------------ */

function msgOuvrir() {
  if (!msgActif()) return;
  const list = msgListe();
  const nonLus = list.filter((m) => !m.lu_le).map((m) => m.id);
  msgNouveauxAOuverture = nonLus;
  // « Lu » dès l'ouverture : localement tout de suite, puis vers le serveur.
  if (nonLus.length) {
    const quand = new Date().toISOString();
    list.forEach((m) => { if (!m.lu_le) m.lu_le = quand; });
    msgEnregistrerListe(list);
    for (let i = 0; i < nonLus.length; i += 50) msgEnfiler(nonLus.slice(i, i + 50), "lu");
  }
  msgEcranOuvert = true;
  showClassJoin = false;
  render();
  try { window.scrollTo(0, 0); } catch (e) {}
  msgViderFile();
  msgRelire();
}

function msgFermer() {
  msgEcranOuvert = false;
  msgNouveauxAOuverture = [];
  render();
}

function msgAccuser(id, accuse) {
  if (!MSG_UUID.test(String(id)) || MSG_ACCUSES.indexOf(accuse) === -1) return;
  const list = msgListe();
  const m = list.find((x) => x.id === id);
  if (!m) return;
  if (m.accuse === accuse) return;                   // déjà choisi : rien à envoyer
  const quand = new Date().toISOString();
  m.accuse = accuse;
  m.accuse_le = quand;
  if (!m.lu_le) m.lu_le = quand;
  msgEnregistrerListe(list);
  msgEnfiler([id], accuse);
  render();
  msgViderFile().then(() => { if (msgEcranOuvert) render(); });
}

/* ------------------ Rendu ------------------ */

/* Bandeau de la carte : seulement s'il y a du non lu. */
function msgBanniereHTML() {
  if (!msgActif()) return "";
  const n = msgNonLus().length;
  if (!n) return "";
  const fr = msgFr();
  const sous = n > 1
    ? (fr ? `${n} nouveaux messages · touche pour lire` : `${n} new messages · tap to read`)
    : (fr ? "Touche pour lire" : "Tap to read");
  return `<button class="msg-banniere" onclick="msgOuvrir()">
    <span class="msg-banniere-ic">📬</span>
    <span class="msg-banniere-tx"><b>${fr ? "Message de ton enseignant" : "Message from your teacher"}</b><small>${sous}</small></span>
    <span class="msg-banniere-fl">›</span>
  </button>`;
}

/* Pastille sur le bouton 👥 « Ma classe » de l'en-tête : discrète, visible
   depuis tous les onglets, sans ajouter de bouton sur un écran étroit. */
function msgPointHTML() {
  if (!msgActif() || !msgNonLus().length) return "";
  return `<span class="msg-point" aria-label="${msgFr() ? "Message non lu" : "Unread message"}"></span>`;
}

/* Bloc dans « Ma classe » : l'historique, ou l'explication s'il manque le partage. */
function msgClasseHTML() {
  const fr = msgFr();
  if (!state.classCode) return "";
  if (!state.shared) {
    return `<p class="msg-info">📬 ${fr
      ? "Active le partage ci-dessous pour recevoir les messages de ton enseignant."
      : "Turn on sharing below to receive messages from your teacher."}</p>`;
  }
  const total = msgListe().length;
  const n = msgNonLus().length;
  return `<button class="secondary msg-ouvrir" onclick="msgOuvrir()">
    📬 ${fr ? "Messages de ton enseignant" : "Messages from your teacher"}${total ? ` (${total})` : ""}
    ${n ? `<span class="msg-compte">${n} ${fr ? (n > 1 ? "nouveaux" : "nouveau") : "new"}</span>` : ""}
  </button>`;
}

function msgDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString(msgFr() ? "fr-CA" : "en-CA",
      { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  } catch (e) { return d.toISOString().slice(0, 10); }
}

function msgCarteHTML(m) {
  const fr = msgFr();
  const id = MSG_UUID.test(m.id) ? m.id : "";
  if (!id) return "";
  const nouveau = msgNouveauxAOuverture.indexOf(id) !== -1;
  const auteur = m.auteur ? escapeHtml(m.auteur) : (fr ? "Ton enseignant(e)" : "Your teacher");
  const portee = m.pour_moi ? (fr ? "À toi" : "To you") : (fr ? "À toute la classe" : "To the whole class");
  const attente = m.accuse && msgEnAttente(id);
  const etat = !m.accuse ? ""
    : attente
      ? (fr ? "⏳ Ta réponse partira dès que tu seras en ligne." : "⏳ Your reply will be sent once you're online.")
      : (fr ? `✓ Ton enseignant(e) voit ta réponse (${escapeHtml(msgDate(m.accuse_le))}).` : `✓ Your teacher can see your reply (${escapeHtml(msgDate(m.accuse_le))}).`);
  return `<article class="msg-carte${nouveau ? " nouveau" : ""}">
    <div class="msg-tete">
      <b>${auteur}</b>
      <span class="msg-portee">${portee}</span>
    </div>
    <div class="msg-date">${escapeHtml(msgDate(m.cree_le))}${nouveau ? ` · <span class="msg-neuf">${fr ? "Nouveau" : "New"}</span>` : ""}</div>
    <p class="msg-texte">${escapeHtml(m.texte)}</p>
    <div class="msg-accuses">
      <button class="msg-acc${m.accuse === "compris" ? " on" : ""}" onclick="msgAccuser('${id}','compris')">👍 ${fr ? "Compris" : "Got it"}</button>
      <button class="msg-acc${m.accuse === "en_classe" ? " on" : ""}" onclick="msgAccuser('${id}','en_classe')">✋ ${fr ? "J'en parle en classe" : "I'll bring it up in class"}</button>
    </div>
    ${etat ? `<div class="msg-etat">${etat}</div>` : ""}
  </article>`;
}

function renderMessagerie() {
  const fr = msgFr();
  const list = msgListe();
  const maj = msgMaj();
  const horsLigne = msgHorsLigne || !navigator.onLine;
  root.innerHTML = `
  <div class="onboarding msg-ecran">
    <div class="lang-toggle-top">
      <button onclick="msgFermer()">${fr ? "← Retour" : "← Back"}</button>
    </div>
    <h1>📬 ${fr ? "Messages" : "Messages"}</h1>
    <p class="welcome-intro">${fr
      ? "Ton enseignant(e) t'écrit ici. Tu ne peux pas répondre par écrit : choisis « 👍 Compris » ou « ✋ J'en parle en classe »."
      : "Your teacher writes to you here. You can't reply in writing: choose “👍 Got it” or “✋ I'll bring it up in class”."}</p>
    ${!msgActif() ? `<p class="msg-info">${fr
      ? "Rejoins ta classe et active le partage dans « Ma classe » pour recevoir les messages."
      : "Join your class and turn on sharing in “My class” to receive messages."}</p>` : ""}
    ${horsLigne && msgActif() ? `<p class="msg-info">${fr
      ? `Hors ligne : voici les derniers messages connus${maj ? ` (${escapeHtml(msgDate(maj))})` : ""}.`
      : `Offline: these are the last known messages${maj ? ` (${escapeHtml(msgDate(maj))})` : ""}.`}</p>` : ""}
    <div class="msg-liste">
      ${list.length ? list.map(msgCarteHTML).join("") : `<p class="msg-vide">${fr
        ? "Aucun message pour l'instant."
        : "No messages yet."}</p>`}
    </div>
  </div>`;
}

/* ------------------ Démarrage ------------------ */

function msgDemarrer() {
  if (msgDemarre) return;
  msgDemarre = true;
  msgRelire();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") msgRelire();
  });
  window.addEventListener("online", () => { msgHorsLigne = false; msgRelire(); });
  window.addEventListener("offline", () => { msgHorsLigne = true; if (msgEcranOuvert) render(); });
  // Légère périodicité : seulement app visible, en ligne et rattachée.
  setInterval(() => {
    if (document.visibilityState === "visible" && navigator.onLine && msgActif()) msgRelire();
  }, MSG_PERIODE_MS);
}

window.msgOuvrir = msgOuvrir;
window.msgFermer = msgFermer;
window.msgAccuser = msgAccuser;
