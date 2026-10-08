-- ============================================================================
-- Quest — Carnet de stage (StageQuest) : TEXTE LIBRE pour le geste et l'engin
-- Complément de supabase_carnet.sql — à exécuter APRÈS lui.
--
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query → coller TOUT
-- ce fichier → Run. Le script est IDEMPOTENT : on peut le relancer autant de
-- fois qu'on veut sans rien perdre ni rien casser.
--
-- ⚠️ NE PAS MODIFIER supabase_carnet.sql ni supabase_carnet_realtime.sql :
--    ils sont déjà exécutés en production.
--
-- ----------------------------------------------------------------------------
-- CE QUE CE FICHIER NE FAIT PAS
-- ----------------------------------------------------------------------------
-- Il ne crée AUCUNE table, AUCUNE colonne, AUCUNE policy, AUCUN privilège, et
-- ne touche à AUCUNE fonction. Le schéma accueillait déjà le texte libre :
--
--   · Geste écrit par l'élève → `geste_id = 'autre'` et le texte dans
--     `geste_nom`, qui est précisément la colonne « libellé figé au moment de
--     la saisie ». Rien à ajouter.
--   · Engin écrit par l'élève → `engin` est déjà du texte libre. Rien à
--     ajouter.
--   · Engin principal du journal d'heures → ne quitte JAMAIS l'appareil (seul
--     le total passe par `carnet_heures_maj`). Aucune colonne concernée.
--
-- La clé d'upsert (app, appareil_id, ref) n'a pas à bouger non plus : `ref`
-- est un UUID tiré PAR RÉALISATION côté app (carnetRef()), il ne dérive pas de
-- `geste_id`. Deux gestes « autre » différents du même appareil portent donc
-- deux `ref` différentes et ne peuvent pas s'écraser l'un l'autre. C'est la
-- propriété qui rend le texte libre possible sans changer le schéma :
-- ⛔ NE JAMAIS dériver `ref` d'un identifiant de geste.
--
-- ----------------------------------------------------------------------------
-- CE QU'IL FAIT : le plafond de longueur qui manquait
-- ----------------------------------------------------------------------------
-- `carnet_textes_courts` (supabase_carnet.sql §2) plafonne note,
-- commentaire_prof, eleve_nom, employeur et ref — mais PAS geste_id, geste_nom
-- ni engin. Tant que ces trois champs venaient d'une liste fermée codée dans
-- l'app, le plafond était implicite. Dès que l'élève écrit lui-même, il faut
-- le rendre explicite EN BASE, et pas seulement dans le navigateur.
--
-- `carnet_soumettre` tronque déjà geste_nom à 120 et engin à 60 (`left(...)`),
-- mais PAS geste_id : un appel direct à la RPC pouvait y pousser un texte de
-- taille arbitraire. Cette contrainte ferme ce trou — la ligne est refusée par
-- Postgres au lieu d'être écrite. L'app, elle, est plus sévère encore : elle
-- plafonne le geste écrit à 80 caractères et l'engin à 40, et refuse un champ
-- vide. Le serveur n'a donc jamais à tronquer une saisie légitime.
--
-- Limites retenues (et pourquoi) :
--   geste_id   40  — un identifiant technique ('inspection', 'autre'…)
--   geste_nom 120  — déjà le plafond de troncature de carnet_soumettre
--   engin      60  — idem
--
-- ----------------------------------------------------------------------------
-- LOI 25 — rien de nouveau ne transite
-- ----------------------------------------------------------------------------
-- Le texte libre remplace un libellé choisi dans une liste par un libellé écrit
-- par l'élève : même colonne, même destinataire (son seul enseignant), même
-- purge (photo à 12 mois, ligne à 18 mois). Aucune catégorie de renseignement
-- nouvelle. Le consentement reste celui de l'écran d'accueil de StageQuest, et
-- il reste À FAIRE VALIDER avant de vrais élèves.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Plafond de longueur sur geste_id / geste_nom / engin
-- ----------------------------------------------------------------------------
-- Ajoutée en deux temps, exprès :
--   a) `not valid` → l'ALTER ne scanne pas la table et ne peut donc PAS échouer
--      sur une ligne historique. La contrainte s'applique immédiatement à toute
--      écriture nouvelle (insert ET update), ce qui est l'objectif.
--   b) `validate constraint` dans un bloc à part, avec rattrapage d'exception :
--      si une ligne ancienne dépassait, le script se termine quand même et
--      affiche un avertissement au lieu de tout annuler.
do $tl$
begin
  if not exists (select 1 from pg_constraint where conname = 'carnet_geste_engin_courts') then
    alter table carnet_realisations
      add constraint carnet_geste_engin_courts check (
        char_length(coalesce(geste_id,  '')) <= 40
        and char_length(coalesce(geste_nom, '')) <= 120
        and char_length(coalesce(engin,     '')) <= 60
      ) not valid;
    raise notice 'carnet_geste_engin_courts : contrainte créée (not valid).';
  else
    raise notice 'carnet_geste_engin_courts : déjà présente, rien à faire.';
  end if;
end
$tl$;

do $tlv$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'carnet_geste_engin_courts' and not convalidated
  ) then
    begin
      alter table carnet_realisations validate constraint carnet_geste_engin_courts;
      raise notice 'carnet_geste_engin_courts : validée sur les lignes existantes.';
    exception when check_violation then
      raise warning 'carnet_geste_engin_courts reste NOT VALID : au moins une ligne historique dépasse les plafonds. Les écritures nouvelles sont déjà protégées. Requête de diagnostic en section 2.';
    end;
  end if;
end
$tlv$;


-- ----------------------------------------------------------------------------
-- 2. Vérification — à lire après le Run
-- ----------------------------------------------------------------------------
-- a) La contrainte existe et couvre les lignes existantes.
--    Attendu : une ligne, contrainte_validee = true.
select conname as contrainte, convalidated as contrainte_validee
from pg_constraint
where conname = 'carnet_geste_engin_courts';

-- b) Les longueurs réellement en base, et combien de gestes les élèves ont
--    écrits eux-mêmes. Attendu : max_geste_id ≤ 40, max_geste_nom ≤ 120,
--    max_engin ≤ 60. Si (a) renvoie false, c'est ici qu'on voit laquelle coince.
select
  coalesce(max(char_length(geste_id)),  0) as max_geste_id,
  coalesce(max(char_length(geste_nom)), 0) as max_geste_nom,
  coalesce(max(char_length(engin)),     0) as max_engin,
  count(*) filter (where geste_id = 'autre') as gestes_ecrits_par_eleve,
  count(*) as lignes_totales
from carnet_realisations;
