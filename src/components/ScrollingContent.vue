<template>
  <div class="scrolling-content" :class="{ 'hide-scrollbar': shouldHideScrollbar }" ref="scrollingContainer">
    <div class="scrolling-wrapper">
      <button v-if="shouldShowArrows && hasOverflowLeft" @click="scrollTo('left')" class="scroll-arrow left">
        <ChevronLeft />
      </button>
      <slot></slot>
      <button v-if="shouldShowArrows && hasOverflowRight" @click="scrollTo('right')" class="scroll-arrow right">      
        <ChevronRight />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import ChevronLeft from 'vue-material-design-icons/ChevronLeft.vue';
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue';

import { useAppStore } from '../stores/state';

const { State } = useAppStore();

const props = defineProps({
  settings: {
    type: Object,
    default: () => ({
      hideScrollBar: true,
      showArrows: true,
      small: {},
      medium: {},
      large: {},
    })
  },
});

const scrollingContainer = ref(null);
const hasOverflowLeft = ref(false);
const hasOverflowRight = ref(false);

const screenSettings = () =>  props.settings[State.currentScreenSize()];

const getSettings = (settingsName) => screenSettings().hasOwnProperty(settingsName) 
  ? screenSettings()[settingsName]
  : props.settings[settingsName];

const shouldHideScrollbar = computed(() => getSettings('hideScrollBar'));
const shouldShowArrows = computed(() => getSettings('showArrows'));

const scrollTo = (direction) => {
  const container = scrollingContainer.value;
  const scrollAmount = container.clientWidth / 2;
  if (direction === 'right') {
    container.scrollLeft += scrollAmount;
  } else if (direction === 'left') {
    container.scrollLeft -= scrollAmount;
  }
};

const calculateOverflow = () => {
  const container = scrollingContainer.value;
  const tolerance = 1;
  hasOverflowLeft.value = container.scrollLeft > 0;
  hasOverflowRight.value = container.scrollWidth > container.clientWidth + container.scrollLeft + tolerance;
};

onMounted(() => {
  scrollingContainer.value.addEventListener('scroll', calculateOverflow, { passive: true });
  window.addEventListener('resize', calculateOverflow);
  calculateOverflow();
});

onBeforeUnmount(() => {
  scrollingContainer.value.removeEventListener('scroll', calculateOverflow);
  window.removeEventListener('resize', calculateOverflow);
});

</script>

<style scoped>
.scrolling-content {
  overflow-x: scroll;
  cursor: pointer;
}

.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrolling-wrapper {
  align-items: center;
  flex: 0 0 auto;
  display: flex;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.scroll-arrow {
  box-shadow: none;
  background: none;
  border: none;
  padding: 10px;
  color: rgba(0,0,0,0.5);
  font-size: 2rem;
  cursor: pointer;
  position: absolute;
}

.scroll-arrow.left {
  left: 0;
}

.scroll-arrow.right {
  right: 0;
}
</style>
