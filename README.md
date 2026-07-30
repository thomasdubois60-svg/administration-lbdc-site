# Administration LBDC — Gestion du site internet

Application Next.js conçue pour gérer le contenu du site internet de **Le Bistrot Du Coin**.

## Fonctionnalités de la V1

- Tableau de bord responsive
- Gestion du menu du jour : 3 entrées, 3 plats, 3 desserts et suggestion
- Gestion des horaires d’ouverture
- Modification des coordonnées et du texte de présentation
- Gestion simple de la galerie
- Paramètres de publication
- Sauvegarde locale automatique via le navigateur
- Interface adaptée aux iPhone et ordinateurs

## Installation locale

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Déploiement Vercel

1. Importer ce projet dans un dépôt GitHub.
2. Ouvrir Vercel et choisir **Add New Project**.
3. Importer le dépôt GitHub.
4. Cliquer sur **Deploy**.

Aucune variable d’environnement n’est nécessaire pour cette V1.

## Étape suivante

La V2 connectera l’application à Supabase afin de sécuriser la connexion, centraliser les données et synchroniser automatiquement les modifications avec le véritable site internet.
