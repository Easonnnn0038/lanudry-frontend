<template>
  <div class="pickup-page">
    <header>
      <div><h2>快速取衣</h2><p>输入客户手机号和四位取衣码，一次确认即可完成交付。</p></div>
      <el-button @click="loadReady">刷新待取订单</el-button>
    </header>
    <div class="pickup-grid">
      <section class="card action-card">
        <h3>确认客户信息</h3>
        <el-form label-position="top" @submit.prevent="closeOrder">
          <el-form-item label="客户手机号"><el-input ref="phoneInput" v-model.trim="phone" placeholder="输入完整手机号" size="large" maxlength="11" autofocus @input="focusPickupCode" /></el-form-item>
          <el-form-item label="四位取衣码"><el-input ref="codeInput" v-model.trim="pickupCode" placeholder="例如 0037" size="large" maxlength="4" @keyup.enter="closeOrder" /></el-form-item>
          <el-button type="success" size="large" class="wide" :loading="busy" :disabled="!canClose" @click="closeOrder">已交付衣物，完成取衣</el-button>
        </el-form>
        <el-alert title="系统仍会校验订单属于本店、衣物已全部回店且没有欠款。" type="info" :closable="false" show-icon />
        <div v-if="lastPickup" class="pickup-result" role="status" aria-live="polite">
          <strong>取衣完成</strong><span>订单 {{ lastPickup.orderNo }} · {{ lastPickup.itemCount }} 件</span>
          <b v-if="lastPickup.shelfCodes?.length">原货架 {{ lastPickup.shelfCodes.join('、') }}</b>
        </div>
      </section>
      <section class="card ready-card">
        <div class="section-head"><h3>已回店待取订单</h3><span>{{ ready.length }} 单</span></div>
        <el-empty v-if="!ready.length" description="暂无待取订单" />
        <div v-for="entry in ready" :key="entry.orderNo" class="ready-row">
          <div><b>{{ entry.orderNo }}</b><span>{{ entry.maskedPhone }} · {{ entry.totalCount }} 件</span></div>
          <div class="waiting">待顾客提供取衣码</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { pickupApi } from '@/api'

const phone = ref('')
const pickupCode = ref('')
const ready = ref([])
const busy = ref(false)
const phoneInput = ref(null); const codeInput = ref(null); const lastPickup = ref(null)
const canClose = computed(() => /^1\d{10}$/.test(phone.value) && /^\d{4}$/.test(pickupCode.value) && !busy.value)

async function loadReady() { ready.value = await pickupApi.ready() }
function focusPickupCode() { if (/^1\d{10}$/.test(phone.value)) nextTick(() => codeInput.value?.focus()) }

async function closeOrder() {
  if (!canClose.value) return ElMessage.warning('请输入完整手机号和四位数字取衣码')
  busy.value = true
  try {
    const result = await pickupApi.close(phone.value, pickupCode.value)
    lastPickup.value = result
    phone.value = ''
    pickupCode.value = ''
    await loadReady()
  } finally { busy.value = false; await nextTick(); phoneInput.value?.focus() }
}

onMounted(async () => {
  try { await pickupApi.prepareLegacy(); await loadReady() }
  catch (error) { console.error('加载取衣订单失败', error) }
})
</script>

<style scoped>
.pickup-page { color: #263445; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
h2, h3 { margin: 0; }
header h2 { margin-bottom: 6px; }
header p { color: #667588; margin: 0; }
.pickup-grid { display: grid; grid-template-columns: minmax(330px, 38%) minmax(0, 62%); gap: 18px; }
.card { background: #fff; padding: 24px; border: 1px solid #e1e7ed; border-radius: 12px; min-height: 540px; }
.action-card h3 { margin-bottom: 22px; }
.wide { width: 100%; min-height: 52px; font-size: 17px; margin-bottom: 18px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-head span { color: #64748b; font-variant-numeric: tabular-nums; }
.pickup-result { display: grid; gap: 7px; margin-top: 18px; padding: 18px; color: #174d34; background: #eaf8ef; border-radius: 12px; box-shadow: 0 8px 22px rgba(27,94,62,.1); }.pickup-result strong { font-size: 24px; }.pickup-result b { font-size: 18px; font-variant-numeric: tabular-nums; }
.ready-row { width: 100%; border-top: 1px solid #e4e9ee; padding: 16px 2px; display: flex; align-items: center; justify-content: space-between; gap: 12px; color: inherit; }
.ready-row span { display: block; color: #526579; margin-top: 5px; }
.waiting { white-space: nowrap; color: #526579; }
@media (max-width: 900px) { .pickup-grid { grid-template-columns: 1fr; } .card { min-height: auto; } }
</style>
