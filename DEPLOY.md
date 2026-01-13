# 腾讯云服务器部署指南

## ⚠️ 重要提示：多项目共存

如果服务器上已有其他项目运行，请注意：
- **端口冲突**：确保后端端口（默认3001）未被占用
- **Nginx配置**：使用不同的 location 路径或子域名
- **数据库**：使用独立的数据库名称
- **PM2进程**：使用不同的进程名称

## 一、服务器环境准备

### 1. 连接到服务器
```bash
# 服务器IP: 114.132.158.25
ssh ubuntu@114.132.158.25
# 或使用 root 用户
ssh root@114.132.158.25
```

### 2. 检查现有环境
```bash
# 检查 Node.js 版本
node -v
npm -v

# 检查 MySQL 状态
sudo systemctl status mysql

# 检查 Nginx 状态
sudo systemctl status nginx

# 检查端口占用
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :80
```

### 3. 安装 Node.js（如果未安装，推荐使用 nvm）
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载环境变量
source ~/.bashrc

# 安装 Node.js 18（LTS版本）
nvm install 18
nvm use 18
nvm alias default 18

# 验证安装
node -v
npm -v
```

### 3. 安装 MySQL
```bash
# CentOS/RHEL
sudo yum install mysql-server -y
# 或 Ubuntu/Debian
sudo apt-get install mysql-server -y

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 设置 MySQL root 密码
sudo mysql_secure_installation
```

### 4. 安装 Nginx（如果未安装，用于反向代理和静态文件服务）
```bash
# 检查是否已安装
nginx -v

# 如果未安装，执行以下命令
# CentOS/RHEL
sudo yum install nginx -y
# 或 Ubuntu/Debian
sudo apt-get install nginx -y

# 启动 Nginx（如果未启动）
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. 安装 PM2（进程管理工具）
```bash
npm install -g pm2
```

## 二、上传代码到服务器

### 方式一：使用 Git（推荐）
```bash
# 在服务器上克隆仓库（建议放在独立目录，避免与其他项目冲突）
cd /var/www
git clone https://github.com/Jack-cjq/messageView.git
cd messageView
```

**注意**：如果 `/var/www` 已有其他项目，可以创建子目录：
```bash
mkdir -p /var/www/messageView
cd /var/www/messageView
git clone https://github.com/Jack-cjq/messageView.git .
```

### 方式二：使用 SCP 上传
```bash
# 在本地执行（Windows PowerShell）
scp -r D:\messageView ubuntu@114.132.158.25:/var/www/

# 或使用 WinSCP、FileZilla 等工具上传
```

### 方式三：使用压缩包上传
```bash
# 在本地压缩项目（排除 node_modules）
# 上传到服务器后解压
cd /var/www
unzip messageView.zip
```

## 三、项目配置

### 1. 检查端口占用（重要！）
```bash
# 检查后端端口 3001 是否被占用
sudo netstat -tlnp | grep :3001

# 如果被占用，可以修改为其他端口（如 3002）
# 需要在 .env 文件中修改 PORT=3002
```

### 2. 安装依赖
```bash
cd /var/www/messageView
npm install
```

### 3. 配置环境变量
```bash
# 创建 .env 文件
cd server
nano .env
```

在 `.env` 文件中添加以下内容：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=user_system  # 使用独立的数据库名称，避免与其他项目冲突

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d

# 加密密钥（32字节的hex字符串，或使用 passphrase）
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here

# 服务器端口
PORT=3001

# API 基础URL（生产环境）
VITE_API_BASE_URL=/api
```

**生成加密密钥：**
```bash
# 在 Node.js 中生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. 初始化数据库
```bash
# 登录 MySQL
mysql -u root -p

# 执行初始化脚本（会创建 user_system 数据库）
mysql -u root -p < /var/www/messageView/server/database/init.sql

# 或手动执行
mysql -u root -p
source /var/www/messageView/server/database/init.sql;

# 如果数据库已存在，执行迁移脚本
mysql -u root -p user_system < /var/www/messageView/server/database/migrate_encryption.sql
mysql -u root -p user_system < /var/www/messageView/server/database/migrate_deficit_field.sql
```

## 四、构建前端项目

```bash
cd /var/www/messageView
npm run build
```

构建完成后，静态文件会在 `dist` 目录中。

**注意**：
- **使用端口 8088（方案A）**：不需要修改 `vite.config.js`，直接构建即可
- **使用子路径（方案B）**：需要修改 `vite.config.js` 添加 `base` 配置：
```javascript
export default defineConfig({
  base: '/messageview/',  // 添加这行
  plugins: [vue()],
  // ...
})
```
然后重新构建：`npm run build`

## 五、配置 Nginx

### 1. 创建 Nginx 配置文件
```bash
sudo nano /etc/nginx/sites-available/messageview
```

### 2. 添加以下配置：

**方案A：使用独立端口 8088（推荐，适合多项目共存）**
```nginx
# 创建新的 server 块，监听 8088 端口
server {
    listen 8088;
    server_name 114.132.158.25;  # 服务器IP地址

    # 前端静态文件
    location / {
        root /var/www/messageView/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 文件上传大小限制
    client_max_body_size 10M;
}
```

**方案B：使用子路径（备选方案）**
```nginx
# 在现有的 server 块中添加，或创建新的 server 块
server {
    listen 80;
    server_name 114.132.158.25;  # 服务器IP地址

    # 其他项目的配置...
    
    # messageView 项目 - 使用子路径
    location /messageview {
        alias /var/www/messageView/dist;
        try_files $uri $uri/ /messageview/index.html;
        index index.html;
    }

    # messageView API 代理
    location /messageview/api {
        rewrite ^/messageview/api/(.*) /api/$1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**方案B：使用子域名（推荐，更清晰）**
```nginx
server {
    listen 80;
    server_name messageview.114.132.158.25;  # 子域名（如果有域名，替换为实际域名）

    # 前端静态文件
    location / {
        root /var/www/messageView/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 文件上传大小限制
    client_max_body_size 10M;
}
```

**方案C：使用独立端口（简单但不推荐）**
```nginx
server {
    listen 8080;  # 使用不同端口
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/messageView/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 10M;
}
```

### 3. 启用配置

**如果使用独立配置文件：**
```bash
# 创建软链接（Ubuntu/Debian）
sudo ln -s /etc/nginx/sites-available/messageview /etc/nginx/sites-enabled/

# 或直接编辑主配置文件（CentOS/RHEL）
sudo nano /etc/nginx/nginx.conf
# 在 http 块中添加: include /etc/nginx/sites-available/messageview;
```

**如果修改现有配置文件：**
```bash
# 直接编辑现有配置文件
sudo nano /etc/nginx/sites-available/default  # Ubuntu/Debian
# 或
sudo nano /etc/nginx/nginx.conf  # CentOS/RHEL
```

**测试和重启：**
```bash
# 测试配置（重要！避免配置错误导致所有服务中断）
sudo nginx -t

# 如果测试通过，重新加载配置（不会中断服务）
sudo nginx -s reload

# 或重启 Nginx（会短暂中断服务）
sudo systemctl restart nginx
```

## 六、启动后端服务

### 使用 PM2 启动（推荐）
```bash
cd /var/www/messageView

# 启动服务
pm2 start server/index.js --name messageview-api

# 设置开机自启
pm2 startup
pm2 save

# 查看服务状态
pm2 status

# 查看日志
pm2 logs messageview-api
```

### PM2 常用命令
```bash
# 重启服务
pm2 restart messageview-api

# 停止服务
pm2 stop messageview-api

# 删除服务
pm2 delete messageview-api

# 查看详细信息
pm2 info messageview-api
```

## 七、配置防火墙

```bash
# 如果使用 8088 端口（推荐方案）
# Ubuntu/Debian 使用 ufw
sudo ufw allow 8088/tcp
sudo ufw reload

# 或 CentOS/RHEL 使用 firewall-cmd
sudo firewall-cmd --permanent --add-port=8088/tcp
sudo firewall-cmd --reload

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 8088 -j ACCEPT
sudo iptables-save

# 如果使用 80 和 443 端口（其他方案）
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 八、配置 HTTPS（可选，推荐）

### 使用 Let's Encrypt 免费证书
```bash
# 安装 Certbot
sudo yum install certbot python3-certbot-nginx -y
# 或 Ubuntu/Debian
sudo apt-get install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 九、更新代码（重新部署）

### 方法一：使用部署脚本（推荐）
```bash
cd /var/www/messageView
chmod +x deploy.sh
./deploy.sh
```

### 方法二：手动更新步骤
```bash
# 1. 进入项目目录
cd /var/www/messageView

# 2. 拉取最新代码
git pull origin main

# 3. 安装新依赖（如果有）
npm install

# 4. 重新构建前端
npm run build

# 5. 重启后端服务
pm2 restart messageview-api

# 6. 重新加载 Nginx（确保静态文件更新）
sudo nginx -s reload

# 7. 检查服务状态
pm2 status
pm2 logs messageview-api --lines 20
```

### 快速更新命令（一行）
```bash
cd /var/www/messageView && git pull origin main && npm install && npm run build && pm2 restart messageview-api && sudo nginx -s reload
```

## 十、常见问题排查

### 1. 检查服务状态
```bash
# 检查 PM2 服务
pm2 status

# 检查 Nginx 服务
sudo systemctl status nginx

# 检查 MySQL
sudo systemctl status mysql
```

### 2. 查看日志
```bash
# PM2 日志
pm2 logs messageview-api

# Nginx 日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 系统日志
sudo journalctl -u nginx -f
```

### 3. 端口占用检查
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :80
```

### 4. 权限问题
```bash
# 确保目录权限正确
sudo chown -R $USER:$USER /var/www/messageView
chmod -R 755 /var/www/messageView
```

## 十一、项目目录结构（服务器上）

```
/var/www/messageView/
├── dist/                 # 前端构建文件
├── server/              # 后端代码
│   ├── .env            # 环境变量（重要！）
│   ├── index.js        # 服务器入口
│   └── ...
├── node_modules/       # 依赖包
├── package.json
└── ...
```

## 十二、安全建议

1. **修改默认密码**：确保 MySQL root 密码强度足够
2. **防火墙配置**：只开放必要的端口
3. **定期更新**：保持系统和依赖包更新
4. **备份数据**：定期备份数据库
5. **监控日志**：定期检查日志文件
6. **使用 HTTPS**：生产环境必须使用 HTTPS

## 十三、数据库备份

```bash
# 备份数据库
mysqldump -u root -p user_system > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p user_system < backup_20240101.sql
```

---

## 快速部署脚本

可以创建一个自动化部署脚本 `deploy.sh`：

```bash
#!/bin/bash
cd /var/www/messageView
git pull origin main
npm install
npm run build
pm2 restart messageview-api
echo "部署完成！"
```

使用方法：
```bash
chmod +x deploy.sh
./deploy.sh
```

