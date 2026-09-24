/**
 * 通用工具类
 */
import { reactive } from 'vue'

// 后端服务地址，与 request.js 的 baseURL 保持一致（去掉末尾的 /api）
// IDEA 本地开发默认 http://localhost:8080，打包上线时可根据部署环境调整
const BACKEND_BASE_URL =
  (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

const photoCache = reactive({})
const photoLoading = new Set()

function photoFilename(photo) {
  if (typeof photo === 'object' && photo?.filename) return photo.filename
  const raw = typeof photo === 'string' ? photo : (photo?.url || photo?.thumbnail || '')
  const match = raw.match(/(?:\/photos\/|\/api\/photo\/file\/)(\d{8}\/[a-f0-9]{32}\.(?:jpg|png))(?:$|\?)/i)
  return match?.[1] || ''
}

/**
 * 拼接照片完整访问 URL
 * - 入参 photo 可能是对象 { url, thumbnail } 或纯字符串
 * - 若已带 http(s):// 前缀则原样返回
 * - 开发模式时 Vite 已代理 /photos，但这里仍直接拼后端地址，避免打包后 /photos 相对路径出错
 */
export function photoUrl(photo) {
  if (!photo) return ''
  if (typeof photo === 'object' && photo.localUrl) return photo.localUrl
  const filename = photoFilename(photo)
  if (!filename) return ''
  if (photoCache[filename]) return photoCache[filename]
  if (!photoLoading.has(filename)) {
    photoLoading.add(filename)
    const token = localStorage.getItem('token')
    const path = filename.split('/').map(encodeURIComponent).join('/')
    fetch(`${BACKEND_BASE_URL}/api/photo/file/${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(response => {
        if (!response.ok) throw new Error(`照片加载失败 (${response.status})`)
        return response.blob()
      })
      .then(blob => { photoCache[filename] = URL.createObjectURL(blob) })
      .catch(() => { photoCache[filename] = '' })
      .finally(() => photoLoading.delete(filename))
  }
  return ''
}

/**
 * 返回后端基础地址（供其他地方使用，比如上传 action 前缀等）
 */
export function backendBase() {
  return BACKEND_BASE_URL
}
