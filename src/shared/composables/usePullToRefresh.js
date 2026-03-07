import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const DEFAULT_TRIGGER_DISTANCE = 84;
const DEFAULT_MAX_DISTANCE = 140;
const DEFAULT_RESISTANCE = 0.55;
const DEFAULT_WHEEL_RESISTANCE = 0.65;
const DEFAULT_REFRESH_HOLD_MS = 220;
const DEFAULT_WHEEL_IDLE_MS = 120;

function defaultCanStart() {
  return true;
}

function readScrollTop(scrollContainer = null) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const rootScrollContainer = document.scrollingElement || document.documentElement;
  if (
    !scrollContainer
    || scrollContainer === rootScrollContainer
    || scrollContainer === document.documentElement
    || scrollContainer === document.body
  ) {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  if (typeof scrollContainer.scrollTop === 'number') {
    return scrollContainer.scrollTop;
  }

  return window.scrollY || document.documentElement.scrollTop || 0;
}

function toElement(target) {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

function hasScrollableOverflow(element) {
  if (!(element instanceof HTMLElement) || typeof window === 'undefined') {
    return false;
  }

  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const canScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  return canScroll && element.scrollHeight > element.clientHeight + 1;
}

function findNearestScrollContainer(target) {
  if (typeof window === 'undefined') {
    return null;
  }

  let current = toElement(target);
  while (current && current !== document.body && current !== document.documentElement) {
    if (hasScrollableOverflow(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [data-no-pull-refresh]'
    )
  );
}

export function usePullToRefresh(options = {}) {
  const onRefresh = typeof options.onRefresh === 'function' ? options.onRefresh : async () => {};
  const canStart = typeof options.canStart === 'function' ? options.canStart : defaultCanStart;
  const triggerDistance = Number(options.triggerDistance) || DEFAULT_TRIGGER_DISTANCE;
  const maxDistance = Number(options.maxDistance) || DEFAULT_MAX_DISTANCE;
  const resistance = Number(options.resistance) || DEFAULT_RESISTANCE;
  const wheelResistance = Number(options.wheelResistance) || DEFAULT_WHEEL_RESISTANCE;
  const refreshHoldMs = Number(options.refreshHoldMs) || DEFAULT_REFRESH_HOLD_MS;
  const wheelIdleMs = Number(options.wheelIdleMs) || DEFAULT_WHEEL_IDLE_MS;

  const pullDistance = ref(0);
  const isPulling = ref(false);
  const isRefreshing = ref(false);

  const progress = computed(() => Math.min(1, pullDistance.value / triggerDistance));
  const isReady = computed(() => !isRefreshing.value && pullDistance.value >= triggerDistance);
  const isVisible = computed(() => isPulling.value || isRefreshing.value);
  const label = computed(() => {
    if (isRefreshing.value) {
      return 'Refreshing...';
    }

    if (isReady.value) {
      return 'Release to refresh';
    }

    if (isPulling.value) {
      return 'Pull to refresh';
    }

    return '';
  });

  const indicatorTranslateY = computed(() => {
    if (isRefreshing.value) {
      return 10;
    }

    if (!isPulling.value) {
      return -72;
    }

    return Math.min(14, -72 + pullDistance.value);
  });

  const indicatorStyle = computed(() => ({
    transform: `translate3d(-50%, ${indicatorTranslateY.value}px, 0)`,
    opacity: isRefreshing.value
      ? 1
      : (isPulling.value ? Math.max(0.35, progress.value) : 0)
  }));

  let isTrackingPull = false;
  let pullStartY = 0;
  let pullStartX = 0;
  let hasVerticalIntent = false;
  let touchScrollContainer = null;
  let wheelEndTimeoutId = null;
  let isWheelGestureActive = false;
  let wheelGestureStartedAtTop = false;
  let wheelScrollContainer = null;

  function clearWheelEndTimer() {
    if (wheelEndTimeoutId) {
      clearTimeout(wheelEndTimeoutId);
      wheelEndTimeoutId = null;
    }
  }

  function resetWheelGestureState() {
    isWheelGestureActive = false;
    wheelGestureStartedAtTop = false;
    wheelScrollContainer = null;
  }

  function startWheelGestureIfNeeded(target) {
    if (isWheelGestureActive) {
      return;
    }

    isWheelGestureActive = true;
    wheelScrollContainer = findNearestScrollContainer(target);
    wheelGestureStartedAtTop = readScrollTop(wheelScrollContainer) <= 0;
  }

  function settlePullGestureFromWheel() {
    if (!isPulling.value || isRefreshing.value) {
      return;
    }

    if (isReady.value) {
      void triggerRefresh();
      return;
    }

    resetPullState();
  }

  function scheduleWheelEnd() {
    clearWheelEndTimer();
    wheelEndTimeoutId = setTimeout(() => {
      wheelEndTimeoutId = null;
      settlePullGestureFromWheel();
      resetWheelGestureState();
    }, wheelIdleMs);
  }

  function resetPullState() {
    pullDistance.value = 0;
    isPulling.value = false;
  }

  function stopTrackingPull() {
    isTrackingPull = false;
    pullStartY = 0;
    pullStartX = 0;
    hasVerticalIntent = false;
    touchScrollContainer = null;
  }

  async function triggerRefresh() {
    if (isRefreshing.value) {
      return;
    }

    clearWheelEndTimer();
    resetWheelGestureState();
    isRefreshing.value = true;
    isPulling.value = false;
    pullDistance.value = triggerDistance;

    try {
      await onRefresh();
    } finally {
      await new Promise((resolve) => {
        setTimeout(resolve, refreshHoldMs);
      });

      isRefreshing.value = false;
      resetPullState();
    }
  }

  function handleTouchStart(event) {
    if (isRefreshing.value || !canStart()) {
      return;
    }

    if (!event.touches || event.touches.length !== 1) {
      return;
    }

    const scrollContainer = findNearestScrollContainer(event.target);
    if (readScrollTop(scrollContainer) > 0) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    if (shouldIgnoreTarget(event.target)) {
      return;
    }

    isTrackingPull = true;
    touchScrollContainer = scrollContainer;
    pullStartY = touch.clientY;
    pullStartX = touch.clientX;
    hasVerticalIntent = false;
    resetPullState();
  }

  function handleTouchMove(event) {
    if (!isTrackingPull || isRefreshing.value) {
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - pullStartX;
    const deltaY = touch.clientY - pullStartY;

    if (!hasVerticalIntent) {
      if (Math.abs(deltaY) < 4) {
        return;
      }

      hasVerticalIntent = Math.abs(deltaY) >= Math.abs(deltaX);
    }

    if (!hasVerticalIntent) {
      stopTrackingPull();
      resetPullState();
      return;
    }

    if (deltaY <= 0 || readScrollTop(touchScrollContainer) > 0) {
      resetPullState();
      return;
    }

    pullDistance.value = Math.min(maxDistance, deltaY * resistance);
    isPulling.value = pullDistance.value > 0;

    if (event.cancelable) {
      event.preventDefault();
    }
  }

  function handleTouchEnd() {
    if (!isTrackingPull) {
      return;
    }

    const shouldRefresh = isReady.value;
    stopTrackingPull();

    if (shouldRefresh) {
      void triggerRefresh();
      return;
    }

    if (!isRefreshing.value) {
      resetPullState();
    }
  }

  function handleTouchCancel() {
    stopTrackingPull();

    if (!isRefreshing.value) {
      resetPullState();
    }
  }

  function handleWheel(event) {
    if (isRefreshing.value || !canStart()) {
      return;
    }

    if (event.ctrlKey || shouldIgnoreTarget(event.target)) {
      return;
    }

    startWheelGestureIfNeeded(event.target);
    const scrollTop = readScrollTop(wheelScrollContainer);

    if (!wheelGestureStartedAtTop) {
      if (isPulling.value) {
        resetPullState();
      }
      scheduleWheelEnd();
      return;
    }

    if (scrollTop > 0) {
      if (isPulling.value) {
        resetPullState();
      }
      scheduleWheelEnd();
      return;
    }

    const deltaY = Number(event.deltaY);
    if (!Number.isFinite(deltaY)) {
      return;
    }
    scheduleWheelEnd();

    if (deltaY < 0) {
      pullDistance.value = Math.min(
        maxDistance,
        pullDistance.value + Math.abs(deltaY) * wheelResistance
      );
      isPulling.value = pullDistance.value > 0;

      if (event.cancelable) {
        event.preventDefault();
      }
      return;
    }

    if (!isPulling.value) {
      return;
    }

    pullDistance.value = Math.max(0, pullDistance.value - deltaY * wheelResistance);
    isPulling.value = pullDistance.value > 0;

    if (isPulling.value) {
      if (event.cancelable) {
        event.preventDefault();
      }
      return;
    }

    resetPullState();
  }

  onMounted(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
  });

  onBeforeUnmount(() => {
    clearWheelEndTimer();
    resetWheelGestureState();
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchcancel', handleTouchCancel);
    window.removeEventListener('wheel', handleWheel);
  });

  return {
    isVisible,
    isRefreshing,
    isReady,
    label,
    indicatorStyle
  };
}
