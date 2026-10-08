-- ============================================================================
-- Quest — Carnet de stage (StageQuest) : TEMPS RÉEL côté enseignant
-- Complément de supabase_carnet.sql — à exécuter APRÈS lui.
--
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query → coller TOUT
-- ce fichier → Run. Le script est IDEMPOTENT : on peut le relancer autant de
-- fois qu'on veut sans rien perdre ni rien casser.
--
-- ⚠️ NE PAS MODIFIER supabase_carnet.sql : il est déjà exécuté en production.
--    Ce fichier-ci n'ajoute rien à la base : il ne fait qu'inscrire une table
--    existante dans la publication de réplication logique que Supabase
--    Realtime écoute. Aucune table, aucune colonne, aucune policy, aucun
--    privilège n'est créé ni modifié ici.
--
-- ----------------------------------------------------------------------------
-- POURQUOI C'EST NÉCESSAIRE
-- ----------------------------------------------------------------------------
-- Supabase Realtime ne diffuse les changements que des tables inscrites dans
-- la publication `supabase_realtime`. Une table peut avoir la bonne RLS, les
-- bons privilèges et le bon client : sans cette ligne, AUCUN événement ne part.
-- Le tableau de bord s'abonne à `carnet_realisations` ; tant que cette
-- publication ne la contient pas, l'abonnement réussit mais reste muet.
--
-- ----------------------------------------------------------------------------
-- CE QUE ÇA N'OUVRE PAS — le modèle de sécurité ne bouge pas d'un pouce
-- ----------------------------------------------------------------------------
-- Realtime diffuse un changement à un abonné SEULEMENT si la policy `select`
-- de la table l'autorise pour le rôle du jeton de cet abonné. Donc :
--
--   · `authenticated` (l'enseignant, lien magique) : la policy
--     `carnet_lecture_enseignant` (section 6 de supabase_carnet.sql) s'applique
--     telle quelle. Il ne reçoit que les réalisations des classes de son
--     organisation — exactement le même périmètre que son SELECT habituel.
--
--   · `anon` (l'app élève) : n'a AUCUN privilège sur `carnet_realisations`
--     (`revoke all`, section 5) et AUCUNE policy. Un abonnement temps réel
--     anonyme ne lui livrera donc jamais une seule ligne. C'est voulu :
--     l'élève est servi par relecture de `carnet_etat_eleve` (security
--     definer, limité à SON identifiant d'appareil), pas par Realtime.
--
-- ⛔ NE JAMAIS accorder `select` sur `carnet_realisations` à `anon` pour faire
--    marcher un temps réel côté élève. La clé publiable est dans le code
--    source de la PWA : ce serait ouvrir la lecture des réalisations (photos
--    incluses) de TOUS les centres à quiconque lit la source. Le côté élève
--    reste sur la relecture de sa propre fonction, point final.
--
-- ----------------------------------------------------------------------------
-- REPLICA IDENTITY : on garde la valeur par défaut (clé primaire), exprès
-- ----------------------------------------------------------------------------
-- `replica identity full` ferait voyager l'ANCIENNE version de la ligne dans
-- chaque événement d'UPDATE — donc la photo base64 (jusqu'à 200 ko) une
-- deuxième fois, à chaque décision d'enseignant. Inutile ici : le tableau de
-- bord ne lit AUCUNE donnée du message temps réel. Il s'en sert comme d'une
-- sonnette, puis relit la liste par un SELECT normal (donc refiltré par la
-- RLS, sans la colonne `photo`). Conséquence assumée : les événements DELETE
-- ne portent que l'id — le tableau de bord le gère (il relance simplement sa
-- relecture, qui ne peut rien montrer d'un autre centre).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Inscrire `carnet_realisations` dans la publication Realtime
-- ----------------------------------------------------------------------------
do $rt$
declare
  v_existe      boolean;
  v_touteslesth boolean;
begin
  select true, puballtables into v_existe, v_touteslesth
  from pg_publication
  where pubname = 'supabase_realtime';

  if v_existe is not true then
    -- Projet où la publication n'existe pas encore (rare : Supabase la crée).
    create publication supabase_realtime;
    raise notice 'Publication supabase_realtime créée (elle était absente).';
    v_touteslesth := false;
  end if;

  if v_touteslesth then
    -- Publication « FOR ALL TABLES » : la table est déjà couverte, un
    -- ALTER ... ADD TABLE échouerait. Rien à faire.
    raise notice 'supabase_realtime couvre déjà toutes les tables : rien à ajouter.';
  elsif exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'carnet_realisations'
  ) then
    raise notice 'carnet_realisations est déjà dans supabase_realtime : rien à faire.';
  else
    alter publication supabase_realtime add table public.carnet_realisations;
    raise notice 'carnet_realisations ajoutée à supabase_realtime.';
  end if;
end
$rt$;

-- NOTE : `carnet_heures` n'est PAS inscrite, volontairement. Le cumul
-- d'heures n'a aucun caractère d'urgence, et le tableau de bord le relit de
-- toute façon à chaque relecture déclenchée par une réalisation. Moins de
-- réplication logique = moins de bruit. Pour l'ajouter un jour, copier le
-- bloc ci-dessus en remplaçant le nom de la table.


-- ----------------------------------------------------------------------------
-- 2. Vérifications (à lire dans l'onglet Results, de haut en bas)
-- ----------------------------------------------------------------------------

-- (a) La table est-elle bien publiée ? Doit renvoyer UNE ligne.
select 'a) publiee' as controle, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename  = 'carnet_realisations';

-- (b) `anon` n'a toujours AUCUN privilège sur la table ? Doit renvoyer ZÉRO ligne.
--     Si cette requête renvoie quoi que ce soit, STOP : la lecture anonyme est
--     ouverte, ce qui n'est pas le modèle voulu.
select 'b) privilege anon (doit etre vide)' as controle, privilege_type, column_name
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'carnet_realisations' and grantee = 'anon'
union all
select 'b) privilege anon (doit etre vide)', privilege_type, '(toutes)'
from information_schema.table_privileges
where table_schema = 'public' and table_name = 'carnet_realisations' and grantee = 'anon';

-- (c) Aucune policy pour `anon` ? La colonne `roles` ne doit contenir que
--     {authenticated} sur les deux policies du carnet.
select 'c) policies' as controle, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'carnet_realisations'
order by policyname;

-- (d) Replica identity : doit afficher 'd' (default = clé primaire), pas 'f'.
--     `to_regclass` plutôt qu'un cast direct : si la table manquait, un cast
--     lèverait une erreur et, l'éditeur SQL de Supabase exécutant tout le
--     fichier dans UNE transaction, annulerait l'ajout fait plus haut.
select 'd) replica identity' as controle, relreplident
from pg_class
where oid = to_regclass('public.carnet_realisations');

-- (e) ⚠️ CONTRÔLE À LIRE SI LE TEMPS RÉEL RESTE MUET CÔTÉ ENSEIGNANT.
--     Realtime évalue la policy `carnet_lecture_enseignant`, qui appelle
--     `carnet_est_ma_classe()`, qui s'appuie sur la RLS de `classes` et donc
--     sur `mon_organisation()`. Cette évaluation se fait dans le moteur de
--     Realtime, où seules les claims du JWT sont disponibles.
--     Le corps affiché ci-dessous DOIT se baser sur `auth.uid()`,
--     `auth.jwt()` ou `auth.email()` — tout cela fonctionne dans Realtime.
--     S'il se basait sur `current_setting('request.headers', ...)`, la policy
--     ne pourrait pas s'évaluer côté Realtime : il faudrait alors la réécrire
--     sur `auth.jwt()`. (Le tableau de bord a de toute façon un repli par
--     relecture périodique, donc la démonstration ne tombe pas.)
--     (Même précaution qu'en (d) : `to_regprocedure` renvoie NULL au lieu de
--     lever une erreur si la fonction porte un autre nom.)
select 'e) corps de mon_organisation' as controle,
       pg_get_functiondef(to_regprocedure('public.mon_organisation()')) as definition;
