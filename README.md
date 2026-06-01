# ZeddHerald

**Un journal de confidentialité personnel. Pas un bloqueur. Un miroir.**

Développé par Félix De Gaudenzi — [ZEDD](https://zedd.fr)

---

## Pourquoi ce projet existe

La plupart des outils privacy se concentrent sur le blocage. Ils interceptent, filtrent, suppriment. C'est utile, mais ça cache le problème plutôt que de l'exposer.

ZeddHerald part d'une intention différente : montrer ce qui se passe réellement quand tu navigues. Pas pour te faire peur, pas pour tout bloquer — juste pour savoir. Chaque site que tu visites charge des dizaines de ressources tierces. Des trackers, des pixels publicitaires, des scripts de fingerprinting. Tout ça se passe en arrière-plan, silencieusement, pendant que tu lis ton contenu.

Ce projet, c'est une façon de mettre des chiffres sur ce que tu ressens intuitivement.

---

## Ce que ça fait (v1.1)

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

## Ce qui arrive ensuite (v1.2 → v2.0)

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
- 417 trackers · 2 587 fingerprinters · 14 TMS · 35 CMP · 1 202 CDN

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

- [x] v1 — Extension standalone, scoring de base, Chrome + Firefox
- [x] v1.1 — Scoring intent-based, catégorie GAFAM, CMP, avertissement SST, système de réputation, infobulles explicatives
- [ ] v1.2 — Analyse de fichiers HAR, export rapport PDF
- [ ] v2.0 — Module Nextcloud (historique local, dashboard, tendances)

---

## Auteur

Félix — développeur fullstack et consultant technique de [ZEDD](https://zedd.fr).

ZEDD est une agence de développement web basée à Grenoble, spécialisée en e-commerce, applications sur mesure et infrastructure technique.

---

*Ce projet est personnel. Il n'est pas affilié à Nextcloud, DuckDuckGo, ou aucun autre projet mentionné.*


------------------------------------------------------------------------------------------------------------------------

# ZeddHerald — English

**A personal privacy journal. Not a blocker. A mirror.**

Developed by Félix De Gaudenzi — [ZEDD](https://zedd.fr)

---

## Why this project exists

Most privacy tools focus on blocking. They intercept, filter, and remove. That's useful, but it hides the problem rather than exposing it.

ZeddHerald was built with a different intention: showing what actually happens when you browse the web. Not to scare you, not to block everything — simply to know. Every website you visit loads dozens of third-party resources. Trackers, advertising pixels, fingerprinting scripts. All of this happens silently in the background while you're reading content.

This project is a way to put numbers on something you already intuitively feel.

---

## What it does (v1.1)

The extension analyzes every page you visit in real time and assigns a privacy score between 0 and 100.

The score is calculated using several criteria weighted by **actual impact** rather than technical categories:

- Big Tech advertising trackers (Google Ads, Amazon Ads, Meta, TikTok, Bing) — heavy penalty
- Identified fingerprinting scripts — severe fixed penalty
- Social media pixels (Facebook, Instagram, Snapchat, etc.)
- Programmatic advertising, analytics, marketing, and CRM trackers
- Tag managers and their indirect privacy risk
- Third-party cookies set by external domains
- Missing HTTPS
- Domain reputation — for websites that heavily collect first-party data (Amazon, Google on their own properties)

The penalty system is progressive by category: the first advertising tracker costs more than the fifth. A website with fifteen trackers is not necessarily worse than a website with three — the model is intentionally nuanced.

| Score | Category |
| ------- | ----------- |
| 80 — 100 | Clean |
| 60 — 79 | Moderate |
| 30 — 59 | Intrusive |
| 0 — 29 | Aggressive |

Neutral CDNs (Cloudflare, jsDelivr, Fastly, etc.) are excluded from penalties. GDPR consent platforms (Didomi, OneTrust, Axeptio, Cookiebot, etc.) are identified and displayed for informational purposes only, without penalties — they are compliance tools, not trackers.

The extension also detects **server-side tagging** (TagCommander SST, GTM Server-Side, Tealium, etc.) and displays a warning when the score may be underestimated. Some websites trigger trackers server-side, making them invisible to the browser.

Everything is calculated locally. No data leaves your browser. No remote servers, no telemetry, no accounts.

---

## Real-world scores observed

| Website | Score | Verdict |
| ------- | ------- | ------- |
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

## What's next (v1.2 → v2.0)

The next step will connect the extension to a self-hosted **Nextcloud** instance using an App Password.

Each visit will be sent to a personal dashboard: average score per website, historical evolution, comparisons, CSV exports, and more. A real privacy journal that remains entirely under your control.

The goal is to preserve the project's philosophy: no dependency on external services and no data stored by third parties. Nextcloud was chosen because self-hosting is part of its DNA.

---

## Technical stack

**Extension**
- Manifest V3
- Vue 3 (popup)
- webextension-polyfill (Chrome + Firefox compatibility)
- Vite

**Database**
- Based on DuckDuckGo Tracker Radar
- Manually enriched with French and European actors (Valiuz, Beyable, Commanders Act, AT Internet, Brevo, iAdvize, Probance, etc.)
- Embedded statically within the extension
- 417 trackers · 2,587 fingerprinters · 14 TMS · 35 CMP · 1,202 CDNs

---

## Local installation

```bash
git clone https://github.com/zedd-dev/zeddherald
cd zeddherald
npm install
npm run build:chrome   # or build:firefox
```

Then load `dist/chrome/` in `chrome://extensions` using Developer Mode.

For Firefox: load `dist/firefox/` via `about:debugging`.

---

## Project structure

```text
src/
  background/
    service-worker.js     # Request detection + scoring
  content/
    content-script.js     # SPA navigation listener (pushState)
  popup/
    App.vue               # Popup interface
    main.js
    index.html
  lists/
    trackers.json         # Trackers / fingerprinters / CDNs / CMP / reputation
manifest.chrome.json
manifest.firefox.json
vite.config.js
```

---

## Known limitations

Fingerprinting detection relies on known-domain lists rather than behavioral script analysis. A website implementing its own custom fingerprinting solution may not be detected. This is documented as a limitation, not an oversight.

Server-side tagging is only partially detectable. The TMS infrastructure can be identified, but the actual tags executed server-side remain invisible. Scores may therefore be underestimated on websites using this architecture.

On Firefox, Enhanced Tracking Protection blocks certain requests before the extension can observe them. Scores are generally higher than reality. Chrome is used as the calibration reference.

Tracker lists are static and age over time. An update procedure is planned for future releases.

---

## Roadmap

- [x] v1 — Standalone extension, basic scoring, Chrome + Firefox
- [x] v1.1 — Intent-based scoring, Big Tech category, CMP detection, SST warning, reputation system, explanatory tooltips
- [ ] v1.2 — HAR file analysis, PDF report export
- [ ] v2.0 — Nextcloud module (local history, dashboard, trends)

---

## Author

Félix — Full-stack developer and technical consultant at [ZEDD](https://zedd.fr).

ZEDD is a web development agency based in Grenoble, France, specializing in e-commerce, custom applications, and technical infrastructure.

---

*This project is personal. It is not affiliated with Nextcloud, DuckDuckGo, or any other project mentioned above.*