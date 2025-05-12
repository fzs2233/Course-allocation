import { createRouter, createWebHistory } from 'vue-router'

// 引入主页面
import Home from '../views/Home.vue'

// 定义路由
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    // 懒加载路由
    component: () => import('../views/About.vue')
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router 