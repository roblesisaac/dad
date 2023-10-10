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
		const { height, top, left, width } = element.getBoundingClientRect();
		const { marginTop, marginLeft } = window.getComputedStyle(element);
		
		return {
			currentTop: top,
			top: element.offsetTop - parseFloat(marginTop),
			height,
			left: left - parseFloat(marginLeft),
			width,
		};
	}
	
	
	function buildResizeHandler(elementData) {    
		let previousWindowSize = window.innerWidth;
		
		return ({ deRegistering }) => {
			if(deRegistering) {
				return makeElementUnsticky(elementData);
			}
			
			const currentWindowSize = window.innerWidth;
			const sizeDifference = Math.abs(previousWindowSize - currentWindowSize);
			
			previousWindowSize = currentWindowSize;
			if (sizeDifference > 1) {
				makeElementUnsticky(elementData);
			}
		}
	}
	
	function buildPlaceholderElement(boundingBox) {
		const { height, width } = boundingBox;
		const placeholderElement = document.createElement('div');
		const { style } = placeholderElement;
		
		style.height = height+'px';
		style.width = width+'px';
		style.visibility = 'hidden';
		
		return placeholderElement;
	}
	
	function buildScrollHandler(elementInstanceData) {
		const { element, selector, validScreenSizes, stickyConfig } = elementInstanceData;
		const { stuckElements } = stickyState;		
		
		let elementData = {
			boundingBox: null,
			isSticky: false,
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
			
			const currentSettings = getCurrentSettings(elementData);			
			const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
			const StuckElement = () => stuckElements[selector];
			const stickingPoint = getStickingPoint(currentSettings, StuckElement, elementData);
			
			setScrollDirection(currentScrollPosition);
			
			if(currentScrollPosition <= stickingPoint) {
				return makeElementUnsticky(elementData);
			}
			
			makeElementSticky(stickingPoint, elementData);
			
			if(!currentSettings.unstickWhen) return;
			
			const topOfUnstick = getUnstickingElement(element, currentSettings).top;
			
			if(topOfUnstick <= StuckElement().bottom) {
				slideElementUp(elementData, currentSettings);
			}
		}
	}
	
	function convertToArray (items) {
		return Array.isArray(items) ? items : [items];
	}
	
	function getCurrentSettings({ defaultSettings, stickyElement }) {
		const presets = stickyElement[stickyState.getCurrentScreenSize()] || {};                
		
		Object.keys(defaultSettings).forEach(name => {
			presets[name] = presets[name] || defaultSettings[name];
		});
		
		return presets;
	}
	
	function defineSelectorInfo(stickyConfig) {
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

	function getElement(selector) {
		const isAClass = selector.includes('.');

		if(isAClass) {
			return document.querySelector(selector);
		}

		const hasHash = selector.includes('#');
		const id = hasHash ? selector : '#' + selector;

		return document.querySelector(id);
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
	
	function isElementAlreadyRegistered (selector) {
		return !!stickyState.registeredElements[selector];
	}
	
	function makeElementSticky (stickingPoint, elementData) {
		if(elementData.isSticky) {
			return;
		}
		const { element, boundingBox, selector } = elementData;

		elementData.initialStyle = element.getAttribute('style');		
		elementData.isSticky = true;
		const { stuckElements } = stickyState;
		let { top, left, height, width } = boundingBox;
		
		top = top - stickingPoint;

		const stickyStyle = {
			top: top+'px',
			left: left+'px',
			width: width+'px',
			zIndex: Math.round(100 + stuckElements.height)
		};
		
		//Make sticky
		element.classList.add('stickify');
		Object.assign(element.style, stickyStyle);
		
		//Add placeholder to dom
		elementData.placeholder = elementData.placeholder || buildPlaceholderElement(boundingBox);
		element.parentNode.insertBefore(elementData.placeholder, element.nextSibling);
		
		//Add data to state
		const bottom = top + boundingBox.height;
		stuckElements[selector] = { height, stickingPoint, top, bottom };
		stuckElements.height += height;
	}
	
	function makeElementUnsticky(elementData) {
		const { boundingBox, element, initialStyle, placeholder, selector } = elementData;
		
		if(!boundingBox) {
			return;
		}
		
		const { stuckElements } = stickyState;
		const { height } = boundingBox;
		
		element.style = initialStyle;
		element.classList.remove('stickify');
		elementData.boundingBox = buildBoundingBox(element);
		
		if(!elementData.isSticky) return;
		
		elementData.isSticky = false;
		stuckElements.height -= height;
		delete stuckElements[selector];
		
		if (element.nextSibling === placeholder) {
			element.parentNode.removeChild(placeholder);
		}
	}
	
	function registerElementToScrollHandler(elementHandlerData) {
		const { selector, handlers } = elementHandlerData;
		
		const options = { passive: true };
		
		for (let eventName in handlers) {
			window.addEventListener(eventName, handlers[eventName], options);
		}
		
		stickyState.registeredElements[selector] = { handlers };
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
	
	return { 
		state: stickyState,
		stickify(stickyElements) {
			for (const stickyElement of convertToArray(stickyElements)) {
				const selectorInfo = defineSelectorInfo(stickyElement);
				const { selector } = selectorInfo;
				
				if(isElementAlreadyRegistered(selector)) {
					return;
				}
				
				const element = getElement(selector);

				if(!document.contains(element)) {
					return;
				}

				const elementData = { element, ...selectorInfo, stickyElement };
				
				const handlers = {
					scroll: buildScrollHandler(elementData),
					resize: buildResizeHandler(elementData)
				}
				
				registerElementToScrollHandler({ selector, handlers });
			}
		},
		unstick(stickyElements) {
			for(const stickyElement of convertToArray(stickyElements)) {
				const selectorInfo = defineSelectorInfo(stickyElement);
				
				deregisterElement(selectorInfo.selector);
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