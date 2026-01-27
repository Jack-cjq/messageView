import express from 'express'
import { query } from '../config/database.js'
import { decrypt } from '../utils/crypto.js'
import { authenticateToken } from '../middleware/auth.js'
import { maskIdCard } from '../utils/mask.js'

const router = express.Router()

// 所有用户路由都需要JWT认证
router.use(authenticateToken)

// 获取用户可用年份列表
router.get('/:workId/years', async (req, res) => {
  try {
    const { workId } = req.params
    
    const sql = `SELECT DISTINCT year FROM salary_details WHERE work_id = ? ORDER BY year DESC`
    const results = await query(sql, [workId])

    res.json({
      success: true,
      data: results.map(row => row.year)
    })
  } catch (error) {
    console.error('获取年份列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

// 获取用户信息和薪资明细接口
router.get('/:workId', async (req, res) => {
  try {
    const { workId } = req.params
    const year = req.query.year || 2024

    // 查询用户基础信息
    const userSql = 'SELECT work_id, id_card, name, department, position_level FROM users WHERE work_id = ?'
    const userResults = await query(userSql, [workId])

    if (userResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    const user = userResults[0]

    // 解密身份证号并脱敏
    const decryptedIdCard = decrypt(user.id_card)
    const maskedIdCard = maskIdCard(decryptedIdCard)

    // 查询薪资明细
    const salarySql = 'SELECT * FROM salary_details WHERE work_id = ? AND year = ?'
    const salaryResults = await query(salarySql, [workId, year])

    // 处理薪资数据，解析dynamic_fields
    let salaryData = null
    if (salaryResults.length > 0) {
      const salary = salaryResults[0]
      let dynamicFields = {}
      
      // 解析dynamic_fields JSON字段
      if (salary.dynamic_fields) {
        try {
          if (typeof salary.dynamic_fields === 'string') {
            dynamicFields = JSON.parse(salary.dynamic_fields)
          } else {
            dynamicFields = salary.dynamic_fields
          }
        } catch (error) {
          console.error('解析dynamic_fields JSON失败:', error)
          console.error('原始数据:', salary.dynamic_fields)
          dynamicFields = {}
        }
      }
      
      salaryData = {
        ...salary,
        dynamicFields: dynamicFields
      }
      
      // 调试日志
      console.log('返回薪资数据:', {
        workId: workId,
        year: year,
        dynamicFieldsCount: Object.keys(dynamicFields).length,
        dynamicFields: dynamicFields
      })
    }

    res.json({
      success: true,
      data: {
        // 基础信息（身份证号已脱敏）
        workId: user.work_id,
        idCard: maskedIdCard,
        name: user.name,
        department: user.department,
        positionLevel: user.position_level,
        // 薪资明细
        salary: salaryData
      }
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

export default router

