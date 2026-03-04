// Content script — pas d'import, bundlé en IIFE autonome
// On utilise directement l'API browser

const api = typeof browser !== 'undefined' ? browser : chrome

let currentUrl = window.location.href

function notifyNavigation(url) {
  if (url === currentUrl) return
  currentUrl = url
  api.runtime.sendMessage({ type: 'SPA_NAVIGATION', url }).catch(() => {})
}

const originalPushState = history.pushState.bind(history)
history.pushState = function (...args) {
  originalPushState(...args)
  notifyNavigation(window.location.href)
}

const originalReplaceState = history.replaceState.bind(history)
history.replaceState = function (...args) {
  originalReplaceState(...args)
  notifyNavigation(window.location.href)
}

window.addEventListener('popstate', () => {
  notifyNavigation(window.location.href)
})