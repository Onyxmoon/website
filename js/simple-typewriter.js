// @ts-check

(() => {
  const TRIGGER_CLASS_NAME = "typewriter"
  const ACTIVE_CLASS_NAME = "typewriter--active"
  const KEEP_CURSOR_CLASS_NAME = "typewriter--keep-cursor"

  const SPAN_SHOWN_CLASS_NAME = "typewriter-text--shown"
  const SPAN_HIDDEN_CLASS_NAME = "typewriter-text--hidden"
  const SPAN_CURSOR_CLASS_NAME = "typewriter-cursor"

  const elements = /** @type {NodeListOf<HTMLElement>}*/ (document.querySelectorAll(`.${TRIGGER_CLASS_NAME}`))

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {boolean}
   */
  const isInRange = (value, min, max) => value >= min && value <= max

  /**
   * @param {HTMLElement} element
   */
  const isElementScrolledBy = element => {
    const elementBounds = element.getBoundingClientRect()
    return element.getBoundingClientRect().bottom <= 0
  }

  /**
   * @param {HTMLElement} element
   */
  const isElementInView = element => {
    const elementBounds = element.getBoundingClientRect()
    return elementBounds.bottom > 0 && elementBounds.top < window.innerHeight
  }

  /**
   * @param {number} ms
   * @returns {Promise<number>}
   */
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

  /**
   * @param {ChildNode} element
   * @returns {Text[]}
   */
  const extractTextNodes = element =>
    [...element.childNodes.values()].flatMap(childNode => {
      if (childNode.nodeType === Node.TEXT_NODE) {
        return /** @type {Text} */ (childNode)
      }
      else {
        return extractTextNodes(childNode)
      }
    })

  /**
   * @param {HTMLElement} element
   */
  const typewrite = async element => {
    await delay(100)

    const textParts = extractTextNodes(element)

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let reducedMotion = mediaQuery.matches
    mediaQuery.addEventListener("change", event => {
      reducedMotion = event.matches
    })

    element.classList.add(ACTIVE_CLASS_NAME)

    const cursorElement = document.createElement("span")
    cursorElement.classList.add(SPAN_CURSOR_CLASS_NAME)

    const replacedTextParts = textParts.map(textPart => {
      const initialText = textPart.textContent ?? ""
      const showTextElement = document.createElement("span")
      showTextElement.classList.add(SPAN_SHOWN_CLASS_NAME)
      const hiddenTextElement = document.createElement("span")
      hiddenTextElement.classList.add(SPAN_HIDDEN_CLASS_NAME)
      hiddenTextElement.textContent = initialText
      textPart.replaceWith(showTextElement, hiddenTextElement)

      return {
        initialText,
        textPart,
        showTextElement,
        hiddenTextElement,
      }
    })

    for (const { initialText, textPart, showTextElement, hiddenTextElement } of replacedTextParts) {
      /** @type {ParentNode} */ (hiddenTextElement.parentNode).insertBefore(cursorElement, hiddenTextElement)

      for (let i = 0; i < initialText.length; i++) {
        showTextElement.textContent = initialText.slice(0, i + 1)
        hiddenTextElement.textContent = initialText.slice(i + 1)

        await delay(Math.random() * 40 + 20)
      }

      if (textPart !== textParts[textParts.length - 1] || !element.classList.contains(KEEP_CURSOR_CLASS_NAME)) {
        showTextElement.replaceWith(textPart)
        cursorElement.remove()
        hiddenTextElement.remove()
      }
    }
  }

  elements.forEach(element => {
    if (isElementScrolledBy(element)) {
      element.classList.add(ACTIVE_CLASS_NAME)
    } else if (isElementInView(element)) {
      typewrite(element)
    } else {
      const listener = () => {
        if (isElementInView(element)) {
          typewrite(element)
          window.removeEventListener("scroll", listener)
        }
      }

      window.addEventListener("scroll", listener)
    }
  })
})()
