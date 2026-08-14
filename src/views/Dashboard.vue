<template>
  <div class="dashboard">
    <!-- 页面标题区 -->
    <div class="page-header">
      <div class="page-title">
        <h1>首页</h1>
        <p>{{ currentDate }}</p>
      </div>
      <div class="user-chip" @click="handleProfileClick">
        <div class="avatar">
          <el-icon :size="18" color="#fff"><UserFilled /></el-icon>
        </div>
        <span>{{ authStore.realName || authStore.username }}</span>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <div class="stat-info">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</span>
        </div>
      </div>
    </div>

    <!-- 快捷操作卡片 -->
    <div class="actions-row">
      <div
        class="action-card"
        v-for="action in actions"
        :key="action.key"
        @click="handleAction(action.key)"
      >
        <div class="action-icon" :style="{ background: action.bg }">
          <el-icon :size="28" :color="action.color">
            <component :is="action.icon" />
          </el-icon>
        </div>
        <h3 class="action-title">{{ action.title }}</h3>
        <p class="action-desc">{{ action.desc }}</p>
        <button
          :class="['action-btn', { primary: action.primary }]"
        >
          {{ action.btnText }}
        </button>
      </div>
    </div>

    <!-- 最近订单 -->
    <div class="recent-section">
      <div class="section-header">
        <h2>最近订单</h2>
        <button class="view-all-btn" @click="handleAction('order-manage')">查看全部</button>
      </div>

      <div class="table-wrapper">
        <table class="recent-table">
          <thead>
            <tr>
              <th>取衣码</th>
              <th>客户</th>
              <th>衣物数</th>
              <th>状态</th>
              <th>金额</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in recentOrders" :key="order.code">
              <td class="code-cell">{{ order.code }}</td>
              <td>{{ order.customer }}</td>
              <td>{{ order.items }}</td>
              <td>
                <span :class="['status-badge', order.statusClass]">
                  {{ order.status }}
                </span>
              </td>
              <td class="amount-cell">¥{{ order.amount }}</td>
              <td>
                <button class="view-btn" @click="handleViewOrder(order)">查看</button>
              </td>
            </tr>
            <tr v-if="recentOrders.length === 0">
              <td colspan="6" class="empty-cell">暂无订单数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  UserFilled,
  Box,
  Shop,
  Search,
  Tickets,
  View
} from '@element-plus/icons-vue'
import { orderApi } from '@/api'

const router = useRouter()
const authStore = useAuthStore()

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekDays[now.getDay()]}`
})

// 统计数据（来自后端实时数据）
const statsLoading = ref(false)
const stats = ref([
  { label: '今日订单', value: '0', color: '#3b82f6' },
  { label: '待收衣', value: '0', color: '#f59e0b' },
  { label: '待取衣', value: '0', color: '#10b981' },
  { label: '本月营收', value: '¥0', color: '#ef4444' }
])

/** 把 BigDecimal 金额格式化为 ¥x,xxx.xx */
function fmtRevenue(val) {
  const num = Number(val || 0)
  const str = num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `¥${str}`
}

/** 加载首页 4 个统计 */
async function loadStats() {
  statsLoading.value = true
  try {
    const data = await orderApi.dashboardStats()
    stats.value = [
      { label: '今日订单', value: String(data?.todayOrderCount ?? 0),         color: '#3b82f6' },
      { label: '待收衣', value: String(data?.pendingReceiveCount ?? 0),     color: '#f59e0b' },
      { label: '待取衣', value: String(data?.readyForPickupCount ?? 0),     color: '#10b981' },
      { label: '本月营收', value: fmtRevenue(data?.monthRevenue),            color: '#ef4444' }
    ]
  } catch (e) {
    console.warn('加载首页统计失败', e)
    ElMessage.error('加载统计数据失败')
  } finally {
    statsLoading.value = false
  }
}

// 快捷操作
const actions = ref([
  {
    key: 'store-receive',
    title: '收衣开单',
    desc: '新客户或会员送来洗衣物',
    btnText: '开始收衣',
    primary: true,
    icon: Box,
    bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    color: '#3b82f6'
  },
  {
    key: 'pickup',
    title: '取衣',
    desc: '客户凭手机号或取衣码取衣',
    btnText: '取衣核销',
    primary: false,
    icon: Shop,
    bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    color: '#f59e0b'
  },
  {
    key: 'customer-query',
    title: '查询客户',
    desc: '查找客户信息和历史订单',
    btnText: '查询客户',
    primary: false,
    icon: Search,
    bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    color: '#10b981'
  },
  {
    key: 'order-manage',
    title: '订单管理',
    desc: '查看全部订单和状态',
    btnText: '查看订单',
    primary: false,
    icon: Tickets,
    bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
    color: '#8b5cf6'
  }
])

// 最近订单（来自后端实时数据）
const recentLoading = ref(false)
const recentOrders = ref([])

/** 后端订单状态 → 前端表格样式 class（washing/ready/done） */
function statusClass(status) {
  switch (status) {
    case 'RECEIVED':
    case 'SENT_TO_FACTORY':
      return 'washing'
    case 'BACK_TO_STORE':
    case 'NOTIFIED':
      return 'ready'
    case 'PICKED_UP':
      return 'done'
    default:
      return 'washing'
  }
}

/** 金额格式化：两位小数 */
function fmtAmount(amount) {
  return Number(amount || 0).toFixed(2)
}

/** 加载最近订单（取 8 条，够首页展示） */
async function loadRecent() {
  recentLoading.value = true
  try {
    const list = await orderApi.dashboardRecent(8)
    recentOrders.value = (list || []).map((o) => ({
      orderId: o.orderId,
      code: o.code,
      customer: o.customer,
      items: `${o.items || 0}件`,
      status: o.statusLabel,
      statusClass: statusClass(o.status),
      amount: fmtAmount(o.amount)
    }))
  } catch (e) {
    console.warn('加载最近订单失败', e)
    ElMessage.error('加载最近订单失败')
  } finally {
    recentLoading.value = false
  }
}

function handleAction(key) {
  if (key === 'store-receive') {
    emitNavigate(key)
  } else if (key === 'pickup') {
    emitNavigate('store-close')
  } else if (key === 'customer-query') {
    emitNavigate('store-query')
  } else {
    ElMessage.info('功能开发中')
  }
}

function emitNavigate(key) {
  window.dispatchEvent(new CustomEvent('navigate-menu', { detail: key }))
}

function handleViewOrder(order) {
  ElMessage.info(`查看订单 ${order.code} 详情`)
}

function handleProfileClick() {
  // 预留个人中心入口
}

onMounted(async () => {
  // 并行加载首页统计和最近订单
  await Promise.all([loadStats(), loadRecent()])
})
</script>

<script>
export default {
  name: 'Dashboard'
}
</script>

<style scoped>
.dashboard {
  padding: 0;
  background: #ffffff;
  min-height: 100%;
}

/* 页面标题区 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 6px;
}

.page-title p {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px 8px 8px;
  background: #f8fafc;
  border-radius: 24px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: #334155;
}

.user-chip:hover {
  background: #f1f5f9;
}

.user-chip .avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 统计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px 24px;
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  border-color: #d1d5db;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

/* 快捷操作卡片 */
.actions-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.action-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: #d1d5db;
  transform: translateY(-2px);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.action-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.action-btn {
  margin-top: 4px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f8fafc;
  border-color: #d1d5db;
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

/* 最近订单 */
.recent-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.view-all-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  font-size: 13px;
  font-weight: 500;
  color: #3b82f6;
  cursor: pointer;
  transition: all 0.2s;
}

.view-all-btn:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.table-wrapper {
  padding: 0;
}

.recent-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.recent-table thead {
  background: #f8fafc;
}

.recent-table th {
  text-align: left;
  padding: 14px 24px;
  font-weight: 600;
  color: #475569;
  font-size: 13px;
  border-bottom: 1px solid #e5e7eb;
}

.recent-table td {
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
}

.recent-table tbody tr:hover {
  background: #f8fafc;
}

.recent-table tbody tr:last-child td {
  border-bottom: none;
}

.code-cell {
  font-family: 'SF Mono', Consolas, monospace;
  font-weight: 600;
  color: #3b82f6;
}

.amount-cell {
  font-weight: 600;
  color: #1e293b;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.washing {
  background: #eff6ff;
  color: #3b82f6;
}

.status-badge.ready {
  background: #fef3c7;
  color: #d97706;
}

.status-badge.done {
  background: #dcfce7;
  color: #10b981;
}

.view-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:hover {
  background: #f8fafc;
  border-color: #d1d5db;
  color: #3b82f6;
}

.empty-cell {
  text-align: center;
  color: #94a3b8;
  padding: 40px 24px !important;
}
</style>
