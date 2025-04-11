<template>
  <div class="notifications-container">
    <TransitionGroup name="notification">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        :class="['notification', `notification--${notification.type.toLowerCase()}`]"
      >
        <div class="notification__content">
          <span class="notification__message">{{ notification.message }}</span>
          <button 
            class="notification__close" 
            @click="removeNotification(notification.id)"
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useNotifications } from '../composables/useNotifications.js';

const { notifications, removeNotification } = useNotifications();
</script>

<style scoped>
.notifications-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 350px;
}

.notification {
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background-color: white;
  overflow: hidden;
}

.notification__content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.notification__message {
  flex: 1;
  font-size: 14px;
}

.notification__close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 0 4px;
}

.notification--info {
  border-left: 4px solid #2196f3;
}

.notification--success {
  border-left: 4px solid #4caf50;
}

.notification--warning {
  border-left: 4px solid #ff9800;
}

.notification--error {
  border-left: 4px solid #f44336;
}

/* Transition animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(50px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style> 