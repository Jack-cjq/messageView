<template>
  <div class="login-container">
    <div class="top-badge fade-in">计算机科学与人工智能学院信息查询系统</div>
    
    <div class="login-card fade-in">
      <div class="card-header">
        <h2 class="header-title">选择身份登录</h2>
        <div class="role-switcher">
          <button
            type="button"
            :class="['role-button', { active: userRole === 'teacher' }]"
            @click="userRole = 'teacher'"
          >
            教师
          </button>
          <button
            type="button"
            :class="['role-button', { active: userRole === 'admin' }]"
            @click="userRole = 'admin'"
          >
            管理员
          </button>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="workId">{{ userRole === 'admin' ? '用户名' : '工号' }}</label>
          <input
            id="workId"
            v-model="workId"
            type="text"
            :placeholder="userRole === 'admin' ? '请输入管理员用户名' : '请输入工号'"
            required
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码"
            required
            class="form-input"
          />
        </div>
        <div v-if="userRole === 'teacher'" class="password-tip">
          <span class="tip-icon">ℹ</span>
          <span class="tip-text">密码为身份证号后六位</span>
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <button type="submit" class="login-button" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { login } from '../api/index.js'

export default {
  name: 'Login',
  data() {
    return {
      userRole: 'teacher', // 'teacher' 或 'admin'
      workId: '',
      password: '',
      errorMessage: '',
      loading: false
    }
  },
  methods: {
    async handleLogin() {
      this.errorMessage = ''
      this.loading = true

      try {
        // 调用后端登录API
        const response = await login(this.workId, this.password, this.userRole)

        if (response.success && response.data) {
          // 保存用户信息和登录状态
          localStorage.setItem('isAuthenticated', 'true')
          localStorage.setItem('userInfo', JSON.stringify(response.data))
          localStorage.setItem('userRole', this.userRole)
          
          // 保存JWT token
          if (response.data.token) {
            localStorage.setItem('token', response.data.token)
          }
          
          // 根据角色跳转到不同页面
          if (this.userRole === 'admin') {
            this.$router.push('/admin')
          } else {
            this.$router.push('/userinfo')
          }
        } else {
          this.errorMessage = response.message || '登录失败，请重试'
        }
      } catch (error) {
        this.errorMessage = error.message || '网络错误，请检查服务器连接'
        console.error('登录错误:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
/* ===== 页面结构 ===== */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(32px, 6vw, 64px);
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  position: relative;
}

/* 顶部徽章 */
.top-badge {
  position: absolute;
  top: clamp(40px, 6vw, 60px);
  left: 50%;
  transform: translateX(-50%);
  padding: 16px 32px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.15), rgba(64, 158, 255, 0.08));
  color: #409eff;
  font-weight: 700;
  letter-spacing: 0.08em;
  font-size: clamp(18px, 2.5vw, 24px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  text-align: center;
  z-index: 10;
  white-space: nowrap;
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 32px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: all 0.3s ease;
}

.login-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
}

/* ===== 标题部分 ===== */
.card-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: center;
}

.header-title {
  font-size: 22px;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

/* ===== 角色切换按钮 ===== */
.role-switcher {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}

.role-button {
  padding: 10px 24px;
  border: 1.5px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.role-button:hover {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.05);
}

.role-button.active {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
  box-shadow: 0 3px 10px rgba(64, 158, 255, 0.3);
}

/* ===== 表单部分 ===== */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: #475569;
  font-weight: 600;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.form-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.form-input::placeholder {
  color: #94a3b8;
}

.password-tip {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08), rgba(64, 158, 255, 0.04));
  border-radius: 10px;
  font-size: 13px;
  color: #475569;
  margin-top: -4px;
}

.tip-icon {
  margin-right: 8px;
  color: #409eff;
  font-weight: bold;
  font-size: 16px;
}

.tip-text {
  color: #64748b;
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
  border-radius: 10px;
  border-left: 3px solid #ef4444;
  margin-top: -4px;
}

/* ===== 按钮部分 ===== */
.login-button {
  width: 100%;
  height: 48px;
  padding: 0;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  margin-top: 8px;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
  background: #337ecc;
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: #94a3b8;
  box-shadow: none;
  transform: none;
}

/* ===== 动画 ===== */
.fade-in {
  animation: fadeIn 0.8s ease-out;
}

/* 顶部徽章的动画需要保持水平居中 */
.top-badge.fade-in {
  animation: fadeInBadge 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInBadge {
  from {
    opacity: 0;
    transform: translate(-50%, 30px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .login-container {
    padding: 20px 16px;
    align-items: flex-start;
    padding-top: 80px;
  }

  .top-badge {
    top: 20px;
    left: 16px;
    right: 16px;
    transform: none;
    padding: 12px 20px;
    font-size: 14px;
    width: auto;
    max-width: none;
  }

  .login-card {
    padding: 28px 20px;
    border-radius: 16px;
    max-width: 100%;
    width: 100%;
  }

  .header-title {
    font-size: 18px;
  }

  .login-form {
    gap: 16px;
  }

  .login-button {
    height: 44px;
    font-size: 15px;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 16px 12px;
    padding-top: 70px;
  }

  .top-badge {
    top: 12px;
    left: 12px;
    right: 12px;
    padding: 10px 16px;
    font-size: 13px;
    border-radius: 12px;
  }

  .login-card {
    padding: 24px 16px;
    border-radius: 12px;
  }

  .card-header {
    gap: 12px;
  }

  .header-title {
    font-size: 16px;
  }

  .form-group label {
    font-size: 13px;
  }

  .form-input {
    font-size: 16px; /* 防止iOS自动缩放 */
    padding: 10px 14px;
  }

  .login-button {
    height: 42px;
    font-size: 14px;
  }
}

@media (max-width: 360px) {
  .top-badge {
    font-size: 12px;
    padding: 8px 12px;
  }

  .login-card {
    padding: 20px 14px;
  }

  .header-title {
    font-size: 15px;
  }
}
</style>

