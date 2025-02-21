import { authGuard } from '@auth0/auth0-vue'
const SpendingReport = () => import('@/features/dashboard/SpendingReport.vue')
const OnboardingStatus = () => import('@/features/dashboard/components/OnboardingStatus.vue')

export default [
  {
    path: '/onboarding',
    name: 'onboarding',
    component: SpendingReport,
    beforeEnter: authGuard
  },
  {
    path: '/spending-report',
    name: 'spending-report',
    component: OnboardingStatus,
    beforeEnter: authGuard
  }
]; 