<template>
  <div ref="triggerRef" class="tooltip-trigger">
    <slot name="trigger"></slot>
    <div
      v-show="isVisible"
      ref="tooltipRef"
      class="tooltip-content fixed z-[500] bg-gray-800 text-white text-xs rounded py-1 px-2 transition-opacity duration-150 pointer-events-none"
      :class="{ 'opacity-100': isVisible, 'opacity-0': !isVisible }"
      :style="tooltipStyle"
    >
      <slot></slot>
      <div
        ref="arrowRef"
        class="tooltip-arrow"
        :style="arrowStyle"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';

const props = defineProps({
  position: {
    type: String,
    default: 'bottom',
    validator: (value) => ['top', 'bottom', 'left', 'right'].includes(value)
  },
  color: {
    type: String,
    default: 'gray-800'
  },
  offset: {
    type: Number,
    default: 10
  },
  width: {
    type: String,
    default: '12rem'
  }
});

// Refs
const triggerRef = ref(null);
const tooltipRef = ref(null);
const arrowRef = ref(null);
const isVisible = ref(false);
const actualPosition = ref(props.position);
const tooltipStyle = ref({});
const arrowStyle = ref({});

// Show tooltip
const showTooltip = () => {
  isVisible.value = true;
  nextTick(() => {
    updatePosition();
  });
};

// Hide tooltip
const hideTooltip = () => {
  isVisible.value = false;
};

// Update tooltip position based on available space
const updatePosition = () => {
  if (!triggerRef.value || !tooltipRef.value || !arrowRef.value) return;

  const triggerRect = triggerRef.value.getBoundingClientRect();
  const tooltipRect = tooltipRef.value.getBoundingClientRect();
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  // Default styles
  tooltipStyle.value = {
    maxWidth: props.width
  };

  // Initial position preference
  let preferredPosition = props.position;
  
  // Check available space in all directions
  const space = {
    top: triggerRect.top,
    bottom: viewport.height - triggerRect.bottom,
    left: triggerRect.left,
    right: viewport.width - triggerRect.right
  };

  // Determine best position based on available space
  if (preferredPosition === 'bottom' && space.bottom < tooltipRect.height + props.offset) {
    if (space.top > tooltipRect.height + props.offset) {
      preferredPosition = 'top';
    } else if (space.right > tooltipRect.width + props.offset) {
      preferredPosition = 'right';
    } else if (space.left > tooltipRect.width + props.offset) {
      preferredPosition = 'left';
    }
  } else if (preferredPosition === 'top' && space.top < tooltipRect.height + props.offset) {
    if (space.bottom > tooltipRect.height + props.offset) {
      preferredPosition = 'bottom';
    } else if (space.right > tooltipRect.width + props.offset) {
      preferredPosition = 'right';
    } else if (space.left > tooltipRect.width + props.offset) {
      preferredPosition = 'left';
    }
  } else if (preferredPosition === 'right' && space.right < tooltipRect.width + props.offset) {
    if (space.left > tooltipRect.width + props.offset) {
      preferredPosition = 'left';
    } else if (space.top > tooltipRect.height + props.offset) {
      preferredPosition = 'top';
    } else if (space.bottom > tooltipRect.height + props.offset) {
      preferredPosition = 'bottom';
    }
  } else if (preferredPosition === 'left' && space.left < tooltipRect.width + props.offset) {
    if (space.right > tooltipRect.width + props.offset) {
      preferredPosition = 'right';
    } else if (space.top > tooltipRect.height + props.offset) {
      preferredPosition = 'top';
    } else if (space.bottom > tooltipRect.height + props.offset) {
      preferredPosition = 'bottom';
    }
  }

  actualPosition.value = preferredPosition;

  // Position the tooltip based on the determined position
  switch (preferredPosition) {
    case 'top':
      tooltipStyle.value.left = `${triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)}px`;
      tooltipStyle.value.top = `${triggerRect.top - tooltipRect.height - props.offset}px`;
      break;
    case 'bottom':
      tooltipStyle.value.left = `${triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2)}px`;
      tooltipStyle.value.top = `${triggerRect.bottom + props.offset}px`;
      break;
    case 'left':
      tooltipStyle.value.left = `${triggerRect.left - tooltipRect.width - props.offset}px`;
      tooltipStyle.value.top = `${triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2)}px`;
      break;
    case 'right':
      tooltipStyle.value.left = `${triggerRect.right + props.offset}px`;
      tooltipStyle.value.top = `${triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2)}px`;
      break;
  }

  // Adjust for screen overflow
  // Ensure tooltip doesn't go beyond the right edge
  const rightEdge = parseFloat(tooltipStyle.value.left) + tooltipRect.width;
  if (rightEdge > viewport.width - 20) {
    tooltipStyle.value.left = `${viewport.width - tooltipRect.width - 20}px`;
  }

  // Ensure tooltip doesn't go beyond the left edge
  if (parseFloat(tooltipStyle.value.left) < 20) {
    tooltipStyle.value.left = '20px';
  }

  // Ensure tooltip doesn't go beyond the top edge
  if (parseFloat(tooltipStyle.value.top) < 20) {
    tooltipStyle.value.top = '20px';
  }

  // Ensure tooltip doesn't go beyond the bottom edge
  const bottomEdge = parseFloat(tooltipStyle.value.top) + tooltipRect.height;
  if (bottomEdge > viewport.height - 20) {
    tooltipStyle.value.top = `${viewport.height - tooltipRect.height - 20}px`;
  }

  // Position the arrow
  positionArrow(triggerRect, tooltipStyle.value, preferredPosition);
};

// Position the arrow to point to the trigger element
const positionArrow = (triggerRect, tooltipStyle, position) => {
  const arrowSize = 5; // Half of the arrow size

  arrowStyle.value = {
    borderWidth: `${arrowSize}px`,
    position: 'absolute'
  };

  switch (position) {
    case 'top':
      arrowStyle.value.borderColor = `#1f2937 transparent transparent transparent`;
      arrowStyle.value.bottom = `-${arrowSize * 2}px`;
      arrowStyle.value.left = `${triggerRect.left + (triggerRect.width / 2) - parseFloat(tooltipStyle.left) - arrowSize}px`;
      arrowStyle.value.top = 'auto';
      arrowStyle.value.right = 'auto';
      break;
    case 'bottom':
      arrowStyle.value.borderColor = `transparent transparent #1f2937 transparent`;
      arrowStyle.value.top = `-${arrowSize * 2}px`;
      arrowStyle.value.left = `${triggerRect.left + (triggerRect.width / 2) - parseFloat(tooltipStyle.left) - arrowSize}px`;
      arrowStyle.value.bottom = 'auto';
      arrowStyle.value.right = 'auto';
      break;
    case 'left':
      arrowStyle.value.borderColor = `transparent transparent transparent #1f2937`;
      arrowStyle.value.right = `-${arrowSize * 2}px`;
      arrowStyle.value.top = `${triggerRect.top + (triggerRect.height / 2) - parseFloat(tooltipStyle.top) - arrowSize}px`;
      arrowStyle.value.left = 'auto';
      arrowStyle.value.bottom = 'auto';
      break;
    case 'right':
      arrowStyle.value.borderColor = `transparent #1f2937 transparent transparent`;
      arrowStyle.value.left = `-${arrowSize * 2}px`;
      arrowStyle.value.top = `${triggerRect.top + (triggerRect.height / 2) - parseFloat(tooltipStyle.top) - arrowSize}px`;
      arrowStyle.value.right = 'auto';
      arrowStyle.value.bottom = 'auto';
      break;
  }
};

// Event listeners
onMounted(() => {
  if (triggerRef.value) {
    triggerRef.value.addEventListener('mouseenter', showTooltip);
    triggerRef.value.addEventListener('mouseleave', hideTooltip);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
  }
});

// Cleanup
onMounted(() => {
  return () => {
    if (triggerRef.value) {
      triggerRef.value.removeEventListener('mouseenter', showTooltip);
      triggerRef.value.removeEventListener('mouseleave', hideTooltip);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    }
  };
});
</script>

<style scoped>
.tooltip-trigger {
  display: inline-block;
  position: relative;
}

.tooltip-content {
  width: max-content;
  max-width: v-bind('props.width');
  box-sizing: border-box;
  overflow-wrap: break-word;
}

.tooltip-arrow {
  width: 0;
  height: 0;
  border-style: solid;
  z-index: 500;
}
</style> 