import { ref } from 'vue'

const notifications = ref([]);

export function useNotification() {
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

  return {
    notifications,
    notify,
    removeNotification
  }
} 