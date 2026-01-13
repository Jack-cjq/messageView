/**
 * 前端JWT工具函数
 */

/**
 * 验证JWT token是否有效（仅检查格式和过期时间，不验证签名）
 * @param {string} token - JWT token
 * @returns {boolean} token是否有效
 */
export function isValidToken(token) {
  if (!token) return false

  try {
    // 解析token（不验证签名，仅检查格式和过期时间）
    const parts = token.split('.')
    if (parts.length !== 3) return false

    // 解析payload
    const payload = JSON.parse(atob(parts[1]))
    
    // 检查是否过期
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * 解码JWT token（不验证签名）
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的payload
 */
export function decodeToken(token) {
  if (!token) return null

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch (error) {
    return null
  }
}

/**
 * 获取token中的用户信息
 * @param {string} token - JWT token
 * @returns {Object|null} 用户信息
 */
export function getUserFromToken(token) {
  const payload = decodeToken(token)
  return payload || null
}

