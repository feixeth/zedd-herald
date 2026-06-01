<template>
  <div class="popup">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>ZeddHerald</span>
      </div>
      <div class="domain">{{ state?.domain || '—' }}</div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-state">
      <div class="spinner"></div>
      <p>Analyse en cours…</p>
    </div>

    <!-- Page système -->
    <div v-else-if="!state" class="center-state">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>Page système non analysable</p>
    </div>

    <!-- Résultats -->
    <template v-else>
      <!-- Score principal -->
      <div class="score-section">
        <div class="score-ring">
          <svg viewBox="0 0 100 100" class="ring-svg">
            <circle cx="50" cy="50" r="40" class="ring-bg"/>
            <circle
              cx="50" cy="50" r="40"
              class="ring-progress"
              :style="{
                strokeDasharray: `${2 * Math.PI * 40}`,
                strokeDashoffset: `${2 * Math.PI * 40 * (1 - state.score / 100)}`,
                stroke: scoreColor
              }"
            />
          </svg>
          <div class="score-inner">
            <span class="score-number">{{ state.score }}</span>
            <span class="score-max">/100</span>
          </div>
        </div>
        <div class="score-meta">
          <div class="score-label" :style="{ color: scoreColor }">{{ state.label }}</div>
          <div class="score-sub">{{ state.requests.thirdParty }} domaines tiers / {{ state.requests.total }} req.</div>
          <div class="score-disclaimer"><em>Un indicateur, pas une certitude.</em></div>
          <!-- Server-side tagging warning -->
          <div v-if="state.sstWarning" class="sst-badge" @mouseenter="showSstTooltip = true" @mouseleave="showSstTooltip = false">
            <span class="sst-icon">🔀</span>
            <span class="sst-label">Tracking server-side détecté</span>
            <div v-if="showSstTooltip" class="sst-tooltip">
              <strong>{{ state.sstWarning }}</strong> a été détecté sur ce site.<br><br>
              Ce type d'outil déclenche des trackers côté serveur (Google Analytics, pixels pub, Criteo…) de façon invisible pour le navigateur. Le score affiché peut être <strong>sous-estimé</strong> : la réalité privacy est probablement moins bonne.
            </div>
          </div>

          <!-- Réputation -->
          <div v-if="state.reputation" class="reputation-badge" @mouseenter="showRepTooltip = true" @mouseleave="showRepTooltip = false">
            <span class="rep-icon">⚠️</span>
            <span class="rep-label">Réputation surveillée −{{ state.reputation.penalty }} pts</span>
            <div v-if="showRepTooltip" class="rep-tooltip">{{ state.reputation.reason }}</div>
          </div>
          <div v-if="state.requests.trackers.length > 0" class="score-breakdown">
            <span v-if="trackersByCategory.advertising_major?.length" class="breakdown-chip advertising_major">
              {{ trackersByCategory.advertising_major.length }} GAFAM
            </span>
            <span v-if="trackersByCategory.advertising.length" class="breakdown-chip advertising">
              {{ trackersByCategory.advertising.length }} pub
            </span>
            <span v-if="trackersByCategory.social.length" class="breakdown-chip social">
              {{ trackersByCategory.social.length }} social
            </span>
            <span v-if="trackersByCategory.analytics.length" class="breakdown-chip analytics">
              {{ trackersByCategory.analytics.length }} analytics
            </span>
            <span v-if="trackersByCategory.marketing.length" class="breakdown-chip marketing">
              {{ trackersByCategory.marketing.length }} CRM
            </span>
          </div>
        </div>
      </div>

      <!-- Détail pénalités -->
      <div class="section">
        <div class="section-title">Détail du score</div>
        <div class="penalties">

          <div v-if="state.reputation" class="penalty-row active reputation-row">
            <div class="penalty-icon">⚠️</div>
            <div class="penalty-info">
              <span class="penalty-name">Réputation (first-party)</span>
              <span class="penalty-status bad">−{{ state.reputation.penalty }} pts</span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: !state.flags.hasHTTPS }">
            <div class="penalty-icon">🔒</div>
            <div class="penalty-info">
              <span class="penalty-name">
                HTTPS
                <span class="info-btn" @mouseenter="showInfo('https')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'https'" class="info-tooltip">{{ INFO['https'] }}</div>
              </span>
              <span class="penalty-status" :class="state.flags.hasHTTPS ? 'ok' : 'bad'">
                {{ state.flags.hasHTTPS ? 'Sécurisé' : '-5 pts' }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: state.requests.fingerprinters.length > 0 }">
            <div class="penalty-icon">🖐️</div>
            <div class="penalty-info">
              <span class="penalty-name">
                Fingerprinting
                <span class="info-btn" @mouseenter="showInfo('fp')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'fp'" class="info-tooltip">{{ INFO['fp'] }}</div>
              </span>
              <span class="penalty-status" :class="state.requests.fingerprinters.length === 0 ? 'ok' : 'bad'">
                {{ state.requests.fingerprinters.length === 0 ? 'Aucun' : `-25 pts (${state.requests.fingerprinters.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: (trackersByCategory.advertising_major?.length ?? 0) > 0 }">
            <div class="penalty-icon">⚠️</div>
            <div class="penalty-info">
              <span class="penalty-name">
                GAFAM publicitaires
                <span class="info-btn" @mouseenter="showInfo('gafam')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'gafam'" class="info-tooltip">{{ INFO['gafam'] }}</div>
              </span>
              <span class="penalty-status" :class="(trackersByCategory.advertising_major?.length ?? 0) === 0 ? 'ok' : 'bad'">
                {{ (trackersByCategory.advertising_major?.length ?? 0) === 0 ? 'Aucun' : `-${state.breakdown.advMajor} pts (${trackersByCategory.advertising_major.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: trackersByCategory.advertising.length > 0 }">
            <div class="penalty-icon">📢</div>
            <div class="penalty-info">
              <span class="penalty-name">
                Trackers pub
                <span class="info-btn" @mouseenter="showInfo('adv')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'adv'" class="info-tooltip">{{ INFO['adv'] }}</div>
              </span>
              <span class="penalty-status" :class="trackersByCategory.advertising.length === 0 ? 'ok' : 'bad'">
                {{ trackersByCategory.advertising.length === 0 ? 'Aucun' : `-${state.breakdown.advertising} pts (${trackersByCategory.advertising.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: trackersByCategory.social.length > 0 }">
            <div class="penalty-icon">👥</div>
            <div class="penalty-info">
              <span class="penalty-name">
                Pixels sociaux
                <span class="info-btn" @mouseenter="showInfo('social')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'social'" class="info-tooltip">{{ INFO['social'] }}</div>
              </span>
              <span class="penalty-status" :class="trackersByCategory.social.length === 0 ? 'ok' : 'bad'">
                {{ trackersByCategory.social.length === 0 ? 'Aucun' : `-${state.breakdown.social} pts (${trackersByCategory.social.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: trackersByCategory.analytics.length > 0 }">
            <div class="penalty-icon">📊</div>
            <div class="penalty-info">
              <span class="penalty-name">
                Analytics
                <span class="info-btn" @mouseenter="showInfo('analytics')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'analytics'" class="info-tooltip">{{ INFO['analytics'] }}</div>
              </span>
              <span class="penalty-status" :class="trackersByCategory.analytics.length === 0 ? 'ok' : 'warn'">
                {{ trackersByCategory.analytics.length === 0 ? 'Aucun' : `-${state.breakdown.analytics} pts (${trackersByCategory.analytics.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: trackersByCategory.marketing.length > 0 }">
            <div class="penalty-icon">📧</div>
            <div class="penalty-info">
              <span class="penalty-name">
                Marketing / CRM
                <span class="info-btn" @mouseenter="showInfo('crm')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'crm'" class="info-tooltip">{{ INFO['crm'] }}</div>
              </span>
              <span class="penalty-status" :class="trackersByCategory.marketing.length === 0 ? 'ok' : 'warn'">
                {{ trackersByCategory.marketing.length === 0 ? 'Aucun' : `-${state.breakdown.marketing} pts (${trackersByCategory.marketing.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: (state.requests.tagManagers || []).length > 0 }">
            <div class="penalty-icon">🏷️</div>
            <div class="penalty-info">
              <span class="penalty-name">
                Tag managers
                <span class="info-btn" @mouseenter="showInfo('tms')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'tms'" class="info-tooltip">{{ INFO['tms'] }}</div>
              </span>
              <span class="penalty-status" :class="(state.requests.tagManagers || []).length === 0 ? 'ok' : 'warn'">
                {{ (state.requests.tagManagers || []).length === 0 ? 'Aucun' : `-${state.breakdown.tagManagers} pts (${state.requests.tagManagers.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: state.flags.hasThirdPartyCookies }">
            <div class="penalty-icon">🍪</div>
            <div class="penalty-info">
              <span class="penalty-name">
                Cookies tiers
                <span class="info-btn" @mouseenter="showInfo('cookies')" @mouseleave="activeInfo = null">ℹ</span>
                <div v-if="activeInfo === 'cookies'" class="info-tooltip">{{ INFO['cookies'] }}</div>
              </span>
              <span class="penalty-status" :class="!state.flags.hasThirdPartyCookies ? 'ok' : 'bad'">
                {{ state.flags.hasThirdPartyCookies ? '-8 pts' : 'Aucun' }}
              </span>
            </div>
          </div>

          <!-- CMP : neutre, informatif -->
          <div v-if="(state.requests.cmps || []).length > 0" class="penalty-row active cmp-row">
            <div class="penalty-icon">✅</div>
            <div class="penalty-info">
              <span class="penalty-name">Consentement (CMP)</span>
              <span class="penalty-status cmp">{{ state.requests.cmps.length }} détecté{{ state.requests.cmps.length > 1 ? 's' : '' }}</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Trackers par catégorie -->
      <div v-if="state.requests.trackers.length > 0" class="section">
        <div class="section-title">Trackers détectés</div>
        <div class="tracker-list">
          <div v-for="tracker in state.requests.trackers" :key="tracker.domain" class="tracker-item">
            <span class="tracker-domain">{{ tracker.domain }}</span>
            <span class="tracker-category" :class="tracker.category">{{ categoryLabel(tracker.category) }}</span>
          </div>
        </div>
      </div>

      <!-- Fingerprinters -->
      <div v-if="state.requests.fingerprinters.length > 0" class="section">
        <div class="section-title">Fingerprinting détecté</div>
        <div class="tracker-list">
          <div v-for="domain in state.requests.fingerprinters" :key="domain" class="tracker-item">
            <span class="tracker-domain">{{ domain }}</span>
            <span class="tracker-category fingerprinting">Fingerprint</span>
          </div>
        </div>
      </div>

      <!-- Tag managers -->
      <div v-if="(state.requests.tagManagers || []).length > 0" class="section">
        <div class="section-title">Tag managers</div>
        <div class="tracker-list">
          <div v-for="domain in state.requests.tagManagers" :key="domain" class="tracker-item">
            <span class="tracker-domain">{{ domain }}</span>
            <span class="tracker-category tag_manager">TMS</span>
          </div>
        </div>
      </div>

      <!-- CMPs (repliables, ton neutre) -->
      <div v-if="(state.requests.cmps || []).length > 0" class="section">
        <button class="collapse-btn" @click="showCmps = !showCmps">
          Outils de consentement ({{ state.requests.cmps.length }})
          <span>{{ showCmps ? '▲' : '▼' }}</span>
        </button>
        <div v-if="showCmps" class="tracker-list">
          <div v-for="domain in state.requests.cmps" :key="domain" class="tracker-item cmp-item">
            <span class="tracker-domain">{{ domain }}</span>
            <span class="tracker-category cmp-badge">CMP</span>
          </div>
        </div>
      </div>

      <!-- CDNs (repliables) -->
      <div v-if="state.requests.cdns.length > 0" class="section">
        <button class="collapse-btn" @click="showCdns = !showCdns">
          CDN neutres ({{ state.requests.cdns.length }})
          <span>{{ showCdns ? '▲' : '▼' }}</span>
        </button>
        <div v-if="showCdns" class="tracker-list">
          <div v-for="domain in state.requests.cdns" :key="domain" class="tracker-item neutral">
            <span class="tracker-domain">{{ domain }}</span>
            <span class="tracker-category cdn">CDN</span>
          </div>
        </div>
      </div>

    </template>

    <div class="footer">ZeddHerald v1.1</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import browser from 'webextension-polyfill'

const state = ref(null)
const loading = ref(true)
const showCdns = ref(false)
const showCmps = ref(false)
const activeInfo = ref(null)
function showInfo(key) {
  activeInfo.value = key
}

const INFO = {
  https:      "Le protocole HTTPS chiffre les échanges entre votre navigateur et le site. Sans HTTPS, vos données transitent en clair sur le réseau.",
  fp:         "Le fingerprinting identifie votre navigateur de façon unique sans cookie, via des caractéristiques techniques (GPU, polices, résolution…). Très difficile à bloquer.",
  gafam:      "Pixels publicitaires des grandes plateformes (Google Ads, Amazon Ads, Meta, TikTok, Bing). Pénalité forte car ces acteurs croisent vos données avec des milliards d'autres profils.",
  adv:        "Trackers de réseaux publicitaires programmatiques : ils suivent vos visites sur des milliers de sites pour vous cibler avec des publicités.",
  social:     "Pixels des réseaux sociaux (Facebook, Instagram, LinkedIn…). Même sans compte, ils trackent votre navigation et l'associent à votre profil si vous êtes connecté.",
  analytics:  "Scripts de mesure d'audience : ils analysent votre comportement sur le site (pages vues, durée, clics). Moins intrusifs que la pub, mais transmettent vos données à des tiers.",
  crm:        "Outils de marketing automation et CRM : ils tracent vos interactions pour déclencher des emails ciblés ou construire un profil commercial.",
  tms:        "Les tag managers (GTM, TagCommander…) sont des orchestrateurs : ils peuvent charger n'importe quel tracker. Pénalité modérée car l'impact dépend de ce qu'ils déclenchent.",
  cookies:    "Des domaines tiers ont déposé des cookies sur votre navigateur. Ces cookies peuvent tracer votre navigation sur d'autres sites.",
}
const showRepTooltip = ref(false)
const showSstTooltip = ref(false)

const scoreColor = computed(() => {
  if (!state.value) return '#64748b'
  const s = state.value.score
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#f59e0b'
  if (s >= 30) return '#ef4444'
  return '#7f1d1d'
})

const trackersByCategory = computed(() => {
  const out = { advertising_major: [], advertising: [], social: [], analytics: [], marketing: [], other: [] }
  if (!state.value) return out
  for (const t of state.value.requests.trackers) {
    if (out[t.category]) out[t.category].push(t)
    else out.other.push(t)
  }
  return out
})


function categoryLabel(cat) {
  return { analytics: 'Analytics', advertising: 'Pub', advertising_major: 'GAFAM', social: 'Social', marketing: 'CRM' }[cat] ?? cat
}

onMounted(async () => {
  let currentTabId = null

  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'STATE_UPDATE' && message.tabId === currentTabId) {
      state.value = message.state
    }
  })

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) { loading.value = false; return }
    currentTabId = tab.id
    const response = await browser.runtime.sendMessage({ type: 'GET_STATE', tabId: tab.id })
    state.value = response
  } catch (e) {
    console.error('Popup error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.popup {
  padding: 0 0 8px;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 200px;
}
.header {
  padding: 12px 16px 10px;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.logo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: #94a3b8;
}
.domain {
  font-size: 12px;
  color: #64748b;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px 16px;
  color: #64748b;
  font-size: 13px;
}
.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #1e293b;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.score-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #1e293b;
}
.score-ring {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}
.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg { fill: none; stroke: #1e293b; stroke-width: 8; }
.ring-progress {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.5s ease;
}
.score-inner {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.score-number { font-size: 22px; font-weight: 700; line-height: 1; }
.score-max { font-size: 10px; color: #64748b; }
.score-meta { flex: 1; }
.score-label { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.score-sub { font-size: 11px; color: #64748b; margin-bottom: 4px; }
.score-disclaimer { font-size: 9px; color: #334155; letter-spacing: 0.03em; font-style: italic; margin-bottom: 6px; }
.score-breakdown { display: flex; flex-wrap: wrap; gap: 4px; }
.breakdown-chip {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  text-transform: uppercase;
}
.breakdown-chip.advertising_major { background: #450a0a; color: #fca5a5; border: 1px solid #7f1d1d; }
.breakdown-chip.advertising { background: #7f1d1d; color: #fecaca; }
.breakdown-chip.social { background: #14532d; color: #bbf7d0; }
.breakdown-chip.analytics { background: #1d4ed8; color: #bfdbfe; }
.breakdown-chip.marketing { background: #713f12; color: #fef3c7; }

.section {
  padding: 10px 16px;
  border-bottom: 1px solid #1e293b;
  overflow: visible;
}
.section-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
  margin-bottom: 8px;
  font-weight: 600;
}
.penalties { display: flex; flex-direction: column; gap: 4px; overflow: visible; }
.penalty-row {
  overflow: visible;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #1e293b;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.penalty-row.active { opacity: 1; }
.penalty-row.cmp-row { border: 1px solid #0e4a6a; background: #0c2340; }
.penalty-icon { font-size: 14px; }
.penalty-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  overflow: visible;
}
.penalty-name {
  font-size: 12px;
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
}
.info-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: #1e3a5f;
  color: #60a5fa;
  font-size: 8px;
  cursor: help;
  flex-shrink: 0;
  border: 1px solid #2a4a7f;
  transition: background 0.15s;
  font-family: serif;
  font-style: italic;
}
.info-btn:hover { background: #2a4a7f; }
.info-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 230px;
  background: #1e293b;
  border: 1px solid #3d7aed;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11px;
  color: #cbd5e1;
  line-height: 1.6;
  z-index: 9999;
  pointer-events: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.8);
  font-weight: 400;
  opacity: 1 !important;
}
.penalty-status { font-size: 11px; font-weight: 600; }
.penalty-status.ok { color: #22c55e; }
.penalty-status.bad { color: #ef4444; }
.penalty-status.warn { color: #f59e0b; }
.penalty-status.cmp { color: #38bdf8; }

.tracker-list { display: flex; flex-direction: column; gap: 3px; }
.tracker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  background: #1e293b;
  border-radius: 5px;
}
.tracker-item.neutral { opacity: 0.5; }
.tracker-item.cmp-item { background: #0c2340; border: 1px solid #0e4a6a; }
.tracker-domain { font-size: 11px; color: #94a3b8; }
.tracker-category {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 10px;
}
.tracker-category.analytics { background: #1d4ed8; color: #bfdbfe; }
.tracker-category.advertising_major { background: #450a0a; color: #fca5a5; border: 1px solid #7f1d1d; }
.tracker-category.advertising { background: #7f1d1d; color: #fecaca; }
.tracker-category.social { background: #14532d; color: #bbf7d0; }
.tracker-category.marketing { background: #713f12; color: #fef3c7; }
.tracker-category.fingerprinting { background: #581c87; color: #e9d5ff; }
.tracker-category.tag_manager { background: #1e3a5f; color: #93c5fd; }
.tracker-category.cdn { background: #164e63; color: #a5f3fc; }
.tracker-category.cmp-badge { background: #0e4a6a; color: #38bdf8; }

.collapse-btn {
  width: 100%;
  background: none;
  border: none;
  color: #64748b;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  padding: 0;
  margin-bottom: 6px;
}
.collapse-btn:hover { color: #94a3b8; }
.footer {
  text-align: center;
  font-size: 10px;
  color: #334155;
  padding: 8px 0 4px;
}
</style>