<template>
  <div class="load-page">
    <div class="page-head">
      <div><h2>装车送厂</h2><p>普通订单至少选择两单，加急订单可以单独送厂</p></div>
      <el-button size="large" :icon="Refresh" @click="loadOrders">刷新</el-button>
    </div>

    <el-alert title="编号关系：送厂批次 PC 包含多个大件 PK；每个大件属于一笔订单，内有逐件衣物码。取衣码要等整单回店后才生成。超过5件的拆包功能待补充。" type="info" :closable="false" show-icon />

    <el-card class="order-card" shadow="never">
      <el-table ref="tableRef" v-loading="loading" :data="orders" row-key="id" size="large" @selection-change="selected = $event">
        <el-table-column type="selection" width="60" />
        <el-table-column prop="orderNo" label="订单号" min-width="170" />
        <el-table-column label="类型" width="100">
          <template #default="{ row }"><el-tag :type="row.urgentFlag === 1 ? 'danger' : 'info'" size="large">{{ row.urgentFlag === 1 ? '加急' : '普通' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="customerPhone" label="电话" width="150" />
        <el-table-column prop="totalCount" label="衣物件数" width="110" align="center" />
        <el-table-column prop="receiveTime" label="收衣时间" min-width="170" />
      </el-table>
      <el-empty v-if="!loading && orders.length === 0" description="没有待送厂订单" />
    </el-card>

    <div class="submit-bar">
      <div><span>已选择</span><strong>{{ selected.length }}</strong><span>个订单，共</span><strong>{{ selectedItems }}</strong><span>件衣物</span></div>
      <el-button type="primary" size="large" :disabled="selected.length === 0" :loading="submitting" @click="submitBatch">确认打包送厂</el-button>
    </div>

    <el-dialog v-model="resultVisible" title="送厂批次创建成功" width="620px" :close-on-click-modal="false">
      <el-result icon="success" title="打包送厂成功" :sub-title="`送厂批次：${result?.batchNo || ''}`" />
      <el-table :data="result?.packages || []" border>
        <el-table-column prop="orderNo" label="订单号" />
        <el-table-column prop="packageNo" label="大件码（PK）" />
        <el-table-column prop="itemCount" label="件数" width="80" />
      </el-table>
      <template #footer><el-button type="primary" size="large" @click="resultVisible = false; loadOrders()">完成</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { factoryDispatchApi } from '@/api'

const loading = ref(false); const submitting = ref(false); const orders = ref([]); const selected = ref([])
const resultVisible = ref(false); const result = ref(null)
const selectedItems = computed(() => selected.value.reduce((sum, row) => sum + Number(row.totalCount || 0), 0))

async function loadOrders() {
  loading.value = true
  try { orders.value = await factoryDispatchApi.eligibleOrders() || []; selected.value = [] }
  finally { loading.value = false }
}

async function submitBatch() {
  if (selected.value.length === 1 && selected.value[0].urgentFlag !== 1) {
    ElMessage.warning('普通订单不能单独送厂，请至少选择两个订单')
    return
  }
  await ElMessageBox.confirm(`确认将 ${selected.value.length} 个订单、${selectedItems.value} 件衣物打包送厂吗？`, '确认送厂', { type: 'warning' })
  submitting.value = true
  try {
    result.value = await factoryDispatchApi.createBatch({ orderIds: selected.value.map(row => row.id) })
    resultVisible.value = true
    ElMessage.success('送厂批次创建成功')
  } finally { submitting.value = false }
}

onMounted(loadOrders)
</script>

<style scoped>
.load-page { padding-bottom: 90px; }.page-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }.page-head h2 { margin: 0; font-size: 26px; color: #1e293b; }.page-head p { margin: 8px 0 0; color: #64748b; }.order-card { margin-top: 18px; }.submit-bar { position: fixed; left: 264px; right: 24px; bottom: 20px; min-height: 72px; padding: 12px 22px; background: #fff; border: 1px solid #dbe2ea; border-radius: 12px; box-shadow: 0 8px 28px rgba(15,23,42,.12); display: flex; justify-content: space-between; align-items: center; z-index: 10; }.submit-bar div { display: flex; align-items: baseline; gap: 8px; color: #64748b; }.submit-bar strong { color: #2563eb; font-size: 28px; }
</style>
