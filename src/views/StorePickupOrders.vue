<template>
  <section class="page">
    <header>
      <div><h2>上门取衣单</h2><p>顾客提交预约，门店取回后导入收衣页面统一验衣和结算。</p></div>
      <div class="actions"><el-select v-model="filter" clearable placeholder="全部状态" @change="load"><el-option v-for="(label,key) in labels" :key="key" :label="label" :value="key" /></el-select><el-button @click="load">刷新</el-button></div>
    </header>
    <el-table :data="rows" border stripe v-loading="loading" empty-text="暂无上门取衣单">
      <el-table-column prop="pickupNo" label="预约单号" min-width="180" />
      <el-table-column prop="contactName" label="联系人" width="110" />
      <el-table-column prop="customerPhone" label="手机号" width="135" />
      <el-table-column label="预约时间" width="190"><template #default="{row}">{{row.appointmentDate}} {{row.appointmentSlot}}</template></el-table-column>
      <el-table-column prop="pickupAddress" label="上门地址" min-width="220" show-overflow-tooltip />
      <el-table-column label="预估" width="100"><template #default="{row}">¥{{money(row.estimatedAmount)}}</template></el-table-column>
      <el-table-column label="会员" width="110"><template #default="{row}">{{row.memberCardType || '非会员'}}</template></el-table-column>
      <el-table-column label="状态" width="110"><template #default="{row}"><el-tag>{{labels[row.status] || row.status}}</el-tag></template></el-table-column>
      <el-table-column label="正式订单" width="180"><template #default="{row}"><span class="order-no">{{row.formalOrderNo || '—'}}</span></template></el-table-column>
      <el-table-column label="操作" width="360" fixed="right"><template #default="{row}">
        <el-button link type="primary" @click="open(row)">详情</el-button>
        <el-button v-if="['SUBMITTED','PAID'].includes(row.status)" link type="success" @click="advance(row,'confirm')">确认接单</el-button>
        <el-button v-if="row.status==='CONFIRMED'" link type="success" @click="advance(row,'pickedUp')">已取回</el-button>
        <el-button v-if="row.status==='PICKED_UP'" link type="warning" :loading="busyId===row.id" @click="importToReceive(row)">导入收衣</el-button>
      </template></el-table-column>
    </el-table>

    <el-dialog v-model="visible" title="上门取衣单详情" width="680px">
      <template v-if="detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="预约单号">{{detail.pickup_no}}</el-descriptions-item><el-descriptions-item label="状态">{{labels[detail.status] || detail.status}}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{detail.contact_name}}</el-descriptions-item><el-descriptions-item label="手机号">{{detail.customer_phone}}</el-descriptions-item>
          <el-descriptions-item label="预约时间">{{detail.appointment_date}} {{detail.appointment_slot}}</el-descriptions-item><el-descriptions-item label="预估金额">¥{{money(detail.estimated_amount)}}</el-descriptions-item>
          <el-descriptions-item label="会员身份">{{detail.member_card_type || '非会员'}}</el-descriptions-item><el-descriptions-item label="会员优惠">¥{{money(detail.discount_amount)}}</el-descriptions-item>
          <el-descriptions-item label="上门地址" :span="2">{{detail.pickup_address}}</el-descriptions-item><el-descriptions-item label="备注" :span="2">{{detail.remark || '无'}}</el-descriptions-item>
        </el-descriptions>
        <el-table :data="detail.items" border class="items"><el-table-column prop="categoryName" label="衣物"/><el-table-column prop="quantity" label="数量" width="80"/><el-table-column label="单价" width="100"><template #default="{row}">¥{{money(row.unitPrice)}}</template></el-table-column><el-table-column label="小计" width="100"><template #default="{row}">¥{{money(row.subtotal)}}</template></el-table-column></el-table>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { pickupOrderApi } from '@/api'

const labels={SUBMITTED:'待接单',PENDING_PAYMENT:'待付款',PAID:'待接单',CONFIRMED:'待取衣',PICKED_UP:'待导入收衣',INSPECTED:'已验衣',CONVERTED:'已转正式单',CANCELLED:'已取消'}
const rows=ref([]),filter=ref(''),loading=ref(false),visible=ref(false),detail=ref(null),busyId=ref(null)
const money=v=>Number(v||0).toFixed(2)
async function load(){loading.value=true;try{rows.value=await pickupOrderApi.list(filter.value)}finally{loading.value=false}}
async function open(row){detail.value=await pickupOrderApi.detail(row.id);visible.value=true}
async function advance(row,action){if(action==='confirm')await pickupOrderApi.confirm(row.id);else await pickupOrderApi.pickedUp(row.id);ElMessage.success(action==='confirm'?'已接单':'已取回门店');await load()}
async function importToReceive(row){busyId.value=row.id;try{const source=await pickupOrderApi.detail(row.id);localStorage.setItem('laundry_pickup_pending_v1',JSON.stringify({id:source.id,pickupNo:source.pickup_no,customer:{name:source.contact_name,phone:source.customer_phone,address:source.pickup_address||''},remark:source.remark||'',items:source.items}));window.dispatchEvent(new CustomEvent('navigate-menu',{detail:'store-receive'}))}finally{busyId.value=null}}
onMounted(load)
</script>

<style scoped>
.page{max-width:1500px;margin:auto}header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}h2{margin:0 0 8px}p{margin:0;color:#526579}.actions{display:flex;gap:10px}.actions .el-select{width:150px}.items{margin-top:20px}.order-no{font-variant-numeric:tabular-nums;color:#334155}
</style>
