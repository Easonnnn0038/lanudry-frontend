<template>
  <div class="page">
    <h2>订单与衣物查询</h2>
    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="全部订单" name="orders" />
      <el-tab-pane label="衣物查询" name="clothes" />
    </el-tabs>
    <template v-if="activeTab === 'orders'">
      <div class="filters">
        <el-input v-model.trim="orderKeyword" placeholder="订单号 / 手机号" clearable @keyup.enter="searchOrders" />
        <el-select v-model="orderStatus" placeholder="全部状态" clearable>
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="orderSource" placeholder="全部来源" clearable>
          <el-option label="线下下单" value="STORE" />
          <el-option label="小程序下单" value="MINIAPP" />
        </el-select>
        <el-date-picker v-model="orderDates" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
        <el-button type="primary" @click="searchOrders">查询</el-button>
        <el-button @click="resetOrders">重置</el-button>
      </div>
      <el-table :data="orders" border stripe v-loading="ordersLoading" empty-text="暂无订单">
        <el-table-column label="订单号" min-width="185"><template #default="{row}">{{ row.orderNo }}</template></el-table-column>
        <el-table-column label="下单来源" min-width="115"><template #default="{row}"><OrderSourceTag :source="row.orderSource" /></template></el-table-column>
        <el-table-column label="收衣时间" min-width="155"><template #default="{row}">{{ formatTime(row.receiveTime) }}</template></el-table-column>
        <el-table-column prop="customerName" label="顾客" min-width="95" />
        <el-table-column prop="customerPhone" label="手机号" min-width="125" />
        <el-table-column prop="totalCount" label="衣物件数" min-width="95" />
        <el-table-column label="状态" min-width="180"><template #default="{row}">
          <div class="status-cell">
            <el-tag :type="statusType(row.status)" effect="light" round>{{ row.statusLabel }}</el-tag>
            <el-tag v-if="returnLabel(row.orderType, row.status)" type="danger" effect="light" round>{{ returnLabel(row.orderType, row.status) }}</el-tag>
          </div>
        </template></el-table-column>
        <el-table-column label="应收 / 实收" min-width="150"><template #default="{row}">¥{{ money(row.totalReceivable) }} / ¥{{ money(row.totalPaid) }}</template></el-table-column>
        <el-table-column label="操作" width="100" fixed="right"><template #default="{row}">
          <el-button link type="primary" :loading="detailLoading && loadingOrderId===row.id" @click="openDetail(row)">查看详情</el-button>
        </template></el-table-column>
      </el-table>
      <div class="pagination"><el-pagination v-model:current-page="orderPage" :page-size="20" :total="orderTotal" layout="total, prev, pager, next" @current-change="loadOrders" /></div>
    </template>
    <template v-else>
    <p>输入完整手机号、订单号或单件衣物码，查看本店相关订单及全部衣物。页面不显示顾客姓名。</p>
    <div class="search"><el-input v-model.trim="keyword" placeholder="手机号 / 订单号 / 衣物码" clearable @keyup.enter="search" /><el-button type="primary" :disabled="keyword.length<3" @click="search">查询</el-button></div>
    <el-table :data="rows" border stripe v-loading="loading" empty-text="暂无查询结果">
      <el-table-column label="订单号" min-width="190"><template #default="{row}">
        <div class="order-cell"><span>{{ row.orderNo }}</span><OrderSourceTag :source="row.orderSource" /><small v-if="row.sourceOrderNo">来源 {{ row.sourceOrderNo }}</small></div>
      </template></el-table-column>
      <el-table-column prop="phone" label="手机号" min-width="135" />
      <el-table-column prop="barcode" label="衣物码" min-width="140" />
      <el-table-column prop="categoryName" label="类别" min-width="120" />
      <el-table-column label="订单状态" min-width="180"><template #default="{row}">
        <div class="status-cell">
          <el-tag :type="statusType(row.orderStatus)" effect="light" round>{{ statusLabel(row.orderStatus) }}</el-tag>
          <el-tag v-if="returnLabel(row.orderType, row.orderStatus)" type="danger" effect="light" round>{{ returnLabel(row.orderType, row.orderStatus) }}</el-tag>
        </div>
      </template></el-table-column>
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
    </template>
    <ReceiptPreview v-model="detailVisible" :data="detail" read-only />
    <ReceiptPreview v-model="labelVisible" :data="labelDetail" read-only tags-only />
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, storeOperationsApi } from '@/api'
import ReceiptPreview from '@/views/components/ReceiptPreview.vue'
import OrderSourceTag from '@/components/OrderSourceTag.vue'
const props = defineProps({ initialTab: { type: String, default: 'orders' } })
const activeTab = ref(props.initialTab)
const orderKeyword = ref(''), orderStatus = ref(''), orderSource = ref(''), orderDates = ref([])
const orders = ref([]), ordersLoading = ref(false), orderPage = ref(1), orderTotal = ref(0), ordersLoaded = ref(false)
const statusOptions = [
  { value: 'RECEIVED', label: '待送厂' }, { value: 'SENT_TO_FACTORY', label: '运输中' },
  { value: 'BACK_TO_STORE', label: '已回店' }, { value: 'NOTIFIED', label: '已通知取衣' },
  { value: 'PARTIALLY_PICKED_UP', label: '部分取件' }, { value: 'PICKED_UP', label: '已取衣' },
  { value: 'STORE_REWORKING', label: '店返处理中' }, { value: 'REWORK_COMPLETED', label: '返洗已完成' },
  { value: 'CANCELLED', label: '已取消' }
]
const money = value => Number(value || 0).toFixed(2)
const formatTime = value => value ? String(value).replace('T', ' ').slice(0, 16) : '—'
async function loadOrders() {
  ordersLoading.value = true
  try {
    const data = await orderApi.list({
      page: orderPage.value, size: 20, keyword: orderKeyword.value || undefined,
      status: orderStatus.value || undefined, source: orderSource.value || undefined,
      from: orderDates.value?.[0], to: orderDates.value?.[1]
    })
    orders.value = data.records || []
    orderTotal.value = data.total || 0
    ordersLoaded.value = true
  } catch (e) {
    orders.value = []
    orderTotal.value = 0
  } finally {
    ordersLoading.value = false
  }
}
function searchOrders() { orderPage.value = 1; loadOrders() }
function resetOrders() { orderKeyword.value = ''; orderStatus.value = ''; orderSource.value = ''; orderDates.value = []; searchOrders() }
function onTabChange(tab) { if (tab === 'orders' && !ordersLoaded.value) loadOrders() }
onMounted(() => { if (activeTab.value === 'orders') loadOrders() })
const keyword=ref(''),rows=ref([]),loading=ref(false)
const detail=ref(null),detailVisible=ref(false),detailLoading=ref(false),loadingOrderId=ref(null)
const labelDetail=ref(null),labelVisible=ref(false),printLoading=ref('')
const statusNames={RECEIVED:'已收衣',SENT_TO_FACTORY:'已送厂',BACK_TO_STORE:'已回店',NOTIFIED:'已通知取衣',PARTIALLY_PICKED_UP:'部分取件',PICKED_UP:'已取衣',STORE_REWORKING:'店返处理中',REWORK_COMPLETED:'返洗已完成',CANCELLED:'已取消'}
const statusLabel=status=>statusNames[status]||status||'未知'
const statusType=status=>status==='PICKED_UP'?'success':status==='STORE_REWORKING'?'danger':'warning'
const returnLabel=(orderType,status)=>status==='STORE_REWORKING'?'':orderType==='STORE_RETURN'?'店返':['REWASH','CUSTOMER_RETURN'].includes(orderType)?'客返':''
const processNames={SORT:'分拣',WASH:'洗涤',DRY:'烘干',IRON:'熨烫',QUALITY:'质检',PACK:'打包',RETURN:'待回店发货',DONE:'已完成'}
const processLabel=process=>processNames[process]||process||'—'
async function search(){if(keyword.value.length<3)return;loading.value=true;try{rows.value=await storeOperationsApi.clothes(keyword.value)}finally{loading.value=false}}
async function openDetail(row){detailLoading.value=true;loadingOrderId.value=row.orderId||row.id;try{detail.value=await orderApi.stagingDetail(loadingOrderId.value);detailVisible.value=true}finally{detailLoading.value=false;loadingOrderId.value=null}}
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
<style scoped>.page{background:#fff;padding:24px;border-radius:12px}.page h2{margin:0 0 18px}.page p{color:#64748b}.search{display:flex;gap:10px;max-width:550px;margin:20px 0}.filters{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:18px 0}.filters .el-input{width:200px}.filters .el-select{width:145px}.filters .el-date-editor{width:280px}.pagination{display:flex;justify-content:flex-end;margin-top:20px}.order-cell,.status-cell{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.order-cell small{display:block;width:100%;color:#64748b}</style>
