const sticky = (() => {
  const configs = [];
  let currentStuckHeight = 0;
  let initiated = false;
  let focusedConfig;
  let focusedIndex = 0;
  let focusDirection = 1;
  let lastScrollPosition = 0;
  let scrollDirection = 1;

  function focusConfig(n) {
    focusDirection = n;

    if(n < 0) {
      if(focusedIndex === 0) {
        return;
      }

      focusedConfig = configs[--focusedIndex];
      return;
    }

    if(focusedIndex < configs.length-1) {
      focusedConfig = configs[++focusedIndex];
    }
  }

  function getScrollDirection() {
    let currentScrollPosition = document.documentElement.scrollTop || window.scrollY;
    let newScrollDirection = currentScrollPosition > lastScrollPosition ? 1 : -1;

    lastScrollPosition = currentScrollPosition <= 0 ? 0 : currentScrollPosition;

    if(scrollDirection === newScrollDirection) {
      return;
    }

    scrollDirection = newScrollDirection;
    focusConfig(newScrollDirection);
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
    config.breakingPoint = window.scrollY;
    element.classList.add('stickified');
    element.style.top = `${currentStuckHeight}px`;
    element.style.zIndex = 100 + currentStuckHeight;
    element.style.width = element.offsetWidth + 'px';
    element.style.left = element.getBoundingClientRect().left + 'px';
    currentStuckHeight += element.getBoundingClientRect().height;

    focusConfig(1);
  }

  function makeUnSticky(config) {
    if(config.isSticky === false) {
      return;
    }

    const { element } = config;

    config.isSticky = false;
    element.setAttribute('style', config.originalStyle || '');
    element.classList.remove('stickified');
    currentStuckHeight -= element.getBoundingClientRect().height; 
    delete config.originalStyle;

    focusConfig(-1);
  }

  function onScroll() {
    getScrollDirection();

    if(!document.contains(focusedConfig.element)) {
      console.log(focusedConfig.selector)
      focusedConfig.element = document.querySelector(focusedConfig.selector);
      return;
    }

    if(focusedConfig.isSticky) {

      if(window.scrollY <= focusedConfig.breakingPoint) {
        makeUnSticky(focusedConfig);
      }

      return;
    }

    const rect = focusedConfig.element.getBoundingClientRect();
    const isSticky = rect.top <= currentStuckHeight;

    if (isSticky) {
      makeSticky(focusedConfig);
    } else {
      makeUnSticky(focusedConfig);
    }

  }

  return {
    deregister: (selectorNames) => {      
      makeArray(selectorNames).forEach(selectorName => {
        sticky.unstick(selectorName);
      });

      configs = configs.filter(config => !makeArray(selectorNames).includes(config.selector));
    },
    register: (configsToRegister) => {

     makeArray(configsToRegister).forEach(config => {
        
      if (typeof config === 'string') {
        config = { selector: config };
      }

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
        focusedConfig = configs[focusedIndex];
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