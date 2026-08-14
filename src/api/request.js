import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// 创建 Axios 实例
const service = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    const token = authStore.token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    const url = response.config?.url || ''

    // 如果返回的是文件流（Blob），直接返回
    if (response.config.responseType === 'blob') {
      return response
    }

    // code === 200: 成功，返回 data
    if (res.code === 200) {
      return res.data
    }

    // code === 401: 未授权，跳转登录页（登录接口本身不跳，避免死循环）
    if (res.code === 401 && !url.includes('/auth/login')) {
      ElMessage.error(res.message || '登录已过期，请重新登录')
      const authStore = useAuthStore()
      authStore.clearAuth()
      // 只有在当前不是登录页的时候才跳转，避免刷新登录页就跳来跳去
      if (!router.currentRoute.value.path.includes('/login')) {
        router.push('/login')
      }
      return Promise.reject(new Error(res.message || '未授权'))
    }

    // 其他错误，弹出错误提示（登录接口的错误保持原样，会被 Login.vue 的 catch 处理）
    ElMessage.error(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    console.error('响应错误:', error)
    const url = error.config?.url || ''
    const status = error.response?.status

    // HTTP 状态码 401
    if (status === 401 && !url.includes('/auth/login')) {
      ElMessage.error('登录已过期，请重新登录')
      const authStore = useAuthStore()
      authStore.clearAuth()
      if (!router.currentRoute.value.path.includes('/login')) {
        router.push('/login')
      }
      return Promise.reject(error)
    }

    // HTTP 状态码 403
    if (status === 403) {
      ElMessage.error('没有权限访问该资源')
      return Promise.reject(error)
    }

    // 网络错误 / 后端没启动
    if (error.message === 'Network Error') {
      ElMessage.error('网络连接异常，请确认后端服务已启动（http://localhost:8080）')
      return Promise.reject(error)
    }

    // 请求超时
    if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请稍后重试')
      return Promise.reject(error)
    }

    // 其他错误（包括登录接口的 401/用户名密码错误）：显示具体消息，不要跳登录页，不要显示"登录过期"
    const message = error.response?.data?.message || error.message || '请求失败'
    if (!url.includes('/auth/login')) {
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

export default service
