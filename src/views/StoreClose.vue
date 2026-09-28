<template>
  <div class="pickup-page">
    <header>
      <div><h2>快速取衣</h2><p>输入完整手机号或四位取衣码，整单取衣一步完成；也可以取消部分衣物后单独取件。</p></div>
      <el-button @click="loadReady">刷新待取订单</el-button>
    </header>

    <section class="search-panel">
      <el-input ref="identifierInput" v-model.trim="identifier" size="large" maxlength="11"
        placeholder="手机号 / 四位取衣码" clearable autofocus @input="clearResult" @keyup.enter="lookup" />
      <el-button type="primary" size="large" :loading="loading" :disabled="!validIdentifier" @click="lookup">查询待取衣物</el-button>
    </section>

    <section v-if="result" class="pickup-panel">
      <div class="selection-head">
        <div><h3>待交付衣物</h3><span>已选 {{ selected.length }} / {{ result.itemCount }} 件</span></div>
        <el-checkbox :model-value="allSelected" :indeterminate="partSelected" @change="toggleAll">全部选择</el-checkbox>
      </div>
      <div v-for="order in result.orders" :key="order.orderNo" class="order-group">
        <div class="order-head"><b>订单 {{ order.orderNo }}</b><span>{{ order.maskedPhone }}</span></div>
        <label v-for="item in order.items" :key="item.id" class="garment-row">
          <el-checkbox v-model="selected" :value="item.id" />
          <div class="garment"><strong>{{ item.categoryName }}</strong><span>{{ item.color || '未填颜色' }} · 衣物码 {{ item.barcode }}</span></div>
          <div class="shelf"><small>货架</small><b>{{ item.shelfCode }}</b></div>
        </label>
      </div>
      <div class="complete-bar">
        <span>{{ selected.length === result.itemCount ? '整单取衣' : `单独取件，剩余 ${result.itemCount-selected.length} 件` }}</span>
        <el-button type="success" size="large" :loading="busy" :disabled="!selected.length" @click="completePickup">完成取衣（{{ selected.length }}件）</el-button>
      </div>
    </section>

    <section v-else class="ready-panel">
      <div class="section-head"><h3>已回店待取订单</h3><span>{{ ready.length }} 单</span></div>
      <el-empty v-if="!ready.length" description="暂无待取订单" />
      <div v-for="entry in ready" :key="entry.orderNo" class="ready-row">
        <div><b>{{ entry.orderNo }}</b><span>{{ entry.maskedPhone }}</span></div>
        <div><strong>{{ entry.remainingCount }} 件待取</strong><small v-if="entry.status==='PARTIALLY_PICKED_UP'">已部分取件</small></div>
      </div>
    </section>

    <div v-if="lastPickup" class="pickup-result" role="status" aria-live="polite">
      <strong>取衣完成</strong><span>已交付 {{ lastPickup.pickedCount }} 件</span>
      <b v-if="lastPickup.remainingCount">还有 {{ lastPickup.remainingCount }} 件留店</b>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { pickupApi } from '@/api'

const identifier=ref(''),result=ref(null),selected=ref([]),ready=ref([]),loading=ref(false),busy=ref(false),lastPickup=ref(null),identifierInput=ref()
const validIdentifier=computed(()=>/^1\d{10}$/.test(identifier.value)||/^\d{4}$/.test(identifier.value))
const allIds=computed(()=>result.value?.orders.flatMap(order=>order.items.map(item=>item.id))||[])
const allSelected=computed(()=>allIds.value.length>0&&selected.value.length===allIds.value.length)
const partSelected=computed(()=>selected.value.length>0&&!allSelected.value)

async function loadReady(){ready.value=await pickupApi.ready()}
function clearResult(){result.value=null;selected.value=[]}
function toggleAll(value){selected.value=value?[...allIds.value]:[]}
async function lookup(){if(!validIdentifier.value)return ElMessage.warning('请输入完整手机号或四位取衣码');loading.value=true;lastPickup.value=null;clearResult();try{result.value=await pickupApi.lookup(identifier.value);selected.value=[...allIds.value]}finally{loading.value=false}}
async function completePickup(){if(!selected.value.length)return;busy.value=true;try{lastPickup.value=await pickupApi.close(identifier.value,selected.value);ElMessage.success(`已完成 ${lastPickup.value.pickedCount} 件衣物取件`);identifier.value='';clearResult();await loadReady()}finally{busy.value=false;await nextTick();identifierInput.value?.focus()}}

onMounted(async()=>{try{await pickupApi.prepareLegacy();await loadReady()}catch(error){console.error('加载取衣订单失败',error)}})
</script>

<style scoped>
.pickup-page{color:#263445;max-width:1120px}.pickup-page>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}h2,h3{margin:0}header h2{margin-bottom:6px}header p{color:#667588;margin:0}.search-panel{display:flex;gap:12px;background:#fff;padding:22px;border-radius:12px;margin-bottom:18px}.search-panel .el-input{max-width:520px}.pickup-panel,.ready-panel{background:#fff;padding:24px;border-radius:12px}.selection-head,.section-head,.order-head,.garment-row,.complete-bar,.ready-row{display:flex;align-items:center;justify-content:space-between}.selection-head{margin-bottom:18px}.selection-head span,.section-head span,.order-head span{color:#667588;margin-top:5px}.order-group{border-top:1px solid #e1e7ed}.order-head{padding:16px 2px 10px}.garment-row{gap:14px;padding:14px 2px;border-top:1px solid #eef1f4;cursor:pointer}.garment{flex:1}.garment span,.ready-row span{display:block;color:#526579;margin-top:5px}.shelf{display:flex;align-items:baseline;gap:8px;min-width:120px;justify-content:flex-end}.shelf small{color:#667588}.shelf b{font-size:22px;color:#176b47;font-variant-numeric:tabular-nums}.complete-bar{position:sticky;bottom:16px;margin:22px -8px -8px;padding:16px 18px;background:#f5faf7;border-radius:12px;box-shadow:0 8px 24px rgba(25,83,57,.12)}.complete-bar>span{color:#526579}.section-head{margin-bottom:16px}.ready-row{padding:16px 2px;border-top:1px solid #e4e9ee}.ready-row>div:last-child{text-align:right}.ready-row small{display:block;color:#a15c00;margin-top:5px}.pickup-result{display:flex;gap:12px;align-items:center;margin-top:18px;padding:18px;color:#174d34;background:#eaf8ef;border-radius:12px}.pickup-result strong{font-size:22px}.pickup-result b{margin-left:auto}@media(max-width:760px){.pickup-page>header,.search-panel,.complete-bar{align-items:stretch;flex-direction:column}.search-panel .el-input{max-width:none}.garment-row{align-items:flex-start}.shelf{min-width:85px}.pickup-result{align-items:flex-start;flex-direction:column}.pickup-result b{margin-left:0}}
</style>
