import crypto from 'crypto'

// 加密密钥（应该从环境变量读取，这里使用默认值）
// 如果环境变量是字符串，需要转换为32字节的Buffer
let ENCRYPTION_KEY
if (process.env.ENCRYPTION_KEY) {
  // 如果环境变量是32字节的hex字符串，直接使用
  if (process.env.ENCRYPTION_KEY.length === 64) {
    ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  } else {
    // 否则使用scrypt生成32字节密钥
    ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32)
  }
} else {
  // 默认密钥（生产环境应该设置环境变量）
  ENCRYPTION_KEY = crypto.scryptSync('default-secret-key-change-in-production', 'salt', 32)
}

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // 对于 AES，IV 长度必须是 16 字节

/**
 * 加密数据
 * @param {string} text - 要加密的文本
 * @returns {string} 加密后的字符串（格式：iv:encrypted）
 */
export function encrypt(text) {
  if (!text) return text
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // 返回 iv:encrypted 格式，方便后续解密
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('加密错误:', error)
    throw error
  }
}

/**
 * 解密数据
 * @param {string} encryptedText - 加密的文本（格式：iv:encrypted）
 * @returns {string} 解密后的字符串
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText
  
  // 检查是否是加密格式（包含冒号）
  if (!encryptedText.includes(':')) {
    // 如果不是加密格式，可能是旧数据，直接返回
    return encryptedText
  }
  
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 2) {
      // 格式不正确，可能是旧数据
      return encryptedText
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('解密错误:', error)
    // 解密失败，可能是旧数据，返回原值
    return encryptedText
  }
}

/**
 * 批量加密（用于数组）
 * @param {Array} items - 要加密的数组
 * @returns {Array} 加密后的数组
 */
export function encryptBatch(items) {
  if (!Array.isArray(items)) return items
  return items.map(item => encrypt(item))
}

/**
 * 批量解密（用于数组）
 * @param {Array} items - 要解密的数组
 * @returns {Array} 解密后的数组
 */
export function decryptBatch(items) {
  if (!Array.isArray(items)) return items
  return items.map(item => decrypt(item))
}

