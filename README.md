# Vue 用户登录系统

一个完整的Vue 3 + Node.js + MySQL用户登录系统，支持工号和密码登录，登录后显示用户信息。

## 功能特性

- 用户登录（工号和密码）
- 用户信息展示
- 路由守卫保护
- 响应式设计
- MySQL数据库存储
- Express后端API

## 技术栈

### 前端
- Vue 3
- Vue Router 4
- Vite

### 后端
- Node.js
- Express
- MySQL2

## 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7 或 MySQL 8.0

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

#### 2.1 创建数据库

登录MySQL，执行初始化脚本：

```bash
mysql -u root -p < server/database/init.sql
```

或者手动执行SQL文件中的内容。

**注意：** 如果数据库已存在且需要支持加密功能，需要执行迁移脚本：

```bash
mysql -u root -p < server/database/migrate_encryption.sql
```

或者手动执行迁移SQL文件中的内容，将 `id_card` 和 `password` 字段长度扩展到 512 字符以支持加密存储。

#### 2.2 配置环境变量

复制环境变量示例文件并修改配置：

```bash
# Windows
copy server\.env.example server\.env

# Linux/Mac
cp server/.env.example server/.env
```

编辑 `server/.env` 文件，修改数据库连接信息：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=user_system
PORT=3001

# 加密密钥（32字节的hex字符串，或任意字符串）
# 生成密钥：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 重要：生产环境必须设置，不要使用默认密钥
ENCRYPTION_KEY=your-32-byte-hex-key-here

# JWT密钥（用于生成和验证JWT token）
# 生成密钥：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 重要：生产环境必须设置，不要使用默认密钥
JWT_SECRET=your-jwt-secret-key-here
# JWT token过期时间（默认7天，格式：数字+单位，如 7d, 24h, 3600s）
JWT_EXPIRES_IN=7d
```

**关于加密密钥：**
- 系统会对敏感信息（身份证号、密码）进行加密存储
- 生产环境必须设置 `ENCRYPTION_KEY`，不要使用默认密钥
- 如果更改密钥，已加密的数据将无法解密
- 建议使用以下命令生成安全的密钥：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 3. 启动项目

#### 方式一：分别启动前后端（推荐开发时使用）

```bash
# 终端1：启动后端服务器
npm run server

# 终端2：启动前端开发服务器
npm run dev
```

#### 方式二：同时启动前后端

```bash
npm run dev:all
```

### 4. 访问应用

- 前端地址：http://localhost:3000
- 后端API：http://localhost:3001

## 测试账号

系统内置了以下测试账号（工号/密码）：

- 工号：001，密码：123456（张三 - 技术部 - 高级工程师）
- 工号：002，密码：123456（李四 - 市场部 - 市场经理）
- 工号：003，密码：123456（王五 - 人事部 - 人事专员）

## Excel数据导入

系统支持从Excel文件（.xlsx格式）批量导入用户数据。

### 使用方法

```bash
npm run import:users <Excel文件路径>
```

示例：
```bash
npm run import:users data/users.xlsx
```

### Excel文件格式

Excel文件第一行应为表头，支持以下列名（不区分大小写）：

**必填字段：**
- 工号 (work_id, WorkID) - 必须唯一
- 姓名 (name, Name)

**可选字段：**
- 部门 (department, Department)
- 职位 (position, Position)
- 密码 (password, Password)
- 身份证号 (id_card, IDCard) - 如果没有密码，将使用身份证号后六位作为密码

### Excel示例

| 工号 | 姓名 | 部门 | 职位 | 身份证号 |
|------|------|------|------|----------|
| 001  | 张三 | 技术部 | 高级工程师 | 420123199001011234 |
| 002  | 李四 | 市场部 | 市场经理 | 420123199002021234 |

详细说明请参考：`server/scripts/README.md`

## API接口

### 登录接口
- **POST** `/api/login`
- 请求体：`{ "workId": "001", "password": "123456" }`
- 响应：`{ "success": true, "data": { ... }, "message": "登录成功" }`

### 获取用户信息接口
- **GET** `/api/user/:workId`
- 响应：`{ "success": true, "data": { ... } }`

### 健康检查接口
- **GET** `/api/health`

## 项目结构

```
messageView/
├── server/                    # 后端代码
│   ├── config/
│   │   ├── database.js        # 数据库配置
│   │   └── env.js             # 环境变量配置
│   ├── routes/
│   │   ├── login.js           # 登录路由
│   │   └── user.js            # 用户信息路由
│   ├── database/
│   │   └── init.sql           # 数据库初始化脚本
│   ├── scripts/
│   │   ├── importUsers.js     # Excel数据导入脚本
│   │   └── README.md          # 导入工具说明
│   └── index.js               # 服务器入口
├── src/                       # 前端代码
│   ├── api/
│   │   └── index.js           # API服务
│   ├── assets/
│   │   └── style.css          # 全局样式
│   ├── router/
│   │   └── index.js           # 路由配置
│   ├── views/
│   │   ├── Login.vue          # 登录页面
│   │   └── UserInfo.vue       # 用户信息页面
│   ├── App.vue                # 根组件
│   └── main.js                # 应用入口
├── index.html                 # HTML入口
├── package.json               # 项目配置
├── vite.config.js             # Vite配置
└── README.md                  # 项目说明
```

## 数据库结构

### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键，自增 |
| work_id | VARCHAR(20) | 工号，唯一 |
| password | VARCHAR(255) | 密码 |
| name | VARCHAR(50) | 姓名 |
| department | VARCHAR(50) | 部门 |
| position | VARCHAR(50) | 职位 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 注意事项

1. **数据库连接**：确保MySQL服务已启动，并且配置的数据库用户有足够权限
2. **密码安全**：当前版本密码以明文存储，生产环境应使用加密（如bcrypt）
3. **CORS配置**：后端已配置CORS，允许前端跨域请求
4. **环境变量**：`.env` 文件包含敏感信息，不要提交到版本控制系统

## 开发建议

1. 生产环境建议使用环境变量管理敏感配置
2. 密码应使用哈希加密存储（推荐bcrypt）
3. 添加JWT token认证机制
4. 添加输入验证和SQL注入防护
5. 添加日志记录功能

