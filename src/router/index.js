import LoginView from '../components/LoginView.vue'
import CallbackView from '../components/CallbackView.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/callback',
    name: 'callback',
    component: CallbackView
  }
] 