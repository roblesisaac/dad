import { Aid, convert } from '../../../api/utils/aidkit';

export default new Aid({
    state: {
        registered: {},
        scroll: {
            last: 0,
            direction: null
        },
        stuck: { height: 0 },
        currentScreenSize: () => {
            const matches = (media) => window.matchMedia(media).matches;

            return matches("(max-width: 47.9375em)")
                ? 'small'
                : matches("(min-width: 48em) and (max-width: 63.9375em)")
                ? 'medium'
                : 'large'
        }
    },
    steps: {
        defineSelector() {
            const { item, learn } = this;

            let { selector, stickUnder, unstickWhen, screenSize } = item;

            const defaultSettings = { stickUnder, unstickWhen};

            learn({ 
                selector: selector || item, 
                validScreenSizes: screenSize,
                defaultSettings
            });
        },
        deregister() {
            const { selector, registered } = this;

            const item = registered[selector];
            
            if(!item) return;

            const { handlers } = item;

            for(let eventName in handlers) {
                const method = handlers[eventName];
                
                if(eventName === 'resize') method({ deRegistering: true });
                window.removeEventListener(eventName, method);
            }
            
            delete registered[selector];
        },
        findElement() {
            const { selector, learn } = this;

            const el = document.querySelector(selector);

            learn({ el });
        },
        initScrollHandler() {
            const { next, el, stuck, selector, item, validScreenSizes, defaultSettings } = this;

            let box,
                settings,
                placeholder,
                initialStyle = el.getAttribute('style'),
                isSticky = false;

            const buildBox = (el) => {
                const { height, top, left, width } = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);
                const marginTop = styles.getPropertyValue('margin-top');
                const marginLeft = styles.getPropertyValue('margin-left');
                
                return {                    
                    currentTop: top,
                    top: el.offsetTop - parseFloat(marginTop),
                    height,
                    left: left - parseFloat(marginLeft),
                    width,
                };
            };                  

            const screenIsValid = () => {
                if(!validScreenSizes) {
                    return true;
                }

                let screens = convert.toArray(validScreenSizes),
                    { currentScreenSize: current } = this,
                    negates;

                screens.forEach(size => negates = negates || size.includes('-'));

                if(negates) {
                    const defaults = ['small', 'medium', 'large'];
                    screens = screens.concat(defaults);
                }

                return screens.includes(current)
                    && !screens.includes('-'+current);
            }

            const unstickingEl = () => {
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
            };

            const buildPlaceHolder = (box) => {
                const { height, width } = box;
                const elem = document.createElement('div');
                const { style } = elem;
                
                style.height = height+'px';
                style.width = width+'px';
                style.visibility = 'hidden';

                return elem;
            }

            const currentSettings = () => {
                const presets = item[this.currentScreenSize] || {};                
                
                Object.keys(defaultSettings).forEach(name => {
                    presets[name] = presets[name] || defaultSettings[name];
                });
                
                return presets;
            }

            const slideUp = () => {
                let currentTop = unstickingEl().top

                if(this.scroll.direction === 'down') {
                    --currentTop;
                }
                el.style.top = currentTop - box.height +'px';
                el.style.zIndex = 99;
            }

            const setScrollDirection = (currentScroll) => {
                const { scroll } = this;

                if(currentScroll > scroll.last) {
                    scroll.direction = 'down';
                }

                if(currentScroll < scroll.last) {
                    scroll.direction = 'up';
                }

                // For Mobile or negative scrolling
                scroll.last = currentScroll <= 0 ? 0 : currentScroll;
            }

            const makeSticky = (stickingPoint) => {                
                if(isSticky) {
                    return;
                }

                let { top, left, height, width } = box;

                isSticky = true;
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
                placeholder = placeholder || buildPlaceHolder(box);
                el.parentNode.insertBefore(placeholder, el.nextSibling);

                //Add data to state
                const bottom = top + box.height;
                stuck[selector] = { height, stickingPoint, top, bottom };
                stuck.height += height;
            };

            const makeUnsticky = () => {
                if(!box) return;

                const { height } = box;
                el.style = initialStyle;
                el.classList.remove('stickify');
                box = buildBox(el);

                if(!isSticky) return;

                isSticky = false;
                stuck.height -= height;
                delete stuck[selector];

                if (el.nextSibling === placeholder) {
                    el.parentNode.removeChild(placeholder);
                }
            }

            const handleScroll = () => {
                if(!screenIsValid()) return;

                settings = currentSettings();
                box = box || buildBox(el);

                const { stickUnder, unstickWhen } = settings;

                const Stuck = () => stuck[selector];
                const StickUnder = stuck[stickUnder];
                const Top = box.top;
                const scroll = window.pageYOffset || document.documentElement.scrollTop;

                const stickingPoint = Stuck()
                    ? Stuck().stickingPoint
                    : StickUnder
                    ? Top - StickUnder.height - StickUnder.top
                    : Top - stuck.height;

                setScrollDirection(scroll);

                if(scroll <= stickingPoint) {
                    return makeUnsticky();
                }

                makeSticky(stickingPoint);

                if(!unstickWhen) return;

                if(unstickingEl().top < Stuck().bottom) {
                    slideUp();
                }
            };

            // Fixes resize glitch on mobile
            let prevWindowSize = window.innerWidth;

            const handleResize = ({ deRegistering }) => {
                if(deRegistering) {
                    return makeUnsticky();
                }
                
                const currentWindowSize = window.innerWidth;
                const sizeDifference = Math.abs(prevWindowSize - currentWindowSize);

                prevWindowSize = currentWindowSize;
                if (sizeDifference > 1) makeUnsticky();
            }

            const handlers = {
                resize: handleResize,
                scroll: handleScroll
            }

            next({ handlers });
        },
        isAlreadyRegistered() {
            const { selector, registered, next } = this;

            next(!!registered[selector]);
        },
        registerElement({ handlers }) {
            const { selector, registered } = this;

            const options = { passive: true };

            for (let name in handlers) {
                window.addEventListener(name, handlers[name], options);
            }

            registered[selector] = { handlers };
        }
    },
    instruct: {
        _register: [
            {
                if: "isAlreadyRegistered",
                false: [
                    "findElement",
                    "initScrollHandler",
                    "registerElement"
                ] 
            }
        ],
        stickify: (stickys) => [
            {
                every: stickys,
                async: [
                    "defineSelector",
                    "_register"
                ]
            }
        ],
        unstick: (stickys) => [
            {
                every: stickys,
                run: ["defineSelector", "deregister"]
            }
        ]
    }
});