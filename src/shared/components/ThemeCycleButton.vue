<template>
  <button
    type="button"
    class="w-6 h-6 rounded-full transition-colors focus:outline-none"
    :style="{ backgroundColor: 'var(--theme-text)' }"
    :aria-label="`Current theme ${resolvedTheme}. Click to switch theme.`"
    @click="cycleTheme"
  />
</template>

<script setup>
import { useTheme } from '@/theme/useTheme.js';

const { resolvedTheme, cycleTheme } = useTheme();
</script>
