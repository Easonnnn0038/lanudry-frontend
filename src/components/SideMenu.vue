<template>
  <div class="side-menu-container">
    <!-- Logo 区块 -->
    <div class="logo-section">
      <div class="logo-icon">
        <img :src="brandLogo" alt="">
      </div>
      <span class="logo-text">洗衣门店系统</span>
    </div>

    <!-- 菜单项 -->
    <div class="menu-list">
      <div
        v-for="item in menuItems"
        :key="item.index"
        :class="['menu-item', { active: activeMenu === item.index }]"
        @click="handleSelect(item.index)"
      >
        <el-icon :size="20" :color="activeMenu === item.index ? '#3b82f6' : '#64748b'">
          <component :is="resolveIcon(item.icon)" />
        </el-icon>
        <span class="menu-label">{{ item.title }}</span>
      </div>
    </div>
    <div class="app-meta">
      <span>门店端 v{{ appVersion }}</span>
      <button type="button" :disabled="checking" @click="checkUpdate">{{ checking ? '检查中…' : '检查更新' }}</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePermissionStore } from '@/stores/permission'
import * as Icons from '@element-plus/icons-vue'
import brandLogo from '@/assets/brand-logo.png'
import { compareVersions } from '@/utils/version.mjs'

const props = defineProps({
  activeMenu: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

const permissionStore = usePermissionStore()
const appVersion = ref(__APP_VERSION__)
const checking = ref(false)

onMounted(async () => {
  try { appVersion.value = await window.electronAPI?.getVersion?.() || __APP_VERSION__ }
  catch { appVersion.value = __APP_VERSION__ }
})

async function checkUpdate() {
  checking.value = true
  try {
    const response = await fetch(import.meta.env.VITE_UPDATE_MANIFEST_URL || '/desktop-update.json', { cache: 'no-store' })
    if (!response.ok) throw new Error('更新服务暂不可用')
    const latest = await response.json()
    if (compareVersions(latest.version, appVersion.value) <= 0) return ElMessage.success('当前已是最新版本')
    await ElMessageBox.confirm(`发现新版本 v${latest.version}${latest.notes ? `\n${latest.notes}` : ''}`, '可用更新', {
      confirmButtonText: '前往下载', cancelButtonText: '稍后再说', type: 'success'
    })
    if (!latest.url) throw new Error('更新下载地址未配置')
    if (window.electronAPI?.openExternal) await window.electronAPI.openExternal(latest.url)
    else window.open(latest.url, '_blank', 'noopener')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.warning(error?.message || '暂时无法检查更新')
  } finally {
    checking.value = false
  }
}

// 图标解析：支持字符串名称或组件对象
function resolveIcon(icon) {
  if (!icon) return Icons.Menu
  if (typeof icon === 'string') {
    return Icons[icon] || Icons.Menu
  }
  return icon
}

// 扁平化菜单：首页 + 权限菜单
const menuItems = computed(() => {
  const items = [
    { index: 'dashboard', title: '首页', icon: 'HomeFilled' }
  ]

  for (const menu of permissionStore.filteredMenus) {
    if (menu.children) {
      for (const child of menu.children) {
        items.push({
          index: child.index,
          title: child.title,
          icon: child.icon
        })
      }
    } else {
      items.push({
        index: menu.index || menu.title,
        title: menu.title,
        icon: menu.icon
      })
    }
  }
  return items
})

function handleSelect(index) {
  emit('select', index)
}
</script>

<style scoped>
.side-menu-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.logo-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.logo-icon img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(10, 91, 99, 0.18));
}

.logo-text {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: 0.5px;
}

.menu-list {
  padding: 12px 10px;
  flex: 1;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.2s ease;
  color: #475569;
  font-size: 14px;
  font-weight: 500;
}

.menu-item:hover {
  background: #f1f5f9;
  color: #334155;
}

.menu-item.active {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  color: #3b82f6;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.12);
}

.menu-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  color: #64748b;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.app-meta button {
  min-height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #2563eb;
  cursor: pointer;
}

.app-meta button:hover { background: #eff6ff; }
.app-meta button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
.app-meta button:disabled { color: #94a3b8; cursor: wait; }
</style>
