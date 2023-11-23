const sticky = (() => {
  const configs = [];
  let currentStuckHeight = 0;
  let initiated = false;
  let currentIndex = 0;

  function onScroll() {

    const config = configs[currentIndex] || configs[currentIndex-1];

    if(!config) {
      return;
    }

    const rect = config.element.getBoundingClientRect();
    const isSticky = rect.top <= currentStuckHeight;

    if (isSticky) {
      makeSticky(config.element, config);
    } else {
      unmakeSticky(config.element, config);
    }

  }

  function makeSticky(element, config) {
    if(config.isSticky === true) {
      return;
    }
    
    config.isSticky = true;
    config.originalStyle = element.getAttribute('style') || '';
    element.classList.add('stickified');
    element.style.top = `${currentStuckHeight}px`;
    element.style.zIndex = 100 + currentStuckHeight;
    element.style.width = element.offsetWidth + 'px'; // Maintain width
    element.style.left = element.getBoundingClientRect().left + 'px'; // Maintain position left
    currentStuckHeight += element.getBoundingClientRect().height;
    currentIndex++;
  }

  function unmakeSticky(element, config) {
    if(config.isSticky === false) {
      return;
    }

    config.isSticky = false;
    element.setAttribute('style', config.originalStyle || '');
    element.classList.remove('stickified');
    currentStuckHeight -= element.getBoundingClientRect().height;
    currentIndex--;   
    delete config.originalStyle;
  }

  // Public API
  return {
    stickify(configsToRegister) {
      console.log(configsToRegister);
      if (!Array.isArray(configsToRegister)) {
        configsToRegister = [configsToRegister];
      }

      // Flatten screen size specific configs into one
      configsToRegister.forEach(config => {
        // Handle simple string selectors
        if (typeof config === 'string') {
          config = { selector: config };
        }

        // Register configurations sorted by their position on the page
        config.element = document.querySelector(config.selector);
        config.originalRect = config
        config.isSticky = false;

        if (config.element) {
          configs.push(config);
        }
      });

      // Sort elements based on their position.top
      configs.sort((a, b) => a.element.getBoundingClientRect().top - b.element.getBoundingClientRect().top);

      // Attach scroll event listener
      if(!initiated) {
        initiated = true;
        window.addEventListener('scroll', onScroll);
      }
    }
  };
})();

export default sticky;