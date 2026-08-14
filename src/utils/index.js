/**
 * 通用工具类
 */

// 后端服务地址，与 request.js 的 baseURL 保持一致（去掉末尾的 /api）
// IDEA 本地开发默认 http://localhost:8080，打包上线时可根据部署环境调整
const BACKEND_BASE_URL =
  (import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

/**
 * 拼接照片完整访问 URL
 * - 入参 photo 可能是对象 { url, thumbnail } 或纯字符串
 * - 若已带 http(s):// 前缀则原样返回
 * - 开发模式时 Vite 已代理 /photos，但这里仍直接拼后端地址，避免打包后 /photos 相对路径出错
 */
export function photoUrl(photo) {
  if (!photo) return ''
  let raw = typeof photo === 'string' ? photo : (photo.url || photo.thumbnail || '')
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  // 例如 /photos/20260812/xxx.png → http://localhost:8080/photos/...
  if (raw.startsWith('/')) return BACKEND_BASE_URL + raw
  return BACKEND_BASE_URL + '/' + raw
}

/**
 * 返回后端基础地址（供其他地方使用，比如上传 action 前缀等）
 */
export function backendBase() {
  return BACKEND_BASE_URL
}
