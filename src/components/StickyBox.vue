<template>
  <div class="sticky-div" :class="{ 'is-sticky': isSticky }">
    <slot></slot>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';

const isSticky = ref(false);
const el = ref(null);

const handleScroll = () => {
  const pageY = window.pageYOffset;
  const elY = el.value.offsetTop;
  const scrollHeight = document.documentElement.scrollHeight;

  isSticky.value = pageY > elY || scrollHeight <= window.innerHeight;
};

onMounted(() => {
  el.value = document.querySelector(".sticky-div");
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

</script>

<style>
.sticky-div {
  position: relative;
  z-index: 1;
  background-color: #fff;
}

.is-sticky {
  position: fixed;
  top: 0;
  width: 100%;
}
</style>