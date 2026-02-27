# Privacy Guard Ledger

**Un journal de confidentialité personnel. Pas un bloqueur. Un miroir.**

Développé par [Félix](https://zedd.fr) — [ZEDD](https://zedd.fr)

---

## Pourquoi ce projet existe

La plupart des outils privacy se concentrent sur le blocage. Ils interceptent, filtrent, suppriment. C'est utile, mais ça cache le problème plutôt que de l'exposer.

Privacy Guard Ledger part d'une intention différente : montrer ce qui se passe réellement quand tu navigues. Pas pour te faire peur, pas pour tout bloquer — juste pour savoir. Chaque site que tu visites charge des dizaines de ressources tierces. Des trackers, des pixels publicitaires, des scripts de fingerprinting. Tout ça se passe en arrière-plan, silencieusement, pendant que tu lis ton contenu.

Ce projet, c'est une façon de mettre des chiffres sur ce que tu ressens intuitivement.

---

## Ce que ça fait (v1)

L'extension analyse chaque page que tu visites en temps réel et attribue un score de confidentialité entre 0 et 100.

Le score se calcule à partir de quatre critères :

- Présence de trackers connus (analytics, publicité, social, marketing)
- Scripts de fingerprinting identifiés
- Cookies tiers posés par des domaines externes
- Absence de HTTPS

Le système de pénalités est dégressif : le premier tracker coûte plus cher que le dixième. Un site avec quinze trackers n'est pas forcément pire qu'un site avec trois — c'est nuancé par conception.

| Score | Catégorie |
|-------|-----------|
| 80 — 100 | Clean |
| 60 — 79 | Moderate |
| 30 — 59 | Intrusive |
| 0 — 29 | Aggressive |

Les CDN neutres (Cloudflare, jsDelivr, Fastly, etc.) sont exclus des pénalités. Ce ne sont pas des trackers.

Tout est calculé localement. Aucune donnée ne quitte ton navigateur en v1. Aucun serveur distant, aucune télémétrie, aucun compte.

---

## Ce qui arrive ensuite (v2)

La v2 connectera l'extension à une instance **Nextcloud** auto-hébergée via App Password.

Chaque visite sera envoyée vers un dashboard personnel : score moyen par site, évolution dans le temps, comparaisons, export CSV. Un journal de confidentialité réel, persistant, qui t'appartient entièrement.

L'idée est de garder la philosophie du projet intacte : aucune dépendance à un service externe, aucune donnée chez un tiers. Nextcloud parce que c'est auto-hébergé par définition.

---

## Stack technique

**Extension**
- Manifest V3
- JavaScript ES6
- Vue 3 (popup)
- webextension-polyfill (compatibilité Chrome + Firefox)
- Vite

**Listes de trackers**
- Basées sur [DuckDuckGo Tracker Radar](https://github.com/duckduckgo/tracker-radar)
- Embarquées statiquement dans l'extension
- Mises à jour manuellement à chaque release

---

## Installation locale

```bash
git clone https://github.com/zedd-dev/privacy-guard-ledger
cd privacy-guard-ledger
npm install
npm run build:chrome   # ou build:firefox
```

Charge ensuite `dist/chrome/` dans `chrome://extensions` en mode développeur.

Pour Firefox : `dist/firefox/` via `about:debugging`.

---

## Structure du projet

```
src/
  background/
    service-worker.js     # Détection des requêtes + scoring
  content/
    content-script.js     # Écoute les navigations SPA (pushState)
  popup/
    App.vue               # Interface de la popup
    main.js
    index.html
  lists/
    trackers.json         # Trackers / fingerprinters / CDNs
manifest.chrome.json
manifest.firefox.json
vite.config.js
```

---

## Limites connues de la v1

La détection du fingerprinting repose sur des listes de domaines connus, pas sur une analyse du comportement des scripts. Un site qui implémente son propre fingerprinting maison ne sera pas détecté. C'est documenté comme une limite, pas un oubli.

Les listes de trackers sont statiques. Elles vieillissent. Un script de mise à jour est prévu pour les prochaines releases.

---

## Roadmap

- [x] v1 — Extension standalone, snapshot instantané, Chrome + Firefox
- [ ] v2 — Intégration Nextcloud, historique, dashboard
- [ ] v3 — Détection active du fingerprinting (canvas, WebGL, AudioContext)

---

## Auteur

Félix — développeur fullstack et consultant technique, fondateur de [ZEDD](https://zedd.fr).

ZEDD est une agence de développement web basée à Grenoble, spécialisée en e-commerce, applications sur mesure et infrastructure technique.

---

*Ce projet est personnel. Il n'est pas affilié à Nextcloud, DuckDuckGo, ou aucun autre projet mentionné.*