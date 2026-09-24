<template>
  <div class="maintenance-page">
    <header class="page-head"><div><h2>远程维护</h2><p>查看运行状态和异常记录，供管理员与维护人员定位问题。此页面不提供远程控制。</p></div><el-button :loading="loading" @click="refresh">刷新当前页</el-button></header>
    <el-tabs v-model="tab" class="tabs" @tab-change="refresh">
      <el-tab-pane label="运行状态" name="status">
        <div v-if="health" class="health-list">
          <article v-for="service in services" :key="service.name" class="health-row"><span :class="['signal',service.state.toLowerCase()]"/><div><strong>{{ service.name }}</strong><small>{{ service.detail }}</small></div><b>{{ stateName(service.state) }}</b></article>
        </div>
        <div v-if="health" class="runtime"><span>服务启动时间 {{ time(health.startedAt) }}</span><span>已运行 {{ uptime(health.uptimeSeconds) }}</span><span>检查时间 {{ time(health.checkedAt) }}</span></div>
      </el-tab-pane>
      <el-tab-pane label="系统错误" name="system"><EventTable category="SYSTEM_ERROR" :rows="events" :loading="loading" @filter="loadEvents" @update="updateEvent" @export="exportEvents"/></el-tab-pane>
      <el-tab-pane label="业务异常" name="business"><EventTable category="BUSINESS_EXCEPTION,CLIENT_ERROR" :rows="events" :loading="loading" @filter="loadEvents" @update="updateEvent" @export="exportEvents"/></el-tab-pane>
      <el-tab-pane label="消息任务" name="messages">
        <div class="filters"><el-select v-model="messageStatus" placeholder="投递状态" clearable style="width:150px"><el-option v-for="(label,value) in messageStatusNames" :key="value" :label="label" :value="value"/></el-select><el-button type="primary" @click="loadMessages">查询</el-button></div>
        <el-table :data="messages" border stripe v-loading="loading" empty-text="暂无消息任务">
          <el-table-column prop="createTime" label="创建时间" min-width="165"/><el-table-column prop="aggregateId" label="订单号" min-width="170"/><el-table-column label="投递" width="100"><template #default="{row}"><el-tag :type="messageTag(row.status)">{{ messageStatusNames[row.status]||row.status }}</el-tag></template></el-table-column><el-table-column label="消费" width="100"><template #default="{row}"><el-tag :type="messageTag(row.consumeStatus)">{{ consumeStatusNames[row.consumeStatus]||'待消费' }}</el-tag></template></el-table-column><el-table-column prop="attemptCount" label="投递次数" width="90"/><el-table-column label="错误信息" min-width="230" show-overflow-tooltip><template #default="{row}">{{ row.consumeError||row.lastError||'—' }}</template></el-table-column><el-table-column label="操作" width="100"><template #default="{row}"><el-button v-if="row.status==='DEAD'||row.consumeStatus==='DEAD'" link type="primary" @click="retryMessage(row)">重新投递</el-button><span v-else class="muted">—</span></template></el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="操作记录" name="audit">
        <div class="filters"><el-input v-model.trim="auditFilter.keyword" placeholder="订单号或操作员" clearable/><el-date-picker v-model="auditFilter.range" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期"/><el-button type="primary" @click="loadAudit">查询</el-button></div>
        <el-table :data="audits" border stripe v-loading="loading" empty-text="暂无操作记录"><el-table-column prop="operateTime" label="时间" min-width="165"/><el-table-column prop="orderNo" label="订单号" min-width="165"/><el-table-column prop="operatorName" label="操作员" width="110"/><el-table-column label="操作类型" width="120"><template #default="{row}">{{ operateName(row.operateType) }}</template></el-table-column><el-table-column prop="description" label="操作内容" min-width="260" show-overflow-tooltip/><el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip/></el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { ElButton, ElDatePicker, ElDialog, ElInput, ElMessage, ElOption, ElSelect, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { maintenanceApi } from '@/api'

const tab=ref('status'),health=ref(null),events=ref([]),audits=ref([]),messages=ref([]),messageStatus=ref(''),loading=ref(false),lastEventFilter=ref({})
const auditFilter=reactive({keyword:'',range:[]})
const services=computed(()=>health.value?[health.value.backend,health.value.database,health.value.factory,health.value.rabbitmq,health.value.redis].filter(Boolean):[])
const messageStatusNames={PENDING:'待投递',PUBLISHING:'投递中',RETRY:'等待重试',SENT:'已投递',DEAD:'投递失败'}
const consumeStatusNames={PROCESSING:'处理中',SUCCESS:'成功',DEAD:'消费失败'}
const messageTag=s=>({SENT:'success',SUCCESS:'success',PENDING:'info',PUBLISHING:'warning',PROCESSING:'warning',RETRY:'warning',DEAD:'danger'}[s]||'info')
const stateName=s=>({OK:'正常',ERROR:'异常',UNCONFIGURED:'未配置'})[s]||s
const time=v=>v?String(v).replace('T',' ').slice(0,19):'—'
const uptime=s=>{const n=Number(s||0);return `${Math.floor(n/86400)}天 ${Math.floor(n%86400/3600)}小时 ${Math.floor(n%3600/60)}分钟`}
const operateName=s=>({RECEIVE:'收衣',SEND:'送厂',BACK:'回店',NOTIFY:'通知',PICKUP:'取衣闭单',CANCEL:'取消',RESTORE:'恢复',SUPPLEMENT:'补收附件',RECHARGE:'充值',DEDUCT:'会员卡扣款'})[s]||s
async function loadStatus(){health.value=await maintenanceApi.status()}
async function loadEvents(filter={}){lastEventFilter.value=filter;const categories=tab.value==='system'?['SYSTEM_ERROR']:['BUSINESS_EXCEPTION','CLIENT_ERROR'];const all=await Promise.all(categories.map(category=>maintenanceApi.events({...filter,category})));events.value=all.flat().sort((a,b)=>String(b.lastTime).localeCompare(String(a.lastTime)))}
async function loadAudit(){const [from,to]=auditFilter.range||[];audits.value=await maintenanceApi.audit({keyword:auditFilter.keyword||undefined,from,to})}
async function loadMessages(){messages.value=await maintenanceApi.messages(messageStatus.value)}
async function refresh(){loading.value=true;try{if(tab.value==='status')await loadStatus();else if(tab.value==='audit')await loadAudit();else if(tab.value==='messages')await loadMessages();else await loadEvents(lastEventFilter.value)}finally{loading.value=false}}
async function retryMessage(row){await maintenanceApi.retryMessage(row.id);ElMessage.success('消息已进入重试队列');await loadMessages()}
async function updateEvent(id,status,note){await maintenanceApi.updateEvent(id,status,note);ElMessage.success('处理状态已更新');await loadEvents(lastEventFilter.value)}
async function exportEvents(filter){const category=tab.value==='system'?'SYSTEM_ERROR':undefined;const response=await maintenanceApi.exportEvents({...filter,category});const url=URL.createObjectURL(response.data);const link=document.createElement('a');link.href=url;link.download=`维护日志-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url)}

const EventTable=defineComponent({props:{category:String,rows:Array,loading:Boolean},emits:['filter','update','export'],setup(props,{emit}){
 const status=ref(''),range=ref([]),dialog=ref(false),selected=ref(null),nextStatus=ref('PROCESSING'),note=ref('')
 const labels={SYSTEM_ERROR:'系统错误',BUSINESS_EXCEPTION:'业务异常',CLIENT_ERROR:'前端异常'};const statusLabels={OPEN:'待处理',PROCESSING:'处理中',RESOLVED:'已解决',IGNORED:'已忽略'}
 const filter=()=>{const [from,to]=range.value||[];emit('filter',{status:status.value||undefined,from,to})}
 const open=row=>{selected.value=row;nextStatus.value=row.status==='OPEN'?'PROCESSING':'RESOLVED';note.value=row.resolutionNote||'';dialog.value=true}
 const submit=()=>{emit('update',selected.value.id,nextStatus.value,note.value);dialog.value=false}
 return()=>h('div',[h('div',{class:'filters'},[h(ElSelect,{modelValue:status.value,'onUpdate:modelValue':v=>status.value=v,placeholder:'处理状态',clearable:true,style:'width:150px'},()=>Object.entries(statusLabels).map(([v,l])=>h(ElOption,{value:v,label:l}))),h(ElDatePicker,{modelValue:range.value,'onUpdate:modelValue':v=>range.value=v,type:'daterange','value-format':'YYYY-MM-DD','start-placeholder':'开始日期','end-placeholder':'结束日期'}),h(ElButton,{type:'primary',onClick:filter},()=> '查询'),h(ElButton,{onClick:()=>{const [from,to]=range.value||[];emit('export',{status:status.value||undefined,from,to})}},()=> '导出 CSV')]),h(ElTable,{data:props.rows,border:true,stripe:true,'v-loading':props.loading},()=>[h(ElTableColumn,{prop:'lastTime',label:'最近发生',minWidth:165}),h(ElTableColumn,{label:'分类',width:105},{default:({row})=>labels[row.category]||row.category}),h(ElTableColumn,{prop:'module',label:'功能',width:115}),h(ElTableColumn,{prop:'message',label:'信息',minWidth:260,'show-overflow-tooltip':true}),h(ElTableColumn,{prop:'requestPath',label:'请求路径',minWidth:190,'show-overflow-tooltip':true}),h(ElTableColumn,{prop:'operatorUsername',label:'账号',width:100}),h(ElTableColumn,{label:'次数',width:70},{default:({row})=>`${row.occurrenceCount} 次`}),h(ElTableColumn,{label:'状态',width:100},{default:({row})=>h(ElTag,{type:{OPEN:'danger',PROCESSING:'warning',RESOLVED:'success',IGNORED:'info'}[row.status]},()=>statusLabels[row.status]||row.status)}),h(ElTableColumn,{label:'操作',width:90},{default:({row})=>h(ElButton,{link:true,type:'primary',onClick:()=>open(row)},()=> '处理')})]),h(ElDialog,{modelValue:dialog.value,'onUpdate:modelValue':v=>dialog.value=v,title:'处理维护日志',width:'520px'},()=>[h('p',{class:'dialog-message'},selected.value?.message),h(ElSelect,{modelValue:nextStatus.value,'onUpdate:modelValue':v=>nextStatus.value=v,style:'width:100%;margin-bottom:14px'},()=>Object.entries(statusLabels).map(([v,l])=>h(ElOption,{value:v,label:l}))),h(ElInput,{modelValue:note.value,'onUpdate:modelValue':v=>note.value=v,type:'textarea',rows:4,maxlength:1000,'show-word-limit':true,placeholder:'填写排查结果或解决办法'}),h('div',{class:'dialog-actions'},[h(ElButton,{onClick:()=>dialog.value=false},()=> '取消'),h(ElButton,{type:'primary',disabled:['RESOLVED','IGNORED'].includes(nextStatus.value)&&!note.value.trim(),onClick:submit},()=> '保存')])])])
}})
onMounted(refresh)
</script>
<style scoped>.maintenance-page{background:#fff;padding:24px;border-radius:12px;color:#263445}.page-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px}.page-head h2{margin:0 0 7px}.page-head p{margin:0;color:#667588}.tabs :deep(.el-tabs__header){margin-bottom:22px}.health-list{border-top:1px solid #e2e8f0}.health-row{display:grid;grid-template-columns:18px 1fr auto;gap:14px;align-items:center;padding:17px 6px;border-bottom:1px solid #e2e8f0}.health-row div{display:grid;gap:4px}.health-row small{color:#6b798b}.health-row b{font-size:14px}.signal{width:10px;height:10px;border-radius:50%;background:#94a3b8}.signal.ok{background:#22a05a}.signal.error{background:#d64545}.signal.unconfigured{background:#94a3b8}.runtime{display:flex;flex-wrap:wrap;gap:24px;margin-top:18px;color:#65758a;font-size:13px}.filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px}.filters>.el-input{width:220px}.footnote{color:#728196}.dialog-message{padding:12px;background:#f5f7fa;border-radius:8px;color:#465568}.dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}@media(max-width:760px){.page-head{display:grid;gap:14px}.runtime{display:grid;gap:7px}}</style>
