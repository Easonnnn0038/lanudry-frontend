export function requestErrorKind(error) {
  if (error?.response?.status === 401) return 'unauthorized'
  if (error?.response?.status === 403) return 'forbidden'
  if (error?.message === 'Network Error') return 'network'
  if (error?.code === 'ECONNABORTED') return 'timeout'
  return 'other'
}
