-- 迁移脚本：添加动态字段存储功能
-- 执行方法：mysql -u root -p user_system < server/database/migrate_dynamic_fields.sql

USE user_system;

-- 添加JSON字段用于存储动态薪资字段
ALTER TABLE salary_details 
ADD COLUMN dynamic_fields JSON DEFAULT NULL COMMENT '动态薪资字段（JSON格式，存储Excel中的所有字段）' 
AFTER total;

