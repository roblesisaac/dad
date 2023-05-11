<template>
    <span>{{ dots }}</span>
</template>

<script setup>
    import { ref } from 'vue';

    const dots = ref('.');

    function animate() {
        dots.value = dots.value.length === 3
            ? '.'
            : dots.value + '.';

        setTimeout(animate, 300);
    }

    animate();
</script>