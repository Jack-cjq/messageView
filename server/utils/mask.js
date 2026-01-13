/**
 * 数据脱敏工具函数
 */

/**
 * 脱敏身份证号
 * 格式：前6位 + ****** + 后4位
 * 例如：420106******7710
 * @param {string} idCard - 身份证号
 * @returns {string} 脱敏后的身份证号
 */
export function maskIdCard(idCard) {
  if (!idCard || idCard.length < 10) {
    return idCard || ''
  }
  
  // 如果长度是18位（标准身份证号）
  if (idCard.length === 18) {
    return idCard.substring(0, 6) + '********' + idCard.substring(14)
  }
  
  // 其他长度，保留前3位和后3位
  if (idCard.length > 6) {
    const prefix = idCard.substring(0, 3)
    const suffix = idCard.substring(idCard.length - 3)
    const maskLength = idCard.length - 6
    return prefix + '*'.repeat(maskLength) + suffix
  }
  
  // 太短，直接返回
  return idCard
}

/**
 * 脱敏手机号
 * 格式：前3位 + **** + 后4位
 * 例如：138****5678
 * @param {string} phone - 手机号
 * @returns {string} 脱敏后的手机号
 */
export function maskPhone(phone) {
  if (!phone || phone.length < 7) {
    return phone || ''
  }
  
  if (phone.length === 11) {
    return phone.substring(0, 3) + '****' + phone.substring(7)
  }
  
  // 其他长度
  const prefix = phone.substring(0, 3)
  const suffix = phone.substring(phone.length - 4)
  return prefix + '****' + suffix
}

/**
 * 脱敏姓名
 * 格式：保留第一个字，其余用*代替
 * 例如：张**
 * @param {string} name - 姓名
 * @returns {string} 脱敏后的姓名
 */
export function maskName(name) {
  if (!name || name.length === 0) {
    return name || ''
  }
  
  if (name.length === 1) {
    return '*'
  }
  
  return name.substring(0, 1) + '*'.repeat(name.length - 1)
}

/**
 * 完全隐藏敏感信息
 * @param {string} value - 要隐藏的值
 * @returns {string} '***'
 */
export function hide(value) {
  return '***'
}

