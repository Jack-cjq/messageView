# 数据库重置指南

## 方法一：完全重置（推荐 - 如果旧数据可以不要）

此方法会删除所有薪资明细数据，并重新创建包含 `dynamic_fields` 字段的表。

### 执行步骤：

1. **备份数据库（可选，但建议）**：
   ```bash
   mysqldump -u root -p user_system > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **执行重置脚本**：
   ```bash
   mysql -u root -p user_system < server/database/reset_with_dynamic_fields.sql
   ```

3. **验证**：
   ```bash
   mysql -u root -p user_system -e "DESCRIBE salary_details;"
   ```
   应该能看到 `dynamic_fields` 字段（类型为 JSON）

---

## 方法二：仅清空数据并添加字段（保留表结构）

如果表已经存在，只想清空数据并添加新字段：

### 执行步骤：

1. **清空薪资明细数据**：
   ```bash
   mysql -u root -p user_system -e "TRUNCATE TABLE salary_details;"
   ```

2. **添加 dynamic_fields 字段（如果还没有）**：
   ```bash
   mysql -u root -p user_system < server/database/migrate_dynamic_fields.sql
   ```

---

## 方法三：仅添加字段（保留所有数据）

如果只想添加新字段而不删除数据：

```bash
mysql -u root -p user_system < server/database/migrate_dynamic_fields.sql
```

注意：如果字段已存在，会报错，可以忽略。

---

## 验证新功能

重置完成后，可以：

1. **检查字段是否存在**：
   ```bash
   mysql -u root -p user_system -e "SHOW COLUMNS FROM salary_details LIKE 'dynamic_fields';"
   ```

2. **上传新的Excel文件测试**：
   - 登录管理员后台
   - 上传包含新字段结构的Excel文件
   - 检查数据是否正确存储到 `dynamic_fields` JSON字段中

---

## 注意事项

⚠️ **警告**：
- 方法一会删除所有薪资明细数据
- 用户基础信息（users表）和管理员信息（admins表）不会被删除
- 建议在执行前备份数据库

