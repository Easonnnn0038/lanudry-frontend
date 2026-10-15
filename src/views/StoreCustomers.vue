<template>
  <section class="customers-page">
    <header class="page-header">
      <div>
        <h2>客户档案</h2>
        <p>查看本门店客户的订单、会员信息和联系记录。小程序预约转成正式订单后会出现在这里。</p>
      </div>
    </header>

    <div class="search-bar">
      <el-input v-model.trim="keyword" clearable placeholder="输入客户姓名或完整手机号" aria-label="搜索客户" @keyup.enter="searchCustomers" />
      <el-button type="primary" :loading="loading" @click="searchCustomers">查询</el-button>
      <el-button v-if="keyword" @click="resetSearch">重置</el-button>
    </div>

    <el-table :data="customers" v-loading="loading" stripe row-key="id" empty-text="暂无客户记录" @row-click="openCustomer">
      <el-table-column prop="name" label="客户" min-width="130">
        <template #default="{ row }">{{ row.name || '未填写姓名' }}</template>
      </el-table-column>
      <el-table-column prop="maskedPhone" label="手机号" min-width="145" />
      <el-table-column label="会员" min-width="140">
        <template #default="{ row }"><el-tag v-if="row.memberType" type="success" effect="plain">{{ row.memberType }}</el-tag><span v-else class="muted">非会员</span></template>
      </el-table-column>
      <el-table-column label="进行中订单" min-width="120">
        <template #default="{ row }"><el-tag v-if="Number(row.activeOrders)" type="warning" effect="plain">{{ row.activeOrders }} 单</el-tag><span v-else class="muted">无</span></template>
      </el-table-column>
      <el-table-column label="累计洗护" min-width="130">
        <template #default="{ row }">{{ row.totalCount || 0 }} 件</template>
      </el-table-column>
      <el-table-column label="最近收衣" min-width="175">
        <template #default="{ row }">{{ dateTime(row.latestOrderAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }"><el-button link type="primary" @click.stop="openCustomer(row)">查看档案</el-button></template>
      </el-table-column>
    </el-table>
    <div class="pagination"><el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="total, prev, pager, next" @current-change="loadCustomers" /></div>

    <el-drawer v-model="visible" :title="profile?.customer?.name || '客户档案'" size="min(760px, 100%)" @closed="clearDetail">
      <div v-loading="detailLoading" class="profile-body">
        <template v-if="profile">
          <div class="identity">
            <div>
              <span class="field-label">手机号</span>
              <div class="phone-line">{{ profile.customer.phone }} <el-button link type="primary" @click="copyPhone">复制</el-button></div>
            </div>
            <div><span class="field-label">会员</span><strong>{{ profile.customer.memberType || '非会员' }}</strong></div>
            <div><span class="field-label">累计洗护</span><strong>{{ profile.customer.totalCount || 0 }} 件</strong></div>
          </div>
          <div v-if="profile.customer.memberType" class="member-line">会员卡 {{ profile.customer.cardNo }} · 余额 ¥{{ money(profile.customer.memberBalance) }}</div>
          <div class="basic-info"><span>地址：{{ profile.customer.address || '未登记' }}</span><span>备注：{{ profile.customer.remark || '无' }}</span></div>

          <h3>订单与衣物 <small>最近 50 单</small></h3>
          <el-table :data="profile.orders" size="small" stripe empty-text="暂无正式订单">
            <el-table-column label="订单号" min-width="170"><template #default="{ row }"><el-button link type="primary" @click="openOrder(row)">{{ row.orderNo }}</el-button></template></el-table-column>
            <el-table-column label="来源" width="100"><template #default="{ row }">{{ row.orderSource === 'MINIAPP' ? '小程序' : '门店' }}</template></el-table-column>
            <el-table-column label="状态" min-width="120"><template #default="{ row }"><el-tag :type="orderStatus(row.status).type" effect="plain">{{ orderStatus(row.status).label }}</el-tag></template></el-table-column>
            <el-table-column prop="itemCount" label="衣物" width="75" />
            <el-table-column label="收衣时间" min-width="145"><template #default="{ row }">{{ dateTime(row.receiveTime) }}</template></el-table-column>
          </el-table>
          <p class="section-hint">预约单尚未转正式订单时，请到「上门取衣单」查看。这里仅展示已明确关联到该客户的订单。</p>

          <h3>联系记录</h3>
          <div class="contact-form">
            <el-select v-model="contact.channel" aria-label="联系渠道" placeholder="联系渠道"><el-option label="电话" value="PHONE" /><el-option label="微信" value="WECHAT" /><el-option label="到店沟通" value="IN_PERSON" /></el-select>
            <el-select v-model="contact.result" aria-label="联系结果" placeholder="联系结果"><el-option label="已联系" value="REACHED" /><el-option label="未接通" value="NO_ANSWER" /><el-option label="待跟进" value="FOLLOW_UP" /></el-select>
            <el-input v-model.trim="contact.note" maxlength="500" show-word-limit placeholder="沟通内容或后续事项" />
            <el-button type="primary" :loading="saving" @click="saveContact">记录联系</el-button>
          </div>
          <el-empty v-if="!profile.contacts.length" description="还没有联系记录" :image-size="65" />
          <div v-for="(item, index) in profile.contacts" :key="index" class="contact-row">
            <div><strong>{{ channelLabel(item.channel) }} · {{ resultLabel(item.result) }}</strong><span>{{ dateTime(item.createTime) }} · {{ item.operatorName }}</span></div>
            <p v-if="item.note">{{ item.note }}</p>
          </div>
        </template>
      </div>
    </el-drawer>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { customerApi } from '@/api'

const keyword = ref('')
const page = ref(1)
const total = ref(0)
const customers = ref([])
const loading = ref(false)
const visible = ref(false)
const detailLoading = ref(false)
const profile = ref(null)
const saving = ref(false)
const contact = reactive({ channel: 'PHONE', result: 'REACHED', note: '' })
const money = value => Number(value || 0).toFixed(2)
const dateTime = value => value ? String(value).replace('T', ' ').slice(0, 16) : '—'
const channelLabel = value => ({ PHONE: '电话', WECHAT: '微信', IN_PERSON: '到店沟通' })[value] || value
const resultLabel = value => ({ REACHED: '已联系', NO_ANSWER: '未接通', FOLLOW_UP: '待跟进' })[value] || value
const orderStatus = value => ({
  RECEIVED: { label: '已收衣', type: 'info' }, SENT_TO_FACTORY: { label: '已送厂', type: 'warning' },
  BACK_TO_STORE: { label: '已回店', type: 'warning' }, NOTIFIED: { label: '待取衣', type: 'warning' },
  PARTIALLY_PICKED_UP: { label: '部分取衣', type: 'warning' }, PICKED_UP: { label: '已取衣', type: 'success' },
  READY_TO_SHIP: { label: '待寄回', type: 'warning' }, SHIPPING: { label: '快递运输中', type: 'warning' },
  DELIVERED: { label: '已签收', type: 'success' }, CANCELLED: { label: '已取消', type: 'info' }
})[value] || { label: value || '未知', type: 'info' }

async function loadCustomers() {
  loading.value = true
  try {
    const data = await customerApi.list({ keyword: keyword.value || undefined, page: page.value })
    customers.value = data.records || []
    total.value = data.total || 0
  } catch {
    customers.value = []
    total.value = 0
  } finally { loading.value = false }
}
function searchCustomers() { page.value = 1; loadCustomers() }
function resetSearch() { keyword.value = ''; searchCustomers() }
async function openCustomer(row) {
  visible.value = true
  detailLoading.value = true
  profile.value = null
  try { profile.value = await customerApi.detail(row.id) }
  catch { visible.value = false }
  finally { detailLoading.value = false }
}
function clearDetail() { profile.value = null; contact.note = ''; contact.channel = 'PHONE'; contact.result = 'REACHED' }
function openOrder(row) { visible.value = false; window.dispatchEvent(new CustomEvent('navigate-menu', { detail: { menu: 'store-query', tab: 'orders', keyword: row.orderNo } })) }
async function copyPhone() {
  try { await navigator.clipboard.writeText(profile.value.customer.phone); ElMessage.success('手机号已复制') }
  catch { ElMessage.warning('复制失败，请手动选择手机号') }
}
async function saveContact() {
  if (!profile.value) return
  if (contact.result !== 'NO_ANSWER' && !contact.note) return ElMessage.warning('请填写沟通内容或后续事项')
  saving.value = true
  try {
    profile.value = await customerApi.addContact(profile.value.customer.id, { ...contact })
    contact.note = ''
    ElMessage.success('联系记录已保存')
  } finally { saving.value = false }
}
onMounted(loadCustomers)
</script>

<style scoped>
.customers-page{max-width:1300px;margin:0 auto;color:#1e293b}.page-header{margin-bottom:24px}.page-header h2{margin:0 0 8px;font-size:24px}.page-header p{margin:0;color:#64748b;font-size:14px}.search-bar{display:flex;gap:10px;max-width:610px;margin-bottom:20px}.search-bar .el-input{max-width:390px}.pagination{display:flex;justify-content:flex-end;margin-top:18px}.muted,.field-label,.section-hint{color:#64748b}.profile-body{min-height:180px}.identity{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:16px;padding:16px 0;border-bottom:1px solid #e5e7eb}.identity>div{display:flex;flex-direction:column;gap:6px}.field-label{font-size:12px}.identity strong,.phone-line{font-size:16px}.member-line{margin-top:14px;color:#047857}.basic-info{display:grid;gap:8px;margin:18px 0 28px;color:#475569;font-size:14px}.profile-body h3{margin:28px 0 14px;font-size:17px}.profile-body h3 small{font-weight:400;color:#64748b;font-size:12px}.section-hint{font-size:12px;line-height:1.5}.contact-form{display:grid;grid-template-columns:130px 130px minmax(160px,1fr) auto;gap:8px;align-items:start}.contact-row{border-top:1px solid #e5e7eb;padding:12px 0}.contact-row>div{display:flex;justify-content:space-between;gap:12px;font-size:13px}.contact-row span{color:#64748b}.contact-row p{margin:8px 0 0;color:#475569;white-space:pre-wrap;font-size:13px}@media(max-width:700px){.search-bar{flex-wrap:wrap}.identity{grid-template-columns:1fr 1fr}.contact-form{grid-template-columns:1fr 1fr}.contact-form .el-input{grid-column:1/-1}.contact-row>div{flex-direction:column;gap:4px}}
</style>
