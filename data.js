/* ============================================================
   ChantierQuest — Données du programme DEP 5220 / 5720
   Conduite d'engins de chantier / Construction Equipment Operation
   20 compétences officielles (source: AdmissionFP.com)
   Les questions QCM sont des EXEMPLES à valider/remplacer par
   les enseignants du programme.

   Format des choix: chaque question a un tableau "choices" où
   chaque item a { fr, en, correct }. L'ordre est mélangé au
   moment de l'affichage (voir app.js) — la position de la bonne
   réponse change donc à chaque tentative.
   ============================================================ */

const PROGRAM = {
  fr: {
    code: "5220",
    title: "Conduite d'engins de chantier",
    subtitle: "DEP 5220 — 1095 heures — 73 unités"
  },
  en: {
    code: "5720",
    title: "Construction Equipment Operation",
    subtitle: "DVS 5720 — 1095 hours — 73 credits"
  }
};

function ch(fr, en, correct) { return { fr, en, correct: !!correct }; }

/* Question de type vrai/faux: affirmation à juger. */
function tf(fr, en, isTrue) { return { type: "tf", fr, en, isTrue: !!isTrue }; }

/* Question de type "association de termes": l'élève touche un terme puis
   sa définition correspondante. pairs: tableau de
   { term_fr, term_en, def_fr, def_en }. Toutes les paires doivent être
   associées correctement pour que la question soit considérée réussie. */
function pair(term_fr, term_en, def_fr, def_en) { return { term_fr, term_en, def_fr, def_en }; }
function match(fr, en, pairs) { return { type: "match", fr, en, pairs }; }

/* Question de type "situation complexe" (mise en situation): un court
   scénario réaliste suivi d'un choix multiple basé sur le jugement
   professionnel. Réutilise le même format "choices" qu'un QCM standard. */
function scenario(fr, en, choices) { return { type: "scenario", fr, en, choices }; }

/* Paliers de difficulté d'une quête. Chaque compétence est maintenant
   divisée en 3 paliers progressifs (tiers[]), débloqués l'un après l'autre:
   Débutant -> Intermédiaire -> Avancé. Réussir le palier 1 d'une compétence
   déverrouille la compétence suivante sur la carte; réussir le palier 3
   (Avancé) accorde le badge de maîtrise de la compétence. */
const TIER_META = [
  { level: 1, name_fr: "Débutant", name_en: "Beginner", icon: "🌱" },
  { level: 2, name_fr: "Intermédiaire", name_en: "Intermediate", icon: "⚙️" },
  { level: 3, name_fr: "Avancé", name_en: "Advanced", icon: "🏆" }
];

/* Chaque compétence = une "quête". order = ordre de déblocage. */
const COMPETENCIES = [
  {
    id: "c01", code: "255-001/755-001", hours: 15, order: 1,
    title_fr: "Se situer au regard des organismes de l'industrie de la construction",
    title_en: "Become familiar with the organizations involved in the construction industry",
    icon: "🏗️",
    tiers: [
    { level: 1, questions: [
      { fr: "Quel organisme encadre la formation professionnelle au Québec?", en: "Which body oversees vocational training in Québec?",
        choices: [
          ch("La Commission de la construction du Québec (CCQ)", "The Commission de la construction du Québec (CCQ)"),
          ch("La Régie du bâtiment du Québec (RBQ)", "The Régie du bâtiment du Québec (RBQ)"),
          ch("Le ministère de l'Éducation", "The Ministère de l'Éducation", true),
          ch("La CNESST", "The CNESST")
        ] },
      { fr: "Quel organisme gère les cartes de compétence et l'accès aux chantiers de construction au Québec?", en: "Which organization manages competency cards and access to construction sites in Québec?",
        choices: [
          ch("La Régie du bâtiment du Québec (RBQ)", "The Régie du bâtiment du Québec (RBQ)"),
          ch("La CCQ (Commission de la construction du Québec)", "The CCQ (Commission de la construction du Québec)", true),
          ch("La CNESST", "The CNESST"),
          ch("Le ministère du Travail", "The Ministère du Travail")
        ] },
      { fr: "La CNESST est responsable principalement de quoi?", en: "The CNESST is mainly responsible for what?",
        choices: [
          ch("La délivrance des cartes de compétence de la CCQ", "Issuing CCQ competency cards"),
          ch("La santé et la sécurité du travail", "Occupational health and safety", true),
          ch("Les permis de construire", "Building permits"),
          ch("Les programmes de formation professionnelle", "Vocational training programs")
        ] },
      { fr: "Un opérateur d'équipement lourd doit être titulaire de quel type de carte pour travailler sur un chantier régi par la CCQ?", en: "A heavy equipment operator must hold what type of card to work on a CCQ-regulated site?",
        choices: [
          ch("Une carte SIMDUT", "A WHMIS card"),
          ch("Un permis de conduire classe 1", "A Class 1 driver's licence"),
          ch("Un certificat de la CNESST", "A CNESST certificate"),
          ch("Une carte de compétence CCQ", "A CCQ competency card", true)
        ] },
      tf("Le ministère de l'Éducation est responsable de la santé et de la sécurité du travail sur les chantiers de construction.", "The Ministère de l'Éducation is responsible for occupational health and safety on construction sites.", false)
    ] },
    { level: 2, questions: [
      { fr: "La loi qui encadre les relations de travail dans l'industrie de la construction au Québec est communément appelée...", en: "The law governing labour relations in the Québec construction industry is commonly called...",
        choices: [
          ch("La loi R-20", "The R-20 act", true),
          ch("La loi 101", "Bill 101"),
          ch("Le Code du bâtiment", "The Building Code"),
          ch("La Charte de la langue française", "The Charter of the French Language")
        ] },
      { fr: "Un travailleur qui n'a pas encore obtenu son certificat de compétence-compagnon détient généralement un...", en: "A worker who hasn't yet earned journeyman status generally holds a...",
        choices: [
          ch("Certificat de compétence-apprenti (CCA)", "Apprentice competency certificate (CCA)", true),
          ch("Certificat de compétence-occupation", "Occupation competency certificate"),
          ch("Permis de travail temporaire", "Temporary work permit"),
          ch("Certificat de compétence-élève", "Student competency certificate")
        ] },
      tf("Un travailleur de la construction doit être en mesure de présenter sa carte de compétence CCQ sur demande sur un chantier régi par la CCQ.", "A construction worker must be able to present their CCQ competency card on request on a CCQ-regulated site.", true),
      match("Associe chaque organisme à son rôle principal.", "Match each organization to its main role.", [
        pair("CCQ", "CCQ", "Gère les cartes de compétence et les relations de travail", "Manages competency cards and labour relations"),
        pair("CNESST", "CNESST", "Veille à la santé et la sécurité du travail", "Oversees occupational health and safety"),
        pair("RBQ", "RBQ", "Encadre les licences d'entrepreneurs et le Code du bâtiment", "Oversees contractor licences and the Building Code"),
        pair("Ministère de l'Éducation", "Ministère de l'Éducation", "Supervise les programmes de formation professionnelle", "Oversees vocational training programs")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Sur un chantier, qui a généralement l'autorité d'exiger qu'un travailleur quitte les lieux s'il ne peut présenter une carte de compétence CCQ valide?", en: "On a job site, who generally has the authority to require a worker to leave if they can't present a valid CCQ competency card?",
        choices: [
          ch("Un représentant de la CCQ", "A CCQ representative", true),
          ch("Uniquement un policier", "Only a police officer"),
          ch("Uniquement le propriétaire du chantier", "Only the site owner"),
          ch("Aucun organisme n'a cette autorité", "No organization has this authority")
        ] },
      scenario("Un nouvel employé se présente sur un chantier régi par la CCQ sans sa carte de compétence, mais affirme l'avoir oubliée à la maison. Que devrait faire le contremaître?", "A new employee arrives on a CCQ-regulated site without their competency card, claiming they forgot it at home. What should the foreman do?",
        [
          ch("Le laisser travailler quand même pour ne pas retarder le chantier", "Let him work anyway to avoid delaying the site"),
          ch("Refuser qu'il travaille tant que sa carte n'est pas confirmée valide", "Refuse to let him work until his card is confirmed valid", true),
          ch("Lui donner la carte d'un collègue pour la journée", "Give him a coworker's card for the day"),
          ch("Ignorer la situation si le travail est simple", "Ignore the situation if the work is simple")
        ]),
      tf("La CNESST peut imposer des amendes et même ordonner l'arrêt des travaux sur un chantier si elle juge qu'il y a danger pour la santé ou la sécurité des travailleurs.", "The CNESST can impose fines and even order work stoppages on a site if it deems there is a danger to workers' health or safety.", true),
      match("Associe chaque document à sa fonction.", "Match each document to its function.", [
        pair("Carte de compétence CCQ", "CCQ competency card", "Autorise à travailler comme salarié de la construction", "Authorizes working as a construction employee"),
        pair("Certificat de compétence-compagnon", "Journeyman competency certificate", "Confirme qu'un travailleur a complété son apprentissage", "Confirms a worker has completed their apprenticeship"),
        pair("Fiche de données de sécurité", "Safety data sheet", "Fournit les informations de sécurité d'un produit dangereux", "Provides safety information for a hazardous product"),
        pair("Registre SIMDUT", "WHMIS register", "Liste les produits contrôlés utilisés sur le chantier", "Lists controlled products used on the site")
      ])
    ] }
    ]
  },
  {
    id: "c02", code: "255-002/755-002", hours: 30, order: 2,
    title_fr: "Appliquer des règles de santé et de sécurité sur les chantiers de construction",
    title_en: "Apply health and safety rules on construction sites",
    icon: "🦺",
    tiers: [
    { level: 1, questions: [
      { fr: "Quel équipement de protection individuelle est obligatoire sur presque tous les chantiers?", en: "Which personal protective equipment is mandatory on nearly all sites?",
        choices: [
          ch("Combinaison ignifuge complète et masque à gaz", "Full fire-resistant suit and gas mask"),
          ch("Casque, bottes à cap d'acier et gilet haute visibilité", "Hard hat, steel-toe boots and high-visibility vest", true),
          ch("Lunettes de soleil et chapeau à large bord", "Sunglasses and a wide-brim hat"),
          ch("Gants de jardinage et tablier de cuisine", "Gardening gloves and a kitchen apron")
        ] },
      { fr: "Que signifie la règle des « trois points d'appui » en montant dans une machine?", en: "What does the 'three-point contact' rule mean when mounting equipment?",
        choices: [
          ch("Attendre trois minutes avant de démarrer le moteur", "Wait three minutes before starting the engine"),
          ch("Faire trois tours d'inspection complets de la machine", "Do three full walk-around inspections of the machine"),
          ch("Garder trois points de contact avec la machine en tout temps", "Keep three points of contact with the machine at all times", true),
          ch("Utiliser trois outils différents pour monter à bord", "Use three different tools to climb aboard")
        ] },
      { fr: "Avant de démarrer une machine, que doit toujours faire l'opérateur?", en: "Before starting a machine, what should the operator always do?",
        choices: [
          ch("Klaxonner une seule fois puis démarrer immédiatement", "Honk once then start immediately"),
          ch("Vérifier uniquement le niveau de carburant", "Only check the fuel level"),
          ch("Faire une inspection visuelle et vérifier les zones environnantes", "Do a visual walk-around and check the surrounding area", true),
          ch("Attendre les directives du contremaître seulement", "Only wait for the foreman's instructions")
        ] },
      { fr: "Que signifie un cadenassage (« lockout/tagout ») sur une machine en réparation?", en: "What does lockout/tagout mean on a machine being repaired?",
        choices: [
          ch("Apposer une affiche d'avertissement sans couper l'alimentation", "Post a warning sign without cutting power"),
          ch("Couper et verrouiller les sources d'énergie pour empêcher un démarrage accidentel", "Isolate and lock energy sources to prevent accidental start-up", true),
          ch("Garder le moteur au ralenti pendant l'intervention", "Keep the engine idling during the repair"),
          ch("Débrancher uniquement la radio de la cabine", "Only disconnect the cab radio")
        ] },
      { fr: "Une zone d'exclusion (zone de danger) autour d'une pelle en opération sert à quoi?", en: "An exclusion zone around an operating excavator serves what purpose?",
        choices: [
          ch("Marquer l'endroit où entreposer les outils", "Mark where tools are stored"),
          ch("Délimiter le stationnement des véhicules du chantier", "Mark the site's vehicle parking area"),
          ch("Garder les travailleurs à pied hors du rayon d'action de la machine", "Keep ground workers out of the machine's swing radius", true),
          ch("Indiquer la zone réservée aux pauses", "Indicate the break area")
        ] },
      tf("Il est acceptable de retirer son casque de sécurité si la tâche à faire est très courte.", "It's acceptable to remove your hard hat if the task is very short.", false)
    ] },
    { level: 2, questions: [
      { fr: "Que signifie l'acronyme SIMDUT?", en: "What does the WHMIS acronym stand for?",
        choices: [
          ch("Système d'information sur les matières dangereuses utilisées au travail", "Workplace Hazardous Materials Information System", true),
          ch("Système intégré de maintenance des unités de transport", "Integrated transport unit maintenance system"),
          ch("Service d'inspection de la machinerie du travail", "Workplace machinery inspection service"),
          ch("Système d'identification des matériaux utilisés au travail", "Workplace material identification system")
        ] },
      { fr: "Un espace clos (« confined space ») sur un chantier nécessite généralement...", en: "A confined space on a job site generally requires...",
        choices: [
          ch("Un permis d'entrée et des procédures spécifiques", "An entry permit and specific procedures", true),
          ch("Simplement une lampe de poche", "Simply a flashlight"),
          ch("Rien de particulier si l'espace est petit", "Nothing special if the space is small"),
          ch("Une autorisation verbale seulement", "Verbal authorization only")
        ] },
      tf("Un extincteur portatif doit être inspecté régulièrement même s'il n'a jamais servi.", "A portable fire extinguisher must be inspected regularly even if it has never been used.", true),
      match("Associe chaque pictogramme SIMDUT à son sens.", "Match each WHMIS pictogram to its meaning.", [
        pair("Flamme", "Flame", "Matière inflammable", "Flammable material"),
        pair("Tête de mort sur tibias croisés", "Skull and crossbones", "Matière très toxique, danger mortel", "Highly toxic material, deadly hazard"),
        pair("Corrosion", "Corrosion", "Matière corrosive pour la peau ou les métaux", "Corrosive to skin or metals"),
        pair("Point d'exclamation", "Exclamation mark", "Danger moins grave (irritant, sensibilisant)", "Less severe hazard (irritant, sensitizer)")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Lors d'un travail en hauteur, en l'absence de garde-corps, quel équipement est habituellement requis?", en: "When working at height without guardrails, what equipment is usually required?",
        choices: [
          ch("Un système d'arrêt de chute (harnais, corde d'assurance, ancrage)", "A fall-arrest system (harness, lanyard, anchor point)", true),
          ch("Seulement des lunettes de sécurité", "Only safety glasses"),
          ch("Seulement des gants renforcés", "Only reinforced gloves"),
          ch("Aucun équipement particulier", "No special equipment")
        ] },
      scenario("Tu remarques qu'un collègue travaille sous une pelle mécanique en train de creuser, dans son rayon de giration, sans que l'opérateur ne l'ait vu. Que fais-tu en premier?", "You notice a coworker working under a digging excavator, inside its swing radius, without the operator having seen them. What do you do first?",
        [
          ch("Tu attends la pause pour lui en parler", "Wait for the break to mention it"),
          ch("Tu avertis immédiatement le collègue et/ou l'opérateur pour faire cesser le danger", "Immediately warn the coworker and/or the operator to stop the danger", true),
          ch("Tu prends une photo pour le rapporter plus tard", "Take a photo to report later"),
          ch("Tu ne fais rien, ce n'est pas ta responsabilité", "Do nothing, it's not your responsibility")
        ]),
      tf("Un travailleur peut refuser d'exécuter un travail s'il a des motifs raisonnables de croire que ce travail l'expose à un danger pour sa santé ou sa sécurité.", "A worker can refuse to perform a task if they have reasonable grounds to believe it exposes them to a danger to their health or safety.", true),
      match("Associe chaque situation dangereuse à la mesure de prévention appropriée.", "Match each hazardous situation to the appropriate prevention measure.", [
        pair("Tranchée profonde", "Deep trench", "Étançonnement ou talutage des parois", "Shoring or sloping of the walls"),
        pair("Travail près de lignes électriques", "Work near power lines", "Respecter la distance minimale d'approche", "Maintain the minimum approach distance"),
        pair("Circulation de machinerie lourde", "Heavy machinery traffic", "Signaleur et zone d'exclusion balisée", "Signal person and a marked exclusion zone"),
        pair("Bruit excessif", "Excessive noise", "Protection auditive", "Hearing protection")
      ])
    ] }
    ]
  },
  {
    id: "c03", code: "341-411/841-411", hours: 15, order: 3,
    title_fr: "Se situer au regard du métier et de la démarche de formation",
    title_en: "Determine their suitability for the trade and the training process",
    icon: "🧭",
    tiers: [
    { level: 1, questions: [
      { fr: "Quelles qualités sont particulièrement utiles pour un opérateur d'équipement lourd?", en: "Which qualities are particularly useful for a heavy equipment operator?",
        choices: [
          ch("Excellente mémoire des dates historiques", "Excellent memory for historical dates"),
          ch("Vigilance, dextérité, jugement et débrouillardise", "Vigilance, dexterity, judgment and resourcefulness", true),
          ch("Talent artistique développé", "Well-developed artistic talent"),
          ch("Vitesse de lecture exceptionnelle", "Exceptional reading speed")
        ] },
      { fr: "Le programme 5220/5720 comporte combien de compétences (modules) au total?", en: "How many competencies (modules) make up the 5220/5720 program in total?",
        choices: [
          ch("15", "15"),
          ch("25", "25"),
          ch("20", "20", true),
          ch("12", "12")
        ] },
      { fr: "Quelle est la durée totale du programme?", en: "What is the total duration of the program?",
        choices: [
          ch("900 heures", "900 hours"),
          ch("1200 heures", "1200 hours"),
          ch("750 heures", "750 hours"),
          ch("1095 heures", "1095 hours", true)
        ] },
      tf("Le programme 5220/5720 mène à un diplôme d'études professionnelles (DEP) en français et à un Vocational Diploma (DVS) en anglais.", "The 5220/5720 program leads to a Diplôme d'études professionnelles (DEP) in French and a Vocational Diploma (DVS) in English.", true)
    ] },
    { level: 2, questions: [
      { fr: "Le régime d'apprentissage du métier d'opérateur d'équipement lourd combine généralement...", en: "Learning the heavy equipment operator trade generally combines...",
        choices: [
          ch("Formation en classe, en atelier et heures de pratique sur machine", "Classroom, workshop training and hands-on machine practice", true),
          ch("Uniquement des cours théoriques en ligne", "Only online theory courses"),
          ch("Uniquement un stage non supervisé", "Only an unsupervised internship"),
          ch("Aucune évaluation pratique", "No practical evaluation")
        ] },
      { fr: "Qu'est-ce qu'un plan de formation individualisé peut permettre dans certains programmes?", en: "What can an individualized training plan allow in some programs?",
        choices: [
          ch("D'adapter le rythme ou certains contenus selon les besoins de l'élève", "Adapting the pace or certain content to the student's needs", true),
          ch("D'éliminer complètement les évaluations", "Eliminating evaluations completely"),
          ch("De sauter des compétences obligatoires", "Skipping mandatory competencies"),
          ch("De changer le nom du diplôme obtenu", "Changing the name of the diploma earned")
        ] },
      tf("La réussite de chacune des 20 compétences est nécessaire pour obtenir le diplôme du programme 5220/5720.", "Passing each of the 20 competencies is required to earn the 5220/5720 program diploma.", true),
      match("Associe chaque terme de la formation professionnelle à sa définition.", "Match each vocational training term to its definition.", [
        pair("DEP", "DEP", "Diplôme d'études professionnelles (volet francophone)", "Diplôme d'études professionnelles (French-language stream)"),
        pair("DVS", "DVS", "Vocational diploma (volet anglophone)", "Vocational diploma (English-language stream)"),
        pair("Compétence", "Competency", "Module d'apprentissage évalué du programme", "An evaluated learning module of the program"),
        pair("Sanction des études", "Certification of studies", "Reconnaissance officielle de la réussite du programme", "Official recognition of program completion")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Un élève qui échoue une compétence doit généralement...", en: "A student who fails a competency generally must...",
        choices: [
          ch("La reprendre et la réussir avant d'obtenir son diplôme", "Retake and pass it before earning their diploma", true),
          ch("Peut l'ignorer si sa moyenne globale est suffisante", "Can ignore it if their overall average is high enough"),
          ch("Peut la remplacer par une compétence facultative", "Can replace it with an optional competency"),
          ch("N'a aucune conséquence sur le diplôme", "It has no impact on the diploma")
        ] },
      scenario("Un élève trouve qu'une compétence pratique (ex: opérer une pelle) est particulièrement difficile pour lui. Quelle est la meilleure approche?", "A student finds a practical competency (e.g., operating an excavator) particularly difficult. What is the best approach?",
        [
          ch("Demander de l'aide à l'enseignant et pratiquer davantage", "Ask the teacher for help and practice more", true),
          ch("Abandonner cette partie du programme", "Give up on that part of the program"),
          ch("Copier les réponses d'un collègue à l'évaluation théorique", "Copy a classmate's answers on the theory test"),
          ch("Ignorer la difficulté en espérant que ça passe", "Ignore the difficulty and hope it passes")
        ]),
      tf("Le nombre d'heures totales du programme (1095 heures) inclut à la fois de la théorie et de la pratique sur machinerie.", "The program's total hours (1095 hours) include both theory and hands-on machinery practice.", true),
      match("Associe chaque qualité professionnelle à sa description.", "Match each professional quality to its description.", [
        pair("Vigilance", "Vigilance", "Rester attentif à son environnement en tout temps", "Staying alert to one's surroundings at all times"),
        pair("Jugement", "Judgment", "Prendre de bonnes décisions rapidement selon la situation", "Making good decisions quickly based on the situation"),
        pair("Dextérité", "Dexterity", "Manier les commandes avec précision", "Handling controls with precision"),
        pair("Débrouillardise", "Resourcefulness", "Trouver des solutions pratiques face à un imprévu", "Finding practical solutions when facing the unexpected")
      ])
    ] }
    ]
  },
  {
    id: "c04", code: "341-434/841-434", hours: 60, order: 4,
    title_fr: "Effectuer l'entretien préventif et le dépannage",
    title_en: "Perform preventive maintenance and field repairs",
    icon: "🔧",
    tiers: [
    { level: 1, questions: [
      { fr: "L'entretien préventif a pour but principal de...", en: "The main purpose of preventive maintenance is to...",
        choices: [
          ch("Augmenter la vitesse maximale de la machine", "Increase the machine's top speed"),
          ch("Améliorer l'apparence esthétique uniquement", "Only improve the machine's appearance"),
          ch("Réduire les bris et prolonger la durée de vie de la machine", "Reduce breakdowns and extend the machine's service life", true),
          ch("Réduire le nombre d'opérateurs requis", "Reduce the number of operators required")
        ] },
      { fr: "Que doit-on vérifier en premier lors d'une ronde d'inspection quotidienne?", en: "What should be checked first during a daily walk-around inspection?",
        choices: [
          ch("La radio de la cabine et la climatisation", "The cab radio and air conditioning"),
          ch("Le kilométrage exact au mètre près", "The exact mileage to the metre"),
          ch("Les niveaux de fluides, les fuites, les pneus/chenilles et les éléments de sécurité", "Fluid levels, leaks, tires/tracks and safety items", true),
          ch("La couleur de la peinture de la machine", "The paint color of the machine")
        ] },
      { fr: "Un carnet d'entretien sert à quoi?", en: "What is a maintenance log used for?",
        choices: [
          ch("Remplacer le manuel du fabricant", "Replacing the manufacturer's manual"),
          ch("Consigner les vérifications et réparations effectuées", "Recording inspections and repairs performed", true),
          ch("Noter les heures de pause des employés", "Noting employees' break times"),
          ch("Enregistrer les plaintes des clients", "Recording customer complaints")
        ] },
      { fr: "Que faire si une fuite d'huile hydraulique est détectée avant le quart de travail?", en: "What should be done if a hydraulic oil leak is found before a shift?",
        choices: [
          ch("Ajouter de l'huile et continuer normalement", "Top up the oil and continue as normal"),
          ch("Continuer le travail si la fuite semble mineure", "Continue working if the leak seems minor"),
          ch("Attendre la fin du quart pour le signaler", "Wait until the end of the shift to report it"),
          ch("Signaler la défectuosité et ne pas utiliser la machine avant réparation", "Report the defect and not use the machine until it's repaired", true)
        ] },
      tf("Une fois l'inspection quotidienne complétée, il n'est pas nécessaire de la refaire avant le quart suivant, même si un autre opérateur a utilisé la machine entre-temps.", "Once the daily inspection is done, it doesn't need to be repeated before the next shift, even if another operator used the machine in the meantime.", false)
    ] },
    { level: 2, questions: [
      { fr: "Un filtre à air encrassé sur une machine peut principalement causer...", en: "A clogged air filter on a machine can mainly cause...",
        choices: [
          ch("Une perte de puissance et une surconsommation de carburant", "A loss of power and increased fuel consumption", true),
          ch("Une amélioration de la performance", "Improved performance"),
          ch("Aucun effet notable", "No noticeable effect"),
          ch("Une augmentation de la pression des pneus", "Increased tire pressure")
        ] },
      { fr: "La fréquence des entretiens préventifs est généralement déterminée par...", en: "The frequency of preventive maintenance is generally determined by...",
        choices: [
          ch("Les heures d'utilisation indiquées au manuel du fabricant", "The usage hours specified in the manufacturer's manual", true),
          ch("La couleur de la machine", "The color of the machine"),
          ch("La météo du jour", "The day's weather"),
          ch("Le nombre d'opérateurs qui l'utilisent", "The number of operators using it")
        ] },
      tf("Un opérateur peut ignorer un voyant d'avertissement au tableau de bord si la machine semble fonctionner normalement.", "An operator can ignore a dashboard warning light if the machine seems to be running normally.", false),
      match("Associe chaque composant à sa fonction d'entretien.", "Match each component to its maintenance function.", [
        pair("Filtre à air", "Air filter", "Empêche les poussières d'entrer dans le moteur", "Keeps dust out of the engine"),
        pair("Filtre à huile", "Oil filter", "Retient les impuretés dans l'huile moteur", "Traps impurities in the engine oil"),
        pair("Liquide de refroidissement", "Coolant", "Évite la surchauffe du moteur", "Prevents the engine from overheating"),
        pair("Graissage", "Lubrication (greasing)", "Réduit la friction aux points d'articulation", "Reduces friction at pivot points")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Lorsqu'un carnet d'entretien indique plusieurs réparations répétées au même endroit sur une machine, cela suggère surtout...", en: "When a maintenance log shows several repeated repairs at the same spot on a machine, this mainly suggests...",
        choices: [
          ch("Un problème récurrent qui mérite une investigation plus approfondie", "A recurring problem that deserves further investigation", true),
          ch("Une simple coïncidence à ignorer", "A simple coincidence to ignore"),
          ch("Que la machine doit être repeinte", "That the machine needs repainting"),
          ch("Que le carnet doit être détruit", "That the log should be destroyed")
        ] },
      scenario("En plein quart de travail, un voyant rouge de pression d'huile s'allume au tableau de bord de ta machine. Que fais-tu?", "In the middle of a shift, a red oil pressure warning light comes on your machine's dashboard. What do you do?",
        [
          ch("Continuer à travailler jusqu'à la fin du quart", "Keep working until the end of the shift"),
          ch("Arrêter la machine de façon sécuritaire dès que possible et signaler le problème", "Safely stop the machine as soon as possible and report the problem", true),
          ch("Redémarrer le moteur plusieurs fois pour voir si ça se règle", "Restart the engine several times to see if it fixes itself"),
          ch("Augmenter le régime moteur pour compenser", "Increase engine RPM to compensate")
        ]),
      tf("Un entretien préventif bien fait peut réduire les coûts globaux d'exploitation d'une flotte de machinerie sur le long terme.", "Good preventive maintenance can reduce a fleet's overall operating costs in the long run.", true),
      match("Associe chaque type d'entretien à sa description.", "Match each maintenance type to its description.", [
        pair("Ronde d'inspection quotidienne", "Daily walk-around inspection", "Vérification rapide avant chaque quart", "Quick check before each shift"),
        pair("Entretien périodique planifié", "Scheduled periodic maintenance", "Basé sur les heures d'utilisation (ex: aux 250h)", "Based on usage hours (e.g., every 250h)"),
        pair("Réparation corrective", "Corrective repair", "Effectuée après la découverte d'une défectuosité", "Performed after a defect is found"),
        pair("Carnet d'entretien", "Maintenance log", "Historique des vérifications et réparations", "History of inspections and repairs")
      ])
    ] }
    ]
  },
  {
    id: "c05", code: "341-443/841-443", hours: 45, order: 5,
    title_fr: "Appliquer la technologie de base",
    title_en: "Use basic technology",
    icon: "⚙️",
    tiers: [
    { level: 1, questions: [
      { fr: "Un système hydraulique transmet la force principalement par...", en: "A hydraulic system mainly transmits force through...",
        choices: [
          ch("La rotation mécanique de courroies", "Mechanical rotation of belts"),
          ch("La pression d'un fluide", "Fluid pressure", true),
          ch("Le courant électrique direct", "Direct electric current"),
          ch("L'air comprimé uniquement", "Compressed air only")
        ] },
      { fr: "Dans un moteur diesel, l'allumage du carburant se fait par...", en: "In a diesel engine, fuel ignition occurs through...",
        choices: [
          ch("Une étincelle électrique, comme un moteur à essence", "An electric spark, like a gasoline engine"),
          ch("La compression de l'air dans le cylindre", "Compression of air in the cylinder", true),
          ch("Une flamme pilote externe", "An external pilot flame"),
          ch("Une réaction chimique dans le réservoir", "A chemical reaction in the tank")
        ] },
      { fr: "Un schéma électrique de base permet de...", en: "A basic electrical diagram allows you to...",
        choices: [
          ch("Calculer le poids total de la machine", "Calculate the machine's total weight"),
          ch("Déterminer la consommation de carburant", "Determine fuel consumption"),
          ch("Comprendre le circuit et localiser une panne", "Understand the circuit and locate a fault", true),
          ch("Remplacer les données du GPS", "Replace GPS data")
        ] },
      tf("L'huile hydraulique sert uniquement à lubrifier le moteur et n'a aucun rôle dans la transmission de puissance.", "Hydraulic oil is only used to lubricate the engine and plays no role in transmitting power.", false)
    ] },
    { level: 2, questions: [
      { fr: "Une pompe hydraulique a pour rôle de...", en: "A hydraulic pump's role is to...",
        choices: [
          ch("Mettre le fluide hydraulique sous pression pour créer un débit", "Pressurize hydraulic fluid to create flow", true),
          ch("Refroidir uniquement le moteur", "Only cool the engine"),
          ch("Filtrer l'air admis dans le moteur", "Filter the air entering the engine"),
          ch("Charger la batterie électrique", "Charge the electrical battery")
        ] },
      { fr: "Un vérin (cylindre) hydraulique convertit...", en: "A hydraulic cylinder converts...",
        choices: [
          ch("La pression du fluide en mouvement linéaire", "Fluid pressure into linear motion", true),
          ch("L'électricité en chaleur", "Electricity into heat"),
          ch("Le mouvement en électricité", "Motion into electricity"),
          ch("L'air comprimé en son", "Compressed air into sound")
        ] },
      tf("Un fusible électrique régule automatiquement la tension du circuit sans jamais couper le courant.", "An electrical fuse automatically regulates circuit voltage and never cuts the current.", false),
      match("Associe chaque composant hydraulique à sa fonction.", "Match each hydraulic component to its function.", [
        pair("Pompe hydraulique", "Hydraulic pump", "Met le fluide sous pression", "Pressurizes the fluid"),
        pair("Vérin", "Cylinder", "Transforme la pression en mouvement linéaire", "Converts pressure into linear motion"),
        pair("Filtre hydraulique", "Hydraulic filter", "Retient les contaminants dans l'huile", "Traps contaminants in the oil"),
        pair("Réservoir hydraulique", "Hydraulic reservoir", "Emmagasine le fluide du système", "Stores the system's fluid")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Une surchauffe du système hydraulique peut être causée par...", en: "Hydraulic system overheating can be caused by...",
        choices: [
          ch("Un niveau de fluide trop bas ou un filtre obstrué", "A too-low fluid level or a clogged filter", true),
          ch("Un excès de fluide hydraulique uniquement", "Excess hydraulic fluid only"),
          ch("Une température ambiante froide", "Cold ambient temperature"),
          ch("L'utilisation d'un carburant diesel de qualité", "Using quality diesel fuel")
        ] },
      scenario("Tu remarques que les mouvements hydrauliques de ta machine sont anormalement lents et que le fluide semble mousseux dans le réservoir. Que devrais-tu suspecter en premier?", "You notice your machine's hydraulic movements are unusually slow and the fluid looks foamy in the reservoir. What should you suspect first?",
        [
          ch("De l'air ou de l'eau dans le système hydraulique", "Air or water in the hydraulic system", true),
          ch("Un pneu à plat", "A flat tire"),
          ch("Un problème de radio embarquée", "A cab radio problem"),
          ch("Une panne du klaxon", "A horn malfunction")
        ]),
      tf("Les machines lourdes et les automobiles utilisent toujours exactement le même voltage électrique, soit 12 volts.", "Heavy machinery and automobiles always use exactly the same electrical voltage, 12 volts.", false),
      match("Associe chaque composant à sa fonction.", "Match each component to its function.", [
        pair("Compression (moteur diesel)", "Compression (diesel engine)", "Provoque l'auto-inflammation du carburant", "Causes fuel self-ignition"),
        pair("Alternateur", "Alternator", "Recharge la batterie pendant que le moteur tourne", "Recharges the battery while the engine runs"),
        pair("Radiateur", "Radiator", "Dissipe la chaleur du liquide de refroidissement", "Dissipates heat from the coolant"),
        pair("Turbocompresseur", "Turbocharger", "Augmente la quantité d'air admise pour plus de puissance", "Increases intake air for more power")
      ])
    ] }
    ]
  },
  {
    id: "c06", code: "341-452/841-452", hours: 30, order: 6,
    title_fr: "Appliquer des notions de compactage et d'épandage des enrobés",
    title_en: "Apply principles of asphalt compaction and spreading",
    icon: "🛣️",
    tiers: [
    { level: 1, questions: [
      { fr: "Le compactage d'un enrobé bitumineux vise principalement à...", en: "Compacting asphalt mainly aims to...",
        choices: [
          ch("Refroidir l'enrobé plus rapidement", "Cool the asphalt faster"),
          ch("Réduire les vides d'air et augmenter la densité", "Reduce air voids and increase density", true),
          ch("Réduire la quantité de bitume nécessaire", "Reduce the amount of bitumen needed"),
          ch("Ajouter du liant à la surface", "Add binder to the surface")
        ] },
      { fr: "La température de l'enrobé influence surtout...", en: "The asphalt temperature mainly affects...",
        choices: [
          ch("La couleur finale du revêtement", "The final color of the pavement"),
          ch("La consommation de carburant du camion", "The truck's fuel consumption"),
          ch("La facilité et l'efficacité du compactage", "The ease and effectiveness of compaction", true),
          ch("La durée de vie du rouleau compacteur", "The service life of the roller")
        ] },
      { fr: "Un épandage inégal de l'enrobé peut causer...", en: "Uneven asphalt spreading can cause...",
        choices: [
          ch("Une économie de matériel appréciable", "Significant material savings"),
          ch("Un compactage plus rapide qu'à l'habitude", "Faster than usual compaction"),
          ch("Des irrégularités de surface et une durabilité réduite", "Surface irregularities and reduced durability", true),
          ch("Une route globalement plus solide", "An overall stronger road")
        ] },
      tf("Un enrobé bitumineux qui refroidit trop avant le compactage devient plus difficile à densifier correctement.", "Asphalt that cools too much before compaction becomes harder to densify properly.", true)
    ] },
    { level: 2, questions: [
      { fr: "Le terme « lift » en pavage désigne...", en: "The term 'lift' in paving refers to...",
        choices: [
          ch("Une couche d'enrobé posée en une seule passe", "A layer of asphalt laid in a single pass", true),
          ch("Le nom d'un type de rouleau", "The name of a type of roller"),
          ch("La grue qui soulève l'asphalte", "The crane that lifts the asphalt"),
          ch("Un défaut de surface", "A surface defect")
        ] },
      { fr: "Un joint longitudinal mal compacté entre deux passages de paveuse peut causer...", en: "A poorly compacted longitudinal joint between two paver passes can cause...",
        choices: [
          ch("Une faiblesse et une infiltration d'eau à cet endroit", "A weak spot and water infiltration there", true),
          ch("Une route plus résistante à cet endroit", "A stronger road at that spot"),
          ch("Aucune conséquence", "No consequence"),
          ch("Une économie de bitume", "Savings on bitumen")
        ] },
      tf("La température de l'enrobé pendant le compactage n'a aucune influence sur sa résistance à la déformation.", "Asphalt temperature during compaction has no influence on its resistance to deformation.", false),
      match("Associe chaque terme du pavage à sa définition.", "Match each paving term to its definition.", [
        pair("Bitume", "Bitumen", "Liant qui agglomère les granulats de l'enrobé", "Binder that holds the asphalt aggregates together"),
        pair("Granulat", "Aggregate", "Pierre concassée formant le squelette de l'enrobé", "Crushed stone forming the asphalt's skeleton"),
        pair("Rouleau", "Roller", "Machine qui compacte l'enrobé", "Machine that compacts the asphalt"),
        pair("Paveuse", "Paver", "Machine qui étend l'enrobé sur la chaussée", "Machine that spreads asphalt on the roadway")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Le nombre de passages du rouleau, dans une séquence typique de compactage, se divise généralement en...", en: "The number of roller passes, in a typical compaction sequence, is generally divided into...",
        choices: [
          ch("Compactage initial, intermédiaire et final (chacun avec un rôle différent)", "Initial (breakdown), intermediate and final compaction (each with a different role)", true),
          ch("Un seul passage suffit toujours", "A single pass is always enough"),
          ch("Aucune séquence particulière n'est nécessaire", "No particular sequence is needed"),
          ch("Dix passages fixes peu importe le contexte", "A fixed ten passes regardless of context")
        ] },
      scenario("L'enrobé livré par le camion est visiblement plus froid que prévu. Que devrais-tu faire?", "The asphalt delivered by the truck is noticeably colder than expected. What should you do?",
        [
          ch("Continuer le compactage normalement sans ajuster", "Continue compacting normally without adjusting"),
          ch("Aviser le contremaître/superviseur rapidement, car la fenêtre de compactage efficace pourrait être dépassée", "Quickly notify the foreman/supervisor, since the effective compaction window could be missed", true),
          ch("Ajouter de l'eau sur l'enrobé pour le refroidir davantage", "Add water to the asphalt to cool it further"),
          ch("Attendre la fin de la journée pour compacter", "Wait until the end of the day to compact")
        ]),
      tf("La densité finale d'un enrobé compacté est un indicateur important de sa durabilité à long terme.", "The final density of compacted asphalt is an important indicator of its long-term durability.", true),
      match("Associe chaque étape de compactage à sa description.", "Match each compaction stage to its description.", [
        pair("Compactage initial (breakdown)", "Breakdown compaction", "Premier passage, réalisé pendant que l'enrobé est encore chaud", "First pass, done while the asphalt is still hot"),
        pair("Compactage intermédiaire", "Intermediate compaction", "Densification principale de la couche", "The layer's main densification"),
        pair("Compactage final (finish)", "Finish compaction", "Élimine les marques et lisse la surface", "Removes marks and smooths the surface"),
        pair("Fenêtre de compactage", "Compaction window", "Plage de température où le compactage est efficace", "The temperature range where compaction is effective")
      ])
    ] }
    ]
  },
  {
    id: "c07", code: "341-461/841-461", hours: 15, order: 7,
    title_fr: "Communiquer en milieu de travail",
    title_en: "Communicate in the workplace",
    icon: "💬",
    tiers: [
    { level: 1, questions: [
      { fr: "Sur un chantier bruyant, quel moyen de communication est souvent utilisé entre le signaleur et l'opérateur?", en: "On a noisy site, what communication method is often used between the signal person and the operator?",
        choices: [
          ch("Des textos envoyés en temps réel", "Text messages sent in real time"),
          ch("Des signaux gestuels standardisés et/ou une radio", "Standardized hand signals and/or a radio", true),
          ch("Des cris uniquement, peu importe la distance", "Shouting only, regardless of distance"),
          ch("Des lettres écrites remises en fin de journée", "Written letters delivered at day's end")
        ] },
      { fr: "Pourquoi est-il important de confirmer la réception d'une consigne sur un chantier?", en: "Why is it important to confirm receipt of an instruction on a job site?",
        choices: [
          ch("Pour respecter une simple formalité administrative", "To follow a simple administrative formality"),
          ch("Pour gagner du temps sur le chantier", "To save time on site"),
          ch("Pour éviter les malentendus pouvant causer un accident", "To avoid misunderstandings that could cause an accident", true),
          ch("Par tradition dans le métier", "As a trade tradition")
        ] },
      tf("Les signaux gestuels utilisés entre un signaleur et un opérateur sont standardisés afin d'être compris de la même façon sur tous les chantiers.", "Hand signals used between a signal person and an operator are standardized so they're understood the same way on every site.", true)
    ] },
    { level: 2, questions: [
      { fr: "Lors d'un breffage de sécurité (« toolbox talk ») avant un quart de travail, on discute généralement...", en: "During a safety briefing (toolbox talk) before a shift, the discussion generally covers...",
        choices: [
          ch("Des risques du jour et des consignes particulières du chantier", "The day's hazards and specific site instructions", true),
          ch("Uniquement de sujets personnels", "Only personal topics"),
          ch("Des résultats sportifs", "Sports results"),
          ch("De la température qu'il fera dans un mois", "The weather in a month")
        ] },
      { fr: "Pourquoi utilise-t-on un vocabulaire standardisé (jargon du métier) entre collègues sur un chantier?", en: "Why use standardized trade vocabulary among coworkers on a site?",
        choices: [
          ch("Pour être compris rapidement et clairement, même sous pression", "To be understood quickly and clearly, even under pressure", true),
          ch("Pour impressionner les nouveaux employés", "To impress new employees"),
          ch("Parce que c'est une exigence esthétique", "Because it's an aesthetic requirement"),
          ch("Pour compliquer les communications", "To make communication more complicated")
        ] },
      tf("Un rapport d'incident écrit permet de documenter un événement et d'éviter qu'il se reproduise.", "A written incident report documents an event and helps prevent it from happening again.", true),
      match("Associe chaque signal gestuel de base à sa signification.", "Match each basic hand signal to its meaning.", [
        pair("Bras levé, poing fermé", "Raised arm, closed fist", "Signal d'arrêt", "Stop signal"),
        pair("Bras balancés horizontalement", "Arms swung horizontally", "Signal pour avancer lentement", "Signal to move forward slowly"),
        pair("Paume vers le haut, mouvement vers le haut", "Palm up, upward motion", "Signal pour lever la charge/le godet", "Signal to raise the load/bucket"),
        pair("Doigt pointé vers le sol, mouvement circulaire", "Finger pointed down, circular motion", "Signal pour abaisser", "Signal to lower")
      ])
    ] },
    { level: 3, questions: [
      { fr: "En cas de conflit de communication entre un signaleur et un opérateur (consignes contradictoires perçues), la bonne pratique est de...", en: "If there's a communication conflict between a signal person and an operator (perceived contradictory instructions), the right practice is to...",
        choices: [
          ch("Arrêter la manœuvre et clarifier verbalement avant de continuer", "Stop the maneuver and clarify verbally before continuing", true),
          ch("Continuer en se fiant à sa propre interprétation", "Continue relying on one's own interpretation"),
          ch("Ignorer le signaleur si on est pressé", "Ignore the signal person if in a hurry"),
          ch("Demander à un collègue non impliqué de trancher au hasard", "Ask an uninvolved coworker to decide at random")
        ] },
      scenario("Sur un chantier bruyant, tu reçois un signal gestuel que tu ne reconnais pas clairement de la part du signaleur. Que fais-tu?", "On a noisy site, you receive a hand signal from the signal person that you don't clearly recognize. What do you do?",
        [
          ch("Deviner et continuer la manœuvre", "Guess and continue the maneuver"),
          ch("Arrêter tout mouvement et demander une clarification", "Stop all movement and ask for clarification", true),
          ch("Klaxonner et continuer quand même", "Honk and continue anyway"),
          ch("Ignorer le signaleur et suivre ton propre jugement", "Ignore the signal person and follow your own judgment")
        ]),
      tf("Une bonne communication d'équipe contribue directement à la prévention des accidents sur un chantier.", "Good team communication directly contributes to accident prevention on a site.", true),
      match("Associe chaque outil/document de communication à sa description.", "Match each communication tool/document to its description.", [
        pair("Radio bidirectionnelle", "Two-way radio", "Permet une communication vocale à distance sur le chantier", "Allows voice communication at a distance on site"),
        pair("Signaleur", "Signal person", "Personne désignée pour guider les manœuvres par signaux", "Person designated to guide maneuvers using signals"),
        pair("Rapport d'incident", "Incident report", "Document qui consigne un événement anormal survenu", "Document that records an abnormal event that occurred"),
        pair("Breffage de sécurité", "Safety briefing", "Rencontre courte avant le quart pour rappeler les risques", "Short meeting before a shift to review hazards")
      ])
    ] }
    ]
  },
  {
    id: "c08", code: "341-475/841-475", hours: 75, order: 8,
    title_fr: "Effectuer des travaux de manutention et chargement avec une chargeuse",
    title_en: "Perform handling and loading operations using a loader",
    icon: "🚜",
    tiers: [
    { level: 1, questions: [
      { fr: "Pour charger un camion avec une chargeuse, il faut d'abord...", en: "To load a truck with a loader, you should first...",
        choices: [
          ch("Charger le plus rapidement possible sans vérifier", "Load as fast as possible without checking"),
          ch("Retirer le godet pour accélérer le chargement", "Remove the bucket to speed up loading"),
          ch("Positionner la chargeuse et vérifier que la zone est libre", "Position the loader and confirm the area is clear", true),
          ch("Klaxonner une fois puis avancer immédiatement", "Honk once then move forward immediately")
        ] },
      { fr: "Un godet trop rempli lors du transport présente quel risque?", en: "An overloaded bucket during travel presents what risk?",
        choices: [
          ch("Une économie de carburant notable", "Noticeable fuel savings"),
          ch("Une perte de matériel et un déséquilibre de la machine", "Material spillage and machine instability", true),
          ch("Une meilleure visibilité pour l'opérateur", "Better visibility for the operator"),
          ch("Une réduction de l'usure des pneus", "Reduced tire wear")
        ] },
      { fr: "Pourquoi garder le godet bas lors des déplacements?", en: "Why keep the bucket low while traveling?",
        choices: [
          ch("Pour réduire le bruit du moteur", "To reduce engine noise"),
          ch("Pour aller plus vite sur le chantier", "To move faster on site"),
          ch("Pour la stabilité et une meilleure visibilité", "For stability and better visibility", true),
          ch("Pour économiser le système hydraulique", "To save the hydraulic system")
        ] },
      tf("Une chargeuse sur chenilles est généralement plus rapide sur une route asphaltée qu'une chargeuse sur pneus.", "A tracked loader is generally faster on a paved road than a wheeled loader.", false),
      { fr: "Dans la cabine de la chargeuse ci-dessus, à quoi sert le contrôle numéro 3?", en: "In the loader cab shown above, what is control number 3 used for?",
        machine: "chargeuse",
        choices: [
          ch("Contrôle le régime moteur et la vitesse", "Controls engine speed and travel speed", true),
          ch("Lève, abaisse et bascule le godet", "Raises, lowers and tilts the bucket"),
          ch("Contrôle la direction des roues", "Controls the direction of the wheels"),
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement")
        ] },
      { type: "hotspot", machine: "chargeuse", correctNum: 1,
        fr: "Sur l'image, clique sur le levier de commande du godet.",
        en: "On the image, click on the bucket control lever." }
    ] },
    { level: 2, questions: [
      { fr: "Pour maximiser la stabilité lors du chargement, le camion à charger devrait être positionné...", en: "To maximize stability while loading, the truck being loaded should be positioned...",
        choices: [
          ch("Le plus près possible et bien aligné avec la chargeuse", "As close as possible and well aligned with the loader", true),
          ch("Le plus loin possible pour éviter la poussière", "As far away as possible to avoid dust"),
          ch("En angle de 90° peu importe la distance", "At a 90° angle regardless of distance"),
          ch("Peu importe la position, cela n'a pas d'impact", "The position doesn't matter")
        ] },
      tf("Une chargeuse peut être utilisée de façon sécuritaire pour soulever une personne dans le godet si la tâche est courte.", "A loader can safely be used to lift a person in the bucket if the task is short.", false),
      match("Associe chaque élément de la chargeuse à sa description.", "Match each loader part to its description.", [
        pair("Godet", "Bucket", "Réceptacle avant qui ramasse et transporte le matériau", "Front receptacle that scoops and carries material"),
        pair("Levier de commande du godet", "Bucket control lever", "Lève, abaisse et bascule le godet", "Raises, lowers and tilts the bucket"),
        pair("Volant de direction", "Steering wheel", "Contrôle la direction des roues", "Controls the direction of the wheels"),
        pair("Zone de giration arrière", "Rear swing zone", "Espace balayé lors des manœuvres de recul", "Area swept during reversing maneuvers")
      ]),
      { fr: "Dans la cabine de la chargeuse ci-dessus, à quoi sert le contrôle numéro 2?", en: "In the loader cab shown above, what is control number 2 used for?",
        machine: "chargeuse",
        choices: [
          ch("Contrôle la direction des roues", "Controls the direction of the wheels", true),
          ch("Lève, abaisse et bascule le godet", "Raises, lowers and tilts the bucket"),
          ch("Contrôle le régime moteur et la vitesse", "Controls engine speed and travel speed"),
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement")
        ] }
    ] },
    { level: 3, questions: [
      { fr: "Lorsqu'une chargeuse doit reculer dans une zone où des travailleurs à pied circulent, la priorité est de...", en: "When a loader must reverse in an area where workers on foot are present, the priority is to...",
        choices: [
          ch("S'assurer que l'alarme de recul fonctionne et vérifier les angles morts avant de reculer", "Make sure the backup alarm works and check blind spots before reversing", true),
          ch("Reculer rapidement pour minimiser le temps d'exposition", "Reverse quickly to minimize exposure time"),
          ch("Compter sur les travailleurs pour s'écarter d'eux-mêmes sans vérifier", "Count on workers to move out of the way on their own"),
          ch("Désactiver l'alarme de recul si elle dérange", "Disable the backup alarm if it's bothersome")
        ] },
      scenario("Tu dois charger un camion, mais tu remarques qu'un travailleur se trouve dans l'angle mort arrière de ta chargeuse pendant une manœuvre de recul. Que fais-tu?", "You need to load a truck, but you notice a worker is in your loader's rear blind spot during a reversing maneuver. What do you do?",
        [
          ch("Continuer prudemment puisque tu es pressé", "Continue carefully since you're in a hurry"),
          ch("Arrêter immédiatement la machine jusqu'à ce que la zone soit dégagée", "Stop the machine immediately until the area is clear", true),
          ch("Klaxonner une fois et continuer sans attendre", "Honk once and continue without waiting"),
          ch("Reculer plus lentement sans t'arrêter", "Reverse more slowly without stopping")
        ]),
      tf("Le centre de gravité d'une chargeuse se déplace vers l'avant lorsque le godet est chargé et levé, ce qui peut augmenter le risque de bascule.", "A loader's center of gravity shifts forward when the bucket is loaded and raised, which can increase tip-over risk.", true),
      { type: "hotspot", machine: "chargeuse", correctNum: 4,
        fr: "Sur l'image, clique sur le klaxon.",
        en: "On the image, click on the horn button." }
    ] }
    ]
  },
  {
    id: "c09", code: "341-485/841-485", hours: 75, order: 9,
    title_fr: "Effectuer des travaux de préparation du terrain avec une pelle",
    title_en: "Perform site preparation work using an excavator",
    icon: "🏗️",
    tiers: [
    { level: 1, questions: [
      { fr: "Avant de creuser, il faut vérifier...", en: "Before digging, you must check...",
        choices: [
          ch("La météo prévue pour la semaine prochaine", "Next week's forecasted weather"),
          ch("L'horaire de travail des autres opérateurs", "The other operators' work schedules"),
          ch("La localisation des services souterrains (Info-Excavation)", "The location of underground utilities (utility locates)", true),
          ch("La couleur et la texture du sol", "The color and texture of the soil")
        ] },
      { fr: "Le rayon de giration (« swing radius ») d'une pelle désigne...", en: "The swing radius of an excavator refers to...",
        choices: [
          ch("La distance de freinage de la machine", "The machine's braking distance"),
          ch("La hauteur maximale atteinte par le godet", "The maximum height reached by the bucket"),
          ch("La zone balayée par la flèche et le balancier en pivotant", "The area swept by the boom and arm while rotating", true),
          ch("La largeur totale des chenilles", "The total width of the tracks")
        ] },
      tf("La profondeur maximale de creusage d'une pelle dépend notamment de la longueur de son bras (balancier) et de sa flèche.", "An excavator's maximum digging depth depends in part on the length of its stick (arm) and boom.", true),
      { fr: "Dans la cabine de la pelle ci-dessus, à quoi sert le contrôle numéro 2?", en: "In the excavator cab shown above, what is control number 2 used for?",
        machine: "pelle",
        choices: [
          ch("Contrôle la flèche et le bras (balancier)", "Controls the boom and the stick (arm)", true),
          ch("Contrôle la rotation de la tourelle et le godet", "Controls turret rotation and the bucket"),
          ch("Font avancer ou reculer les chenilles", "Move the tracks forward or backward"),
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement")
        ] },
      { type: "hotspot", machine: "pelle", correctNum: 4,
        fr: "Sur l'image, clique sur le klaxon.",
        en: "On the image, click on the horn button." }
    ] },
    { level: 2, questions: [
      { fr: "Le godet d'une pelle est généralement changé pour un godet différent selon...", en: "An excavator's bucket is generally swapped for a different one based on...",
        choices: [
          ch("Le type de sol et la tâche à effectuer", "The soil type and the task at hand", true),
          ch("La couleur préférée de l'opérateur", "The operator's preferred color"),
          ch("L'heure de la journée", "The time of day"),
          ch("La météo uniquement", "The weather only")
        ] },
      tf("La tourelle d'une pelle mécanique est généralement limitée à une rotation de 180 degrés maximum.", "An excavator's turret is generally limited to a maximum rotation of 180 degrees.", false),
      match("Associe chaque partie de la pelle à sa description.", "Match each excavator part to its description.", [
        pair("Flèche (boom)", "Boom", "Section reliée directement à la tourelle", "Section connected directly to the turret"),
        pair("Bras / balancier (stick)", "Stick (arm)", "Section entre la flèche et le godet", "Section between the boom and the bucket"),
        pair("Godet", "Bucket", "Outil qui creuse et transporte le matériau", "Tool that digs and carries material"),
        pair("Tourelle", "Turret (house)", "Partie supérieure qui pivote sur le châssis", "Upper part that rotates on the undercarriage")
      ]),
      { fr: "Dans la cabine de la pelle ci-dessus, à quoi sert le contrôle numéro 1?", en: "In the excavator cab shown above, what is control number 1 used for?",
        machine: "pelle",
        choices: [
          ch("Contrôle la rotation de la tourelle et le godet", "Controls turret rotation and the bucket", true),
          ch("Contrôle la flèche et le bras (balancier)", "Controls the boom and the stick (arm)"),
          ch("Font avancer ou reculer les chenilles", "Move the tracks forward or backward"),
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement")
        ] }
    ] },
    { level: 3, questions: [
      { fr: "Lorsqu'une pelle doit se déplacer sur une pente, il est généralement recommandé de...", en: "When an excavator must travel on a slope, it's generally recommended to...",
        choices: [
          ch("Garder le godet bas et près du sol pour abaisser le centre de gravité", "Keep the bucket low and close to the ground to lower the center of gravity", true),
          ch("Lever le godet le plus haut possible pour mieux voir", "Raise the bucket as high as possible for better visibility"),
          ch("Se déplacer en diagonale rapide", "Move quickly on a diagonal"),
          ch("Ignorer la pente si le trajet est court", "Ignore the slope if the route is short")
        ] },
      scenario("En creusant une tranchée, ta pelle atteint une ligne qui pourrait être un service souterrain non identifié sur le plan. Que fais-tu?", "While digging a trench, your excavator hits a line that could be an underground utility not shown on the plan. What do you do?",
        [
          ch("Continuer à creuser prudemment jusqu'à confirmation visuelle complète", "Keep digging carefully until you have full visual confirmation"),
          ch("Arrêter immédiatement et faire vérifier la situation avant de continuer", "Stop immediately and have the situation checked before continuing", true),
          ch("Pousser plus fort pour voir de quoi il s'agit", "Push harder to see what it is"),
          ch("Ignorer et continuer le reste de la tranchée", "Ignore it and continue the rest of the trench")
        ]),
      tf("Le rayon de giration d'une pelle peut varier selon la position du bras et de la flèche pendant la rotation.", "An excavator's swing radius can vary depending on the position of the arm and boom during rotation.", true),
      { type: "hotspot", machine: "pelle", correctNum: 3,
        fr: "Sur l'image, clique sur les pédales de translation.",
        en: "On the image, click on the travel pedals." }
    ] }
    ]
  },
  {
    id: "c10", code: "341-495/841-495", hours: 75, order: 10,
    title_fr: "Effectuer des travaux de préparation du terrain avec une niveleuse",
    title_en: "Perform site preparation work using a grader",
    icon: "🚧",
    tiers: [
    { level: 1, questions: [
      { fr: "La lame d'une niveleuse sert principalement à...", en: "A grader's blade is mainly used to...",
        choices: [
          ch("Compacter l'asphalte fraîchement posé", "Compact freshly laid asphalt"),
          ch("Niveler et façonner la surface du sol", "Level and shape the ground surface", true),
          ch("Creuser des tranchées profondes", "Dig deep trenches"),
          ch("Transporter des matériaux sur de longues distances", "Haul materials over long distances")
        ] },
      { fr: "L'angle de la lame (« blade angle ») influence surtout...", en: "The blade angle mainly affects...",
        choices: [
          ch("Le niveau d'huile hydraulique de la machine", "The machine's hydraulic oil level"),
          ch("La vitesse maximale du moteur", "The engine's top speed"),
          ch("La direction dans laquelle le matériau est déplacé", "The direction the material is cast", true),
          ch("La couleur apparente du sol", "The apparent color of the soil")
        ] },
      tf("Une niveleuse est généralement montée sur chenilles plutôt que sur roues.", "A grader is generally mounted on tracks rather than wheels.", false),
      { fr: "Dans la cabine de la niveleuse ci-dessus, à quoi sert le contrôle numéro 4?", en: "In the grader cab shown above, what is control number 4 used for?",
        machine: "niveleuse",
        choices: [
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement", true),
          ch("Ajustent l'angle, la hauteur et l'inclinaison de la lame", "Adjust the blade's angle, height and tilt"),
          ch("Contrôle la direction des roues avant", "Controls the direction of the front wheels"),
          ch("Articule le châssis pour resserrer le rayon de braquage", "Articulates the frame to tighten the turning radius")
        ] },
      { type: "hotspot", machine: "niveleuse", correctNum: 1,
        fr: "Sur l'image, clique sur les leviers de la lame.",
        en: "On the image, click on the blade control levers." }
    ] },
    { level: 2, questions: [
      { fr: "L'articulation du châssis d'une niveleuse permet surtout de...", en: "A grader's frame articulation mainly allows...",
        choices: [
          ch("Réduire son rayon de braquage dans les espaces restreints", "Reducing its turning radius in tight spaces", true),
          ch("Augmenter sa vitesse maximale", "Increasing its top speed"),
          ch("Réduire sa consommation de carburant", "Reducing its fuel consumption"),
          ch("Éliminer le besoin de la lame", "Eliminating the need for the blade")
        ] },
      tf("La niveleuse est rarement utilisée pour la finition fine; elle sert presque exclusivement au terrassement grossier.", "The grader is rarely used for fine finishing; it is used almost exclusively for rough grading.", false),
      match("Associe chaque élément de la niveleuse à sa description.", "Match each grader part to its description.", [
        pair("Lame (blade)", "Blade", "Outil principal qui façonne la surface", "The main tool that shapes the surface"),
        pair("Scarificateur", "Scarifier", "Dents à l'avant qui ameublissent un sol compact", "Front teeth that loosen compacted soil"),
        pair("Roues avant orientables", "Steerable front wheels", "Permettent des ajustements fins de direction", "Allow fine steering adjustments"),
        pair("Articulation du châssis", "Frame articulation", "Permet de resserrer le rayon de braquage", "Allows tightening the turning radius")
      ]),
      { fr: "Dans la cabine de la niveleuse ci-dessus, à quoi sert le contrôle numéro 3?", en: "In the grader cab shown above, what is control number 3 used for?",
        machine: "niveleuse",
        choices: [
          ch("Articule le châssis pour resserrer le rayon de braquage", "Articulates the frame to tighten the turning radius", true),
          ch("Ajustent l'angle, la hauteur et l'inclinaison de la lame", "Adjust the blade's angle, height and tilt"),
          ch("Contrôle la direction des roues avant", "Controls the direction of the front wheels"),
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement")
        ] }
    ] },
    { level: 3, questions: [
      { fr: "Pour obtenir une pente constante sur une longue distance, un opérateur de niveleuse expérimenté va souvent...", en: "To achieve a constant slope over a long distance, an experienced grader operator will often...",
        choices: [
          ch("Utiliser un système de guidage (laser/GPS) ou des repères visuels réguliers", "Use a guidance system (laser/GPS) or regular visual references", true),
          ch("Se fier uniquement à son impression visuelle sans aucun repère", "Rely only on their visual impression with no reference"),
          ch("Changer d'angle de lame à chaque mètre sans raison", "Change the blade angle every meter for no reason"),
          ch("Éviter complètement d'ajuster la lame", "Avoid adjusting the blade entirely")
        ] },
      scenario("Tu remarques que la surface que tu viens de niveler présente des ondulations répétitives (« washboard »). Quelle est la cause la plus probable et l'ajustement à faire?", "You notice the surface you just graded has repetitive ripples (washboarding). What is the most likely cause and the adjustment to make?",
        [
          ch("Vitesse de travail trop élevée — il faut ralentir et ajuster l'angle de lame", "Working speed too high — slow down and adjust the blade angle", true),
          ch("La machine est défectueuse et rien ne peut être fait", "The machine is faulty and nothing can be done"),
          ch("C'est normal et ne nécessite aucun ajustement", "It's normal and needs no adjustment"),
          ch("Le problème vient uniquement du carburant utilisé", "The problem is only due to the fuel used")
        ]),
      tf("Un bon « crown » (bombement) de la route nécessite un ajustement précis et constant de l'angle de la lame.", "A proper road crown requires precise, constant adjustment of the blade angle.", true),
      { type: "hotspot", machine: "niveleuse", correctNum: 2,
        fr: "Sur l'image, clique sur le volant de direction.",
        en: "On the image, click on the steering wheel." }
    ] }
    ]
  },
  {
    id: "c11", code: "341-504/841-504", hours: 60, order: 11,
    title_fr: "Effectuer des travaux de désagrégation de matériaux avec une chargeuse-pelleteuse",
    title_en: "Break up materials using a backhoe loader",
    icon: "⛏️",
    tiers: [
    { level: 1, questions: [
      { fr: "La chargeuse-pelleteuse combine quelles deux fonctions?", en: "A backhoe loader combines which two functions?",
        choices: [
          ch("Le levage et le grutage de charges", "Lifting and craning loads"),
          ch("Le compactage et l'épandage d'enrobé", "Compacting and spreading asphalt"),
          ch("Le chargement à l'avant et l'excavation à l'arrière", "Front loading and rear excavation", true),
          ch("Le transport et le nivellement uniquement", "Hauling and grading only")
        ] },
      { fr: "Pour désagréger un matériau dur, on utilise souvent...", en: "To break up hard material, you often use...",
        choices: [
          ch("Un rouleau lisse standard", "A standard smooth roller"),
          ch("Une dent (ripper) ou un godet renforcé", "A ripper tooth or reinforced bucket", true),
          ch("Une lame de niveleuse classique", "A standard grader blade"),
          ch("Un godet conçu pour l'enrobé", "A bucket designed for asphalt")
        ] },
      tf("Une dent de désagrégation (« ripper ») est surtout utile pour briser un sol gelé ou un matériau très compact.", "A ripper tooth is mainly useful for breaking up frozen ground or very compact material.", true)
    ] },
    { level: 2, questions: [
      { fr: "La chargeuse-pelleteuse est particulièrement appréciée sur les petits chantiers pour...", en: "The backhoe loader is especially valued on small sites for...",
        choices: [
          ch("Sa polyvalence (chargement et excavation avec une seule machine)", "Its versatility (loading and excavation with one machine)", true),
          ch("Sa vitesse de pointe très élevée", "Its very high top speed"),
          ch("Sa capacité à paver l'asphalte", "Its ability to pave asphalt"),
          ch("Son absence totale de stabilisateurs", "Its total lack of outriggers")
        ] },
      tf("Les stabilisateurs (« outriggers ») ne sont utiles que pour le transport de la machine, jamais pour le creusage.", "Outriggers are only useful for transporting the machine, never for digging.", false),
      match("Associe chaque élément à sa fonction.", "Match each part to its function.", [
        pair("Godet avant", "Front bucket", "Utilisé pour le chargement et le déplacement de matériaux", "Used for loading and moving material"),
        pair("Godet arrière (rétro)", "Rear (backhoe) bucket", "Utilisé pour l'excavation sous le niveau de la machine", "Used for excavating below the machine's level"),
        pair("Stabilisateurs", "Outriggers", "Assurent l'équilibre de la machine pendant le creusage", "Keep the machine balanced while digging"),
        pair("Dent de désagrégation (ripper)", "Ripper tooth", "Brise les sols durs ou gelés", "Breaks up hard or frozen soil")
      ]),
      { fr: "Un godet renforcé (« rock bucket ») est surtout utile pour...", en: "A reinforced (rock) bucket is mainly useful for...",
        choices: [
          ch("Manipuler des matériaux rocheux ou abrasifs", "Handling rocky or abrasive material", true),
          ch("Transporter du liquide", "Transporting liquid"),
          ch("Compacter l'asphalte", "Compacting asphalt"),
          ch("Peindre les structures", "Painting structures")
        ] }
    ] },
    { level: 3, questions: [
      { fr: "Lorsqu'on désagrège un matériau très dur avec le godet arrière, un risque mécanique à surveiller est...", en: "When breaking up very hard material with the rear bucket, a mechanical risk to watch for is...",
        choices: [
          ch("Une usure ou un bris prématuré des dents du godet ou du bras", "Premature wear or breakage of the bucket teeth or arm", true),
          ch("Une amélioration automatique de la performance du moteur", "An automatic improvement in engine performance"),
          ch("Une réduction du poids de la machine", "A reduction in machine weight"),
          ch("Aucun risque particulier", "No particular risk")
        ] },
      scenario("Tu dois désagréger un sol partiellement gelé en bordure d'un chantier résidentiel. Quelle approche est la plus appropriée?", "You need to break up partially frozen ground at the edge of a residential site. What approach is most appropriate?",
        [
          ch("Frapper le sol violemment et rapidement avec le godet pour aller plus vite", "Strike the ground hard and fast with the bucket to go faster"),
          ch("Travailler par petits mouvements progressifs, en respectant les limites de la machine et du chantier", "Work in small, progressive movements, respecting the machine's and site's limits", true),
          ch("Retirer les stabilisateurs pour être plus mobile", "Remove the outriggers to be more mobile"),
          ch("Ignorer les vibrations ressenties dans la cabine", "Ignore the vibrations felt in the cab")
        ]),
      tf("Une chargeuse-pelleteuse est généralement moins puissante pour l'excavation profonde qu'une pelle mécanique dédiée.", "A backhoe loader is generally less powerful for deep excavation than a dedicated excavator.", true),
      match("Associe chaque type de sol au défi qu'il présente.", "Match each soil type to the challenge it presents.", [
        pair("Sol gelé", "Frozen ground", "Nécessite souvent une dent de désagrégation", "Often requires a ripper tooth"),
        pair("Sol meuble", "Loose soil", "Peut généralement être excavé directement au godet", "Can usually be excavated directly with the bucket"),
        pair("Roc fracturé", "Fractured rock", "Peut nécessiter un godet renforcé ou un marteau hydraulique", "May require a reinforced bucket or hydraulic hammer"),
        pair("Argile compacte", "Compact clay", "Peut ralentir significativement le rythme d'excavation", "Can significantly slow the excavation pace")
      ])
    ] }
    ]
  },
  {
    id: "c12", code: "341-515/841-515", hours: 75, order: 12,
    title_fr: "Effectuer des travaux de préparation du terrain avec un bouteur",
    title_en: "Prepare a site using a bulldozer",
    icon: "🚛",
    tiers: [
    { level: 1, questions: [
      { fr: "Un bouteur (bulldozer) est surtout utilisé pour...", en: "A bulldozer is mainly used for...",
        choices: [
          ch("Le forage de puits", "Drilling wells"),
          ch("Le pavage fin de surfaces", "Fine surface paving"),
          ch("Pousser et déplacer de grandes quantités de matériaux", "Pushing and moving large quantities of material", true),
          ch("Le levage de charges lourdes en hauteur", "Lifting heavy loads to height")
        ] },
      { fr: "Les chenilles d'un bouteur offrent surtout...", en: "A bulldozer's tracks mainly offer...",
        choices: [
          ch("Une vitesse de pointe élevée sur route", "A high top speed on roads"),
          ch("Une meilleure traction et distribution du poids", "Better traction and weight distribution", true),
          ch("Un confort de conduite amélioré sur l'asphalte", "Improved ride comfort on asphalt"),
          ch("Une réduction du bruit du moteur", "Reduced engine noise")
        ] },
      tf("Le poids élevé d'un bouteur n'a aucun lien avec sa capacité de poussée; seule la puissance du moteur compte.", "A bulldozer's high weight has no connection to its pushing power; only engine power matters.", false),
      { fr: "Dans la cabine du bouteur ci-dessus, à quoi sert le contrôle numéro 1?", en: "In the bulldozer cab shown above, what is control number 1 used for?",
        machine: "bouteur",
        choices: [
          ch("Lève, abaisse et incline la lame", "Raises, lowers and tilts the blade", true),
          ch("Contrôlent la direction en ralentissant une chenille à la fois", "Control steering by slowing one track at a time"),
          ch("Ralentit ou immobilise la machine", "Slows or stops the machine"),
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement")
        ] },
      { type: "hotspot", machine: "bouteur", correctNum: 2,
        fr: "Sur l'image, clique sur les manettes de direction (chenilles).",
        en: "On the image, click on the steering clutch levers." }
    ] },
    { level: 2, questions: [
      { fr: "Un ripper à l'arrière d'un bouteur sert à...", en: "A ripper at the rear of a bulldozer is used to...",
        choices: [
          ch("Ameublir ou fissurer un sol dur avant de le pousser", "Loosen or fracture hard ground before pushing it", true),
          ch("Compacter l'asphalte", "Compact asphalt"),
          ch("Charger un camion", "Load a truck"),
          ch("Niveler une route asphaltée", "Level a paved road")
        ] },
      tf("Un bouteur équipé d'une lame en U (« U-blade ») est optimisé pour déplacer de grands volumes de matériaux légers sur de longues distances.", "A bulldozer equipped with a U-blade is optimized for moving large volumes of light material over long distances.", true),
      match("Associe chaque élément du bouteur à sa fonction.", "Match each bulldozer part to its function.", [
        pair("Lame", "Blade", "Pousse et déplace le matériau à l'avant", "Pushes and moves material at the front"),
        pair("Ripper", "Ripper", "Ameublit le sol dur à l'arrière", "Loosens hard ground at the rear"),
        pair("Chenilles", "Tracks", "Offrent traction et distribution du poids", "Provide traction and weight distribution"),
        pair("Manettes de direction", "Steering clutch levers", "Ralentissent une chenille pour tourner", "Slow one track to steer")
      ]),
      { fr: "Dans la cabine du bouteur ci-dessus, à quoi sert le contrôle numéro 3?", en: "In the bulldozer cab shown above, what is control number 3 used for?",
        machine: "bouteur",
        choices: [
          ch("Ralentit ou immobilise la machine", "Slows or stops the machine", true),
          ch("Lève, abaisse et incline la lame", "Raises, lowers and tilts the blade"),
          ch("Contrôlent la direction en ralentissant une chenille à la fois", "Control steering by slowing one track at a time"),
          ch("Avertit les personnes autour de la machine avant un mouvement", "Warns people around the machine before a movement")
        ] }
    ] },
    { level: 3, questions: [
      { fr: "Lorsqu'un bouteur travaille sur une pente raide, un des risques principaux à gérer est...", en: "When a bulldozer works on a steep slope, one of the main risks to manage is...",
        choices: [
          ch("Le renversement latéral de la machine", "The machine tipping over sideways", true),
          ch("Une surconsommation de peinture", "Excessive paint consumption"),
          ch("Une amélioration automatique de la traction", "An automatic improvement in traction"),
          ch("Aucun risque particulier sur une pente", "No particular risk on a slope")
        ] },
      scenario("En poussant un tas de matériau, tu sens que la machine commence à patiner fortement sans avancer. Que devrais-tu faire?", "While pushing a pile of material, you feel the machine start to spin its tracks hard without moving forward. What should you do?",
        [
          ch("Continuer à pousser plus fort avec plus de puissance moteur", "Keep pushing harder with more engine power"),
          ch("Reculer, réduire la charge poussée et réévaluer l'approche", "Back off, reduce the pushed load and reassess the approach", true),
          ch("Ignorer et changer de direction brusquement", "Ignore it and change direction abruptly"),
          ch("Désactiver les chenilles", "Disable the tracks")
        ]),
      tf("Un bouteur peut aussi être utilisé pour étaler et compacter partiellement des matériaux de remblai par couches successives.", "A bulldozer can also be used to spread and partially compact fill material in successive layers.", true),
      { type: "hotspot", machine: "bouteur", correctNum: 4,
        fr: "Sur l'image, clique sur le klaxon.",
        en: "On the image, click on the horn button." }
    ] }
    ]
  },
  {
    id: "c13", code: "341-525/841-525", hours: 75, order: 13,
    title_fr: "Effectuer des travaux d'excavation avec une pelle",
    title_en: "Perform excavation work using an excavator",
    icon: "🕳️",
    tiers: [
    { level: 1, questions: [
      { fr: "Lors d'une excavation en tranchée, quel est un risque majeur?", en: "During trench excavation, what is a major risk?",
        choices: [
          ch("Le bruit excessif du moteur", "Excessive engine noise"),
          ch("La couleur du godet utilisé", "The color of the bucket used"),
          ch("L'effondrement des parois de la tranchée", "Trench wall collapse", true),
          ch("Une météo trop ensoleillée", "Overly sunny weather")
        ] },
      { fr: "Où doivent être déposés les matériaux excavés par rapport à la tranchée?", en: "Where should excavated material be placed relative to the trench?",
        choices: [
          ch("Directement sur le bord pour gagner du temps", "Right at the edge to save time"),
          ch("Toujours remis dans la tranchée immédiatement", "Always put right back in the trench"),
          ch("Peu importe l'endroit choisi", "Anywhere, it doesn't matter"),
          ch("À une distance sécuritaire du bord pour éviter l'effondrement", "A safe distance from the edge to prevent collapse", true)
        ] },
      tf("Une tranchée doit toujours être plus large que nécessaire pour permettre à un travailleur d'y circuler librement, peu importe la réglementation applicable.", "A trench should always be wider than necessary to let a worker move around freely, regardless of applicable regulations.", false)
    ] },
    { level: 2, questions: [
      { fr: "Le talutage (« sloping ») d'une tranchée consiste à...", en: "Sloping a trench consists of...",
        choices: [
          ch("Incliner les parois pour réduire le risque d'effondrement", "Angling the walls to reduce collapse risk", true),
          ch("Rendre les parois parfaitement verticales", "Making the walls perfectly vertical"),
          ch("Remplir la tranchée immédiatement après le creusage", "Filling the trench right after digging"),
          ch("Peindre les parois pour les stabiliser", "Painting the walls to stabilize them")
        ] },
      { fr: "Le blindage (« shoring »/« trench box ») d'une tranchée sert à...", en: "Shoring (trench box) a trench serves to...",
        choices: [
          ch("Soutenir mécaniquement les parois pour protéger les travailleurs", "Mechanically support the walls to protect workers", true),
          ch("Décorer le chantier", "Decorate the site"),
          ch("Accélérer le compactage du sol autour", "Speed up compaction of the surrounding soil"),
          ch("Remplacer l'inspection visuelle du sol", "Replace visual soil inspection")
        ] },
      tf("Le type de sol n'a aucune influence sur le risque d'effondrement d'une tranchée; seule la profondeur compte.", "Soil type has no influence on a trench's collapse risk; only depth matters.", false),
      match("Associe chaque terme d'excavation à sa définition.", "Match each excavation term to its definition.", [
        pair("Talutage", "Sloping", "Inclinaison des parois d'une tranchée", "Angling of a trench's walls"),
        pair("Blindage", "Shoring", "Structure de soutien installée dans la tranchée", "Support structure installed in the trench"),
        pair("Zone d'accès sécuritaire", "Safe access zone", "Endroit prévu pour entrer/sortir de la tranchée", "Designated spot to enter/exit the trench"),
        pair("Distance sécuritaire de dépôt", "Safe spoil distance", "Espace minimal entre le bord et les matériaux excavés", "Minimum space between the edge and excavated material")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Une tranchée de plus de 1,2 mètre de profondeur nécessite généralement, selon les règles de sécurité applicables au Québec...", en: "A trench deeper than 1.2 meters generally requires, under applicable Québec safety rules...",
        choices: [
          ch("Une protection contre l'effondrement sous certaines conditions", "Protection against collapse under certain conditions", true),
          ch("Aucune mesure particulière peu importe le sol", "No particular measure regardless of soil type"),
          ch("Uniquement un cône orange à l'entrée", "Only an orange cone at the entrance"),
          ch("Un permis de conduire classe 1", "A Class 1 driver's licence")
        ] },
      scenario("Un collègue doit entrer dans une tranchée de 2 mètres de profondeur pour une inspection rapide, sans protection contre l'effondrement en place. Que devrait-il faire?", "A coworker needs to enter a 2-meter-deep trench for a quick inspection, with no collapse protection in place. What should he do?",
        [
          ch("Entrer rapidement puisque ce sera une visite très courte", "Go in quickly since it will be a very short visit"),
          ch("Refuser d'entrer tant qu'une protection adéquate n'est pas en place", "Refuse to enter until adequate protection is in place", true),
          ch("Demander à quelqu'un d'autre d'y aller à sa place sans protection non plus", "Ask someone else to go in instead, also without protection"),
          ch("Entrer seulement si le sol semble sec", "Enter only if the soil looks dry")
        ]),
      tf("L'eau souterraine ou la pluie peut augmenter significativement le risque d'effondrement d'une tranchée.", "Groundwater or rain can significantly increase a trench's collapse risk.", true),
      match("Associe chaque terme technique à sa définition.", "Match each technical term to its definition.", [
        pair("Sol de type A (stable)", "Type A soil (stable)", "Permet généralement une pente plus abrupte", "Generally allows a steeper slope"),
        pair("Sol de type C (instable)", "Type C soil (unstable)", "Nécessite une pente plus douce ou un blindage", "Requires a gentler slope or shoring"),
        pair("Surcharge en bordure", "Edge surcharge", "Matériaux ou machinerie trop près du bord", "Material or machinery too close to the edge"),
        pair("Inspection quotidienne de la tranchée", "Daily trench inspection", "Vérification requise avant chaque entrée de travailleurs", "Check required before workers enter each day")
      ])
    ] }
    ]
  },
  {
    id: "c14", code: "341-534/841-534", hours: 60, order: 14,
    title_fr: "Effectuer des travaux d'excavation avec une chargeuse-pelleteuse",
    title_en: "Perform excavation work using a backhoe loader",
    icon: "🕳️",
    tiers: [
    { level: 1, questions: [
      { fr: "Lors de l'excavation avec une chargeuse-pelleteuse, les stabilisateurs (« outriggers ») servent à...", en: "When excavating with a backhoe loader, the outriggers are used to...",
        choices: [
          ch("Refroidir le moteur pendant l'excavation", "Cool the engine during excavation"),
          ch("Améliorer la réception de la radio embarquée", "Improve onboard radio reception"),
          ch("Stabiliser la machine pendant le creusage", "Stabilize the machine while digging", true),
          ch("Faciliter le chargement du godet avant", "Make front bucket loading easier")
        ] },
      { fr: "Le godet arrière d'une chargeuse-pelleteuse est optimisé pour...", en: "The rear bucket of a backhoe loader is optimized for...",
        choices: [
          ch("Pousser du matériau vers l'avant", "Pushing material forward"),
          ch("Compacter le sol en surface", "Compacting soil at the surface"),
          ch("Étendre une couche d'asphalte", "Spreading an asphalt layer"),
          ch("Creuser sous le niveau où se trouve la machine", "Digging below the machine's level", true)
        ] },
      tf("Le godet arrière d'une chargeuse-pelleteuse peut généralement pivoter (godet articulé) pour creuser à différents angles sans déplacer la machine.", "A backhoe loader's rear bucket can usually rotate (articulated bucket) to dig at different angles without moving the machine.", true)
    ] },
    { level: 2, questions: [
      { fr: "Avant de déployer les stabilisateurs d'une chargeuse-pelleteuse, il faut s'assurer que...", en: "Before deploying a backhoe loader's outriggers, you must ensure that...",
        choices: [
          ch("Le sol sous les patins est stable et capable de supporter la machine", "The ground under the pads is stable and can support the machine", true),
          ch("Le réservoir de carburant est plein", "The fuel tank is full"),
          ch("La radio de la cabine fonctionne", "The cab radio is working"),
          ch("Le godet avant est retiré", "The front bucket is removed")
        ] },
      { fr: "Le godet arrière d'une chargeuse-pelleteuse est généralement monté sur un bras articulé qui permet...", en: "A backhoe loader's rear bucket is generally mounted on an articulated arm that allows...",
        choices: [
          ch("De creuser à différentes profondeurs et angles sans déplacer la machine", "Digging at different depths and angles without moving the machine", true),
          ch("De transporter des passagers", "Carrying passengers"),
          ch("De compacter l'asphalte", "Compacting asphalt"),
          ch("De remorquer d'autres véhicules", "Towing other vehicles")
        ] },
      tf("Une chargeuse-pelleteuse peut souvent effectuer à la fois du chargement et de l'excavation sur un même petit chantier, réduisant le besoin d'une deuxième machine.", "A backhoe loader can often do both loading and excavation on the same small site, reducing the need for a second machine.", true),
      match("Associe chaque élément de la chargeuse-pelleteuse à sa fonction.", "Match each backhoe loader part to its function.", [
        pair("Stabilisateurs", "Outriggers", "Patins qui immobilisent la machine pendant le creusage", "Pads that anchor the machine while digging"),
        pair("Godet avant", "Front bucket", "Utilisé pour charger et déplacer des matériaux", "Used to load and move material"),
        pair("Godet arrière articulé", "Articulated rear bucket", "Permet l'excavation sous le niveau de la machine", "Allows excavation below the machine's level"),
        pair("Cabine orientable", "Swivel seat/cab", "Permet à l'opérateur de faire face à l'avant ou à l'arrière", "Lets the operator face front or rear")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Lors de l'excavation avec le godet arrière près d'une fondation existante, le principal risque à considérer est...", en: "When excavating with the rear bucket near an existing foundation, the main risk to consider is...",
        choices: [
          ch("Une déstabilisation ou un affaissement de la structure adjacente", "Destabilization or settling of the adjacent structure", true),
          ch("Une amélioration automatique de la stabilité du sol", "An automatic improvement in soil stability"),
          ch("Aucun risque si la machine est neuve", "No risk if the machine is new"),
          ch("Une augmentation du rendement énergétique de la machine", "An increase in the machine's energy efficiency")
        ] },
      scenario("En creusant avec le godet arrière, tu sens une résistance inhabituelle et un bruit métallique suspect, possiblement une conduite enterrée non identifiée. Que fais-tu?", "While digging with the rear bucket, you feel unusual resistance and hear a suspicious metallic sound, possibly an unidentified buried pipe. What do you do?",
        [
          ch("Continuer à creuser avec précaution jusqu'à voir de quoi il s'agit", "Keep digging carefully until you see what it is"),
          ch("Arrêter immédiatement le mouvement et faire vérifier la situation avant de poursuivre", "Stop the movement immediately and have the situation checked before continuing", true),
          ch("Pousser plus fort pour dégager l'obstacle rapidement", "Push harder to clear the obstacle quickly"),
          ch("Changer de godet et continuer au même endroit", "Change buckets and continue at the same spot")
        ]),
      tf("Le poids transféré aux stabilisateurs pendant le creusage peut varier selon la profondeur et l'angle du bras arrière.", "The weight transferred to the outriggers while digging can vary depending on the depth and angle of the rear arm.", true),
      match("Associe chaque situation au bon principe de sécurité.", "Match each situation to the correct safety principle.", [
        pair("Excavation en espace restreint", "Excavating in a tight space", "Peut nécessiter un godet plus étroit", "May require a narrower bucket"),
        pair("Sol instable", "Unstable soil", "Augmente le risque d'affaissement autour de l'excavation", "Increases the risk of settling around the excavation"),
        pair("Service souterrain non identifié", "Unidentified underground utility", "Nécessite l'arrêt du travail et une vérification", "Requires stopping work and checking"),
        pair("Zone de giration du bras arrière", "Rear arm swing zone", "Doit rester dégagée de travailleurs à pied", "Must stay clear of workers on foot")
      ])
    ] }
    ]
  },
  {
    id: "c15", code: "341-546/841-546", hours: 90, order: 15,
    title_fr: "Effectuer des travaux de construction d'infrastructures avec une pelle",
    title_en: "Perform infrastructure construction work using an excavator",
    icon: "🌉",
    tiers: [
    { level: 1, questions: [
      { fr: "Dans un projet d'infrastructure (ponceau, égout), la précision de la pelle est surtout requise pour...", en: "In an infrastructure project (culvert, sewer), an excavator's precision is mainly needed for...",
        choices: [
          ch("Aller plus vite qu'un bouteur sur le même site", "Being faster than a bulldozer on the same site"),
          ch("Éviter d'avoir à utiliser un système laser", "Avoiding the use of a laser system"),
          ch("Respecter les pentes et niveaux prévus aux plans", "Meeting the slopes and grades shown on the plans", true),
          ch("Réduire la consommation de carburant du moteur", "Reducing the engine's fuel consumption")
        ] },
      { fr: "Un système de guidage laser ou GPS sur une pelle sert à...", en: "A laser or GPS guidance system on an excavator is used to...",
        choices: [
          ch("Réduire le poids total de la machine", "Reduce the machine's total weight"),
          ch("Remplacer complètement l'opérateur", "Completely replace the operator"),
          ch("Augmenter la vitesse de translation", "Increase travel speed"),
          ch("Atteindre les niveaux et pentes avec précision", "Achieve grades and slopes with precision", true)
        ] },
      tf("Sur un chantier d'infrastructures souterraines (égout, aqueduc), le nivellement précis du lit de pose influence directement le bon écoulement futur des conduites.", "On an underground infrastructure site (sewer, water main), precise grading of the pipe bedding directly affects future flow in the pipes.", true)
    ] },
    { level: 2, questions: [
      { fr: "Le « lit de pose » sous une conduite d'égout ou d'aqueduc sert à...", en: "The bedding under a sewer or water main pipe serves to...",
        choices: [
          ch("Offrir un support uniforme et stable à la conduite", "Provide uniform, stable support to the pipe", true),
          ch("Décorer la tranchée", "Decorate the trench"),
          ch("Remplacer le besoin de compactage", "Replace the need for compaction"),
          ch("Empêcher toute inspection future", "Prevent any future inspection")
        ] },
      { fr: "Un contrôle qualité typique après la pose d'une conduite d'infrastructure inclut souvent...", en: "A typical quality check after installing an infrastructure pipe often includes...",
        choices: [
          ch("La vérification de la pente et de l'alignement de la conduite", "Checking the pipe's slope and alignment", true),
          ch("Uniquement une inspection visuelle de la couleur du sol", "Only a visual check of the soil color"),
          ch("Aucune vérification n'est nécessaire", "No check is needed"),
          ch("Un test de résistance du godet de la pelle", "A strength test of the excavator's bucket")
        ] },
      tf("Un système de guidage GPS/laser peut aider un opérateur de pelle à respecter des tolérances de pente très précises.", "A GPS/laser guidance system can help an excavator operator meet very precise slope tolerances.", true),
      match("Associe chaque terme d'infrastructure souterraine à sa définition.", "Match each underground infrastructure term to its definition.", [
        pair("Lit de pose", "Pipe bedding", "Couche de matériau stable sous la conduite", "Stable material layer under the pipe"),
        pair("Remblai de protection", "Protective backfill", "Matériau placé autour et au-dessus de la conduite", "Material placed around and above the pipe"),
        pair("Pente de la conduite", "Pipe slope", "Inclinaison nécessaire pour un bon écoulement", "Slope needed for proper flow"),
        pair("Système de guidage GPS/laser", "GPS/laser guidance system", "Aide à atteindre la précision requise", "Helps achieve the required precision")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Si une conduite d'égout est posée avec une pente insuffisante, la conséquence la plus probable est...", en: "If a sewer pipe is installed with insufficient slope, the most likely consequence is...",
        choices: [
          ch("Une accumulation de sédiments et un mauvais écoulement à long terme", "Sediment build-up and poor flow over the long term", true),
          ch("Une amélioration du débit d'eau", "Improved water flow"),
          ch("Aucun impact fonctionnel", "No functional impact"),
          ch("Une réduction des coûts d'entretien futurs", "Lower future maintenance costs")
        ] },
      scenario("En creusant pour une infrastructure souterraine, tu constates que le sol autour de la tranchée semble plus humide et instable que prévu, à proximité de fondations d'un bâtiment voisin. Que fais-tu?", "While digging for underground infrastructure, you notice the soil around the trench seems wetter and more unstable than expected, near a neighboring building's foundation. What do you do?",
        [
          ch("Continuer selon le plan initial sans ajustement", "Continue as originally planned with no adjustment"),
          ch("Aviser le superviseur/ingénieur du chantier pour réévaluer l'approche avant de poursuivre", "Notify the site supervisor/engineer to reassess the approach before continuing", true),
          ch("Accélérer le travail pour terminer avant un effondrement possible", "Speed up the work to finish before a possible collapse"),
          ch("Combler immédiatement sans terminer les travaux prévus", "Backfill immediately without finishing the planned work")
        ]),
      tf("La précision du nivellement lors de travaux d'infrastructures souterraines a un impact direct sur la performance du système une fois en service.", "Grading precision during underground infrastructure work directly impacts the system's performance once in service.", true),
      match("Associe chaque structure d'infrastructure à sa description.", "Match each infrastructure structure to its description.", [
        pair("Ponceau", "Culvert", "Structure qui permet à l'eau de traverser sous une route", "Structure that lets water pass under a road"),
        pair("Aqueduc", "Water main", "Réseau qui achemine l'eau potable", "Network that carries drinking water"),
        pair("Égout", "Sewer", "Réseau qui évacue les eaux usées ou pluviales", "Network that carries away waste or storm water"),
        pair("Regard (manhole)", "Manhole", "Point d'accès au réseau souterrain pour l'entretien", "Access point to the underground network for maintenance")
      ])
    ] }
    ]
  },
  {
    id: "c16", code: "341-556/841-556", hours: 90, order: 16,
    title_fr: "Effectuer des travaux de construction d'infrastructures avec un bouteur",
    title_en: "Perform infrastructure construction work using a bulldozer",
    icon: "🌉",
    tiers: [
    { level: 1, questions: [
      { fr: "Dans les travaux d'infrastructure, le bouteur est souvent utilisé pour...", en: "In infrastructure work, the bulldozer is often used to...",
        choices: [
          ch("Effectuer l'arpentage du terrain", "Perform site surveying"),
          ch("Souder les tuyaux d'infrastructure", "Weld infrastructure pipes"),
          ch("Étaler et compacter des remblais par couches", "Spread and compact fill in layers", true),
          ch("Peindre les structures terminées", "Paint completed structures")
        ] },
      { fr: "Pourquoi compacter le remblai par couches (« lifts ») plutôt qu'en une seule fois?", en: "Why compact fill in layers (lifts) rather than all at once?",
        choices: [
          ch("Pour aller plus vite qu'en une seule couche", "To go faster than a single layer"),
          ch("Pour économiser du matériel de remblai", "To save on fill material"),
          ch("Assurer une densité uniforme et éviter un affaissement futur", "Ensure uniform density and prevent future settling", true),
          ch("Cette méthode n'est en réalité jamais utilisée", "This method is actually never used")
        ] },
      tf("Le type de matériau de remblai (sable, gravier, argile) n'a aucune influence sur l'épaisseur de couche recommandée pour un compactage efficace.", "The type of fill material (sand, gravel, clay) has no effect on the recommended lift thickness for effective compaction.", false)
    ] },
    { level: 2, questions: [
      { fr: "L'épaisseur recommandée d'une couche de remblai avant compactage dépend surtout de...", en: "The recommended lift thickness before compaction mainly depends on...",
        choices: [
          ch("Du type de matériau et de l'équipement de compactage utilisé", "The material type and the compaction equipment used", true),
          ch("De la couleur du sol", "The soil color"),
          ch("De la météo du jour uniquement", "Only the day's weather"),
          ch("Du nombre d'opérateurs disponibles", "The number of available operators")
        ] },
      { fr: "Un bouteur qui étale un remblai doit veiller particulièrement à...", en: "A bulldozer spreading fill must pay particular attention to...",
        choices: [
          ch("Répartir le matériau de façon uniforme en épaisseur constante", "Distributing material evenly at a constant thickness", true),
          ch("Empiler le matériau le plus haut possible en un seul point", "Piling material as high as possible in one spot"),
          ch("Éviter tout contact avec le sol existant", "Avoiding any contact with the existing ground"),
          ch("Mélanger volontairement différents types de matériaux", "Deliberately mixing different material types")
        ] },
      tf("La qualité du compactage d'un remblai n'a aucun lien avec un affaissement éventuel de la surface.", "Fill compaction quality has no connection to potential surface settling.", false),
      match("Associe chaque terme de remblai à sa définition.", "Match each fill term to its definition.", [
        pair("Remblai", "Fill", "Matériau ajouté pour rehausser ou stabiliser un terrain", "Material added to raise or stabilize ground"),
        pair("Couche (lift)", "Lift", "Épaisseur de matériau étalée avant compactage", "Thickness of material spread before compaction"),
        pair("Densité de compactage", "Compaction density", "Mesure de la compacité atteinte du matériau", "Measure of the material's achieved compactness"),
        pair("Essai Proctor", "Proctor test", "Test de laboratoire qui détermine la densité optimale visée", "Lab test that determines the target optimal density")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Un remblai insuffisamment compacté sous une future route peut causer, après quelques années...", en: "Insufficiently compacted fill under a future road can cause, after a few years...",
        choices: [
          ch("Un affaissement ou une fissuration de la chaussée", "Pavement settling or cracking", true),
          ch("Une amélioration de la durabilité de la route", "Improved road durability"),
          ch("Aucun effet à long terme", "No long-term effect"),
          ch("Une réduction du besoin d'entretien", "Reduced maintenance needs")
        ] },
      scenario("Le laboratoire indique que la densité de compactage d'une couche de remblai est inférieure à l'objectif requis. Que devrait-on faire avant de poursuivre avec la couche suivante?", "The lab reports that a fill layer's compaction density is below the required target. What should be done before proceeding to the next layer?",
        [
          ch("Continuer quand même pour respecter l'échéancier", "Continue anyway to meet the schedule"),
          ch("Recompacter la couche non conforme avant de poursuivre", "Recompact the non-conforming layer before continuing", true),
          ch("Ignorer le résultat si le chantier semble stable visuellement", "Ignore the result if the site looks visually stable"),
          ch("Réduire l'épaisseur des couches suivantes pour compenser", "Reduce the thickness of the following layers to compensate")
        ]),
      tf("Le taux d'humidité d'un matériau de remblai influence sa capacité à atteindre une bonne densité de compactage.", "A fill material's moisture content affects its ability to reach good compaction density.", true),
      match("Associe chaque terme à sa définition.", "Match each term to its definition.", [
        pair("Sous-remblai", "Sub-fill", "Couches inférieures d'un remblai routier", "Lower layers of a road fill"),
        pair("Infrastructure routière", "Road infrastructure", "Ensemble des couches sous la chaussée finale", "All the layers under the final pavement"),
        pair("Tassement différentiel", "Differential settlement", "Affaissement inégal pouvant fissurer une surface", "Uneven settling that can crack a surface"),
        pair("Contrôle qualité en chantier", "On-site quality control", "Vérifications réalisées pendant la construction", "Checks performed during construction")
      ])
    ] }
    ]
  },
  {
    id: "c17", code: "341-565/841-565", hours: 75, order: 17,
    title_fr: "Effectuer des travaux de construction d'infrastructures avec une niveleuse",
    title_en: "Perform infrastructure construction work using a grader",
    icon: "🌉",
    tiers: [
    { level: 1, questions: [
      { fr: "Dans un projet routier, la niveleuse intervient surtout pour...", en: "In a road project, the grader is mainly used for...",
        choices: [
          ch("Creuser les fondations profondes", "Digging deep foundations"),
          ch("Couler le béton de la structure", "Pouring the structure's concrete"),
          ch("Façonner la fondation et le profil final de la route", "Shaping the base and final road profile", true),
          ch("Souder l'armature métallique", "Welding the metal rebar")
        ] },
      { fr: "Un « crown » (bombement) correct sur une route sert à...", en: "A proper road crown serves to...",
        choices: [
          ch("Augmenter la vitesse permise des véhicules", "Increase the vehicles' allowed speed"),
          ch("Faciliter le drainage de l'eau vers les côtés", "Help drain water to the sides", true),
          ch("Réduire le nombre de couches d'asphalte requises", "Reduce the number of asphalt layers required"),
          ch("Éviter d'avoir à compacter la surface", "Avoid having to compact the surface")
        ] },
      tf("Le contrôle automatisé (laser ou GPS) élimine complètement le besoin pour l'opérateur de surveiller le travail de la niveleuse.", "Automated control (laser or GPS) completely eliminates the operator's need to monitor the grader's work.", false)
    ] },
    { level: 2, questions: [
      { fr: "Un profil transversal (« cross-section ») de route bien fait doit tenir compte de...", en: "A well-made road cross-section must take into account...",
        choices: [
          ch("Du bombement (crown) et de la pente pour le drainage", "The crown and slope needed for drainage", true),
          ch("De la couleur de l'asphalte uniquement", "Only the color of the asphalt"),
          ch("Du nombre de voitures qui l'emprunteront chaque jour", "The number of cars using it each day"),
          ch("De la vitesse maximale permise seulement", "Only the allowed maximum speed")
        ] },
      tf("La sous-fondation d'une route doit être bien nivelée avant la pose des couches supérieures.", "A road's sub-base must be properly graded before the upper layers are laid.", true),
      match("Associe chaque terme routier à sa définition.", "Match each road-building term to its definition.", [
        pair("Crown (bombement)", "Crown", "Légère pente centrale qui draine l'eau vers les côtés", "A slight center slope that drains water to the sides"),
        pair("Fossé", "Ditch", "Canal qui évacue l'eau de drainage en bordure", "Channel that carries drainage water at the roadside"),
        pair("Sous-fondation", "Sub-base", "Couche de base sous le revêtement", "Base layer under the pavement"),
        pair("Profil final", "Final profile", "Forme définitive de la surface de la route", "The road surface's final shape")
      ]),
      { fr: "Un profil transversal insuffisant peut principalement causer...", en: "An insufficient cross-section can mainly cause...",
        choices: [
          ch("Une accumulation d'eau sur la chaussée", "Water pooling on the pavement", true),
          ch("Une réduction du besoin de compactage", "A reduced need for compaction"),
          ch("Une amélioration de la traction", "Improved traction"),
          ch("Aucun effet notable", "No noticeable effect")
        ] }
    ] },
    { level: 3, questions: [
      { fr: "Un mauvais drainage d'une route (crown insuffisant) peut mener, à moyen terme, à...", en: "Poor road drainage (insufficient crown) can lead, in the medium term, to...",
        choices: [
          ch("Une accumulation d'eau et une dégradation accélérée de la chaussée", "Water buildup and accelerated pavement deterioration", true),
          ch("Une amélioration de la durée de vie de l'asphalte", "Improved asphalt service life"),
          ch("Aucune conséquence notable", "No noticeable consequence"),
          ch("Une réduction des besoins d'entretien futurs", "Reduced future maintenance needs")
        ] },
      scenario("Après un premier passage de niveleuse, tu constates que le profil obtenu ne respecte pas les niveaux indiqués sur le plan à un endroit précis. Que fais-tu?", "After a first grader pass, you notice the resulting profile doesn't match the plan's levels at a specific spot. What do you do?",
        [
          ch("Continuer les passages suivants sans corriger cette section", "Continue with the next passes without fixing that section"),
          ch("Corriger cette section avant de poursuivre le reste du profil", "Fix that section before continuing the rest of the profile", true),
          ch("Signaler le problème mais continuer ailleurs sans jamais y revenir", "Report the issue but continue elsewhere and never return to it"),
          ch("Recouvrir directement d'asphalte pour masquer l'erreur", "Cover it directly with asphalt to hide the error")
        ]),
      tf("Un système de guidage automatisé peut réduire, mais ne remplace pas complètement, le jugement de l'opérateur sur le chantier.", "An automated guidance system can reduce, but does not fully replace, the operator's judgment on site.", true),
      match("Associe chaque terme à sa définition.", "Match each term to its definition.", [
        pair("Scarificateur", "Scarifier", "Ameublit une surface compactée avant le nivellement", "Loosens a compacted surface before grading"),
        pair("Contrôle automatisé (laser/GPS)", "Automated control (laser/GPS)", "Aide à atteindre une précision élevée du profil", "Helps achieve high profile precision"),
        pair("Pente longitudinale", "Longitudinal grade", "Inclinaison de la route dans le sens de la circulation", "Slope of the road in the direction of travel"),
        pair("Pente transversale", "Cross slope", "Inclinaison latérale de la route (liée au crown)", "Sideways slope of the road (related to the crown)")
      ])
    ] }
    ]
  },
  {
    id: "c18", code: "341-574/841-574", hours: 60, order: 18,
    title_fr: "Effectuer des travaux avec un rouleau compacteur",
    title_en: "Perform work using a compactor roller",
    icon: "🛞",
    tiers: [
    { level: 1, questions: [
      { fr: "Le vibrateur d'un rouleau compacteur sert à...", en: "A compactor roller's vibration mechanism is used to...",
        choices: [
          ch("Refroidir le moteur pendant l'opération", "Cool the engine during operation"),
          ch("Améliorer la réception de la radio embarquée", "Improve onboard radio reception"),
          ch("Réduire le poids apparent de la machine", "Reduce the machine's apparent weight"),
          ch("Augmenter l'efficacité du compactage", "Increase compaction effectiveness", true)
        ] },
      { fr: "Combien de passages sont généralement nécessaires pour un compactage adéquat?", en: "How many passes are generally needed for adequate compaction?",
        choices: [
          ch("Toujours exactement un seul passage", "Always exactly one pass"),
          ch("Cela varie selon le matériau et l'épaisseur — à valider avec les spécifications du projet", "It varies by material and lift thickness — confirm with project specs", true),
          ch("Toujours exactement dix passages", "Always exactly ten passes"),
          ch("Aucun passage n'est requis si le sol est sec", "No passes are required if the soil is dry")
        ] },
      tf("Un rouleau à tambour lisse offre toujours un meilleur pétrissage de la surface qu'un rouleau à pneus.", "A smooth drum roller always provides better surface kneading than a pneumatic roller.", false)
    ] },
    { level: 2, questions: [
      { fr: "Un rouleau à tambour lisse (« smooth drum ») est surtout utilisé pour...", en: "A smooth drum roller is mainly used for...",
        choices: [
          ch("Le compactage de surfaces granulaires ou d'enrobé", "Compacting granular surfaces or asphalt", true),
          ch("Le compactage exclusif de sols argileux très cohésifs", "Compacting only highly cohesive clay soils"),
          ch("Le transport de matériaux", "Transporting materials"),
          ch("Le nivellement fin d'une route", "Fine grading of a road")
        ] },
      { fr: "Un rouleau « pied de mouton » (« sheepsfoot ») est particulièrement adapté pour...", en: "A sheepsfoot roller is particularly suited for...",
        choices: [
          ch("Compacter des sols cohésifs comme l'argile", "Compacting cohesive soils like clay", true),
          ch("Compacter uniquement l'asphalte chaud", "Compacting only hot asphalt"),
          ch("Remplacer une niveleuse", "Replacing a grader"),
          ch("Creuser des tranchées", "Digging trenches")
        ] },
      tf("La vitesse de déplacement du rouleau pendant le compactage peut influencer l'efficacité du compactage.", "The roller's travel speed during compaction can affect compaction effectiveness.", true),
      match("Associe chaque type de rouleau à son usage.", "Match each roller type to its use.", [
        pair("Rouleau à tambour lisse", "Smooth drum roller", "Compacte surfaces granulaires et enrobé", "Compacts granular surfaces and asphalt"),
        pair("Rouleau pied de mouton", "Sheepsfoot roller", "Compacte les sols cohésifs (argile)", "Compacts cohesive soils (clay)"),
        pair("Rouleau à pneus", "Pneumatic roller", "Offre un bon pétrissage de la surface", "Provides good surface kneading"),
        pair("Vibration", "Vibration", "Mécanisme qui augmente l'efficacité du compactage", "Mechanism that increases compaction effectiveness")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Un sur-compactage (trop de passages) d'un matériau granulaire peut parfois causer...", en: "Over-compacting (too many passes) a granular material can sometimes cause...",
        choices: [
          ch("Une fragmentation excessive des grains ou une perte de densité", "Excessive grain fragmentation or a loss of density", true),
          ch("Une amélioration continue et illimitée de la densité", "Continuous, unlimited density improvement"),
          ch("Aucun effet, peu importe le nombre de passages", "No effect, regardless of the number of passes"),
          ch("Une réduction du temps de travail nécessaire", "A reduction in the work time needed")
        ] },
      scenario("Le résultat d'un essai de densité en chantier indique que la couche compactée est encore sous l'objectif requis après plusieurs passages. Que devrais-tu envisager avant de continuer indéfiniment?", "An on-site density test shows the compacted layer is still below the required target after several passes. What should you consider before continuing indefinitely?",
        [
          ch("Ajouter des passages supplémentaires indéfiniment sans autre analyse", "Add more passes indefinitely without further analysis"),
          ch("Vérifier le taux d'humidité du matériau et ajuster la méthode en conséquence", "Check the material's moisture content and adjust the method accordingly", true),
          ch("Arrêter le compactage et laisser tel quel", "Stop compacting and leave it as is"),
          ch("Changer uniquement la couleur du rouleau", "Only change the color of the roller")
        ]),
      tf("Le taux d'humidité optimal d'un matériau influence directement l'efficacité du compactage obtenu.", "A material's optimal moisture content directly affects the compaction efficiency achieved.", true),
      match("Associe chaque terme à sa définition.", "Match each term to its definition.", [
        pair("Essai de densité en chantier", "On-site density test", "Vérifie si la compaction atteint l'objectif visé", "Checks whether compaction meets the target"),
        pair("Teneur en eau optimale", "Optimal moisture content", "Humidité qui permet la meilleure compaction possible", "Moisture level that allows the best possible compaction"),
        pair("Sur-compactage", "Over-compaction", "Passages excessifs pouvant nuire à la qualité", "Excessive passes that can harm quality"),
        pair("Sous-compactage", "Under-compaction", "Compaction insuffisante par rapport à l'objectif", "Compaction that falls short of the target")
      ])
    ] }
    ]
  },
  {
    id: "c19", code: "341-584/841-584", hours: 60, order: 19,
    title_fr: "Effectuer des travaux de finition avec une niveleuse",
    title_en: "Perform finishing work using a grader",
    icon: "✨",
    tiers: [
    { level: 1, questions: [
      { fr: "Les travaux de finition visent surtout à...", en: "Finishing work mainly aims to...",
        choices: [
          ch("Creuser plus profondément que prévu", "Dig deeper than planned"),
          ch("Réduire le temps consacré au compactage", "Reduce time spent compacting"),
          ch("Obtenir la précision finale des pentes, niveaux et surfaces", "Achieve final precision of grades, levels and surfaces", true),
          ch("Éliminer le besoin de consulter les plans", "Eliminate the need to consult plans")
        ] },
      { fr: "Pourquoi la vitesse de travail est-elle réduite lors de la finition?", en: "Why is working speed reduced during finishing?",
        choices: [
          ch("Pour économiser le carburant uniquement", "Only to save fuel"),
          ch("Parce que la machine est mécaniquement plus lente en finition", "Because the machine is mechanically slower for finishing"),
          ch("Pour maximiser la précision du résultat final", "To maximize the precision of the final result", true),
          ch("Ce n'est en réalité pas le cas sur le terrain", "This isn't actually the case in the field")
        ] },
      tf("Lors de la finition, de petits ajustements fréquents à la lame permettent souvent d'obtenir un résultat plus précis que de grands ajustements peu fréquents.", "During finishing, small frequent blade adjustments often produce a more precise result than large infrequent adjustments.", true)
    ] },
    { level: 2, questions: [
      { fr: "Lors de la finition, un opérateur ajuste fréquemment...", en: "During finishing, an operator frequently adjusts...",
        choices: [
          ch("L'angle et la hauteur de la lame pour affiner le résultat", "The blade angle and height to refine the result", true),
          ch("Uniquement la radio de la cabine", "Only the cab radio"),
          ch("La pression des pneus en continu", "Tire pressure continuously"),
          ch("La couleur de la machine", "The color of the machine")
        ] },
      { fr: "Une tolérance de nivellement plus stricte lors de la finition signifie généralement...", en: "A stricter grading tolerance during finishing generally means...",
        choices: [
          ch("Que les écarts permis par rapport au plan sont plus petits", "That allowed deviations from the plan are smaller", true),
          ch("Que le travail peut être fait plus rapidement sans précision", "That the work can be done faster without precision"),
          ch("Qu'aucun contrôle qualité n'est requis", "That no quality control is required"),
          ch("Que la machine doit rouler plus vite", "That the machine must move faster")
        ] },
      tf("Les travaux de finition sont généralement réalisés avant les travaux de terrassement grossier, pour préparer le terrain.", "Finishing work is generally done before rough grading work, to prepare the ground.", false),
      match("Associe chaque terme de finition à sa définition.", "Match each finishing term to its definition.", [
        pair("Tolérance de nivellement", "Grading tolerance", "Écart maximal permis par rapport au plan", "Maximum allowed deviation from the plan"),
        pair("Passage de finition", "Finishing pass", "Dernier passage visant la précision finale", "Final pass aimed at final precision"),
        pair("Contrôle qualité", "Quality control", "Vérification du résultat final par rapport aux exigences", "Checking the final result against requirements"),
        pair("Profil final", "Final profile", "Forme précise attendue de la surface", "The precise expected shape of the surface")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Si une section finie ne respecte pas la tolérance de nivellement exigée par les plans, la meilleure pratique est de...", en: "If a finished section doesn't meet the plan's required grading tolerance, the best practice is to...",
        choices: [
          ch("Reprendre la section pour la ramener dans la tolérance avant d'accepter le travail", "Redo the section to bring it within tolerance before accepting the work", true),
          ch("Ignorer l'écart s'il semble mineur à l'œil", "Ignore the deviation if it looks minor by eye"),
          ch("Continuer les sections suivantes sans jamais revenir corriger", "Continue with the next sections and never go back to fix it"),
          ch("Modifier les plans pour qu'ils correspondent au résultat obtenu", "Change the plans to match the result obtained")
        ] },
      scenario("Un inspecteur du chantier mesure un écart de nivellement légèrement supérieur à la tolérance permise sur une section que tu viens de terminer. Que fais-tu?", "A site inspector measures a grading deviation slightly above the allowed tolerance on a section you just finished. What do you do?",
        [
          ch("Contester la mesure sans vérifier toi-même", "Dispute the measurement without checking yourself"),
          ch("Vérifier la mesure et corriger la section si l'écart est confirmé", "Check the measurement and fix the section if the deviation is confirmed", true),
          ch("Ignorer complètement le rapport de l'inspecteur", "Completely ignore the inspector's report"),
          ch("Refaire toutes les sections précédentes par précaution excessive", "Redo all previous sections out of excessive caution")
        ]),
      tf("Un bon système de guidage (GPS/laser) peut réduire le nombre de passages nécessaires pour atteindre la précision de finition requise.", "A good guidance system (GPS/laser) can reduce the number of passes needed to achieve the required finishing precision.", true),
      match("Associe chaque terme à sa définition.", "Match each term to its definition.", [
        pair("Écart de nivellement", "Grading deviation", "Différence mesurée entre le résultat et le plan", "Measured difference between the result and the plan"),
        pair("Rapport d'inspection", "Inspection report", "Document qui consigne les mesures de contrôle qualité", "Document recording quality control measurements"),
        pair("Reprise (rework)", "Rework", "Correction d'une section non conforme", "Correction of a non-conforming section"),
        pair("Réception des travaux", "Work acceptance", "Acceptation officielle du résultat final", "Official acceptance of the final result")
      ])
    ] }
    ]
  },
  {
    id: "c20", code: "341-631/841-631", hours: 15, order: 20,
    title_fr: "Utiliser des moyens de recherche d'emploi",
    title_en: "Use job search techniques",
    icon: "🎯",
    tiers: [
    { level: 1, questions: [
      { fr: "Un CV pour un poste d'opérateur d'équipement lourd devrait surtout mettre en valeur...", en: "A resume for a heavy equipment operator position should mainly highlight...",
        choices: [
          ch("Les loisirs personnels uniquement", "Personal hobbies only"),
          ch("Les équipements maîtrisés, la carte de compétence et les certifications de sécurité", "Equipment mastered, competency card, and safety certifications", true),
          ch("La liste des écoles primaires fréquentées", "A list of elementary schools attended"),
          ch("Aucune information spécifique au métier", "No information specific to the trade")
        ] },
      { fr: "Quel est un bon réflexe après un entretien d'embauche?", en: "What is a good habit after a job interview?",
        choices: [
          ch("Ne plus jamais recontacter l'employeur", "Never contact the employer again"),
          ch("Attendre six mois avant de faire un suivi", "Wait six months before following up"),
          ch("Envoyer un message de remerciement et faire un suivi", "Send a thank-you note and follow up", true),
          ch("Ne rien faire de particulier après l'entretien", "Do nothing in particular after the interview")
        ] },
      tf("Un CV standard, sans mention des équipements maîtrisés ni des certifications, est généralement suffisant pour un poste d'opérateur d'équipement lourd.", "A standard resume, without mentioning equipment mastered or certifications, is generally sufficient for a heavy equipment operator position.", false)
    ] },
    { level: 2, questions: [
      { fr: "Lors d'une entrevue pour un poste d'opérateur, il est pertinent de mentionner...", en: "During an interview for an operator position, it's relevant to mention...",
        choices: [
          ch("Les machines spécifiques que l'on sait opérer et son expérience pratique", "The specific machines you can operate and your hands-on experience", true),
          ch("Uniquement ses résultats scolaires au secondaire", "Only your high school grades"),
          ch("Ses préférences alimentaires", "Your food preferences"),
          ch("Rien de spécifique, l'entrevue se déroule d'elle-même", "Nothing specific, the interview will go on its own")
        ] },
      { fr: "Le réseau de contacts professionnels (« réseautage ») peut aider à trouver un emploi notamment par...", en: "A professional network can help you find a job especially through...",
        choices: [
          ch("Des recommandations et des informations sur des postes non annoncés publiquement", "Referrals and information on jobs not publicly advertised", true),
          ch("L'obtention automatique d'un permis de conduire", "Automatically obtaining a driver's licence"),
          ch("Une exemption des cartes de compétence", "An exemption from competency cards"),
          ch("Une réduction du nombre de compétences à réussir", "A reduced number of competencies to pass")
        ] },
      tf("Un permis de conduire de classe appropriée peut être un atout, voire une exigence, pour certains postes d'opérateur.", "An appropriate driver's licence class can be an asset, or even a requirement, for certain operator positions.", true),
      match("Associe chaque terme de recherche d'emploi à sa définition.", "Match each job search term to its definition.", [
        pair("CV", "Resume", "Résumé de l'expérience et des compétences d'un candidat", "Summary of a candidate's experience and skills"),
        pair("Lettre de présentation", "Cover letter", "Texte qui explique la motivation et l'intérêt pour le poste", "Text explaining motivation and interest in the position"),
        pair("Réseautage", "Networking", "Développement de contacts professionnels utiles", "Building useful professional contacts"),
        pair("Entrevue d'embauche", "Job interview", "Rencontre où l'employeur évalue le candidat", "Meeting where the employer evaluates the candidate")
      ])
    ] },
    { level: 3, questions: [
      { fr: "Un employeur potentiel demande une référence professionnelle. La meilleure pratique est de...", en: "A potential employer asks for a professional reference. The best practice is to...",
        choices: [
          ch("Demander la permission à la personne avant de fournir son nom comme référence", "Ask the person's permission before giving their name as a reference", true),
          ch("Donner le nom de n'importe qui sans le prévenir", "Give anyone's name without telling them"),
          ch("Refuser de fournir toute référence", "Refuse to provide any reference"),
          ch("Inventer une référence fictive", "Make up a fictitious reference")
        ] },
      scenario("On te demande en entrevue de décrire une situation où tu as dû respecter une consigne de sécurité malgré la pression du temps. Quelle réponse illustre le mieux un bon jugement professionnel?", "In an interview, you're asked to describe a time you had to follow a safety rule despite time pressure. Which answer best shows good professional judgment?",
        [
          ch("Expliquer que tu as ignoré la consigne pour respecter l'échéancier", "Explain that you ignored the rule to meet the deadline"),
          ch("Décrire comment tu as respecté la consigne tout en communiquant l'impact sur l'échéancier à ton superviseur", "Describe how you followed the rule while communicating the schedule impact to your supervisor", true),
          ch("Dire que cette situation ne s'est jamais produite", "Say this situation never happened"),
          ch("Éviter de répondre à la question", "Avoid answering the question")
        ]),
      tf("Envoyer exactement le même CV générique à toutes les offres d'emploi est généralement plus efficace que de l'adapter.", "Sending the exact same generic resume to every job posting is generally more effective than tailoring it.", false),
      match("Associe chaque terme à sa définition.", "Match each term to its definition.", [
        pair("Référence professionnelle", "Professional reference", "Personne qui peut témoigner du travail du candidat, avec sa permission", "Someone who can vouch for the candidate's work, with their permission"),
        pair("Suivi post-entrevue", "Post-interview follow-up", "Message de remerciement envoyé après une entrevue", "Thank-you message sent after an interview"),
        pair("Adaptation du CV", "Resume tailoring", "Ajustement du CV selon l'offre d'emploi visée", "Adjusting the resume to the targeted job posting"),
        pair("Portfolio de compétences", "Skills portfolio", "Preuve concrète des habiletés maîtrisées", "Concrete proof of mastered skills")
      ])
    ] }
    ]
  }
];

/* ---- Textes de l'interface (bilingue) ---- */
const UI_TEXT = {
  fr: {
    appName: "ChantierQuest",
    tagline: "Deviens Maître Opérateur — DEP 5220",
    start: "Commencer l'aventure",
    yourName: "Ton prénom",
    chooseAvatar: "Choisis ton avatar",
    map: "Carte du chantier",
    badges: "Badges",
    trophies: "Trophées",
    leaderboard: "Palmarès",
    profile: "Profil",
    level: "Niveau",
    xp: "XP",
    locked: "Verrouillé",
    completeToUnlock: "Termine la quête précédente pour déverrouiller",
    startQuest: "Démarrer la quête",
    retryQuest: "Reprendre la quête",
    question: "Question",
    of: "sur",
    submit: "Valider",
    next: "Suivant",
    finish: "Terminer",
    correct: "Bonne réponse!",
    incorrect: "Ce n'est pas ça...",
    questResult: "Résultat de la quête",
    score: "Score",
    passed: "Quête réussie! 🎉",
    failed: "Pas encore réussi — réessaie pour débloquer le badge (seuil: 70%)",
    backToMap: "Retour à la carte",
    newBadge: "Nouveau badge!",
    newTrophy: "Nouveau trophée!",
    hours: "heures",
    switchLang: "EN",
    privacy: "Confidentialité",
    resetProgress: "Réinitialiser tout",
    confirmReset: "Tout réinitialiser? Ton nom, ton avatar, ta machine, tes badges, trophées et toute ta progression seront effacés. Cette action est irréversible.",
    installApp: "Installer l'application",
    rank: "Rang",
    you: "Toi",
    leaderboardNote: "Classement local (démo) — un vrai palmarès de classe nécessite un serveur partagé.",
    completedQuests: "quêtes complétées",
    chooseVehicle: "Choisis ta machine",
    myVehicle: "Ta machine",
    vehicleGrows: "Grossit avec ton expérience",
    maxSize: "Taille maximale atteinte!",
    trueLabel: "Vrai",
    falseLabel: "Faux",
    tfPrompt: "Vrai ou faux?",
    masteredLabel: "compétences maîtrisées",
    tierLabel: "Palier",
    matchPrompt: "Touche un terme, puis sa définition qui correspond.",
    scenarioLabel: "Mise en situation",
    masteryUnlocked: "Compétence maîtrisée — badge débloqué!",
    accessCodeTitle: "Code d'accès",
    accessCodePrompt: "Entre le code d'accès fourni par ton enseignant pour continuer.",
    accessCodeTrialOver: "Ton essai gratuit de 7 jours est terminé. Entre le code d'accès fourni par ton centre de formation pour continuer.",
    accessCodePlaceholder: "Code d'accès",
    accessCodeSubmit: "Valider",
    accessCodeChecking: "Vérification...",
    accessCodeInvalid: "Code invalide ou inactif. Vérifie auprès de ton enseignant.",
    accessCodeOffline: "Connexion Internet requise pour valider ton code la première fois. Réessaie une fois connecté.",
    accessCodeNotConfigured: "L'application n'est pas encore configurée. Contacte ton enseignant.",
    welcomeHeading: "Comment ça marche",
    welcomeIntro: "Avant de commencer, voici un survol rapide de l'application.",
    welcomeSteps: [
      { icon: "🗺️", title: "Carte du chantier", text: "Chaque compétence du programme est une quête sur la carte. Termine-les dans l'ordre pour avancer." },
      { icon: "📝", title: "Questions", text: "Réponds à des questions à choix multiples et vrai/faux liées à chaque compétence." },
      { icon: "🎖️", title: "Badges", text: "Réussis une quête à 70% ou plus pour débloquer son badge." },
      { icon: "🏆", title: "Trophées", text: "Décroche des trophées spéciaux pour tes exploits et ta progression." },
      { icon: "📊", title: "Palmarès", text: "Compare ton avancement avec celui du reste de la classe." },
      { icon: "👷", title: "Ton avatar", text: "Personnalise ton avatar et ta machine — ils évoluent avec ton expérience." }
    ]
  },
  en: {
    appName: "ChantierQuest",
    tagline: "Become a Master Operator — DVS 5720",
    start: "Start the adventure",
    yourName: "Your first name",
    chooseAvatar: "Choose your avatar",
    map: "Job Site Map",
    badges: "Badges",
    trophies: "Trophies",
    leaderboard: "Leaderboard",
    profile: "Profile",
    level: "Level",
    xp: "XP",
    locked: "Locked",
    completeToUnlock: "Complete the previous quest to unlock",
    startQuest: "Start quest",
    retryQuest: "Retry quest",
    question: "Question",
    of: "of",
    submit: "Submit",
    next: "Next",
    finish: "Finish",
    correct: "Correct!",
    incorrect: "Not quite...",
    questResult: "Quest Result",
    score: "Score",
    passed: "Quest passed! 🎉",
    failed: "Not passed yet — try again to unlock the badge (threshold: 70%)",
    backToMap: "Back to map",
    newBadge: "New badge!",
    newTrophy: "New trophy!",
    hours: "hours",
    switchLang: "FR",
    privacy: "Privacy",
    resetProgress: "Reset everything",
    confirmReset: "Reset everything? Your name, avatar, machine, badges, trophies and all progress will be erased. This cannot be undone.",
    installApp: "Install the app",
    rank: "Rank",
    you: "You",
    leaderboardNote: "Local (demo) ranking — a real class leaderboard needs a shared server.",
    completedQuests: "quests completed",
    chooseVehicle: "Choose your machine",
    myVehicle: "Your machine",
    vehicleGrows: "Grows with your experience",
    maxSize: "Maximum size reached!",
    trueLabel: "True",
    falseLabel: "False",
    tfPrompt: "True or false?",
    masteredLabel: "competencies mastered",
    tierLabel: "Tier",
    matchPrompt: "Tap a term, then its matching definition.",
    scenarioLabel: "Scenario",
    masteryUnlocked: "Competency mastered — badge unlocked!",
    accessCodeTitle: "Access code",
    accessCodePrompt: "Enter the access code given by your teacher to continue.",
    accessCodeTrialOver: "Your free 7-day trial has ended. Enter the access code provided by your training center to continue.",
    accessCodePlaceholder: "Access code",
    accessCodeSubmit: "Submit",
    accessCodeChecking: "Checking...",
    accessCodeInvalid: "Invalid or inactive code. Check with your teacher.",
    accessCodeOffline: "Internet connection required to validate your code the first time. Try again once connected.",
    accessCodeNotConfigured: "The app isn't configured yet. Contact your teacher.",
    welcomeHeading: "How it works",
    welcomeIntro: "Before you start, here's a quick overview of the app.",
    welcomeSteps: [
      { icon: "🗺️", title: "Job site map", text: "Each program competency is a quest on the map. Complete them in order to move forward." },
      { icon: "📝", title: "Questions", text: "Answer multiple-choice and true/false questions tied to each competency." },
      { icon: "🎖️", title: "Badges", text: "Pass a quest with 70% or more to unlock its badge." },
      { icon: "🏆", title: "Trophies", text: "Earn special trophies for your achievements and progress." },
      { icon: "📊", title: "Leaderboard", text: "Compare your progress with the rest of the class." },
      { icon: "👷", title: "Your avatar", text: "Customize your avatar and machine — they evolve as you gain experience." }
    ]
  }
};

/* ---- Paliers de niveau (basés sur XP total) ---- */
const LEVELS = [
  { min: 0,    name_fr: "Apprenti",            name_en: "Apprentice",        avatarStage: 0 },
  { min: 200,  name_fr: "Manœuvre",            name_en: "Laborer",           avatarStage: 1 },
  { min: 500,  name_fr: "Opérateur junior",     name_en: "Junior Operator",   avatarStage: 2 },
  { min: 1000, name_fr: "Opérateur qualifié",   name_en: "Qualified Operator",avatarStage: 3 },
  { min: 2000, name_fr: "Opérateur expert",     name_en: "Expert Operator",   avatarStage: 4 },
  { min: 3500, name_fr: "Maître Opérateur",     name_en: "Master Operator",   avatarStage: 5 }
];

/* ---- Personnages d'avatar (ouvriers de chantier / camionneurs) ----
   Chaque personnage est dessiné en SVG dans app.js (fonction AVATAR_SVG).
   "accent" = couleur par défaut du casque/gilet, modifiable via la
   sélection de couleur. */
const AVATAR_CHARACTERS = [
  { id: "operateur_pelle", name_fr: "Opérateur de pelle", name_en: "Excavator Operator", skin: "#e8b489" },
  { id: "operatrice_bouteur", name_fr: "Opératrice de bouteur", name_en: "Bulldozer Operator", skin: "#a9714f" },
  { id: "camionneur", name_fr: "Camionneur", name_en: "Truck Driver", skin: "#f2c9a1" },
  { id: "camionneuse", name_fr: "Camionneuse", name_en: "Truck Driver (F)", skin: "#8d5a3c" },
  { id: "mecanicienne", name_fr: "Mécanicienne de chantier", name_en: "Site Mechanic (F)", skin: "#e0ab7d" },
  { id: "contremaitre", name_fr: "Contremaître", name_en: "Site Foreman", skin: "#c98b5e" }
];

const AVATAR_COLORS = [
  { id: "jaune",  hex: "#f7b500", name_fr: "Jaune sécurité", name_en: "Safety Yellow" },
  { id: "orange", hex: "#ff7a1a", name_fr: "Orange chantier", name_en: "Site Orange" },
  { id: "vert",   hex: "#3bb54a", name_fr: "Vert forêt", name_en: "Forest Green" },
  { id: "bleu",   hex: "#2a7de1", name_fr: "Bleu acier", name_en: "Steel Blue" },
  { id: "rouge",  hex: "#e13c3c", name_fr: "Rouge feu", name_en: "Fire Red" }
];

/* ---- Machines de l'élève (grossissent avec le XP) ----
   Le dessin SVG de chaque machine est dans app.js (fonction vehicleSVG). */
const VEHICLE_TYPES = [
  { id: "camion", name_fr: "Camion à benne", name_en: "Dump Truck" },
  { id: "pelle", name_fr: "Pelle mécanique", name_en: "Excavator" },
  { id: "bouteur", name_fr: "Bouteur", name_en: "Bulldozer" },
  { id: "chargeuse", name_fr: "Chargeuse", name_en: "Loader" }
];

/* La hauteur affichée (en pixels) interpole entre minHeight et maxHeight
   selon le XP actuel de l'élève (voir vehicleHeight() dans app.js). La
   largeur est calculée automatiquement pour respecter les proportions
   propres à chaque machine (voir VEHICLE_VIEWBOX dans app.js). */
const VEHICLE_GROWTH = { minHeight: 78, maxHeight: 178, maxXP: 3500 };

/* ---- Commandes de cabine (questions basées sur une image) ----
   Chaque machine a 4 commandes numérotées, dessinées par cabinSVG()
   dans app.js aux coordonnées cx/cy (viewBox 0 0 360 220). Ces mêmes
   coordonnées servent à la fois à dessiner l'illustration et à
   positionner les zones cliquables des questions de type "hotspot" —
   l'image et les questions restent donc toujours alignées.
   Configuration générique à titre pédagogique — la disposition réelle
   varie selon le fabricant et le modèle (à valider par l'enseignant). */
const CABIN_CONTROLS = {
  pelle: [
    { num: 1, cx: 100, cy: 168, kind: "joystick",
      label_fr: "Joystick gauche", label_en: "Left joystick",
      desc_fr: "Contrôle la rotation de la tourelle et le godet",
      desc_en: "Controls turret rotation and the bucket" },
    { num: 2, cx: 210, cy: 168, kind: "joystick",
      label_fr: "Joystick droit", label_en: "Right joystick",
      desc_fr: "Contrôle la flèche et le bras (balancier)",
      desc_en: "Controls the boom and the stick (arm)" },
    { num: 3, cx: 160, cy: 205, kind: "pedal",
      label_fr: "Pédales de translation", label_en: "Travel pedals",
      desc_fr: "Font avancer ou reculer les chenilles",
      desc_en: "Move the tracks forward or backward" },
    { num: 4, cx: 320, cy: 150, kind: "button",
      label_fr: "Klaxon", label_en: "Horn button",
      desc_fr: "Avertit les personnes autour de la machine avant un mouvement",
      desc_en: "Warns people around the machine before a movement" }
  ],
  bouteur: [
    { num: 1, cx: 110, cy: 172, kind: "lever",
      label_fr: "Levier de la lame", label_en: "Blade control lever",
      desc_fr: "Lève, abaisse et incline la lame",
      desc_en: "Raises, lowers and tilts the blade" },
    { num: 2, cx: 210, cy: 172, kind: "lever",
      label_fr: "Manettes de direction (chenilles)", label_en: "Steering clutch levers",
      desc_fr: "Contrôlent la direction en ralentissant une chenille à la fois",
      desc_en: "Control steering by slowing one track at a time" },
    { num: 3, cx: 160, cy: 205, kind: "pedal",
      label_fr: "Pédale de frein", label_en: "Brake pedal",
      desc_fr: "Ralentit ou immobilise la machine",
      desc_en: "Slows or stops the machine" },
    { num: 4, cx: 320, cy: 150, kind: "button",
      label_fr: "Klaxon", label_en: "Horn button",
      desc_fr: "Avertit les personnes autour de la machine avant un mouvement",
      desc_en: "Warns people around the machine before a movement" }
  ],
  chargeuse: [
    { num: 1, cx: 210, cy: 168, kind: "lever",
      label_fr: "Levier de commande du godet", label_en: "Bucket control lever",
      desc_fr: "Lève, abaisse et bascule le godet",
      desc_en: "Raises, lowers and tilts the bucket" },
    { num: 2, cx: 110, cy: 172, kind: "wheel",
      label_fr: "Volant de direction", label_en: "Steering wheel",
      desc_fr: "Contrôle la direction des roues",
      desc_en: "Controls the direction of the wheels" },
    { num: 3, cx: 160, cy: 205, kind: "pedal",
      label_fr: "Pédale d'accélérateur", label_en: "Accelerator pedal",
      desc_fr: "Contrôle le régime moteur et la vitesse",
      desc_en: "Controls engine speed and travel speed" },
    { num: 4, cx: 320, cy: 150, kind: "button",
      label_fr: "Klaxon", label_en: "Horn button",
      desc_fr: "Avertit les personnes autour de la machine avant un mouvement",
      desc_en: "Warns people around the machine before a movement" }
  ],
  niveleuse: [
    { num: 1, cx: 190, cy: 172, kind: "lever",
      label_fr: "Leviers de la lame", label_en: "Blade control levers",
      desc_fr: "Ajustent l'angle, la hauteur et l'inclinaison de la lame",
      desc_en: "Adjust the blade's angle, height and tilt" },
    { num: 2, cx: 100, cy: 172, kind: "wheel",
      label_fr: "Volant de direction", label_en: "Steering wheel",
      desc_fr: "Contrôle la direction des roues avant",
      desc_en: "Controls the direction of the front wheels" },
    { num: 3, cx: 255, cy: 172, kind: "switch",
      label_fr: "Commande d'articulation du châssis", label_en: "Frame articulation control",
      desc_fr: "Articule le châssis pour resserrer le rayon de braquage",
      desc_en: "Articulates the frame to tighten the turning radius" },
    { num: 4, cx: 320, cy: 150, kind: "button",
      label_fr: "Klaxon", label_en: "Horn button",
      desc_fr: "Avertit les personnes autour de la machine avant un mouvement",
      desc_en: "Warns people around the machine before a movement" }
  ]
};

/* ---- Trophées (méta-réussites) ---- */
const TROPHIES = [
  { id: "t_first", name_fr: "Premier pas", name_en: "First Step", icon: "🥉",
    desc_fr: "Réussir ton premier palier de compétence", desc_en: "Pass your first competency tier",
    check: (state) => Object.keys(state.completed).length >= 1 },
  { id: "t_half", name_fr: "Mi-parcours", name_en: "Halfway There", icon: "🥈",
    desc_fr: "Maîtriser 10 compétences (palier Avancé)", desc_en: "Master 10 competencies (Advanced tier)",
    check: (state) => (state.badges || []).length >= 10 },
  { id: "t_all", name_fr: "Diplômé virtuel", name_en: "Virtual Graduate", icon: "🏆",
    desc_fr: "Maîtriser les 20 compétences du programme", desc_en: "Master all 20 competencies of the program",
    check: (state) => (state.badges || []).length >= 20 },
  { id: "t_perfect", name_fr: "Sans faute", name_en: "Flawless", icon: "💯",
    desc_fr: "Obtenir 100% à un palier", desc_en: "Score 100% on a tier",
    check: (state) => Object.values(state.completed).some(s => s.score === 100) },
  { id: "t_safety", name_fr: "Zone sécurité", name_en: "Safety Zone", icon: "🦺",
    desc_fr: "Réussir le palier Débutant du module Santé et sécurité", desc_en: "Pass the Beginner tier of the Health & Safety module",
    check: (state) => state.completed["c02_1"] && state.completed["c02_1"].score >= 70 },
  { id: "t_streak", name_fr: "Assidu", name_en: "Dedicated", icon: "🔥",
    desc_fr: "Se connecter 3 jours différents", desc_en: "Log in on 3 different days",
    check: (state) => (state.loginDays || []).length >= 3 },
  { id: "t_podium", name_fr: "Sur le podium", name_en: "On the Podium", icon: "🏅",
    desc_fr: "Atteindre le top 3 du palmarès", desc_en: "Reach the top 3 of the leaderboard",
    check: (state) => (LEADERBOARD_SEED.filter(p => p.xp > state.xp).length) < 3 },
  { id: "t_matcher", name_fr: "Bon association", name_en: "Great Match", icon: "🧩",
    desc_fr: "Réussir 15 questions d'association de termes", desc_en: "Complete 15 term-matching questions",
    check: (state) => (state.matchesCompleted || 0) >= 15 }
];

/* ---- Palmarès (données d'exemple — classe fictive) ----
   À remplacer par de vraies données élèves lorsqu'un backend
   partagé sera branché (voir README). */
const LEADERBOARD_SEED = [
  { name: "Mia-Rose T.", xp: 3120, avatarChar: "operatrice_bouteur", avatarColor: "vert" },
  { name: "Xavier L.", xp: 2450, avatarChar: "contremaitre", avatarColor: "bleu" },
  { name: "Sam D.", xp: 1780, avatarChar: "camionneur", avatarColor: "orange" },
  { name: "Alicia P.", xp: 1290, avatarChar: "camionneuse", avatarColor: "rouge" },
  { name: "Kevin R.", xp: 860, avatarChar: "contremaitre", avatarColor: "jaune" },
  { name: "Noémie B.", xp: 430, avatarChar: "mecanicienne", avatarColor: "bleu" },
  { name: "Tommy G.", xp: 120, avatarChar: "camionneur", avatarColor: "vert" }
];
