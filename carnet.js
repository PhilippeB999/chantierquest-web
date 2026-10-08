/* ============================================================
   ChantierQuest — Carnet de stage (module en OPTION de licence)
   Côté ÉLÈVE. Le pendant enseignant vit dans le dépôt quest-enseignant.

   Chargé AVANT app.js (voir index.html) : les corps de fonction ne
   s'exécutent qu'au clic, donc après l'initialisation de `state`,
   `root`, `header()`, `saveState()`, `render()` d'app.js.

   Le module est entièrement inerte tant que l'option « carnet » n'est
   pas activée pour le code de licence du centre (RPC `option_licence`,
   voir supabase_carnet.sql). Sans option : aucun onglet, aucun appel
   réseau, aucune donnée créée. L'app de révision est inchangée.

   ------------------------------------------------------------------
   LE PARCOURS
   ------------------------------------------------------------------
   1. L'élève en stage photographie un geste du métier, choisit le
      geste et l'engin, ajoute une note, et envoie.
   2. La réalisation arrive sur le tableau de bord de son enseignant,
      avec la photo.
   3. L'enseignant écrit « Validé », ou renvoie « À refaire » avec un
      commentaire, depuis le tableau de bord.
   4. L'app relit l'état au démarrage et au retour du réseau
      (`carnetSyncStatuts`, même principe que `maybeBackfillCfp`) : le
      statut change, le commentaire s'affiche, le badge se débloque.

   Le maître de stage n'est PAS dans le logiciel : aucun lien sortant,
   aucun jeton, aucun numéro de téléphone, aucune donnée de tiers.

   ⚠️ LOI 25 — c'est le SEUL endroit de la plateforme Quest qui fait
   transiter des renseignements personnels : une photo du travail de
   l'élève, un prénom ou surnom qu'il saisit, et le nom de son
   employeur de stage. Rien ne part avant que l'élève n'ait coché le
   consentement (`consentement` ci-dessous) ET rejoint une classe. Le
   texte de consentement reste à faire valider : voir le rapport.
   ============================================================ */

/* ------------------------------------------------------------------
   CONTENU — ⚠️ À VALIDER PAR UN ENSEIGNANT DU PROGRAMME

   Ces 8 « gestes du métier » reprennent VERBATIM la maquette de
   Philippe. Ils ne viennent PAS du référentiel du DEP 5220 : ce sont
   des gestes inventés pour la démonstration.

   Le vrai programme compte 20 compétences, déjà dans data.js avec
   leurs codes officiels. Le champ `comp` ci-dessous indique, à titre
   indicatif, la ou les compétences réelles dont chaque geste relève —
   il n'est pas encore utilisé par l'interface. Basculer le carnet sur
   les compétences réelles du programme est un choix PÉDAGOGIQUE qui
   revient à Philippe et à un enseignant (voir le rapport). Le jour où
   ce choix est fait, il suffit de remplacer ce tableau : tout le reste
   du module (envoi, synchro, tableau de bord) est indépendant des
   identifiants de gestes.
   ------------------------------------------------------------------ */
const CARNET_GESTES = [
  { id: "inspection",   comp: ["c04"],        icon: "🔧",
    nom_fr: "Inspecter l'engin avant le travail",   nom_en: "Inspect the machine before work",
    badge_fr: "Tour du propriétaire",               badge_en: "Walk-around" },
  { id: "deplacement",  comp: ["c05", "c07"], icon: "🚜",
    nom_fr: "Déplacer l'engin sur le chantier",     nom_en: "Move the machine around the site",
    badge_fr: "Pilote",                             badge_en: "Pilot" },
  { id: "tranchee",     comp: ["c13", "c14"], icon: "⛏️",
    nom_fr: "Creuser une tranchée",                 nom_en: "Dig a trench",
    badge_fr: "Taupe d'acier",                      badge_en: "Steel Mole" },
  { id: "nivellement",  comp: ["c10", "c19"], icon: "📏",
    nom_fr: "Niveler un terrain",                   nom_en: "Grade a surface",
    badge_fr: "Niveau parfait",                     badge_en: "Dead Level" },
  { id: "chargement",   comp: ["c08"],        icon: "🪣",
    nom_fr: "Charger un camion",                    nom_en: "Load a truck",
    badge_fr: "Plein à ras bord",                   badge_en: "Filled to the Brim" },
  { id: "remblai",      comp: ["c06", "c18"], icon: "🛞",
    nom_fr: "Remblayer et compacter",               nom_en: "Backfill and compact",
    badge_fr: "Rouleau compresseur",                badge_en: "Steamroller" },
  { id: "signaleur",    comp: ["c02", "c07"], icon: "🦺",
    nom_fr: "Travailler avec un signaleur",         nom_en: "Work with a signaller",
    badge_fr: "Bon signal",                         badge_en: "Good Signal" },
  { id: "entretien",    comp: ["c04"],        icon: "🛠️",
    nom_fr: "Faire l'entretien de base",            nom_en: "Perform basic maintenance",
    badge_fr: "Graisseur en chef",                  badge_en: "Chief Greaser" }
];

const CARNET_ENGINS = [
  { fr: "Pelle hydraulique",    en: "Hydraulic excavator" },
  { fr: "Chargeuse sur roues",  en: "Wheel loader" },
  { fr: "Niveleuse",            en: "Motor grader" },
  { fr: "Bouteur",              en: "Bulldozer" },
  { fr: "Chargeuse-pelleteuse", en: "Backhoe loader" },
  { fr: "Camion articulé",      en: "Articulated truck" },
  { fr: "Rouleau compacteur",   en: "Compaction roller" }
];

/* Objectif d'heures par défaut — informatif, modifiable par l'élève.
   ⚠️ 150 h vient de la maquette : ce n'est PAS une exigence du DEP 5220. */
const CARNET_OBJECTIF_DEFAUT = 150;

/* Plafond dur de la photo encodée (data URI base64). 120 000 caractères
   ≈ 90 ko d'image. La contrainte en base accepte jusqu'à 200 000 : on
   garde la marge pour ne jamais se faire refuser une ligne.
   UNE seule photo par réalisation. La vidéo n'est pas prise en charge :
   un clip de 10 s ne tiendrait ni dans un data URI ni dans le
   localStorage de la file hors ligne (voir supabase_carnet.sql §3). */
const CARNET_PHOTO_MAX = 120000;

const CARNET_OPTION = "carnet";

/* ------------------------------------------------------------------
   NOM DE PRODUIT — une seule ligne à changer.
   Le carnet est présenté aux enseignants comme un produit distinct, en
   seconde rencontre, après ChantierQuest pour la révision. Le nom est
   donc neutre vis-à-vis du métier : il tiendra tel quel en plomberie ou
   en soudage. Les libellés visibles parlent de « gestes du métier », de
   « stage » et d'« entreprise », jamais de chantier.

   ⚠️ La CLÉ TECHNIQUE de l'option de licence (CARNET_OPTION, ci-dessus)
   reste neutre et ne contient PAS le nom commercial : renommer le produit
   ne doit jamais obliger à toucher au SQL ni aux lignes déjà en base.
   ------------------------------------------------------------------ */
const CARNET_NOM = "StageQuest";

/* ------------------------------------------------------------------ */
/* Libellés (le reste de l'app est bilingue, le carnet aussi)           */
/* ------------------------------------------------------------------ */
const CARNET_T = {
  fr: {
    titre: CARNET_NOM,
    sousGestes: "Les gestes du métier que tu fais valider",
    sousAjouter: "Montre ce que tu as fait aujourd'hui",
    sousHeures: "Ton journal, 10 secondes par jour",
    sousReglages: "Mon stage",
    tGestes: "Gestes", tAjouter: "Ajouter", tHeures: "Heures",
    gestesValides: "gestes validés",
    badgesTitre: "Mes badges de stage",
    aDebloquer: "À débloquer",
    ajouterCta: "Ajouter une réalisation",
    photo: "Photo du travail",
    photoAide: "Touche pour prendre une photo ou en choisir une.",
    photoChanger: "Touche pour changer la photo",
    photoRetirer: "Retirer la photo",
    geste: "Geste du métier", engin: "Engin utilisé",
    note: "Note pour ton enseignant (facultatif)",
    notePlaceholder: "Ex. : terrain nivelé pour la dalle du garage",
    envoyer: "Envoyer à mon enseignant",
    statut: { attente: "En attente", validee: "Validée", refaire: "À refaire", afaire: "À faire" },
    enFile: "pas encore transmis, partira dès que tu auras du réseau",
    envoyeLe: "Envoyée le",
    valideeLe: "Validée le",
    retourProf: "Ton enseignant",
    refaireAide: "Touche pour refaire ce geste et le renvoyer.",
    heuresTitre: "Heures de stage", objectif: "objectif",
    ajouterJournee: "Ajouter une journée", date: "Date", heures: "Heures",
    enginPrincipal: "Engin principal", journal: "Journal",
    journalLocal: "Ton journal reste sur ton appareil. Seul le total est transmis à ton enseignant.",
    ajouterJournal: "Ajouter au journal",
    nom: "Prénom ou surnom qui te désigne au carnet",
    nomPlaceholder: "Ex. : Alex T.",
    employeur: "Entreprise où tu fais ton stage",
    employeurPlaceholder: "Ex. : Excavation Rivard",
    objectifHeures: "Objectif d'heures de stage",
    enregistrer: "Enregistrer",
    consentTitre: `Bienvenue dans ${CARNET_NOM}`,
    consentTexte: `Pour faire valider tes gestes, ${CARNET_NOM} transmet à ton enseignant : la photo que tu prends, le prénom ou surnom que tu choisis, le nom de ton entreprise de stage et ta note. Ton enseignant est la seule personne qui les voit. Rien ne sort ailleurs, et c'est toi qui décides.`,
    consentCase: "J'accepte que ces informations soient transmises à mon enseignant.",
    consentMineur: "Si tu as moins de 14 ans, un parent doit donner son accord à ton enseignant.",
    photoLocale: "Après l'envoi, la photo est conservée dans ton carnet au centre de formation, pas sur ton téléphone.",
    besoinClasse: "Rejoins d'abord ta classe (bouton 👥 en haut) : c'est ce qui relie ton carnet à ton enseignant.",
    besoinInfos: "Remplis d'abord « Mon stage » : ton prénom ou surnom, et l'entreprise.",
    maClasse: "Ma classe",
    modifierStage: "Modifier",
    stageChez: "Stage chez",
    stageVide: "Stage non renseigné",
    retour: "← Retour",
    dejaValide: "Ce geste est déjà validé. Choisis-en un autre.",
    erreurPhoto: "Cette photo ne s'ouvre pas. Essaie une photo JPG ou PNG.",
    erreurPhotoGrosse: "Cette photo est trop lourde même après compression. Essaie une autre photo.",
    erreurHeures: "Entre une date et un nombre d'heures entre 0,5 et 14.",
    erreurStockage: "La mémoire de ton téléphone est pleine. Attends d'avoir du réseau pour envoyer ce qui est en file, puis réessaie.",
    supprimer: "Supprimer"
  },
  en: {
    titre: CARNET_NOM,
    sousGestes: "The trade tasks you get signed off",
    sousAjouter: "Show what you did today",
    sousHeures: "Your log, 10 seconds a day",
    sousReglages: "My placement",
    tGestes: "Tasks", tAjouter: "Add", tHeures: "Hours",
    gestesValides: "tasks signed off",
    badgesTitre: "My placement badges",
    aDebloquer: "To unlock",
    ajouterCta: "Add an entry",
    photo: "Photo of the work",
    photoAide: "Tap to take a photo or pick one.",
    photoChanger: "Tap to change the photo",
    photoRetirer: "Remove photo",
    geste: "Trade task", engin: "Machine used",
    note: "Note for your teacher (optional)",
    notePlaceholder: "E.g. graded the pad for the garage slab",
    envoyer: "Send to my teacher",
    statut: { attente: "Pending", validee: "Signed off", refaire: "Redo", afaire: "To do" },
    enFile: "not sent yet, it will go as soon as you have a signal",
    envoyeLe: "Sent on",
    valideeLe: "Signed off on",
    retourProf: "Your teacher",
    refaireAide: "Tap to redo this task and send it again.",
    heuresTitre: "Placement hours", objectif: "target",
    ajouterJournee: "Add a day", date: "Date", heures: "Hours",
    enginPrincipal: "Main machine", journal: "Log",
    journalLocal: "Your log stays on your device. Only the total is sent to your teacher.",
    ajouterJournal: "Add to log",
    nom: "First name or nickname that identifies you in the logbook",
    nomPlaceholder: "E.g. Alex T.",
    employeur: "Company where you do your placement",
    employeurPlaceholder: "E.g. Rivard Excavating",
    objectifHeures: "Placement hours target",
    enregistrer: "Save",
    consentTitre: `Welcome to ${CARNET_NOM}`,
    consentTexte: `To get your tasks signed off, ${CARNET_NOM} sends your teacher: the photo you take, the first name or nickname you choose, the name of your placement company and your note. Your teacher is the only person who sees them. Nothing goes anywhere else, and it is your choice.`,
    consentCase: "I agree to this information being sent to my teacher.",
    consentMineur: "If you are under 14, a parent must give their agreement to your teacher.",
    photoLocale: "Once sent, the photo is kept in your logbook at the training centre, not on your phone.",
    besoinClasse: "Join your class first (👥 button at the top): that is what links your logbook to your teacher.",
    besoinInfos: "Fill in “My placement” first: your first name or nickname, and the company.",
    maClasse: "My class",
    modifierStage: "Edit",
    stageChez: "Placement at",
    stageVide: "Placement not set",
    retour: "← Back",
    dejaValide: "That task is already signed off. Pick another one.",
    erreurPhoto: "That photo will not open. Try a JPG or PNG.",
    erreurPhotoGrosse: "That photo is too heavy even after compression. Try another one.",
    erreurHeures: "Enter a date and a number of hours between 0.5 and 14.",
    erreurStockage: "Your phone's storage is full. Wait until you have a signal so the queue can be sent, then try again.",
    supprimer: "Delete"
  }
};

function ct() { return CARNET_T[state.lang] || CARNET_T.fr; }
function carnetFr() { return state.lang !== "en"; }
function gesteNom(g) { return carnetFr() ? g.nom_fr : g.nom_en; }
function gesteBadge(g) { return carnetFr() ? g.badge_fr : g.badge_en; }
function enginNom(e) { return carnetFr() ? e.fr : e.en; }

/* ------------------------------------------------------------------ */
/* Disponibilité du module                                             */
/* ------------------------------------------------------------------ */
/* `carnetDisponible()` est définie dans app.js (seul endroit qui connaît
   `isLicensed()`), avec une garde pour que l'app de révision continue de
   fonctionner même si ce fichier n'est pas chargé.

   `state.carnetOption` est un cache local : une fois l'option confirmée
   par le serveur, l'élève garde son carnet sur un chantier sans réseau.
   Elle est revalidée à chaque lancement en ligne, et retombe à false si
   le centre perd l'option.

   `option_licence` est une fonction security definer : jamais de liste
   de codes ni d'options côté navigateur, un booléen et rien d'autre. */
async function carnetRefreshOption() {
  if (!isLicensed() || !navigator.onLine) return;
  const actif = await carnetRpc("option_licence", {
    p_code: state.accessCode, p_app: APP_ID, p_option: CARNET_OPTION
  });
  if (actif === null) return;              // 404 (SQL pas exécuté) ou réseau : on ne change rien
  if (!!actif !== !!state.carnetOption) {
    state.carnetOption = actif === true;
    if (!state.carnetOption) carnetView = null;
    saveState();
    render();
  }
}

/* ------------------------------------------------------------------ */
/* État local                                                          */
/* ------------------------------------------------------------------ */
var carnetView = null;        // null | "gestes" | "ajouter" | "heures" | "reglages"
var carnetGestePre = null;    // geste présélectionné dans le formulaire
var carnetPhotoDraft = null;  // data URI de la photo en cours de saisie
var carnetErreur = "";

function carnetState() {
  if (!state.carnet || typeof state.carnet !== "object") {
    state.carnet = {
      consentement: false,
      nom: "",
      employeur: "",
      objectif: CARNET_OBJECTIF_DEFAUT,
      realisations: [],   // voir carnetSoumettre() pour la forme d'une ligne
      heures: [],         // { date, h, engin } — reste SUR L'APPAREIL
      heuresEnFile: false
    };
  }
  const c = state.carnet;
  if (!Array.isArray(c.realisations)) c.realisations = [];
  if (!Array.isArray(c.heures)) c.heures = [];
  if (typeof c.objectif !== "number" || !(c.objectif > 0)) c.objectif = CARNET_OBJECTIF_DEFAUT;
  return c;
}

/* Clé d'upsert générée sur l'appareil, AVANT tout réseau : ce n'est pas un
   secret, elle n'apparaît dans aucune URL. Elle sert uniquement à ce que la
   file hors ligne puisse rejouer sans créer de doublon côté serveur. */
function carnetRef() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b).map((o) => o.toString(16).padStart(2, "0")).join("");
}

/* Dernière réalisation d'un geste (la plus récente prime). */
function carnetDerniere(gesteId) {
  const l = carnetState().realisations.filter((r) => r.gesteId === gesteId);
  l.sort((a, b) => (a.creeLe < b.creeLe ? 1 : a.creeLe > b.creeLe ? -1 : 0));
  return l[0] || null;
}
function carnetStatutGeste(gesteId) {
  const r = carnetDerniere(gesteId);
  return r ? r.statut : "afaire";
}
function carnetNbValides() {
  return CARNET_GESTES.filter((g) => carnetStatutGeste(g.id) === "validee").length;
}
function carnetTotalHeures() {
  return carnetState().heures.reduce((t, x) => t + (Number(x.h) || 0), 0);
}

/* ------------------------------------------------------------------ */
/* Synchronisation — réutilise le mécanisme de flushSync()             */
/* ------------------------------------------------------------------ */
/* Pas de deuxième file inventée : la file EST l'état local. Une réalisation
   avec `aEnvoyer: true` attend son tour. `carnetFlush()` est appelée par
   `flushSync()` d'app.js — donc au lancement, à chaque saisie, et sur
   l'événement "online". `carnet_soumettre` faisant un upsert sur
   (app, appareil_id, ref), un rejeu est sans effet : la file est idempotente.

   Dès qu'une réalisation est confirmée reçue, on LIBÈRE la photo du
   localStorage (`r.photo = null`, `photoEnvoyee = true`). Sans cela, huit
   photos à 90 ko saturent le quota d'environ 5 Mo d'une origine et
   `saveState()` commence à échouer. La photo vit désormais dans le carnet,
   au centre de formation. */
async function carnetFlush() {
  if (!carnetDisponible()) return;
  const c = carnetState();
  if (!c.consentement || !state.classCode) return;   // sans consentement ni classe, rien ne part
  if (!navigator.onLine) return;

  let change = false;

  for (const r of c.realisations) {
    if (!r.aEnvoyer) continue;
    const resultat = await carnetRpc("carnet_soumettre", {
      p_licence: state.accessCode,
      p_app: APP_ID,
      p_classe: state.classCode,
      p_appareil: deviceId(),
      p_ref: r.ref,
      p_nom: c.nom || "",
      p_totem: totemLabel(state.totem, state.lang),
      p_employeur: c.employeur || "",
      p_geste: r.gesteId,
      p_geste_nom: r.gesteNom || "",
      p_engin: r.engin || "",
      p_note: r.note || "",
      p_photo: r.photo || null
    });
    if (resultat === "ok") {
      r.aEnvoyer = false;
      if (r.photo) { r.photo = null; r.photoEnvoyee = true; }
      change = true;
    } else if (resultat === "non-autorise") {
      state.carnetOption = false;                 // le centre n'a plus l'option
      change = true;
      break;
    } else {
      break;                                      // réseau : on réessaiera, dans l'ordre
    }
  }

  if (c.heuresEnFile) {
    const resultat = await carnetRpc("carnet_heures_maj", {
      p_licence: state.accessCode,
      p_app: APP_ID,
      p_classe: state.classCode,
      p_appareil: deviceId(),
      p_nom: c.nom || "",
      p_totem: totemLabel(state.totem, state.lang),
      p_total: carnetTotalHeures(),
      p_objectif: c.objectif
    });
    if (resultat === "ok") { c.heuresEnFile = false; change = true; }
  }

  if (change) { saveState(); render(); }
}

/* LE RETOUR VERS L'ÉLÈVE.
   Même principe que `maybeBackfillCfp()` : une relecture silencieuse au
   démarrage et au retour du réseau, aucune notification poussée. La RPC
   `carnet_etat_eleve` ne rend QUE les réalisations de cet identifiant
   d'appareil, et ni photo, ni nom, ni courriel d'enseignant. */
async function carnetSyncStatuts() {
  if (!carnetDisponible() || !navigator.onLine) return;
  const c = carnetState();
  if (!c.realisations.some((r) => !r.aEnvoyer && r.statut === "attente")) return;
  const lignes = await carnetRpc("carnet_etat_eleve", { p_app: APP_ID, p_appareil: deviceId() });
  if (!Array.isArray(lignes)) return;
  let change = false;
  for (const ligne of lignes) {
    const r = c.realisations.find((x) => x.ref === ligne.ref);
    if (!r) continue;
    const nouveau = ligne.statut === "validee" || ligne.statut === "refaire" ? ligne.statut : "attente";
    if (nouveau !== r.statut || (ligne.commentaire_prof || "") !== (r.commentaire || "")) {
      r.statut = nouveau;
      r.commentaire = ligne.commentaire_prof || "";
      r.decideLe = ligne.decide_le || null;
      change = true;
    }
  }
  if (change) { saveState(); render(); }
}

/* Appel RPC générique. Renvoie la valeur JSON, ou null en cas d'échec
   réseau / de fonction absente (SQL pas encore exécuté). */
async function carnetRpc(nom, corps) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nom}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      },
      body: JSON.stringify(corps)
    });
    if (!res.ok) return null;
    const txt = await res.text();
    if (!txt) return null;
    try { return JSON.parse(txt); } catch (e) { return txt; }
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */
function carnetGo(vue) {
  if (!carnetDisponible()) { carnetView = null; render(); return; }
  carnetErreur = "";
  if (vue === "ajouter") carnetPhotoDraft = null;
  carnetView = vue || "gestes";
  if (typeof currentQuest !== "undefined") currentQuest = null;
  render();
  if (carnetView === "gestes") carnetSyncStatuts();
}
function carnetQuitter() { carnetView = null; render(); }
function carnetGesteDirect(id) { carnetGestePre = id; carnetGo("ajouter"); }

/* ------------------------------------------------------------------ */
/* Rendu                                                              */
/* ------------------------------------------------------------------ */
function renderCarnet() {
  const T = ct();
  const c = carnetState();
  let corps, sous;
  if (!c.consentement)                { corps = carnetConsentement(); sous = T.sousReglages; }
  else if (carnetView === "reglages") { corps = carnetReglages();     sous = T.sousReglages; }
  else if (carnetView === "ajouter")  { corps = carnetFormulaire();   sous = T.sousAjouter; }
  else if (carnetView === "heures")   { corps = carnetHeures();       sous = T.sousHeures; }
  else                                { corps = carnetGestes();       sous = T.sousGestes; }

  const sousOnglets = c.consentement && carnetView !== "reglages" ? `
    <nav class="tabs carnet-subtabs">
      <button class="${carnetView === 'gestes' || !carnetView ? 'active' : ''}" onclick="carnetGo('gestes')">🧱 ${T.tGestes}</button>
      <button class="${carnetView === 'ajouter' ? 'active' : ''}" onclick="carnetGo('ajouter')">📷 ${T.tAjouter}</button>
      <button class="${carnetView === 'heures' ? 'active' : ''}" onclick="carnetGo('heures')">⏱️ ${T.tHeures}</button>
    </nav>` : "";

  root.innerHTML = header("carnet") + sousOnglets + `
    <div class="content">
      <div class="carnet-head">
        <h2>${escapeHtml(T.titre)}</h2>
        <p>${escapeHtml(sous)}</p>
      </div>
      ${carnetErreur ? `<p class="join-error">⚠️ ${escapeHtml(carnetErreur)}</p>` : ""}
      ${corps}
    </div>
    ${privacyFooter()}`;
}

/* --- Consentement (Loi 25) : premier écran, bloquant --- */
function carnetConsentement() {
  const T = ct();
  return `
    <div class="carnet-card carnet-consent">
      <h3>${T.consentTitre}</h3>
      <p>${T.consentTexte}</p>
      <p class="carnet-mineur">${T.consentMineur}</p>
      <div class="share-toggle" onclick="carnetAccepter()">
        <div class="tog"></div>
        <div class="share-lbl"><b>${T.consentCase}</b></div>
      </div>
      <a class="carnet-lien" href="https://productions-imedias.com/confidentialite.html" target="_blank" rel="noopener">${t("privacy")}</a>
    </div>`;
}
function carnetAccepter() {
  carnetState().consentement = true;
  saveState();
  carnetGo(state.classCode && carnetState().nom ? "gestes" : "reglages");
}

/* --- Mon stage : prénom/surnom, employeur, objectif --- */
function carnetReglages() {
  const T = ct();
  const c = carnetState();
  return `
    <div class="carnet-card">
      ${!state.classCode ? `<p class="carnet-avis">${T.besoinClasse}</p>` : ""}
      <label class="field-label" for="carnetNom">${T.nom}</label>
      <input id="carnetNom" class="carnet-input" type="text" maxlength="40"
        placeholder="${escapeHtml(T.nomPlaceholder)}" value="${escapeHtml(c.nom)}" />
      <label class="field-label" for="carnetEmployeur">${T.employeur}</label>
      <input id="carnetEmployeur" class="carnet-input" type="text" maxlength="80"
        placeholder="${escapeHtml(T.employeurPlaceholder)}" value="${escapeHtml(c.employeur)}" />
      <label class="field-label" for="carnetObjectif">${T.objectifHeures}</label>
      <input id="carnetObjectif" class="carnet-input" type="number" min="1" max="2000" step="1"
        inputmode="numeric" value="${Number(c.objectif)}" />
      <button class="cta" onclick="carnetEnregistrerReglages()">${T.enregistrer}</button>
      <button class="secondary" onclick="carnetGo('gestes')">${T.retour}</button>
    </div>`;
}
function carnetEnregistrerReglages() {
  const c = carnetState();
  c.nom = (document.getElementById("carnetNom").value || "").trim().slice(0, 40);
  c.employeur = (document.getElementById("carnetEmployeur").value || "").trim().slice(0, 80);
  const obj = Number(document.getElementById("carnetObjectif").value);
  c.objectif = obj > 0 && obj <= 2000 ? obj : CARNET_OBJECTIF_DEFAUT;
  // Le nom et l'employeur figurent sur chaque réalisation côté enseignant :
  // on remet en file ce qui est déjà parti pour qu'il s'y mette à jour.
  // (La photo, elle, est déjà libérée : la RPC ne l'écrase pas avec un NULL.)
  for (const r of c.realisations) r.aEnvoyer = true;
  if (c.heures.length) c.heuresEnFile = true;
  saveState();
  carnetGo("gestes");
  flushSync();
}

/* --- Liste des gestes + badges --- */
function carnetGestes() {
  const T = ct();
  const c = carnetState();
  const v = carnetNbValides();
  const pct = Math.round((v / CARNET_GESTES.length) * 100);

  const badges = CARNET_GESTES.map((g) => {
    const on = carnetStatutGeste(g.id) === "validee";
    return `<div class="carnet-badge ${on ? "on" : ""}">
      <div class="carnet-hex">${on ? g.icon : "🔒"}</div>
      <span>${on ? escapeHtml(gesteBadge(g)) : T.aDebloquer}</span>
    </div>`;
  }).join("");

  const lignes = CARNET_GESTES.map((g) => {
    const s = carnetStatutGeste(g.id);
    const r = carnetDerniere(g.id);
    const cliquable = s === "afaire" || s === "refaire";
    let bas = "";
    if (s === "refaire" && r) {
      bas = `<div class="carnet-sub refaire">${T.retourProf} : « ${escapeHtml(r.commentaire || "—")} »</div>
             <div class="carnet-sub">${T.refaireAide}</div>`;
    } else if (s === "attente" && r) {
      bas = `<div class="carnet-sub">${T.envoyeLe} ${carnetDate(r.creeLe)}${r.aEnvoyer ? " · " + T.enFile : ""}</div>`;
    } else if (s === "validee" && r) {
      bas = `<div class="carnet-sub ok">${T.valideeLe} ${carnetDate(r.decideLe || r.creeLe)}${r.commentaire ? " · « " + escapeHtml(r.commentaire) + " »" : ""}</div>`;
    }
    return `<div class="carnet-row ${cliquable ? "cliquable" : ""}" ${cliquable ? `onclick="carnetGesteDirect('${g.id}')"` : ""}>
      <div class="carnet-row-main">
        <span class="carnet-row-icon">${g.icon}</span>
        <span class="carnet-row-nom">${escapeHtml(gesteNom(g))}</span>
        <span class="carnet-pill ${s}">${T.statut[s]}</span>
      </div>
      ${bas}
    </div>`;
  }).join("");

  return `
    <div class="carnet-card carnet-stage" onclick="carnetGo('reglages')">
      <div class="carnet-stage-txt">
        <div class="carnet-eyebrow">${c.employeur ? T.stageChez : ""}</div>
        <b>${escapeHtml(c.employeur || T.stageVide)}</b>
        <div class="carnet-sub">${escapeHtml(c.nom || "—")}${state.classCode ? " · " + escapeHtml(state.cfpNom || state.classCode) : ""}</div>
      </div>
      <span class="carnet-modifier">${T.modifierStage}</span>
    </div>

    <div class="carnet-card">
      <div class="carnet-level"><b>${v} / ${CARNET_GESTES.length}</b><span>${T.gestesValides}</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>

    <div class="carnet-card">
      <h3>${T.badgesTitre}</h3>
      <div class="carnet-badges">${badges}</div>
    </div>

    <div class="carnet-list">${lignes}</div>
    <button class="cta" onclick="carnetGo('ajouter')">📷 ${T.ajouterCta}</button>`;
}

/* --- Formulaire d'ajout --- */
function carnetFormulaire() {
  const T = ct();
  const c = carnetState();
  if (!state.classCode) return `<div class="carnet-card"><p class="carnet-avis">${T.besoinClasse}</p>
    <button class="secondary" onclick="goClassJoin()">👥 ${T.maClasse}</button></div>`;
  if (!c.nom || !c.employeur) return `<div class="carnet-card"><p class="carnet-avis">${T.besoinInfos}</p>
    <button class="cta" onclick="carnetGo('reglages')">${T.sousReglages}</button></div>`;

  const options = CARNET_GESTES.map((g) => {
    const s = carnetStatutGeste(g.id);
    const sel = carnetGestePre === g.id ? " selected" : "";
    const dis = s === "validee" ? " disabled" : "";
    const suffixe = s !== "afaire" ? ` (${T.statut[s].toLowerCase()})` : "";
    return `<option value="${g.id}"${sel}${dis}>${escapeHtml(gesteNom(g) + suffixe)}</option>`;
  }).join("");
  const engins = CARNET_ENGINS.map((e) => `<option>${escapeHtml(enginNom(e))}</option>`).join("");

  return `
    <div class="carnet-card">
      <label class="carnet-drop" for="carnetPhotoInput">
        ${carnetPhotoDraft
          ? `<img src="${carnetPhotoDraft}" alt="" /><span>${T.photoChanger}</span>`
          : `<span class="carnet-drop-icon">📷</span><b>${T.photo}</b><span>${T.photoAide}</span>`}
      </label>
      <input id="carnetPhotoInput" class="carnet-file" type="file" accept="image/*" capture="environment"
        onchange="carnetPhotoChoisie(this)" />
      ${carnetPhotoDraft ? `<button class="secondary" onclick="carnetRetirerPhoto()">${T.photoRetirer}</button>` : ""}

      <label class="field-label" for="carnetGesteSel">${T.geste}</label>
      <select id="carnetGesteSel" class="carnet-input">${options}</select>

      <label class="field-label" for="carnetEnginSel">${T.engin}</label>
      <select id="carnetEnginSel" class="carnet-input">${engins}</select>

      <label class="field-label" for="carnetNote">${T.note}</label>
      <textarea id="carnetNote" class="carnet-input carnet-textarea" maxlength="500"
        placeholder="${escapeHtml(T.notePlaceholder)}"></textarea>

      <button class="cta" onclick="carnetSoumettre()">${T.envoyer}</button>
      <button class="secondary" onclick="carnetGo('gestes')">${T.retour}</button>
      <p class="carnet-loi25">${T.photoLocale}</p>
    </div>`;
}

/* Redimensionne et compresse la photo dans le navigateur, et REFUSE au-delà
   du plafond : rien de lourd ne part sur le réseau d'un chantier, et la
   ligne ne peut pas dépasser la contrainte de la base. */
function carnetLirePhoto(file) {
  return new Promise((resolve) => {
    if (!file || !/^image\//.test(file.type || "")) return resolve({ err: "type" });
    const fr = new FileReader();
    fr.onerror = () => resolve({ err: "lecture" });
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => resolve({ err: "lecture" });
      img.onload = () => {
        const essais = [[720, 0.72], [720, 0.6], [600, 0.6], [600, 0.5], [480, 0.5]];
        for (const [cote, q] of essais) {
          const s = Math.min(1, cote / Math.max(img.width, img.height));
          const cv = document.createElement("canvas");
          cv.width = Math.max(1, Math.round(img.width * s));
          cv.height = Math.max(1, Math.round(img.height * s));
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          const url = cv.toDataURL("image/jpeg", q);
          if (url.length <= CARNET_PHOTO_MAX) return resolve({ photo: url });
        }
        resolve({ err: "grosse" });
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

async function carnetPhotoChoisie(input) {
  const f = input && input.files && input.files[0];
  if (!f) return;
  const T = ct();
  const r = await carnetLirePhoto(f);
  if (r.photo) { carnetPhotoDraft = r.photo; carnetErreur = ""; }
  else { carnetPhotoDraft = null; carnetErreur = r.err === "grosse" ? T.erreurPhotoGrosse : T.erreurPhoto; }
  render();
}
function carnetRetirerPhoto() { carnetPhotoDraft = null; render(); }

function carnetSoumettre() {
  const T = ct();
  const c = carnetState();
  const gesteId = document.getElementById("carnetGesteSel").value;
  const g = CARNET_GESTES.find((x) => x.id === gesteId);
  if (!g) return;
  if (carnetStatutGeste(gesteId) === "validee") { carnetErreur = T.dejaValide; render(); return; }

  const ligne = {
    ref: carnetRef(),
    gesteId: gesteId,
    gesteNom: gesteNom(g),
    engin: document.getElementById("carnetEnginSel").value || "",
    note: (document.getElementById("carnetNote").value || "").trim().slice(0, 500),
    photo: carnetPhotoDraft || null,
    photoEnvoyee: false,
    statut: "attente",      // seul l'enseignant peut faire bouger ce champ
    commentaire: "",
    creeLe: new Date().toISOString(),
    decideLe: null,
    aEnvoyer: true          // la file hors ligne s'en occupe (flushSync)
  };
  c.realisations.push(ligne);

  // Une photo pèse ~90 ko en base64 : si le quota du navigateur est atteint,
  // on le dit à l'élève au lieu de perdre silencieusement sa réalisation.
  if (!saveState()) {
    c.realisations.pop();
    carnetErreur = T.erreurStockage;
    render();
    flushSync();            // on tente de libérer la file au cas où
    return;
  }

  carnetPhotoDraft = null;
  carnetGestePre = null;
  carnetErreur = "";
  carnetGo("gestes");
  flushSync();              // part tout de suite si le réseau est là, sinon reste en file
}

/* --- Journal d'heures (local) --- */
function carnetHeures() {
  const T = ct();
  const c = carnetState();
  const h = carnetTotalHeures();
  const pct = Math.min(100, Math.round((h / c.objectif) * 100));
  const engins = CARNET_ENGINS.map((e) => `<option>${escapeHtml(enginNom(e))}</option>`).join("");
  const journal = c.heures.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((x) => `
    <div class="carnet-log-row">
      <span class="carnet-log-date">${escapeHtml(x.date)}</span>
      <span class="carnet-log-engin">${escapeHtml(x.engin || "")}</span>
      <span class="carnet-log-h">${carnetNb(x.h)} h</span>
      <button class="carnet-log-del" onclick="carnetSupprimerHeure('${escapeHtml(x.date)}',${Number(x.h)})" title="${T.supprimer}">✕</button>
    </div>`).join("") || `<p class="carnet-sub">—</p>`;

  return `
    <div class="carnet-card">
      <div class="carnet-level"><b>${carnetNb(h)} h</b><span>${T.objectif} ${c.objectif} h</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <p class="carnet-sub">${T.journalLocal}</p>
    </div>
    <div class="carnet-card">
      <h3>${T.ajouterJournee}</h3>
      <div class="carnet-inline">
        <div>
          <label class="field-label" for="carnetHDate">${T.date}</label>
          <input id="carnetHDate" class="carnet-input" type="date" value="${carnetAujourdhui()}" max="${carnetAujourdhui()}" />
        </div>
        <div>
          <label class="field-label" for="carnetHH">${T.heures}</label>
          <input id="carnetHH" class="carnet-input" type="number" min="0.5" max="14" step="0.5" inputmode="decimal" value="8" />
        </div>
      </div>
      <label class="field-label" for="carnetHEngin">${T.enginPrincipal}</label>
      <select id="carnetHEngin" class="carnet-input">${engins}</select>
      <button class="cta" onclick="carnetAjouterHeures()">${T.ajouterJournal}</button>
    </div>
    <div class="carnet-card">
      <h3>${T.journal}</h3>
      <div class="carnet-log">${journal}</div>
    </div>`;
}

function carnetNb(n) { return String(n).replace(".", carnetFr() ? "," : "."); }
function carnetAujourdhui() { return new Date().toISOString().slice(0, 10); }
function carnetDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(carnetFr() ? "fr-CA" : "en-CA", { day: "numeric", month: "short" });
}

function carnetAjouterHeures() {
  const T = ct();
  const c = carnetState();
  const d = document.getElementById("carnetHDate").value;
  const h = Number(document.getElementById("carnetHH").value);
  if (!d || !(h >= 0.5 && h <= 14)) { carnetErreur = T.erreurHeures; render(); return; }
  c.heures.push({ date: d, h: h, engin: document.getElementById("carnetHEngin").value || "" });
  c.heuresEnFile = true;
  carnetErreur = "";
  saveState();
  render();
  flushSync();
}
function carnetSupprimerHeure(date, h) {
  const c = carnetState();
  const i = c.heures.findIndex((x) => x.date === date && Number(x.h) === Number(h));
  if (i < 0) return;
  c.heures.splice(i, 1);
  c.heuresEnFile = true;
  saveState();
  render();
  flushSync();
}

/* ------------------------------------------------------------------ */
/* Exposition globale (les onclick= des templates innerHTML)           */
/* ------------------------------------------------------------------ */
window.carnetGo = carnetGo;
window.carnetQuitter = carnetQuitter;
window.carnetGesteDirect = carnetGesteDirect;
window.carnetAccepter = carnetAccepter;
window.carnetEnregistrerReglages = carnetEnregistrerReglages;
window.carnetPhotoChoisie = carnetPhotoChoisie;
window.carnetRetirerPhoto = carnetRetirerPhoto;
window.carnetSoumettre = carnetSoumettre;
window.carnetAjouterHeures = carnetAjouterHeures;
window.carnetSupprimerHeure = carnetSupprimerHeure;
