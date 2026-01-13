import './config/env.js'
import express from 'express'
import cors from 'cors'
import loginRouter from './routes/login.js'
import userRouter from './routes/user.js'
import adminRouter from './routes/admin.js'
import { connectDB } from './config/database.js'

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 连接数据库
connectDB().catch(err => {
  console.error('数据库连接失败:', err)
  // 不退出进程，允许服务器继续运行（用于调试）
})

// 调试：记录所有 API 请求（必须在路由之前）
app.use('/api', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
})

// 路由
console.log('正在注册路由...')
console.log('loginRouter:', loginRouter ? '已加载' : '未加载')
console.log('userRouter:', userRouter ? '已加载' : '未加载')

app.use('/api/login', loginRouter)
app.use('/api/user', userRouter)
app.use('/api/admin', adminRouter)

console.log('路由注册完成')

// 健康检查
app.get('/api/health', (req, res) => {
  console.log('健康检查请求收到')
  res.json({ status: 'ok', message: '服务器运行正常' })
})

// 404 处理（必须放在所有路由之后）
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      success: false,
      message: `API 路由不存在: ${req.method} ${req.originalUrl}`
    })
  } else {
    res.status(404).send('页面不存在')
  }
})

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log('API 路由已注册:')
  console.log('  POST /api/login')
  console.log('  GET  /api/user/:workId')
  console.log('  GET  /api/admin/users')
  console.log('  PUT  /api/admin/users/:workId')
  console.log('  DELETE /api/admin/users')
  console.log('  POST /api/admin/import')
  console.log('  GET  /api/health')
})

