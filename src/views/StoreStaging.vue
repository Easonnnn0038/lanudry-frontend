<template>
  <div class="staging-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">门店暂存</h2>
      <p class="page-desc">当前存放在门店内的衣物列表，方便店员快速定位货架并完成送厂或回店操作。</p>
    </div>

    <!-- 搜索筛选 -->
    <div class="filter-card">
      <el-form :inline="true" :model="filter" size="default" @submit.prevent="onSearch">
        <el-form-item label="暂存状态">
          <el-select v-model="filter.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="待送厂" value="RECEIVED" />
            <el-option label="运输中" value="SENT_TO_FACTORY" />
            <el-option label="已回店" value="BACK_TO_STORE" />
          </el-select>
        </el-form-item>
        <el-form-item label="货架位置">
          <el-input v-model="filter.shelfCode" placeholder="输入货架位置如 A-01" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 列表 -->
    <div class="list-card">
      <el-table :data="list" size="default" border stripe v-loading="loading" class="staging-table">
        <el-table-column label="收衣时间" prop="receiveTime" width="160">
          <template #default="{ row }">
            {{ formatTime(row.receiveTime) }}
          </template>
        </el-table-column>
        <el-table-column label="下单人信息" min-width="150">
          <template #default="{ row }">
            <div class="customer-info">
              <b>{{ row.customerName }}</b>
              <span class="phone">{{ row.customerPhone }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="暂存状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="light">{{ row.statusLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所在门店" prop="storeName" width="120" align="center" />
        <el-table-column label="货架位置" min-width="180">
          <template #default="{ row }">
            <div v-if="row.shelfCodes && row.shelfCodes.length" class="shelf-codes">
              <el-tag v-for="(sc, i) in row.shelfCodes" :key="i" size="small" type="warning" effect="plain" class="shelf-tag">{{ sc }}</el-tag>
            </div>
            <span v-else class="no-shelf">未上架</span>
          </template>
        </el-table-column>
        <el-table-column label="件数" prop="totalCount" width="70" align="center" />
        <el-table-column label="瑕疵" width="70" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.hasDefectPhotos" class="defect-icon" color="#f56c6c" :size="18"><Warning /></el-icon>
            <span v-else class="no-defect">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`暂存详情 - ${detail?.orderNo || ''}`" width="900px" :close-on-click-modal="false" class="detail-dialog">
      <div v-if="detail" class="detail-content">
        <!-- 客户信息 -->
        <div class="detail-section">
          <h4 class="section-title">客户信息</h4>
          <el-descriptions :column="3" border size="default">
            <el-descriptions-item label="客户姓名">{{ detail.customerName }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detail.customerPhone }}</el-descriptions-item>
            <el-descriptions-item label="收衣门店">{{ detail.storeName }}</el-descriptions-item>
            <el-descriptions-item label="收衣时间">{{ formatTime(detail.receiveTime) }}</el-descriptions-item>
            <el-descriptions-item label="订单状态">
              <el-tag :type="statusTagType(detail.status)" effect="light">{{ detail.statusLabel }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="操作员">{{ detail.operatorName }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 费用信息 -->
        <div class="detail-section">
          <h4 class="section-title">费用信息</h4>
          <el-descriptions :column="4" border size="default">
            <el-descriptions-item label="原价合计">¥{{ fmt(detail.totalAmount) }}</el-descriptions-item>
            <el-descriptions-item label="折扣率">{{ detail.discountRate }} 折</el-descriptions-item>
            <el-descriptions-item label="优惠金额">¥{{ fmt(detail.discountAmount) }}</el-descriptions-item>
            <el-descriptions-item label="折后金额">¥{{ fmt(detail.actualAmount) }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.urgentFlag === 1" label="加急加价">
              <span style="color: #f56c6c">+¥{{ fmt(detail.urgentSurcharge) }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.newCardFlag === 1" :span="2" label="办卡充值">
              <span style="color: #e6a23c; font-weight: 600">¥{{ fmt(detail.newCardAmount) }}</span>
              <span v-if="detail.newCardTypeName" class="card-type-tag">({{ detail.newCardTypeName }})</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.rechargeFlag === 1" :span="2" label="会员卡充值">
              <span style="color: #e6a23c; font-weight: 600">¥{{ fmt(detail.rechargeAmount) }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="应收合计">
              <b class="highlight-price">¥{{ fmt(detail.totalReceivable) }}</b>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 支付信息 -->
        <div v-if="detail.cardDeduct > 0 || detail.extraPayment > 0 || detail.newCardFlag === 1 || detail.rechargeFlag === 1" class="detail-section">
          <h4 class="section-title">支付信息</h4>
          <el-descriptions :column="3" border size="default">
            <el-descriptions-item v-if="detail.memberCardNo" label="使用会员卡">{{ detail.memberCardNo }}</el-descriptions-item>
            <el-descriptions-item v-if="detail.cardDeduct > 0" label="卡扣金额">
              <span style="color: #67c23a">-¥{{ fmt(detail.cardDeduct) }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.extraPayment > 0" label="补差金额">
              <span style="color: #f56c6c">¥{{ fmt(detail.extraPayment) }}</span>
            </el-descriptions-item>
            <el-descriptions-item v-if="detail.extraMethod" label="补差方式">{{ methodLabel(detail.extraMethod) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 衣物明细 -->
        <div class="detail-section">
          <h4 class="section-title">
            衣物明细
            <span class="count-badge">共 {{ detail.items?.length || 0 }} 件</span>
          </h4>
          <el-table :data="detail.items" size="default" border stripe class="items-table">
            <el-table-column label="#" type="index" width="50" align="center" />
            <el-table-column label="条码" width="160">
              <template #default="{ row }">
                <span class="barcode">{{ row.barcode }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类别" width="140" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{ row.categoryName }}</span>
              </template>
            </el-table-column>
            <el-table-column label="品牌" prop="brand" width="90" />
            <el-table-column label="颜色" prop="color" width="80" />
            <el-table-column label="尺码" prop="size" width="70" align="center" />
            <el-table-column label="数量" prop="quantity" width="60" align="center" />
            <el-table-column label="货架号" width="110">
              <template #default="{ row }">
                <el-tag v-if="row.shelfCode" size="small" type="warning" effect="plain">{{ row.shelfCode }}</el-tag>
                <span v-else class="no-shelf">-</span>
              </template>
            </el-table-column>
            <el-table-column label="瑕疵" prop="defect" width="120" show-overflow-tooltip />
            <el-table-column label="特殊处理" prop="special" width="110" show-overflow-tooltip />
            <el-table-column label="瑕疵照片" min-width="240">
              <template #default="{ row }">
                <div v-if="row.defectPhotos && row.defectPhotos.length" class="photo-list">
                  <div v-for="(photo, i) in row.defectPhotos" :key="i" class="photo-with-tag">
                    <el-image
                      :src="photoUrl(photo)"
                      :preview-src-list="row.defectPhotos.map(p => photoUrl(p))"
                      :initial-index="i"
                      fit="cover"
                      class="thumb"
                    />
                    <!-- 瑕疵类型标签 -->
                    <div v-if="photo.defectType" class="photo-defect-types">
                      <el-tag
                        v-for="t in (photo.defectType || '').split(',').filter(Boolean)"
                        :key="t"
                        size="small"
                        type="danger"
                        effect="dark"
                      >{{ t }}</el-tag>
                    </div>
                    <div v-else class="photo-defect-types empty">
                      <span class="no-type">未分类</span>
                    </div>
                    <div v-if="photo.defectRemark" class="photo-defect-remark">{{ photo.defectRemark }}</div>
                  </div>
                </div>
                <span v-else class="no-photo">无照片</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 订单备注 -->
        <div v-if="detail.remark" class="detail-section">
          <h4 class="section-title">订单备注</h4>
          <div class="remark-box">{{ detail.remark }}</div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Search, Refresh, View, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api/index'
import { photoUrl } from '@/utils'

// ============= 数据 =============
const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const filter = reactive({
  status: '',
  shelfCode: ''
})

// 详情弹窗
const detailVisible = ref(false)
const detail = ref(null)

// ============= 方法 =============
async function loadData() {
  loading.value = true
  try {
    const params = {
      status: filter.status || undefined,
      shelfCode: filter.shelfCode || undefined
    }
    const data = await orderApi.stagingList(params)
    list.value = data || []
    total.value = list.value.length

    // 前端分页
    const start = (page.value - 1) * pageSize.value
    const end = start + pageSize.value
    list.value = (data || []).slice(start, end)
    total.value = data ? data.length : 0
  } catch (e) {
    ElMessage.error('加载暂存列表失败')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  loadData()
}

function onReset() {
  filter.status = ''
  filter.shelfCode = ''
  onSearch()
}

async function showDetail(row) {
  try {
    detail.value = null
    detailVisible.value = true
    const data = await orderApi.stagingDetail(row.id)
    detail.value = data
  } catch (e) {
    ElMessage.error('加载详情失败')
    detailVisible.value = false
  }
}

function statusTagType(status) {
  const map = {
    RECEIVED: 'info',
    SENT_TO_FACTORY: 'warning',
    BACK_TO_STORE: 'success',
    NOTIFIED: 'warning',
    PICKED_UP: 'success',
    CANCELLED: 'danger'
  }
  return map[status] || 'info'
}

function formatTime(t) {
  if (!t) return ''
  // 处理后端返回的时间格式
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fmt(v) {
  if (v == null) return '0.00'
  return Number(v).toFixed(2)
}

function methodLabel(code) {
  const map = { CASH: '现金', WECHAT: '微信', ALIPAY: '支付宝', MEMBER_CARD: '会员卡', MIXED: '组合支付' }
  return map[code] || code || '-'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.staging-page {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px;
}
.page-desc {
  color: #909399;
  margin: 0;
  font-size: 14px;
}

.filter-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.filter-card .el-form-item {
  margin-bottom: 0;
}

.list-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.staging-table {
  width: 100%;
}

.customer-info {
  line-height: 1.5;
}
.customer-info b {
  display: block;
  font-size: 14px;
  color: #303133;
}
.customer-info .phone {
  font-size: 12px;
  color: #909399;
}

.shelf-codes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.shelf-tag {
  font-size: 12px;
}
.no-shelf {
  color: #c0c4cc;
  font-size: 12px;
}
.no-defect {
  color: #c0c4cc;
}
.no-photo {
  color: #c0c4cc;
  font-size: 12px;
}

.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* 详情弹窗样式 */
.detail-dialog :deep(.el-dialog__body) {
  padding: 10px 20px 20px;
  max-height: 70vh;
  overflow-y: auto;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-section {
  background: #f9f9fb;
  border-radius: 8px;
  padding: 12px 16px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 1px 8px;
}

.highlight-price {
  color: #f56c6c;
  font-size: 16px;
}

.items-table {
  width: 100%;
}

.photo-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.photo-with-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 70px;
}

.thumb {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
}

.photo-defect-types {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
}
.photo-defect-types :deep(.el-tag) {
  font-size: 10px;
  padding: 0 4px;
  height: 18px;
  line-height: 16px;
}
.photo-defect-types.empty .no-type {
  font-size: 10px;
  color: #c0c4cc;
}
.photo-defect-remark {
  font-size: 10px;
  color: #909399;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remark-box {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 14px;
  color: #606266;
}

.barcode {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.card-type-tag {
  color: #909399;
  font-weight: 400;
  margin-left: 4px;
}
</style>
