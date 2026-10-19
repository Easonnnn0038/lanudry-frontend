<template>
  <div class="login-container">
    <div class="login-card">
      <!-- Logo 区域 -->
      <div class="login-header">
        <div class="logo-wrapper">
          <img :src="brandLogo" alt="小木棒洗衣 Logo">
        </div>
        <h1 class="login-title">小木棒洗衣管理系统</h1>
        <p class="login-subtitle">LittleStickLaundry</p>
      </div>

      <!-- 表单区域 -->
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        size="large"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username" class="login-field">
          <label class="field-label" for="login-username">用户名</label>
          <el-input
            id="login-username"
            v-model="loginForm.username"
            placeholder="请输入用户名"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password" class="login-field">
          <label class="field-label" for="login-password">密码</label>
          <el-input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            :show-password="true"
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 底部信息 -->
      <div class="login-footer">
        <span>版权所有 &copy; {{ currentYear }} 小木棒洗衣</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { login } from '@/api/auth'
import brandLogo from '@/assets/brand-logo.png'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref(null)
const loading = ref(false)

const currentYear = computed(() => new Date().getFullYear())

const loginForm = reactive({
  username: '',
  password: ''
})

const loginRules = reactive({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度在 6 到 30 个字符', trigger: 'blur' }
  ]
})

async function handleLogin() {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate(async (valid) => {
      if (valid) {
        loading.value = true
        try {
          const res = await login({
            username: loginForm.username,
            password: loginForm.password
          })

          // 保存登录信息到 store
          authStore.setAuth({
            token: res.token,
            role: res.role,
            username: res.username,
            realName: res.realName
          })

          ElMessage.success('登录成功')
          router.push('/main')
        } catch (error) {
          const msg =
            error?.response?.data?.message ||
            error?.data?.message ||
            error?.message ||
            '登录失败，请检查用户名密码'
          ElMessage.error(msg)
        } finally {
          loading.value = false
        }
      }
    })
  } catch (error) {
  }
}
</script>

<style scoped>
.login-container {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  padding: clamp(130px, 20vh, 220px) 24px 40px;
  background-color: #b6d2d9;
  background-image: linear-gradient(180deg, rgba(10, 39, 52, 0.02) 0%, rgba(10, 39, 52, 0.1) 35%, rgba(10, 39, 52, 0.42) 100%), url('../assets/login-storefront-wls.png');
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
}

/* 登录卡片 */
.login-card {
  position: relative;
  box-sizing: border-box;
  width: min(100%, 420px);
  padding: 30px 36px 22px;
  color: #ffffff;
  background: rgba(14, 42, 55, 0.67);
  border: 1px solid rgba(255, 255, 255, 0.48);
  border-radius: 14px;
  box-shadow: 0 24px 56px rgba(5, 29, 38, 0.28);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  animation: cardAppear 0.45s ease-out both;
}

@keyframes cardAppear {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 头部区域 */
.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.logo-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
}

.logo-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 5px;
  letter-spacing: 0.04em;
}

.login-subtitle {
  font-size: 12px;
  color: #d3e3e9;
  margin: 0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* 表单区域 */
.login-form {
  margin-bottom: 8px;
}

.login-field { margin-bottom: 20px; }
.field-label { display: block; width: 100%; margin-bottom: 7px; color: #ffffff; font-size: 13px; font-weight: 600; }

.login-form :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.13);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.57);
  border-radius: 8px;
  padding: 2px 12px;
}

.login-form :deep(.el-input__inner) {
  height: 42px;
  color: #ffffff;
}
.login-form :deep(.el-input__inner::placeholder) { color: #d5e5ea; }
.login-form :deep(.el-input__prefix-inner),
.login-form :deep(.el-input__suffix-inner) { color: #e7f1f4; }
.login-form :deep(.el-input__wrapper:hover) { box-shadow: inset 0 0 0 1px #ffffff; }
.login-form :deep(.el-input__wrapper.is-focus) { box-shadow: inset 0 0 0 2px #ffffff; }
.login-form :deep(.el-form-item__error) { color: #ffe6c9; }

/* 登录按钮 */
.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.12em;
  border: none;
  border-radius: 24px;
  background: #ffffff;
  color: #123f50;
  transition: background 0.2s ease, transform 0.2s ease;
}

.login-button:hover {
  background: #e8f5f7;
  color: #123f50;
  transform: translateY(-1px);
}

.login-button:active {
  transform: translateY(0);
}

/* 底部 */
.login-footer {
  text-align: center;
  font-size: 12px;
  color: #d3e3e9;
  margin-top: 6px;
}

@media (max-width: 640px) {
  .login-container {
    align-items: flex-start;
    padding: min(37vh, 290px) 18px 28px;
    background-color: #dce9eb;
    background-image: url('../assets/login-storefront-wls.png');
    background-size: auto min(37vh, 290px);
    background-position: center top;
  }
  .login-card { padding: 28px 24px 20px; background: rgba(14, 42, 55, 0.88); }
}

@media (prefers-reduced-motion: reduce) {
  .login-card { animation: none; }
  .login-button { transition: none; }
}
</style>
