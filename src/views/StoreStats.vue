<template>
  <div class="page">
    <h2>{{ business ? '营业统计' : '收入统计' }}</h2>
    <div class="filters"><el-date-picker v-model="range" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" :clearable="false"/><el-button type="primary" :disabled="!range?.length" @click="load">查询</el-button></div>
    <el-alert v-if="data?.basis" :title="data.basis" type="info" :closable="false" class="basis" />
    <template v-if="business && data">
      <div class="cards"><div v-for="card in businessCards" :key="card.label" class="card"><span>{{card.label}}</span><strong>{{card.value}}</strong></div></div>
      <h3>每日营业</h3><el-table :data="data.daily" border stripe><el-table-column prop="day" label="闭单日"/><el-table-column prop="orderCount" label="订单数"/><el-table-column prop="itemCount" label="衣物件数"/><el-table-column prop="serviceRevenue" label="洗衣服务营业额（元）"/></el-table>
    </template>
    <template v-if="!business && data">
      <div class="cards"><div v-for="card in incomeCards" :key="card.label" class="card"><span>{{card.label}}</span><strong>{{card.value}}</strong></div></div>
      <p class="hint">全额应退为政策估算，不代表已经完成退款；会员卡消费仅供对账，不重复计入实收。</p>
      <h3>每日实收</h3><el-table :data="data.daily" border stripe><el-table-column prop="day" label="收衣日"/><el-table-column prop="orderCount" label="订单数"/><el-table-column prop="collected" label="实收（元）"/></el-table>
    </template>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { storeStatisticsApi } from '@/api'
const props=defineProps({mode:{type:String,required:true}})
const business=computed(()=>props.mode==='stat-business')
const today=new Date(),first=new Date(today.getFullYear(),today.getMonth(),1)
const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const range=ref([fmt(first),fmt(today)]),data=ref(null)
const money=v=>Number(v||0).toFixed(2)
const businessCards=computed(()=>{const s=data.value?.summary||{};return[{label:'已闭单订单',value:s.orderCount||0},{label:'衣物件数',value:s.itemCount||0},{label:'洗衣服务营业额',value:money(s.serviceRevenue)},{label:'原价合计',value:money(s.listAmount)},{label:'折扣优惠',value:money(s.discountAmount)},{label:'加急收入',value:money(s.urgentAmount)}]})
const incomeCards=computed(()=>{const s=data.value?.receipts||{},r=data.value?.refunds||{};return[{label:'顾客实收',value:money(s.collected)},{label:'现金',value:money(s.cash)},{label:'微信',value:money(s.wechat)},{label:'支付宝',value:money(s.alipay)},{label:'支付渠道未记录',value:money(s.methodUnspecified)},{label:'其中办卡/充值',value:money(s.cardTopup)},{label:'会员卡消费（不重复计收）',value:money(s.cardConsumed)},{label:'取消订单全额应退',value:money(r.fullRefundDue)}]})
async function load(){if(!range.value?.length)return;const [from,to]=range.value;data.value=business.value?await storeStatisticsApi.business(from,to):await storeStatisticsApi.income(from,to)}
watch(()=>props.mode,load,{immediate:true})
</script>
<style scoped>.page{background:#fff;padding:24px;border-radius:12px}.page h2{margin:0 0 18px}.filters{display:flex;gap:12px;margin-bottom:20px}.basis{margin-bottom:18px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:16px 0 24px}.card{display:flex;flex-direction:column;gap:10px;padding:18px;border:1px solid #e2e8f0;border-radius:9px}.card span,.hint{color:#64748b}.card strong{font-size:23px;color:#1e3a5f}</style>
