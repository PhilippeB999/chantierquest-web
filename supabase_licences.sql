-- ============================================================================
-- Quest — configuration Supabase des codes de licence (freemium)
-- Fichier canonique pour TOUTES les apps Quest (elles partagent le projet
-- gejmaxobebsamvfkkpoj, le même que le tableau de bord enseignant).
--
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query → coller
-- tout ce fichier → Run. Le script est IDEMPOTENT : on peut le relancer
-- sans rien casser ni perdre de code existant.
--
-- Objectif : les codes de licence ne sont plus codés en dur dans app.js
-- (n'importe qui pouvait les lire via « Afficher la source »). Ils vivent
-- ici, dans une table verrouillée par RLS, et l'app ne peut que demander
-- « est-ce que CE code précis est valide POUR CETTE APP ? » — jamais lister
-- ou lire les codes existants, même avec la clé anon publique.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------

create table if not exists licences (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Portée du code : quelles apps il déverrouille.
--   ARRAY['sasi']          -> ne déverrouille que SASIQuest
--   ARRAY['sasi','pab']    -> déverrouille les deux (ex. un CFP qui a acheté les deux)
--   NULL                   -> déverrouille TOUTES les apps (forfait « suite complète »)
-- ⚠️ NULL est un passe-partout : à ne mettre QUE pour un vrai forfait suite
-- complète. Un code client normal doit toujours avoir un tableau explicite.
alter table licences add column if not exists apps text[];

comment on column licences.apps is
  'Apps déverrouillées par ce code (identifiants APP_ID des app.js). NULL = toutes les apps (forfait suite complète).';

-- Sécurité : RLS activée, AUCUNE policy publique sur la table elle-même.
-- Personne (même avec la clé anon de l'app) ne peut lister ou lire les
-- codes directement via l'API REST.
alter table licences enable row level security;


-- ----------------------------------------------------------------------------
-- 2. Fonction de vérification — REMPLACE l'ancienne version à 1 paramètre
-- ----------------------------------------------------------------------------
-- L'ancienne signature verifier_licence(text) ne savait pas pour quelle app
-- le code était valide : dans un projet Supabase partagé par toutes les apps
-- Quest, n'importe quel code valide (ex. ESHORE-2026-UNEN de ChantierQuest)
-- déverrouillait AUSSI SASI, PAB, PédiatrieQuest, etc.
-- Le DROP est indispensable : sans lui, Postgres garderait les DEUX
-- signatures et l'ancienne, sans portée, resterait appelable par n'importe
-- quelle app — le trou de sécurité resterait ouvert.

drop function if exists verifier_licence(text);

create or replace function verifier_licence(p_code text, p_app text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from licences
    where code = upper(trim(p_code))
      and active = true
      and (apps is null or p_app = any(apps))
  );
$$;

-- Autorise l'app (utilisateurs non authentifiés) à appeler cette fonction.
grant execute on function verifier_licence(text, text) to anon;


-- ----------------------------------------------------------------------------
-- 3. Codes existants — tous ceux qui étaient en clair dans les app.js
-- ----------------------------------------------------------------------------
-- Identifiants d'app (constante APP_ID dans chaque app.js) :
--   chantier · sasi · pab · pediatrie · physio · compta · secretariat
--   secretariatmedical · coiffure · ebenisterie · electricite · infographie
--   mecaniqueauto · plomberie · soudage · voyage · charpenterie
--   perinatalite · santementale
--
-- Le ON CONFLICT fait une MISE À JOUR de la portée (et non « do nothing ») :
-- un code déjà présent en base depuis la première version du script n'avait
-- pas de colonne `apps`, donc `apps` valait NULL = passe-partout. Sans cette
-- mise à jour, ces codes-là resteraient universels et le bug cross-app
-- survivrait à la migration.

insert into licences (code, label, apps) values
  -- ChantierQuest (déjà en base depuis la 1re version du script)
  ('CHANTIER-2026-MGLG',    'Code maître / interne — ChantierQuest',            array['chantier']),
  ('ESHORE-2026-UNEN',      'Eastern Shore (ESSB) — ChantierQuest',             array['chantier']),

  -- SASIQuest (DEP 5325)
  ('SASI-2026-JMQR',        'Code maître / interne — SASIQuest',                array['sasi']),

  -- CFP L'Envol : un seul code pour ses DEUX apps (il était en clair dans
  -- sasi-web ET pab-web). À garder groupé, sinon le centre perd un accès.
  ('ENVOL-2026-B2PG',       'CFP L''Envol — SASIQuest + PABQuest',              array['sasi','pab']),

  -- PABQuest (DEP 5358)
  ('PAB-2026-PBEL',         'Code maître / interne — PABQuest',                 array['pab']),

  -- PédiatrieQuest
  ('PEDIA-2026-JOUE',       'Code maître / interne — PédiatrieQuest',           array['pediatrie']),
  ('PEDIA-2026-DEMO',       'Démo — PédiatrieQuest',                            array['pediatrie']),
  ('ENVOL-2026-Q7MX',       'CFP L''Envol — PédiatrieQuest',                    array['pediatrie']),

  -- PhysioQuest (DEC 144.A0) — codes encore provisoires
  ('PHYSIO-2026-PBEL',      'Code maître / interne — PhysioQuest',              array['physio']),
  ('CSTJEAN-2026-PHYS',     'Cégep Saint-Jean-sur-Richelieu — PhysioQuest',     array['physio']),

  -- Un code par app pour les autres programmes
  ('COMPTA-2026-SJO5',      'Licence centre — ComptaQuest',                     array['compta']),
  ('SECRETARIAT-2026-3GMW', 'Licence centre — SecrétariatQuest',                array['secretariat']),
  ('SECMED-2026-AT71',      'Licence centre — Secrétariat médical',             array['secretariatmedical']),
  ('COIFFURE-2026-RJW2',    'Licence centre — CoiffureQuest',                   array['coiffure']),
  ('EBEN-2026-BOI8',        'Licence centre — ÉbénisterieQuest',                array['ebenisterie']),
  ('ELEC-2026-HDB7',        'Licence centre — ÉlecQuest',                       array['electricite']),
  ('INFOGRAPHIE-2026-HYJL', 'Licence centre — InfographieQuest',                array['infographie']),
  ('MECANIQUE-2026-KF43',   'Licence centre — MécaniqueAutoQuest',              array['mecaniqueauto']),
  ('PLOMBERIE-2026-ERD9',   'Licence centre — PlomberieQuest',                  array['plomberie']),
  ('SOUDAGE-2026-CSN4',     'Licence centre — SoudageQuest',                    array['soudage']),
  ('VOYAGE-2026-TRV5',      'Licence centre — VoyageQuest',                     array['voyage']),
  ('CHARP-2026-8TJD',       'Licence centre — Charpenterie-menuiserie',         array['charpenterie']),

  -- PérinatalitéQuest (SASI, compétences 27-28)
  ('PERINAT-2026-JAJR',     'Code maître / interne — PérinatalitéQuest',        array['perinatalite']),
  ('PERINAT-2026-DEMO',     'Démo — PérinatalitéQuest',                         array['perinatalite']),

  -- SantéMentaleQuest (SASI, compétence 20)
  ('SANTEMENT-2026-K3PL',   'Code maître / interne — SantéMentaleQuest',        array['santementale']),
  ('SANTEMENT-2026-DEMO',   'Démo — SantéMentaleQuest',                         array['santementale'])
on conflict (code) do update
  set apps  = excluded.apps,
      label = coalesce(excluded.label, licences.label);

-- Filet de sécurité explicite pour les deux codes ChantierQuest, au cas où
-- ils auraient été modifiés à la main entre-temps (l'UPDATE est idempotent).
update licences set apps = array['chantier']
where code in ('CHANTIER-2026-MGLG', 'ESHORE-2026-UNEN');


-- ----------------------------------------------------------------------------
-- 4. CONTRÔLE — à lire après le Run
-- ----------------------------------------------------------------------------

-- (a) Aucun code ne doit apparaître ici, sauf un vrai forfait « suite
--     complète » vendu 6000 $/an. Tout code listé ici est un PASSE-PARTOUT
--     qui déverrouille les 17 apps.
select code, label, active
from licences
where apps is null
order by code;

-- (b) Vue d'ensemble : qui ouvre quoi.
select code, label, apps, active
from licences
order by apps, code;

-- (c) Test de la règle de portée (doit renvoyer true, false, false, true) :
select
  verifier_licence('SASI-2026-JMQR',   'sasi')      as code_sasi_sur_sasi,       -- attendu : true
  verifier_licence('SASI-2026-JMQR',   'pab')       as code_sasi_sur_pab,        -- attendu : false
  verifier_licence('ESHORE-2026-UNEN', 'sasi')      as code_chantier_sur_sasi,   -- attendu : false
  verifier_licence('ENVOL-2026-B2PG',  'pab')       as code_envol_sur_pab;       -- attendu : true

-- (d) Même test pour les 2 nouvelles apps (doit renvoyer true, false) :
select
  verifier_licence('PERINAT-2026-DEMO',   'perinatalite')  as demo_perinat_sur_perinat,   -- attendu : true
  verifier_licence('PERINAT-2026-DEMO',   'santementale')  as demo_perinat_sur_santemen;  -- attendu : false


-- ----------------------------------------------------------------------------
-- 5. Opérations courantes, plus tard
-- ----------------------------------------------------------------------------

-- Nouveau client pour une seule app :
-- insert into licences (code, label, apps)
-- values ('NOUVEAU-CODE-XYZ', 'Nom du centre — SASIQuest', array['sasi']);

-- Client qui achète deux programmes :
-- insert into licences (code, label, apps)
-- values ('CENTRE-2026-AB12', 'Nom du centre — SASI + PAB', array['sasi','pab']);

-- Forfait « suite complète » (toutes les apps, 6000 $/an) — NULL assumé :
-- insert into licences (code, label, apps)
-- values ('SUITE-2026-CD34', 'Nom du centre — suite complète', null);

-- Ajouter une app à un code existant :
-- update licences set apps = apps || array['pediatrie'] where code = 'ENVOL-2026-B2PG';

-- Retirer une app d'un code existant :
-- update licences set apps = array_remove(apps, 'pab') where code = 'ENVOL-2026-B2PG';

-- Désactiver un code (fin de contrat) sans le supprimer :
-- update licences set active = false where code = 'ESHORE-2026-UNEN';

-- Réactiver :
-- update licences set active = true where code = 'ESHORE-2026-UNEN';
