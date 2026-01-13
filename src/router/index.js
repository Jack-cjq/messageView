import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import UserInfo from '../views/UserInfo.vue'
import Admin from '../views/Admin.vue'
import { isValidToken, getUserFromToken } from '../utils/jwt.js'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/userinfo',
    name: 'UserInfo',
    component: UserInfo,
    meta: { requiresAuth: true, role: 'teacher' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { requiresAuth: true, role: 'admin' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 检查登录状态和JWT token
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
  const userRole = localStorage.getItem('userRole')
  
  // 如果token无效或过期，清除登录状态
  if (token && !isValidToken(token)) {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    
    if (to.meta.requiresAuth) {
      next('/login')
      return
    }
  }
  
  // 验证token中的角色信息
  if (token && isAuthenticated) {
    const tokenUser = getUserFromToken(token)
    if (tokenUser && tokenUser.role !== userRole) {
      // token中的角色与存储的角色不一致，清除状态
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('token')
      localStorage.removeItem('userRole')
      
      if (to.meta.requiresAuth) {
        next('/login')
        return
      }
    }
  }
  
  if (to.meta.requiresAuth && (!isAuthenticated || !token)) {
    next('/login')
  } else if (to.meta.requiresAuth && to.meta.role && userRole !== to.meta.role) {
    // 角色不匹配，跳转到对应页面
    if (userRole === 'admin') {
      next('/admin')
    } else {
      next('/userinfo')
    }
  } else if (to.path === '/login' && isAuthenticated && token && isValidToken(token)) {
    // 已登录且token有效，根据角色跳转
    if (userRole === 'admin') {
      next('/admin')
    } else {
      next('/userinfo')
    }
  } else {
    next()
  }
})

export default router

