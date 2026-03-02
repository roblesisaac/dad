<template>
  <button
    type="button"
    class="inline-flex items-center justify-center px-3 py-2 rounded-xl border-2 border-black bg-white text-black text-[10px] sm:text-xs font-black uppercase tracking-widest transition-colors hover:bg-gray-50 focus:outline-none"
    :aria-label="`Current theme ${themeLabel}. Click to switch theme.`"
    @click="cycleTheme"
  >
    {{ themeLabel }}
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { useTheme } from '@/theme/useTheme.js';

const { resolvedTheme, cycleTheme } = useTheme();

const themeLabel = computed(() => {
  const current = resolvedTheme.value || 'light';
  return `${current.charAt(0).toUpperCase()}${current.slice(1)}`;
});
</script>

