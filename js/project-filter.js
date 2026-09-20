// @ts-check

(() => {
  const container = document.getElementById("project-filter")
  if (!container) return

  const projects = /** @type {NodeListOf<HTMLElement>} */ (
    document.querySelectorAll(".project[data-tags]")
  )
  if (projects.length === 0) return

  /**
   * @param {HTMLElement} project
   * @returns {string[]}
   */
  const tagsOf = project =>
    (project.dataset.tags ?? "")
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

  /** @type {Map<string, number>} */
  const tagCounts = new Map()
  projects.forEach(project => {
    tagsOf(project).forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    })
  })

  // Most common tags first, alphabetical within the same count.
  const tags = [...tagCounts.entries()]
    .sort(([tagA, countA], [tagB, countB]) => countB - countA || tagA.localeCompare(tagB))
    .map(([tag]) => tag)

  if (tags.length === 0) return

  const emptyNote = document.createElement("p")
  emptyNote.className = "project-filter-empty"
  emptyNote.textContent = "Nothing here – try another tag."
  emptyNote.hidden = true

  const section = container.parentNode
  if (section) section.insertBefore(emptyNote, container.nextSibling)

  /** @type {HTMLButtonElement[]} */
  const buttons = []

  /**
   * @param {string | null} activeTag
   */
  const applyFilter = activeTag => {
    let visible = 0

    projects.forEach(project => {
      const matches = activeTag === null || tagsOf(project).includes(activeTag)
      project.hidden = !matches
      if (matches) visible++
    })

    emptyNote.hidden = visible > 0

    buttons.forEach(button => {
      const isActive = (button.dataset.tag ?? null) === activeTag
      button.setAttribute("aria-pressed", String(isActive))
    })
  }

  /**
   * @param {string} label
   * @param {string | null} tag
   */
  const addButton = (label, tag) => {
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = label
    if (tag !== null) button.dataset.tag = tag
    button.addEventListener("click", () => applyFilter(tag))
    buttons.push(button)
    container.appendChild(button)
  }

  container.className = "project-filter"
  container.setAttribute("aria-label", "Filter projects by topic")

  addButton(`All (${projects.length})`, null)
  tags.forEach(tag => addButton(`${tag} (${tagCounts.get(tag)})`, tag))

  applyFilter(null)
})()
