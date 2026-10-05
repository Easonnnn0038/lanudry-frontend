<template>
  <div class="page">
    <h2>衣物查询</h2><p>输入完整手机号、订单号或单件衣物码，查看本店相关订单及全部衣物。页面不显示顾客姓名。</p>
    <div class="search"><el-input v-model.trim="keyword" placeholder="手机号 / 订单号 / 衣物码" clearable @keyup.enter="search" /><el-button type="primary" :disabled="keyword.length<3" @click="search">查询</el-button></div>
    <el-table :data="rows" border stripe v-loading="loading" empty-text="暂无查询结果">
      <el-table-column label="订单号" min-width="190"><template #default="{row}">
        <div class="order-cell"><span>{{ row.orderNo }}</span><OrderSourceTag :source="row.orderSource" /><el-tag v-if="['REWASH','CUSTOMER_RETURN'].includes(row.orderType)" type="warning" size="small">客返</el-tag><el-tag v-if="row.orderType==='STORE_RETURN'" type="danger" size="small">店返</el-tag><small v-if="row.sourceOrderNo">来源 {{ row.sourceOrderNo }}</small></div>
      </template></el-table-column>
      <el-table-column prop="phone" label="手机号" min-width="135" />
      <el-table-column prop="barcode" label="衣物码" min-width="140" />
      <el-table-column prop="categoryName" label="类别" min-width="120" />
      <el-table-column label="订单状态" min-width="130"><template #default="{row}">{{ statusLabel(row.orderStatus) }}</template></el-table-column>
      <el-table-column label="工厂工序" min-width="100"><template #default="{row}">{{ processLabel(row.factoryProcess) }}</template></el-table-column>
      <el-table-column prop="packageNo" label="大件码" min-width="150" />
      <el-table-column prop="sourceBatchNo" label="送厂批次" min-width="150" />
      <el-table-column prop="shelfCode" label="货架" min-width="100" />
      <el-table-column label="异常" width="75"><template #default="{row}">{{ row.errorBackFlag?'是':'—' }}</template></el-table-column>
      <el-table-column label="操作" width="250" fixed="right"><template #default="{row}">
        <el-button link type="primary" :loading="detailLoading && loadingOrderId===row.orderId" @click="openDetail(row)">条码/凭证</el-button>
        <el-button link type="primary" :loading="printLoading===row.barcode" @click="reprintLabel(row)">补打标签</el-button>
        <el-button v-if="row.itemStatus==='PICKED_UP'" link type="warning" @click="startRewash(row,'CUSTOMER_RETURN')">客返</el-button>
        <el-button v-if="['BACK_TO_STORE','NOTIFIED'].includes(row.orderStatus)" link type="danger" @click="startRewash(row,'STORE_RETURN')">店返</el-button>
      </template></el-table-column>
    </el-table>
    <ReceiptPreview v-model="detailVisible" :data="detail" read-only />
    <ReceiptPreview v-model="labelVisible" :data="labelDetail" read-only tags-only />
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, storeOperationsApi } from '@/api'
import ReceiptPreview from '@/views/components/ReceiptPreview.vue'
import OrderSourceTag from '@/components/OrderSourceTag.vue'
const keyword=ref(''),rows=ref([]),loading=ref(false)
const detail=ref(null),detailVisible=ref(false),detailLoading=ref(false),loadingOrderId=ref(null)
const labelDetail=ref(null),labelVisible=ref(false),printLoading=ref('')
const statusNames={RECEIVED:'已收衣',SENT_TO_FACTORY:'已送厂',BACK_TO_STORE:'已回店',NOTIFIED:'已通知取衣',PARTIALLY_PICKED_UP:'部分取件',PICKED_UP:'已取衣',STORE_REWORKING:'店返处理中',REWORK_COMPLETED:'返洗已完成'}
const statusLabel=status=>statusNames[status]||status||'未知'
const processNames={SORT:'分拣',WASH:'洗涤',DRY:'烘干',IRON:'熨烫',QUALITY:'质检',PACK:'打包',RETURN:'待回店发货',DONE:'已完成'}
const processLabel=process=>processNames[process]||process||'—'
async function search(){if(keyword.value.length<3)return;loading.value=true;try{rows.value=await storeOperationsApi.clothes(keyword.value)}finally{loading.value=false}}
async function openDetail(row){detailLoading.value=true;loadingOrderId.value=row.orderId;try{detail.value=await orderApi.stagingDetail(row.orderId);detailVisible.value=true}finally{detailLoading.value=false;loadingOrderId.value=null}}
async function reprintLabel(row){printLoading.value=row.barcode;try{const source=await orderApi.stagingDetail(row.orderId);const item=source.items.find(x=>x.barcode===row.barcode);if(!item)throw new Error('未找到该衣物');labelDetail.value={...source,items:[item]};labelVisible.value=true}catch(e){ElMessage.error(e.message||'标签加载失败，请重试')}finally{printLoading.value=''}}
async function startRewash(row,rewashType){
  const customerReturn=rewashType==='CUSTOMER_RETURN'
  const {value}=await ElMessageBox.prompt(`将从订单 ${row.orderNo} 原样带入衣物，进入收衣页后可删除不需要返洗的衣物。`,customerReturn?'发起客返':'发起店返',{inputType:'textarea',inputPlaceholder:customerReturn?'请填写顾客反馈的问题':'请填写店员发现的洗涤问题',inputValidator:v=>!!v?.trim()||'请填写返洗原因',confirmButtonText:'进入返洗录入'})
  const source=await orderApi.stagingDetail(row.orderId)
  localStorage.setItem('laundry_rewash_pending_v1',JSON.stringify({
    sourceOrderId:source.id,sourceOrderNo:source.orderNo,reason:value.trim(),rewashType,
    customer:{name:source.customerName,phone:source.customerPhone,address:source.customerAddress||''},
    items:source.items.map(item=>({sourceOrderItemId:item.id,categoryId:item.categoryId,categoryGroup:item.categoryGroup,categoryName:item.categoryName,customName:item.categoryGroup==='CUSTOM'?item.categoryName:null,quantity:1,unitPrice:0,catalogPrice:0,memberPrice:0,subtotal:0,color:item.color||'',brand:item.brand||'',size:item.size||'',defect:item.defect||'',special:item.special||''}))
  }))
  ElMessage.success('已带入原订单，请保留需要返洗的衣物')
  window.dispatchEvent(new CustomEvent('navigate-menu',{detail:'store-receive'}))
}
</script>
<style scoped>.page{background:#fff;padding:24px;border-radius:12px}.page h2{margin:0 0 6px}.page p{color:#64748b}.search{display:flex;gap:10px;max-width:550px;margin:20px 0}.order-cell{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.order-cell small{display:block;width:100%;color:#64748b}</style>
