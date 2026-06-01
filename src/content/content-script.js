// Copyright 2026 Félix De Gaudenzi — ZEDD (https://zedd.fr)
// Licensed under the Apache License, Version 2.0
// https://www.apache.org/licenses/LICENSE-2.0




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