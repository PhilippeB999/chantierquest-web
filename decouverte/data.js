/* ============================================================
   DécouverteQuest — banque d'œuvres et de monuments
   ============================================================
   Chaque entrée pointe vers un article de Wikipédia en français (« wiki »).
   L'image et son crédit sont récupérés à l'exécution, dans le navigateur du
   joueur : l'image principale de l'article, puis sa licence sur Commons.
   Seules les images du domaine public, CC0, CC BY ou CC BY-SA sont gardées.

   Choix des entrées (droit d'auteur sur l'ŒUVRE, pas seulement la photo) :
   - artistes morts depuis plus de 70 ans ;
   - monuments anciens, ou situés dans un pays qui permet de photographier
     librement les bâtiments (« liberté de panorama »).
   Une entrée dont l'article ou l'image ne répond pas est simplement sautée. */

const CATEGORIES = [
  { id: "tout",      nom: "Tout mélangé", emoji: "🎲" },
  { id: "peinture",  nom: "Peintures",    emoji: "🖼️" },
  { id: "sculpture", nom: "Sculptures",   emoji: "🗿" },
  { id: "monument",  nom: "Monuments",    emoji: "🏛️" },
];

// wiki : titre de l'article fr.wikipedia — reponse : ce que le joueur doit trouver
// detail : artiste ou lieu, affiché après la réponse
const OEUVRES = [
  // ---------- Peintures ----------
  { cat: "peinture", wiki: "La_Joconde", reponse: "La Joconde", detail: "Léonard de Vinci, vers 1503-1519" },
  { cat: "peinture", wiki: "La_Nuit_étoilée", reponse: "La Nuit étoilée", detail: "Vincent van Gogh, 1889" },
  { cat: "peinture", wiki: "La_Jeune_Fille_à_la_perle", reponse: "La Jeune Fille à la perle", detail: "Johannes Vermeer, vers 1665" },
  { cat: "peinture", wiki: "La_Naissance_de_Vénus_(Botticelli)", reponse: "La Naissance de Vénus", detail: "Sandro Botticelli, vers 1485" },
  { cat: "peinture", wiki: "La_Liberté_guidant_le_peuple", reponse: "La Liberté guidant le peuple", detail: "Eugène Delacroix, 1830" },
  { cat: "peinture", wiki: "Le_Cri", reponse: "Le Cri", detail: "Edvard Munch, 1893" },
  { cat: "peinture", wiki: "La_Grande_Vague_de_Kanagawa", reponse: "La Grande Vague de Kanagawa", detail: "Hokusai, vers 1831" },
  { cat: "peinture", wiki: "Les_Ménines", reponse: "Les Ménines", detail: "Diego Vélasquez, 1656" },
  { cat: "peinture", wiki: "La_Ronde_de_nuit", reponse: "La Ronde de nuit", detail: "Rembrandt, 1642" },
  { cat: "peinture", wiki: "Impression,_soleil_levant", reponse: "Impression, soleil levant", detail: "Claude Monet, 1872" },
  { cat: "peinture", wiki: "Le_Radeau_de_La_Méduse", reponse: "Le Radeau de La Méduse", detail: "Théodore Géricault, 1818-1819" },
  { cat: "peinture", wiki: "La_Cène_(Léonard_de_Vinci)", reponse: "La Cène", detail: "Léonard de Vinci, 1495-1498" },
  { cat: "peinture", wiki: "Le_Déjeuner_sur_l'herbe", reponse: "Le Déjeuner sur l'herbe", detail: "Édouard Manet, 1863" },
  { cat: "peinture", wiki: "Bal_du_moulin_de_la_Galette", reponse: "Bal du moulin de la Galette", detail: "Auguste Renoir, 1876" },
  { cat: "peinture", wiki: "Des_glaneuses", reponse: "Des glaneuses", detail: "Jean-François Millet, 1857" },
  { cat: "peinture", wiki: "L'Angélus_(Millet)", reponse: "L'Angélus", detail: "Jean-François Millet, 1857-1859" },
  { cat: "peinture", wiki: "Le_Sacre_de_Napoléon", reponse: "Le Sacre de Napoléon", detail: "Jacques-Louis David, 1805-1807" },
  { cat: "peinture", wiki: "Le_Jardin_des_délices", reponse: "Le Jardin des délices", detail: "Jérôme Bosch, vers 1500" },
  { cat: "peinture", wiki: "Le_Baiser_(Klimt)", reponse: "Le Baiser (Klimt)", detail: "Gustav Klimt, 1908-1909" },
  { cat: "peinture", wiki: "Un_dimanche_après-midi_à_l'Île_de_la_Grande_Jatte", reponse: "Un dimanche après-midi à l'Île de la Grande Jatte", detail: "Georges Seurat, 1884-1886" },
  { cat: "peinture", wiki: "La_Création_d'Adam", reponse: "La Création d'Adam", detail: "Michel-Ange, vers 1512" },
  { cat: "peinture", wiki: "Le_Voyageur_contemplant_une_mer_de_nuages", reponse: "Le Voyageur contemplant une mer de nuages", detail: "Caspar David Friedrich, vers 1818" },
  { cat: "peinture", wiki: "Saturne_dévorant_un_de_ses_fils", reponse: "Saturne dévorant un de ses fils", detail: "Francisco de Goya, 1819-1823" },
  { cat: "peinture", wiki: "Les_Raboteurs_de_parquet", reponse: "Les Raboteurs de parquet", detail: "Gustave Caillebotte, 1875" },

  // ---------- Sculptures ----------
  { cat: "sculpture", wiki: "Le_Penseur", reponse: "Le Penseur", detail: "Auguste Rodin, 1880-1904" },
  { cat: "sculpture", wiki: "Le_Baiser_(Rodin)", reponse: "Le Baiser (Rodin)", detail: "Auguste Rodin, 1882" },
  { cat: "sculpture", wiki: "David_(Michel-Ange)", reponse: "Le David de Michel-Ange", detail: "Michel-Ange, Florence, 1501-1504" },
  { cat: "sculpture", wiki: "Pietà_(Michel-Ange)", reponse: "La Pietà", detail: "Michel-Ange, Vatican, 1498-1499" },
  { cat: "sculpture", wiki: "Vénus_de_Milo", reponse: "Vénus de Milo", detail: "Grèce antique, Louvre" },
  { cat: "sculpture", wiki: "Victoire_de_Samothrace", reponse: "Victoire de Samothrace", detail: "Grèce antique, Louvre" },
  { cat: "sculpture", wiki: "Discobole", reponse: "Le Discobole", detail: "D'après Myron, Grèce antique" },
  { cat: "sculpture", wiki: "Groupe_du_Laocoon", reponse: "Laocoon et ses fils", detail: "Rome antique, musées du Vatican" },
  { cat: "sculpture", wiki: "Buste_de_Néfertiti", reponse: "Buste de Néfertiti", detail: "Égypte antique, Neues Museum, Berlin" },
  { cat: "sculpture", wiki: "Masque_funéraire_de_Toutânkhamon", reponse: "Masque de Toutânkhamon", detail: "Égypte antique, Le Caire" },
  { cat: "sculpture", wiki: "Armée_de_terre_cuite", reponse: "L'Armée de terre cuite", detail: "Chine, IIIe siècle av. J.-C." },
  { cat: "sculpture", wiki: "Moaï", reponse: "Les Moaï", detail: "Île de Pâques, Chili" },
  { cat: "sculpture", wiki: "Manneken-Pis", reponse: "Manneken-Pis", detail: "Bruxelles, Belgique" },
  { cat: "sculpture", wiki: "Grand_Sphinx_de_Gizeh", reponse: "Le Grand Sphinx", detail: "Gizeh, Égypte" },

  // ---------- Monuments ----------
  { cat: "monument", wiki: "Tour_Eiffel", reponse: "La tour Eiffel", detail: "Paris, France" },
  { cat: "monument", wiki: "Colisée", reponse: "Le Colisée", detail: "Rome, Italie" },
  { cat: "monument", wiki: "Taj_Mahal", reponse: "Le Taj Mahal", detail: "Agra, Inde" },
  { cat: "monument", wiki: "Grande_Muraille", reponse: "La Grande Muraille", detail: "Chine" },
  { cat: "monument", wiki: "Machu_Picchu", reponse: "Machu Picchu", detail: "Pérou" },
  { cat: "monument", wiki: "Pyramide_de_Khéops", reponse: "La pyramide de Khéops", detail: "Gizeh, Égypte" },
  { cat: "monument", wiki: "Sagrada_Família", reponse: "La Sagrada Família", detail: "Barcelone, Espagne" },
  { cat: "monument", wiki: "Big_Ben", reponse: "Big Ben", detail: "Londres, Royaume-Uni" },
  { cat: "monument", wiki: "Tour_de_Pise", reponse: "La tour de Pise", detail: "Pise, Italie" },
  { cat: "monument", wiki: "Pétra", reponse: "Pétra", detail: "Jordanie" },
  { cat: "monument", wiki: "Angkor_Vat", reponse: "Angkor Vat", detail: "Cambodge" },
  { cat: "monument", wiki: "Mont-Saint-Michel", reponse: "Le Mont-Saint-Michel", detail: "Normandie, France" },
  { cat: "monument", wiki: "Château_Frontenac", reponse: "Le Château Frontenac", detail: "Québec, Canada" },
  { cat: "monument", wiki: "Oratoire_Saint-Joseph_du_Mont-Royal", reponse: "L'oratoire Saint-Joseph", detail: "Montréal, Canada" },
  { cat: "monument", wiki: "Rocher_Percé", reponse: "Le rocher Percé", detail: "Gaspésie, Québec" },
  { cat: "monument", wiki: "Parthénon", reponse: "Le Parthénon", detail: "Athènes, Grèce" },
  { cat: "monument", wiki: "Stonehenge", reponse: "Stonehenge", detail: "Angleterre, Royaume-Uni" },
  { cat: "monument", wiki: "Statue_de_la_Liberté", reponse: "La statue de la Liberté", detail: "New York, États-Unis" },
  { cat: "monument", wiki: "Golden_Gate_Bridge", reponse: "Le Golden Gate Bridge", detail: "San Francisco, États-Unis" },
  { cat: "monument", wiki: "Opéra_de_Sydney", reponse: "L'Opéra de Sydney", detail: "Sydney, Australie" },
  { cat: "monument", wiki: "Christ_Rédempteur", reponse: "Le Christ Rédempteur", detail: "Rio de Janeiro, Brésil" },
  { cat: "monument", wiki: "Cathédrale_Saint-Basile-le-Bienheureux", reponse: "La cathédrale Saint-Basile", detail: "Moscou, Russie" },
  { cat: "monument", wiki: "Alhambra_(Grenade)", reponse: "L'Alhambra", detail: "Grenade, Espagne" },
  { cat: "monument", wiki: "Chichén_Itzá", reponse: "Chichén Itzá", detail: "Yucatán, Mexique" },
  { cat: "monument", wiki: "Château_de_Neuschwanstein", reponse: "Le château de Neuschwanstein", detail: "Bavière, Allemagne" },
  { cat: "monument", wiki: "Tower_Bridge", reponse: "Le Tower Bridge", detail: "Londres, Royaume-Uni" },
];
