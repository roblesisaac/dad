const sticky = (() => {
  const configs = [];
  const uniqueSelectorNames = new Set();

  let currentStuckHeight = 0;
  let initiated = false;
  let focusedConfigs = [];
  let focusedIndex = 0;
  let lastScrollPosition = 0;
  let scrollDirection = 1;

  function focusOnConfigs(newIndex) {
    if(newIndex < 0 || newIndex > configs.length) {
      return;
    }

    focusedIndex = newIndex;
    focusedConfigs = [configs[newIndex-1], configs[newIndex]];
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

  function makeSticky(config) {
    if(config.isSticky === true) {
      return;
    }
        
    config.isSticky = true;

    const { element } = config;
    config.originalStyle = element.getAttribute('style') || '';
    config.stickingPoint = window.scrollY;

    element.classList.add('stickified');
    element.style.top = `${currentStuckHeight}px`;
    element.style.zIndex = 100 + focusedIndex;

    currentStuckHeight += element.getBoundingClientRect().height;

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

    currentStuckHeight -= element.getBoundingClientRect().height; 
    delete config.originalStyle;

    focusOnConfigs(focusedIndex-1);
  }

  function onScroll() {
    scrollDirection = getScrollDirection();  // 0 or 1

    const focusedConfig = focusedConfigs[scrollDirection] || focusedConfigs[1] || focusedConfigs[0];

    const { top } = focusedConfig.element?.getBoundingClientRect() || {};

    if(!focusedConfig.element || (top === 0 && !focusedConfig.isSticky) ) {
      // console.log(focusedConfig.selector);
      // focusedConfig.element = document.querySelector(focusedConfig.selector);
      resetElements();
      return;
    }

    if(focusedConfig.isSticky) {
      if(window.scrollY < focusedConfig.stickingPoint) {
        makeUnSticky(focusedConfig);
      }

      return;
    }

    if (top <= currentStuckHeight) {
      makeSticky(focusedConfig);
    } else {
      makeUnSticky(focusedConfig);
    }

  }

  function resetElements() {
    for (let i = configs.length - 1; i >= 0; i--) {
      const config = configs[i];

      if(document.contains(config.element)) {
        console.log('has', config.selector);
        continue;
      }

      console.log('missing', config.selector);

      config.element = document.querySelector(config.selector);

      makeUnSticky(config);
    }
  }

  return {
    deregister: (selectorNames) => {      
      makeArray(selectorNames).forEach(selectorName => {
        sticky.unstick(selectorName);
        uniqueSelectorNames.delete(selectorName);
      });

      configs = configs.filter(config => !makeArray(selectorNames).includes(config.selector));
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