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
2. Dans Supabase, ouvrir **SQL Editor** et exécuter `supabase/admin-v5.sql` si les tables équivalentes n'existent pas déjà.
3. Dans Vercel, ajouter les variables listées dans `.env.example`.
4. Redéployer le projet.

## Variables indispensables

- `ADMIN_PASSWORD` : mot de passe de l'écran de connexion.
- `AUTH_SECRET` : longue chaîne aléatoire utilisée pour signer la session.
- `GITHUB_TOKEN` : token limité au dépôt `lebistrotducoin` avec `Contents: Read and write`.
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` : accès serveur à Supabase.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` : clés du système de notifications déjà utilisé par le site.

Les noms des tables sont configurables avec les variables `CLUB_MEMBERS_TABLE`, `CLUB_HISTORY_TABLE`, `PROMOTIONS_TABLE` et `PUSH_SUBSCRIPTIONS_TABLE`. Cela permet de raccorder cette administration aux tables déjà présentes sans réécrire le reste du projet.

## Sécurité

Ne jamais placer `GITHUB_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` ou `AUTH_SECRET` dans le code ou dans GitHub. Ils doivent rester uniquement dans les variables d'environnement Vercel.
