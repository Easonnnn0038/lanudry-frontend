<template>
  <div class="page">
    <header><div><h2>顾客通知</h2><p>支持短信和小程序通知；供应商未配置时只记录任务，不会显示为发送成功。</p></div><el-button @click="load">刷新</el-button></header>
    <div class="toolbar"><el-checkbox-group v-model="channels"><el-checkbox-button label="SMS">短信</el-checkbox-button><el-checkbox-button label="MINIAPP">小程序</el-checkbox-button></el-checkbox-group><el-select v-model="type"><el-option label="取衣通知" value="PICKUP_READY"/><el-option label="店返延期" value="STORE_RETURN_DELAY"/><el-option label="店返完成" value="STORE_RETURN_COMPLETE"/><el-option label="取衣提醒" value="PICKUP_REMINDER"/></el-select><el-button type="primary" :disabled="!selected.length||!channels.length" :loading="sending" @click="sendBatch">批量通知（{{selected.length}}）</el-button></div>
    <el-table ref="tableRef" :data="rows" border stripe v-loading="loading" @selection-change="selected=$event"><el-table-column type="selection" width="48" :selectable="canSelect"/><el-table-column prop="orderNo" label="订单号" min-width="170"/><el-table-column prop="maskedPhone" label="手机号" width="140"/><el-table-column prop="itemCount" label="件数" width="70"/><el-table-column label="状态" width="130"><template #default="{row}">{{statusName(row.status)}}</template></el-table-column><el-table-column label="最近发送" width="130"><template #default="{row}">{{notifyStatus(row.lastStatus)}}</template></el-table-column><el-table-column label="单条通知" width="170"><template #default="{row}"><el-button link type="primary" :loading="busy===row.orderNo+'SMS'" @click="sendOne(row,'SMS')">短信</el-button><el-button link type="primary" :loading="busy===row.orderNo+'MINIAPP'" @click="sendOne(row,'MINIAPP')">小程序</el-button></template></el-table-column></el-table>
    <h3>发送记录</h3><el-table :data="records" border stripe><el-table-column prop="orderNo" label="订单号"/><el-table-column label="渠道"><template #default="{row}">{{row.channel==='SMS'?'短信':'小程序'}}</template></el-table-column><el-table-column prop="notificationType" label="类型"/><el-table-column label="结果"><template #default="{row}">{{notifyStatus(row.status)}}</template></el-table-column><el-table-column prop="lastError" label="说明" min-width="190"/></el-table>
  </div>
</template>
<script setup>
import { onMounted,ref,watch } from 'vue'
import { ElMessage,ElMessageBox } from 'element-plus'
import { notificationApi } from '@/api'
const rows=ref([]),records=ref([]),selected=ref([]),channels=ref(['MINIAPP','SMS']),type=ref('PICKUP_READY'),loading=ref(false),sending=ref(false),busy=ref(''),tableRef=ref()
const statusName=s=>({BACK_TO_STORE:'已回店',NOTIFIED:'已通知',STORE_REWORKING:'店返处理中'})[s]||s
const notifyStatus=s=>({SENT:'已发送',FAILED:'失败',PENDING:'待发送',NOT_CONFIGURED:'渠道未配置'})[s]||'未发送'
async function load(){loading.value=true;try{[rows.value,records.value]=await Promise.all([notificationApi.candidates(),notificationApi.records()])}finally{loading.value=false}}
const requestId=()=>crypto.randomUUID().replaceAll('-','')
const canSelect=row=>type.value==='STORE_RETURN_DELAY'?row.status==='STORE_REWORKING':row.status!=='STORE_REWORKING'
async function sendOne(row,channel){busy.value=row.orderNo+channel;try{const t=row.status==='STORE_REWORKING'?'STORE_RETURN_DELAY':type.value;await notificationApi.send({requestId:requestId(),orderNos:[row.orderNo],channels:[channel],type:t});ElMessage.warning('通知任务已记录，但供应商尚未配置');await load()}finally{busy.value=''}}
async function sendBatch(){await ElMessageBox.confirm(`将为 ${selected.value.length} 个订单创建 ${channels.value.map(c=>c==='SMS'?'短信':'小程序').join('、')}通知任务。真实发送不可撤回。`,'批量通知',{type:'warning',confirmButtonText:'创建通知任务'});sending.value=true;try{await notificationApi.send({requestId:requestId(),orderNos:selected.value.map(x=>x.orderNo),channels:channels.value,type:type.value});ElMessage.warning('批量任务已记录，但供应商尚未配置');await load()}finally{sending.value=false}}
watch(type,()=>tableRef.value?.clearSelection())
onMounted(load)
</script>
<style scoped>.page{background:#fff;padding:24px;border-radius:12px;color:#263445}header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}h2{margin:0 0 7px}header p{margin:0;color:#667588}.toolbar{display:flex;gap:12px;align-items:center;margin-bottom:18px}.toolbar .el-select{width:150px}h3{margin:28px 0 14px}</style>
