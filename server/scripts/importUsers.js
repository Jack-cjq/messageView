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
    
    let successCount = 0
    let errorCount = 0
    
    // 遍历数据并插入数据库
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      
      try {
        // 根据Excel列名映射字段（支持多种可能的列名，不区分大小写）
        const getField = (row, possibleNames, defaultValue = '') => {
          for (const name of possibleNames) {
            // 尝试精确匹配
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
              const value = String(row[name]).trim()
              return value || defaultValue
            }
            // 尝试不区分大小写匹配
            const lowerName = name.toLowerCase()
            for (const key in row) {
              if (key.toLowerCase() === lowerName) {
                const value = String(row[key]).trim()
                return value || defaultValue
              }
            }
          }
          return defaultValue
        }
        
        // 基础信息字段
        const idCard = getField(row, ['身份证号', 'id_card', 'IDCard', '身份证', 'idCard', '身份证号码'])
        const workId = getField(row, ['工作证号', '工号', 'work_id', 'WorkID', 'workId', '工号编号'])
        // name字段置为空（不读取Excel中的name字段）
        const name = null
        const department = getField(row, ['部门', 'department', 'Department', '所属部门', 'dept'])
        const positionLevel = getField(row, ['职级', 'position_level', 'PositionLevel', '职位', 'position', 'Position', '职务', '职称'])
        
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
        
        // 使用传入的年份参数，而不是从Excel读取
        const salaryYear = year
        
        // 科研相关
        const researchPlatform = parseDecimal(getField(row, ['科研平台', 'research_platform', 'ResearchPlatform']))
        const landmarkAchievement = parseDecimal(getField(row, ['标志性成果', 'landmark_achievement', 'LandmarkAchievement']))
        const nonHighQualityResearch = parseDecimal(getField(row, ['非高质量科研*10', '非高质量科研', 'non_high_quality_research', 'NonHighQualityResearch']))
        const highQualityResearchReward = parseDecimal(getField(row, ['高质量科研奖励*40', '高质量科研奖励', 'high_quality_research_reward', 'HighQualityResearchReward']))
        
        // 人事相关
        const personnelAgency = parseDecimal(getField(row, ['人事代发', 'personnel_agency', 'PersonnelAgency']))
        const enrollment = parseDecimal(getField(row, ['招生', 'enrollment', 'Enrollment']))
        // 实验安全、暑假加班为同一个字段
        const experimentSafetySummerOvertime = parseDecimal(getField(row, ['实验安全、暑假加班', '实验安全,暑假加班', 'experiment_safety_summer_overtime', 'ExperimentSafetySummerOvertime']))
        const collegeExcellent = parseDecimal(getField(row, ['院优', 'college_excellent', 'CollegeExcellent']))
        
        // 教学相关
        const internationalStudentCourseFee = parseDecimal(getField(row, ['留学生课酬*75', '留学生课酬', 'international_student_course_fee', 'InternationalStudentCourseFee']))
        const internetPlusShortSemester = parseDecimal(getField(row, ['互联网+短学期*30', '互联网+短学期', 'internet_plus_short_semester', 'InternetPlusShortSemester']))
        const courseLeader = parseDecimal(getField(row, ['课程负责人', 'course_leader', 'CourseLeader']))
        const auxiliaryTeachingWorkload = parseDecimal(getField(row, ['辅助教学工作量*35', '辅助教学工作量', 'auxiliary_teaching_workload', 'AuxiliaryTeachingWorkload']))
        const textbookReward = parseDecimal(getField(row, ['编著教材奖励', 'textbook_reward', 'TextbookReward']))
        const competitionWorkload = parseDecimal(getField(row, ['竞赛工作量*40', '竞赛工作量', 'competition_workload', 'CompetitionWorkload']))
        const engineeringCollegeCourseFee = parseDecimal(getField(row, ['工程学院课酬', 'engineering_college_course_fee', 'EngineeringCollegeCourseFee']))
        const engineeringCollegeManagementFee = parseDecimal(getField(row, ['工程学院管理费', 'engineering_college_management_fee', 'EngineeringCollegeManagementFee']))
        const publicElectiveCourseFee = parseDecimal(getField(row, ['公选课课酬', 'public_elective_course_fee', 'PublicElectiveCourseFee']))
        const teachingResearchReward = parseDecimal(getField(row, ['教研奖励', 'teaching_research_reward', 'TeachingResearchReward']))
        const continuingEducationPaperReview = parseDecimal(getField(row, ['继教论文评审', 'continuing_education_paper_review', 'ContinuingEducationPaperReview']))
        const teachingAchievementReward = parseDecimal(getField(row, ['教学成果奖励*40', '教学成果奖励', 'teaching_achievement_reward', 'TeachingAchievementReward']))
        const extraSupplementWorkload = parseDecimal(getField(row, ['额外增补工作量*40', '额外增补工作量', 'extra_supplement_workload', 'ExtraSupplementWorkload']))
        const extraTeachingSupplement = parseDecimal(getField(row, ['额外教学增补', 'extra_teaching_supplement', 'ExtraTeachingSupplement']))
        const supervisionWorkload = parseDecimal(getField(row, ['督导工作量', 'supervision_workload', 'SupervisionWorkload']))
        const invigilation = parseDecimal(getField(row, ['监考', 'invigilation', 'Invigilation']))
        
        // 管理相关
        const collegeInstitution = parseDecimal(getField(row, ['院设机构', 'college_institution', 'CollegeInstitution']))
        const teamLeader = parseDecimal(getField(row, ['团队负责人', 'team_leader', 'TeamLeader']))
        
        // 其他
        const innovationCompetition = parseDecimal(getField(row, ['双创比赛', 'innovation_competition', 'InnovationCompetition']))
        const culturalSportsActivity = parseDecimal(getField(row, ['文体活动*100', '文体活动', 'cultural_sports_activity', 'CulturalSportsActivity']))
        const attendance = parseDecimal(getField(row, ['考勤1500', '考勤', 'attendance', 'Attendance']))
        const graduateEntranceExam = parseDecimal(getField(row, ['研究生复试', 'graduate_entrance_exam', 'GraduateEntranceExam']))
        const graduateBlindReview = parseDecimal(getField(row, ['研究生盲审', 'graduate_blind_review', 'GraduateBlindReview']))
        const graduateWorkReward = parseDecimal(getField(row, ['研工奖励', 'graduate_work_reward', 'GraduateWorkReward']))
        
        // 扣除项
        // 根据导入年份动态匹配赤字字段，例如：2025年导入匹配"2025赤字"，2026年导入匹配"2026赤字"
        // 同时支持通用匹配："赤字"、"deficit"等
        const deficitFieldNames = [
          `${year}赤字`,  // 年份特定匹配，如"2025赤字"、"2026赤字"
          '赤字',          // 通用匹配
          'deficit',       // 英文通用匹配
          'Deficit',       // 英文首字母大写
          `deficit_${year}`, // 英文年份格式，如"deficit_2025"
          `Deficit${year}`  // 英文年份格式，如"Deficit2025"
        ]
        const deficit = parseDecimal(getField(row, deficitFieldNames))
        const deductAdvancePerformance = parseDecimal(getField(row, ['扣除预支绩效', 'deduct_advance_performance', 'DeductAdvancePerformance']))
        
        // 直接从Excel读取合计值，如果没有则为NULL（不自行计算）
        const total = parseDecimal(getField(row, ['合计', 'total', 'Total', '总计']))
        
        // 插入或更新薪资明细
        const salarySql = `
          INSERT INTO salary_details (
            work_id, year,
            research_platform, landmark_achievement, non_high_quality_research, high_quality_research_reward,
            personnel_agency, enrollment, experiment_safety_summer_overtime, college_excellent,
            international_student_course_fee, internet_plus_short_semester, course_leader, auxiliary_teaching_workload,
            textbook_reward, competition_workload, engineering_college_course_fee, engineering_college_management_fee,
            public_elective_course_fee, teaching_research_reward, continuing_education_paper_review, teaching_achievement_reward,
            extra_supplement_workload, extra_teaching_supplement, supervision_workload, invigilation,
            college_institution, team_leader, innovation_competition, cultural_sports_activity, attendance,
            graduate_entrance_exam, graduate_blind_review, graduate_work_reward,
            deficit, deduct_advance_performance, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            research_platform = VALUES(research_platform),
            landmark_achievement = VALUES(landmark_achievement),
            non_high_quality_research = VALUES(non_high_quality_research),
            high_quality_research_reward = VALUES(high_quality_research_reward),
            personnel_agency = VALUES(personnel_agency),
            enrollment = VALUES(enrollment),
            experiment_safety_summer_overtime = VALUES(experiment_safety_summer_overtime),
            college_excellent = VALUES(college_excellent),
            international_student_course_fee = VALUES(international_student_course_fee),
            internet_plus_short_semester = VALUES(internet_plus_short_semester),
            course_leader = VALUES(course_leader),
            auxiliary_teaching_workload = VALUES(auxiliary_teaching_workload),
            textbook_reward = VALUES(textbook_reward),
            competition_workload = VALUES(competition_workload),
            engineering_college_course_fee = VALUES(engineering_college_course_fee),
            engineering_college_management_fee = VALUES(engineering_college_management_fee),
            public_elective_course_fee = VALUES(public_elective_course_fee),
            teaching_research_reward = VALUES(teaching_research_reward),
            continuing_education_paper_review = VALUES(continuing_education_paper_review),
            teaching_achievement_reward = VALUES(teaching_achievement_reward),
            extra_supplement_workload = VALUES(extra_supplement_workload),
            extra_teaching_supplement = VALUES(extra_teaching_supplement),
            supervision_workload = VALUES(supervision_workload),
            invigilation = VALUES(invigilation),
            college_institution = VALUES(college_institution),
            team_leader = VALUES(team_leader),
            innovation_competition = VALUES(innovation_competition),
            cultural_sports_activity = VALUES(cultural_sports_activity),
            attendance = VALUES(attendance),
            graduate_entrance_exam = VALUES(graduate_entrance_exam),
            graduate_blind_review = VALUES(graduate_blind_review),
            graduate_work_reward = VALUES(graduate_work_reward),
            deficit = VALUES(deficit),
            deduct_advance_performance = VALUES(deduct_advance_performance),
            total = VALUES(total)
        `
        
        await query(salarySql, [
          workId, year,
          researchPlatform, landmarkAchievement, nonHighQualityResearch, highQualityResearchReward,
          personnelAgency, enrollment, experimentSafetySummerOvertime, collegeExcellent,
          internationalStudentCourseFee, internetPlusShortSemester, courseLeader, auxiliaryTeachingWorkload,
          textbookReward, competitionWorkload, engineeringCollegeCourseFee, engineeringCollegeManagementFee,
          publicElectiveCourseFee, teachingResearchReward, continuingEducationPaperReview, teachingAchievementReward,
          extraSupplementWorkload, extraTeachingSupplement, supervisionWorkload, invigilation,
          collegeInstitution, teamLeader, innovationCompetition, culturalSportsActivity, attendance,
          graduateEntranceExam, graduateBlindReview, graduateWorkReward,
          deficit, deductAdvancePerformance, total
        ])
        
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
