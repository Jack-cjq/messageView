import { verifyToken } from '../utils/jwt.js'

/**
 * JWT认证中间件
 * 验证请求头中的Authorization token
 */
export function authenticateToken(req, res, next) {
  // 从请求头获取token
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证token，请先登录'
    })
  }

  try {
    // 验证token
    const decoded = verifyToken(token)
    
    // 将解码后的用户信息添加到请求对象中
    req.user = decoded
    
    next()
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message || 'Token无效或已过期'
    })
  }
}

/**
 * 可选认证中间件（token存在则验证，不存在则跳过）
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    try {
      const decoded = verifyToken(token)
      req.user = decoded
    } catch (error) {
      // token无效，但不阻止请求继续
      req.user = null
    }
  }

  next()
}

/**
 * 角色验证中间件
 * @param {string[]} allowedRoles - 允许的角色数组
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要认证'
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      })
    }

    next()
  }
}

