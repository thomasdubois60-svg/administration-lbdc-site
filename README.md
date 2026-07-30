# Administration LBDC connectée au site

Cette application charge et modifie directement `data/site-content.json` dans le dépôt `thomasdubois60-svg/lebistrotducoin`.

## Variables Vercel obligatoires

- `ADMIN_PASSWORD`
- `GITHUB_TOKEN` : jeton GitHub fin avec accès au dépôt `lebistrotducoin` et permission **Contents: Read and write**
- `GITHUB_OWNER=thomasdubois60-svg`
- `GITHUB_REPO=lebistrotducoin`
- `GITHUB_BRANCH=main`

Après ajout des variables, redéployer l’application Administration LBDC.
