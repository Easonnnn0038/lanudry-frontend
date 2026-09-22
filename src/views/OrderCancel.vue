<template>
  <div class="page-shell">
    <header><div><h2>删除查询</h2><p>{{ isAdmin ? '审核店员提出的订单取消申请，并查询或恢复历史记录。' : '提交未送厂订单的取消申请，并查看自己的申请结果。' }}</p></div><el-button @click="loadRequests">刷新记录</el-button></header>
    <section v-if="!isAdmin" class="apply-zone">
      <h3>申请取消订单</h3><div class="search-row"><el-input v-model.trim="keyword" placeholder="输入完整订单号或手机号" clearable @keyup.enter="findOrders"/><el-button type="primary" :disabled="keyword.length<4" @click="findOrders">查询未送厂订单</el-button></div>
      <el-table v-if="eligible.length" :data="eligible" border stripe><el-table-column prop="orderNo" label="订单号" min-width="170"/><el-table-column prop="phone" label="手机号" min-width="140"/><el-table-column prop="itemCount" label="件数" width="80"/><el-table-column label="操作" width="110"><template #default="{row}"><el-button link type="danger" @click="applyFor(row)">申请取消</el-button></template></el-table-column></el-table>
    </section>
    <section class="records">
      <div class="record-head"><h3>{{ isAdmin ? '取消申请与历史记录' : '我的申请记录' }}</h3><el-input v-if="isAdmin" v-model.trim="filter" placeholder="按订单号或手机号筛选" clearable @keyup.enter="loadRequests"><template #append><el-button @click="loadRequests">查询</el-button></template></el-input></div>
      <el-table :data="requests" border stripe v-loading="loading" empty-text="暂无取消申请">
        <el-table-column prop="orderNo" label="订单号" min-width="165"/><el-table-column prop="phone" label="手机号" min-width="135"/>
        <el-table-column prop="applicantName" label="申请人" width="100"/><el-table-column prop="reason" label="申请原因" min-width="190" show-overflow-tooltip/>
        <el-table-column label="申请状态" width="110"><template #default="{row}"><el-tag :type="tagType(row.status)">{{ requestName(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="订单状态" width="105"><template #default="{row}">{{ orderName(row.orderStatus) }}</template></el-table-column>
        <el-table-column label="申请时间" min-width="165"><template #default="{row}">{{ time(row.applyTime) }}</template></el-table-column>
        <el-table-column v-if="isAdmin" label="操作" min-width="205"><template #default="{row}"><template v-if="row.status==='PENDING'"><el-button size="small" type="danger" @click="review(row,'APPROVE')">批准取消</el-button><el-button size="small" @click="review(row,'REJECT')">驳回</el-button></template><el-button v-else-if="row.status==='APPROVED'" size="small" type="primary" plain @click="restore(row)">恢复误取消</el-button><span v-else>—</span></template></el-table-column>
      </el-table>
      <p class="footnote">取消采用状态留痕，不会物理删除订单。退款和支付冲正暂未接入。</p>
    </section>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderCancelApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
const auth=useAuthStore(),isAdmin=computed(()=>auth.role==='ADMIN'),keyword=ref(''),filter=ref(''),eligible=ref([]),requests=ref([]),loading=ref(false)
const requestName=s=>({PENDING:'待审核',APPROVED:'已取消',REJECTED:'已驳回',RESTORED:'已恢复'})[s]||s
const orderName=s=>({RECEIVED:'待送厂',CANCELLED:'已取消',SENT_TO_FACTORY:'已送厂'})[s]||s
const tagType=s=>({PENDING:'warning',APPROVED:'danger',REJECTED:'info',RESTORED:'success'})[s]||'info'
const time=v=>v?String(v).replace('T',' ').slice(0,19):'—'
async function findOrders(){eligible.value=await orderCancelApi.eligible(keyword.value)}
async function loadRequests(){loading.value=true;try{requests.value=await orderCancelApi.search(isAdmin.value?filter.value:'')}finally{loading.value=false}}
async function applyFor(row){const {value}=await ElMessageBox.prompt('请说明为什么需要取消该订单。申请提交后，订单仍可正常操作，直到管理员批准。','申请取消订单',{inputValidator:v=>!!v?.trim()||'请填写申请原因',inputType:'textarea'});await orderCancelApi.apply(row.orderNo,value.trim());ElMessage.success('申请已提交，等待管理员审核');eligible.value=[];await loadRequests()}
async function review(row,action){const label=action==='APPROVE'?'批准取消':'驳回';const {value}=await ElMessageBox.prompt(`确认${label}订单 ${row.orderNo}？可填写审核说明。`,'审核取消申请',{inputPlaceholder:'审核说明（选填）',confirmButtonText:label});await orderCancelApi.review(row.id,action,value||'');ElMessage.success(`已${label}`);await loadRequests()}
async function restore(row){await ElMessageBox.confirm(`确认恢复订单 ${row.orderNo}？恢复后订单回到待送厂状态。`,'恢复误取消订单',{type:'warning'});await orderCancelApi.restore(row.id);ElMessage.success('订单已恢复');await loadRequests()}
onMounted(loadRequests)
</script>
<style scoped>.page-shell{background:#fff;padding:24px;border-radius:12px;color:#263445}header,.record-head{display:flex;justify-content:space-between;align-items:flex-start}h2{margin:0 0 7px}header p{margin:0;color:#667588}.apply-zone{margin-top:25px;padding:20px;background:#f7f9fb;border-radius:12px}.apply-zone h3,.records h3{margin:0 0 16px}.search-row{display:flex;gap:12px;max-width:590px;margin-bottom:18px}.records{margin-top:28px}.record-head{align-items:center}.record-head .el-input{width:340px}.footnote{margin:14px 0 0;color:#758396;font-size:13px}@media(max-width:760px){header,.record-head{display:grid;gap:14px}.record-head .el-input{width:100%}}</style>
