import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const role = ref(localStorage.getItem('role') || '')
  const username = ref(localStorage.getItem('username') || '')
  const realName = ref(localStorage.getItem('realName') || '')

  // 计算属性：是否已登录
  const isLoggedIn = computed(() => !!token.value)

  // 计算属性：是否为管理员
  const isAdmin = computed(() => role.value === 'ADMIN')

  // 设置登录信息
  function setAuth(authData) {
    token.value = authData.token
    role.value = authData.role
    username.value = authData.username
    realName.value = authData.realName || authData.username

    // 持久化到 localStorage
    localStorage.setItem('token', authData.token)
    localStorage.setItem('role', authData.role)
    localStorage.setItem('username', authData.username)
    localStorage.setItem('realName', authData.realName || authData.username)
  }

  // 设置 token
  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  // 清除登录信息
  function clearAuth() {
    token.value = ''
    role.value = ''
    username.value = ''
    realName.value = ''

    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('realName')
  }

  return {
    token,
    role,
    username,
    realName,
    isLoggedIn,
    isAdmin,
    setAuth,
    setToken,
    clearAuth
  }
})
