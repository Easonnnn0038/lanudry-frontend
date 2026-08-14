<template>
  <div class="side-menu-container">
    <!-- Logo 区块 -->
    <div class="logo-section">
      <div class="logo-icon">
        <el-icon :size="24" color="#fff"><Shop /></el-icon>
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
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePermissionStore } from '@/stores/permission'
import * as Icons from '@element-plus/icons-vue'

const props = defineProps({
  activeMenu: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select'])

const permissionStore = usePermissionStore()

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
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
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
</style>
