const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 请求拦截器配置
const requestInterceptors = []

// 响应拦截器配置
const responseInterceptors = []

// 添加请求拦截器
export function addRequestInterceptor(interceptor) {
  requestInterceptors.push(interceptor)
}

// 添加响应拦截器
export function addResponseInterceptor(interceptor) {
  responseInterceptors.push(interceptor)
}

// 执行请求拦截器
async function applyRequestInterceptors(config) {
  let finalConfig = { ...config }
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig)
  }
  return finalConfig
}

// 执行响应拦截器
async function applyResponseInterceptors(response) {
  let finalResponse = response
  for (const interceptor of responseInterceptors) {
    finalResponse = await interceptor(finalResponse)
  }
  return finalResponse
}

// 统一的请求方法
export async function request(url, options = {}) {
  try {
    // 构建完整的 URL
    let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
    
    // 检查是否是 FormData
    const isFormData = options.body instanceof FormData

    // 默认配置
    const defaultOptions = {
      method: 'GET',
      headers: {}
    }

    // 如果不是 FormData，设置默认的 JSON Content-Type
    if (!isFormData) {
      defaultOptions.headers['Content-Type'] = 'application/json'
    }

    // 合并配置（包含 URL，以便拦截器可以修改）
    let config = {
      url: fullUrl,
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    }

    // 如果是 FormData，移除 Content-Type，让浏览器自动设置（包括 boundary）
    if (isFormData) {
      delete config.headers['Content-Type']
    }

    // 执行请求拦截器
    config = await applyRequestInterceptors(config)

    // 从配置中获取最终的 URL（拦截器可能修改了它）
    fullUrl = config.url || fullUrl
    // 移除 url 属性，因为 fetch 不需要它
    const { url: _, ...fetchConfig } = config

    // 发送请求
    const response = await fetch(fullUrl, fetchConfig)

    // 检查响应类型
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      if (response.status === 404) {
        throw new Error('API 接口不存在，请检查服务器配置')
      }
      throw new Error('服务器返回了非 JSON 响应，请检查服务器是否正常运行')
    }

    // 解析响应
    const data = await response.json()

    // 创建响应对象
    const responseObj = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      ok: response.ok,
      originalResponse: response
    }

    // 执行响应拦截器
    const finalResponse = await applyResponseInterceptors(responseObj)

    // 检查响应状态
    if (!response.ok) {
      throw new Error(finalResponse.data?.message || `请求失败: ${response.status}`)
    }

    return finalResponse.data
  } catch (error) {
    // 处理错误
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      throw new Error('服务器响应格式错误，请确保后端服务正在运行')
    }
    throw error
  }
}

// 便捷方法
export const api = {
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, data, options = {}) => {
    // 如果是 FormData，直接使用；否则转换为 JSON
    const body = data instanceof FormData ? data : JSON.stringify(data)
    return request(url, {
      ...options,
      method: 'POST',
      body
    })
  },
  put: (url, data, options = {}) => {
    // 如果是 FormData，直接使用；否则转换为 JSON
    const body = data instanceof FormData ? data : JSON.stringify(data)
    return request(url, {
      ...options,
      method: 'PUT',
      body
    })
  },
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' })
}

export default request

