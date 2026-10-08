-- ============================================================================
-- Quest — Carnet de stage (module en OPTION de licence)
-- Côté élève : chantierquest-web · Côté enseignant : quest-enseignant
--
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query → coller TOUT
-- ce fichier → Run. Le script est IDEMPOTENT : on peut le relancer autant de
-- fois qu'on veut sans rien perdre ni rien casser.
--
-- ----------------------------------------------------------------------------
-- LE PARCOURS (conception arrêtée par Philippe)
-- ----------------------------------------------------------------------------
--   1. L'élève en stage photographie un geste du métier, choisit le geste et
--      l'engin, ajoute une note, et envoie depuis ChantierQuest.
--   2. La réalisation arrive sur le TABLEAU DE BORD DE L'ENSEIGNANT, avec sa
--      photo.
--   3. L'enseignant écrit « Validé » — ou renvoie « À refaire » avec un
--      commentaire — depuis le tableau de bord.
--   4. L'élève reçoit le résultat dans son app : le statut change, le
--      commentaire s'affiche, le badge se débloque.
--
-- Le maître de stage N'EST PAS dans le logiciel. Aucun lien sortant, aucun
-- jeton, aucun numéro de téléphone, aucune donnée de tiers.
--
-- ----------------------------------------------------------------------------
-- DEUX PATRONS DE SÉCURITÉ, UN PAR CÔTÉ — c'est voulu
-- ----------------------------------------------------------------------------
-- · CÔTÉ ÉLÈVE (anonyme, clé publiable) : aucun privilège sur les tables,
--   aucune policy pour `anon`. Tout passe par des fonctions `security definer`
--   au périmètre étroit, comme `soumettre_progression`. Un élève ne peut lire
--   et écrire QUE les réalisations de son propre identifiant d'appareil.
--
-- · CÔTÉ ENSEIGNANT (authentifié par lien magique Supabase) : de VRAIES
--   policies RLS liées à l'utilisateur authentifié, plus des privilèges au
--   NIVEAU COLONNE. Un enseignant ne voit que les réalisations des classes de
--   son organisation, et ne peut écrire QUE deux colonnes : `statut` et
--   `commentaire_prof`. Il lui est matériellement impossible de modifier la
--   photo, la note ou le geste de l'élève — Postgres refuse la colonne.
--   `decide_par` / `decide_le` sont posés par un trigger, pas par le client.
--
-- ----------------------------------------------------------------------------
-- ⚠️ LOI 25 — À LIRE AVANT DE DÉPLOYER CE MODULE
-- ----------------------------------------------------------------------------
-- Contrairement à tout le reste de la plateforme Quest, ce module conserve des
-- RENSEIGNEMENTS PERSONNELS côté serveur :
--   · une PHOTO du travail d'un élève (peut montrer un lieu, un véhicule, une
--     plaque, parfois une personne) — hébergée dans la table ci-dessous, dans
--     le projet Supabase gejmaxobebsamvfkkpoj, région ca-central-1 (Canada) ;
--   · un prénom ou surnom d'élève, saisi par l'élève (`eleve_nom`) ;
--   · le nom de son employeur de stage (`employeur`) ;
--   · le courriel de l'enseignant qui a tranché (`decide_par`) et son
--     commentaire (`commentaire_prof`).
-- La politique de confidentialité publiée à
-- https://productions-imedias.com/confidentialite.html affirme aujourd'hui
-- qu'AUCUN renseignement personnel n'est recueilli. Elle doit être corrigée
-- (hébergement des photographies + durée de conservation), et le consentement
-- obtenu (élève, et parent si moins de 14 ans), AVANT toute utilisation avec
-- de vrais élèves.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Options de licence — colonne additive sur `licences`
-- ----------------------------------------------------------------------------
-- Un centre peut avoir la licence de révision SANS l'option carnet. On ne
-- touche donc PAS à `verifier_licence(p_code, p_app)` : elle garde sa signature
-- et son comportement exacts, et elle est appelée par les 19 applications
-- Quest. L'option vit dans une colonne séparée, lue par une fonction séparée.
-- Un `add column if not exists` ne peut pas changer le comportement de
-- `verifier_licence`, qui ne lit pas cette colonne.
--
--   options = ARRAY['carnet']  -> le centre a payé l'option carnet de stage
--   options = ARRAY[]::text[]  -> aucune option
--   options = NULL             -> aucune option (défaut ; PAS un passe-partout,
--                                 contrairement à `apps`)

alter table licences add column if not exists options text[];

comment on column licences.options is
  'Options payantes activées par ce code (ex. ARRAY[''carnet'']). NULL ou tableau vide = aucune option. Contrairement à `apps`, NULL n''est PAS un passe-partout.';


-- ----------------------------------------------------------------------------
-- 2. option_licence() — le verrou de l'option, séparé du verrou de licence
-- ----------------------------------------------------------------------------
-- Mêmes règles de validité que verifier_licence (code existant, actif, et qui
-- couvre cette app-ci), PLUS l'option demandée. Renvoie un simple booléen :
-- l'app ne peut jamais lister les codes ni les options existantes.

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
  );
$$;

grant execute on function option_licence(text, text, text) to anon;
grant execute on function option_licence(text, text, text) to authenticated;


-- ----------------------------------------------------------------------------
-- 3. Table des réalisations de stage
-- ----------------------------------------------------------------------------
-- Une ligne = un geste du métier photographié par l'élève, en attente de la
-- décision de son enseignant.
--
-- `appareil_id` : l'identifiant d'appareil ANONYME déjà utilisé pour la
-- progression (deviceId() dans app.js). C'est la clé de l'élève côté serveur.
-- `ref` : identifiant généré par l'app (crypto.randomUUID) AVANT tout réseau.
-- Ce n'est pas un secret et il n'apparaît dans aucune URL — il sert de clé
-- d'upsert pour que la file hors ligne puisse rejouer sans créer de doublon.
-- La clé unique est (app, appareil_id, ref) : un appareil ne peut jamais
-- écraser la ligne d'un autre élève, même en devinant une `ref`.
--
-- ----------------------------------------------------------------------------
-- CHOIX POUR LA PHOTO : data URI dans la ligne, PAS Supabase Storage
-- ----------------------------------------------------------------------------
-- JPEG redimensionné à 720 px de côté, qualité 0,72, plafonné à 120 000
-- caractères base64 côté app (≈ 90 ko d'image) et 200 000 côté base
-- (contrainte ci-dessous). UNE seule photo par réalisation.
--
-- Pourquoi pas Storage :
--   1. L'isolation entre centres vient ici GRATUITEMENT de la RLS de la ligne :
--      la photo est une colonne, elle hérite exactement de la même règle que le
--      reste de la réalisation. Avec Storage il faudrait une policy parallèle
--      sur storage.objects, rejointe à cette table — deux règles à garder
--      synchronisées, donc deux occasions de fuite entre organisations.
--   2. Pour que l'app élève téléverse avec la clé PUBLIABLE (qui est dans le
--      code source), il faudrait un bucket écrivable par `anon` : un dépotoir
--      ouvert à quiconque lit la source. Ici `anon` n'a AUCUN privilège.
--   3. La purge Loi 25 marche vraiment : `update ... set photo = null` efface
--      la donnée. Avec Storage, purge en double et orphelins garantis.
--   4. La file hors ligne existante (flushSync) transporte la photo telle
--      quelle. Storage exigerait une seconde file de téléversement, donc un
--      deuxième mécanisme à maintenir.
--
-- Volume et coût : ≈ 90 ko par photo. Une classe de 15 élèves × 8 gestes
-- ≈ 120 photos ≈ 11 Mo par groupe-année. 10 CFP × 2 groupes ≈ 220 Mo/an, borné
-- par la purge des photos à 12 mois. Le plan gratuit Supabase plafonne à
-- 500 Mo de base, le plan Pro à 8 Go : ce module impose donc le plan Pro dès
-- quelques centres. Requête de surveillance en section 9 ; au-delà de ~2 Go,
-- migrer vers Storage (travail purement serveur, l'app n'y voit rien).
--
-- ⚠️ VIDÉO : NON prise en charge dans cette version, et je recommande de
-- l'écarter. Un clip de 10 s pèse 5 à 15 Mo, soit 50 à 150 photos. Il ne
-- passerait ni par un data URI, ni par le localStorage de l'app (≈ 5 Mo par
-- origine, donc même UNE vidéo ne tiendrait pas dans la file hors ligne). La
-- vidéo exige Storage + un téléversement reprenable + un plan payant : c'est
-- une décision distincte, pas une variante de celle-ci.

create table if not exists carnet_realisations (
  id          uuid primary key default gen_random_uuid(),

  -- Rattachement
  app         text not null,              -- APP_ID (ici 'chantier')
  classe_code text not null,              -- = classes.code_classe, en majuscules
  appareil_id text not null,              -- identifiant d'appareil ANONYME de l'élève
  ref         text not null,              -- clé d'upsert générée par l'app

  -- ⚠️ Renseignements personnels (minimum nécessaire pour que l'enseignant
  -- sache de qui vient la réalisation et pour que le carnet ait valeur de preuve)
  eleve_nom   text,                       -- prénom ou surnom SAISI par l'élève
  eleve_totem text,                       -- totem anonyme (sert aussi à rejoindre la fiche élève)
  employeur   text,                       -- entreprise d'accueil du stage

  -- Contenu de la réalisation (écrit par l'élève, JAMAIS par l'enseignant)
  geste_id    text not null,
  geste_nom   text,                       -- libellé figé au moment de la saisie
  engin       text,
  note        text,
  photo       text,                       -- ⚠️ data URI JPEG (renseignement personnel)

  -- Décision de l'enseignant (écrite depuis le tableau de bord, RLS + privilège
  -- de colonne ; `decide_par` / `decide_le` sont posés par le trigger)
  statut           text not null default 'attente',
  commentaire_prof text,
  decide_le        timestamptz,
  decide_par       text,                  -- courriel de l'enseignant

  -- Cycle de vie
  cree_le        timestamptz not null default now(),   -- horloge de l'appareil n'est pas utilisée
  recu_le        timestamptz,                          -- arrivée au serveur (une réalisation hors
                                                       -- ligne peut arriver des jours plus tard)
  photo_purge_le timestamptz not null default now() + interval '12 months',
  supprimer_le   timestamptz not null default now() + interval '18 months',

  unique (app, appareil_id, ref)
);

-- Colonnes ajoutées après coup (si la table existait déjà d'une version
-- antérieure de ce script) — garde l'idempotence complète.
alter table carnet_realisations add column if not exists geste_nom text;
alter table carnet_realisations add column if not exists commentaire_prof text;
alter table carnet_realisations add column if not exists decide_le timestamptz;
alter table carnet_realisations add column if not exists decide_par text;
alter table carnet_realisations add column if not exists recu_le timestamptz;
alter table carnet_realisations add column if not exists photo_purge_le timestamptz not null default now() + interval '12 months';
alter table carnet_realisations add column if not exists supprimer_le timestamptz not null default now() + interval '18 months';

-- Contraintes : via DO block, Postgres n'a pas « add constraint if not exists ».
do $ctr$
begin
  if not exists (select 1 from pg_constraint where conname = 'carnet_statut_valide') then
    alter table carnet_realisations
      add constraint carnet_statut_valide check (statut in ('attente', 'validee', 'refaire'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'carnet_photo_plafond') then
    -- ~200 ko de base64 ≈ 150 ko d'image : plafond dur. L'app visse à 120 000.
    alter table carnet_realisations
      add constraint carnet_photo_plafond check (photo is null or char_length(photo) <= 200000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'carnet_textes_courts') then
    alter table carnet_realisations
      add constraint carnet_textes_courts check (
        char_length(coalesce(note, '')) <= 500
        and char_length(coalesce(commentaire_prof, '')) <= 500
        and char_length(coalesce(eleve_nom, '')) <= 40
        and char_length(coalesce(employeur, '')) <= 80
        and char_length(coalesce(ref, '')) <= 64
      );
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'carnet_real_ref_uniq') then
    create unique index carnet_real_ref_uniq on carnet_realisations (app, appareil_id, ref);
  end if;
end
$ctr$;

create index if not exists carnet_real_classe_idx  on carnet_realisations (app, classe_code);
create index if not exists carnet_real_appareil_idx on carnet_realisations (app, appareil_id);
create index if not exists carnet_real_statut_idx  on carnet_realisations (statut);
create index if not exists carnet_real_purge_idx   on carnet_realisations (supprimer_le);

alter table carnet_realisations enable row level security;


-- ----------------------------------------------------------------------------
-- 4. Table des heures de stage — un TOTAL, pas un journal
-- ----------------------------------------------------------------------------
-- Minimisation : le journal jour par jour reste SUR L'APPAREIL de l'élève
-- (c'est sa copie). Le serveur ne reçoit que le cumul et l'objectif, ce qui
-- suffit au « 96 h / 150 h » du tableau de bord.

create table if not exists carnet_heures (
  id              uuid primary key default gen_random_uuid(),
  app             text not null,
  classe_code     text not null,
  appareil_id     text not null,
  eleve_nom       text,
  eleve_totem     text,
  total_heures    numeric(6,1) not null default 0,
  objectif_heures numeric(6,1),
  maj_le          timestamptz not null default now(),
  supprimer_le    timestamptz not null default now() + interval '18 months',
  unique (app, appareil_id)
);

alter table carnet_heures add column if not exists eleve_nom text;
alter table carnet_heures add column if not exists supprimer_le timestamptz not null default now() + interval '18 months';

create index if not exists carnet_heures_classe_idx on carnet_heures (app, classe_code);

alter table carnet_heures enable row level security;


-- ----------------------------------------------------------------------------
-- 5. PRIVILÈGES — le cœur du verrou
-- ----------------------------------------------------------------------------
-- Supabase accorde par défaut tous les privilèges sur une table neuve du
-- schéma public aux rôles `anon` et `authenticated`. On les retire d'abord,
-- puis on n'en rend que le strict nécessaire. Sans ce REVOKE, les policies
-- ci-dessous seraient la seule barrière ; avec lui, il y en a deux.

revoke all on carnet_realisations from anon;
revoke all on carnet_realisations from authenticated;
revoke all on carnet_heures       from anon;
revoke all on carnet_heures       from authenticated;

-- `anon` (l'app élève) : AUCUN privilège de table. Elle n'a que les trois
-- fonctions security definer de la section 7.

-- `authenticated` (l'enseignant connecté par lien magique) :
--   · lecture complète des réalisations de SES classes (policy section 6) ;
--   · écriture limitée à DEUX COLONNES. Toute tentative de modifier `photo`,
--     `note`, `geste_id`, `appareil_id`… est refusée par Postgres avant même
--     d'atteindre la policy.
grant select on carnet_realisations to authenticated;
grant update (statut, commentaire_prof) on carnet_realisations to authenticated;
grant select on carnet_heures to authenticated;


-- ----------------------------------------------------------------------------
-- 6. POLICIES RLS — côté enseignant authentifié uniquement
-- ----------------------------------------------------------------------------
-- « Est-ce une de mes classes ? » se résout en s'appuyant sur la RLS DÉJÀ EN
-- PLACE sur `classes` : cette fonction est `security invoker`, donc la
-- sous-requête ne voit que les classes que l'utilisateur authentifié a le droit
-- de voir (cadrage `mon_organisation()`). On ne duplique donc pas la règle
-- d'organisation — un seul endroit à maintenir, pas deux qui divergent.
--
-- ⚠️ Si le tableau de bord d'un enseignant affiche « aucune réalisation » alors
-- qu'il devrait en voir, c'est ICI qu'il faut regarder : vérifier le nom de la
-- colonne de code de classe avec la requête de contrôle (d) de la section 9.

create or replace function carnet_est_ma_classe(p_code text)
returns boolean
language sql
stable
security invoker          -- volontaire : la RLS de `classes` doit s'appliquer
set search_path = public
as $$
  select exists (
    select 1 from classes c
    where upper(c.code_classe) = upper(trim(p_code))
  );
$$;

grant execute on function carnet_est_ma_classe(text) to authenticated;

drop policy if exists carnet_lecture_enseignant   on carnet_realisations;
drop policy if exists carnet_decision_enseignant  on carnet_realisations;
drop policy if exists carnet_heures_enseignant    on carnet_heures;

-- Lecture : un enseignant voit les réalisations des classes de son organisation
-- et rien d'autre. Aucune policy pour `anon` : l'app élève ne peut pas lire la
-- table, même en direct.
create policy carnet_lecture_enseignant on carnet_realisations
  for select to authenticated
  using (carnet_est_ma_classe(classe_code));

-- Décision : même périmètre, et la clause WITH CHECK empêche de déplacer une
-- réalisation vers une classe qui ne serait pas la sienne.
create policy carnet_decision_enseignant on carnet_realisations
  for update to authenticated
  using (carnet_est_ma_classe(classe_code))
  with check (carnet_est_ma_classe(classe_code));

create policy carnet_heures_enseignant on carnet_heures
  for select to authenticated
  using (carnet_est_ma_classe(classe_code));


-- Trigger : `decide_par` et `decide_le` ne sont JAMAIS fournis par le client.
-- Le trigger ne s'active que pour un utilisateur authentifié (auth.uid() non
-- nul), donc jamais sur l'upsert de l'app élève, qui passe par la clé anonyme.
create or replace function carnet_tg_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.statut is distinct from old.statut
          or new.commentaire_prof is distinct from old.commentaire_prof) then
    new.decide_le  := now();
    new.decide_par := coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      (current_setting('request.jwt.claims', true)::jsonb ->> 'email'),
      'enseignant'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists carnet_decision on carnet_realisations;
create trigger carnet_decision
  before update on carnet_realisations
  for each row execute function carnet_tg_decision();


-- ----------------------------------------------------------------------------
-- 7. Fonctions de l'APP ÉLÈVE (anonyme — `security definer`, aucune policy)
-- ----------------------------------------------------------------------------

-- 7a. Envoi (ou mise à jour) d'une réalisation.
-- Appelée par la file hors ligne de l'app (carnet.js → flushSync). Idempotente :
-- rejouer la file ne crée pas de doublon.
-- L'OPTION EST VÉRIFIÉE ICI AUSSI, pas seulement dans l'interface : sans
-- l'option carnet au contrat du centre, rien ne s'écrit.
-- Ne touche JAMAIS `statut`, `commentaire_prof`, `decide_le`, `decide_par` :
-- la décision appartient à l'enseignant, l'élève ne peut pas se valider.
create or replace function carnet_soumettre(
  p_licence   text,
  p_app       text,
  p_classe    text,
  p_appareil  text,
  p_ref       text,
  p_nom       text,
  p_totem     text,
  p_employeur text,
  p_geste     text,
  p_geste_nom text,
  p_engin     text,
  p_note      text,
  p_photo     text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not option_licence(p_licence, p_app, 'carnet') then
    return 'non-autorise';
  end if;
  if coalesce(trim(p_appareil), '') = ''
     or coalesce(trim(p_ref), '') = ''
     or coalesce(trim(p_geste), '') = ''
     or coalesce(trim(p_classe), '') = '' then
    return 'incomplet';
  end if;
  if p_photo is not null and char_length(p_photo) > 200000 then
    return 'photo-trop-grosse';
  end if;
  -- La réalisation doit atterrir dans un vrai groupe, sinon aucun enseignant ne
  -- la verra jamais et ce serait une donnée personnelle orpheline.
  if not exists (select 1 from classes c where upper(c.code_classe) = upper(trim(p_classe))) then
    return 'classe-inconnue';
  end if;

  insert into carnet_realisations (
    app, classe_code, appareil_id, ref, eleve_nom, eleve_totem, employeur,
    geste_id, geste_nom, engin, note, photo, recu_le
  ) values (
    trim(p_app),
    upper(trim(p_classe)),
    trim(p_appareil),
    left(trim(p_ref), 64),
    nullif(left(trim(coalesce(p_nom, '')), 40), ''),
    nullif(left(trim(coalesce(p_totem, '')), 60), ''),
    nullif(left(trim(coalesce(p_employeur, '')), 80), ''),
    trim(p_geste),
    nullif(left(trim(coalesce(p_geste_nom, '')), 120), ''),
    nullif(left(trim(coalesce(p_engin, '')), 60), ''),
    nullif(left(trim(coalesce(p_note, '')), 500), ''),
    p_photo,
    now()
  )
  on conflict (app, appareil_id, ref) do update
    set classe_code = excluded.classe_code,
        eleve_nom   = coalesce(excluded.eleve_nom, carnet_realisations.eleve_nom),
        eleve_totem = coalesce(excluded.eleve_totem, carnet_realisations.eleve_totem),
        employeur   = coalesce(excluded.employeur, carnet_realisations.employeur),
        geste_nom   = coalesce(excluded.geste_nom, carnet_realisations.geste_nom),
        engin       = coalesce(excluded.engin, carnet_realisations.engin),
        note        = coalesce(excluded.note, carnet_realisations.note),
        -- Une photo déjà reçue n'est jamais écrasée par un NULL, ni ressuscitée
        -- après la purge des 12 mois.
        photo       = case
                        when excluded.photo is not null and carnet_realisations.photo_purge_le > now()
                          then excluded.photo
                        else carnet_realisations.photo
                      end,
        recu_le     = now();
        -- statut / commentaire_prof / decide_* : volontairement intouchés.

  return 'ok';
end;
$$;

grant execute on function carnet_soumettre(
  text, text, text, text, text, text, text, text, text, text, text, text, text
) to anon;


-- 7b. Retour vers l'élève : il relit l'état de SES réalisations.
-- Même mécanisme que `maybeBackfillCfp()` dans app.js — relecture au démarrage
-- et au retour du réseau, aucune notification poussée.
-- Autorisé par la seule connaissance de son identifiant d'appareil (un UUID,
-- déjà la clé de sa progression). Ne renvoie NI photo, NI nom, NI employeur,
-- NI le courriel de l'enseignant : seulement ce dont l'app a besoin pour
-- changer le statut, afficher le commentaire et débloquer le badge.
create or replace function carnet_etat_eleve(p_app text, p_appareil text)
returns table (
  ref              text,
  geste_id         text,
  statut           text,
  commentaire_prof text,
  decide_le        timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.ref, r.geste_id, r.statut, r.commentaire_prof, r.decide_le
  from carnet_realisations r
  where r.app = trim(p_app)
    and r.appareil_id = trim(p_appareil)
    and coalesce(trim(p_appareil), '') <> ''
  order by r.cree_le desc
  limit 300;
$$;

grant execute on function carnet_etat_eleve(text, text) to anon;


-- 7c. Cumul d'heures (le journal jour par jour reste local).
create or replace function carnet_heures_maj(
  p_licence  text,
  p_app      text,
  p_classe   text,
  p_appareil text,
  p_nom      text,
  p_totem    text,
  p_total    numeric,
  p_objectif numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not option_licence(p_licence, p_app, 'carnet') then
    return 'non-autorise';
  end if;
  if coalesce(trim(p_appareil), '') = '' or coalesce(trim(p_classe), '') = '' then
    return 'incomplet';
  end if;
  if not exists (select 1 from classes c where upper(c.code_classe) = upper(trim(p_classe))) then
    return 'classe-inconnue';
  end if;

  insert into carnet_heures (app, classe_code, appareil_id, eleve_nom, eleve_totem, total_heures, objectif_heures)
  values (trim(p_app), upper(trim(p_classe)), trim(p_appareil),
          nullif(left(trim(coalesce(p_nom, '')), 40), ''),
          nullif(left(trim(coalesce(p_totem, '')), 60), ''),
          greatest(0, least(9999, coalesce(p_total, 0))),
          nullif(greatest(0, least(9999, coalesce(p_objectif, 0))), 0))
  on conflict (app, appareil_id) do update
    set classe_code     = excluded.classe_code,
        eleve_nom       = coalesce(excluded.eleve_nom, carnet_heures.eleve_nom),
        eleve_totem     = coalesce(excluded.eleve_totem, carnet_heures.eleve_totem),
        total_heures    = excluded.total_heures,
        objectif_heures = coalesce(excluded.objectif_heures, carnet_heures.objectif_heures),
        maj_le          = now();

  return 'ok';
end;
$$;

grant execute on function carnet_heures_maj(text, text, text, text, text, text, numeric, numeric) to anon;


-- ----------------------------------------------------------------------------
-- 8. Rétention (Loi 25) — purge en deux temps
-- ----------------------------------------------------------------------------
-- Durées PROPOSÉES (à confirmer par Philippe avec le CFP, qui est le
-- responsable du dossier de l'élève) :
--   · 12 MOIS après la soumission : la PHOTO est effacée. Elle a servi à la
--     validation ; la trace pédagogique (geste, engin, date, décision,
--     commentaire) suffit ensuite, et c'est elle qui a une valeur de dossier.
--     C'est la donnée la plus sensible et la plus lourde : elle part la
--     première.
--   · 18 MOIS après la soumission : la ligne entière disparaît. Un DEP 5220
--     dure environ un an — 18 mois couvrent la sanction des études et une
--     reprise, sans conserver au-delà.
-- À appeler manuellement, ou à planifier (pg_cron) :
--   select cron.schedule('carnet-purge', '0 4 * * *', $$select carnet_purge()$$);

create or replace function carnet_purge()
returns table (photos_effacees int, lignes_supprimees int, heures_supprimees int)
language plpgsql
security definer
set search_path = public
as $$
declare a int; b int; c int;
begin
  update carnet_realisations set photo = null
   where photo is not null and photo_purge_le <= now();
  get diagnostics a = row_count;

  delete from carnet_realisations where supprimer_le <= now();
  get diagnostics b = row_count;

  delete from carnet_heures where supprimer_le <= now();
  get diagnostics c = row_count;

  return query select a, b, c;
end;
$$;

-- Volontairement NON exposée : seul le propriétaire du projet (ou pg_cron)
-- l'exécute. Ni l'app ni un enseignant ne doivent pouvoir purger.
revoke all on function carnet_purge() from anon;
revoke all on function carnet_purge() from authenticated;

-- Droit à l'effacement : suppression de tout ce qui concerne un appareil.
-- À exécuter à la main depuis le SQL Editor.
create or replace function carnet_effacer_eleve(p_app text, p_appareil text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  delete from carnet_realisations where app = trim(p_app) and appareil_id = trim(p_appareil);
  get diagnostics n = row_count;
  delete from carnet_heures where app = trim(p_app) and appareil_id = trim(p_appareil);
  return n;
end;
$$;

revoke all on function carnet_effacer_eleve(text, text) from anon;
revoke all on function carnet_effacer_eleve(text, text) from authenticated;


-- ----------------------------------------------------------------------------
-- 9. CONTRÔLE — à lire après le Run
-- ----------------------------------------------------------------------------

-- (a) Le verrou de licence n'a PAS bougé (doit renvoyer true, false) :
select
  verifier_licence('CHANTIER-2026-MGLG', 'chantier') as licence_chantier_ok,   -- attendu : true
  verifier_licence('CHANTIER-2026-MGLG', 'sasi')     as licence_chantier_sasi; -- attendu : false

-- (b) L'option carnet est INDÉPENDANTE de la licence : tant qu'aucun code n'a
--     `options`, tout renvoie false (licence de révision sans option carnet).
select
  option_licence('CHANTIER-2026-MGLG', 'chantier', 'carnet') as option_carnet_chantier, -- attendu : false avant la section 10
  option_licence('SASI-2026-JMQR',     'sasi',     'carnet') as option_carnet_sasi;     -- attendu : false

-- (c) Les privilèges sont bien au cordeau. Attendu EXACTEMENT :
--     carnet_realisations · authenticated · SELECT        (toutes colonnes)
--     carnet_realisations · authenticated · UPDATE        (statut)
--     carnet_realisations · authenticated · UPDATE        (commentaire_prof)
--     carnet_heures       · authenticated · SELECT
--     et AUCUNE ligne pour `anon`.
select table_name, grantee, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('carnet_realisations', 'carnet_heures')
  and grantee in ('anon', 'authenticated')
  and privilege_type <> 'SELECT'
union all
select table_name, grantee, privilege_type, '(toutes)'
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in ('carnet_realisations', 'carnet_heures')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- (d) RLS activée, et les policies ne concernent QUE `authenticated` :
select tablename, policyname, roles, cmd
from pg_policies
where tablename in ('carnet_realisations', 'carnet_heures')
order by tablename, policyname;
select relname, relrowsecurity as rls_activee
from pg_class where relname in ('carnet_realisations', 'carnet_heures');

-- (e) Le nom réel de la colonne de code de classe (utilisée par
--     carnet_est_ma_classe). Doit contenir `code_classe`.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'classes'
order by ordinal_position;

-- (f) Test de bout en bout côté élève (à lancer APRÈS la section 10, qui
--     active l'option sur le code maître). Remplacer DEMO-5220 par un code de
--     classe réel si besoin. Décommenter le bloc entier :
-- select carnet_soumettre(
--   'CHANTIER-2026-MGLG', 'chantier', 'DEMO-5220', 'device-test-carnet',
--   'ref-test-0001', 'Test', 'Castor Vaillant', 'Excavation Test inc.',
--   'inspection', 'Inspecter l''engin avant le travail', 'Pelle hydraulique',
--   'Ligne de test, a supprimer.', null
-- );   -- attendu : 'ok'
-- select carnet_soumettre(
--   'CHANTIER-2026-MGLG', 'chantier', 'DEMO-5220', 'device-test-carnet',
--   'ref-test-0001', 'Test', 'Castor Vaillant', 'Excavation Test inc.',
--   'inspection', 'Inspecter l''engin avant le travail', 'Pelle hydraulique',
--   'Ligne de test, a supprimer.', null
-- );   -- attendu : 'ok', et TOUJOURS UNE SEULE ligne (upsert idempotent)
-- select count(*) as doit_valoir_1, max(statut) as doit_valoir_attente
-- from carnet_realisations where appareil_id = 'device-test-carnet';
-- select carnet_soumettre(
--   'CODE-QUI-NEXISTE-PAS', 'chantier', 'DEMO-5220', 'device-test-carnet',
--   'ref-test-0002', null, null, null, 'tranchee', null, null, null, null
-- );   -- attendu : 'non-autorise' (le verrou d'option mord aussi côté serveur)
-- select carnet_soumettre(
--   'CHANTIER-2026-MGLG', 'chantier', 'CLASSE-BIDON', 'device-test-carnet',
--   'ref-test-0003', null, null, null, 'tranchee', null, null, null, null
-- );   -- attendu : 'classe-inconnue'
-- -- Simule la décision de l'enseignant (ici en tant que propriétaire, donc sans
-- -- trigger : auth.uid() est nul. En vrai, c'est le tableau de bord qui écrit).
-- update carnet_realisations set statut = 'refaire', commentaire_prof = 'Il manque les chenilles.'
--  where appareil_id = 'device-test-carnet' and ref = 'ref-test-0001';
-- select * from carnet_etat_eleve('chantier', 'device-test-carnet');   -- statut 'refaire' + commentaire
-- select * from carnet_etat_eleve('chantier', 'un-autre-appareil');    -- 0 ligne : cloisonnement OK
-- delete from carnet_realisations where appareil_id = 'device-test-carnet';   -- nettoyage

-- (g) À FAIRE UNE FOIS, CONNECTÉ COMME ENSEIGNANT (dans le tableau de bord,
--     onglet réseau du navigateur, ou SQL Editor en mode « impersonate role »
--     si disponible) : vérifier le cloisonnement entre organisations.
--     select count(*) from carnet_realisations;
--     doit renvoyer UNIQUEMENT les réalisations des classes de SON centre.


-- ----------------------------------------------------------------------------
-- 10. Activer l'option pour un centre — à faire à la main, centre par centre
-- ----------------------------------------------------------------------------
-- RIEN n'est activé par ce script : un centre qui n'a pas payé l'option ne doit
-- pas la voir apparaître. Décommenter la ligne du centre concerné.

-- Code maître / interne, pour tester le module :
-- update licences set options = array['carnet'] where code = 'CHANTIER-2026-MGLG';

-- Un vrai centre :
-- update licences set options = array['carnet'] where code = 'ESHORE-2026-UNEN';

-- Retirer l'option (la licence de révision reste active) :
-- update licences set options = array_remove(options, 'carnet') where code = 'ESHORE-2026-UNEN';

-- Qui a l'option ?
-- select code, label, apps, options from licences where options is not null and options <> '{}';

-- Poids réel des photos en base — À SURVEILLER (plan gratuit = 500 Mo,
-- plan Pro = 8 Go). Au-delà de ~2 Go, migrer les photos vers Storage.
-- select count(*) as realisations,
--        count(photo) as avec_photo,
--        pg_size_pretty(coalesce(sum(char_length(photo)), 0)) as poids_base64,
--        pg_size_pretty(pg_total_relation_size('carnet_realisations')) as taille_table
-- from carnet_realisations;
