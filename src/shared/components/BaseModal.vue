<template>
  <Teleport to="body">
    <!-- Fixed overlay with padding enforcement -->
    <div 
      v-if="isOpen" 
      class="fixed inset-0 bg-white z-50"
    >
      <!-- This div ensures padding through absolute positioning -->
      <div class="absolute inset-x-4 inset-y-4 md:inset-x-6 md:inset-y-6 flex items-center justify-center" @click="closeModal">
        <!-- Modal container with fixed dimensions -->
        <div 
          :class="[
            'bg-white border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] w-full flex flex-col',
            {
              'max-w-screen-md': size === 'md',
              'max-w-screen-lg': size === 'lg',
              'max-w-screen-xl': size === 'xl',
              'max-w-screen-2xl': size === '2xl'
            }
          ]"
          style="max-height: calc(100% - 16px);"
          ref="modalContent"
          @click.stop
        >
          <!-- Modal header - sticky to top -->
          <div v-if="!hideHeader" class="flex items-center justify-between p-4 border-b bg-gray-50 sticky top-0 z-10">
            <slot name="header">
              <h3 class="text-lg font-semibold text-blue-800">{{ title }}</h3>
            </slot>
            <button 
              v-if="showCloseButton"
              @click="closeModal" 
              class="text-gray-500 hover:text-black transition-colors p-1 rounded hover:bg-gray-200"
              aria-label="Close modal"
            >
              <X size="20" />
            </button>
          </div>
          
          <!-- Content area - this is the only scrollable element -->
          <div class="flex-1 overflow-y-auto">
            <div :class="contentPadding ? 'p-4' : ''">
              <slot name="content">
                <slot></slot>
              </slot>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Clickable backdrop for closing -->
      <div 
        class="absolute inset-0 -z-10"
        @click="closeModal"
      ></div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Fix iOS Safari 100vh issues */
@supports (-webkit-touch-callout: none) {
  .fixed {
    height: -webkit-fill-available;
  }
}
</style>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Modal'
  },
  size: {
    type: String,
    default: 'lg',
    validator: (value) => ['md', 'lg', 'xl', '2xl'].includes(value)
  },
  hideHeader: {
    type: Boolean,
    default: false
  },
  showCloseButton: {
    type: Boolean,
    default: true
  },
  contentPadding: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);
const modalContent = ref(null);

// Close the modal when Escape key is pressed
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && props.isOpen) {
    closeModal();
  }
};

// Close modal handler
const closeModal = () => {
  emit('close');
};

// Stop body scrolling when modal is open
const preventBodyScroll = (shouldPrevent) => {
  if (shouldPrevent) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

// Watch for modal open/close to control body scroll
watch(() => props.isOpen, (newVal) => {
  preventBodyScroll(newVal);
  if (newVal && modalContent.value) {
    // Reset scroll position when opening modal
    setTimeout(() => {
      if (modalContent.value) {
        const scrollableContent = modalContent.value.querySelector('.overflow-y-auto');
        if (scrollableContent) {
          scrollableContent.scrollTop = 0;
        }
      }
    }, 50);
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  if (props.isOpen) {
    preventBodyScroll(true);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  preventBodyScroll(false);
});
</script> 