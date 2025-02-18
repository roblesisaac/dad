import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/shared/composables/useAuth'

export function useNavigation() {
  const router = useRouter()
  const { isAuthed, login, logoutUser } = useAuth()
  
  const navigationLinks = computed(() => {
    const routes = router.options.routes.filter(route => {
      // Exclude auth, callback, and special routes
      const excludedRoutes = ['callback']
      return !excludedRoutes.includes(route.name)
    }).map(route => ({
      name: route.name,
      path: route.path
    }))

    // Add login/logout link based on auth state
    const authLink = {
      name: isAuthed.value ? 'Logout' : 'Login',
      path: '#',
      isAuthLink: true,
      action: () => isAuthed.value ? logoutUser() : login()
    }

    return [...routes, authLink]
  })

  const regularLinks = computed(() => 
    navigationLinks.value.filter(link => !link.isAuthLink)
  )

  const authLink = computed(() => 
    navigationLinks.value.find(link => link.isAuthLink)
  )

  return {
    navigationLinks,
    regularLinks,
    authLink
  }
} 