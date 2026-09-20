// @ts-check

(() => {
  const STORAGE_KEY = "theme"

  /** @typedef {"system" | "light" | "dark"} Mode */

  /** @type {Mode[]} */
  const MODES = ["system", "light", "dark"]

  /** @type {Record<Mode, string>} */
  const ICONS = {
    system: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
    light:
      '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 2.6v2.1M12 19.3v2.1M2.6 12h2.1M19.3 12h2.1M5.2 5.2l1.5 1.5M17.3 17.3l1.5 1.5M18.8 5.2l-1.5 1.5M6.7 17.3l-1.5 1.5"/>',
    dark: '<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2z"/>',
  }

  /** @type {Record<Mode, string>} */
  const LABELS = {
    system: "Theme: follows system",
    light: "Theme: light",
    dark: "Theme: dark",
  }

  // Long enough for --theme-fade (0.3s) to finish.
  const SCHEME_DELAY = 340

  const container = document.getElementById("theme-toggle")
  if (!container) return

  const root = document.documentElement
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

  /**
   * No stored value means "system", so that is the default on a first visit.
   * @returns {Mode}
   */
  const storedMode = () => {
    try {
      const value = localStorage.getItem(STORAGE_KEY)
      return value === "dark" || value === "light" ? value : "system"
    } catch {
      return "system"
    }
  }

  /**
   * "system" is stored as the absence of a value, so it behaves exactly like a
   * first visit and keeps following the OS setting afterwards.
   * @param {Mode} mode
   */
  const storeMode = mode => {
    try {
      if (mode === "system") localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Private browsing or blocked storage: the choice won't persist.
    }
  }

  const button = document.createElement("button")
  button.type = "button"
  button.className = "theme-toggle"

  // All three icons live in the DOM at once; CSS cross-fades between them
  // based on the button's data-mode.
  button.innerHTML = MODES.map(
    mode =>
      `<svg class="theme-icon theme-icon--${mode}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[mode]}</svg>`
  ).join("")

  /** @type {number | undefined} */
  let schemeTimer

  /**
   * color-scheme can't be animated, so switching it mid-fade makes the browser
   * re-render text for a background it doesn't have yet – visible as a flicker.
   * It therefore trails the colour transition.
   * @param {Mode} mode
   */
  const applyScheme = mode => {
    if (mode === "system") delete root.dataset.scheme
    else root.dataset.scheme = mode
  }

  /**
   * @param {Mode} mode
   * @param {boolean} [immediate] - skip the delay (first paint, reduced motion)
   */
  const apply = (mode, immediate) => {
    if (mode === "system") delete root.dataset.theme
    else root.dataset.theme = mode

    button.dataset.mode = mode
    button.setAttribute("aria-label", `${LABELS[mode]} – click to change`)
    button.setAttribute("title", LABELS[mode])

    clearTimeout(schemeTimer)
    if (immediate || motionQuery.matches) applyScheme(mode)
    else schemeTimer = setTimeout(() => applyScheme(mode), SCHEME_DELAY)
  }

  button.addEventListener("click", () => {
    const next = MODES[(MODES.indexOf(storedMode()) + 1) % MODES.length]
    storeMode(next)
    apply(next)
  })

  // Applied before the button enters the document, so the first icon appears
  // without a transition.
  apply(storedMode(), true)
  container.appendChild(button)
})()
