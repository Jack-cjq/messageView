#!/bin/bash

# 腾讯云服务器快速部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

echo "=========================================="
echo "开始部署 messageView 项目"
echo "=========================================="

# 项目目录
PROJECT_DIR="/var/www/messageView"
cd $PROJECT_DIR || exit

# 1. 拉取最新代码（如果使用 Git）
if [ -d ".git" ]; then
    echo "正在拉取最新代码..."
    git pull origin main
fi

# 2. 安装依赖
echo "正在安装依赖..."
npm install

# 3. 构建前端
echo "正在构建前端..."
npm run build

# 4. 重启后端服务
echo "正在重启后端服务..."
pm2 restart messageview-api || pm2 start server/index.js --name messageview-api

# 5. 检查服务状态
echo "=========================================="
echo "部署完成！服务状态："
echo "=========================================="
pm2 status

echo ""
echo "查看日志: pm2 logs messageview-api"
echo "查看状态: pm2 status"

