-- ============================================================================
-- Quest — Licence de DÉMONSTRATION à durée limitée
-- Complément de supabase_licences.sql et de supabase_carnet.sql
--
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query → coller TOUT
-- ce fichier → Run. Le script est IDEMPOTENT : on peut le relancer autant de
-- fois qu'on veut sans rien perdre ni rien casser.
--
-- ----------------------------------------------------------------------------
-- POURQUOI CE FICHIER
-- ----------------------------------------------------------------------------
-- Philippe présente StageQuest (le carnet de stage, option `carnet` de
-- ChantierQuest) à des enseignants d'Eastern Shores au début de novembre 2026.
-- Il veut projeter un QR code que les profs scannent pour essayer l'app sur
-- LEUR téléphone, tout de suite, sans qu'il ait à dicter un code au micro.
--
-- Le lien derrière le QR code ressemble à :
--   https://chantier.questedu.ca/?licence=STAGE-DEMO-2026&code=ESHORE-5220
-- (`?licence=` pose la licence, `?code=` rattache à la classe de démo —
--  voir `applyUrlParams()` dans app.js).
--
-- Un code de licence posé par un simple lien se retrouve forcément dans des
-- captures d'écran, des photos de l'écran de projection, l'historique des
-- navigateurs des profs, parfois un courriel qui circule. Il NE DOIT donc pas
-- rester valide éternellement : il lui faut une DATE DE FIN, côté serveur, que
-- personne ne peut contourner depuis le navigateur.
--
-- La table `licences` n'a aujourd'hui AUCUNE notion d'expiration : id, code,
-- label, active, created_at, apps, options. C'est ce que ce script ajoute.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. La colonne d'expiration
-- ----------------------------------------------------------------------------
-- Changement purement ADDITIF, et c'est voulu : la colonne arrive à NULL pour
-- les ~27 codes déjà en base. NULL = « pas de date de fin » = exactement le
-- comportement actuel. Aucune licence vendue n'est touchée, aucune ne risque
-- de se fermer par effet de bord.
--
-- Type `date` (et non `timestamptz`) : une licence se gère à la journée, pas à
-- la minute, et on évite toute question de fuseau horaire. La comparaison se
-- fait avec `current_date`, donc le code reste valide TOUTE la journée du
-- `expire_le` inclusivement (voir `>=` à la section 2).

alter table licences add column if not exists expire_le date;

comment on column licences.expire_le is
  'Dernier jour de validité du code (inclus). NULL = aucune expiration (comportement par défaut de toutes les licences vendues).';


-- ----------------------------------------------------------------------------
-- 2. Les deux fonctions de vérification apprennent à regarder la date
-- ----------------------------------------------------------------------------
-- ⚠️ ZONE SENSIBLE — `verifier_licence(text, text)` est appelée par les 19 apps
-- Quest, qui partagent toutes ce projet Supabase. Les deux fonctions
-- ci-dessous sont RECOPIÉES À L'IDENTIQUE depuis supabase_licences.sql
-- (section 2) et supabase_carnet.sql (section 2). La SEULE différence est la
-- ligne `and (expire_le is null or expire_le >= current_date)`.
--
-- Cette ligne est un NO-OP pour toute ligne existante : `expire_le` y vaut
-- NULL, donc la première branche est vraie et le résultat est inchangé. Rien
-- d'autre dans le corps, la signature, le `security definer`, le `search_path`
-- ou les `grant` ne bouge. Aucun `drop function` ici : un `create or replace`
-- sur la même signature conserve les privilèges déjà accordés — mais on
-- réaffirme quand même les `grant` plus bas, par sécurité et par idempotence.

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
      and (expire_le is null or expire_le >= current_date)
  );
$$;

grant execute on function verifier_licence(text, text) to anon;


-- Même ajout pour le verrou d'OPTION (carnet de stage). Il faut les deux :
-- sans celui-ci, un code expiré serait refusé pour entrer dans l'app mais
-- l'option « carnet » resterait confirmée pour un appareil qui a déjà le code
-- en mémoire locale (`state.accessCode` survit hors ligne), et l'onglet 🦺
-- continuerait d'apparaître après la fin de la démo.

create or replace function option_licence(p_code text, p_app text, p_option text)
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
      and options is not null
      and lower(trim(p_option)) = any(options)
      and (expire_le is null or expire_le >= current_date)
  );
$$;

grant execute on function option_licence(text, text, text) to anon;
grant execute on function option_licence(text, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. La licence de démo elle-même
-- ----------------------------------------------------------------------------
-- · apps    = {chantier}  → portée explicite, jamais NULL. Ce code ne doit
--                           ouvrir QUE ChantierQuest, pas les 18 autres apps.
-- · options = {carnet}    → c'est tout l'objet de la démo : l'onglet 🦺.
-- · expire_le = 2026-12-31 → la démo est en novembre ; le code meurt de
--                           lui-même à la fin de l'année, même si Philippe
--                           oublie de le révoquer et même si le QR code
--                           continue de circuler.
--
-- Le `on conflict (code) do update` rend le script rejouable : relancer le
-- fichier remet simplement la portée, l'option, le libellé et la date de fin
-- aux valeurs ci-dessus (pratique pour repousser la date après coup).

insert into licences (code, label, active, apps, options, expire_le) values
  ('STAGE-DEMO-2026',
   'DÉMO À DURÉE LIMITÉE — StageQuest (carnet de stage) · QR code de présentation Eastern Shores, nov. 2026 · expire le 2026-12-31',
   true,
   array['chantier'],
   array['carnet'],
   '2026-12-31')
on conflict (code) do update
  set label     = excluded.label,
      active    = excluded.active,
      apps      = excluded.apps,
      options   = excluded.options,
      expire_le = excluded.expire_le;


-- ----------------------------------------------------------------------------
-- 4. CONTRÔLE — à lire après le Run
-- ----------------------------------------------------------------------------

-- (a) La ligne créée, telle qu'elle est en base.
select code, label, active, apps, options, expire_le,
       (expire_le >= current_date) as encore_valide_aujourdhui
from licences
where code = 'STAGE-DEMO-2026';

-- (b) Le code doit ouvrir ChantierQuest + l'option carnet, et RIEN d'autre.
--     Attendu : true, false, true, false
select
  verifier_licence('STAGE-DEMO-2026', 'chantier')             as licence_sur_chantier,  -- attendu : true
  verifier_licence('STAGE-DEMO-2026', 'sasi')                 as licence_sur_sasi,      -- attendu : false
  option_licence  ('STAGE-DEMO-2026', 'chantier', 'carnet')   as option_carnet,         -- attendu : true
  option_licence  ('STAGE-DEMO-2026', 'sasi',     'carnet')   as option_carnet_sasi;    -- attendu : false

-- (c) NON-RÉGRESSION — les licences vendues n'ont pas d'expiration et doivent
--     se comporter exactement comme avant. Attendu : true, true, false
select
  verifier_licence('ESHORE-2026-UNEN', 'chantier') as eshore_sur_chantier,  -- attendu : true
  verifier_licence('SASI-2026-JMQR',   'sasi')     as sasi_sur_sasi,        -- attendu : true
  verifier_licence('SASI-2026-JMQR',   'pab')      as sasi_sur_pab;         -- attendu : false

-- (d) Inventaire des codes à durée limitée (doit ne contenir que la démo).
select code, label, expire_le, active
from licences
where expire_le is not null
order by expire_le, code;


-- ----------------------------------------------------------------------------
-- 5. Opérations courantes, plus tard
-- ----------------------------------------------------------------------------

-- RÉVOQUER LA DÉMO D'UN COUP (effet immédiat pour tous les appareils en ligne) :
-- update licences set active = false where code = 'STAGE-DEMO-2026';

-- Prolonger la démo d'un mois :
-- update licences set expire_le = '2027-01-31' where code = 'STAGE-DEMO-2026';

-- Transformer la démo en vraie licence permanente (après une vente) :
-- update licences set expire_le = null, label = 'Nom du centre — ChantierQuest + carnet'
-- where code = 'STAGE-DEMO-2026';

-- Créer une autre démo limitée pour un autre centre :
-- insert into licences (code, label, apps, options, expire_le)
-- values ('AUTRE-DEMO-2027', 'DÉMO — nom du centre', array['chantier'], array['carnet'], '2027-03-31');

-- Donner une date de fin à une licence vendue (fin de contrat annuel) :
-- update licences set expire_le = '2027-06-30' where code = 'ESHORE-2026-UNEN';
