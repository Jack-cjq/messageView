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

-- 创建薪资明细表（使用dynamic_fields存储所有动态字段）
CREATE TABLE IF NOT EXISTS salary_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_id VARCHAR(20) NOT NULL COMMENT '工作证号',
  year INT NOT NULL DEFAULT 2024 COMMENT '年份',
  -- 动态字段JSON存储（存储Excel中的所有薪资字段）
  dynamic_fields JSON DEFAULT NULL COMMENT '动态薪资字段（JSON格式，存储Excel中的所有字段）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_work_year (work_id, year),
  INDEX idx_work_id (work_id),
  INDEX idx_year (year),
  FOREIGN KEY (work_id) REFERENCES users(work_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='薪资明细表（使用dynamic_fields存储所有动态字段）';

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


