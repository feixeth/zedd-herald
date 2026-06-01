import browser from 'webextension-polyfill'
import trackerList from '../lists/trackers.json'

const tabStates = new Map()

function createFreshState(domain) {
  return {
    domain,
    score: 100,
    breakdown: {
      reputation: 0, https: 0, cookies: 0, fingerprinting: 0,
      tagManagers: 0, advMajor: 0, advertising: 0, social: 0,
      analytics: 0, marketing: 0, other: 0
    },
    requests: {
      total: 0,
      thirdParty: 0,
      trackers: [],
      fingerprinters: [],
      tagManagers: [],
      cmps: [],
      cdns: [],
      unknown: []
    },
    flags: {
      hasHTTPS: true,
      hasThirdPartyCookies: false
    },
    reputation: null,
    sstWarning: null
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
    if (trackerList.tag_managers[c])   return { type: 'tag_manager' }
    if (trackerList.cmps?.[c])         return { type: 'cmp' }
    if (trackerList.cdns[c])           return { type: 'cdn' }
    if (trackerList.trackers[c])       return { type: 'tracker', category: trackerList.trackers[c] }
  }
  return { type: 'unknown' }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────
function calculateScore(state) {
  let score = 100
  const breakdown = {
    reputation: 0, https: 0, cookies: 0, fingerprinting: 0,
    tagManagers: 0, advMajor: 0, advertising: 0, social: 0,
    analytics: 0, marketing: 0, other: 0
  }

  if (state.reputation) { breakdown.reputation = state.reputation.penalty; score -= breakdown.reputation }
  if (!state.flags.hasHTTPS) { breakdown.https = 5; score -= 5 }
  if (state.flags.hasThirdPartyCookies) { breakdown.cookies = 8; score -= 8 }
  if (state.requests.fingerprinters.length > 0) { breakdown.fingerprinting = 25; score -= 25 }

  breakdown.tagManagers = Math.min(state.requests.tagManagers.length * 3, 6)
  score -= breakdown.tagManagers

  const byCategory = { advertising_major: [], advertising: [], social: [], analytics: [], marketing: [], other: [] }
  for (const t of state.requests.trackers) {
    const cat = t.category
    if (byCategory[cat]) byCategory[cat].push(t)
    else byCategory.other.push(t)
  }

  breakdown.advMajor = Math.min((byCategory.advertising_major?.length ?? 0) * 20, 40)
  score -= breakdown.advMajor

  let advPen = 0
  byCategory.advertising.forEach((_, i) => { advPen += [10, 8, 6][i] ?? 4 })
  breakdown.advertising = Math.min(advPen, 30)
  score -= breakdown.advertising

  breakdown.social = Math.min(byCategory.social.length * 8, 16)
  score -= breakdown.social

  let anaPen = 0
  byCategory.analytics.forEach((_, i) => { anaPen += [4, 3, 2][i] ?? 1 })
  breakdown.analytics = Math.min(anaPen, 12)
  score -= breakdown.analytics

  let mktPen = 0
  byCategory.marketing.forEach((_, i) => { mktPen += [4, 3][i] ?? 2 })
  breakdown.marketing = Math.min(mktPen, 8)
  score -= breakdown.marketing

  breakdown.other = Math.min(byCategory.other.length * 3, 9)
  score -= breakdown.other

  return { score: Math.max(0, score), breakdown }
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

function broadcastState(tabId, state) {
  browser.runtime.sendMessage({
    type: 'STATE_UPDATE',
    tabId,
    state: { ...state, label: getScoreLabel(state.score) }
  }).catch(() => {})
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
  // Vérifier réputation du domaine visité
  const repData = trackerList.reputation?.[domain]
  if (repData) {
    state.reputation = { domain, penalty: repData.penalty, reason: repData.reason }
  }
  tabStates.set(tabId, state)
  console.log(`[ZH] Init tab ${tabId} → ${domain}${repData ? ' [REPUTATION]' : ''}`)
  updateBadge(tabId, 100)
  broadcastState(tabId, state)
  return true
}

// ─── Requêtes ─────────────────────────────────────────────────────────────────
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
      ...state.requests.tagManagers,
      ...state.requests.cmps,
      ...state.requests.cdns,
      ...state.requests.unknown
    ]
    if (allTracked.includes(requestRoot)) return

    // Détection server-side tagging sur sous-domaines first-party
    if (!state.sstWarning) {
      const fullHost = hostname.toLowerCase()
      const SST_PATTERNS = {
        'cdtm.': 'Commanders Act', 'tagcommander.': 'TagCommander',
        'commandersact.': 'Commanders Act', 'sgtm.': 'GTM Server-Side',
        'server-gtm.': 'GTM Server-Side', 'stape.': 'Stape/GTM SST',
        'tealium.': 'Tealium', 'collect.tealiumiq.': 'Tealium',
        'adobedtm.': 'Adobe Launch', 'segment.': 'Segment',
        'eulerian.': 'Eulerian', 'ati-host.': 'AT Internet', 'piano.': 'Piano Analytics',
        'gtm.': 'GTM Server-Side',
      }
      const SST_URL_KW = ['tagcommander','tc_nav','tc_privacy','/tag/xcare','/tag/xperf','server-side','sst.']
      const urlLow = details.url.toLowerCase()
      for (const [pat, label] of Object.entries(SST_PATTERNS)) {
        if (fullHost.includes(pat) && requestRoot !== state.domain) {
          state.sstWarning = label; break
        }
      }
      if (!state.sstWarning) {
        for (const kw of SST_URL_KW) {
          if (urlLow.includes(kw)) { state.sstWarning = 'TMS server-side détecté'; break }
        }
      }
    }

    const c = classifyDomain(requestRoot)
    switch (c.type) {
      case 'tracker':      state.requests.trackers.push({ domain: requestRoot, category: c.category }); break
      case 'fingerprinter': state.requests.fingerprinters.push(requestRoot); break
      case 'tag_manager':  state.requests.tagManagers.push(requestRoot); break
      case 'cmp':          state.requests.cmps.push(requestRoot); break
      case 'cdn':          state.requests.cdns.push(requestRoot); break
      default:             state.requests.unknown.push(requestRoot)
    }

    ;({ score: state.score, breakdown: state.breakdown } = calculateScore(state))
    updateBadge(tabId, state.score)
    broadcastState(tabId, state)
  },
  { urls: ['<all_urls>'] }
)

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
      ;({ score: state.score, breakdown: state.breakdown } = calculateScore(state))
      updateBadge(tabId, state.score)
      broadcastState(tabId, state)
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
)

// ─── Navigation ───────────────────────────────────────────────────────────────
browser.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return
  initTab(details.tabId, details.url)
})

browser.tabs.onRemoved.addListener((tabId) => { tabStates.delete(tabId) })

// ─── Messages ─────────────────────────────────────────────────────────────────
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'SPA_NAVIGATION' && sender.tab?.id) {
    initTab(sender.tab.id, message.url)
    return
  }
  if (message.type === 'GET_STATE') {
    const state = tabStates.get(message.tabId)
    if (!state) return Promise.resolve(null)
    return Promise.resolve({ ...state, label: getScoreLabel(state.score) })
  }
})