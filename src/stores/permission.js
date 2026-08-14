import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

// 完整的菜单配置
// roles: ['ADMIN'] 表示仅管理员可见，不设置 roles 则所有人可见
const allMenus = [
  {
    title: '店面',
    icon: 'Shop',
    children: [
      { index: 'store-receive', title: '门店收衣', icon: 'Box' },
      { index: 'store-temp', title: '暂存列表', icon: 'Files' },
      { index: 'store-load', title: '装车送厂', icon: 'Van' },
      { index: 'store-back', title: '衣物回店', icon: 'RefreshLeft' },
      { index: 'store-notify', title: '取衣通知', icon: 'Bell' },
      { index: 'store-close', title: '取衣闭单', icon: 'CircleCheck' },
      { index: 'store-shelf', title: '上架/下架', icon: 'Goods' },
      { index: 'store-query', title: '衣物查询', icon: 'Search' },
      { index: 'store-error', title: '错误回店', icon: 'Warning' },
      { index: 'store-extra', title: '补收附件', icon: 'Plus' }
    ]
  },
  {
    title: '统计管理',
    icon: 'DataLine',
    roles: ['ADMIN'],
    children: [
      { index: 'stat-business', title: '营业统计', icon: 'TrendCharts', roles: ['ADMIN'] },
      { index: 'stat-finance', title: '收支统计', icon: 'Money', roles: ['ADMIN'] }
    ]
  },
  {
    title: '系统管理',
    icon: 'Setting',
    roles: ['ADMIN'],
    children: [
      { index: 'sys-delete', title: '删除查询', icon: 'Delete', roles: ['ADMIN'] },
      { index: 'sys-remote', title: '远程维护', icon: 'Monitor', roles: ['ADMIN'] }
    ]
  }
]

export const usePermissionStore = defineStore('permission', () => {
  const menus = ref(allMenus)

  // 根据角色过滤后的菜单
  const filteredMenus = computed(() => {
    const authStore = useAuthStore()
    const currentRole = authStore.role

    function filterMenuList(menuList) {
      return menuList
        .filter(menu => {
          // 如果菜单有角色限制，检查当前角色是否在允许列表中
          if (menu.roles && menu.roles.length > 0) {
            return menu.roles.includes(currentRole)
          }
          return true
        })
        .map(menu => {
          const filteredMenu = { ...menu }
          if (menu.children) {
            filteredMenu.children = filterMenuList(menu.children)
          }
          return filteredMenu
        })
        .filter(menu => {
          // 如果父菜单有子菜单，确保至少有一个子菜单可见
          if (menu.children && menu.children.length === 0) {
            return false
          }
          return true
        })
    }

    return filterMenuList(allMenus)
  })

  // 检查是否有某个菜单的权限
  function hasPermission(menuIndex) {
    function findInMenus(menuList) {
      for (const menu of menuList) {
        if (menu.index === menuIndex) {
          if (menu.roles && menu.roles.length > 0) {
            const authStore = useAuthStore()
            return menu.roles.includes(authStore.role)
          }
          return true
        }
        if (menu.children) {
          if (findInMenus(menu.children)) return true
        }
      }
      return false
    }
    return findInMenus(allMenus)
  }

  return {
    menus,
    filteredMenus,
    hasPermission
  }
})
