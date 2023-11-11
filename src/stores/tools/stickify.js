import { reactive } from 'vue';

const stickyState = reactive({
  currentBreakingPoint: 0,
  initiated: false,
  registeredConfigs: []
});

const Sticky = function (State) {

  function findEl(selectorConfig) {
    return document.querySelector(selectorConfig.selector);
  }
  
  function formatted(selectorConfig) {
    if (typeof selectorConfig === 'string') {
      return { selector: selectorConfig };
    }
    
    return selectorConfig;
  }

  function scrollHandler() {
    let closest = null;
    let closestBreakingPoint = Number.POSITIVE_INFINITY;

    for (const selectorConfig of stickyState.registeredConfigs) {

      selectorConfig.el = selectorConfig.el || findEl(selectorConfig);

      if (!document.contains(selectorConfig.el)) {
        selectorConfig.el = findEl(selectorConfig);
        if (!selectorConfig.el) return;
      }

      const rect = selectorConfig.el.getBoundingClientRect();
      const isSticky = !!selectorConfig.el.classList.contains('sticky');

      if (isSticky && rect.top > selectorConfig.breakingPoint) {
        selectorConfig.el.classList.remove('sticky');
        stickyState.currentBreakingPoint -= rect.height;
        return;
      }
      
      if(isSticky) {
        return;
      }

      if (rect.top > stickyState.currentBreakingPoint && rect.top < closestBreakingPoint) {
        closest = selectorConfig;
        closestBreakingPoint = rect.top;
      }
    }

    if (closest && closestBreakingPoint <= closest.breakingPoint) {
      closest.el.classList.add('sticky');
      stickyState.currentBreakingPoint = closest.breakingPoint;
    }
  }

  return {
    state: stickyState,
    stickify(selectorConfig) {
      if (!stickyState.initiated) {
        document.addEventListener('scroll', scrollHandler);
        stickyState.initiated = true;
      }

      stickyState.registeredConfigs.push(
        formatted(selectorConfig)
      )
    }
  };
};

export default Sticky;