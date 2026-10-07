# Embla Carousel Init

One reusable function for setting up [Embla Carousel](https://www.embla-carousel.com/) components. Instead of writing fresh Embla setup code for every logo carousel, testimonial slider, or image gallery, every carousel in your project imports `initEmblaCarousel` and configures it with an options object.

**Current version:** 1.2.0 (Embla 8.6.0)

## Features

- Generated or custom prev/next buttons and dots, with `disabled` / `aria-selected` state kept in sync
- Custom controls can live outside the viewport and be scoped to a single carousel instance
- Navigation hides itself automatically when there's nothing to scroll to
- JS-driven slide sizing (`slidesVisible` or `slideWidth`) with responsive breakpoints, or plain CSS sizing
- Optional autoplay, auto-scroll (ticker), and fade transitions. Each plugin loads on demand only when you turn it on
- Mobile-only mode: a carousel below a breakpoint, plain HTML above it
- Accessibility built in: a live region for slide announcements, ARIA tabs pattern for dots with arrow-key navigation, and `inert` on offscreen slides

## Contents

1. [Load the JS file](#step-1-load-the-js-file)
2. [Build the expected HTML structure](#step-2-build-the-expected-html-structure)
3. [Initialize a basic carousel](#step-3-initialize-a-basic-carousel)
4. [Add navigation](#step-4-add-navigation)
5. [Auto-hide navigation when there's nothing to scroll](#step-5-auto-hide-navigation-when-theres-nothing-to-scroll)
6. [Style the carousel](#step-6-style-the-carousel)
7. [Choose a sizing mode](#step-7-choose-a-sizing-mode)
8. [Optional autoplay, auto-scroll, or fade](#step-8-optional-autoplay-auto-scroll-or-fade)
9. [Carousel on mobile only](#step-9-carousel-on-mobile-only)
- [Accessibility](#accessibility)
- [Working with the Embla API](#working-with-the-embla-api)
- [Full config reference](#full-config-reference)
- [Example scenarios](#example-scenarios)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)

## Step 1: Load the JS File

The file is an ES module served from jsDelivr, straight from this repo's releases. It imports Embla 8.6.0 itself, so there's nothing else to install. Import it from a `type="module"` script:

```html
<script type="module">
    import { initEmblaCarousel } from 'https://cdn.jsdelivr.net/gh/zackpyle/embla-carousel-init@1.2.0/embla-carousel-init.js';

    initEmblaCarousel('.carousel', { loop: true });
</script>
```

The version in the URL controls when you get updates:

- `@1.2.0` pins this exact release. Use this in production, since the file never changes under you.
- `@1` always serves the newest 1.x release, so you pick up fixes automatically.

Avoid `@main`. jsDelivr caches branch URLs for hours to days, so changes show up unpredictably.

### Self-hosting

To host the file yourself, [download the latest release](https://github.com/zackpyle/embla-carousel-init/releases/latest/download/embla-carousel-init.js) and upload it to your theme, uploads folder, or your own CDN. Then swap the jsDelivr URL in the import for yours.

## Step 2: Build the Expected HTML Structure

Embla expects a specific nesting structure. The outer element is the viewport (this is what you'll target with your selector), and it needs a container div wrapping individual slide divs.

```html
<div class="carousel" role="region" aria-label="Featured products">
    <div class="embla__container">
        <div class="embla__slide">Slide 1</div>
        <div class="embla__slide">Slide 2</div>
        <div class="embla__slide">Slide 3</div>
    </div>
</div>
```

The `role="region"` and `aria-label` on the viewport aren't required by the JS, but you'll want them on every carousel you build. The [Accessibility](#what-you-need-to-add-yourself) section covers why.

> **Note:** `.embla__container` and `.embla__slide` are the default selectors the JS looks for. If your markup uses different class names, override them with `containerSelector` and `slideSelector`, as in the [example scenarios](#example-scenarios). Just make sure your HTML matches whatever selectors you pass in. If you use BEM naming, you'll likely set these on most components rather than renaming your markup to match Embla's defaults.

## Step 3: Initialize a Basic Carousel

With the structure in place, initializing is a single function call. Pass in a CSS selector (or a DOM element directly) and a config object.

```javascript
initEmblaCarousel('.carousel', {
    loop: true,
    enableButtons: true,
    enableDots: true
});
```

A selector string only initializes the **first** matching element, the same way `document.querySelector` works. That's fine for a one-off carousel. But if a component repeats on the page (a testimonial carousel inside a loop, or several product carousels on a category archive), only the first one will work.

For those cases, grab all the matches yourself with `querySelectorAll` and call `initEmblaCarousel` once per element, passing the element directly:

```javascript
document.querySelectorAll('.carousel').forEach((el) => {
    initEmblaCarousel(el, {
        loop: true,
        enableButtons: true,
        enableDots: true
    });
});
```

This also gives you control over initialization order, and lets you pass different config per instance if one carousel in the loop needs different settings than the others.

If you forget and pass a selector that matches more than one element, the module logs a console warning with the exact match count and a reminder to loop, rather than failing silently.

## Step 4: Add Navigation

There are two ways to handle prev/next buttons and dots.

### Generated navigation

If you don't already have button or dot markup, enable them and leave the selector options unset. The JS builds and appends `.embla__buttons` and `.embla__dots` inside the viewport for you.

```javascript
initEmblaCarousel('.carousel', {
    enableButtons: true,
    enableDots: true
});
```

### Custom navigation markup

If you've already built your own buttons or dots, point the JS at them instead. It wires up click handlers and keeps `disabled` / `aria-selected` state in sync without generating anything extra.

```javascript
initEmblaCarousel('.carousel', {
    enableButtons: true,
    prevButtonSelector: '.my-prev-btn',
    nextButtonSelector: '.my-next-btn',
    enableDots: true,
    dotsContainerSelector: '.my-dots-container'
});
```

For custom dots, your container just needs to hold `<button>` elements, one per slide (or per scroll snap, depending on your config).

`prevButtonSelector`, `nextButtonSelector`, and `dotsContainerSelector` also accept a DOM element instead of a selector string.

### Scoping custom controls to one carousel

By default, custom control selectors are looked up across the whole document. That breaks as soon as a component with custom nav repeats on the page: every instance finds the *first* `.my-prev-btn` and they all end up driving the wrong carousel.

Set `scope` to limit where the lookup happens. It accepts either an element, or a selector for an ancestor of the viewport (resolved with `closest()`):

```javascript
document.querySelectorAll('.slider').forEach((el) => {
    initEmblaCarousel(el.querySelector('.slider__viewport'), {
        scope: el,                       // or scope: '.slider'
        enableButtons: true,
        prevButtonSelector: '.slider__prev',
        nextButtonSelector: '.slider__next',
        enableDots: true,
        dotsContainerSelector: '.slider__thumbs'
    });
});
```

This also lets your controls sit outside the viewport element entirely, for example in a header row above the slides, while still being tied to the right carousel. If a `scope` selector doesn't match any ancestor of the viewport, the module logs a warning and falls back to the document.

## Step 5: Auto-Hide Navigation When There's Nothing to Scroll

With dynamic content, nav buttons and dots often show up even when every slide already fits in the visible area. The JS handles this by checking how many scroll positions Embla actually has, and adding a class to the viewport when there's only one.

The class name is always `embla--no-nav`, so every carousel using this module shares the same CSS contract. Hide the nav whenever it's present:

```css
.embla--no-nav .embla__buttons,
.embla--no-nav .embla__dots {
    display: none;
}
```

This re-evaluates on every `reInit`, so it stays accurate through resizes, breakpoint changes, and slide count changes.

It's on by default. To opt a specific carousel out, set `enableNoNavClass: false`:

```javascript
initEmblaCarousel('.carousel', {
    enableButtons: true,
    enableDots: true,
    enableNoNavClass: false
});
```

## Step 6: Style the Carousel

A few pieces of CSS are required regardless of how you configure the carousel, plus a starting point for the generated buttons and dots if you're using them.

### Required container styles

The module only applies `display: flex` to the container inline when JS-driven sizing is active (`slideWidth` or `slidesVisible` set). If you're using CSS-driven sizing, or don't want a flash of unstyled layout before JS runs, set it yourself. `touch-action` and `cursor` are never set by the script, so those are on you for correct drag behavior:

```css
.embla__container {
    display: flex;
    touch-action: pan-y pinch-zoom;
    cursor: grab;

    &:active {
        cursor: grabbing;
    }
}
```

`touch-action: pan-y pinch-zoom` tells the browser to let Embla handle horizontal drags while still allowing normal vertical scrolling and pinch-zoom. Without it, dragging a carousel on mobile can fight with the page's own scroll. The `cursor` rules are a visual affordance for mouse users: grab when idle, grabbing while dragging.

It's also worth clipping horizontal overflow on whatever section wraps the carousel, so dragged or auto-scrolling slides don't spill out visually. Matching on `embla` is more reliable than something like `slider`, since every carousel this module touches gets an `embla__live-region` (and usually `embla__container` / `embla__slide`) regardless of what you name the component:

```css
section:has([class*="embla"]) {
    overflow-x: clip;
}
```

### Starter styles for buttons and dots

Here's a starting point for the buttons and dots the JS creates. It uses zero-specificity `:where()` selectors so it's easy to override per component. Color variables are from Automatic.css; swap in your own if you're not using it.

```css
/* Embla Carousel - Default Styles (Zero Specificity) */

/* Buttons */
:where(.embla__buttons) {
    display: flex;
    gap: 1rem;
    justify-content: start;
    margin-top: 1.5rem;
}

:where(.embla__button) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    padding: 0;
    background-color: transparent;
    color: var(--primary);
    border: 1px solid var(--primary);
    border-radius: 50%;
    cursor: pointer;
    transition: var(--transition);
}

:where(.embla__button:hover) {
    background-color: var(--primary);
    color: white;

    .bg-pattern &,
    .bg-pattern-2 &,
    .bg--dark & {
        color: var(--primary);
        background-color: var(--white);
    }
}

:where(.embla__button:disabled) {
    opacity: 0.3;
    cursor: not-allowed;
}

:where(.embla__button-icon) {
    display: block;
    width: 1.25rem;
    height: 1.25rem;
    background-color: currentColor;
    mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMi4zOSAxNy42NCI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMTUuMDcuMzJhMSAxIDAgMCAwLS4yNi0uMjMuNzMuNzMgMCAwIDAtLjY0LS4wM2MtLjEuMDQtLjIuMTEtLjI4LjJzLS4xNC4xOS0uMTguMzEtLjA2LjI0LS4wNS4zNmMwIC4xMi4wMy4yNC4wOC4zNXMuMTIuMjEuMi4yOWw1LjcyIDYuMzlILjc2Yy0uMi4wMS0uNC4xMS0uNTQuMjhTMCA4LjYyIDAgOC44NXMuMDguNDUuMjIuNjFjLjE0LjE3LjMzLjI2LjU0LjI4aDE4LjkybC01LjczIDYuMzhjLS4xNC4xNy0uMjIuMzktLjIyLjYzcy4wOC40Ni4yMi42M2EuNy43IDAgMCAwIC4yNi4xOWMuMS4wNC4yLjA3LjMuMDdzLjIxLS4wMi4zLS4wN2MuMS0uMDQuMTgtLjExLjI2LS4xOWw3LjA5LTcuOTFjLjA4LS4wOC4xNC0uMTguMTgtLjI5YS45Ny45NyAwIDAgMCAwLS42OC45LjkgMCAwIDAtLjE4LS4yOXoiPjwvcGF0aD48L3N2Zz4g');
    mask-size: contain;
    mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-image: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMi4zOSAxNy42NCI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMTUuMDcuMzJhMSAxIDAgMCAwLS4yNi0uMjMuNzMuNzMgMCAwIDAtLjY0LS4wM2MtLjEuMDQtLjIuMTEtLjI4LjJzLS4xNC4xOS0uMTguMzEtLjA2LjI0LS4wNS4zNmMwIC4xMi4wMy4yNC4wOC4zNXMuMTIuMjEuMi4yOWw1LjcyIDYuMzlILjc2Yy0uMi4wMS0uNC4xMS0uNTQuMjhTMCA4LjYyIDAgOC44NXMuMDguNDUuMjIuNjFjLjE0LjE3LjMzLjI2LjU0LjI4aDE4LjkybC01LjczIDYuMzhjLS4xNC4xNy0uMjIuMzktLjIyLjYzcy4wOC40Ni4yMi42M2EuNy43IDAgMCAwIC4yNi4xOWMuMS4wNC4yLjA3LjMuMDdzLjIxLS4wMi4zLS4wN2MuMS0uMDQuMTgtLjExLjI2LS4xOWw3LjA5LTcuOTFjLjA4LS4wOC4xNC0uMTguMTgtLjI5YS45Ny45NyAwIDAgMCAwLS42OC45LjkgMCAwIDAtLjE4LS4yOXoiPjwvcGF0aD48L3N2Zz4g');
    -webkit-mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
}

:where(.embla__button-icon--prev) {
    transform: rotate(180deg);
}

/* Dots */
:where(.embla__dots) {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    align-items: center;
    margin-top: 1.5rem;
}

:where(.embla__dot) {
    width: 0.75rem;
    height: 0.75rem;
    padding: 0;
    background-color: var(--neutral-ultra-light);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease;
}

:where(.embla__dot:hover) {
    background-color: var(--secondary);
}

:where(.embla__dot--active) {
    background-color: var(--primary);
}

.embla__buttons {
    transition: opacity .25s ease .5s;
}

.embla__buttons:has(.embla__button--prev[disabled]):has(.embla__button--next[disabled]) {
    opacity: 0;
}

/* Auto-hiding nav when there's nothing to scroll to */
.embla--no-nav .embla__buttons,
.embla--no-nav .embla__dots {
    display: none;
}
```

The `.embla__buttons:has(...)` rule hides the buttons if both prev and next are ever disabled at the same time (non-loop mode, single scroll position).

The arrow icon is embedded as a base64 data URI, so there's no extra file request or dependency on a media library upload path. To swap it for a different icon, replace the whole `data:image/svg+xml;base64,...` value with a direct link to your SVG file in both `mask-image` and `-webkit-mask-image`. The `currentColor` background keeps it in sync with the button's text color.

## Step 7: Choose a Sizing Mode

There are two approaches for controlling how wide each slide is. JS-driven sizing is the better default for most carousels, since it shows a reliable number of slides per view without you writing breakpoint math. CSS-driven sizing is the better call when slides shouldn't be forced into an exact per-view count. A logo ticker is the clearest example: each logo is its natural width and the row scrolls continuously regardless of how many fit.

### JS-driven sizing

Let the JS calculate widths for you by setting `slidesVisible`:

```javascript
initEmblaCarousel('.carousel', {
    slidesVisible: 3,
    slideGap: 16
});
```

Or fix every slide to a specific pixel width:

```javascript
initEmblaCarousel('.carousel', {
    slideWidth: 300,
    slideGap: 16
});
```

When `loop` is enabled, spacing between slides is applied with `margin-right` instead of `gap`, to avoid issues at the clone boundaries. In non-loop mode, `gap` is used. You don't need to do anything differently; the module handles the switch.

`slidesVisible`, `slideWidth`, and `slideGap` can all be overridden per media query inside `breakpoints`. See the [team carousel example](#team-carousel-with-multiple-responsive-breakpoints).

### CSS-driven sizing

If you don't set `slideWidth` or `slidesVisible`, the module doesn't calculate anything, so visible-item count is entirely up to your CSS. Style `.embla__slide` widths yourself and account for gaps as you would in any flex layout. For a percentage-based, N-per-view approach:

```css
.embla__slide {
    flex: 0 0 calc((100% - (2 * 1rem)) / 3);
}
```

That shows 3 slides at a time, with `2 * 1rem` accounting for the two gaps between them. The ratio stays fixed as the viewport changes unless you write your own breakpoints, so this mode works best where a strict per-view count doesn't matter (a logo ticker) rather than a testimonial or product carousel where you want a predictable number visible at every screen size.

For a fixed-width card, where every slide is the same width and the number visible falls out of however many fit:

```css
.transactions-slider-section__item {
    flex: 0 0 auto;    /* don't grow or shrink to fill space */
    min-width: 0;      /* allow shrinking below content's natural size */
    width: 375px;      /* set desired card width */
    max-width: 100%;   /* prevent overflow on narrow viewports */
    margin-right: var(--grid-gap);
}
```

Swap `margin-right` for `gap` on the container if you're not in `loop` mode, the same tradeoff covered above for JS-driven sizing.

## Step 8: Optional Autoplay, Auto-Scroll, or Fade

There are two separate timed-motion options that behave differently, plus a fade transition that can replace sliding. Each Embla plugin is loaded on demand from jsDelivr's ESM builds, so there's no added weight unless you turn it on.

### Autoplay (timed slide advances)

```javascript
initEmblaCarousel('.carousel', {
    loop: true,
    autoplay: true,
    autoplayDelay: 4000,
    autoplayStopOnMouseEnter: true,
    autoplayStopOnInteraction: false
});
```

Autoplay also stops when keyboard focus moves into a slide (`autoplayStopOnFocusIn`, on by default) so a keyboard user isn't pulled away from what they're reading. Set `autoplayPlayOnInit: false` to set up autoplay without starting it, then start it yourself later through the API (`api.plugins().autoplay.play()`).

Slide changes made by autoplay aren't announced to screen readers. Only changes the visitor makes are, following the WAI-ARIA carousel pattern.

To drive a progress bar or countdown from the autoplay timer, see [Autoplay timer bar](#autoplay-timer-bar).

### Auto-scroll (continuous ticker-style motion)

```javascript
initEmblaCarousel('.carousel', {
    loop: true,
    autoScroll: true,
    autoScrollSpeed: 1,
    autoScrollStopOnInteraction: true
});
```

The screen-reader announcement region is skipped entirely while `autoScroll` is active, since it would otherwise fire constantly.

### Fade (cross-fade instead of sliding)

```javascript
initEmblaCarousel('.carousel', {
    loop: true,
    fade: true,
    autoplay: true,
    autoplayDelay: 5000
});
```

Slides are stacked in place and cross-fade, so each slide must fill the viewport:

```css
.embla__slide {
    flex: 0 0 100%;
}
```

Don't combine `fade` with `autoScroll`. Fade pairs well with autoplay for hero slideshows.

## Step 9: Carousel On Mobile Only

Sometimes you only want carousel behavior on smaller screens and a plain CSS grid on desktop. The `mobileOnly` option checks the breakpoint on load and on every resize, then creates or tears down the Embla instance as the viewport crosses it.

```javascript
initEmblaCarousel('.carousel', {
    mobileOnly: true,
    mobileBreakpoint: '(width <= 767px)',
    enableButtons: true,
    enableDots: true
});
```

When the breakpoint isn't matched, your markup renders as plain HTML with no Embla instance attached. This keeps desktop layouts simple without maintaining two separate components.

## Accessibility

The JS handles most of this automatically, but there's one piece it deliberately leaves to you.

### What's built in

- A visually hidden `aria-live="polite"` region announces the current slide using the `announcement` template (default `Slide {current} of {total}`). It fires on Embla's `settle` event rather than `select`, so a drag that passes through several slides only announces the one it lands on. Autoplay advances aren't announced, and the region is skipped entirely in `autoScroll` mode.
- Dots follow the ARIA tabs pattern (`role="tablist"` / `role="tab"`, `aria-selected`) with a roving `tabindex`, so only the active dot sits in the tab order. Left/Right arrow keys move between dots (wrapping only when `loop: true`), and Home/End jump to the first and last dot. This works with generated dots and with your own markup via `dotsContainerSelector`.
- Generated buttons include `aria-label`s of `Previous slide` and `Next slide`.
- Prev/next buttons are properly `disabled`, not just visually hidden, when there's nowhere left to scroll (unless `loop` is on).
- Slides scrolled out of view are set `inert` (feature-detected, so older browsers simply don't get this protection). Keyboard and screen reader users can't tab into links or buttons inside a slide that isn't visible. This updates on every `select`, `settle`, and `reInit`, and clears when a carousel is destroyed, for example when a `mobileOnly` carousel switches off. In fade mode, only the selected slide is treated as visible.
- Autoplay stops when focus moves into a slide (`autoplayStopOnFocusIn`), and pauses on hover by default (`autoplayStopOnMouseEnter`).

For a custom announcement message, override the template:

```javascript
initEmblaCarousel('.carousel', {
    announcement: 'Showing slide {current} of {total}'
});
```

### What you need to add yourself

The JS doesn't label the carousel region, since only you know what a given carousel is. Add `role="region"` and an `aria-label` (or `aria-labelledby` pointing at a visible heading) on the viewport element:

```html
<div class="carousel" role="region" aria-label="Featured products">
    <div class="embla__container">…</div>
</div>
```

Without this, a screen reader user hears the slide-change announcements but has no way to know which carousel they're in if there's more than one on the page.

## Working with the Embla API

`initEmblaCarousel` is `async` and resolves to the Embla API instance, or `null` if the viewport, container, or slides couldn't be found, or if `mobileOnly` is active and the breakpoint doesn't currently match. Use it to call Embla methods directly when a component needs more control, like `scrollTo()`, or to listen for events with `.on()`.

```javascript
const api = await initEmblaCarousel(el, { loop: true });

if (api) {
    api.on('select', () => {
        console.log('Now on snap', api.selectedScrollSnap());
    });
}
```

### Autoplay timer bar

Embla 8.6.0's Autoplay plugin exposes `timeUntilNext()` and fires `autoplay:timerset` / `autoplay:timerstopped` events. That's enough to drive a progress bar from the plugin's own clock, so the bar stays in sync through hover pauses, focus stops, and manual navigation:

```javascript
const api = await initEmblaCarousel(el, {
    loop: true,
    autoplay: true,
    autoplayDelay: 6000
});

const autoplay = api.plugins().autoplay;
const bar = el.querySelector('.slider__progress');

const startBar = () => {
    const ms = autoplay.timeUntilNext();
    if (ms === null) return;

    // Reset to empty, then animate to full over the remaining time
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(0)';
    bar.offsetWidth; // force reflow so the reset applies before the transition
    bar.style.transition = `transform ${ms}ms linear`;
    bar.style.transform = 'scaleX(1)';
};

const stopBar = () => {
    bar.style.transition = 'none';
    bar.style.transform = 'scaleX(0)';
};

api.on('autoplay:timerset', startBar);
api.on('autoplay:timerstopped', stopBar);

// The first timer may already be running by the time listeners are attached
startBar();
```

```css
.slider__progress {
    height: 3px;
    background-color: var(--primary);
    transform: scaleX(0);
    transform-origin: left;
}
```

## Full Config Reference

### Structure

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `containerSelector` | string | `'.embla__container'` | Selector for the slides container inside the viewport |
| `slideSelector` | string | `'.embla__slide'` | Selector for individual slides |

### Embla options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `loop` | boolean | `false` | Infinite loop |
| `align` | string | `'start'` | Slide alignment: `'start'`, `'center'`, or `'end'` |
| `slidesToScroll` | number | `1` | Number of slides to scroll at once |
| `skipSnaps` | boolean | `false` | Allow skipping snaps on a hard drag |
| `dragFree` | boolean | `false` | Free-drag scrolling with momentum, no snapping |
| `containScroll` | string | `'trimSnaps'` | Embla's contain-scroll behavior |
| `breakpoints` | object | `{}` | Media-query keyed overrides, e.g. `{ '(width >= 900px)': { slidesVisible: 3 } }`. Applies to Embla options and to JS sizing options |

### Sizing

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `slidesVisible` | number | none | Number of slides visible at once (enables JS sizing). Fractional values let the next slide peek in |
| `slideWidth` | number | none | Fixed slide width in pixels (enables JS sizing). Takes priority over `slidesVisible` |
| `slideGap` | number | `16` | Gap between slides in pixels. Only used with JS sizing |

### Navigation

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableButtons` | boolean | `false` | Enable prev/next buttons. Generated unless both custom button options are set |
| `prevButtonSelector` | string \| Element | none | Custom previous button |
| `nextButtonSelector` | string \| Element | none | Custom next button |
| `enableDots` | boolean | `false` | Enable dot navigation. Generated unless `dotsContainerSelector` is set |
| `dotsContainerSelector` | string \| Element | none | Custom dots container holding one `<button>` per snap |
| `scope` | string \| Element | document | Where custom control selectors are looked up: an element, or an ancestor selector of the viewport |
| `enableNoNavClass` | boolean | `true` | Toggle `embla--no-nav` on the viewport when there's only one scroll position |

### Autoplay

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `autoplay` | boolean | `false` | Enable the Autoplay plugin (timed advances) |
| `autoplayDelay` | number | `4000` | Milliseconds between advances |
| `autoplayStopOnInteraction` | boolean | `false` | Stop autoplay after the user drags |
| `autoplayStopOnMouseEnter` | boolean | `true` | Pause autoplay while hovered |
| `autoplayStopOnFocusIn` | boolean | `true` | Stop autoplay when focus moves into a slide |
| `autoplayPlayOnInit` | boolean | `true` | Start playing as soon as the carousel initializes |

### Auto-scroll

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `autoScroll` | boolean | `false` | Enable the AutoScroll plugin (continuous ticker) |
| `autoScrollSpeed` | number | `1` | Scroll speed. `0.5` is half speed, `2` is double |
| `autoScrollStopOnInteraction` | boolean | `true` | Stop auto-scroll on user interaction |
| `autoScrollStopOnMouseEnter` | boolean | `false` | Stop auto-scroll on hover |

### Fade

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `fade` | boolean | `false` | Enable the Fade plugin. Slides must be `flex: 0 0 100%`. Don't combine with `autoScroll` |

### Responsive and accessibility

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mobileOnly` | boolean | `false` | Only run the carousel while `mobileBreakpoint` matches |
| `mobileBreakpoint` | string | `'(max-width: 767px)'` | Media query for when the carousel is active in `mobileOnly` mode |
| `announcement` | string | `'Slide {current} of {total}'` | Screen reader announcement template |

## Example Scenarios

Complete configs for common carousel types. These assume BEM-named components and use `containerSelector` and `slideSelector` to match each component's own class names.

### Testimonial carousel

Looping, JS-driven sizing, generated navigation, and autoplay that pauses on hover.

```javascript
import { initEmblaCarousel } from 'https://cdn.jsdelivr.net/gh/zackpyle/embla-carousel-init@1.2.0/embla-carousel-init.js';

initEmblaCarousel('.testimonial-carousel', {
    containerSelector: '.testimonial-carousel__list',
    slideSelector: '.testimonial-carousel__item',
    loop: true,
    align: 'center',
    slidesVisible: 3,
    slideGap: 24,
    enableButtons: true,
    enableDots: true,
    autoplay: true,
    autoplayDelay: 5000,
    autoplayStopOnMouseEnter: true,
    breakpoints: {
        '(width <= 767px)': {
            slidesVisible: 1
        }
    }
});
```

### Logo carousel, continuous ticker

No buttons or dots, just a slow, non-stop scroll with no pause on interaction, the kind you'd use for a row of client or partner logos. Sizing is left to CSS rather than `slidesVisible`, since each logo should be its natural width.

```javascript
initEmblaCarousel('.logo-carousel', {
    containerSelector: '.logo-carousel__list',
    slideSelector: '.logo-carousel__item',
    loop: true,
    align: 'start',
    autoScroll: true,
    autoScrollSpeed: 0.5,
    autoScrollStopOnInteraction: false
});
```

```css
.logo-carousel__item {
    flex: 0 0 auto;
    width: auto;
    margin-right: 2rem;
}
```

### Hero slideshow with fade and timer bar

One full-width slide at a time, cross-fading on a timer, with custom dots and a progress bar that fills up until the next slide. Autoplay pauses on hover and stops when focus moves into a slide by default.

```javascript
const api = await initEmblaCarousel('.hero-slider__viewport', {
    containerSelector: '.hero-slider__list',
    slideSelector: '.hero-slider__item',
    loop: true,
    fade: true,
    autoplay: true,
    autoplayDelay: 6000,
    enableDots: true,
    dotsContainerSelector: '.hero-slider__dots'
});

if (api) {
    const autoplay = api.plugins().autoplay;
    const bar = document.querySelector('.hero-slider__progress');

    const startBar = () => {
        const ms = autoplay.timeUntilNext();
        if (ms === null) return;

        // Reset to empty, then animate to full over the remaining time
        bar.style.transition = 'none';
        bar.style.transform = 'scaleX(0)';
        bar.offsetWidth; // force reflow so the reset applies before the transition
        bar.style.transition = `transform ${ms}ms linear`;
        bar.style.transform = 'scaleX(1)';
    };

    const stopBar = () => {
        bar.style.transition = 'none';
        bar.style.transform = 'scaleX(0)';
    };

    api.on('autoplay:timerset', startBar);
    api.on('autoplay:timerstopped', stopBar);

    // The first timer may already be running by the time listeners are attached
    startBar();
}
```

```css
.hero-slider__item {
    flex: 0 0 100%;
}

.hero-slider__progress {
    height: 3px;
    background-color: var(--primary);
    transform: scaleX(0);
    transform-origin: left;
}
```

### Image gallery, mobile only

A plain CSS grid on desktop, a draggable carousel below the breakpoint.

```javascript
initEmblaCarousel('.image-gallery', {
    containerSelector: '.image-gallery__list',
    slideSelector: '.image-gallery__item',
    mobileOnly: true,
    mobileBreakpoint: '(width <= 767px)', // Carousel below 768px
    loop: false,
    dragFree: true,
    enableDots: true
});
```

### Services carousel with custom nav markup

Uses buttons and dots already built into the component instead of letting the JS generate them. `scope` keeps each instance wired to its own controls if the component appears more than once.

```javascript
document.querySelectorAll('.services-carousel').forEach((el) => {
    initEmblaCarousel(el.querySelector('.services-carousel__viewport'), {
        scope: el,
        containerSelector: '.services-carousel__list',
        slideSelector: '.services-carousel__item',
        slidesToScroll: 1,
        enableButtons: true,
        prevButtonSelector: '.services-carousel__nav-prev',
        nextButtonSelector: '.services-carousel__nav-next',
        enableDots: true,
        dotsContainerSelector: '.services-carousel__nav-dots'
    });
});
```

### Team carousel with multiple responsive breakpoints

Stacks `breakpoints` on top of `mobileOnly` to control both whether the carousel runs at all and how many people are visible at each screen size. It's a mobile/tablet carousel that becomes a plain grid at 1200px and up, with `slidesVisible` stepping up from roughly 1 person to 2 to 3 as the viewport grows. The fractional values let the next person peek in at the edge as a scroll affordance.

```javascript
initEmblaCarousel('.team-slider-container', {
    containerSelector: '.team-slider',
    slideSelector: '.team-slider__person',
    mobileOnly: true,
    mobileBreakpoint: '(width <= 1199px)', // Carousel below 1200px
    loop: false,
    enableDots: true,
    slidesVisible: 1.25, // Mobile: 1 person visible
    slideGap: 24,
    slidesToScroll: 1,
    breakpoints: {
        '(width >= 450px)': {
            slidesVisible: 2.25 // 450px+: 2 people visible
        },
        '(width >= 900px)': {
            slidesVisible: 3.25 // 900px+: 3 people visible
        }
    }
});
```

`mobileBreakpoint` and the entries in `breakpoints` are independent settings, so double-check they line up. Here the carousel is active from 0 up to 1199px, and within that range `slidesVisible` steps from `1.25`, to `2.25` at 450px and up, to `3.25` at 900px and up, still under the 1200px cutoff where the carousel turns off.

## Troubleshooting

### The carousel doesn't initialize and the function returns `null`

Check that your selector matches an element on the page and that your HTML follows the [structure from Step 2](#step-2-build-the-expected-html-structure). If you're using `containerSelector` or `slideSelector`, make sure they match your markup exactly. The console will say which piece wasn't found. Also confirm the import URL is reachable: a 404 on the module file fails the import.

### Only the first carousel on the page works

You're passing a selector string to a component that appears more than once, usually because of a CMS loop. A string selector only initializes the first match. The console warning gives the exact match count. Loop with `querySelectorAll` and initialize each element individually, as in [Step 3](#step-3-initialize-a-basic-carousel).

### Custom buttons or dots control the wrong carousel

Custom control selectors are looked up across the whole document unless you set `scope`. With repeated components, every instance finds the first matching button. Pass `scope` (the component's root element, or an ancestor selector) so each carousel only looks inside itself. See [Scoping custom controls](#scoping-custom-controls-to-one-carousel).

### `null` is returned on desktop with `mobileOnly`

Expected. When `mobileOnly` is true and the breakpoint doesn't match, there's no Embla instance to return, so the plain HTML fallback renders instead.

### Slides are the wrong width

If you're using CSS-driven sizing, make sure you're not also setting `slideWidth` or `slidesVisible`, since JS sizing overrides your CSS widths. If you're using JS sizing and slides still look off, check `slideGap`. It defaults to `16` only when JS sizing is active and is ignored otherwise.

### Navigation is duplicated

The module removes generated buttons, dots, and the live region before rebuilding them on every `reInit` and on destroy, so this shouldn't happen with generated navigation. If you see duplicates, check whether the init code is running more than once, for example on page load and again from another script or a page builder.

### Navigation doesn't hide when everything fits

Confirm `enableNoNavClass` isn't set to `false`, and that your CSS targets `embla--no-nav`, the fixed class name this module uses. The class goes on the viewport element (the one you passed in), not the container or slides.

### Autoplay, auto-scroll, or fade doesn't run

The plugins load on demand from jsDelivr, so a slow or blocked connection to that CDN prevents them from working. Check the network tab for a failed request. Also make sure you're setting `autoplay: true`, `autoScroll: true`, or `fade: true`, not just the delay or speed options. Those alone don't turn the feature on. For autoplay, check `autoplayPlayOnInit` isn't `false`.

### Slide changes aren't announced

Expected with `autoScroll`, where the live region is skipped to avoid constant announcements, and for advances made by autoplay. If neither applies, check that the `aria-live` region hasn't been hidden or removed by other CSS or scripts on the page.

### Links or buttons inside a slide can't be focused

Expected if that slide is scrolled out of view: offscreen slides are set `inert` so they're skipped by keyboard and screen reader navigation. If interactive content inside the *visible* slide isn't working, check that nothing else in your CSS applies `pointer-events: none` to active slides.

## Changelog

- **1.2.0**
  - Embla and plugins updated from 8.1.4 to 8.6.0. 
  - Autoplay gains `timeUntilNext()` and the `autoplay:timerset` / `autoplay:timerstopped` events
  - New `scope` option for looking up custom controls inside one component
  - `prevButtonSelector`, `nextButtonSelector`, and `dotsContainerSelector` accept elements as well as selectors
  - New `autoplayStopOnFocusIn` and `autoplayPlayOnInit` options
  - Autoplay advances are no longer announced to screen readers
- **1.1.0**
  - New `fade` option (Embla Fade plugin). Inert handling uses the selected slide in fade mode
- **1.0.0**
  - Initial release on Embla 8.1.4: generated or custom navigation with auto-hide, JS or CSS slide sizing, autoplay and auto-scroll, mobile-only mode, and built-in accessibility (live region, ARIA tabs dots, `inert` offscreen slides)

---

From here, every new carousel component in your project is a different HTML structure and config object pointed at the same shared JS.
