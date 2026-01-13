-- 创建数据库
CREATE DATABASE IF NOT EXISTS user_system DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE user_system;

-- 创建用户基础信息表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_card VARCHAR(512) NOT NULL UNIQUE COMMENT '身份证号（加密存储）',
  work_id VARCHAR(20) NOT NULL UNIQUE COMMENT '工作证号',
  password VARCHAR(512) NOT NULL COMMENT '密码（加密存储）',
  name VARCHAR(50) DEFAULT NULL COMMENT '姓名',
  department VARCHAR(50) DEFAULT NULL COMMENT '部门',
  position_level VARCHAR(50) DEFAULT NULL COMMENT '职级',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_work_id (work_id),
  INDEX idx_id_card (id_card)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户基础信息表';

-- 创建薪资明细表
CREATE TABLE IF NOT EXISTS salary_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_id VARCHAR(20) NOT NULL COMMENT '工作证号',
  year INT NOT NULL DEFAULT 2024 COMMENT '年份',
  -- 科研相关
  research_platform DECIMAL(10, 2) DEFAULT NULL COMMENT '科研平台',
  landmark_achievement DECIMAL(10, 2) DEFAULT NULL COMMENT '标志性成果',
  non_high_quality_research DECIMAL(10, 2) DEFAULT NULL COMMENT '非高质量科研*10',
  high_quality_research_reward DECIMAL(10, 2) DEFAULT NULL COMMENT '高质量科研奖励*40',
  -- 人事相关
  personnel_agency DECIMAL(10, 2) DEFAULT NULL COMMENT '人事代发',
  enrollment DECIMAL(10, 2) DEFAULT NULL COMMENT '招生',
  experiment_safety_summer_overtime DECIMAL(10, 2) DEFAULT NULL COMMENT '实验安全、暑假加班',
  college_excellent DECIMAL(10, 2) DEFAULT NULL COMMENT '院优',
  -- 教学相关
  international_student_course_fee DECIMAL(10, 2) DEFAULT NULL COMMENT '留学生课酬*75',
  internet_plus_short_semester DECIMAL(10, 2) DEFAULT NULL COMMENT '互联网+短学期*30',
  course_leader DECIMAL(10, 2) DEFAULT NULL COMMENT '课程负责人',
  auxiliary_teaching_workload DECIMAL(10, 2) DEFAULT NULL COMMENT '辅助教学工作量*35',
  textbook_reward DECIMAL(10, 2) DEFAULT NULL COMMENT '编著教材奖励',
  competition_workload DECIMAL(10, 2) DEFAULT NULL COMMENT '竞赛工作量*40',
  engineering_college_course_fee DECIMAL(10, 2) DEFAULT NULL COMMENT '工程学院课酬',
  engineering_college_management_fee DECIMAL(10, 2) DEFAULT NULL COMMENT '工程学院管理费',
  public_elective_course_fee DECIMAL(10, 2) DEFAULT NULL COMMENT '公选课课酬',
  teaching_research_reward DECIMAL(10, 2) DEFAULT NULL COMMENT '教研奖励',
  continuing_education_paper_review DECIMAL(10, 2) DEFAULT NULL COMMENT '继教论文评审',
  teaching_achievement_reward DECIMAL(10, 2) DEFAULT NULL COMMENT '教学成果奖励*40',
  extra_supplement_workload DECIMAL(10, 2) DEFAULT NULL COMMENT '额外增补工作量*40',
  extra_teaching_supplement DECIMAL(10, 2) DEFAULT NULL COMMENT '额外教学增补',
  supervision_workload DECIMAL(10, 2) DEFAULT NULL COMMENT '督导工作量',
  invigilation DECIMAL(10, 2) DEFAULT NULL COMMENT '监考',
  -- 管理相关
  college_institution DECIMAL(10, 2) DEFAULT NULL COMMENT '院设机构',
  team_leader DECIMAL(10, 2) DEFAULT NULL COMMENT '团队负责人',
  -- 其他
  innovation_competition DECIMAL(10, 2) DEFAULT NULL COMMENT '双创比赛',
  cultural_sports_activity DECIMAL(10, 2) DEFAULT NULL COMMENT '文体活动*100',
  attendance DECIMAL(10, 2) DEFAULT NULL COMMENT '考勤1500',
  graduate_entrance_exam DECIMAL(10, 2) DEFAULT NULL COMMENT '研究生复试',
  graduate_blind_review DECIMAL(10, 2) DEFAULT NULL COMMENT '研究生盲审',
  graduate_work_reward DECIMAL(10, 2) DEFAULT NULL COMMENT '研工奖励',
  -- 扣除项
  deficit DECIMAL(10, 2) DEFAULT NULL COMMENT '赤字（根据年份动态匹配，如2025赤字、2026赤字）',
  deduct_advance_performance DECIMAL(10, 2) DEFAULT NULL COMMENT '扣除预支绩效',
  -- 合计
  total DECIMAL(10, 2) DEFAULT NULL COMMENT '合计',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_work_year (work_id, year),
  INDEX idx_work_id (work_id),
  INDEX idx_year (year),
  FOREIGN KEY (work_id) REFERENCES users(work_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='薪资明细表';

-- 创建管理员表
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '管理员用户名',
  password VARCHAR(255) NOT NULL COMMENT '管理员密码',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 插入默认管理员账号（用户名：admin，密码：admin123）
INSERT INTO admins (username, password) VALUES ('admin', 'admin123')
ON DUPLICATE KEY UPDATE username = username;


