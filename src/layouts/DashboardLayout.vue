<template>
  <div class="dashboard-layout">
    <nav class="dashboard-nav">
      <!-- Add navigation if needed -->
    </nav>
    
    <main class="dashboard-content">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
// Add any layout logic here if needed
</script>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.dashboard-content {
  flex: 1;
  padding: 2rem;
}
</style> 