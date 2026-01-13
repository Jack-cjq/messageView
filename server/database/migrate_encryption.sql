-- 数据库迁移脚本：扩展加密字段长度
-- 用于支持加密后的身份证号和密码存储

USE user_system;

-- 修改 id_card 字段长度（从 VARCHAR(18) 扩展到 VARCHAR(512)）
ALTER TABLE users MODIFY COLUMN id_card VARCHAR(512) NOT NULL UNIQUE COMMENT '身份证号（加密存储）';

-- 修改 password 字段长度（从 VARCHAR(255) 扩展到 VARCHAR(512)）
ALTER TABLE users MODIFY COLUMN password VARCHAR(512) NOT NULL COMMENT '密码（加密存储）';

-- 验证修改
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'user_system' 
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME IN ('id_card', 'password');

