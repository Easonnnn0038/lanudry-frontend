<template>
  <div class="back-page">
    <header class="page-header"><div><h2>衣物回店</h2><p>按回店批次验收；大件内衣物必须全部核对，其他大件可先签收。</p></div><el-button @click="loadBatches">刷新批次</el-button></header>
    <div class="layout">
      <aside class="batch-list">
        <h3>回店批次</h3>
        <el-empty v-if="!batches.length" description="暂无回店批次" />
        <button v-for="entry in batches" :key="entry.id" class="batch-button" :class="{ active: batch?.id === entry.id }" @click="openBatch(entry.id)">
          <strong>{{ entry.batchNo }}</strong>
          <span>{{ formatTime(entry.dispatchTime) }}</span>
          <small>{{ entry.receivedCount }}/{{ entry.packageCount }} 个大件已签收 · 异常 {{ entry.exceptionCount }}</small>
        </button>
      </aside>
      <main class="batch-detail">
        <el-empty v-if="!batch" description="请选择左侧回店批次" />
        <template v-else>
          <div class="batch-title"><h3>批次 {{ batch.batchNo }}</h3><span>发货时间 {{ formatTime(batch.dispatchTime) }}</span></div>
          <div class="check-code"><el-input v-model.trim="packageCode" placeholder="先输入大件码（扫码枪后续接入）" clearable @keyup.enter="openPackage" /><el-button type="primary" :disabled="!packageCode" @click="openPackage">核对大件</el-button></div>
          <el-table :data="batch.packages" border stripe>
            <el-table-column prop="packageNo" label="大件码" min-width="190" />
            <el-table-column prop="orderNo" label="订单号" min-width="160" />
            <el-table-column prop="sourceBatchNo" label="原送厂批次" min-width="165" />
            <el-table-column label="衣物核对" width="125"><template #default="{ row }">{{ row.scannedCount }}/{{ row.expectedCount }}</template></el-table-column>
            <el-table-column label="状态" width="125"><template #default="{ row }"><el-tag :type="tagType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="110"><template #default="{ row }"><el-button link type="primary" @click="packageCode = row.packageNo; openPackage()">查看</el-button></template></el-table-column>
          </el-table>
          <section v-if="pkg" class="package-panel">
            <div class="package-heading"><h3>大件 {{ pkg.packageNo }}</h3><el-tag :type="tagType(pkg.status)">{{ statusLabel(pkg.status) }}</el-tag></div>
            <p>订单 {{ pkg.orderNo }} · 原送厂批次 {{ pkg.sourceBatchNo }} · 已核对 {{ pkg.scannedCount }}/{{ pkg.expectedCount }} 件</p>
            <el-alert v-if="pkg.exceptionReason" :title="`异常待客服：${pkg.exceptionReason}`" type="error" :closable="false" show-icon />
            <div v-if="pkg.status === 'WAIT_SCAN'" class="check-code"><el-input v-model.trim="itemCode" placeholder="逐件输入衣物条码，按回车确认" clearable @keyup.enter="scanItem" /><el-button type="primary" :disabled="!itemCode || busy" @click="scanItem">核对衣物</el-button></div>
            <div class="items"><div v-for="item in pkg.items" :key="item.barcode" class="item" :class="{ checked: item.scanned }"><span>{{ item.categoryName }} {{ item.color || '' }}<small>{{ item.barcode }}</small></span><b>{{ item.scanned ? '已核对' : '待核对' }}</b></div></div>
            <div v-if="pkg.status === 'WAIT_SCAN'" class="actions"><el-button type="danger" plain :disabled="busy" @click="reportException">异常，交客服处理</el-button><el-button type="success" size="large" :disabled="busy || Number(pkg.scannedCount) !== Number(pkg.expectedCount)" @click="confirmPackage">确认整个大件签收</el-button></div>
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
const batches = ref([]); const batch = ref(null); const pkg = ref(null)
const packageCode = ref(''); const itemCode = ref(''); const busy = ref(false)
const statusLabel = code => ({ WAIT_SCAN: '待签收', RECEIVED: '已签收', EXCEPTION: '异常待客服' })[code] || code
const tagType = code => ({ WAIT_SCAN: 'warning', RECEIVED: 'success', EXCEPTION: 'danger' })[code] || 'info'
const formatTime = value => value ? String(value).replace('T', ' ').slice(0, 19) : '—'
async function loadBatches() { batches.value = await storeReturnApi.batches() }
async function openBatch(id) { batch.value = await storeReturnApi.batch(id); pkg.value = null; packageCode.value = ''; itemCode.value = '' }
async function openPackage() {
  if (!batch.value || !packageCode.value) return
  pkg.value = await storeReturnApi.packageDetail(batch.value.id, packageCode.value)
  itemCode.value = ''
}
async function refresh() {
  const id = batch.value.id; const code = pkg.value.packageNo
  batch.value = await storeReturnApi.batch(id)
  pkg.value = await storeReturnApi.packageDetail(id, code)
  await loadBatches()
}
async function scanItem() {
  if (!itemCode.value || busy.value) return
  busy.value = true
  try { await storeReturnApi.scan(batch.value.id, pkg.value.packageNo, itemCode.value); itemCode.value = ''; await refresh() }
  finally { busy.value = false }
}
async function confirmPackage() {
  await ElMessageBox.confirm(`确认大件 ${pkg.value.packageNo} 的 ${pkg.value.expectedCount} 件衣物全部收到吗？`, '整大件签收', { type: 'warning' })
  busy.value = true
  try { await storeReturnApi.confirm(batch.value.id, pkg.value.packageNo); await refresh(); ElMessage.success('整个大件已签收') }
  finally { busy.value = false }
}
async function reportException() {
  const { value } = await ElMessageBox.prompt('请描述少件、多件、错店或条码损坏等异常。提交后大件会冻结，等待客服处理。', '报告异常', { inputValidator: text => !!text?.trim() || '请填写异常原因' })
  busy.value = true
  try { await storeReturnApi.reportException(batch.value.id, pkg.value.packageNo, value.trim()); await refresh(); ElMessage.warning('异常大件已冻结；其他大件仍可签收') }
  finally { busy.value = false }
}
onMounted(loadBatches)
</script>

<style scoped>
.back-page { color: #263445; }.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }.page-header h2 { margin: 0 0 6px; }.page-header p { color: #667588; margin: 0; }.layout { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 18px; }.batch-list, .batch-detail { background: white; border: 1px solid #e0e6ec; border-radius: 10px; padding: 20px; min-height: 560px; }.batch-list h3 { margin-top: 0; }.batch-button { display: grid; width: 100%; gap: 6px; padding: 13px; margin-bottom: 10px; text-align: left; background: white; border: 1px solid #d6e0e9; border-radius: 8px; color: #263445; }.batch-button.active { border: 2px solid #3076d4; background: #eff6ff; }.batch-button span, .batch-button small { color: #65758a; }.batch-title { display: flex; align-items: center; justify-content: space-between; }.batch-title h3 { font-size: 20px; }.check-code { display: flex; gap: 12px; margin: 16px 0; }.check-code .el-input { max-width: 410px; }.package-panel { margin-top: 22px; padding: 20px; border: 2px solid #dce6ef; border-radius: 10px; }.package-heading { display: flex; gap: 16px; align-items: center; }.package-heading h3 { margin: 0; }.package-panel p { color: #63758a; }.items { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }.item { border: 2px solid #e3e8ed; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; gap: 10px; }.item.checked { border-color: #79c695; background: #f0fbf3; }.item small { display: block; color: #607284; margin-top: 5px; }.item b { white-space: nowrap; }.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
</style>
