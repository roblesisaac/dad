import { reactive, ref, watchEffect } from 'vue';

const stickyState = reactive({
	registeredElements: {},
	scrollState: {
		lastScrollPosition: 0,
		scrollDirection: null
	},
	stuckElements: { height: 0 },
	getCurrentScreenSize() {
		const screenSize = ref('large');
		const smallScreenQuery = '(max-width: 47.9375em)';
		const mediumScreenQuery = '(min-width: 48em) and (max-width: 63.9375em)';
	
		const updateScreenSize = () => {
			const matchesQuery = (mediaQuery) => window.matchMedia(mediaQuery).matches;
	
			screenSize.value = matchesQuery(smallScreenQuery)
				? 'small'
				: matchesQuery(mediumScreenQuery)
				? 'medium'
				: 'large';
		};
	
		watchEffect(() => {
			window.matchMedia(smallScreenQuery).addEventListener('change', updateScreenSize);
			window.matchMedia(mediumScreenQuery).addEventListener('change', updateScreenSize);
			updateScreenSize();
		});
	
		return screenSize.value;
	}
});

const Sticky = function() {	
	function buildBoundingBox(element) {
		const { height, top, left } = element.getBoundingClientRect();
		const { marginTop, marginLeft } = window.getComputedStyle(element);
		
		return {
			currentTop: top,
			top: element.offsetTop - parseFloat(marginTop),
			height,
			left: left - parseFloat(marginLeft),
			width: getInnerWidth(element)
		};
	}
	
	function buildResizeHandler(elementData) {    
		let previousWindowSize = window.innerWidth;
		
		return ({ deRegistering }) => {
			if(deRegistering) {
				return makeElementUnsticky(elementData.selector);
			}
			
			const currentWindowSize = window.innerWidth;
			const sizeDifference = Math.abs(previousWindowSize - currentWindowSize);
			
			previousWindowSize = currentWindowSize;
			if (sizeDifference > 1) {
				makeElementUnsticky(elementData.selector);
			}
		}
	}
	
	function buildPlaceholderElement(boundingBox) {
		const { height, width } = boundingBox;
		const placeholderElement = document.createElement('div');
		const { style } = placeholderElement;
		
		style.height = height+'px';
		style.width = parseFloat(width)+'px';
		style.visibility = 'hidden';
		
		return placeholderElement;
	}
	
	function buildScrollHandler(elementInstanceData) {
		const { element, selector, validScreenSizes, stickyConfig } = elementInstanceData;
		const { stuckElements } = stickyState;		
		
		let elementData = {
			boundingBox: null,
			initialStyle: null,
			...elementInstanceData
		};
		
		return () => {
			if(!document.contains(element)) {
				deregisterElement(selector);
				Sticky.stickify(stickyConfig);
				return;
			}

			if(!isScreenSizeValid(validScreenSizes)) return;
			
			elementData.boundingBox = elementData.boundingBox || buildBoundingBox(element);
			
			const configForCurrentScreen = getConfigForCurrentScreenSize(elementData);			
			const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
			const StuckElement = () => stuckElements[selector];
			const stickingPoint = getStickingPoint(configForCurrentScreen, StuckElement, elementData);
			
			setScrollDirection(currentScrollPosition);
			
			if(currentScrollPosition <= stickingPoint) {
				return makeElementUnsticky(selector);
			}
			
			makeElementSticky(stickingPoint, elementData);
			
			if(!configForCurrentScreen.unstickWhen) return;
			
			const topOfUnstick = getUnstickingElement(element, configForCurrentScreen).top;
			
			if(topOfUnstick <= StuckElement().bottom) {
				slideElementUp(elementData, configForCurrentScreen);
			}
		}
	}
	
	function convertToArray (items) {
		return Array.isArray(items) ? items : [items];
	}
	
	function defineConfigs(stickyConfig) {
		let { selector, stickUnder, unstickWhen, screenSize } = stickyConfig;
		
		return {
			selector: selector || stickyConfig, 
			validScreenSizes: screenSize,
			defaultSettings: { stickUnder, unstickWhen },
			stickyConfig
		};
	}
	
	function deregisterElement(selector) {
		const { registeredElements } = stickyState;
		
		const registeredElement = registeredElements[selector];
		
		if(!registeredElement) return;
		
		const { handlers } = registeredElement;
		
		for(const eventName in handlers) {
			const handlerMethod = handlers[eventName];
			
			if(eventName === 'resize') handlerMethod({ deRegistering: true });
			window.removeEventListener(eventName, handlerMethod);
		}
		
		delete registeredElements[selector]; 
	}
	
	function getConfigForCurrentScreenSize({ defaultSettings, stickyConfig }) {
		const presets = stickyConfig[stickyState.getCurrentScreenSize()] || {};                
		
		Object.keys(defaultSettings).forEach(name => {
			presets[name] = presets[name] || defaultSettings[name];
		});
		
		return presets;
	}

	function getUserDefinedStyles(el) {
		const userDefinedStyles = {};
		const inlineStyles = el.style;
	
		for (let i = 0; i < inlineStyles.length; i++) {
			const propertyName = inlineStyles[i];
			const propertyValue = inlineStyles[propertyName];
			userDefinedStyles[propertyName] = propertyValue;
		}
	
		return userDefinedStyles;
	}

	function getElement(selector) {
		const isAClass = selector.includes('.');

		if(isAClass) {
			return document.querySelector(selector);
		}

		const id = selector.replace('#', '');

		return document.getElementById(id);
	}

	function getInnerWidth(el) {
		if (!(el instanceof HTMLElement)) {
			console.error('Invalid element provided.');
			return null;
		}
	
		const computedStyles = window.getComputedStyle(el);
		const paddingLeft = parseFloat(computedStyles.paddingLeft);
		const paddingRight = parseFloat(computedStyles.paddingRight);
		const borderLeft = parseFloat(computedStyles.borderLeftWidth);
		const borderRight = parseFloat(computedStyles.borderRightWidth);
		
		const innerWidth = el.clientWidth - (paddingLeft + paddingRight + borderLeft + borderRight);	
		return innerWidth;
	}
	
	function getStickingPoint(settings, StuckElement, elementData) {
		const { stuckElements } = stickyState;
		const { stickUnder } = settings;
		const StickUnderElement = stuckElements[stickUnder];
		const TopPosition = elementData.boundingBox.top;

		return StuckElement()
		? StuckElement().stickingPoint
		: StickUnderElement
		? TopPosition - StickUnderElement.height - StickUnderElement.top
		: TopPosition - stuckElements.height;
	}
	
	function getStuckElementHeight(selector) {
		const stuckElement = stickyState.stuckElements[selector];
		
		return stickyState.stuckElements.height -= stuckElement?.height || 0;
	}
	
	function getUnstickingElement(element, settings) {
		const { stuckElements } = stickyState;
		const { unstickWhen } = settings;
		const { touching, isSticky, reachesTop } = unstickWhen;
		
		const selector = touching || isSticky || reachesTop;
		const unstickingElement = document.querySelector(selector);
		const boundingBox = buildBoundingBox(unstickingElement);                
		let point;
		
		if(touching) {
			point = boundingBox.top + boundingBox.height;
		}
		
		if(isSticky) {
			point = stuckElements[isSticky] 
			? stuckElements[isSticky].top 
			: document.body.scrollHeight + 1;
		}
		
		if(reachesTop) {
			point = boundingBox.top - element.height;
		}
		
		return { point, top: boundingBox.currentTop };
	}
	
	function isElementAlreadyRegistered (selector) {
		return !!stickyState.registeredElements[selector];
	}
	
	function isScreenSizeValid(validScreenSizes) {
		if(!validScreenSizes) {
			return true;
		}
		
		let screens = convertToArray(validScreenSizes),
		negates;
		
		screens.forEach(size => negates = negates || size.includes('-'));
		
		if(negates) {
			const defaultScreenSizes = ['small', 'medium', 'large'];
			screens = screens.concat(defaultScreenSizes);
		}
		
		return screens.includes(stickyState.getCurrentScreenSize())
		&& !screens.includes('-'+stickyState.getCurrentScreenSize());
	}
	
	function makeElementSticky (stickingPoint, elementData) {
		const { element, boundingBox, selector } = elementData;
		const { stuckElements } = stickyState;

		if(stuckElements.hasOwnProperty(selector)) {
			return;
		}

		elementData.initialStyle = getUserDefinedStyles(element);

		let { top, left, height, width } = boundingBox;
		
		top = top - stickingPoint;

		const stickyStyle = {
			top: top+'px',
			left: left+'px',
			width: parseFloat(width) + 'px',
			zIndex: Math.round(100 + stuckElements.height)
		};

		// Add data to state
		const bottom = top + boundingBox.height;
		stuckElements[selector] = { height, stickingPoint, top, bottom, ...elementData };
		stuckElements.height += height;
		
		//Make sticky
		element.classList.add('stickify');
		Object.assign(element.style, stickyStyle);
		
		//Add placeholder to dom
		elementData.placeholder = elementData.placeholder || buildPlaceholderElement(boundingBox);
		element.parentNode.insertBefore(elementData.placeholder, element.nextSibling);
	}
	
	function makeElementUnsticky(selector) {
		const { stuckElements } = stickyState;

		if(!stuckElements[selector]) {
			return;
		}

		const { boundingBox, element, initialStyle, placeholder } = stuckElements[selector];

		delete stuckElements[selector];

		if(!boundingBox) {
			return;
		}
		
		for (const property in initialStyle) {
			element.style[property] = initialStyle[property];
		}

		element.classList.remove('stickify');
		const boundingBoxToRemove = buildBoundingBox(element);
		
		stuckElements.height -= boundingBoxToRemove.height;
		
		if (element.nextSibling === placeholder) {
			element.parentNode.removeChild(placeholder);
		}
	}
	
	function registerElementToScrollHandler(selector, handlers) {		
		for (let eventName in handlers) {
			window.addEventListener(eventName, handlers[eventName], { passive: true });
		}
		
		stickyState.registeredElements[selector] = { handlers };
	}
	
	function setScrollDirection(currentScrollPosition) {
		const { scrollState } = stickyState;
		
		if(currentScrollPosition > scrollState.lastScrollPosition) {
			scrollState.scrollDirection = 'down';
		}
		
		if(currentScrollPosition < scrollState.lastScrollPosition) {
			scrollState.scrollDirection = 'up';
		}
		
		// For Mobile or negative scrolling
		scrollState.lastScrollPosition = currentScrollPosition <= 0 ? 0 : currentScrollPosition;
	}
	
	function slideElementUp(elementData, settings) {
		const { element, boundingBox } = elementData;
		let currentTop = getUnstickingElement(element, settings).top;
		if(stickyState.scrollState.scrollDirection === 'down') {
			--currentTop;
		}
		element.style.top = currentTop - boundingBox.height +'px';
		element.style.zIndex = 99;
	}
	
	return { 
		state: stickyState,
		stickify(stickyConfigs) {
			for (const stickyConfig of convertToArray(stickyConfigs)) {
				const config = defineConfigs(stickyConfig);
				const { selector } = config;
				const element = getElement(selector);
				
				if(isElementAlreadyRegistered(selector) || !document.contains(element)) {
					return;
				}

				const elementData = { element, ...config, stickyConfig };
				
				registerElementToScrollHandler(selector, {
					scroll: buildScrollHandler(elementData),
					resize: buildResizeHandler(elementData)
				});
			}
		},
		unstick(stickyConfigs) {
			for(const stickyConfig of convertToArray(stickyConfigs)) {
				const config = defineConfigs(stickyConfig);
				// const element = getElement(config.selector);
				// const elementData = { element, ...config, stickyConfig };

				// makeElementUnsticky(elementData);
				deregisterElement(config.selector);
			}
		},
		unstickAll() {
			for(const selector in stickyState.registeredElements) {
				stickyState.stuckElements.height -= getStuckElementHeight(selector);
				deregisterElement(selector);
			}
		}
	};
}();

export default Sticky;