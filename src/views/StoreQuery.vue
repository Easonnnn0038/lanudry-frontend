<template>
  <div class="page">
    <h2>衣物查询</h2><p>输入完整手机号、订单号或单件衣物码，查看本店相关订单及全部衣物。页面不显示顾客姓名。</p>
    <div class="search"><el-input v-model.trim="keyword" placeholder="手机号 / 订单号 / 衣物码" clearable @keyup.enter="search" /><el-button type="primary" :disabled="keyword.length<3" @click="search">查询</el-button></div>
    <el-table :data="rows" border stripe v-loading="loading" empty-text="暂无查询结果">
      <el-table-column prop="orderNo" label="订单号" min-width="165" />
      <el-table-column prop="phone" label="手机号" min-width="135" />
      <el-table-column prop="barcode" label="衣物码" min-width="140" />
      <el-table-column prop="categoryName" label="类别" min-width="120" />
      <el-table-column label="订单状态" min-width="130"><template #default="{row}">{{ statusLabel(row.orderStatus) }}</template></el-table-column>
      <el-table-column label="工厂工序" min-width="100"><template #default="{row}">{{ processLabel(row.factoryProcess) }}</template></el-table-column>
      <el-table-column prop="packageNo" label="大件码" min-width="150" />
      <el-table-column prop="sourceBatchNo" label="送厂批次" min-width="150" />
      <el-table-column prop="shelfCode" label="货架" min-width="100" />
      <el-table-column label="异常" width="75"><template #default="{row}">{{ row.errorBackFlag?'是':'—' }}</template></el-table-column>
    </el-table>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { storeOperationsApi } from '@/api'
const keyword=ref(''),rows=ref([]),loading=ref(false)
const statusNames={RECEIVED:'已收衣',SENT_TO_FACTORY:'已送厂',BACK_TO_STORE:'已回店',NOTIFIED:'已通知取衣',PICKED_UP:'已取衣',CANCELLED:'已取消'}
const statusLabel=status=>statusNames[status]||status||'未知'
const processNames={SORT:'分拣',WASH:'洗涤',DRY:'烘干',IRON:'熨烫',QUALITY:'质检',PACK:'打包',RETURN:'待回店发货',DONE:'已完成'}
const processLabel=process=>processNames[process]||process||'—'
async function search(){if(keyword.value.length<3)return;loading.value=true;try{rows.value=await storeOperationsApi.clothes(keyword.value)}finally{loading.value=false}}
</script>
<style scoped>.page{background:#fff;padding:24px;border-radius:12px}.page h2{margin:0 0 6px}.page p{color:#64748b}.search{display:flex;gap:10px;max-width:550px;margin:20px 0}</style>
