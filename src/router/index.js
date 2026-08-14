import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUserInfo } from '@/api/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/main',
    name: 'Main',
    component: () => import('@/views/Main.vue'),
    meta: { title: '主界面', requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 标记是否已做过启动校验（避免每次跳转都请求后端）
let bootValidated = false

// 全局前置路由守卫
router.beforeEach(async (to, from, next) => {
  // 设置窗口标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 小木棒洗衣管理系统`
  }

  const authStore = useAuthStore()
  const isLoggedIn = authStore.isLoggedIn

  // 启动时校验一次 token 是否仍然有效（后端重启/JWT过期会导致 token 失效）
  if (isLoggedIn && !bootValidated) {
    bootValidated = true
    try {
      const info = await getUserInfo()
      // 校验成功后，把后端返回的用户信息同步回 store（避免 token 对但本地用户名/角色错乱）
      if (info && authStore.username !== info.username) {
        authStore.setAuth({
          token: authStore.token,
          role: info.role || authStore.role,
          username: info.username || authStore.username,
          realName: info.realName || authStore.realName
        })
      }
    } catch (err) {
      // 只有明确是 401（token 失效）才清除登录态；其他错误（500/网络/404等）不强行退登，避免误杀
      const status = err?.response?.status
      const code = err?.response?.data?.code
      if (status === 401 || code === 401) {
        authStore.clearAuth()
        next({ path: '/login' })
        return
      }
      console.warn('[guard] getUserInfo 校验失败，但非 401 错误，保留登录态继续进入：', err?.message || err)
    }
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 需要登录但未登录，跳转到登录页
    next({ path: '/login' })
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    // 已登录但访问登录页，跳转到主界面
    next({ path: '/main' })
  } else {
    next()
  }
})

export default router
