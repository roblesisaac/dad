import { ref } from 'vue'

const notifications = ref([]);

export function useNotifications() {
  const notify = ({ 
    message, 
    type = 'INFO', 
    timeout = 5000 
  }) => {
    const id = Math.random().toString(36).substring(2)
    const notification = {
      id,
      message,
      type,
      timeout
    }

    notifications.value.push(notification)

    if (timeout > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, timeout)
    }

    return id
  }

  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  const showInfo = (message = 'This is an info notification', timeout = 5000) => {
    return notify({
      message,
      type: 'INFO',
      timeout
    });
  }
  
  const showSuccess = (message = 'Operation completed successfully!', timeout = 5000) => {
    return notify({
      message,
      type: 'SUCCESS',
      timeout
    });
  }
  
  const showWarning = (message = 'Warning: This action may have consequences', timeout = 7000) => {
    return notify({
      message,
      type: 'WARNING',
      timeout
    });
  }
  
  const showError = (message = 'An error occurred. Please try again.', timeout = 10000) => {
    return notify({
      message,
      type: 'ERROR',
      timeout
    });
  }
  
  const showPersistent = (message = 'This notification will not disappear automatically', type = 'INFO') => {
    return notify({
      message, 
      type,
      timeout: 0 // Won't auto-dismiss
    });
  }

  return {
    notifications,
    notify,
    removeNotification,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    showPersistent
  }
} 