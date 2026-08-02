# Administration LBDC V5 — version optimale

Cette version reprend directement la V4 déjà en place. Elle conserve la gestion du contenu réel du site via `data/site-content.json` et ajoute les fonctions professionnelles demandées.

## Fonctions ajoutées

- connexion sécurisée par cookie HttpOnly signé ;
- déconnexion réelle et session de 12 heures ;
- ordre des catégories et des produits avec les boutons Monter / Descendre ;
- scanner QR code Club LBDC avec recherche manuelle de secours ;
- ajout ou retrait de passages, validation d'une récompense et historique Supabase ;
- création, activation et désactivation des promotions ;
- tableau de bord membres, passages, récompenses, promotions et abonnés push ;
- centre de notifications push clients ;
- conservation de la carte, du menu du jour, des événements, des photos, de la galerie, de la privatisation, de l'histoire et des réseaux déjà présents dans la V4.

## Installation

1. Remplacer le contenu du dépôt `administration-lbdc-site` par le contenu de ce dossier.
2. Dans Supabase, ouvrir **SQL Editor** et exécuter intégralement `supabase/admin-v5.sql`, même si les tables existent déjà. La migration est idempotente : elle répare les colonnes manquantes sans supprimer les données.
3. Dans Vercel, ajouter les variables listées dans `.env.example`.
4. Redéployer le projet.

## Variables indispensables

- `EMPLOYEE_USERNAME` et `EMPLOYEE_PASSWORD` : compte Employé (tableau de bord et opérations Club LBDC).
- `FIDELITY_USERNAME` et `FIDELITY_PASSWORD` : compte Fidélité indépendant, limité au scanner et aux fiches membres.
- `MANAGER_USERNAME` et `MANAGER_PASSWORD` : compte Responsable (gestion et publication du contenu, Club et promotions).
- `ADMIN_USERNAME` et `ADMIN_PASSWORD` : compte Administrateur (accès complet, dont les notifications).
- `AUTH_SECRET` : longue chaîne aléatoire utilisée pour signer la session.
- `GITHUB_TOKEN` : token limité au dépôt `lebistrotducoin` avec `Contents: Read and write`.
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` : accès serveur à Supabase.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` : clés du système de notifications déjà utilisé par le site.
- `VAPID_SUBJECT` : identité VAPID, identique à celle du site public.
- `PUBLIC_SITE_URL` : URL du site public utilisée pour confirmer que le contenu publié est réellement relu (`https://lebistrotducoin.vercel.app` par défaut).

Le projet Vercel du site public doit rester connecté à la branche `main` du dépôt `lebistrotducoin`. Chaque mise à jour de `data/site-content.json` déclenche ainsi un seul déploiement Git Vercel. L’administration ne lance pas un second déploiement par webhook.

Les noms des tables Club sont configurables avec les variables `CLUB_MEMBERS_TABLE`, `CLUB_HISTORY_TABLE` et `PROMOTIONS_TABLE`. Les notifications utilisent toujours la table existante `push_subscriptions` afin de conserver les abonnements du site public.

Les identifiants prennent par défaut les valeurs `fidelite`, `employe`, `responsable` et `administrateur` si les variables `*_USERNAME` sont omises. Les quatre mots de passe doivent être différents et rester uniquement dans les variables d'environnement Vercel.

Le seuil d'une récompense se règle avec `LOYALTY_STAMPS_REQUIRED` (10 par défaut) et son libellé avec `LOYALTY_REWARD_LABEL`. Le Club conserve le schéma historique du site public : `club_members.personal_code`, `club_members.loyalty_points`, `club_members.reward_available`, `club_loyalty_events` et `club_promotion_coupons`. Les anciennes données restent prioritaires; les colonnes de compatibilité `code`, `stamps`, `visits`, `rewards_count` et `coupons_available` sont recalculées depuis cet historique et ne remettent jamais la fidélité à zéro.

## Sécurité

Ne jamais placer `GITHUB_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` ou `AUTH_SECRET` dans le code ou dans GitHub. Ils doivent rester uniquement dans les variables d'environnement Vercel.
