<template>
  <div class="pickup-page">
    <header><div><h2>取衣闭单</h2><p>取衣码仅供客户领取，回店后生成；它不是订单号、大件码或衣物条码。</p></div><el-button @click="loadReady">刷新待取订单</el-button></header>
    <div class="pickup-grid">
      <section class="card">
        <h3>1. 核验取衣信息</h3>
        <el-form label-position="top" @submit.prevent="lookup">
          <el-form-item label="客户手机号"><el-input v-model.trim="phone" placeholder="输入完整手机号" size="large" maxlength="20" /></el-form-item>
          <el-form-item label="四位取衣码"><el-input v-model.trim="pickupCode" placeholder="例如 0037" size="large" maxlength="4" @keyup.enter="lookup" /></el-form-item>
          <el-button type="primary" size="large" class="wide" :disabled="!phone || pickupCode.length !== 4 || busy" @click="lookup">查询并核验订单</el-button>
        </el-form>
        <p class="sms-hint">取衣码由店员告知客户；短信记录为待发送，当前没有自动发短信。</p>
        <h3>已回店待取订单</h3>
        <el-empty v-if="!ready.length" description="暂无待取订单" />
        <div v-for="entry in ready" :key="entry.orderNo" class="ready-row">
          <div><b>{{ entry.orderNo }}</b><span>{{ entry.customerName }} · {{ entry.customerPhone }} · {{ entry.totalCount }} 件</span></div>
          <div class="code">取衣码 {{ entry.pickupCode }}</div>
        </div>
      </section>
      <section class="card">
        <div v-if="!order" class="empty">请先输入手机号和取衣码核验订单</div>
        <template v-else>
          <h3>2. 逐件核对衣物</h3>
          <div class="summary"><b>订单 {{ order.orderNo }}</b><span>{{ order.customerName }} · {{ order.totalCount }} 件</span><strong>已核对 {{ order.scannedCount }}/{{ order.totalCount }}</strong></div>
          <el-alert v-if="Number(order.debtAmount) > 0" :title="`订单仍欠款 ¥${order.debtAmount}，请先在其他收款入口结清`" type="error" :closable="false" />
          <div class="barcode-row"><el-input v-model.trim="barcode" placeholder="逐件输入或扫描衣物条码" size="large" @keyup.enter="scan" /><el-button type="primary" size="large" :disabled="!barcode || busy" @click="scan">核对本件</el-button></div>
          <div class="items"><div v-for="item in order.items" :key="item.barcode" class="item" :class="{ checked: item.scanned }"><span><b>{{ item.categoryName }}</b><small>{{ item.barcode }}<template v-if="item.shelfCode"> · 货架 {{ item.shelfCode }}</template></small></span><strong>{{ item.scanned ? '已核对' : '待核对' }}</strong></div></div>
          <h3>3. 整单交付</h3>
          <p class="rule">必须核对全部衣物；有欠款或未全部回店时，后端会拒绝闭单。不要求先上架。</p>
          <el-button type="success" size="large" class="wide" :disabled="busy || Number(order.scannedCount) !== Number(order.totalCount) || Number(order.debtAmount) > 0" @click="closeOrder">确认全部交付并闭单</el-button>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pickupApi } from '@/api'
const phone = ref(''); const pickupCode = ref(''); const barcode = ref('')
const order = ref(null); const ready = ref([]); const busy = ref(false)
async function loadReady() { ready.value = await pickupApi.ready() }
async function lookup() {
  order.value = null
  if (!/^\d{4}$/.test(pickupCode.value)) return ElMessage.warning('请输入四位数字取衣码')
  busy.value = true
  try { order.value = await pickupApi.lookup(phone.value, pickupCode.value); barcode.value = '' }
  finally { busy.value = false }
}
async function scan() {
  if (!order.value || !barcode.value || busy.value) return
  busy.value = true
  try { order.value = await pickupApi.scan(phone.value, pickupCode.value, barcode.value); barcode.value = '' }
  finally { busy.value = false }
}
async function closeOrder() {
  await ElMessageBox.confirm(`确认已将订单 ${order.value.orderNo} 的全部 ${order.value.totalCount} 件衣物交给客户吗？闭单后不可继续扫码。`, '整单取衣确认', { type: 'warning' })
  busy.value = true
  try {
    await pickupApi.close(phone.value, pickupCode.value)
    ElMessage.success('整单取衣闭单成功')
    order.value = null; phone.value = ''; pickupCode.value = ''; barcode.value = ''
    await loadReady()
  } finally { busy.value = false }
}
onMounted(async () => { try { await pickupApi.prepareLegacy(); await loadReady() } catch (error) { console.error('加载取衣订单失败', error) } })
</script>

<style scoped>
.pickup-page { color: #263445; }.pickup-page header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }.pickup-page h2 { margin: 0 0 5px; }.pickup-page header p, .rule, .sms-hint { color: #667588; margin: 0; }.pickup-grid { display: grid; grid-template-columns: minmax(320px, 40%) minmax(0, 60%); gap: 18px; }.card { background: white; padding: 24px; border: 1px solid #e1e7ed; border-radius: 10px; min-height: 580px; }.card h3 { margin: 0 0 20px; font-size: 20px; }.wide { width: 100%; min-height: 48px; font-size: 17px; }.sms-hint { margin: 15px 0 28px; padding: 12px; background: #fff8e9; border-radius: 6px; }.ready-row { border-top: 1px solid #e4e9ee; padding: 14px 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; }.ready-row span { display: block; color: #627286; margin-top: 4px; }.code { white-space: nowrap; font-weight: bold; color: #2367b8; }.empty { display: grid; place-items: center; min-height: 480px; color: #8090a0; font-size: 18px; }.summary { display: grid; gap: 5px; padding: 14px; background: #f2f7ff; border-radius: 8px; }.summary strong { color: #206dbc; }.barcode-row { display: flex; gap: 12px; margin: 20px 0; }.items { max-height: 350px; overflow-y: auto; }.item { display: flex; justify-content: space-between; gap: 10px; padding: 12px; margin-bottom: 8px; border: 2px solid #e0e7ee; border-radius: 7px; }.item.checked { border-color: #7bc99b; background: #f0fbf3; }.item small { display: block; color: #68798b; margin-top: 4px; }.rule { margin: -8px 0 15px; }
</style>
