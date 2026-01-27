# 服务器更新部署指南（动态字段版本）

## ⚠️ 重要提示

**本次更新包含数据库结构变更**，需要执行数据库重置脚本。**此操作会删除所有薪资明细数据**，请确保：
1. 如果需要保留旧数据，请先备份数据库
2. 确认旧数据可以不要，或已导出备份

## 部署步骤

### 第一步：备份数据库（可选，但强烈推荐）

```bash
# 连接到服务器
ssh ubuntu@114.132.158.25

# 备份数据库（如果需要保留旧数据）
mysqldump -u root -p user_system > /tmp/messageview_backup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份文件
ls -lh /tmp/messageview_backup_*.sql
```

### 第二步：上传最新代码

```bash
# 进入项目目录
cd /var/www/messageView

# 方式一：使用 Git（推荐）
git pull origin main

# 方式二：如果使用 SCP 上传
# 在本地执行：scp -r D:\messageView ubuntu@114.132.158.25:/var/www/
```

### 第三步：执行数据库重置脚本

```bash
# 执行数据库重置脚本（会删除所有薪资明细数据）
mysql -u root -p user_system < /var/www/messageView/server/database/reset_with_dynamic_fields.sql

# 验证表结构
mysql -u root -p user_system -e "DESCRIBE salary_details;"
# 应该能看到 dynamic_fields 字段（类型为 JSON）
```

**注意**：如果执行时提示表不存在，这是正常的，脚本会重新创建表。

### 第四步：安装依赖（如果有新依赖）

```bash
cd /var/www/messageView
npm install
```

### 第五步：重新构建前端

```bash
cd /var/www/messageView
npm run build
```

### 第六步：重启后端服务

```bash
# 使用 PM2 重启
pm2 restart messageview-api

# 或如果服务不存在，启动服务
pm2 start server/index.js --name messageview-api

# 查看服务状态
pm2 status
pm2 logs messageview-api --lines 50
```

### 第七步：重新加载 Nginx（确保静态文件更新）

```bash
sudo nginx -s reload
```

### 第八步：验证部署

1. **检查服务状态**
   ```bash
   pm2 status
   sudo systemctl status nginx
   ```

2. **检查端口**
   ```bash
   sudo ss -tlnp | grep 8088  # 前端端口
   sudo ss -tlnp | grep 3001  # 后端端口
   ```

3. **访问网站**
   - 打开浏览器访问：`http://114.132.158.25:8088`
   - 测试登录功能
   - 测试上传Excel文件功能
   - 验证薪资明细显示是否正确

## 一键部署脚本（推荐）

可以创建一个更新脚本 `update.sh`：

```bash
#!/bin/bash

echo "=========================================="
echo "开始更新 messageView 项目（动态字段版本）"
echo "=========================================="

PROJECT_DIR="/var/www/messageView"
cd $PROJECT_DIR || exit

# 1. 备份数据库（可选）
echo "是否备份数据库？(y/n)"
read -r backup
if [ "$backup" = "y" ]; then
    echo "正在备份数据库..."
    mysqldump -u root -p user_system > /tmp/messageview_backup_$(date +%Y%m%d_%H%M%S).sql
    echo "备份完成：/tmp/messageview_backup_*.sql"
fi

# 2. 拉取最新代码
if [ -d ".git" ]; then
    echo "正在拉取最新代码..."
    git pull origin main
fi

# 3. 执行数据库重置脚本
echo "=========================================="
echo "⚠️  警告：即将执行数据库重置脚本"
echo "此操作会删除所有薪资明细数据！"
echo "=========================================="
echo "是否继续？(y/n)"
read -r confirm
if [ "$confirm" = "y" ]; then
    echo "正在执行数据库重置脚本..."
    mysql -u root -p user_system < server/database/reset_with_dynamic_fields.sql
    echo "数据库重置完成！"
else
    echo "已取消数据库重置"
    exit 1
fi

# 4. 安装依赖
echo "正在安装依赖..."
npm install

# 5. 构建前端
echo "正在构建前端..."
npm run build

# 6. 重启后端服务
echo "正在重启后端服务..."
pm2 restart messageview-api || pm2 start server/index.js --name messageview-api

# 7. 重新加载 Nginx
echo "正在重新加载 Nginx..."
sudo nginx -s reload

# 8. 检查服务状态
echo "=========================================="
echo "更新完成！服务状态："
echo "=========================================="
pm2 status

echo ""
echo "查看日志: pm2 logs messageview-api"
echo "查看状态: pm2 status"
```

使用方法：
```bash
chmod +x update.sh
./update.sh
```

## 快速更新命令（一行）

如果确认不需要备份，可以直接执行：

```bash
cd /var/www/messageView && \
git pull origin main && \
mysql -u root -p user_system < server/database/reset_with_dynamic_fields.sql && \
npm install && \
npm run build && \
pm2 restart messageview-api && \
sudo nginx -s reload
```

## 常见问题

### 1. 数据库重置失败

如果提示外键约束错误：
```bash
# 先禁用外键检查
mysql -u root -p user_system -e "SET FOREIGN_KEY_CHECKS=0;"
mysql -u root -p user_system < server/database/reset_with_dynamic_fields.sql
mysql -u root -p user_system -e "SET FOREIGN_KEY_CHECKS=1;"
```

### 2. PM2 服务不存在

```bash
pm2 start server/index.js --name messageview-api
pm2 save
```

### 3. 端口被占用

```bash
# 检查端口占用
sudo ss -tlnp | grep 3001

# 如果被占用，停止占用进程或修改端口
```

### 4. 验证数据库结构

```bash
mysql -u root -p user_system -e "SHOW COLUMNS FROM salary_details;"
# 应该看到 dynamic_fields 字段（类型为 json）
```

## 回滚方案（如果需要）

如果更新后出现问题，可以回滚：

```bash
# 1. 恢复数据库备份
mysql -u root -p user_system < /tmp/messageview_backup_YYYYMMDD_HHMMSS.sql

# 2. 回滚代码
cd /var/www/messageView
git checkout <previous-commit-hash>

# 3. 重新构建和重启
npm run build
pm2 restart messageview-api
sudo nginx -s reload
```

---

**部署完成后，请测试以下功能：**
1. ✅ 用户登录
2. ✅ 上传Excel文件（使用新的字段结构）
3. ✅ 查看薪资明细（应该显示动态字段）
4. ✅ 管理员编辑薪资明细

