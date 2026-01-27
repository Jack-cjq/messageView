-- 数据库重置脚本：清空旧数据并应用新的动态字段结构
-- 执行方法：mysql -u root -p user_system < server/database/reset_with_dynamic_fields.sql
-- 
-- 警告：此脚本会删除所有薪资明细数据，请谨慎操作！

USE user_system;

-- 1. 删除薪资明细表（如果存在）
DROP TABLE IF EXISTS salary_details;

-- 2. 重新创建薪资明细表（简化版，只使用dynamic_fields存储所有薪资字段）
CREATE TABLE salary_details (
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

-- 3. 显示完成信息
SELECT '数据库重置完成！salary_details表已重新创建，包含dynamic_fields字段。' AS message;

