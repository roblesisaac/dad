<template>
  <div class="relative">
    <small class="section-title">
      {{  props.name }}
    </small>
    <br/>
    <span class="section-content">$0.00</span>
  </div>
</template>

<script setup>
  const props = defineProps({
    state: 'object',
    name: 'string'
  });
</script>