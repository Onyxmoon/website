# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Philipp Borucki – a static multi-page site built with vanilla
HTML, CSS, and JavaScript. No build process, no dependencies, no package manager.

## Architecture

Every page is plain HTML that works without JavaScript. Scripts are progressive enhancement
only: `enabled.js` adds a `js-enabled` class to the body, and CSS uses that class to switch
between the no-JS presentation and the enhanced one. Any element a script creates is appended
to an empty placeholder (`#contact-mail`, `#theme-toggle`, `#project-filter`), so without
JavaScript nothing renders as an empty box.

### Scripts (`js/`)

- **enabled.js** – sets the `js-enabled` class on `<body>`
- **simple-typewriter.js** – types out elements with class `typewriter` once they scroll into
  view; `typewriter--keep-cursor` keeps the blinking cursor afterwards. When every typewriter
  has finished it adds `typewriter-complete` to the body, which is what other elements wait for
  (see "The mark"). Pages without a typewriter never get that class, so anything depending on it
  belongs on a page that loads this script
- **particle-image.js** – turns `img.particle-image` into an animated particle canvas (about page)
- **theme.js** – builds the theme toggle, a free-standing icon button in the top right corner
  (`#theme-toggle.theme-slot`, positioned absolutely, outside the navigation). It cycles through
  three states – system (half-filled circle), light (sun), dark (moon); system is the default.
  "system" is stored as the *absence* of a value, so it behaves exactly like a first visit and
  keeps following the OS. All three icons sit in the DOM at once and CSS cross-fades between
  them via the button's `data-mode`; the mode is applied before the button enters the document
  so the first icon appears without a transition
- **project-filter.js** – builds the tag filter on the projects page from the `data-tags`
  attribute of each `.project` article; no markup duplication

Each script is an IIFE with `// @ts-check` and JSDoc types (no compilation step). Scripts that
animate bail out on `prefers-reduced-motion: reduce`.

### Styling (`css/styles.css`)

Colors run through custom properties on `:root` (`--bg`, `--fg`, `--muted`, `--line`).
Dark mode is defined twice: once under `@media (prefers-color-scheme: dark)` guarded by
`:root:not([data-theme="light"])`, and once under `:root[data-theme="dark"]` so an explicit
choice wins in both directions. Never hard-code black or white – use the tokens.

Theme changes fade rather than snap: `--theme-fade` holds the colour transition and a universal
selector applies it, so a toggle *and* a change of the system setting are both animated.

**`color-scheme` lives on its own attribute, `data-scheme`, not on `data-theme`.** It cannot be
animated, so switching it together with the colours makes the browser re-render text for a
background it does not have yet – a visible flicker on the type. `theme.js` sets `data-scheme`
about 340ms after `data-theme`, once the fade is done; the inline `<head>` snippet sets both at
once so the first paint is correct, and reduced motion skips the delay. Don't move `color-scheme`
back into the `data-theme` blocks.
`opacity` is deliberately **not** in it – the `js-enabled` starting states switch opacity, and
fading those would make finished elements flash on load. Any rule that needs its own transition
has to re-list the fade: `transition: opacity 0.2s ease, var(--theme-fade)`.

### The mark

`.mark` sits at the bottom of the start page's `<main>` – a CSS-only sequence that waits for the
typewriter intro to finish (`body.typewriter-complete`) and then plays once: the frame draws
itself (`stroke-dashoffset` on a `<path>`), the text fades in, then a printer's registration mark
assembles as its cyan/magenta/yellow separations converge and the black mark takes over. The
colour pass is the one place the site leaves its monochrome palette, and only for about a second.

Three states are layered here: without JavaScript the mark is simply there; `.js-enabled` hides
it; `.typewriter-complete` plays the sequence. Reduced motion shows the finished mark at once,
without waiting for the typewriter.

Timing, measured from `typewriter-complete`: frame 0-1.4s, text 1.0-1.7s, rule 1.2-1.85s,
registration mark 1.7-3.1s, track 2.6-3.3s. The rule comes early on purpose: it gives the lower
half an edge while it is still empty, so the wait for the track reads as composition rather than
as a missing element. That is why `.pipe::before` carries the rule instead of a `border-top` -
the two need separate timing.

The registration mark is sized to `--mark-title-height` (two lines of the title) and the box is
`align-items: flex-end`, so the mark centres on "DevOps @ HEIDELBERG" rather than on the whole
box. Change the title's size through `--mark-title-size` and both follow.

Inside the frame, below a hairline rule, sits `.pipe` – a build/test/deploy track with pulses
running through it, the one animation on the site that never stops. It is a footer *within* the
box: `.mark` carries no bottom padding, and `.pipe` is pulled out to the full width with a
negative `--mark-padding-x` margin before adding that padding back. `--mark-gap` sets the space
above the rule; below it sits slightly tighter (1.2rem), which reads as even because the
stage labels are all caps and carry no descenders. Stage labels are flush at the
outer ends and centred in between, the usual axis-label compromise – centring all three would
push the outer words past the track.

The frame is 1.5px, the registration mark 2.5px, and the underline beneath HEIDELBERG 2px. The
frame's viewBox (380x253) mirrors the box's real proportions so the drawing animation runs at an
even speed.

**The frame path carries `pathLength="100"`.** That normalises its length for dash maths, so
`stroke-dasharray: 100` and the hidden state's `stroke-dashoffset: 100` always match, whatever
size the box ends up. Without it the two would have to equal the *rendered* perimeter in pixels
- `non-scaling-stroke` measures dashes there, not in viewBox units - and any mismatch leaves a
piece of the frame permanently drawn. Keep the three 100s in sync; don't reintroduce pixel
values.

The frame SVG scales with the box via `preserveAspectRatio="none"`, so the stroke needs
`vector-effect="non-scaling-stroke"` (set as an attribute, not only in CSS) to hold its width.
Its path runs along the viewBox edge, so the SVG also needs `overflow: visible` – otherwise the
outer half of the stroke is clipped and the frame renders at half its width. `stroke-dasharray` must match the viewBox perimeter (currently 1000 for 380x120) – adjust both
together.

`.mark` is `inline-flex` inside a flex column, so it needs `align-self: flex-start` to keep its
content width instead of stretching.

## Development

No build step. Open the HTML files directly or serve the folder:

```
python -m http.server 8000
```

## File Structure

- `index.html` – start page (typewriter intro, mark)
- `about.html` – about page (particle portrait)
- `projects.html` – project list with tag filter
- `404.html` – not found page; uses absolute paths since it is served from arbitrary URLs
- `css/styles.css` – all styles
- `js/` – see above
- `fonts/space-grotesk/` – font files, imported via `@import` in styles.css
- `files/` – CV and project PDFs
- `favicon.svg`, `robots.txt`, `sitemap.xml`

## Notes

- **Header, navigation, and footer are duplicated across all five HTML files.** There is no
  include mechanism on purpose – any nav or footer change has to be mirrored everywhere.
- Every page needs `<!DOCTYPE html>`; without it browsers fall back to quirks mode.
- Each page carries a small inline script in `<head>` that applies a stored theme before first
  paint. It has to stay inline and before the stylesheet, otherwise the page flashes.
- The footer email address is assembled in `contact-mail.js` to keep it away from scrapers.
- `css/styles.css?v=…` is a cache buster – bump the date when styles change.
- Semicolon-free code style: watch out for lines starting with `(` or `[`, which ASI will
  attach to the previous line.
