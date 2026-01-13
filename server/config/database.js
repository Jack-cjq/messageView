import mysql from 'mysql2/promise'

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'user_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

// 创建连接池
const pool = mysql.createPool(dbConfig)

// 测试数据库连接
export async function connectDB() {
  try {
    const connection = await pool.getConnection()
    console.log('数据库连接成功')
    connection.release()
  } catch (error) {
    console.error('数据库连接失败:', error.message)
    process.exit(1)
  }
}

// 执行查询
export async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (error) {
    console.error('数据库查询错误:', error.message)
    throw error
  }
}

export default pool

