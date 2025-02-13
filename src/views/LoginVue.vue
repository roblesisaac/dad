<template>
    <div class="grid">
        <!-- <div class="cell-1">
            <ConsentBanner />
        </div> -->
        <div class="cell-1 cell-md-1-3"><LoginForm /></div>
        <div class="cell auto p30">
            <h1 style="margin:0">TrackTabs</h1>
            <i>Track every penny.</i>
        </div>
    </div>
</template>

<script setup>
import LoginForm from '@/components/LoginForm.vue';
import ConsentBanner from '@/components/ConsentBanner.vue';
</script>