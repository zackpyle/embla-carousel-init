/**
 * Generic Embla Carousel Module
 * 
 * Creates accessible, configurable carousel instances.
 * 
 * Usage Examples:
 * 
 * // Auto-generate navigation
 * initEmblaCarousel('.carousel', {
 *   loop: true,
 *   enableButtons: true,
 *   enableDots: true
 * });
 * 
 * // Auto-scroll carousel (ticker/continuous)
 * initEmblaCarousel('.carousel', {
 *   loop: true,
 *   autoScroll: true,
 *   autoScrollSpeed: 1,
 *   autoScrollStopOnInteraction: false
 * });
 * 
 * // Autoplay carousel (timed advances, pauses on hover)
 * initEmblaCarousel('.carousel', {
 *   loop: true,
 *   autoplay: true,
 *   autoplayDelay: 4000,
 *   autoplayStopOnInteraction: true,
 *   autoplayStopOnMouseEnter: true
 * });
 * 
 * // Fading slideshow (one slide per view, cross-fades instead of sliding)
 * initEmblaCarousel('.carousel', {
 *   loop: true,
 *   fade: true,
 *   autoplay: true,
 *   autoplayDelay: 5000
 * });
 * 
 * // Custom navigation selectors
 * initEmblaCarousel('.carousel', {
 *   enableButtons: true,
 *   prevButtonSelector: '.my-prev',
 *   nextButtonSelector: '.my-next'
 * });
 * 
 * // Mobile-only carousel (grid on desktop)
 * initEmblaCarousel('.carousel', {
 *   mobileOnly: true,
 *   mobileBreakpoint: '(max-width: 767px)',
 *   enableButtons: true
 * });
 */

import EmblaCarousel from 'https://cdn.jsdelivr.net/npm/embla-carousel@8.1.4/esm/embla-carousel.esm.js';

// Fixed class name added to the viewport when there's nothing left to navigate to.
// Kept as a constant (rather than per-instance configurable) so every carousel using
// this module shares the same CSS contract.
const NO_NAV_CLASS = 'embla--no-nav';

// Feature-detect the native `inert` attribute once at module load, used to remove
// offscreen slides from the tab order and from assistive tech.
const SUPPORTS_INERT = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

/**
 * Initialize an Embla carousel instance
 * @param {string|HTMLElement} viewportSelectorOrElement - CSS selector or DOM element for the carousel viewport
 * @param {Object} config - Configuration object
 * @param {boolean} config.mobileOnly - Enable carousel only on mobile, disable on desktop (default: false)
 * @param {string} config.mobileBreakpoint - Media query for when to enable carousel (default: '(max-width: 767px)')
 * @param {string} config.containerSelector - CSS selector for slides container (default: '.embla__container')
 * @param {string} config.slideSelector - CSS selector for individual slides (default: '.embla__slide')
 * @param {number} config.slidesVisible - Number of slides visible at once (optional, JS sizing)
 * @param {number} config.slideWidth - Fixed width for each slide in pixels (optional, JS sizing)
 * @param {number} config.slideGap - Gap between slides in pixels (optional, only with slidesVisible/slideWidth)
 * @param {boolean} config.loop - Enable infinite loop (default: false)
 * @param {string} config.align - Slide alignment: 'start', 'center', 'end' (default: 'start')
 * @param {number} config.slidesToScroll - Number of slides to scroll at once (default: 1)
 * @param {boolean} config.skipSnaps - Skip snaps without slides (default: false)
 * @param {boolean} config.dragFree - Enable free-drag scrolling (default: false)
 * @param {string} config.containScroll - Contain scroll behavior (default: 'trimSnaps')
 * @param {Object} config.breakpoints - Responsive breakpoints with media queries (default: {})
 * @param {boolean} config.enableButtons - Enable prev/next buttons (default: false)
 * @param {string} config.prevButtonSelector - CSS selector for custom previous button (optional)
 * @param {string} config.nextButtonSelector - CSS selector for custom next button (optional)
 * @param {boolean} config.enableDots - Enable dot navigation (default: false)
 * @param {string} config.dotsContainerSelector - CSS selector for custom dots container (optional)
 * @param {boolean} config.autoScroll - Enable auto-scroll plugin (continuous ticker) (default: false)
 * @param {number} config.autoScrollSpeed - Auto-scroll speed, 0.5 = half speed, 2 = double speed (default: 1)
 * @param {boolean} config.autoScrollStopOnInteraction - Stop auto-scroll on user interaction (default: true)
 * @param {boolean} config.autoScrollStopOnMouseEnter - Stop auto-scroll on mouse enter (default: false)
 * @param {boolean} config.autoplay - Enable autoplay plugin (timed advances) (default: false)
 * @param {number} config.autoplayDelay - Time in ms between slide advances (default: 4000)
 * @param {boolean} config.autoplayStopOnInteraction - Stop autoplay after user drags (default: false)
 * @param {boolean} config.autoplayStopOnMouseEnter - Pause autoplay on mouse enter (default: false)
 * @param {boolean} config.fade - Enable fade plugin: slides cross-fade in place instead of sliding.
 *   Each slide must fill the viewport (flex: 0 0 100%). Don't combine with autoScroll. (default: false)
 * @param {string} config.announcement - Screen reader announcement template (default: 'Slide {current} of {total}')
 * @param {boolean} config.enableNoNavClass - Whether to toggle the `embla--no-nav` class on the viewport
 *   when there is only 1 scroll position (i.e. all slides already fit on screen, so there's nothing left
 *   to navigate to). Set to false to disable this behavior for a specific carousel. (default: true)
 * @returns {Object|null} - Embla API instance or null if initialization failed
 */
export async function initEmblaCarousel(viewportSelectorOrElement, config = {}) {
	const viewportNode = typeof viewportSelectorOrElement === 'string'
	  ? document.querySelector(viewportSelectorOrElement)
	  : viewportSelectorOrElement;

	// Derive a stable label for logging, whether a string or element was passed
	const viewportLabel = typeof viewportSelectorOrElement === 'string'
	  ? viewportSelectorOrElement
	  : viewportSelectorOrElement.className
		? `.${viewportSelectorOrElement.className.trim().split(/\s+/).join('.')}`
		: viewportSelectorOrElement.tagName.toLowerCase();

	if (!viewportNode) {
		console.warn(`Embla carousel viewport not found:`, viewportSelectorOrElement);
		return null;
	}

	// A string selector only ever initializes the FIRST match (document.querySelector
	// behavior). This is easy to miss when a component is repeated by a CMS loop
	// (e.g. several testimonial carousels on one page) â€” warn loudly rather than
	// silently leaving the other instances as static, un-initialized markup.
	if (typeof viewportSelectorOrElement === 'string') {
		const matchCount = document.querySelectorAll(viewportSelectorOrElement).length;
		if (matchCount > 1) {
			console.warn(
				`Embla carousel selector "${viewportSelectorOrElement}" matches ${matchCount} elements, but only the first will be initialized. ` +
				`If this component repeats (e.g. a CMS loop), call initEmblaCarousel() once per element instead: ` +
				`document.querySelectorAll('${viewportSelectorOrElement}').forEach(el => initEmblaCarousel(el, { ... }));`
			);
		}
	}
  
  // Merge defaults with user config
  const settings = {
    mobileOnly: config.mobileOnly || false,
    mobileBreakpoint: config.mobileBreakpoint || '(max-width: 767px)',
    containerSelector: config.containerSelector || '.embla__container',
    slideSelector: config.slideSelector || '.embla__slide',
    slidesVisible: config.slidesVisible || null,
    slideWidth: config.slideWidth || null,
    slideGap: config.slideGap !== undefined ? config.slideGap : null,
    loop: config.loop !== undefined ? config.loop : false,
    align: config.align || 'start',
    slidesToScroll: config.slidesToScroll || 1,
    skipSnaps: config.skipSnaps !== undefined ? config.skipSnaps : false,
    dragFree: config.dragFree !== undefined ? config.dragFree : false,
    containScroll: config.containScroll || 'trimSnaps',
    breakpoints: config.breakpoints || {},
    enableButtons: config.enableButtons || false,
    prevButtonSelector: config.prevButtonSelector || null,
    nextButtonSelector: config.nextButtonSelector || null,
    enableDots: config.enableDots || false,
    dotsContainerSelector: config.dotsContainerSelector || null,
    // Auto-scroll (continuous ticker)
    autoScroll: config.autoScroll || false,
    autoScrollSpeed: config.autoScrollSpeed !== undefined ? config.autoScrollSpeed : 1,
    autoScrollStopOnInteraction: config.autoScrollStopOnInteraction !== undefined ? config.autoScrollStopOnInteraction : true,
    autoScrollStopOnMouseEnter: config.autoScrollStopOnMouseEnter !== undefined ? config.autoScrollStopOnMouseEnter : false,
    // Autoplay (timed advances)
    autoplay: config.autoplay || false,
    autoplayDelay: config.autoplayDelay !== undefined ? config.autoplayDelay : 4000,
    autoplayStopOnInteraction: config.autoplayStopOnInteraction !== undefined ? config.autoplayStopOnInteraction : false,
    autoplayStopOnMouseEnter: config.autoplayStopOnMouseEnter !== undefined ? config.autoplayStopOnMouseEnter : true,
    // Fade (cross-fade transitions)
    fade: config.fade || false,
    announcement: config.announcement || 'Slide {current} of {total}',
    // Whether to toggle the no-nav class on the viewport. Set to false per-instance to disable.
    enableNoNavClass: config.enableNoNavClass !== undefined ? config.enableNoNavClass : true
  };
  
  const containerNode = viewportNode.querySelector(settings.containerSelector);
  
  if (!containerNode) {
    console.warn(`Embla container not found inside ${viewportLabel}`);
    return null;
  }

  const slideCount = containerNode.querySelectorAll(settings.slideSelector).length;
  
  if (slideCount === 0) {
    console.warn(`No slides found in ${viewportLabel}`);
    return null;
  }
  
  // Check if JS sizing is enabled (either slideWidth or slidesVisible provided)
  const jsSize = settings.slideWidth !== null || settings.slidesVisible !== null;
  
  let emblaApi = null;
  let liveRegion = null;
  let prevButton = null;
  let nextButton = null;
  let dotsContainer = null;
  let dotButtons = [];
  let buttonsGenerated = false;
  let dotsGenerated = false;
  
  /**
   * Check if carousel should be active based on mobileOnly setting
   */
  function shouldBeActive() {
    if (!settings.mobileOnly) return true;
    return window.matchMedia(settings.mobileBreakpoint).matches;
  }
  
  /**
   * Apply slide widths based on slidesVisible OR slideWidth (only if configured)
   */
  function applySlideSizes() {
    // Skip if no JS sizing configured
    if (!jsSize) {
      // console.log(`${viewportLabel}: Carousel sizing controlled by CSS`);
      return;
    }
    
    const slides = containerNode.querySelectorAll(settings.slideSelector);
    
    // Get current viewport width
    const viewportWidth = viewportNode.offsetWidth;
    
    // Determine which breakpoint settings to use
    let currentSettings = { ...settings };
    
    // Check each breakpoint and merge settings if it matches
    Object.keys(settings.breakpoints).forEach(mediaQuery => {
      if (window.matchMedia(mediaQuery).matches) {
        currentSettings = {
          ...currentSettings,
          ...settings.breakpoints[mediaQuery]
        };
      }
    });
    
    const { slidesVisible, slideWidth, slideGap, loop } = currentSettings;
    
    // Use default gap of 16 if not specified
    const actualGap = slideGap !== null ? slideGap : 16;
    
    let calculatedSlideWidth;
    
    // Determine slide width based on configuration
    if (slideWidth) {
      // Fixed width mode
      calculatedSlideWidth = slideWidth;
      // console.log(`${viewportLabel}: ${slideWidth}px fixed width, ${actualGap}px gap`);
    } else if (slidesVisible) {
      // Calculate based on number of slides visible
      const totalGapWidth = actualGap * (slidesVisible - 1);
      calculatedSlideWidth = (viewportWidth - totalGapWidth) / slidesVisible;
      // console.log(`${viewportLabel}: ${slidesVisible} visible, ${actualGap}px gap, ${calculatedSlideWidth.toFixed(2)}px per slide`);
    }
    
    // Apply styles to container
    containerNode.style.display = 'flex';
    
    // Use margin-right for loop mode (better for clone boundaries)
    // Use gap for non-loop mode (cleaner)
    if (loop) {
      containerNode.style.gap = '0';
      // console.log(`${viewportLabel}: Using margin-right (loop mode)`);
    } else {
      containerNode.style.gap = `${actualGap}px`;
      // console.log(`${viewportLabel}: Using gap (non-loop mode)`);
    }
    
    // Apply width and spacing to each slide
    slides.forEach(slide => {
      slide.style.flex = `0 0 ${calculatedSlideWidth}px`;
      slide.style.minWidth = '0';
      
      if (loop) {
        slide.style.marginRight = `${actualGap}px`;
      } else {
        slide.style.marginRight = '0';
      }
    });
  }
  
  /**
   * Create prev/next buttons.
   * removeButtons() queries the DOM directly, so stale button wrappers left
   * by rapid Etch reInit calls are always cleaned up before rebuilding.
   */
  function createButtons() {
    // Always remove any existing buttons before rebuilding
    removeButtons();

    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'embla__buttons';
    
    prevButton = document.createElement('button');
    prevButton.className = 'embla__button embla__button--prev';
    prevButton.setAttribute('type', 'button');
    prevButton.setAttribute('aria-label', 'Previous slide');
    prevButton.innerHTML = '<span class="embla__button-icon embla__button-icon--prev" aria-hidden="true"></span>';
    
    nextButton = document.createElement('button');
    nextButton.className = 'embla__button embla__button--next';
    nextButton.setAttribute('type', 'button');
    nextButton.setAttribute('aria-label', 'Next slide');
    nextButton.innerHTML = '<span class="embla__button-icon" aria-hidden="true"></span>';
    
    buttonsWrapper.appendChild(prevButton);
    buttonsWrapper.appendChild(nextButton);
    
    viewportNode.appendChild(buttonsWrapper);
    buttonsGenerated = true;
    
    // console.log(`${viewportLabel}: Generated prev/next buttons`);
  }
  
  /**
   * Remove existing prev/next buttons.
   * Queries the DOM directly rather than relying on potentially stale
   * variable state â€” handles cases where Etch replaces the DOM between calls.
   */
  function removeButtons() {
    viewportNode.querySelectorAll('.embla__buttons').forEach(el => el.remove());
    prevButton = null;
    nextButton = null;
    buttonsGenerated = false;
  }

  /**
   * Remove existing dots.
   * Queries the DOM directly rather than relying on potentially stale
   * variable state â€” handles cases where Etch replaces the DOM between calls.
   */
  function removeDots() {
    const existing = viewportNode.querySelector('.embla__dots');
    if (existing) existing.remove();
    dotsContainer = null;
    dotButtons = [];
    dotsGenerated = false;
  }
  
  /**
   * Create dot navigation.
   * removeDots() queries the DOM directly, so stale dot containers left
   * by rapid Etch reInit calls are always cleaned up before rebuilding.
   */
  function createDots() {
    // Always remove any existing dots before rebuilding
    removeDots();
    
    dotsContainer = document.createElement('div');
    dotsContainer.className = 'embla__dots';
    dotsContainer.setAttribute('role', 'tablist');
    dotsContainer.setAttribute('aria-label', 'Carousel navigation');
    
    const scrollSnaps = emblaApi.scrollSnapList();
    
    dotButtons = scrollSnaps.map((_, index) => {
      const button = document.createElement('button');
      button.className = 'embla__dot';
      button.setAttribute('type', 'button');
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-label', `Go to slide ${index + 1}`);
      button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      // Roving tabindex: only the active dot is in the tab order, per the ARIA tabs pattern.
      // updateDots() keeps this in sync as selection changes.
      button.tabIndex = index === 0 ? 0 : -1;
      
      button.addEventListener('click', () => {
        emblaApi.scrollTo(index);
      });
      
      dotsContainer.appendChild(button);
      return button;
    });

    // Arrow/Home/End navigation, per the ARIA tabs pattern's keyboard interaction model.
    dotsContainer.addEventListener('keydown', handleDotsKeydown);
    
    viewportNode.appendChild(dotsContainer);
    dotsGenerated = true;
    
    // console.log(`${viewportLabel}: Generated ${dotButtons.length} dot buttons`);
  }
  
  /**
   * Update dot states
   */
  function updateDots() {
    if (!dotsContainer || dotButtons.length === 0) return;
    
    const selectedIndex = emblaApi.selectedScrollSnap();
    
    dotButtons.forEach((dot, index) => {
      if (index === selectedIndex) {
        dot.classList.add('embla__dot--active');
        dot.setAttribute('aria-selected', 'true');
        dot.tabIndex = 0;
      } else {
        dot.classList.remove('embla__dot--active');
        dot.setAttribute('aria-selected', 'false');
        dot.tabIndex = -1;
      }
    });
  }

  /**
   * Arrow/Home/End keyboard navigation for the dots tablist. Left/Right move to the
   * adjacent dot (wrapping only when loop is enabled); Home/End jump to the first/last.
   * Per the ARIA tabs pattern, arrow keys both move focus AND activate the tab
   * (automatic activation), so this scrolls the carousel immediately rather than
   * waiting for a separate activation key.
   */
  function handleDotsKeydown(event) {
    const currentIndex = dotButtons.indexOf(event.target);
    if (currentIndex === -1) return; // Not a dot, ignore

    let newIndex;

    switch (event.key) {
      case 'ArrowLeft':
        newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = settings.loop ? dotButtons.length - 1 : 0;
        break;
      case 'ArrowRight':
        newIndex = currentIndex + 1;
        if (newIndex >= dotButtons.length) newIndex = settings.loop ? 0 : dotButtons.length - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = dotButtons.length - 1;
        break;
      default:
        return; // Not a key this handler cares about, let it propagate normally
    }

    event.preventDefault();
    emblaApi.scrollTo(newIndex);
    dotButtons[newIndex].focus();
  }

  /**
   * Toggle NO_NAV_CLASS on the viewport depending on whether there's anywhere left to
   * navigate to. scrollSnapList() returns one entry per "page" the carousel can
   * land on â€” if there's only one, every slide already fits in view, so nav
   * (buttons/dots, generated or custom) has nothing useful to do. In that case
   * we add NO_NAV_CLASS so CSS can hide the nav (nav is visible by default, hidden
   * when this class is present).
   * Runs on init and on every reInit (resize, prop change, slide count change, etc.)
   * so it stays correct as things change.
   */
  function updateNavVisibility() {
    if (!settings.enableNoNavClass) return; // Opted out via config
    if (!emblaApi) return;

    const hasNothingToScrollTo = emblaApi.scrollSnapList().length <= 1;
    viewportNode.classList.toggle(NO_NAV_CLASS, hasNothingToScrollTo);
  }

  /**
   * Keep slides that are scrolled out of view out of the tab order and hidden from
   * assistive tech, using the native `inert` attribute. Without this, a keyboard or
   * screen reader user can reach interactive content (links, buttons) inside a slide
   * that isn't currently visible, which is one of the most common carousel a11y bugs.
   * Runs on select/settle/reInit so it stays correct as the carousel moves and resizes.
   */
  function updateSlideInertness() {
    if (!SUPPORTS_INERT) return; // Older browsers just won't get this protection
    if (!emblaApi) return;

    const slides = containerNode.querySelectorAll(settings.slideSelector);
    // Faded slides are stacked in place, so they all count as "in view" — use the selected slide instead
    const inViewIndexes = settings.fade
      ? new Set([emblaApi.selectedScrollSnap()])
      : new Set(emblaApi.slidesInView());

    slides.forEach((slide, index) => {
      slide.inert = !inViewIndexes.has(index);
    });
  }
  
  /**
   * Initialize Embla carousel
   */
  async function initEmbla() {
    if (emblaApi) return; // Already initialized

    // Apply initial slide sizes (only if JS sizing enabled)
    applySlideSizes();

    // Remove any stale live region left by a previous closure before creating a new one
    viewportNode.querySelectorAll('.embla__live-region').forEach(el => el.remove());

    liveRegion = document.createElement('div');
    liveRegion.className = 'embla__live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('class', 'sr-only embla__live-region');
    viewportNode.appendChild(liveRegion);

    const options = {
      container: settings.containerSelector,
      align: settings.align,
      loop: settings.loop,
      skipSnaps: settings.skipSnaps,
      dragFree: settings.dragFree,
      containScroll: settings.containScroll,
      slidesToScroll: settings.slidesToScroll,
      breakpoints: settings.breakpoints
    };

    // Prepare plugins array
    const plugins = [];
    
    // Conditionally import and add AutoScroll plugin if enabled (continuous ticker)
    if (settings.autoScroll) {
      const { default: AutoScroll } = await import('https://cdn.jsdelivr.net/npm/embla-carousel-auto-scroll@8.1.4/+esm');
      
      plugins.push(
        AutoScroll({
          speed: settings.autoScrollSpeed,
          stopOnInteraction: settings.autoScrollStopOnInteraction,
          stopOnMouseEnter: settings.autoScrollStopOnMouseEnter
        })
      );
      // console.log(`${viewportLabel}: AutoScroll enabled (speed: ${settings.autoScrollSpeed})`);
    }

    // Conditionally import and add Autoplay plugin if enabled (timed advances)
    if (settings.autoplay) {
      const { default: Autoplay } = await import('https://cdn.jsdelivr.net/npm/embla-carousel-autoplay@8.1.4/+esm');

      plugins.push(
        Autoplay({
          delay: settings.autoplayDelay,
          stopOnInteraction: settings.autoplayStopOnInteraction,
          stopOnMouseEnter: settings.autoplayStopOnMouseEnter,
        })
      );

      // console.log(`${viewportLabel}: Autoplay enabled (delay: ${settings.autoplayDelay}ms)`);
    }

    // Conditionally import and add Fade plugin if enabled (cross-fade transitions)
    if (settings.fade) {
      const { default: Fade } = await import('https://cdn.jsdelivr.net/npm/embla-carousel-fade@8.1.4/+esm');

      plugins.push(Fade());
    }

    emblaApi = EmblaCarousel(viewportNode, options, plugins);

    // Set the initial nav-visibility state, then keep it correct on every
    // reInit (resize, breakpoint change, slide count change, etc.)
    updateNavVisibility();
    emblaApi.on('reInit', updateNavVisibility);

    // Set initial slide inertness, then keep it correct as the carousel moves/resizes
    updateSlideInertness();
    emblaApi.on('select', updateSlideInertness);
    emblaApi.on('settle', updateSlideInertness);
    emblaApi.on('reInit', updateSlideInertness);
    
    // Handle buttons
    if (settings.enableButtons) {
      if (settings.prevButtonSelector && settings.nextButtonSelector) {
        // Use custom buttons
        prevButton = document.querySelector(settings.prevButtonSelector);
        nextButton = document.querySelector(settings.nextButtonSelector);
        // console.log(`${viewportLabel}: Using custom buttons`);
      } else {
        // Generate buttons
        createButtons();
      }
    }
    
    if (prevButton && nextButton) {
      prevButton.addEventListener('click', () => {
        emblaApi.scrollPrev();
      });

      nextButton.addEventListener('click', () => {
        emblaApi.scrollNext();
      });

      const updateButtonStates = () => {
        if (!settings.loop) {
          prevButton.disabled = !emblaApi.canScrollPrev();
          nextButton.disabled = !emblaApi.canScrollNext();
        }
      };

      emblaApi.on('select', updateButtonStates);
      emblaApi.on('init', updateButtonStates);
      emblaApi.on('reInit', updateButtonStates);
      
      // Show buttons
      if (prevButton) prevButton.style.display = '';
      if (nextButton) nextButton.style.display = '';
    }
    
    // Handle dots
    if (settings.enableDots) {
      if (settings.dotsContainerSelector) {
        // Use custom dots container
        dotsContainer = document.querySelector(settings.dotsContainerSelector);
        if (dotsContainer) {
          dotButtons = Array.from(dotsContainer.querySelectorAll('button'));
          
          // Add click handlers to existing dots
          dotButtons.forEach((dot, index) => {
            dot.addEventListener('click', () => {
              emblaApi.scrollTo(index);
            });
          });

          // Arrow/Home/End navigation, same as generated dots
          dotsContainer.addEventListener('keydown', handleDotsKeydown);

          // Establish correct initial aria-selected/tabindex state immediately,
          // rather than waiting for the first 'select' event
          updateDots();
          
          // console.log(`${viewportLabel}: Using custom dots`);
        }
      } else {
        // Generate dots after Embla init (need scrollSnapList)
        emblaApi.on('init', () => {
          createDots();
          updateDots();
        });
        
        // Recreate dots on reInit (e.g., after resize or Etch prop change).
        // removeDots() queries the DOM directly, so stale containers are
        // always cleaned up even if variable state is out of sync.
        emblaApi.on('reInit', () => {
          createDots();
          updateDots();
        });
      }
      
      // Update dot states on select
      emblaApi.on('select', updateDots);
    }

    // Announce slide changes to screen readers, once the carousel actually settles.
    // Using 'settle' (rather than 'select') avoids multiple announcements queuing up
    // when a drag passes through several slides before coming to rest.
    // Skip if autoScroll is enabled to avoid announcement spam
    if (!settings.autoScroll) {
      emblaApi.on('settle', () => {
        const currentIndex = emblaApi.selectedScrollSnap() + 1;
        liveRegion.textContent = settings.announcement
          .replace('{current}', currentIndex)
          .replace('{total}', slideCount);
      });
    }

    // console.log(`Embla carousel initialized successfully: ${viewportLabel}`);
  }
  
  /**
   * Destroy Embla carousel
   */
  function destroyEmbla() {
    if (!emblaApi) return; // Not initialized
    
    // console.log(`Destroying Embla carousel: ${viewportLabel}`);
    
    emblaApi.destroy();
    emblaApi = null;

    // Reset the no-nav class since there's no longer an Embla instance
    // driving it (relevant for mobileOnly carousels toggling on/off).
    if (settings.enableNoNavClass) {
      viewportNode.classList.remove(NO_NAV_CLASS);
    }

    // Clear inert from all slides since there's no Embla instance to keep it in sync
    if (SUPPORTS_INERT) {
      containerNode.querySelectorAll(settings.slideSelector).forEach(slide => {
        slide.inert = false;
      });
    }
    
    // Remove live region
    if (liveRegion && liveRegion.parentNode) {
      liveRegion.parentNode.removeChild(liveRegion);
      liveRegion = null;
    }
    
    // Remove or hide buttons
    if (buttonsGenerated) {
      removeButtons();
    } else if (prevButton && nextButton) {
      prevButton.style.display = 'none';
      nextButton.style.display = 'none';
    }
    
    // Remove dots
    removeDots();
    
    // Reset inline styles if JS sizing was used
    if (jsSize) {
      const slides = containerNode.querySelectorAll(settings.slideSelector);
      containerNode.style.display = '';
      containerNode.style.gap = '';
      slides.forEach(slide => {
        slide.style.flex = '';
        slide.style.minWidth = '';
        slide.style.marginRight = '';
      });
    }
    
    // Reset transform
    containerNode.style.transform = '';
  }
  
  /**
   * Handle responsive toggling (mobile-only mode)
   */
  function handleResponsiveToggle() {
    const shouldInit = shouldBeActive();
    
    if (shouldInit && !emblaApi) {
      initEmbla();
    } else if (!shouldInit && emblaApi) {
      destroyEmbla();
    }
  }
  
  // Initial setup
  if (settings.mobileOnly) {
    // Mobile-only mode: check breakpoint and toggle
    handleResponsiveToggle();
    
    // Listen for resize to toggle carousel on/off
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResponsiveToggle, 150);
    });
  } else {
    // Always-on mode: initialize immediately and wait for it
    await initEmbla();
    
    // Handle resize for JS sizing or dots
    if (jsSize || settings.enableDots) {
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (emblaApi) {
            if (jsSize) {
              applySlideSizes();
            }
            emblaApi.reInit();
            // console.log(`${viewportLabel}: Resized and reinitialized`);
          }
        }, 150);
      });
    }
  }

  // Return API (might be null if mobileOnly and currently on desktop)
  return emblaApi;
}