# Glory Print Service

Service local d'impression pour Glory Solutions.

## Objectifs
- Détecter dynamiquement les imprimantes installées.
- Ne jamais coder un modèle d'imprimante en dur.
- Générer des étiquettes PDF exactement 4 × 6 po (101,6 × 152,4 mm).
- Une page par colis.
- Utiliser CUPS sur Linux/macOS.
- Fournir un PDF de secours lorsque l'impression directe n'est pas disponible.
- Écouter uniquement sur 127.0.0.1.

## Installation
npm install

## Démarrage
npm start

## Tests locaux
curl http://127.0.0.1:17891/health
curl http://127.0.0.1:17891/api/printers

## Origine du site
Pour autoriser le site Glory en production :
GLORY_SITE_ORIGIN=https://VOTRE-DOMAINE npm start

Ne rendez pas le port 17891 accessible publiquement.
