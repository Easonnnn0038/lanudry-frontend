<template>
  <div class="page-shell">
    <header><div><h2>补收附件</h2><p>把后来送到门店的帽子、毛领、腰带等关联到原衣物，并生成独立衣物码。</p></div><span class="rule">补收费用暂记待收</span></header>
    <section class="search-row"><el-input v-model.trim="keyword" placeholder="输入完整订单号或手机号" clearable @keyup.enter="search"/><el-button type="primary" :disabled="keyword.length<4" @click="search">查找订单</el-button></section>
    <el-table v-if="orders.length" :data="orders" border stripe class="orders">
      <el-table-column prop="orderNo" label="订单号" min-width="170"/><el-table-column prop="phone" label="手机号" min-width="140"/>
      <el-table-column label="状态" width="120"><template #default="{row}">{{ statusName(row.status) }}</template></el-table-column>
      <el-table-column prop="totalCount" label="现有件数" width="100"/><el-table-column label="操作" width="100"><template #default="{row}"><el-button link type="primary" @click="open(row.orderNo)">选择</el-button></template></el-table-column>
    </el-table>
    <section v-if="detail" class="workspace">
      <div class="order-title"><div><h3>订单 {{ detail.order_no }}</h3><span>{{ detail.customer_phone }} · {{ statusName(detail.status) }}</span></div><el-button @click="open(detail.order_no)">刷新</el-button></div>
      <div class="columns">
        <el-form label-position="top" class="form-panel">
          <h4>登记附件</h4>
          <el-form-item label="关联原衣物"><el-select v-model="form.parentItemId" placeholder="请选择附件属于哪件衣物"><el-option v-for="item in garments" :key="item.id" :value="item.id" :label="`${item.categoryName} · ${item.barcode}`"/></el-select></el-form-item>
          <el-form-item label="附件名称"><el-input v-model.trim="form.attachmentName" placeholder="例如：毛领、帽子、腰带" maxlength="100"/></el-form-item>
          <el-form-item label="补收金额"><el-input-number v-model="form.feeAmount" :min="0" :precision="2" :step="1"/><small>暂不计入订单实收，待支付模块完成后处理。</small></el-form-item>
          <el-form-item label="备注"><el-input v-model.trim="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="外观、颜色、瑕疵或送厂要求"/></el-form-item>
          <el-button type="primary" size="large" :disabled="!form.parentItemId||!form.attachmentName" :loading="busy" @click="create">生成附件码</el-button>
        </el-form>
        <div class="history-panel"><h4>已补收附件</h4><el-empty v-if="!detail.supplements?.length" description="该订单暂无补收附件"/>
          <article v-for="item in detail.supplements" :key="item.id" class="record">
            <div><strong>{{ item.attachmentName }}</strong><span>{{ dispatchName(item.dispatchStatus) }} · 待收 ¥{{ money(item.feeAmount) }}</span><small v-if="item.packageNo">大件 {{ item.packageNo }}</small></div>
            <el-button v-if="item.dispatchStatus==='PENDING'" type="primary" plain @click="dispatch(item)">创建批次送厂</el-button>
          </article>
        </div>
      </div>
    </section>
    <el-dialog v-model="labelVisible" title="附件标签已生成" width="460px"><div class="label-preview"><b>{{ created.attachmentName }}</b><img v-if="created.image" :src="created.image" alt="附件衣物条码"/><strong>{{ created.barcode }}</strong><span>订单 {{ created.orderNo }}</span></div><template #footer><el-button @click="labelVisible=false">关闭</el-button><el-button type="primary" @click="printLabel">打印标签</el-button></template></el-dialog>
  </div>
</template>
<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, supplementApi } from '@/api'
const keyword=ref(''),orders=ref([]),detail=ref(null),busy=ref(false),labelVisible=ref(false)
const form=reactive({parentItemId:null,attachmentName:'',feeAmount:0,remark:''}),created=reactive({attachmentName:'',barcode:'',orderNo:'',image:''})
const garments=computed(()=>detail.value?.items?.filter(i=>i.itemKind==='GARMENT')||[])
const statusName=s=>({RECEIVED:'待送厂',SENT_TO_FACTORY:'原单已送厂'})[s]||s
const dispatchName=s=>({MERGED:'已并入原单',PENDING:'待单独送厂',DISPATCHED:'已送厂'})[s]||s
const money=v=>Number(v||0).toFixed(2)
async function search(){orders.value=await supplementApi.searchOrders(keyword.value);detail.value=null}
async function open(no){detail.value=await supplementApi.detail(no);form.parentItemId=null}
async function create(){busy.value=true;try{const result=await supplementApi.create({orderNo:detail.value.order_no,...form});Object.assign(created,{attachmentName:form.attachmentName,barcode:result.barcode,orderNo:detail.value.order_no,image:await orderApi.barcode(result.barcode,360,80)});labelVisible.value=true;form.parentItemId=null;form.attachmentName='';form.feeAmount=0;form.remark='';await open(detail.value.order_no);ElMessage.success('附件已补录')}finally{busy.value=false}}
async function dispatch(item){await ElMessageBox.confirm(`确认将附件“${item.attachmentName}”创建新大件并随下一批送厂？`,'补收附件送厂',{type:'warning'});const result=await supplementApi.dispatch(item.id);ElMessage.success(`已创建送厂批次 ${result.batchNo}`);await open(detail.value.order_no)}
function printLabel(){const w=window.open('','_blank','width=520,height=360');w.document.write(`<html><body style="font-family:sans-serif;text-align:center;padding:20px"><h2>${created.attachmentName}</h2><img src="${created.image}" style="width:360px"><h3>${created.barcode}</h3><p>订单 ${created.orderNo}</p><script>onload=()=>print()<\/script></body></html>`);w.document.close()}
</script>
<style scoped>.page-shell{background:#fff;padding:24px;border-radius:12px;color:#263445}header,.order-title{display:flex;justify-content:space-between;align-items:flex-start}h2{margin:0 0 7px}header p,.order-title span{margin:0;color:#667588}.rule{padding:7px 11px;border:1px solid #d7e1eb;border-radius:8px;color:#526579}.search-row{display:flex;gap:12px;max-width:580px;margin:24px 0}.orders{margin-bottom:22px}.workspace{border-top:1px solid #e2e8f0;padding-top:22px}.order-title h3{margin:0 0 5px}.columns{display:grid;grid-template-columns:minmax(320px,430px) minmax(400px,1fr);gap:28px;margin-top:20px}.form-panel{padding:20px;background:#f7f9fb;border-radius:12px}.form-panel h4,.history-panel h4{margin:0 0 18px;font-size:18px}.form-panel .el-select{width:100%}.form-panel small{display:block;margin:8px 0 0 10px;color:#738195}.record{display:flex;justify-content:space-between;align-items:center;padding:15px 0;border-bottom:1px solid #e5eaf0}.record div{display:grid;gap:5px}.record span,.record small{color:#68778a}.label-preview{display:grid;justify-items:center;gap:10px;padding:20px;border:1px solid #dce4eb;border-radius:10px}.label-preview img{width:360px;max-width:100%}@media(max-width:900px){.columns{grid-template-columns:1fr}header{gap:16px}}</style>
