const sticky = (() => {
  const uniqueSelectorNames = new Set();

  let configs = [];
  let currentStuckHeight = 0;
  let initiated = false;
  let focusedConfigs = [];
  let focusedIndex = 0;
  let lastScrollPosition = 0;
  let scrollDirection = 1;
  let resetInProgress = false;
  let isTicking = false; // for rAF throttling
  const POSITION_THRESHOLD = 2; // pixel threshold to avoid toggling for minor differences

  function calcCurrentStuckHeight() {
    return currentStuckHeight;
  }

  function findElement(selector) {
    return selector.includes('.')
      ? document.querySelector(selector)
      : document.getElementById(selector);
  }

  function getScrollDirection() {
    const currentScrollPosition =
      document.documentElement.scrollTop || window.scrollY;
    // Only change direction if the scroll difference is more than a threshold
    const direction =
      currentScrollPosition - lastScrollPosition > POSITION_THRESHOLD ? 1 : 0;
    lastScrollPosition = currentScrollPosition <= 0 ? 0 : currentScrollPosition;
    return direction;
  }

  function makeArray(items) {
    return Array.isArray(items) ? items : [items];
  }

  function makeSticky(config, rect) {
    if (config.isSticky === true) {
      return;
    }

    config.rect = rect;
    config.isSticky = true;
    const { element } = config;
    config.originalStyle = element.getAttribute("style") || "";
    config.stickingPoint = window.scrollY;

    // Add a class and set an explicit top value. Also hint the browser.
    element.classList.add("stickified");
    element.style.top = `${currentStuckHeight}px`;
    element.style.zIndex = Math.min(100 - focusedIndex, 2147483647);
    element.style.willChange = "top";

    const height = rect?.height || element.getBoundingClientRect().height;
    currentStuckHeight += height;

    shiftFocus(focusedIndex + 1);
  }

  function makeUnSticky(config) {
    if (config.isSticky === false) {
      return;
    }

    config.isSticky = false;
    const { element } = config;

    element.setAttribute("style", config.originalStyle || "");
    element.classList.remove("stickified");
    // Reset the will-change hint
    element.style.willChange = "";

    const height =
      config.rect?.height || element.getBoundingClientRect().height;
    currentStuckHeight -= height;
    delete config.originalStyle;

    shiftFocus(focusedIndex - 1);
  }

  // This version uses requestAnimationFrame so we don’t recalc on every scroll event.
  function onScroll() {
    if (!isTicking) {
      requestAnimationFrame(() => {
        updateSticky();
        isTicking = false;
      });
      isTicking = true;
    }
  }

  // Main update function called at most once per animation frame.
  function updateSticky() {
    scrollDirection = getScrollDirection(); // 0 or 1

    // Pick one of the two focused configs based on the scroll direction.
    const focusedConfig =
      focusedConfigs[scrollDirection] ||
      focusedConfigs[1] ||
      focusedConfigs[0];

    // Do nothing if a reset is in progress.
    if (resetInProgress) {
      return;
    }

    // If there isn’t a valid config, try to reset.
    if (!focusedConfig) {
      return resetElements();
    }

    const rect =
      focusedConfig.element?.getBoundingClientRect() || {};

    // If the element is missing or its rect is at the top (but isn’t sticky) then reset.
    if (!focusedConfig.element || (rect.top === 0 && !focusedConfig.isSticky)) {
      return resetElements();
    }

    if (focusedConfig.isSticky) {
      if (window.scrollY < focusedConfig.stickingPoint) {
        makeUnSticky(focusedConfig);
      }
      return;
    }

    // Only stick if the element’s top is within the threshold (avoiding jitter)
    if (rect.top <= currentStuckHeight + POSITION_THRESHOLD) {
      makeSticky(focusedConfig, rect);
    } else {
      makeUnSticky(focusedConfig);
    }
  }

  function resetElements() {
    resetInProgress = true;

    // Go backwards through the config list so that un-sticky items are reset first.
    for (let i = configs.length - 1; i >= 0; i--) {
      const config = configs[i];

      if (document.contains(config.element)) {
        continue;
      }

      // Re-find the element and force it to unstick.
      config.element = findElement(config.selector);
      makeUnSticky(config);
    }

    resetInProgress = false;
  }

  function shiftFocus(newIndex) {
    if (newIndex < 0 || newIndex > configs.length) {
      currentStuckHeight = 0;
      return;
    }

    focusedIndex = newIndex;
    focusedConfigs = [
      newIndex > 0 ? configs[newIndex - 1] : undefined,
      configs[newIndex]
    ];
  }

  return {
    configs,
    calcCurrentStuckHeight,
    deregister: (selectorNames) => {
      const selectorNamesSet = new Set(makeArray(selectorNames));
      let deregistered = 0;

      selectorNamesSet.forEach((selectorName) => {
        if (!uniqueSelectorNames.has(selectorName)) {
          return;
        }

        sticky.unstick(selectorName);
        uniqueSelectorNames.delete(selectorName);
        deregistered++;
      });

      if (!deregistered) {
        return;
      }

      configs = configs.filter(
        (config) => !selectorNamesSet.has(config.selector)
      );
    },
    register: (configsToRegister) => {
      makeArray(configsToRegister).forEach((config) => {
        if (typeof config === "string") {
          config = { selector: config };
        }

        if (uniqueSelectorNames.has(config.selector)) {
          return;
        }

        uniqueSelectorNames.add(config.selector);

        const element = config.element || findElement(config.selector);
        // If the element exists, get its initial rect.
        const rect = element ? element.getBoundingClientRect() : {};

        configs.push({
          ...config,
          element,
          isSticky: false,
          originalRect: rect
        });
      });
      
      // Sort sticky configs top-to-bottom.
      configs.sort((a, b) => a.originalRect?.top - b.originalRect?.top);

      if (!initiated) {
        initiated = true;
        window.addEventListener("scroll", onScroll, { passive: true });
        return;
      }

      shiftFocus(focusedIndex);
    },
    unstick: (selectorName) => {
      const configToUnstick = configs.find(
        (config) => config.selector === selectorName
      );
      if (!configToUnstick) {
        return;
      }
      makeUnSticky(configToUnstick);
    }
  };
})();

export default sticky;