const sticky = (() => {
  const uniqueSelectorNames = new Set();

  let configs = [];
  let currentStuckHeight = 0;
  let initiated = false;
  let focusedConfigs = [];
  let focusedIndex = 0;
  let lastScrollPosition = 0;
  let scrollDirection = 1;

  function focusOnConfigs(newIndex) {
    if (newIndex < 0 || newIndex > configs.length) {
      return;
    }

    focusedIndex = newIndex;
    focusedConfigs = [
      newIndex > 0 ? configs[newIndex - 1] : undefined,
      configs[newIndex],
    ];
  }

  function getScrollDirection() {
    let currentScrollPosition = document.documentElement.scrollTop || window.scrollY;
    const direction = currentScrollPosition > lastScrollPosition ? 1 : 0;
    lastScrollPosition = currentScrollPosition <= 0 ? 0 : currentScrollPosition;
    return direction;
  }

  function makeArray(items) {
    return Array.isArray(items) ? items : [items];
  }

  function makeSticky(config, rect) {
    if(config.isSticky === true) {
      return;
    }

    config.rect = rect;
    config.isSticky = true;

    const { element } = config;
    config.originalStyle = element.getAttribute('style') || '';
    config.stickingPoint = window.scrollY;

    element.classList.add('stickified');
    element.style.top = `${currentStuckHeight}px`;
    element.style.zIndex = Math.min(100 + focusedIndex, 2147483647);

    const height = rect?.height || element.getBoundingClientRect().height;

    currentStuckHeight += height;

    focusOnConfigs(focusedIndex+1);
  }

  function makeUnSticky(config) {
    if(config.isSticky === false) {
      return;
    }

    config.isSticky = false;

    const { element } = config;

    element.setAttribute('style', config.originalStyle || '');
    element.classList.remove('stickified');

    const height = config.rect?.height || element.getBoundingClientRect().height;

    currentStuckHeight -= height; 
    delete config.originalStyle;

    focusOnConfigs(focusedIndex-1);
  }

  function onScroll() {
    scrollDirection = getScrollDirection();  // 0 or 1

    const focusedConfig = focusedConfigs[scrollDirection] || focusedConfigs[1] || focusedConfigs[0];

    if(!focusedConfig) {
      return resetElements();
    }

    const rect = focusedConfig.element?.getBoundingClientRect() || {};

    if(!focusedConfig.element || (rect.top === 0 && !focusedConfig.isSticky) ) {
      return resetElements();
    }

    if(focusedConfig.isSticky) {
      if(window.scrollY < focusedConfig.stickingPoint) {
        makeUnSticky(focusedConfig);
      }

      return;
    }

    if (rect.top <= currentStuckHeight) {
      makeSticky(focusedConfig, rect);
    } else {
      makeUnSticky(focusedConfig);
    }

  }

  function resetElements() {
    for (let i = configs.length - 1; i >= 0; i--) {
      const config = configs[i];

      if(document.contains(config.element)) {
        continue;
      }

      config.element = document.querySelector(config.selector);

      makeUnSticky(config);
    }
  }

  return {
    deregister: (selectorNames) => {
      const selectorNamesSet = new Set(makeArray(selectorNames));

      selectorNamesSet.forEach(selectorName => {
        sticky.unstick(selectorName);
        uniqueSelectorNames.delete(selectorName);
      });

      configs = configs.filter(config => !selectorNamesSet.has(config.selector));
    },
    register: (configsToRegister) => {

      makeArray(configsToRegister).forEach(config => {
          
        if (typeof config === 'string') {
          config = { selector: config };
        }

        if(uniqueSelectorNames.has(config.selector)) {
          return;
        }

        uniqueSelectorNames.add(config.selector);

        const element = config.element || document.querySelector(config.selector);

        if (!element) {
          return;
        }

        configs.push({
          ...config,
          element,
          isSticky: false,
          originalRect: element.getBoundingClientRect()
        });
          
      });
      
      configs.sort((a, b) => a.originalRect.top - b.originalRect.top);

      if(!initiated) {
        initiated = true;
        focusedConfigs = [configs[0]];
        window.addEventListener('scroll', onScroll);
      }
    },
    unstick: (selectorName) => {
      const configToUnstick = configs.find(config => config.selector === selectorName);

      if(!configToUnstick) {
        return;
      }

      makeUnSticky(configToUnstick);
    }
  };
})();

export default sticky;