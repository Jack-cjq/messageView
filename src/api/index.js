import { api } from '../utils/request.js'

// 登录接口
export async function login(workId, password, role = 'teacher') {
  return await api.post('/login', { workId, password, role })
}

// 管理员相关接口
export async function getAllUsers() {
  return await api.get('/admin/users')
}

export async function getUserDetail(workId, year = 2024) {
  return await api.get(`/admin/users/${workId}?year=${year}`)
}

export async function updateUser(workId, userData) {
  return await api.put(`/admin/users/${workId}`, userData)
}

export async function updateUserSalary(workId, salaryData) {
  return await api.put(`/admin/users/${workId}/salary`, salaryData)
}

export async function deleteAllUsers() {
  return await api.delete('/admin/users')
}

export async function importUsers(file, year) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('year', year.toString())
  // 不设置 Content-Type，让浏览器自动设置（包括 boundary）
  // 同时将年份作为查询参数发送，作为备选方案
  return await api.post(`/admin/import?year=${year}`, formData)
}

// 获取用户信息接口
export async function getUserInfo(workId, year = 2024) {
  return await api.get(`/user/${workId}?year=${year}`)
}

// 获取用户可用年份列表
export async function getUserYears(workId) {
  return await api.get(`/user/${workId}/years`)
}

