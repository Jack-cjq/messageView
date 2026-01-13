-- 迁移脚本：将 deficit_2024 字段改为通用的 deficit 字段
-- 执行方法：mysql -u root -p < server/database/migrate_deficit_field.sql

USE user_system;

-- 检查字段是否存在，如果存在则重命名
-- 如果字段不存在，则直接添加新字段
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'user_system' 
    AND TABLE_NAME = 'salary_details' 
    AND COLUMN_NAME = 'deficit_2024'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE salary_details CHANGE COLUMN deficit_2024 deficit DECIMAL(10, 2) DEFAULT NULL COMMENT ''赤字（根据年份动态匹配，如2025赤字、2026赤字）'';',
  'ALTER TABLE salary_details ADD COLUMN deficit DECIMAL(10, 2) DEFAULT NULL COMMENT ''赤字（根据年份动态匹配，如2025赤字、2026赤字）'' AFTER graduate_work_reward;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

