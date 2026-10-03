-- ============================================================================
-- Quest — compteur de lancement d'app (statistiques d'utilisation)
-- Fichier canonique pour TOUTES les apps Quest (projet partagé gejmaxobebsamvfkkpoj).
--
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query → coller
-- tout ce fichier → Run. IDEMPOTENT : peut être relancé sans rien casser.
--
-- Objectif : savoir combien de fois chaque app est réellement lancée, sur
-- combien d'appareils distincts — INDÉPENDAMMENT du partage de classe (qui
-- ne capte que les élèves ayant entré un code de classe). Un simple
-- identifiant d'appareil anonyme (déjà généré par chaque app pour la file
-- de synchro) suffit ; aucun nom, aucune donnée personnelle.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------------------------
create table if not exists lancements (
  id bigint generated always as identity primary key,
  app text not null,
  device_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists lancements_app_idx on lancements (app);
create index if not exists lancements_created_at_idx on lancements (created_at);

-- Sécurité : RLS activée, AUCUNE policy publique. Personne (même avec la clé
-- anon) ne peut lister/lire les lancements directement via l'API REST —
-- seule la fonction ci-dessous (INSERT uniquement) est exposée.
alter table lancements enable row level security;


-- ----------------------------------------------------------------------------
-- 2. Fonction d'enregistrement — INSERT seulement, aucune lecture possible
-- ----------------------------------------------------------------------------
create or replace function enregistrer_lancement(p_app text, p_device_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into lancements (app, device_id)
  values (trim(p_app), trim(p_device_id));
$$;

grant execute on function enregistrer_lancement(text, text) to anon;


-- ----------------------------------------------------------------------------
-- 3. CONTRÔLE — à lire après le Run
-- ----------------------------------------------------------------------------

-- (a) La fonction s'exécute sans erreur :
select enregistrer_lancement('test-verification', 'device-test-verification');

-- (b) La ligne de test est bien là (à supprimer ensuite, voir plus bas) :
select * from lancements where app = 'test-verification';

-- (c) Nettoyage de la ligne de test :
delete from lancements where app = 'test-verification';


-- ----------------------------------------------------------------------------
-- 4. Statistiques — à relancer n'importe quand pour voir l'usage réel
-- ----------------------------------------------------------------------------
select
  app,
  count(*)                    as lancements_total,
  count(distinct device_id)   as appareils_distincts,
  min(created_at)             as premier_lancement,
  max(created_at)             as dernier_lancement
from lancements
group by app
order by lancements_total desc;


-- ----------------------------------------------------------------------------
-- 5. Statistiques COMPLÈTES — la requête à utiliser au quotidien
--
-- Pourquoi celle-ci plutôt que la section 4 : la requête ci-dessus fait un
-- `group by` sur la table des lancements, donc une app que PERSONNE n'ouvre
-- n'apparaît pas du tout — ligne absente, et non ligne à zéro. Or c'est
-- justement l'information la plus utile : savoir quelles apps ne décollent pas.
--
-- Celle-ci part de la liste des 19 apps et fait un LEFT JOIN : les apps sans
-- aucun lancement sortent donc avec des zéros, bien visibles.
--
-- Colonnes : `appareils_distincts` compte des PERSONNES (le chiffre à citer
-- dans une démarche auprès d'un CFP) ; `lancements_total` compte des ouvertures ;
-- `appareils_30j` distingue une app réellement vivante d'une app qui a eu une
-- pointe de curiosité puis plus rien.
--
-- Si une app est ajoutée ou renommée, ajouter son APP_ID à la liste ci-dessous.
-- ----------------------------------------------------------------------------
with apps(app) as (
  values ('chantier'),('charpenterie'),('coiffure'),('compta'),('ebenisterie'),
         ('electricite'),('infographie'),('mecaniqueauto'),('pab'),('pediatrie'),
         ('perinatalite'),('physio'),('plomberie'),('santementale'),('sasi'),
         ('secretariat'),('secretariatmedical'),('soudage'),('voyage')
)
select
  a.app,
  count(l.id)                 as lancements_total,
  count(distinct l.device_id) as appareils_distincts,
  count(distinct l.device_id)
    filter (where l.created_at > now() - interval '30 days') as appareils_30j,
  max(l.created_at)           as dernier_lancement
from apps a
left join lancements l on l.app = a.app
group by a.app
order by appareils_distincts desc, a.app;
