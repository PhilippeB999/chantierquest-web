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
      geste et l'engin — ou les ÉCRIT lui-même si aucune entrée des
      listes ne décrit son cas —, ajoute une note, et envoie.
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

/* ------------------------------------------------------------------
   TEXTE LIBRE — « Autre : je l'écris moi-même »

   Les 8 gestes ci-dessus sont une liste de démonstration, et aucune
   liste d'engins ne couvrira tous les chantiers. Un élève qui ne
   trouve pas son cas doit pouvoir le DÉCRIRE : la liste déroulante
   reste le chemin rapide (et la seule donnée vraiment agrégeable),
   mais chacun des trois choix se termine par « Autre ».

   · Geste libre  → `geste_id = 'autre'` + le texte dans `geste_nom`,
     la colonne « libellé figé au moment de la saisie ». Le schéma
     n'a PAS à changer.
   · Engin libre  → la colonne `engin` est déjà du texte libre.
   · Engin principal du journal d'heures → reste SUR L'APPAREIL
     (seul le total part), donc aucun échappement serveur à prévoir.

   Sentinelle du <select> : `__autre__` ne peut pas collisionner avec
   un nom d'engin de la liste, et n'est jamais écrite en base.

   ⚠️ La clé d'upsert de la base est (app, appareil_id, ref), et `ref`
   est un UUID tiré PAR RÉALISATION (voir carnetRef()) — elle ne dérive
   pas de `geste_id`. Deux gestes « autre » différents ne peuvent donc
   pas s'écraser l'un l'autre. C'est la raison pour laquelle le texte
   libre tient sans toucher au schéma : ne jamais dériver `ref` d'un
   identifiant de geste.
   ------------------------------------------------------------------ */
const CARNET_GESTE_AUTRE = "autre";     // valeur écrite dans geste_id
const CARNET_AUTRE = "__autre__";       // sentinelle d'interface (engins)

/* Plafonds de saisie. Un geste et un engin se décrivent en quelques
   mots. Volontairement SOUS les plafonds du serveur (geste_nom tronqué
   à 120, engin à 60 par carnet_soumettre) : l'app refuse avant que la
   base n'ait à tronquer, donc l'élève voit exactement ce qui part. */
const CARNET_GESTE_LIBRE_MAX = 80;
const CARNET_ENGIN_LIBRE_MAX = 40;

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
    autreOption: "Autre — je l'écris moi-même",
    gesteLibre: "Écris le geste que tu as fait",
    gesteLibrePH: "Ex. : poser une conduite de drainage",
    enginLibre: "Écris l'engin que tu as utilisé",
    enginLibrePH: "Ex. : mini-pelle compacte",
    libreSansBadge: "Un geste que tu écris toi-même part à ton enseignant et il peut le valider, mais il ne débloque pas de badge.",
    mesGestesLibres: "Mes gestes écrits à la main",
    libresSansBadge: `Ton enseignant les valide comme les autres, mais ils ne font pas partie des ${CARNET_GESTES.length} badges.`,
    gesteLibreVide: "Geste sans nom",
    erreurGesteLibre: "Écris le geste que tu as fait avant d'envoyer.",
    erreurEnginLibre: "Écris l'engin que tu as utilisé avant d'envoyer.",
    erreurEnginJournal: "Écris l'engin principal de ta journée.",
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
    supprimer: "Supprimer",
    flashValidee: "Ton enseignant vient de valider :",
    flashRefaire: "Ton enseignant te demande de refaire :"
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
    autreOption: "Other — I'll write it myself",
    gesteLibre: "Write the task you did",
    gesteLibrePH: "E.g. lay a drainage pipe",
    enginLibre: "Write the machine you used",
    enginLibrePH: "E.g. compact mini excavator",
    libreSansBadge: "A task you write yourself goes to your teacher and can be signed off, but it does not unlock a badge.",
    mesGestesLibres: "My own written tasks",
    libresSansBadge: `Your teacher signs them off like the others, but they are not part of the ${CARNET_GESTES.length} badges.`,
    gesteLibreVide: "Unnamed task",
    erreurGesteLibre: "Write the task you did before sending.",
    erreurEnginLibre: "Write the machine you used before sending.",
    erreurEnginJournal: "Write the main machine for your day.",
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
    supprimer: "Delete",
    flashValidee: "Your teacher has just signed off:",
    flashRefaire: "Your teacher is asking you to redo:"
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
var carnetGestePreLibre = ""; // texte libre présélectionné (reprise d'un « à refaire »)
var carnetPhotoDraft = null;  // data URI de la photo en cours de saisie
var carnetErreur = "";
var carnetFlash = null;       // { ok, txt } — la décision du prof vient d'arriver

/* BROUILLONS DU FORMULAIRE.
   `render()` réécrit tout le innerHTML : sans ces variables, choisir une
   photo ou tomber sur un message d'erreur effacerait le texte que l'élève
   vient de taper — et un champ libre OBLIGATOIRE qui disparaît au moment
   où on reproche à l'élève de l'avoir laissé vide serait incompréhensible.
   `carnetMemoriser()` les relit du DOM avant chaque render(). */
var carnetGesteSel = null;    // valeur du <select> geste
var carnetGesteLibre = "";    // texte du geste écrit à la main
var carnetEnginSel = null;    // valeur du <select> engin
var carnetEnginLibre = "";    // texte de l'engin écrit à la main
var carnetNoteDraft = "";     // note en cours de saisie
var carnetHEnginSel = null;   // <select> engin principal (journal d'heures)
var carnetHEnginLibre = "";   // engin principal écrit à la main

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

/* Dernière réalisation d'un geste de la LISTE (la plus récente prime).
   ⚠️ Volontairement aveugle à `autre` : les gestes écrits à la main
   partagent tous le même `geste_id`, ils n'ont donc ni « dernier » ni
   statut commun. Chacun vit par sa `ref`, et ils sont affichés à part
   (voir carnetGestesLibres()). Sans cette garde, un geste libre validé
   aurait bloqué l'envoi de tous les suivants. */
function carnetDerniere(gesteId) {
  if (gesteId === CARNET_GESTE_AUTRE) return null;
  const l = carnetState().realisations.filter((r) => r.gesteId === gesteId);
  l.sort((a, b) => (a.creeLe < b.creeLe ? 1 : a.creeLe > b.creeLe ? -1 : 0));
  return l[0] || null;
}
function carnetStatutGeste(gesteId) {
  if (gesteId === CARNET_GESTE_AUTRE) return "afaire";
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
  const valides = [], refaits = [];
  for (const ligne of lignes) {
    const r = c.realisations.find((x) => x.ref === ligne.ref);
    if (!r) continue;
    const nouveau = ligne.statut === "validee" || ligne.statut === "refaire" ? ligne.statut : "attente";
    if (nouveau !== r.statut || (ligne.commentaire_prof || "") !== (r.commentaire || "")) {
      const avant = r.statut;
      r.statut = nouveau;
      r.commentaire = ligne.commentaire_prof || "";
      r.decideLe = ligne.decide_le || null;
      change = true;
      if (avant !== nouveau && (nouveau === "validee" || nouveau === "refaire")) {
        const g = CARNET_GESTES.find((x) => x.id === r.gesteId);
        const nom = g ? gesteNom(g) : (r.gesteNom || r.gesteId);
        (nouveau === "validee" ? valides : refaits).push(nom);
      }
    }
  }
  // La décision arrive pendant que l'élève regarde : on le lui DIT, sinon un
  // changement de pastille passe inaperçu.
  if (valides.length || refaits.length) {
    const T = ct();
    carnetFlash = valides.length
      ? { ok: true,  txt: T.flashValidee + " " + valides.join(", ") }
      : { ok: false, txt: T.flashRefaire + " " + refaits.join(", ") };
  }
  if (change) { saveState(); render(); }
  carnetPollSync();   // plus rien en attente ? la relecture s'arrête d'elle-même
}


/* ------------------------------------------------------------------ */
/* QUAND RELIRE — sans jamais ouvrir quoi que ce soit à `anon`          */
/* ------------------------------------------------------------------ */
/* ⚠️ POURQUOI PAS DE TEMPS RÉEL ICI.
   Supabase Realtime ne diffuse un changement à un abonné que si la policy
   `select` de la table l'autorise pour le rôle de son jeton. L'app élève est
   anonyme : `anon` n'a AUCUN privilège sur `carnet_realisations` et aucune
   policy (revoke all, voir supabase_carnet.sql §5). Un abonnement temps réel
   ne lui livrerait donc rien — et il ne faut SURTOUT PAS lui accorder un
   `select` pour que ça marche : la clé publiable est dans le code source de
   cette PWA, ce serait ouvrir les réalisations (photos incluses) de tous les
   centres à quiconque lit la source.

   L'élève est donc servi par RELECTURE de `carnet_etat_eleve` — une fonction
   security definer bornée à SON identifiant d'appareil, qui ne rend ni photo,
   ni nom, ni employeur, ni courriel d'enseignant. Deux déclencheurs :

   1. LE RETOUR DANS L'APP (`visibilitychange` + `focus`) — le cas réel le plus
      fréquent : l'élève sort de l'app sur le chantier, revient plus tard, la
      réponse de son enseignant est déjà là.
   2. UNE RELECTURE LÉGÈRE PENDANT QUE LE CARNET EST OUVERT — pour que la
      décision du prof arrive sans qu'on touche au téléphone.

   La relecture périodique est volontairement avare. Elle ne tourne QUE si les
   quatre conditions sont réunies : vue des gestes ouverte, app au premier plan,
   réseau présent, et au moins une réalisation réellement en attente de décision.
   Dès qu'une seule tombe, la minuterie s'arrête. Un élève sur un chantier n'a
   pas un forfait illimité, et sa batterie compte. */

/* 20 s : la décision d'un enseignant arrive dans le temps d'un regard (c'est le
   geste de la démonstration : le prof valide, le téléphone suit), et la charge
   reste dérisoire — un POST de ~1 ko, soit ~180 ko pour une heure complète
   d'écran allumé sur cette seule vue. Plus court n'ajouterait rien de
   perceptible ; plus long rendrait la séquence molle devant une salle. */
const CARNET_POLL_MS = 20000;

/* Plafond de prudence : au-delà de 10 minutes de relecture d'affilée, on
   s'arrête. Un téléphone oublié écran allumé sur cette vue ne doit pas pianoter
   indéfiniment. Le compteur repart à zéro à chaque retour au premier plan, à
   chaque entrée dans la vue et au moindre contact avec l'écran — une
   démonstration ne peut donc pas tomber dessus. */
const CARNET_POLL_MAX_MS = 10 * 60 * 1000;

var carnetPollTimer = null;
var carnetPollDepart = 0;
var carnetReveilDernier = 0;

/* Reste-t-il une décision à attendre ? Si non, rien ne sert à relire. */
function carnetEnAttenteDeProf() {
  if (!carnetDisponible()) return false;
  return carnetState().realisations.some((r) => !r.aEnvoyer && r.statut === "attente");
}

function carnetPollDoitTourner() {
  return carnetDisponible()
    && carnetView === "gestes"
    && typeof document !== "undefined" && document.visibilityState === "visible"
    && navigator.onLine
    && carnetEnAttenteDeProf();
}

function carnetPollStop() {
  if (carnetPollTimer) { clearInterval(carnetPollTimer); carnetPollTimer = null; }
}

function carnetPollStart() {
  carnetPollStop();
  if (!carnetPollDoitTourner()) return;
  carnetPollDepart = Date.now();
  carnetPollTimer = setInterval(function () {
    // Garde à chaque tour : si la vue a été quittée, l'app mise en arrière-plan
    // ou le réseau perdu sans qu'on nous l'ait dit, la minuterie se coupe
    // elle-même au tour suivant. Aucun moyen de la laisser tourner par oubli.
    if (!carnetPollDoitTourner()) { carnetPollStop(); return; }
    if (Date.now() - carnetPollDepart > CARNET_POLL_MAX_MS) { carnetPollStop(); return; }
    carnetSyncStatuts();
  }, CARNET_POLL_MS);
}

/* Démarre ou arrête selon l'état courant — appelée depuis le rendu du carnet,
   donc une seule source de vérité. */
function carnetPollSync() {
  if (carnetPollDoitTourner()) { if (!carnetPollTimer) carnetPollStart(); }
  else carnetPollStop();
}

/* RETOUR DANS L'APP. Branchée sur `visibilitychange`, `focus` et `online`
   (voir le bas d'app.js). Étranglée à 2 s : les trois événements se suivent
   souvent, on ne veut qu'une relecture. */
function carnetReveil() {
  if (!carnetDisponible()) { carnetPollStop(); return; }
  if (typeof document !== "undefined" && document.visibilityState !== "visible") {
    carnetPollStop();           // app en arrière-plan : on coupe tout de suite
    return;
  }
  const now = Date.now();
  if (now - carnetReveilDernier < 2000) { carnetPollSync(); return; }
  carnetReveilDernier = now;
  carnetRefreshOption();        // l'option est-elle toujours au contrat du centre ?
  carnetSyncStatuts();          // la décision de l'enseignant est peut-être déjà là
  if (typeof flushSync === "function") flushSync();   // et la file hors ligne repart
  carnetPollStart();            // relance la relecture et remet le plafond à zéro
}

/* Le moindre contact remet le plafond de 10 minutes à zéro. */
function carnetPollReveilTactile() {
  if (!carnetPollTimer) { carnetPollSync(); return; }
  carnetPollDepart = Date.now();
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
  if (!carnetDisponible()) { carnetView = null; carnetPollStop(); render(); return; }
  carnetErreur = "";
  carnetFlash = null;
  if (vue === "ajouter") {
    carnetPhotoDraft = null;
    // On consomme la présélection une seule fois : revenir par l'onglet
    // « Ajouter » ne doit pas réafficher le geste d'un clic précédent.
    carnetGesteSel = carnetGestePre || null;
    carnetGesteLibre = carnetGestePreLibre || "";
    carnetGestePre = null;
    carnetGestePreLibre = "";
    carnetEnginSel = null;
    carnetEnginLibre = "";
    carnetNoteDraft = "";
  }
  if (vue === "heures") { carnetHEnginSel = null; carnetHEnginLibre = ""; }
  carnetView = vue || "gestes";
  if (typeof currentQuest !== "undefined") currentQuest = null;
  render();
  if (carnetView === "gestes") carnetSyncStatuts();
}
function carnetQuitter() { carnetView = null; carnetFlash = null; carnetPollStop(); render(); }
function carnetGesteDirect(id) { carnetGestePre = id; carnetGestePreLibre = ""; carnetGo("ajouter"); }

/* Reprendre un geste écrit à la main que l'enseignant renvoie « à refaire » :
   on repasse par « Autre » avec le texte déjà rempli. */
function carnetGesteAutreDirect(ref) {
  const r = carnetState().realisations.find((x) => x.ref === ref);
  carnetGestePre = CARNET_GESTE_AUTRE;
  carnetGestePreLibre = r ? (r.gesteNom || "") : "";
  carnetGo("ajouter");
}

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

  // SEULE source de vérité pour la relecture périodique : on la (re)met en
  // phase avec ce qui est réellement affiché, à chaque rendu du carnet.
  carnetPollSync();
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

/* --- Les gestes écrits à la main, à part --- */
/* Ils ne sont PAS dans la grille des badges et ne comptent pas dans le
   « x / 8 » : un geste inventé par l'élève ne correspond à aucun badge, et
   l'interface ne doit pas promettre une récompense qui n'arrivera jamais.
   Ils ont en revanche besoin d'exister à l'écran, sinon l'élève n'aurait
   aucun moyen de voir la décision de son enseignant. Chacun vit par sa
   `ref`, pas par son `geste_id` (qui vaut 'autre' pour tous). */
function carnetGestesLibres() {
  const T = ct();
  const libres = carnetState().realisations
    .filter((r) => r.gesteId === CARNET_GESTE_AUTRE)
    .sort((a, b) => (a.creeLe < b.creeLe ? 1 : a.creeLe > b.creeLe ? -1 : 0));
  if (!libres.length) return "";

  const lignes = libres.map((r) => {
    const st = r.statut === "validee" || r.statut === "refaire" ? r.statut : "attente";
    const cliquable = st === "refaire";
    let bas = "";
    if (st === "refaire") {
      bas = `<div class="carnet-sub refaire">${T.retourProf} : « ${escapeHtml(r.commentaire || "—")} »</div>
             <div class="carnet-sub">${T.refaireAide}</div>`;
    } else if (st === "attente") {
      bas = `<div class="carnet-sub">${T.envoyeLe} ${carnetDate(r.creeLe)}${r.aEnvoyer ? " · " + T.enFile : ""}</div>`;
    } else {
      bas = `<div class="carnet-sub ok">${T.valideeLe} ${carnetDate(r.decideLe || r.creeLe)}${r.commentaire ? " · « " + escapeHtml(r.commentaire) + " »" : ""}</div>`;
    }
    return `<div class="carnet-row ${cliquable ? "cliquable" : ""}" ${cliquable ? `onclick="carnetGesteAutreDirect('${String(r.ref).replace(/[^0-9A-Za-z-]/g, "")}')"` : ""}>
      <div class="carnet-row-main">
        <span class="carnet-row-icon">✍️</span>
        <span class="carnet-row-nom">${escapeHtml(r.gesteNom || T.gesteLibreVide)}</span>
        <span class="carnet-pill ${st}">${T.statut[st]}</span>
      </div>
      ${r.engin ? `<div class="carnet-sub">${escapeHtml(r.engin)}</div>` : ""}
      ${bas}
    </div>`;
  }).join("");

  return `
    <div class="carnet-card">
      <h3>${escapeHtml(T.mesGestesLibres)}</h3>
      <p class="carnet-sub">${escapeHtml(T.libresSansBadge)}</p>
    </div>
    <div class="carnet-list">${lignes}</div>`;
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

  const flash = carnetFlash
    ? `<div class="carnet-flash ${carnetFlash.ok ? "ok" : "refaire"}">${carnetFlash.ok ? "✅" : "↩"} ${escapeHtml(carnetFlash.txt)}</div>`
    : "";

  return `
    ${flash}
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
    ${carnetGestesLibres()}
    <button class="cta" onclick="carnetGo('ajouter')">📷 ${T.ajouterCta}</button>`;
}

/* ------------------------------------------------------------------ */
/* « Autre — je l'écris moi-même »                                     */
/* ------------------------------------------------------------------ */
/* Le champ libre est TOUJOURS dans le DOM, simplement `hidden`. On bascule
   l'attribut au lieu de relancer render() : un render() effacerait la note
   et la photo en cours de saisie. */
function carnetBasculeLibre(idSel, idWrap, sentinelle) {
  const sel = document.getElementById(idSel);
  const wrap = document.getElementById(idWrap);
  if (!sel || !wrap) return;
  wrap.hidden = sel.value !== sentinelle;
}

/* Relit les champs du formulaire d'ajout avant un render() qui les écraserait. */
function carnetMemoriser() {
  const g  = document.getElementById("carnetGesteSel");
  const gl = document.getElementById("carnetGesteLibre");
  const e  = document.getElementById("carnetEnginSel");
  const el = document.getElementById("carnetEnginLibre");
  const n  = document.getElementById("carnetNote");
  if (g)  carnetGesteSel   = g.value;
  if (gl) carnetGesteLibre = gl.value;
  if (e)  carnetEnginSel   = e.value;
  if (el) carnetEnginLibre = el.value;
  if (n)  carnetNoteDraft  = n.value;
}
function carnetMemoriserHeures() {
  const e  = document.getElementById("carnetHEngin");
  const el = document.getElementById("carnetHEnginLibre");
  if (e)  carnetHEnginSel   = e.value;
  if (el) carnetHEnginLibre = el.value;
}

function carnetMajGesteLibre() { carnetMemoriser(); carnetBasculeLibre("carnetGesteSel", "carnetGesteLibreWrap", CARNET_GESTE_AUTRE); }
function carnetMajEnginLibre() { carnetMemoriser(); carnetBasculeLibre("carnetEnginSel", "carnetEnginLibreWrap", CARNET_AUTRE); }
function carnetMajHEnginLibre() { carnetMemoriserHeures(); carnetBasculeLibre("carnetHEngin", "carnetHEnginLibreWrap", CARNET_AUTRE); }

/* Normalise une saisie libre : espaces écrasés, plafond dur. Le plafond est
   déjà posé par maxlength côté champ — on le repose ici, parce qu'un
   maxlength ne survit pas à un collage programmatique. */
function carnetTexteLibre(id, max) {
  const el = document.getElementById(id);
  const v = el ? String(el.value || "") : "";
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

/* Le <select> des engins, partagé par le formulaire et le journal d'heures.
   `valeurSel` permet de retrouver le choix de l'élève après un render(). */
function carnetOptionsEngins(valeurSel) {
  const T = ct();
  const liste = CARNET_ENGINS.map((e) => {
    const nom = enginNom(e);
    return `<option value="${escapeHtml(nom)}"${valeurSel === nom ? " selected" : ""}>${escapeHtml(nom)}</option>`;
  }).join("");
  return liste + `<option value="${CARNET_AUTRE}"${valeurSel === CARNET_AUTRE ? " selected" : ""}>${escapeHtml(T.autreOption)}</option>`;
}

/* Bloc « champ libre » générique : masqué tant que « Autre » n'est pas choisi. */
function carnetChampLibre(id, label, placeholder, max, valeur, visible, aide) {
  return `
      <div id="${id}Wrap" class="carnet-libre"${visible ? "" : " hidden"}>
        <label class="field-label" for="${id}">${escapeHtml(label)}</label>
        <input id="${id}" class="carnet-input" type="text" maxlength="${max}"
          placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(valeur)}"
          autocapitalize="sentences" autocomplete="off" />
        ${aide ? `<p class="carnet-sub carnet-libre-aide">${escapeHtml(aide)}</p>` : ""}
      </div>`;
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
    const sel = carnetGesteSel === g.id ? " selected" : "";
    const dis = s === "validee" ? " disabled" : "";
    const suffixe = s !== "afaire" ? ` (${T.statut[s].toLowerCase()})` : "";
    return `<option value="${g.id}"${sel}${dis}>${escapeHtml(gesteNom(g) + suffixe)}</option>`;
  }).join("")
  + `<option value="${CARNET_GESTE_AUTRE}"${carnetGesteSel === CARNET_GESTE_AUTRE ? " selected" : ""}>${escapeHtml(T.autreOption)}</option>`;
  const engins = carnetOptionsEngins(carnetEnginSel);

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
      <select id="carnetGesteSel" class="carnet-input" onchange="carnetMajGesteLibre()">${options}</select>
      ${carnetChampLibre("carnetGesteLibre", T.gesteLibre, T.gesteLibrePH, CARNET_GESTE_LIBRE_MAX,
          carnetGesteLibre, carnetGesteSel === CARNET_GESTE_AUTRE, T.libreSansBadge)}

      <label class="field-label" for="carnetEnginSel">${T.engin}</label>
      <select id="carnetEnginSel" class="carnet-input" onchange="carnetMajEnginLibre()">${engins}</select>
      ${carnetChampLibre("carnetEnginLibre", T.enginLibre, T.enginLibrePH, CARNET_ENGIN_LIBRE_MAX,
          carnetEnginLibre, carnetEnginSel === CARNET_AUTRE, "")}

      <label class="field-label" for="carnetNote">${T.note}</label>
      <textarea id="carnetNote" class="carnet-input carnet-textarea" maxlength="500"
        placeholder="${escapeHtml(T.notePlaceholder)}">${escapeHtml(carnetNoteDraft)}</textarea>

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
  carnetMemoriser();          // le render() qui suit réécrit tout le formulaire
  const r = await carnetLirePhoto(f);
  if (r.photo) { carnetPhotoDraft = r.photo; carnetErreur = ""; }
  else { carnetPhotoDraft = null; carnetErreur = r.err === "grosse" ? T.erreurPhotoGrosse : T.erreurPhoto; }
  render();
}
function carnetRetirerPhoto() { carnetMemoriser(); carnetPhotoDraft = null; render(); }

function carnetSoumettre() {
  const T = ct();
  const c = carnetState();
  carnetMemoriser();          // tout render() ci-dessous repart de ces brouillons
  const gesteId = carnetGesteSel;

  // --- Le geste : soit un id de la liste, soit 'autre' + le texte de l'élève.
  let gesteLibelle;
  if (gesteId === CARNET_GESTE_AUTRE) {
    gesteLibelle = carnetTexteLibre("carnetGesteLibre", CARNET_GESTE_LIBRE_MAX);
    if (!gesteLibelle) { carnetErreur = T.erreurGesteLibre; render(); return; }
  } else {
    const g = CARNET_GESTES.find((x) => x.id === gesteId);
    if (!g) return;
    if (carnetStatutGeste(gesteId) === "validee") { carnetErreur = T.dejaValide; render(); return; }
    gesteLibelle = gesteNom(g);
  }

  // --- L'engin : la colonne est déjà du texte libre, on y met ce qui est tapé.
  let engin = carnetEnginSel || "";
  if (engin === CARNET_AUTRE) {
    engin = carnetTexteLibre("carnetEnginLibre", CARNET_ENGIN_LIBRE_MAX);
    if (!engin) { carnetErreur = T.erreurEnginLibre; render(); return; }
  }

  const ligne = {
    ref: carnetRef(),          // UUID par réalisation : deux gestes « autre »
    gesteId: gesteId,          // ne peuvent pas s'écraser à l'upsert
    gesteNom: gesteLibelle,
    engin: engin,
    note: carnetNoteDraft.trim().slice(0, 500),
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
  carnetGestePreLibre = "";
  carnetGesteSel = null;
  carnetGesteLibre = "";
  carnetEnginSel = null;
  carnetEnginLibre = "";
  carnetNoteDraft = "";
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
  const engins = carnetOptionsEngins(carnetHEnginSel);
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
      <select id="carnetHEngin" class="carnet-input" onchange="carnetMajHEnginLibre()">${engins}</select>
      ${carnetChampLibre("carnetHEnginLibre", T.enginLibre, T.enginLibrePH, CARNET_ENGIN_LIBRE_MAX,
          carnetHEnginLibre, carnetHEnginSel === CARNET_AUTRE, "")}
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
  carnetMemoriserHeures();     // tout render() ci-dessous réécrit la carte
  const d = document.getElementById("carnetHDate").value;
  const h = Number(document.getElementById("carnetHH").value);
  if (!d || !(h >= 0.5 && h <= 14)) { carnetErreur = T.erreurHeures; render(); return; }

  // Le journal d'heures NE QUITTE PAS l'appareil (seul le total part dans
  // carnet_heures_maj) : l'engin principal n'arrive jamais au tableau de bord.
  // On le plafonne et on l'échappe quand même à l'affichage, par cohérence.
  let engin = carnetHEnginSel || "";
  if (engin === CARNET_AUTRE) {
    engin = carnetTexteLibre("carnetHEnginLibre", CARNET_ENGIN_LIBRE_MAX);
    if (!engin) { carnetErreur = T.erreurEnginJournal; render(); return; }
  }

  c.heures.push({ date: d, h: h, engin: engin.slice(0, CARNET_ENGIN_LIBRE_MAX) });
  c.heuresEnFile = true;
  carnetHEnginSel = null;
  carnetHEnginLibre = "";
  carnetErreur = "";
  saveState();
  render();
  flushSync();
}
function carnetSupprimerHeure(date, h) {
  const c = carnetState();
  carnetMemoriserHeures();
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
window.carnetGesteAutreDirect = carnetGesteAutreDirect;
window.carnetMajGesteLibre = carnetMajGesteLibre;
window.carnetMajEnginLibre = carnetMajEnginLibre;
window.carnetMajHEnginLibre = carnetMajHEnginLibre;
window.carnetAccepter = carnetAccepter;
window.carnetEnregistrerReglages = carnetEnregistrerReglages;
window.carnetPhotoChoisie = carnetPhotoChoisie;
window.carnetRetirerPhoto = carnetRetirerPhoto;
window.carnetSoumettre = carnetSoumettre;
window.carnetAjouterHeures = carnetAjouterHeures;
window.carnetSupprimerHeure = carnetSupprimerHeure;
