<template>
  <div class="popup">

    <!-- Header -->
    <div class="header">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Privacy Guard</span>
      </div>
      <div class="domain">{{ state?.domain || '—' }}</div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-state">
      <div class="spinner"></div>
      <p>Analyse en cours…</p>
    </div>

    <!-- Page système (chrome://, about:) -->
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
        <div class="score-ring" :style="{ '--score-color': scoreColor }">
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
          <div class="score-sub">{{ thirdPartyCount }} requêtes tierces sur {{ state.requests.total }}</div>
        </div>
      </div>

      <!-- Détail pénalités -->
      <div class="section">
        <div class="section-title">Détail</div>
        <div class="penalties">

          <div class="penalty-row" :class="{ active: !state.flags.hasHTTPS }">
            <div class="penalty-icon">🔒</div>
            <div class="penalty-info">
              <span class="penalty-name">HTTPS</span>
              <span class="penalty-status" :class="state.flags.hasHTTPS ? 'ok' : 'bad'">
                {{ state.flags.hasHTTPS ? 'Sécurisé' : '-5 pts' }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: state.requests.trackers.length > 0 }">
            <div class="penalty-icon">📡</div>
            <div class="penalty-info">
              <span class="penalty-name">Trackers</span>
              <span class="penalty-status" :class="state.requests.trackers.length === 0 ? 'ok' : 'bad'">
                {{ state.requests.trackers.length === 0 ? 'Aucun' : `-${trackerDeduction} pts (${state.requests.trackers.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: state.requests.fingerprinters.length > 0 }">
            <div class="penalty-icon">🖐️</div>
            <div class="penalty-info">
              <span class="penalty-name">Fingerprinting</span>
              <span class="penalty-status" :class="state.requests.fingerprinters.length === 0 ? 'ok' : 'bad'">
                {{ state.requests.fingerprinters.length === 0 ? 'Aucun' : `-20 pts (${state.requests.fingerprinters.length})` }}
              </span>
            </div>
          </div>

          <div class="penalty-row" :class="{ active: state.flags.hasThirdPartyCookies }">
            <div class="penalty-icon">🍪</div>
            <div class="penalty-info">
              <span class="penalty-name">Cookies tiers</span>
              <span class="penalty-status" :class="!state.flags.hasThirdPartyCookies ? 'ok' : 'bad'">
                {{ state.flags.hasThirdPartyCookies ? '-10 pts' : 'Aucun' }}
              </span>
            </div>
          </div>

        </div>
      </div>

      <!-- Trackers détaillés -->
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

    <!-- Footer -->
    <div class="footer">ZeddHerald v0.1</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import browser from 'webextension-polyfill'

const state = ref(null)
const loading = ref(true)
const showCdns = ref(false)

const scoreColor = computed(() => {
  if (!state.value) return '#64748b'
  const s = state.value.score
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#f59e0b'
  if (s >= 30) return '#ef4444'
  return '#7f1d1d'
})

const thirdPartyCount = computed(() => state.value?.requests.thirdParty ?? 0)

const trackerDeduction = computed(() => {
  if (!state.value) return 0
  const penalties = [10, 7, 5]
  let total = 0
  state.value.requests.trackers.forEach((_, i) => {
    total += i < 3 ? penalties[i] : 2
  })
  return Math.min(total, 35)
})

function categoryLabel(cat) {
  const labels = {
    analytics: 'Analytics',
    advertising: 'Pub',
    social: 'Social',
    marketing: 'Marketing'
  }
  return labels[cat] ?? cat
}

onMounted(async () => {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) { loading.value = false; return }

    const response = await browser.runtime.sendMessage({
      type: 'GET_STATE',
      tabId: tab.id
    })

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

/* Header */
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

/* États vides */
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

/* Score */
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
.ring-bg {
  fill: none;
  stroke: #1e293b;
  stroke-width: 8;
}
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
.score-number {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}
.score-max {
  font-size: 10px;
  color: #64748b;
}

.score-meta { flex: 1; }
.score-label {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
}
.score-sub {
  font-size: 11px;
  color: #64748b;
}

/* Sections */
.section {
  padding: 10px 16px;
  border-bottom: 1px solid #1e293b;
}
.section-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #475569;
  margin-bottom: 8px;
  font-weight: 600;
}

/* Pénalités */
.penalties { display: flex; flex-direction: column; gap: 4px; }
.penalty-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #1e293b;
  opacity: 0.5;
  transition: opacity 0.2s;
}
.penalty-row.active { opacity: 1; }
.penalty-icon { font-size: 14px; }
.penalty-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.penalty-name { font-size: 12px; }
.penalty-status { font-size: 11px; font-weight: 600; }
.penalty-status.ok { color: #22c55e; }
.penalty-status.bad { color: #ef4444; }

/* Tracker list */
.tracker-list { display: flex; flex-direction: column; gap: 3px; }
.tracker-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  background: #1e293b;
  border-radius: 5px;
}
.tracker-item.neutral { opacity: 0.6; }
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
.tracker-category.advertising { background: #7f1d1d; color: #fecaca; }
.tracker-category.social { background: #14532d; color: #bbf7d0; }
.tracker-category.marketing { background: #713f12; color: #fef3c7; }
.tracker-category.fingerprinting { background: #581c87; color: #e9d5ff; }
.tracker-category.cdn { background: #164e63; color: #a5f3fc; }

/* Collapse CDN */
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

/* Footer */
.footer {
  text-align: center;
  font-size: 10px;
  color: #334155;
  padding: 8px 0 4px;
}
</style>
