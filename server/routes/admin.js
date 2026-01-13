import express from 'express'
import multer from 'multer'
import { query } from '../config/database.js'
import { importUsersFromExcel } from '../scripts/importUsers.js'
import { decrypt, encrypt } from '../utils/crypto.js'
import { authenticateToken, requireRole } from '../middleware/auth.js'
import { maskIdCard } from '../utils/mask.js'
import path from 'path'
import fs from 'fs'

const router = express.Router()

// 所有管理员路由都需要JWT认证和admin角色
router.use(authenticateToken)
router.use(requireRole(['admin']))

// 配置 multer 用于文件上传
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true)
    } else {
      cb(new Error('只支持 Excel 文件 (.xlsx, .xls)'))
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

// 获取单个用户详细信息（用于编辑，返回完整身份证号和薪资明细）
router.get('/users/:workId', async (req, res) => {
  try {
    const { workId } = req.params
    const year = req.query.year || 2024 // 支持年份参数
    
    // 查询用户基础信息
    const userSql = `SELECT work_id, id_card, name, department, position_level, 
                     created_at, updated_at 
                     FROM users 
                     WHERE work_id = ?`
    const userResults = await query(userSql, [workId])

    if (userResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    const user = userResults[0]
    // 解密身份证号（管理员编辑时需要完整信息）
    const decryptedIdCard = decrypt(user.id_card)

    // 查询薪资明细
    const salarySql = 'SELECT * FROM salary_details WHERE work_id = ? AND year = ?'
    const salaryResults = await query(salarySql, [workId, year])

    res.json({
      success: true,
      data: {
        workId: user.work_id,
        idCard: decryptedIdCard, // 完整身份证号（仅管理员可见）
        name: user.name,
        department: user.department,
        positionLevel: user.position_level,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        salary: salaryResults.length > 0 ? salaryResults[0] : null,
        year: parseInt(year)
      }
    })
  } catch (error) {
    console.error('获取用户详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

// 获取所有用户信息（列表，返回脱敏的身份证号）
router.get('/users', async (req, res) => {
  try {
    const sql = `SELECT work_id, id_card, name, department, position_level, 
                 created_at, updated_at 
                 FROM users 
                 ORDER BY created_at DESC`
    const results = await query(sql)

    res.json({
      success: true,
      data: results.map(user => {
        // 解密身份证号并脱敏
        const decryptedIdCard = decrypt(user.id_card)
        return {
          workId: user.work_id,
          idCard: maskIdCard(decryptedIdCard), // 脱敏身份证号
          name: user.name,
          department: user.department,
          positionLevel: user.position_level,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      })
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

// 更新用户信息
router.put('/users/:workId', async (req, res) => {
  try {
    const { workId } = req.params
    const { name, department, positionLevel, idCard } = req.body

    // 构建更新字段
    const updates = []
    const values = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }
    if (department !== undefined) {
      updates.push('department = ?')
      values.push(department)
    }
    if (positionLevel !== undefined) {
      updates.push('position_level = ?')
      values.push(positionLevel)
    }
    if (idCard !== undefined) {
      // 加密身份证号
      updates.push('id_card = ?')
      values.push(encrypt(idCard))
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      })
    }

    values.push(workId)
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE work_id = ?`
    const result = await query(sql, values)

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      message: '用户信息更新成功'
    })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

// 更新用户薪资明细
router.put('/users/:workId/salary', async (req, res) => {
  try {
    const { workId } = req.params
    const { year, ...salaryData } = req.body

    if (!year) {
      return res.status(400).json({
        success: false,
        message: '年份不能为空'
      })
    }

    // 构建更新字段（排除id和work_id）
    const excludeFields = ['id', 'work_id', 'created_at', 'updated_at']
    const updates = []
    const values = []

    // 薪资明细的所有字段
    const salaryFields = [
      'year', 'research_platform', 'landmark_achievement', 'non_high_quality_research',
      'high_quality_research_reward', 'personnel_agency', 'enrollment',
      'experiment_safety_summer_overtime', 'college_excellent', 'international_student_course_fee',
      'internet_plus_short_semester', 'course_leader', 'auxiliary_teaching_workload',
      'textbook_reward', 'competition_workload', 'engineering_college_course_fee',
      'engineering_college_management_fee', 'public_elective_course_fee', 'teaching_research_reward',
      'continuing_education_paper_review', 'teaching_achievement_reward', 'extra_supplement_workload',
      'extra_teaching_supplement', 'supervision_workload', 'invigilation',
      'college_institution', 'team_leader', 'innovation_competition',
      'cultural_sports_activity', 'attendance', 'graduate_entrance_exam',
      'graduate_blind_review', 'graduate_work_reward', 'deficit',
      'deduct_advance_performance', 'total'
    ]

    for (const field of salaryFields) {
      if (salaryData.hasOwnProperty(field) && !excludeFields.includes(field)) {
        updates.push(`${field} = ?`)
        // 处理空值，转换为null
        const value = salaryData[field] === '' || salaryData[field] === null ? null : parseFloat(salaryData[field])
        values.push(isNaN(value) ? null : value)
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      })
    }

    // 使用 INSERT ... ON DUPLICATE KEY UPDATE
    const insertFields = ['work_id', 'year', ...updates.map(u => u.split(' = ')[0])]
    const insertPlaceholders = insertFields.map(() => '?').join(', ')
    const insertValues = [workId, year, ...values]
    
    // 构建更新子句
    const updateClause = updates.map(update => {
      const field = update.split(' = ')[0]
      return `${field} = VALUES(${field})`
    }).join(', ')

    const sql = `
      INSERT INTO salary_details (${insertFields.join(', ')})
      VALUES (${insertPlaceholders})
      ON DUPLICATE KEY UPDATE ${updateClause}
    `

    await query(sql, insertValues)

    res.json({
      success: true,
      message: '薪资明细更新成功'
    })
  } catch (error) {
    console.error('更新薪资明细错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

// 删除所有用户
router.delete('/users', async (req, res) => {
  try {
    // 由于外键约束，删除 users 表会自动删除 salary_details 表中的相关记录
    const sql = 'DELETE FROM users'
    await query(sql)

    res.json({
      success: true,
      message: '所有用户信息已删除'
    })
  } catch (error) {
    console.error('删除用户错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
})

// 导入用户文件
// 使用 any() 来同时处理文件和所有表单字段
router.post('/import', upload.any(), async (req, res) => {
  try {
    // 从 req.files 中获取文件（使用 any() 后，文件在 req.files 数组中）
    const file = req.files.find(f => f.fieldname === 'file')
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      })
    }

    // 获取年份参数 - 优先从查询参数获取（更可靠），如果不存在则从 req.body 获取
    const yearParam = req.query.year || req.body.year
    const year = parseInt(yearParam)
    
    // 验证年份
    if (isNaN(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: `年份无效（收到：${yearParam}），请输入2000-2100之间的年份`
      })
    }

    const filePath = file.path

    // 导入用户数据（传入年份参数）
    await importUsersFromExcel(filePath, year)

    // 删除临时文件
    fs.unlinkSync(filePath)

    res.json({
      success: true,
      message: `用户数据导入成功（年份：${year}）`
    })
  } catch (error) {
    console.error('导入用户错误:', error)
    
    // 如果文件存在，删除临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    res.status(500).json({
      success: false,
      message: error.message || '导入失败，请检查文件格式'
    })
  }
})

export default router

