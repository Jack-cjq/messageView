import express from 'express'
import { query } from '../config/database.js'
import { encrypt, decrypt } from '../utils/crypto.js'
import { generateToken } from '../utils/jwt.js'
import { maskIdCard } from '../utils/mask.js'

const router = express.Router()

// 登录接口
router.post('/', async (req, res) => {
  try {
    const { workId, password, role = 'teacher' } = req.body

    // 验证输入
    if (!workId || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      })
    }

    // 管理员登录
    if (role === 'admin') {
      const adminSql = `SELECT id, username FROM admins WHERE username = ? AND password = ?`
      const adminResults = await query(adminSql, [workId, password])

      if (adminResults.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        })
      }

      const admin = adminResults[0]

      // 生成JWT token
      const token = generateToken({
        id: admin.id,
        username: admin.username,
        role: 'admin'
      })

      return res.json({
        success: true,
        message: '登录成功',
        data: {
          username: admin.username,
          role: 'admin',
          token
        }
      })
    }

    // 教师登录（支持工号或身份证号登录）
    // 查询用户（支持工号或身份证号登录）
    // 如果用户输入的是身份证号，需要尝试加密后查询
    const encryptedWorkId = encrypt(workId)
    
    // 先按工号查询
    let sql = `SELECT work_id, id_card, password, name, department, position_level 
               FROM users 
               WHERE work_id = ?`
    let results = await query(sql, [workId])
    
    // 如果按工号没找到，尝试按身份证号查询（可能是加密的或未加密的）
    if (results.length === 0) {
      sql = `SELECT work_id, id_card, password, name, department, position_level 
             FROM users 
             WHERE id_card = ? OR id_card = ?`
      results = await query(sql, [encryptedWorkId, workId])
    }

    if (results.length === 0) {
      return res.status(401).json({
        success: false,
        message: '工号或密码错误'
      })
    }

    // 验证密码
    // 由于AES加密每次IV不同，不能直接比较加密结果
    // 需要解密数据库中的密码，然后与用户输入的明文密码比较
    let validUser = null
    for (const user of results) {
      const userPassword = user.password
      let passwordMatch = false
      
      // 检查密码是否匹配
      if (userPassword.includes(':')) {
        // 密码是加密格式（iv:encrypted），需要解密后比较
        try {
          const decryptedPassword = decrypt(userPassword)
          passwordMatch = (decryptedPassword === password)
        } catch (error) {
          // 解密失败，可能是格式问题，跳过
          console.warn('密码解密失败:', error.message)
          continue
        }
      } else {
        // 密码是明文格式（旧数据兼容），直接比较
        passwordMatch = (userPassword === password)
      }
      
      if (passwordMatch) {
        validUser = user
        break
      }
    }

    if (!validUser) {
      return res.status(401).json({
        success: false,
        message: '工号或密码错误'
      })
    }

    // 解密身份证号
    const decryptedIdCard = decrypt(validUser.id_card)
    // 脱敏身份证号用于返回（不在JWT中存储完整身份证号）
    const maskedIdCard = maskIdCard(decryptedIdCard)

    // 生成JWT token（不包含敏感信息）
    const token = generateToken({
      workId: validUser.work_id,
      name: validUser.name,
      department: validUser.department,
      positionLevel: validUser.position_level,
      role: 'teacher'
    })

    // 返回用户信息（身份证号已脱敏，不包含密码）
    res.json({
      success: true,
      message: '登录成功',
      data: {
        workId: validUser.work_id,
        idCard: maskedIdCard, // 脱敏后的身份证号
        name: validUser.name,
        department: validUser.department,
        positionLevel: validUser.position_level,
        role: 'teacher',
        token
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

export default router

