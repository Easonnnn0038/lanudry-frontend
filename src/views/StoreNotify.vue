<template>
  <div class="page">
    <div class="heading"><div><h2>取衣通知</h2><p>员工通过电话或微信联系顾客后，在此登记通知。通知内容包含四位取衣码。</p></div><el-button @click="load">刷新</el-button></div>
    <el-table :data="rows" border stripe v-loading="loading" empty-text="暂无可通知订单">
      <el-table-column prop="orderNo" label="订单号" min-width="170" />
      <el-table-column prop="phone" label="手机号" min-width="140" />
      <el-table-column prop="pickupCode" label="取衣码" width="100" />
      <el-table-column prop="itemCount" label="件数" width="75" />
      <el-table-column label="已通知" width="110"><template #default="{row}">{{ row.notifyCount }} 次</template></el-table-column>
      <el-table-column label="最近通知" min-width="170"><template #default="{row}">{{ time(row.lastNotifiedAt) }}</template></el-table-column>
      <el-table-column label="操作" min-width="210"><template #default="{row}"><el-button size="small" type="primary" @click="notify(row,'PHONE')">电话已联系</el-button><el-button size="small" @click="notify(row,'WECHAT')">微信已联系</el-button></template></el-table-column>
    </el-table>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeOperationsApi } from '@/api'
const rows=ref([]), loading=ref(false)
const time=v=>v?String(v).replace('T',' ').slice(0,19):'—'
async function load(){ loading.value=true; try { rows.value=await storeOperationsApi.notifications() } finally { loading.value=false } }
async function notify(row,channel){
  const content=`衣物已回店，请凭完整手机号和四位取衣码 ${row.pickupCode} 到店领取。订单号 ${row.orderNo}`
  await ElMessageBox.confirm(`请确认已通过${channel==='PHONE'?'电话':'微信'}告知顾客：\n${content}`, '登记取衣通知', {type:'warning',confirmButtonText:'确认已联系'})
  await storeOperationsApi.notify(row.orderNo,channel); ElMessage.success('通知已登记'); await load()
}
onMounted(load)
</script>
<style scoped>.page{background:#fff;padding:24px;border-radius:12px}.heading{display:flex;justify-content:space-between;align-items:start;margin-bottom:20px}.heading h2{margin:0 0 6px}.heading p{margin:0;color:#64748b}</style>
