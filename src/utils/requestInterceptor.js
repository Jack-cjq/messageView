import { addRequestInterceptor, addResponseInterceptor } from './request.js'

// 请求拦截器：添加统一的配置
addRequestInterceptor((config) => {
  // 添加JWT认证token
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    }
  }
  
  return config
})

// 响应拦截器：统一处理响应
addResponseInterceptor((response) => {
  // 统一处理错误
  if (!response.ok && response.status === 401) {
    // 未授权，清除登录状态和token
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    // 跳转到登录页
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
  
  if (!response.ok && response.status === 403) {
    // 权限不足
    const error = new Error(response.data?.message || '权限不足')
    error.status = 403
    throw error
  }
  
  return response
})

