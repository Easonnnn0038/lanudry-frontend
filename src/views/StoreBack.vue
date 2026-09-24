<template>
  <div class="back-page">
    <header class="page-header"><div><h2>衣物回店</h2><p>选择回店批次，扫描订单号，再逐件核对衣物码。</p></div><el-button @click="loadBatches">刷新批次</el-button></header>
    <div class="layout">
      <aside class="batch-list">
        <h3>回店批次（RB）</h3>
        <el-empty v-if="!batches.length" description="暂无回店批次" />
        <button v-for="entry in batches" :key="entry.id" class="batch-button" :class="{ active: batch?.id === entry.id }" @click="openBatch(entry.id)">
          <strong>{{ entry.batchNo }}</strong>
          <span>{{ formatTime(entry.dispatchTime) }}</span>
          <small>{{ entry.orderCount }} 笔订单 · {{ entry.itemCount }} 件衣物 · 异常 {{ entry.exceptionCount }}</small>
        </button>
      </aside>
      <main class="batch-detail">
        <el-empty v-if="!batch" description="请选择左侧回店批次" />
        <template v-else>
          <div class="batch-title"><h3>回店批次 {{ batch.batchNo }}</h3><span>发货时间 {{ formatTime(batch.dispatchTime) }}</span></div>
          <div class="check-code"><el-input v-model.trim="orderNo" placeholder="扫描或输入订单号" clearable @keyup.enter="openOrder" /><el-button type="primary" :disabled="!orderNo" @click="openOrder">核对订单</el-button></div>
          <el-table :data="batch.orders" border stripe>
            <el-table-column prop="orderNo" label="订单号" min-width="180" />
            <el-table-column label="衣物核对" width="125"><template #default="{ row }">{{ row.scannedCount }}/{{ row.expectedCount }}</template></el-table-column>
            <el-table-column label="状态" width="125"><template #default="{ row }"><el-tag :type="tagType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="110"><template #default="{ row }"><el-button link type="primary" @click="orderNo = row.orderNo; openOrder()">查看</el-button></template></el-table-column>
          </el-table>
          <section v-if="order" class="order-panel">
            <div class="order-heading"><h3>订单 {{ order.orderNo }}</h3><el-tag :type="tagType(order.status)">{{ statusLabel(order.status) }}</el-tag></div>
            <p>已核对 {{ order.scannedCount }}/{{ order.expectedCount }} 件</p>
            <el-alert v-if="order.exceptionReason" :title="`异常待客服：${order.exceptionReason}`" type="error" :closable="false" show-icon />
            <div v-if="order.status === 'WAIT_SCAN'" class="check-code"><el-input v-model.trim="itemCode" placeholder="逐件输入或扫描衣物码，按回车确认" clearable @keyup.enter="scanItem" /><el-button type="primary" :disabled="!itemCode || busy" @click="scanItem">核对衣物</el-button></div>
            <div class="items"><div v-for="item in order.items" :key="item.barcode" class="item" :class="{ checked: item.scanned }"><span>{{ item.categoryName }} {{ item.color || '' }}<small>{{ item.barcode }}</small></span><b>{{ item.scanned ? '已核对' : '待核对' }}</b></div></div>
            <div v-if="order.status === 'WAIT_SCAN'" class="actions"><el-button v-if="authStore.role === 'ADMIN'" type="danger" plain :disabled="busy" @click="reportException">登记异常</el-button><el-button type="success" size="large" :disabled="busy || Number(order.scannedCount) !== Number(order.expectedCount)" @click="confirmOrder">确认订单回店</el-button></div>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeReturnApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
const batches = ref([]); const batch = ref(null); const order = ref(null)
const orderNo = ref(''); const itemCode = ref(''); const busy = ref(false)
const statusLabel = code => ({ WAIT_SCAN: '待签收', RECEIVED: '已签收', EXCEPTION: '异常待客服' })[code] || code
const tagType = code => ({ WAIT_SCAN: 'warning', RECEIVED: 'success', EXCEPTION: 'danger' })[code] || 'info'
const formatTime = value => value ? String(value).replace('T', ' ').slice(0, 19) : '—'
async function loadBatches() { batches.value = await storeReturnApi.batches() }
async function openBatch(id) { batch.value = await storeReturnApi.batch(id); order.value = null; orderNo.value = ''; itemCode.value = '' }
async function openOrder() {
  if (!batch.value || !orderNo.value) return
  order.value = await storeReturnApi.orderDetail(batch.value.id, orderNo.value)
  itemCode.value = ''
}
async function refresh() {
  const id = batch.value.id; const code = order.value.orderNo
  batch.value = await storeReturnApi.batch(id)
  order.value = await storeReturnApi.orderDetail(id, code)
  await loadBatches()
}
async function scanItem() {
  if (!itemCode.value || busy.value) return
  busy.value = true
  try { await storeReturnApi.scan(batch.value.id, order.value.orderNo, itemCode.value); itemCode.value = ''; await refresh() }
  finally { busy.value = false }
}
async function confirmOrder() {
  await ElMessageBox.confirm(`确认订单 ${order.value.orderNo} 的 ${order.value.expectedCount} 件衣物全部收到吗？`, '订单回店确认', { type: 'warning' })
  busy.value = true
  try { await storeReturnApi.confirm(batch.value.id, order.value.orderNo); await refresh(); ElMessage.success('订单回店签收完成') }
  finally { busy.value = false }
}
async function reportException() {
  const { value } = await ElMessageBox.prompt('请描述缺件、错件或条码损坏等异常。提交后订单会冻结，并显示在“错误回店”中。', '报告异常', { inputValidator: text => !!text?.trim() || '请填写异常原因' })
  busy.value = true
  try { await storeReturnApi.reportException(batch.value.id, order.value.orderNo, value.trim()); await refresh(); ElMessage.warning('异常订单已冻结，等待管理员处理') }
  finally { busy.value = false }
}
onMounted(loadBatches)
</script>

<style scoped>
.back-page { color: #263445; }.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }.page-header h2 { margin: 0 0 6px; }.page-header p { color: #667588; margin: 0; }.layout { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 18px; }.batch-list, .batch-detail { background: white; border: 1px solid #e0e6ec; border-radius: 10px; padding: 20px; min-height: 560px; }.batch-list h3 { margin-top: 0; }.batch-button { display: grid; width: 100%; gap: 6px; padding: 13px; margin-bottom: 10px; text-align: left; background: white; border: 1px solid #d6e0e9; border-radius: 8px; color: #263445; }.batch-button.active { border: 2px solid #3076d4; background: #eff6ff; }.batch-button span, .batch-button small { color: #65758a; }.batch-title { display: flex; align-items: center; justify-content: space-between; }.batch-title h3 { font-size: 20px; }.check-code { display: flex; gap: 12px; margin: 16px 0; }.check-code .el-input { max-width: 410px; }.order-panel { margin-top: 22px; padding: 20px; border: 2px solid #dce6ef; border-radius: 10px; }.order-heading { display: flex; gap: 16px; align-items: center; }.order-heading h3 { margin: 0; }.order-panel p { color: #63758a; }.items { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }.item { border: 2px solid #e3e8ed; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; gap: 10px; }.item.checked { border-color: #79c695; background: #f0fbf3; }.item small { display: block; color: #607284; margin-top: 5px; }.item b { white-space: nowrap; }.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
</style>
