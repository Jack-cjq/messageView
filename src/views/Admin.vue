<template>
  <div class="admin-container">
    <div class="admin-header fade-in">
      <h1 class="page-title">用户管理系统</h1>
      <div class="header-actions">
        <button class="action-btn import-btn" @click="showImportDialog = true">
          <span>📁</span> 导入用户
        </button>
        <button class="action-btn danger-btn" @click="handleDeleteAll" :disabled="loading || users.length === 0">
          <span>🗑️</span> 删除全部
        </button>
        <button class="action-btn logout-btn" @click="handleLogout">
          <span>🚪</span> 退出登录
        </button>
      </div>
    </div>

    <div class="admin-content fade-in">
      <div class="stats-card">
        <div class="stat-item">
          <span class="stat-label">总用户数</span>
          <span class="stat-value">{{ users.length }}</span>
        </div>
      </div>

      <div class="table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>工号</th>
              <th>身份证号</th>
              <th>姓名</th>
              <th>部门</th>
              <th>职级</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="users.length === 0">
              <td colspan="6" class="empty-message">暂无用户数据</td>
            </tr>
            <tr v-for="user in users" :key="user.workId" class="user-row">
              <td>{{ user.workId }}</td>
              <td>{{ user.idCard }}</td>
              <td>{{ user.name || '-' }}</td>
              <td>{{ user.department || '-' }}</td>
              <td>{{ user.positionLevel || '-' }}</td>
              <td>
                <button class="edit-btn" @click="handleEdit(user)">编辑</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 编辑用户对话框 -->
    <div v-if="showEditDialog" class="dialog-overlay" @click="showEditDialog = false">
      <div class="dialog-content large-dialog" @click.stop>
        <div class="dialog-header">
          <h2>编辑用户信息</h2>
          <button class="close-btn" @click="showEditDialog = false">×</button>
        </div>
        
        <!-- 标签页切换 -->
        <div class="tab-buttons">
          <button 
            type="button"
            :class="['tab-btn', { active: activeTab === 'basic' }]"
            @click="activeTab = 'basic'"
          >
            基本信息
          </button>
          <button 
            type="button"
            :class="['tab-btn', { active: activeTab === 'salary' }]"
            @click="activeTab = 'salary'"
          >
            薪资明细
          </button>
        </div>

        <!-- 基本信息标签页 -->
        <div v-if="activeTab === 'basic'" class="tab-content">
          <form @submit.prevent="handleUpdate" class="edit-form">
            <div class="form-group">
              <label>工号</label>
              <input v-model="editingUser.workId" type="text" disabled class="form-input" />
            </div>
            <div class="form-group">
              <label>身份证号</label>
              <input v-model="editingUser.idCard" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label>姓名</label>
              <input v-model="editingUser.name" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label>部门</label>
              <input v-model="editingUser.department" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label>职级</label>
              <input v-model="editingUser.positionLevel" type="text" class="form-input" />
            </div>
            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="showEditDialog = false">取消</button>
              <button type="submit" class="save-btn" :disabled="loading">保存基本信息</button>
            </div>
          </form>
        </div>

        <!-- 薪资明细标签页 -->
        <div v-if="activeTab === 'salary'" class="tab-content">
          <div class="salary-edit-header">
            <div class="form-group">
              <label>年份</label>
              <input 
                v-model.number="selectedYear" 
                type="number" 
                class="form-input year-input"
                min="2020"
                max="2099"
                @change="loadSalaryData"
              />
            </div>
            <button type="button" class="refresh-btn" @click="loadSalaryData" :disabled="loading">
              🔄 刷新
            </button>
          </div>
          
          <form @submit.prevent="handleUpdateSalary" class="salary-edit-form">
            <!-- 科研相关 -->
            <div class="salary-section">
              <h4 class="section-title">科研相关</h4>
              <div class="salary-fields">
                <div class="form-group">
                  <label>科研平台</label>
                  <input v-model.number="editingSalary.research_platform" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>标志性成果</label>
                  <input v-model.number="editingSalary.landmark_achievement" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>非高质量科研*10</label>
                  <input v-model.number="editingSalary.non_high_quality_research" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>高质量科研奖励*40</label>
                  <input v-model.number="editingSalary.high_quality_research_reward" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <!-- 人事相关 -->
            <div class="salary-section">
              <h4 class="section-title">人事相关</h4>
              <div class="salary-fields">
                <div class="form-group">
                  <label>人事代发</label>
                  <input v-model.number="editingSalary.personnel_agency" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>招生</label>
                  <input v-model.number="editingSalary.enrollment" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>实验安全、暑假加班</label>
                  <input v-model.number="editingSalary.experiment_safety_summer_overtime" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>院优</label>
                  <input v-model.number="editingSalary.college_excellent" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <!-- 教学相关 -->
            <div class="salary-section">
              <h4 class="section-title">教学相关</h4>
              <div class="salary-fields">
                <div class="form-group">
                  <label>留学生课酬*75</label>
                  <input v-model.number="editingSalary.international_student_course_fee" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>互联网+短学期*30</label>
                  <input v-model.number="editingSalary.internet_plus_short_semester" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>课程负责人</label>
                  <input v-model.number="editingSalary.course_leader" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>辅助教学工作量*35</label>
                  <input v-model.number="editingSalary.auxiliary_teaching_workload" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>编著教材奖励</label>
                  <input v-model.number="editingSalary.textbook_reward" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>竞赛工作量*40</label>
                  <input v-model.number="editingSalary.competition_workload" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>工程学院课酬</label>
                  <input v-model.number="editingSalary.engineering_college_course_fee" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>工程学院管理费</label>
                  <input v-model.number="editingSalary.engineering_college_management_fee" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>公选课课酬</label>
                  <input v-model.number="editingSalary.public_elective_course_fee" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>教研奖励</label>
                  <input v-model.number="editingSalary.teaching_research_reward" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>继教论文评审</label>
                  <input v-model.number="editingSalary.continuing_education_paper_review" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>教学成果奖励*40</label>
                  <input v-model.number="editingSalary.teaching_achievement_reward" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>额外增补工作量*40</label>
                  <input v-model.number="editingSalary.extra_supplement_workload" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>额外教学增补</label>
                  <input v-model.number="editingSalary.extra_teaching_supplement" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>督导工作量</label>
                  <input v-model.number="editingSalary.supervision_workload" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>监考</label>
                  <input v-model.number="editingSalary.invigilation" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <!-- 管理相关 -->
            <div class="salary-section">
              <h4 class="section-title">管理相关</h4>
              <div class="salary-fields">
                <div class="form-group">
                  <label>院设机构</label>
                  <input v-model.number="editingSalary.college_institution" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>团队负责人</label>
                  <input v-model.number="editingSalary.team_leader" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <!-- 其他 -->
            <div class="salary-section">
              <h4 class="section-title">其他</h4>
              <div class="salary-fields">
                <div class="form-group">
                  <label>双创比赛</label>
                  <input v-model.number="editingSalary.innovation_competition" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>文体活动*100</label>
                  <input v-model.number="editingSalary.cultural_sports_activity" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>考勤1500</label>
                  <input v-model.number="editingSalary.attendance" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>研究生复试</label>
                  <input v-model.number="editingSalary.graduate_entrance_exam" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>研究生盲审</label>
                  <input v-model.number="editingSalary.graduate_blind_review" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>研工奖励</label>
                  <input v-model.number="editingSalary.graduate_work_reward" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <!-- 扣除项 -->
            <div class="salary-section">
              <h4 class="section-title">扣除项</h4>
              <div class="salary-fields">
                <div class="form-group">
                  <label>{{ selectedYear }}赤字</label>
                  <input v-model.number="editingSalary.deficit" type="number" step="0.01" class="form-input" />
                </div>
                <div class="form-group">
                  <label>扣除预支绩效</label>
                  <input v-model.number="editingSalary.deduct_advance_performance" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <!-- 合计 -->
            <div class="salary-section">
              <h4 class="section-title">合计</h4>
              <div class="salary-fields">
                <div class="form-group">
                  <label>合计</label>
                  <input v-model.number="editingSalary.total" type="number" step="0.01" class="form-input" />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="cancel-btn" @click="showEditDialog = false">取消</button>
              <button type="submit" class="save-btn" :disabled="loading">保存薪资明细</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 导入文件对话框 -->
    <div v-if="showImportDialog" class="dialog-overlay" @click="showImportDialog = false">
      <div class="dialog-content" @click.stop>
        <div class="dialog-header">
          <h2>导入用户数据</h2>
          <button class="close-btn" @click="showImportDialog = false">×</button>
        </div>
        <div class="import-form">
          <div class="form-group">
            <label>选择年份</label>
            <input
              v-model.number="importYear"
              type="number"
              min="2000"
              max="2100"
              class="form-input"
              placeholder="请输入年份"
            />
            <small class="form-hint">该年份将用于导入的薪资明细数据</small>
          </div>
          <div class="form-group">
            <label>选择 Excel 文件</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              @change="handleFileSelect"
              class="file-input"
              ref="fileInput"
            />
          </div>
          <div class="form-actions">
            <button type="button" class="cancel-btn" @click="showImportDialog = false">取消</button>
            <button type="button" class="import-submit-btn" @click="handleImport" :disabled="loading || !selectedFile || !importYear">
              {{ loading ? '导入中...' : '开始导入' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getAllUsers, getUserDetail, updateUser, updateUserSalary, deleteAllUsers, importUsers } from '../api/index.js'

export default {
  name: 'Admin',
  data() {
    return {
      users: [],
      loading: false,
      showEditDialog: false,
      showImportDialog: false,
      editingUser: {},
      editingSalary: {},
      selectedYear: new Date().getFullYear(),
      importYear: new Date().getFullYear(), // 导入时选择的年份
      activeTab: 'basic', // 'basic' 或 'salary'
      selectedFile: null
    }
  },
  mounted() {
    this.checkAuth()
    this.loadUsers()
  },
  methods: {
    checkAuth() {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true'
      const userRole = localStorage.getItem('userRole')
      
      if (!isAuthenticated || userRole !== 'admin') {
        this.$router.push('/login')
      }
    },
    async loadUsers() {
      this.loading = true
      try {
        const response = await getAllUsers()
        if (response.success) {
          this.users = response.data || []
        }
      } catch (error) {
        alert('加载用户列表失败: ' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },
    async handleEdit(user) {
      this.loading = true
      try {
        // 获取完整的用户信息（包括完整的身份证号和薪资明细）
        const response = await getUserDetail(user.workId, this.selectedYear)
        if (response.success) {
          this.editingUser = { ...response.data }
          this.editingSalary = response.data.salary ? { ...response.data.salary } : {}
          this.selectedYear = response.data.year || new Date().getFullYear()
          this.activeTab = 'basic'
          this.showEditDialog = true
        } else {
          alert('获取用户详情失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        alert('获取用户详情失败: ' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },
    async loadSalaryData() {
      if (!this.editingUser.workId) return
      
      this.loading = true
      try {
        const response = await getUserDetail(this.editingUser.workId, this.selectedYear)
        if (response.success) {
          this.editingSalary = response.data.salary ? { ...response.data.salary } : {}
        } else {
          alert('加载薪资明细失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        alert('加载薪资明细失败: ' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },
    async handleUpdate() {
      this.loading = true
      try {
        const response = await updateUser(this.editingUser.workId, {
          idCard: this.editingUser.idCard,
          name: this.editingUser.name,
          department: this.editingUser.department,
          positionLevel: this.editingUser.positionLevel
        })
        
        if (response.success) {
          alert('用户信息更新成功')
          this.loadUsers()
        } else {
          alert('更新失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        alert('更新失败: ' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },
    async handleUpdateSalary() {
      this.loading = true
      try {
        const salaryData = {
          year: this.selectedYear,
          ...this.editingSalary
        }
        
        const response = await updateUserSalary(this.editingUser.workId, salaryData)
        
        if (response.success) {
          alert('薪资明细更新成功')
          // 重新加载薪资数据
          await this.loadSalaryData()
        } else {
          alert('更新失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        alert('更新失败: ' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },
    async handleDeleteAll() {
      if (!confirm('确定要删除所有用户数据吗？此操作不可恢复！')) {
        return
      }
      
      this.loading = true
      try {
        const response = await deleteAllUsers()
        if (response.success) {
          alert('所有用户数据已删除')
          this.loadUsers()
        } else {
          alert('删除失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        alert('删除失败: ' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },
    handleFileSelect(event) {
      this.selectedFile = event.target.files[0]
    },
    async handleImport() {
      if (!this.selectedFile) {
        alert('请选择文件')
        return
      }
      
      if (!this.importYear || this.importYear < 2000 || this.importYear > 2100) {
        alert('请输入有效的年份（2000-2100）')
        return
      }
      
      this.loading = true
      try {
        const response = await importUsers(this.selectedFile, this.importYear)
        if (response.success) {
          alert(`用户数据导入成功（年份：${this.importYear}）`)
          this.showImportDialog = false
          this.selectedFile = null
          if (this.$refs.fileInput) {
            this.$refs.fileInput.value = ''
          }
          this.loadUsers()
        } else {
          alert('导入失败: ' + (response.message || '未知错误'))
        }
      } catch (error) {
        alert('导入失败: ' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },
    handleLogout() {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('userRole')
      localStorage.removeItem('token')
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 24px;
}

.admin-header {
  background: #fff;
  border-radius: 20px;
  padding: 24px 32px;
  margin-bottom: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.import-btn {
  background: #409eff;
  color: #fff;
}

.import-btn:hover:not(:disabled) {
  background: #337ecc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.danger-btn {
  background: #ef4444;
  color: #fff;
}

.danger-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.logout-btn {
  background: #64748b;
  color: #fff;
}

.logout-btn:hover {
  background: #475569;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.admin-content {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.stats-card {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.08), rgba(64, 158, 255, 0.04));
  border-radius: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 600;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #409eff;
}

.table-container {
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  font-size: 14px;
  border-bottom: 2px solid #e2e8f0;
}

.users-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  color: #2d3748;
}

.user-row:hover {
  background: #f8fafc;
}

.empty-message {
  text-align: center;
  color: #94a3b8;
  padding: 40px !important;
}

.edit-btn {
  padding: 6px 16px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: #337ecc;
  transform: translateY(-1px);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: #fff;
  border-radius: 20px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.large-dialog {
  max-width: 900px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dialog-header h2 {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #94a3b8;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

.edit-form,
.import-form {
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
  font-weight: 600;
  color: #475569;
  font-size: 14px;
}

.form-input,
.file-input {
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.form-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.cancel-btn,
.save-btn,
.import-submit-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.cancel-btn {
  background: #f1f5f9;
  color: #64748b;
}

.cancel-btn:hover {
  background: #e2e8f0;
}

.save-btn,
.import-submit-btn {
  background: #409eff;
  color: #fff;
}

.save-btn:hover:not(:disabled),
.import-submit-btn:hover:not(:disabled) {
  background: #337ecc;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.save-btn:disabled,
.import-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 标签页样式 */
.tab-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: #64748b;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: #409eff;
}

.tab-btn.active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.tab-content {
  max-height: 60vh;
  overflow-y: auto;
}

/* 薪资编辑表单样式 */
.salary-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.year-input {
  width: 120px;
}

.refresh-btn {
  padding: 10px 20px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.salary-edit-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.salary-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}

.salary-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.salary-fields .form-group {
  margin: 0;
}

.salary-fields .form-group label {
  font-size: 13px;
  margin-bottom: 6px;
}

.salary-fields .form-input {
  font-size: 14px;
  padding: 10px 12px;
}

.fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .admin-container {
    padding: 16px;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    overflow-x: hidden;
  }

  .admin-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1;
    min-width: 100px;
  }

  .table-container {
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    max-width: 100vw;
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .users-table {
    min-width: 600px;
    width: 100%;
  }
}
</style>

