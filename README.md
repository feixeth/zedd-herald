# ZeddHerald

**Un journal de confidentialité personnel. Pas un bloqueur. Un miroir.**

Développé par [Félix](https://zedd.fr) — [ZEDD](https://zedd.fr)

---

## Pourquoi ce projet existe

La plupart des outils privacy se concentrent sur le blocage. Ils interceptent, filtrent, suppriment. C'est utile, mais ça cache le problème plutôt que de l'exposer.

ZeddHerald part d'une intention différente : montrer ce qui se passe réellement quand tu navigues. Pas pour te faire peur, pas pour tout bloquer — juste pour savoir. Chaque site que tu visites charge des dizaines de ressources tierces. Des trackers, des pixels publicitaires, des scripts de fingerprinting. Tout ça se passe en arrière-plan, silencieusement, pendant que tu lis ton contenu.

Ce projet, c'est une façon de mettre des chiffres sur ce que tu ressens intuitivement.

---

## Ce que ça fait (v0.2)

L'extension analyse chaque page que tu visites en temps réel et attribue un score de confidentialité entre 0 et 100.

Le score se calcule à partir de plusieurs critères, pondérés par **impact réel** plutôt que par catégorie technique :

- Trackers publicitaires GAFAM (Google Ads, Amazon Ads, Meta, TikTok, Bing) — pénalité forte
- Scripts de fingerprinting identifiés — pénalité fixe sévère
- Pixels sociaux (Facebook, Instagram, Snap…)
- Trackers pub programmatiques, analytics, marketing / CRM
- Tag managers et leur risque indirect
- Cookies tiers posés par des domaines externes
- Absence de HTTPS
- Réputation du domaine visité — pour les sites qui collectent massivement en first-party (Amazon, Google sur leurs propres pages)

Le système de pénalités est dégressif par catégorie : le premier tracker pub coûte plus cher que le cinquième. Un site avec quinze trackers n'est pas forcément pire qu'un site avec trois — c'est nuancé par conception.

| Score | Catégorie |
|-------|-----------|
| 80 — 100 | Clean |
| 60 — 79 | Moderate |
| 30 — 59 | Intrusive |
| 0 — 29 | Aggressive |

Les CDN neutres (Cloudflare, jsDelivr, Fastly…) sont exclus des pénalités. Les outils de consentement RGPD (Didomi, OneTrust, Axeptio, Cookiebot…) sont identifiés et affichés en informatif, sans pénalité — ce sont des outils de conformité, pas des trackers.

L'extension détecte également le **server-side tagging** (TagCommander SST, GTM Server-Side, Tealium…) et affiche un avertissement lorsque le score pourrait être sous-estimé : certains sites déclenchent leurs trackers côté serveur, invisibles pour le navigateur.

Tout est calculé localement. Aucune donnée ne quitte ton navigateur. Aucun serveur distant, aucune télémétrie, aucun compte.

---

## Scores terrain observés

| Site | Score | Verdict |
|------|-------|---------|
| credit-agricole.fr | 93 | Clean |
| decathlon.com | 85 | Clean |
| carrefour.fr | 83 | Clean |
| spartoo.com | 73 | Moderate |
| cdiscount.com | 58 | Intrusive |
| kiabi.com | 40 | Intrusive |
| feu-vert.fr | 35 | Intrusive |
| king-jouet.com | 16 | Aggressive |
| amazon.com | 0 | Aggressive |

---

## Ce qui arrive ensuite (v0.3 → v1)

La prochaine étape connectera l'extension à une instance **Nextcloud** auto-hébergée via App Password.

Chaque visite sera envoyée vers un dashboard personnel : score moyen par site, évolution dans le temps, comparaisons, export CSV. Un journal de confidentialité réel, persistant, qui t'appartient entièrement.

L'idée est de garder la philosophie du projet intacte : aucune dépendance à un service externe, aucune donnée chez un tiers. Nextcloud parce que c'est auto-hébergé par définition.

---

## Stack technique

**Extension**
- Manifest V3
- Vue 3 (popup)
- webextension-polyfill (compatibilité Chrome + Firefox)
- Vite

**Base de données**
- Basée sur [DuckDuckGo Tracker Radar](https://github.com/duckduckgo/tracker-radar)
- Enrichie manuellement d'acteurs français et européens (Valiuz, Beyable, Commanders Act, AT Internet, Brevo, iAdvize, Probance…)
- Embarquée statiquement dans l'extension
- 416 trackers · 2 594 fingerprinters · 14 TMS · 35 CMP · 1 202 CDN

---

## Installation locale

```bash
git clone https://github.com/zedd-dev/zeddherald
cd zeddherald
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
    trackers.json         # Trackers / fingerprinters / CDNs / CMP / réputation
manifest.chrome.json
manifest.firefox.json
vite.config.js
```

---

## Limites connues

La détection du fingerprinting repose sur des listes de domaines connus, pas sur une analyse comportementale des scripts. Un site qui implémente son propre fingerprinting maison ne sera pas détecté. C'est documenté comme une limite, pas un oubli.

Le server-side tagging est partiellement détectable — l'infrastructure TMS est visible, mais les tags effectivement déclenchés côté serveur restent invisibles. Le score peut donc être sous-estimé sur les sites qui utilisent cette architecture.

Sur Firefox, Enhanced Tracking Protection bloque certaines requêtes avant que l'extension ne les voie. Les scores y sont généralement plus élevés qu'en réalité. Chrome est la référence de calibrage.

Les listes de trackers sont statiques. Elles vieillissent. Une procédure de mise à jour est prévue pour les prochaines releases.

---

## Roadmap

- [x] v0.1 — Extension standalone, scoring de base, Chrome + Firefox
- [x] v0.2 — Scoring intent-based, catégorie GAFAM, CMP, avertissement SST, système de réputation, infobulles explicatives
- [ ] v0.3 — Analyse de fichiers HAR, export rapport PDF
- [ ] v0.4 — Module Nextcloud (historique local, dashboard, tendances)
- [ ] v1.0 — Soumission Firefox Add-ons

---

## Auteur

Félix — développeur fullstack et consultant technique, fondateur de [ZEDD](https://zedd.fr).

ZEDD est une agence de développement web basée à Grenoble, spécialisée en e-commerce, applications sur mesure et infrastructure technique.

---

*Ce projet est personnel. Il n'est pas affilié à Nextcloud, DuckDuckGo, ou aucun autre projet mentionné.*