import xlsx from 'xlsx'
import { query } from '../config/database.js'
import '../config/env.js'
import { encrypt } from '../utils/crypto.js'

/**
 * 从Excel文件导入用户数据和薪资明细到数据库
 * @param {string} filePath - Excel文件路径
 * @param {number} year - 年份（用于薪资明细，必须提供）
 */
async function importUsersFromExcel(filePath, year) {
  try {
    // 验证年份参数
    if (!year || isNaN(year) || year < 2000 || year > 2100) {
      throw new Error(`无效的年份参数: ${year}，必须是2000-2100之间的数字`)
    }
    
    // 读取Excel文件
    const workbook = xlsx.readFile(filePath)
    const sheetName = workbook.SheetNames[0] // 读取第一个工作表
    const worksheet = workbook.Sheets[sheetName]
    
    // 将工作表转换为JSON数组
    const data = xlsx.utils.sheet_to_json(worksheet)
    
    console.log(`找到 ${data.length} 条记录`)
    
    if (data.length === 0) {
      console.log('Excel文件中没有数据')
      return
    }
    
    // 显示前几条数据示例
    console.log('\n数据示例（前1条）:')
    console.log(data.slice(0, 1))
    
    // 获取Excel文件中的所有列名（用于检测未匹配的字段）
    const excelColumns = data.length > 0 ? Object.keys(data[0]) : []
    console.log(`\nExcel文件中的列名（共${excelColumns.length}列）:`)
    console.log(excelColumns.join(', '))
    
    let successCount = 0
    let errorCount = 0
    const matchedColumns = new Set() // 用于跟踪已匹配的列
    
    // 遍历数据并插入数据库
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      try {
        // 根据Excel列名映射字段（支持多种可能的列名，不区分大小写，支持模糊匹配）
        const getField = (row, possibleNames, defaultValue = '', fieldName = '') => {
          // 获取所有Excel列名（用于模糊匹配）
          const excelKeys = Object.keys(row)
          
          for (const name of possibleNames) {
            // 1. 尝试精确匹配
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              const value = String(row[name]).trim()
              if (value) {
                matchedColumns.add(name)
                return value
              }
            }
            
            // 2. 尝试不区分大小写精确匹配
            const lowerName = name.toLowerCase().replace(/\s+/g, '').replace(/[，,]/g, '')
            for (const key of excelKeys) {
              const lowerKey = key.toLowerCase().replace(/\s+/g, '').replace(/[，,]/g, '')
              if (lowerKey === lowerName) {
                const value = String(row[key]).trim()
                if (value) {
                  matchedColumns.add(key)
                  return value
                }
              }
            }
            
            // 3. 尝试包含匹配（去除特殊字符和空格后）
            const nameKeywords = lowerName.replace(/[*×x]/g, '').replace(/\d+/g, '')
            if (nameKeywords.length > 0) {
              for (const key of excelKeys) {
                const lowerKey = key.toLowerCase().replace(/\s+/g, '').replace(/[，,]/g, '').replace(/[*×x]/g, '').replace(/\d+/g, '')
                // 如果Excel列名包含关键词，或者关键词包含在Excel列名中
                if (lowerKey.includes(nameKeywords) || nameKeywords.includes(lowerKey)) {
                  const value = String(row[key]).trim()
                  // 对于薪资字段，只匹配数值
                  if (fieldName && fieldName.includes('salary')) {
                    if (value && !isNaN(parseFloat(value))) {
                      matchedColumns.add(key)
                      return value
                    }
                  } else {
                    if (value) {
                      matchedColumns.add(key)
                      return value
                    }
                  }
                }
              }
            }
          }
          
          return defaultValue
        }
        
        // 基础信息字段
        const idCard = getField(row, ['身份证号', 'id_card', 'IDCard', '身份证', 'idCard', '身份证号码'], '', 'base')
        const workId = getField(row, ['工作证号', '工号', 'work_id', 'WorkID', 'workId', '工号编号'], '', 'base')
        // name字段置为空（不读取Excel中的name字段）
        const name = null
        const department = getField(row, ['部门', 'department', 'Department', '所属部门', 'dept'], '', 'base')
        const positionLevel = getField(row, ['职级', 'position_level', 'PositionLevel', '职位', 'position', 'Position', '职务', '职称'], '', 'base')
        
        // 密码：使用身份证号后六位
        const finalPassword = idCard && idCard.length >= 6 ? idCard.slice(-6) : '123456'
        
        // 验证最基础的必填字段（只有身份证号和工作证号是必须的）
        if (!idCard || !workId) {
          console.error(`第 ${i + 2} 行缺少必填字段，跳过:`, {
            idCard: idCard || '缺失',
            workId: workId || '缺失'
          })
          errorCount++
          continue
        }
        
        // 加密敏感信息：身份证号和密码
        const encryptedIdCard = encrypt(idCard)
        const encryptedPassword = encrypt(finalPassword)
        
        // 部门或职级为空时保持为NULL（不填充默认值）
        // 即使这些字段为空，也要导入这条记录的其他所有数据
        const finalDepartment = department || null
        const finalPositionLevel = positionLevel || null
        
        // 检查用户是否已存在（通过 work_id 或 id_card）
        const checkUserSql = `SELECT id, work_id FROM users WHERE work_id = ? OR id_card = ? LIMIT 1`
        const existingUsers = await query(checkUserSql, [workId, encryptedIdCard])
        
        if (existingUsers.length === 0) {
          // 用户不存在，插入新用户
          const userSql = `
            INSERT INTO users (id_card, work_id, password, name, department, position_level)
            VALUES (?, ?, ?, ?, ?, ?)
          `
          try {
            await query(userSql, [encryptedIdCard, workId, encryptedPassword, name, finalDepartment, finalPositionLevel])
          } catch (error) {
            console.warn(`第 ${i + 2} 行用户基础信息插入失败，但继续导入薪资明细:`, error.message)
          }
        } else {
          // 用户已存在，检查该用户在 salary_details 表中的最大年份
          const existingUser = existingUsers[0]
          const maxYearSql = `SELECT MAX(year) as max_year FROM salary_details WHERE work_id = ?`
          const maxYearResult = await query(maxYearSql, [existingUser.work_id])
          const maxYear = maxYearResult[0]?.max_year || 0
          
          // 如果当前导入年份大于已存在用户的最大年份，则更新用户基础信息
          if (year > maxYear) {
            const updateUserSql = `
              UPDATE users 
              SET department = ?, 
                  position_level = ?,
                  password = ?
              WHERE work_id = ?
            `
            try {
              await query(updateUserSql, [finalDepartment, finalPositionLevel, encryptedPassword, existingUser.work_id])
              console.log(`第 ${i + 2} 行用户已存在（work_id: ${workId}），当前导入年份 ${year} 大于最大年份 ${maxYear}，已更新用户基础信息`)
            } catch (error) {
              console.warn(`第 ${i + 2} 行用户基础信息更新失败，但继续导入薪资明细:`, error.message)
            }
          } else {
            // 当前导入年份小于或等于最大年份，不更新用户基础信息
            console.log(`第 ${i + 2} 行用户已存在（work_id: ${workId}），当前导入年份 ${year} 小于或等于最大年份 ${maxYear}，跳过用户基础信息更新`)
          }
        }
        
        // 薪资明细字段（转换为数字，如果为空则返回null）
        const parseDecimal = (value) => {
          if (value === null || value === undefined || value === '') return null
          const num = parseFloat(value)
          return isNaN(num) ? null : num
        }
        
        // 定义基础字段（这些字段不存储到dynamic_fields中）
        // 使用Set存储已匹配的基础字段的原始键名
        const matchedBaseFieldKeys = new Set()
        
        // 基础字段模式列表
        const baseFieldPatterns = [
          ['工作证号', '工号', 'work_id', 'WorkID', 'workId', '工号编号'],
          ['身份证号', 'id_card', 'IDCard', '身份证', 'idCard', '身份证号码'],
          ['部门', 'department', 'Department', '所属部门', 'dept'],
          ['职级', 'position_level', 'PositionLevel', '职位', 'position', 'Position', '职务', '职称'],
          ['name', 'Name', '姓名']
        ]
        
        const excelKeys = Object.keys(row)
        // 标记所有基础字段
        for (const patterns of baseFieldPatterns) {
          for (const pattern of patterns) {
            const lowerPattern = pattern.toLowerCase().replace(/\s+/g, '').replace(/[，,]/g, '')
            for (const key of excelKeys) {
              const lowerKey = key.toLowerCase().replace(/\s+/g, '').replace(/[，,]/g, '')
              if (lowerKey === lowerPattern || lowerKey.includes(lowerPattern) || lowerPattern.includes(lowerKey)) {
                matchedBaseFieldKeys.add(key)
                matchedColumns.add(key) // 标记为基础字段，已处理
                break
              }
            }
          }
        }
        
        // 构建动态字段对象（存储Excel中除了基础字段外的所有字段）
        const dynamicFields = {}
        for (const key of excelKeys) {
          // 跳过已匹配的基础字段
          if (!matchedBaseFieldKeys.has(key)) {
            // 标记为已处理（所有非基础字段都会存储到dynamic_fields）
            matchedColumns.add(key)
            // 存储字段值，如果是数字则转换为数字，否则保持原样
            const value = row[key]
            if (value !== null && value !== undefined && value !== '') {
              const strValue = String(value).trim()
              const numValue = parseFloat(strValue)
              // 如果是有效数字，存储为数字；否则存储为字符串
              dynamicFields[key] = !isNaN(numValue) && strValue !== '' ? numValue : strValue
            }
          }
        }
        
        // 将dynamicFields转换为JSON字符串
        const dynamicFieldsJson = Object.keys(dynamicFields).length > 0 ? JSON.stringify(dynamicFields) : null
        
        // 插入或更新薪资明细（使用动态字段）
        const salarySql = `
          INSERT INTO salary_details (
            work_id, year, dynamic_fields
          ) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            dynamic_fields = VALUES(dynamic_fields),
            updated_at = CURRENT_TIMESTAMP
        `
        
        await query(salarySql, [workId, year, dynamicFieldsJson])
        
        successCount++
        
        if ((i + 1) % 100 === 0) {
          console.log(`已处理 ${i + 1}/${data.length} 条记录...`)
        }
      } catch (error) {
        console.error(`第 ${i + 2} 行导入失败:`, error.message)
        console.error('数据:', row)
        errorCount++
      }
    }
    
    console.log('\n导入完成!')
    console.log(`成功: ${successCount} 条`)
    console.log(`失败: ${errorCount} 条`)
    console.log(`总计: ${data.length} 条`)
    
    // 统计字段处理情况
    const unmatchedColumns = excelColumns.filter(col => !matchedColumns.has(col))
    if (unmatchedColumns.length > 0) {
      console.log(`\n⚠️  注意: 以下Excel列名未被处理（共${unmatchedColumns.length}列，可能为空值或空列）:`)
      console.log(unmatchedColumns.join(', '))
    }
    
    // 统计动态字段数量
    if (data.length > 0 && data[0]) {
      const sampleRow = data[0]
      const baseFields = new Set()
      const baseFieldPatterns = [
        ['工作证号', '工号', 'work_id', 'WorkID', 'workId', '工号编号'],
        ['身份证号', 'id_card', 'IDCard', '身份证', 'idCard', '身份证号码'],
        ['部门', 'department', 'Department', '所属部门', 'dept'],
        ['职级', 'position_level', 'PositionLevel', '职位', 'position', 'Position', '职务', '职称'],
        ['name', 'Name', '姓名']
      ]
      
      for (const patterns of baseFieldPatterns) {
        for (const pattern of patterns) {
          const lowerPattern = pattern.toLowerCase().replace(/\s+/g, '').replace(/[，,]/g, '')
          for (const key of Object.keys(sampleRow)) {
            const lowerKey = key.toLowerCase().replace(/\s+/g, '').replace(/[，,]/g, '')
            if (lowerKey === lowerPattern || lowerKey.includes(lowerPattern) || lowerPattern.includes(lowerKey)) {
              baseFields.add(key)
            }
          }
        }
      }
      
      const dynamicFieldCount = excelColumns.length - baseFields.size - unmatchedColumns.length
      if (dynamicFieldCount > 0) {
        console.log(`\n✓ 已识别 ${dynamicFieldCount} 个动态薪资字段，已存储到 dynamic_fields JSON 字段中`)
      }
    }
    
  } catch (error) {
    console.error('导入过程中发生错误:', error)
    throw error
  }
}

// 导出函数供其他模块使用
export { importUsersFromExcel }

// 如果直接运行此脚本，执行导入
// 检查是否通过 node 直接运行（而不是作为模块导入）
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || 
    process.argv[1]?.includes('importUsers.js')) {
  const filePath = process.argv[2]
  
  if (!filePath) {
    console.log('使用方法: node server/scripts/importUsers.js <Excel文件路径>')
    console.log('示例: node server/scripts/importUsers.js data/users.xlsx')
    process.exit(1)
  }
  
  importUsersFromExcel(filePath)
    .then(() => {
      console.log('导入任务完成')
      process.exit(0)
    })
    .catch((error) => {
      console.error('导入失败:', error)
      process.exit(1)
    })
}
