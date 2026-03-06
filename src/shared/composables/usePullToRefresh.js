import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const DEFAULT_TRIGGER_DISTANCE = 84;
const DEFAULT_MAX_DISTANCE = 140;
const DEFAULT_RESISTANCE = 0.55;
const DEFAULT_REFRESH_HOLD_MS = 220;

function defaultCanStart() {
  return true;
}

function readScrollTop() {
  if (typeof window === 'undefined') {
    return 0;
  }

  return window.scrollY || document.documentElement.scrollTop || 0;
}

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      'input, textarea, select, button, a, label, [role="button"], [data-no-pull-refresh]'
    )
  );
}

export function usePullToRefresh(options = {}) {
  const onRefresh = typeof options.onRefresh === 'function' ? options.onRefresh : async () => {};
  const canStart = typeof options.canStart === 'function' ? options.canStart : defaultCanStart;
  const triggerDistance = Number(options.triggerDistance) || DEFAULT_TRIGGER_DISTANCE;
  const maxDistance = Number(options.maxDistance) || DEFAULT_MAX_DISTANCE;
  const resistance = Number(options.resistance) || DEFAULT_RESISTANCE;
  const refreshHoldMs = Number(options.refreshHoldMs) || DEFAULT_REFRESH_HOLD_MS;

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

  function resetPullState() {
    pullDistance.value = 0;
    isPulling.value = false;
  }

  function stopTrackingPull() {
    isTrackingPull = false;
    pullStartY = 0;
    pullStartX = 0;
    hasVerticalIntent = false;
  }

  async function triggerRefresh() {
    if (isRefreshing.value) {
      return;
    }

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

    if (readScrollTop() > 0) {
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

    if (deltaY <= 0 || readScrollTop() > 0) {
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

  onMounted(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchcancel', handleTouchCancel);
  });

  return {
    isVisible,
    isRefreshing,
    isReady,
    label,
    indicatorStyle
  };
}
