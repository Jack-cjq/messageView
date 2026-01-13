# Ubuntu 服务器安装 Node.js 指南

## 方法一：使用 NVM（推荐）

### 1. 安装 NVM
```bash
# 下载并安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载环境变量
source ~/.bashrc
# 或者
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 2. 验证 NVM 安装
```bash
nvm --version
```

### 3. 安装 Node.js（LTS 版本）
```bash
# 安装 Node.js 18 LTS
nvm install 18

# 使用 Node.js 18
nvm use 18

# 设置为默认版本
nvm alias default 18
```

### 4. 验证安装
```bash
node -v
npm -v
```

## 方法二：使用 NodeSource 仓库（备选）

```bash
# 更新系统包
sudo apt update

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v
npm -v
```

## 方法三：使用 apt 安装（不推荐，版本较旧）

```bash
sudo apt update
sudo apt install nodejs npm
```

## 安装 PM2

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version
```

## 配置 NVM 自动加载（重要）

如果使用 NVM，需要确保每次登录时自动加载：

```bash
# 编辑 ~/.bashrc
nano ~/.bashrc

# 在文件末尾添加（如果还没有）
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 保存后重新加载
source ~/.bashrc
```

## 常见问题

### 问题1：nvm 命令找不到
```bash
# 重新加载环境变量
source ~/.bashrc
# 或
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

### 问题2：npm 权限问题
```bash
# 配置 npm 全局安装路径（避免使用 sudo）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 问题3：Node.js 版本不对
```bash
# 使用 nvm 切换版本
nvm list          # 查看已安装版本
nvm use 18        # 切换到 18
nvm alias default 18  # 设置为默认
```

