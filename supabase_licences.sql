-- ChantierQuest — configuration Supabase pour les codes de licence (freemium)
-- À exécuter UNE FOIS dans le MÊME projet Supabase que le tableau de bord
-- enseignant (gejmaxobebsamvfkkpoj) : Dashboard → SQL Editor → New query
-- → coller tout ce fichier → Run.
--
-- Objectif : les codes de licence (ESHORE-2026-UNEN, etc.) ne sont plus
-- codés en dur dans app.js (n'importe qui pouvait les lire via "Afficher
-- la source"). Ils vivent ici, dans une table verrouillée par RLS, et l'app
-- ne peut que demander "est-ce que CE code précis est valide ?" — jamais
-- lister ou lire les codes existants, même avec la clé anon publique.

create table if not exists licences (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sécurité : RLS activée, AUCUNE policy publique sur la table elle-même.
-- Personne (même avec la clé anon de l'app) ne peut lister ou lire les
-- codes directement via l'API REST.
alter table licences enable row level security;

-- Seule façon de vérifier un code depuis l'app : cette fonction, qui ne
-- renvoie qu'un vrai/faux pour le code précis soumis — jamais la liste.
create or replace function verifier_licence(p_code text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from licences
    where code = upper(trim(p_code)) and active = true
  );
$$;

-- Autorise l'app (utilisateurs non authentifiés) à appeler cette fonction.
grant execute on function verifier_licence(text) to anon;

-- ------------------------------------------------------------------
-- Codes existants à migrer (ceux qui étaient en clair dans app.js) —
-- l'ancien code maître interne CHANTIER-2026-MGLG est aussi repris ici
-- pour ne rien casser côté tests internes.
-- ------------------------------------------------------------------
insert into licences (code, label) values
  ('CHANTIER-2026-MGLG', 'Code maître / interne'),
  ('ESHORE-2026-UNEN', 'Eastern Shore (ESSB)')
on conflict (code) do nothing;

-- ------------------------------------------------------------------
-- Opérations courantes, à faire plus tard dans Table Editor ou SQL Editor :
-- ------------------------------------------------------------------

-- Ajouter un nouveau code pour un nouveau client :
-- insert into licences (code, label) values ('NOUVEAU-CODE-XYZ', 'Nom du client');

-- Désactiver un code (ex. fin de contrat) sans le supprimer :
-- update licences set active = false where code = 'ESHORE-2026-UNEN';

-- Réactiver un code :
-- update licences set active = true where code = 'ESHORE-2026-UNEN';

-- Voir tous les codes existants et leur statut :
-- select code, label, active, created_at from licences order by created_at desc;
