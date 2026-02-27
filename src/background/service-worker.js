import browser from 'webextension-polyfill'
import trackerList from '../lists/trackers.json'

const tabStates = new Map()

function createFreshState(domain) {
  return {
    domain,
    score: 100,
    requests: { total: 0, thirdParty: 0, trackers: [], fingerprinters: [], cdns: [], unknown: [] },
    flags: { hasHTTPS: true, hasThirdPartyCookies: false }
  }
}

function getRootDomain(hostname) {
  if (!hostname) return null
  const parts = hostname.replace(/^www\./, '').split('.')
  if (parts.length <= 2) return parts.join('.')
  const twoPartTlds = ['co.uk', 'com.au', 'com.br', 'co.jp', 'org.uk', 'net.au']
  if (twoPartTlds.includes(parts.slice(-2).join('.'))) return parts.slice(-3).join('.')
  return parts.slice(-2).join('.')
}

function extractHostname(url) {
  try { return new URL(url).hostname } catch { return null }
}

function classifyDomain(domain) {
  const root = getRootDomain(domain)
  for (const c of [domain, root]) {
    if (!c) continue
    if (trackerList.fingerprinters[c]) return { type: 'fingerprinter' }
    if (trackerList.cdns[c]) return { type: 'cdn' }
    if (trackerList.trackers[c]) return { type: 'tracker', category: trackerList.trackers[c] }
  }
  return { type: 'unknown' }
}

function calculateScore(state) {
  let score = 100
  if (!state.flags.hasHTTPS) score -= 5
  if (state.flags.hasThirdPartyCookies) score -= 10
  if (state.requests.fingerprinters.length > 0) score -= 20
  const penalties = [10, 7, 5]
  let ded = 0
  state.requests.trackers.forEach((_, i) => { ded += i < 3 ? penalties[i] : 2 })
  score -= Math.min(ded, 35)
  return Math.max(0, score)
}

function getScoreLabel(score) {
  if (score >= 80) return 'Clean'
  if (score >= 60) return 'Moderate'
  if (score >= 30) return 'Intrusive'
  return 'Aggressive'
}

function getScoreColor(score) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#f59e0b'
  if (score >= 30) return '#ef4444'
  return '#991b1b'
}

async function updateBadge(tabId, score) {
  try {
    await browser.action.setBadgeText({ text: String(score), tabId })
    await browser.action.setBadgeBackgroundColor({ color: getScoreColor(score), tabId })
  } catch (e) { /* onglet fermé */ }
}

function isSystemUrl(url) {
  if (!url) return true
  return ['chrome://', 'chrome-extension://', 'moz-extension://', 'about:', 'edge://'].some(p => url.startsWith(p))
}

function initTab(tabId, url) {
  if (isSystemUrl(url)) { tabStates.delete(tabId); return false }
  const hostname = extractHostname(url)
  if (!hostname) return false
  const domain = getRootDomain(hostname)
  const state = createFreshState(domain)
  state.flags.hasHTTPS = url.startsWith('https://')
  tabStates.set(tabId, state)
  console.log(`[PGL] ✓ Init tab ${tabId} → ${domain}`)
  updateBadge(tabId, 100)
  return true
}

// ── Navigation : webNavigation est plus fiable que tabs.onUpdated ─────────────
browser.webNavigation.onCommitted.addListener((details) => {
  // frameId 0 = frame principale uniquement, on ignore les iframes
  if (details.frameId !== 0) return
  console.log(`[PGL] onCommitted tab=${details.tabId} url=${details.url}`)
  initTab(details.tabId, details.url)
})

// ── Requêtes tierces ──────────────────────────────────────────────────────────
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { tabId, url } = details
    if (tabId < 0) return
    const state = tabStates.get(tabId)
    if (!state) return

    const hostname = extractHostname(url)
    if (!hostname) return
    const requestRoot = getRootDomain(hostname)
    state.requests.total++
    if (requestRoot === state.domain) return

    state.requests.thirdParty++
    const allTracked = [
      ...state.requests.trackers.map(t => t.domain),
      ...state.requests.fingerprinters,
      ...state.requests.cdns,
      ...state.requests.unknown
    ]
    if (allTracked.includes(requestRoot)) return

    const c = classifyDomain(requestRoot)
    if (c.type === 'tracker') state.requests.trackers.push({ domain: requestRoot, category: c.category })
    else if (c.type === 'fingerprinter') state.requests.fingerprinters.push(requestRoot)
    else if (c.type === 'cdn') state.requests.cdns.push(requestRoot)
    else state.requests.unknown.push(requestRoot)

    state.score = calculateScore(state)
    updateBadge(tabId, state.score)
  },
  { urls: ['<all_urls>'] }
)

// ── Cookies tiers ─────────────────────────────────────────────────────────────
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    const { tabId, responseHeaders } = details
    if (tabId < 0 || !responseHeaders) return
    const state = tabStates.get(tabId)
    if (!state) return
    const reqRoot = getRootDomain(extractHostname(details.url))
    if (reqRoot === state.domain) return
    if (responseHeaders.some(h => h.name.toLowerCase() === 'set-cookie') && !state.flags.hasThirdPartyCookies) {
      state.flags.hasThirdPartyCookies = true
      state.score = calculateScore(state)
      updateBadge(tabId, state.score)
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
)

// ── Nettoyage ─────────────────────────────────────────────────────────────────
browser.tabs.onRemoved.addListener((tabId) => { tabStates.delete(tabId) })

// ── Messages depuis popup ─────────────────────────────────────────────────────
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'SPA_NAVIGATION' && sender.tab?.id) {
    initTab(sender.tab.id, message.url)
    return
  }
  if (message.type === 'GET_STATE') {
    const state = tabStates.get(message.tabId)
    console.log(`[PGL] GET_STATE tabId=${message.tabId} →`, state ? `score=${state.score}` : 'null')
    if (!state) return Promise.resolve(null)
    return Promise.resolve({ ...state, label: getScoreLabel(state.score) })
  }
})

console.log('[PGL] Service worker démarré')