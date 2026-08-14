<template>
  <el-container class="main-container">
    <!-- 侧边栏 -->
    <el-aside width="240px" class="main-aside">
      <SideMenu
        :active-menu="activeMenu"
        @select="handleMenuSelect"
      />
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="body-container">
      <el-main class="main-content">
        <!-- 首页 Dashboard -->
        <Dashboard v-if="!activeMenu || activeMenu === 'dashboard'" />

        <!-- 收衣页面 -->
        <StoreReceive v-else-if="activeMenu === 'store-receive'" />

        <!-- 暂存列表 -->
        <StoreStaging v-else-if="activeMenu === 'store-temp'" />

        <!-- 其他功能占位 -->
        <div v-else class="page-placeholder">
          <div class="placeholder-card">
            <div class="ph-icon">
              <el-icon :size="48" color="#3b82f6"><component :is="currentIcon" /></el-icon>
            </div>
            <h2>{{ currentTitle }}</h2>
            <p>该功能模块正在开发中，敬请期待...</p>
            <el-tag type="info" effect="plain">功能编号：{{ activeMenu }}</el-tag>
          </div>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HomeFilled,
  Box,
  Shop,
  Search,
  Tickets,
  DataLine,
  Setting,
  Files,
  Van,
  RefreshLeft,
  Bell,
  CircleCheck,
  Goods,
  Warning,
  Plus,
  TrendCharts,
  Money,
  Delete,
  Monitor
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import SideMenu from '@/components/SideMenu.vue'
import Dashboard from '@/views/Dashboard.vue'
import StoreReceive from '@/views/StoreReceive.vue'
import StoreStaging from '@/views/StoreStaging.vue'

const router = useRouter()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()

const activeMenu = ref('dashboard')

// 图标映射表
const iconMap = {
  HomeFilled,
  Box,
  Shop,
  Search,
  Tickets,
  DataLine,
  Setting,
  Files,
  Van,
  RefreshLeft,
  Bell,
  CircleCheck,
  Goods,
  Warning,
  Plus,
  TrendCharts,
  Money,
  Delete,
  Monitor
}

// 当前菜单标题
const currentTitle = computed(() => {
  if (!activeMenu.value || activeMenu.value === 'dashboard') return '首页'
  for (const menu of permissionStore.filteredMenus) {
    if (menu.children) {
      const child = menu.children.find(c => c.index === activeMenu.value)
      if (child) return child.title
    }
    if (menu.index === activeMenu.value) return menu.title
  }
  return activeMenu.value
})

// 当前菜单图标
const currentIcon = computed(() => {
  if (!activeMenu.value || activeMenu.value === 'dashboard') return markRaw(HomeFilled)
  for (const menu of permissionStore.filteredMenus) {
    if (menu.children) {
      const child = menu.children.find(c => c.index === activeMenu.value)
      if (child && iconMap[child.icon]) return markRaw(iconMap[child.icon])
    }
    if (menu.index === activeMenu.value && iconMap[menu.icon]) return markRaw(iconMap[menu.icon])
  }
  return markRaw(Shop)
})

// 菜单选择
function handleMenuSelect(index) {
  activeMenu.value = index
}

// 监听 Dashboard 的导航事件
function onNavigateMenu(e) {
  activeMenu.value = e.detail
}

// 退出登录
async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    authStore.clearAuth()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (e) {
    // 用户取消
  }
}

onMounted(() => {
  window.addEventListener('navigate-menu', onNavigateMenu)
})

onUnmounted(() => {
  window.removeEventListener('navigate-menu', onNavigateMenu)
})
</script>

<style scoped>
.main-container {
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
}

/* 侧边栏 */
.main-aside {
  height: 100vh;
  overflow: hidden;
}

.main-aside :deep(.el-aside) {
  background: #ffffff;
}

/* 主体区域 */
.body-container {
  height: 100vh;
}

.main-content {
  background-color: #f8fafc;
  padding: 24px;
  overflow-y: auto;
  height: 100vh;
}

/* 占位页 */
.page-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.placeholder-card {
  text-align: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 60px 80px;
}

.ph-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.placeholder-card h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 12px;
}

.placeholder-card p {
  font-size: 14px;
  color: #94a3b8;
  margin: 0 0 20px;
}

/* 滚动条 */
.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.main-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
