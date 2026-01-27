<template>
  <div class="userinfo-container">
    <div class="userinfo-box">
      <div v-if="loading" class="loading-message">
        加载中...
      </div>
      <div v-else-if="userInfo" class="info-content">
        <div v-if="errorMessage" class="warning-message">
          {{ errorMessage }}
        </div>
        
        <!-- 基础信息 -->
        <div class="info-section">
          <div class="section-header">
            <h4 class="section-title">基本信息</h4>
            <button @click="handleLogout" class="logout-button">退出登录</button>
          </div>
          <div class="info-card">
            <div class="info-item">
              <span class="label">工作证号：</span>
              <span class="value">{{ userInfo.workId }}</span>
            </div>
            <div class="info-item">
              <span class="label">身份证号：</span>
              <span class="value">{{ userInfo.idCard }}</span>
            </div>
            <div class="info-item">
              <span class="label">姓名：</span>
              <span class="value">{{ userInfo.name || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">部门：</span>
              <span class="value">{{ userInfo.department }}</span>
            </div>
            <div class="info-item">
              <span class="label">职级：</span>
              <span class="value">{{ userInfo.positionLevel }}</span>
            </div>
          </div>
          
          <!-- 合计 - 优先显示dynamicFields中的合计字段 -->
          <div v-if="userInfo.salary && (getTotalValue() !== null && getTotalValue() !== undefined)" class="total-section">
            <div class="total-item">
              <span class="total-label">合计</span>
              <span class="total-value">{{ formatMoney(getTotalValue()) }}</span>
            </div>
          </div>
        </div>

        <!-- 薪资明细 -->
        <div class="info-section">
          <div class="section-header">
            <h4 class="section-title">薪资明细</h4>
            <div class="year-selector" v-if="availableYears.length > 0">
              <label>选择年份：</label>
              <select v-model.number="selectedYear" @change="loadUserInfo" class="year-select">
                <option v-for="year in availableYears" :key="year" :value="year">
                  {{ year }}年
                </option>
              </select>
            </div>
          </div>
          
          <div v-if="!userInfo.salary && !loading" class="no-data-message">
            该年份暂无薪资明细数据
          </div>
          
          <div v-if="userInfo.salary">
            <!-- 动态显示所有薪资字段（过滤掉值为0的字段） -->
            <div class="salary-group">
              <div class="salary-card">
                <div 
                  v-for="(value, fieldName) in filteredDynamicFields" 
                  :key="fieldName"
                  class="salary-item"
                >
                  <span class="salary-label">{{ fieldName }}</span>
                  <span 
                    class="salary-value"
                    :class="{ 'negative': isNegativeValue(value) }"
                  >
                    {{ formatMoney(value) }}
                  </span>
                </div>
                
                <!-- 如果没有动态字段，显示提示 -->
                <div v-if="!filteredDynamicFields || Object.keys(filteredDynamicFields).length === 0" class="no-data-message">
                  暂无薪资明细数据
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getUserInfo, getUserYears } from '../api/index.js'

export default {
  name: 'UserInfo',
  data() {
    return {
      userInfo: null,
      loading: false,
      errorMessage: '',
      selectedYear: new Date().getFullYear(),
      availableYears: []
    }
  },
  async mounted() {
    // 从localStorage获取工号
    const userInfoStr = localStorage.getItem('userInfo')
    if (!userInfoStr) {
      this.$router.push('/login')
      return
    }

    try {
      const localUserInfo = JSON.parse(userInfoStr)
      this.loading = true

      // 获取可用年份列表
      try {
        const yearsResponse = await getUserYears(localUserInfo.workId)
        if (yearsResponse.success && yearsResponse.data.length > 0) {
          this.availableYears = yearsResponse.data
          this.selectedYear = yearsResponse.data[0] // 默认选择最新的年份
        } else {
          // 如果没有年份数据，使用当前年份
          this.availableYears = [this.selectedYear]
        }
      } catch (error) {
        console.error('获取年份列表失败:', error)
        this.availableYears = [this.selectedYear]
      }

      // 从后端获取最新的用户信息和薪资明细
      await this.loadUserInfo()
    } catch (error) {
      console.error('初始化错误:', error)
      this.errorMessage = '初始化失败，请刷新页面重试'
    } finally {
      this.loading = false
    }
  },
  computed: {
    // 过滤掉值为0的字段
    filteredDynamicFields() {
      if (!this.userInfo || !this.userInfo.salary || !this.userInfo.salary.dynamicFields) {
        return {}
      }
      const fields = {}
      for (const [key, value] of Object.entries(this.userInfo.salary.dynamicFields)) {
        // 过滤掉值为0、null、undefined、空字符串的字段
        if (value !== null && value !== undefined && value !== '' && value !== 0) {
          fields[key] = value
        }
      }
      return fields
    }
  },
  methods: {
    async loadUserInfo() {
      const userInfoStr = localStorage.getItem('userInfo')
      if (!userInfoStr) {
        this.$router.push('/login')
        return
      }

      try {
        const localUserInfo = JSON.parse(userInfoStr)
        this.loading = true
        this.errorMessage = ''

        // 从后端获取最新的用户信息和薪资明细（使用选中的年份）
        const response = await getUserInfo(localUserInfo.workId, this.selectedYear)
        
        if (response.success && response.data) {
          this.userInfo = response.data
          // 更新localStorage中的用户信息
          localStorage.setItem('userInfo', JSON.stringify(response.data))
        } else {
          this.errorMessage = response.message || '获取用户信息失败'
          // 如果获取失败，使用本地存储的信息
          const cachedUserInfo = JSON.parse(userInfoStr)
          this.userInfo = cachedUserInfo
        }
      } catch (error) {
        console.error('获取用户信息错误:', error)
        // 如果API调用失败，使用本地存储的信息
        const userInfoStr = localStorage.getItem('userInfo')
        if (userInfoStr) {
          const localUserInfo = JSON.parse(userInfoStr)
          this.userInfo = localUserInfo
          this.errorMessage = '无法连接到服务器，显示本地缓存信息'
        }
      } finally {
        this.loading = false
      }
    },
    handleLogout() {
      // 清除登录状态和用户信息
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('userRole')
      localStorage.removeItem('token')
      // 跳转到登录页
      this.$router.push('/login')
    },
    getTotalValue() {
      if (!this.userInfo || !this.userInfo.salary) return null
      // 优先从dynamicFields中查找合计字段
      if (this.userInfo.salary.dynamicFields) {
        const totalFields = ['实发', '合计', 'total', 'Total', '总计', '应发']
        for (const field of totalFields) {
          if (this.userInfo.salary.dynamicFields[field] !== undefined && 
              this.userInfo.salary.dynamicFields[field] !== null && 
              this.userInfo.salary.dynamicFields[field] !== '') {
            return this.userInfo.salary.dynamicFields[field]
          }
        }
      }
      // 如果没有找到，使用旧的total字段
      return this.userInfo.salary.total
    },
    isNegativeValue(value) {
      if (value === null || value === undefined || value === '') return false
      const num = parseFloat(value)
      return !isNaN(num) && num < 0
    },
    formatMoney(value) {
      if (value === null || value === undefined || value === '') return '-'
      return parseFloat(value).toFixed(2)
    }
  }
}
</script>

<style scoped>
.userinfo-container {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 40px 20px;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow-x: hidden;
}

.userinfo-box {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.logout-button {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
}

.logout-button:hover {
  background: #5568d3;
}

.info-content {
  padding: 40px;
}

.warning-message {
  background-color: #fff3cd;
  color: #856404;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 4px solid #ffc107;
  font-size: 14px;
}

.loading-message {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.info-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #667eea;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.year-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.year-selector label {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}

.year-select {
  padding: 8px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
  background: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.year-select:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.no-data-message {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  font-size: 14px;
  background: #f8fafc;
  border-radius: 8px;
}

.info-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
  font-size: 16px;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #555;
  min-width: 120px;
}

.value {
  color: #333;
  font-size: 16px;
}

.salary-group {
  margin-bottom: 25px;
}

.group-title {
  font-size: 18px;
  font-weight: 600;
  color: #555;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 4px solid #1976d2;
}

.salary-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
}

.salary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.salary-label {
  font-size: 14px;
  color: #666;
  flex: 1;
}

.salary-value {
  font-size: 16px;
  font-weight: 600;
  color: #1976d2;
  min-width: 100px;
  text-align: right;
}

.salary-value.negative {
  color: #e74c3c;
}

.total-section {
  margin-top: 20px;
  padding: 16px 20px;
  background: #f8f9fa;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
}

.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
}

.total-value {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.no-salary {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
}

/* 移动端响应式样式 */
@media (max-width: 768px) {
  .userinfo-container {
    padding: 16px 12px;
  }

  .userinfo-box {
    border-radius: 8px;
  }

  .info-content {
    padding: 20px 16px;
  }

  .info-card {
    padding: 16px;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 0;
  }

  .label {
    min-width: auto;
    font-size: 14px;
  }

  .value {
    font-size: 14px;
  }

  .salary-card {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 12px;
  }

  .salary-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .salary-value {
    min-width: auto;
    text-align: left;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .year-selector {
    width: 100%;
  }

  .year-select {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .userinfo-container {
    padding: 12px 8px;
  }

  .info-content {
    padding: 16px 12px;
  }

  .section-title {
    font-size: 18px;
  }

  .group-title {
    font-size: 16px;
  }
}
</style>
