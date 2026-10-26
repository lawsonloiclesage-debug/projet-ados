# Projet Ados — à héberger soi-même

Serveur Node.js + SQLite. Il sert le site ET l'API : un seul service à mettre en ligne.
Aucun nom n'est stocké, seulement des montants et des dates. Rien ne dépend de Claude.

## 1. Essayer chez toi (2 minutes)
    npm install
    ADMIN_TOKEN=un-mot-de-passe-long npm start
    # ouvrir http://localhost:3000

(Windows PowerShell : `$env:ADMIN_TOKEN="mot-de-passe"; npm start`)

## 2. Mettre en ligne — le plus simple : Render
1. Crée un dépôt GitHub et envoie-y tous les fichiers de ce dossier.
2. Sur render.com : New → **Blueprint** → choisis ton dépôt. Le fichier `render.yaml` fait le reste.
3. Une fois déployé, Render te donne l'adresse du site (https://projet-ados.onrender.com).
4. Ton mot de passe finance : onglet *Environment* → valeur de `ADMIN_TOKEN`.

**Important — la sauvegarde des données.** Sur un hébergeur, le disque est effacé à chaque
redéploiement, sauf si tu ajoutes un *disque persistant*. Chez Render il est payant
(le plan gratuit n'en a pas : la base serait perdue). Même chose chez Railway (Volume) et Fly.io (Volume).
Dans tous les cas, télécharge régulièrement l'export CSV (voir plus bas) comme sauvegarde.

## 3. Autres hébergeurs
- **Railway / Fly.io / Koyeb** : ils lisent le `Dockerfile`. Ajoute un volume monté sur `/data`
  et la variable `ADMIN_TOKEN`.
- **Un petit serveur (VPS)** : `npm install`, puis `ADMIN_TOKEN=... PORT=80 node server.js`
  (garde-le actif avec `pm2` ou `systemd`).
- Un hébergement « statique » (GitHub Pages, Netlify sans fonctions) ne convient PAS : il faut un serveur.

## Variables d'environnement
| Nom | Rôle |
|---|---|
| ADMIN_TOKEN | mot de passe finance (export, suppression). Obligatoire. |
| DB_FILE | chemin du fichier de base (ex. /data/projet-ados.db) |
| PORT | port d'écoute (souvent fourni par l'hébergeur) |

## Ouvrir / fermer les dépôts
Par défaut les dépôts sont **fermés**. Tout le monde voit le site, la cagnotte et le graphique,
mais seul toi peux ouvrir l'enregistrement : en bas de la page, bouton **Ouvrir les dépôts**
(mot de passe `ADMIN_TOKEN`). Le serveur refuse tout dépôt tant que c'est fermé.
En ligne de commande : `curl -X PUT -H "Authorization: Bearer TON_TOKEN" -H "Content-Type: application/json" -d '{"open":true}' https://ton-site/api/status`

## Utiliser les données
- Export Excel : `curl -H "Authorization: Bearer TON_TOKEN" https://ton-site/api/export.csv -o depots.csv`
- Statistiques : `https://ton-site/api/stats` (total, moyenne, max, total par jour)
- Corriger une erreur : `curl -X DELETE -H "Authorization: Bearer TON_TOKEN" https://ton-site/api/deposits/12`
- Ouvrir la base directement : `sqlite3 projet-ados.db "SELECT SUM(montant) FROM deposits"`

## Fichiers
- `server.js` : API + base de données · `public/index.html` : le site (graphique inclus)
- `Dockerfile`, `render.yaml` : déploiement
