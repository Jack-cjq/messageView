import jwt from 'jsonwebtoken'

// JWT密钥（应该从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d' // 默认7天过期

/**
 * 生成JWT token
 * @param {Object} payload - token负载数据
 * @param {string} expiresIn - 过期时间（可选，默认7天）
 * @returns {string} JWT token
 */
export function generateToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: 'user-system',
    audience: 'user-system-client'
  })
}

/**
 * 验证JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的payload，如果无效则返回null
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'user-system',
      audience: 'user-system-client'
    })
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token已过期')
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token无效')
    } else {
      throw new Error('Token验证失败')
    }
  }
}

/**
 * 解码JWT token（不验证签名，仅用于调试）
 * @param {string} token - JWT token
 * @returns {Object} 解码后的payload
 */
export function decodeToken(token) {
  return jwt.decode(token)
}

