# 停止和删除 messageView 项目

## ⚠️ 重要提示

**删除项目前，请先备份重要数据：**
- 数据库数据（如果需要保留）
- 配置文件（.env 等）
- 上传的文件（uploads 目录）

## 完全删除项目（释放内存）

### 步骤一：停止所有服务

```bash
# 1. 停止并删除 PM2 服务
pm2 stop messageview-api
pm2 delete messageview-api

# 2. 验证服务已停止
pm2 status
```

### 步骤二：删除 Nginx 配置

```bash
# 1. 删除 Nginx 配置文件
sudo rm /etc/nginx/sites-available/messageview
sudo rm /etc/nginx/sites-enabled/messageview

# 2. 测试配置
sudo nginx -t

# 3. 重新加载 Nginx
sudo nginx -s reload

# 4. 验证端口已释放
sudo ss -tlnp | grep 8088
```

### 步骤三：删除项目文件

```bash
# 1. 进入项目目录
cd /var/www

# 2. 删除整个项目目录
sudo rm -rf messageView

# 3. 验证删除
ls -la /var/www | grep messageView
```

### 步骤四：清理相关资源（可选）

```bash
# 清理 npm 缓存（如果不再需要）
npm cache clean --force

# 清理 PM2 日志（可选）
pm2 flush
```

### 步骤五：验证删除

```bash
# 1. 检查端口
sudo ss -tlnp | grep -E "(8088|3001)"

# 2. 检查 PM2
pm2 list | grep messageview

# 3. 检查 Nginx 配置
sudo ls -la /etc/nginx/sites-enabled/ | grep messageview

# 4. 检查项目目录
ls -la /var/www | grep messageView
```

## 一键删除脚本

```bash
#!/bin/bash
echo "=========================================="
echo "开始删除 messageView 项目"
echo "=========================================="

# 停止服务
echo "1. 停止 PM2 服务..."
pm2 stop messageview-api 2>/dev/null
pm2 delete messageview-api 2>/dev/null

# 删除 Nginx 配置
echo "2. 删除 Nginx 配置..."
sudo rm -f /etc/nginx/sites-available/messageview
sudo rm -f /etc/nginx/sites-enabled/messageview
sudo nginx -s reload 2>/dev/null

# 删除项目文件
echo "3. 删除项目文件..."
sudo rm -rf /var/www/messageView

echo "=========================================="
echo "删除完成！"
echo "=========================================="

# 验证
echo "验证删除状态："
echo "PM2:"
pm2 list | grep messageview || echo "  已删除"
echo "端口 8088:"
sudo ss -tlnp | grep 8088 || echo "  已释放"
echo "项目目录:"
ls -d /var/www/messageView 2>/dev/null || echo "  已删除"
```

保存为 `delete-project.sh`，执行：
```bash
chmod +x delete-project.sh
./delete-project.sh
```

## 备份数据（删除前执行）

### 备份数据库（如果需要保留数据）

```bash
# 备份数据库
mysqldump -u root -p user_system > /tmp/messageview_backup_$(date +%Y%m%d).sql

# 备份配置文件
cp /var/www/messageView/server/.env /tmp/messageview_env_backup.txt 2>/dev/null
```

## 方法一：只停止后端服务（推荐，不影响其他项目）

```bash
# 停止 PM2 管理的后端服务
pm2 stop messageview-api

# 或删除 PM2 进程
pm2 delete messageview-api

# 查看状态确认
pm2 status
```

## 方法二：完全停止（包括 Nginx 配置）

### 1. 停止后端服务
```bash
pm2 stop messageview-api
# 或
pm2 delete messageview-api
```

### 2. 禁用 Nginx 配置（不影响其他项目）
```bash
# 删除软链接（禁用配置，但不删除文件）
sudo rm /etc/nginx/sites-enabled/messageview

# 测试配置
sudo nginx -t

# 重新加载 Nginx
sudo nginx -s reload

# 验证端口 8088 是否已停止监听
sudo ss -tlnp | grep 8088
```

### 3. 如果需要完全移除配置
```bash
# 删除配置文件（谨慎操作）
sudo rm /etc/nginx/sites-available/messageview
sudo rm /etc/nginx/sites-enabled/messageview

# 重新加载 Nginx
sudo nginx -s reload
```

## 方法三：临时停止（快速）

```bash
# 一行命令：停止后端服务
pm2 stop messageview-api && sudo nginx -s reload
```

## 验证停止状态

```bash
# 1. 检查 PM2 服务
pm2 status

# 2. 检查端口监听
sudo ss -tlnp | grep 8088
sudo ss -tlnp | grep 3001

# 3. 检查 Nginx 配置
sudo nginx -t

# 4. 测试访问（应该无法访问）
curl http://localhost:8088
```

## 重新启动项目

如果需要重新启动：

```bash
# 1. 启动后端服务
pm2 start server/index.js --name messageview-api

# 2. 如果 Nginx 配置被删除，需要重新创建
# 参考 DEPLOY.md 中的 Nginx 配置步骤

# 3. 重新加载 Nginx
sudo nginx -s reload
```

## 注意事项

1. **只停止后端服务**：如果只是临时停止，建议只停止 PM2 服务，保留 Nginx 配置
2. **多项目共存**：如果服务器有其他项目，删除 Nginx 配置时要小心，不要影响其他项目
3. **数据安全**：停止服务不会删除数据库数据，数据仍然保留
4. **快速恢复**：如果只是临时停止，使用 `pm2 stop` 而不是 `pm2 delete`，这样更容易恢复

