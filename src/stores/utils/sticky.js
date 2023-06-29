const Sticky = function() {
    let state = {
        registered: {},
        scroll: {
            last: 0,
            direction: null
        },
        stuck: { height: 0 },
        currentScreenSize() {
            const matches = (media) => window.matchMedia(media).matches;

            return matches("(max-width: 47.9375em)")
                ? 'small'
                : matches("(min-width: 48em) and (max-width: 63.9375em)")
                ? 'medium'
                : 'large'
        }
    };

    function buildBox(el) {
        const { height, top, left, width } = el.getBoundingClientRect();
        const { marginTop, marginLeft } = window.getComputedStyle(el);
      
        return {
          currentTop: top,
          top: el.offsetTop - parseFloat(marginTop),
          height,
          left: left - parseFloat(marginLeft),
          width,
        };
    }
      

    function buildHandleResize(data) {    
        let prevWindowSize = window.innerWidth;

        return ({ deRegistering }) => {
            if(deRegistering) {
                return makeUnsticky(data);
            }
            
            const currentWindowSize = window.innerWidth;
            const sizeDifference = Math.abs(prevWindowSize - currentWindowSize);

            prevWindowSize = currentWindowSize;
            if (sizeDifference > 1) {
                makeUnsticky(data);
            }
        }
    }

    function buildPlaceHolder(box) {
        const { height, width } = box;
        const elem = document.createElement('div');
        const { style } = elem;
        
        style.height = height+'px';
        style.width = width+'px';
        style.visibility = 'hidden';

        return elem;
    }

    function buildScrollHandler(instanceData) {
        const { el, selector, validScreenSizes } = instanceData;
        const { stuck } = state;

        const data = {
            box: null,
            isSticky: false,
            initialStyle: el.getAttribute('style'),
            ...instanceData
        };

        return () => {
            if(!screenIsValid(validScreenSizes)) return;
            
            data.box = data.box || buildBox(el);

            const settings = currentSettings(data);
            const { stickUnder, unstickWhen } = settings;

            const Stuck = () => stuck[selector];
            const StickUnder = stuck[stickUnder];
            const Top = data.box.top;
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

            const stickingPoint = Stuck()
                ? Stuck().stickingPoint
                : StickUnder
                ? Top - StickUnder.height - StickUnder.top
                : Top - stuck.height;

            setScrollDirection(currentScroll);

            if(currentScroll <= stickingPoint) {
                return makeUnsticky(data);
            }

            makeSticky(stickingPoint, data);

            if(!unstickWhen) return;

            const topOfUnstick = unstickingEl(el, settings).top;

            if(topOfUnstick < Stuck().bottom) {
                slideUp(data, settings);
            }
        }
    }

    function convertToArray (items) {
        return Array.isArray(items) ? items : [items];
    }

    function currentSettings({ defaultSettings, sticky }) {
        const presets = sticky[state.currentScreenSize()] || {};                
        
        Object.keys(defaultSettings).forEach(name => {
            presets[name] = presets[name] || defaultSettings[name];
        });
        
        return presets;
    }

    function defineSelectorInfo(sticky) {
        let { selector, stickUnder, unstickWhen, screenSize } = sticky;

        return {
            selector: selector || sticky, 
            validScreenSizes: screenSize,
            defaultSettings: { stickUnder, unstickWhen }
        };
    }

    function deregister(selector) {
        const { registered } = state;

        const item = registered[selector];
        
        if(!item) return;

        const { handlers } = item;

        for(const eventName in handlers) {
            const method = handlers[eventName];
            
            if(eventName === 'resize') method({ deRegistering: true });
            window.removeEventListener(eventName, method);
        }

        delete registered[selector];
    }

    function isAlreadyRegistered (selector) {
        return !!state.registered[selector];
    }

    function makeSticky (stickingPoint, data) {
        if(data.isSticky) {
            return;
        }

        data.isSticky = true;

        const { el, box, selector } = data;
        const { stuck } = state;
        let { top, left, height, width } = box;

        top = top - stickingPoint;

        const stickyStyle = {
            top: top+'px',
            left: left+'px',
            width: width+'px',
            zIndex: 100 + stuck.height
        };

        //Make sticky
        el.classList.add('stickify');
        Object.assign(el.style, stickyStyle);

        //Add placeholder to dom
        data.placeholder = data.placeholder || buildPlaceHolder(box);
        el.parentNode.insertBefore(data.placeholder, el.nextSibling);

        //Add data to state
        const bottom = top + box.height;
        stuck[selector] = { height, stickingPoint, top, bottom };
        stuck.height += height;
    }

    function makeUnsticky(data) {
        const { box, el, initialStyle, placeholder, selector } = data;

        if(!box) {
            return;
        }

        const { stuck } = state;
        const { height } = box;

        el.style = initialStyle;
        el.classList.remove('stickify');
        data.box = buildBox(el);

        if(!data.isSticky) return;

        data.isSticky = false;
        stuck.height -= height;
        delete stuck[selector];

        if (el.nextSibling === placeholder) {
            el.parentNode.removeChild(placeholder);
        }
    }

    function registerElement(handlerData) {
        const { selector, handlers } = handlerData;

        const options = { passive: true };

        for (let name in handlers) {
            window.addEventListener(name, handlers[name], options);
        }

        state.registered[selector] = { handlers };
    }

    function screenIsValid(validScreenSizes) {
        if(!validScreenSizes) {
            return true;
        }

        let screens = convertToArray(validScreenSizes),
            negates;

        screens.forEach(size => negates = negates || size.includes('-'));

        if(negates) {
            const defaults = ['small', 'medium', 'large'];
            screens = screens.concat(defaults);
        }

        return screens.includes(state.currentScreenSize())
            && !screens.includes('-'+state.currentScreenSize());
    }

    function setScrollDirection(currentScroll) {
        const { scroll } = state;

        if(currentScroll > scroll.last) {
            scroll.direction = 'down';
        }

        if(currentScroll < scroll.last) {
            scroll.direction = 'up';
        }

        // For Mobile or negative scrolling
        scroll.last = currentScroll <= 0 ? 0 : currentScroll;
    }

    function slideUp(data, settings) {
        const { el, box } = data;
        let currentTop = unstickingEl(el, settings).top

        if(state.scroll.direction === 'down') {
            --currentTop;
        }
        el.style.top = currentTop - box.height +'px';
        el.style.zIndex = 99;
    }

    function stuckHeight(selector) {
        const stuckEl = state.stuck[selector];
        
        return state.stuck.height -= stuckEl?.height || 0;
    }

    function unstickingEl(el, settings) {
        const { stuck } = state;
        const { unstickWhen } = settings;
        const { touching, isSticky, reachesTop } = unstickWhen;

        const selector = touching || isSticky || reachesTop;
        const elem = document.querySelector(selector);
        const box = buildBox(elem);                
        let point;

        if(touching) {
            point = box.top + box.height;
        }

        if(isSticky) {
            point = stuck[isSticky] 
                ? stuck[isSticky].top 
                : document.body.scrollHeight + 1;
        }

        if(reachesTop) {
            point = box.top - el.height;
        }

        return { point, top: box.currentTop };
    }

    return { 
        state,
        _register(sticky) {            
            const selectorInfo = defineSelectorInfo(sticky);
            const { selector } = selectorInfo;

            if(isAlreadyRegistered(selector)) {
                return;
            }
            
            const el = document.querySelector(selector);
            const data = { el, ...selectorInfo, sticky };

            const handlers = {
                scroll: buildScrollHandler(data),
                resize: buildHandleResize(data)
            }
            
            registerElement({ selector, handlers });
        },
        stickify(sticks) {
            for (const sticky of convertToArray(sticks)) {
                Sticky._register(sticky);
            }
        },
        unstick(sticks) {
            for(const sticky of convertToArray(sticks)) {
                const selectorInfo = defineSelectorInfo(sticky);

                deregister(selectorInfo.selector);
            }
        },
        unstickAll() {
            for(const selector in state.registered) {
                state.stuck.height -= stuckHeight(selector);
                deregister(selector);
            }
        }
    };
}();

export default Sticky;