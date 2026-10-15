<template>
  <div class="receive-wrapper">
    <ReceiveDraftManager v-model="draftDialogVisible" :pickup-source="pickupSource" :rewash-source="rewashSource" :drafts="drafts" :is-expired="isDraftExpired" @save="hangOrder" @restore="restoreDraft" @delete="deleteDraft" />
    <!-- ============= 顶部步骤条 ============= -->
    <div class="steps-bar">
      <el-steps :active="currentStep" align-center finish-status="success" process-status="process">
        <el-step
          v-for="(s, i) in stepList"
          :key="i"
          :title="homeDeliveryPickup && i === 4 ? '验衣结算' : s.title"
          :icon="s.icon"
          :status="i < currentStep ? 'success' : (i === currentStep ? 'process' : 'wait')"
          :class="{ clickable: i <= maxReachedStep }"
          @click.native="onStepClick(i)"
        />
      </el-steps>
    </div>

    <!-- ============= 步骤内容区 ============= -->
    <div class="step-content">

      <!-- ===== Step 0: 客户信息 ===== -->
      <ReceiveCustomerStep v-show="currentStep === 0" :customer="custForm" :customer-detail="customerDetail" :is-new-customer="isNewCustomer" :format="fmt" @search="onSearchCustomer" @phone-blur="onPhoneBlur" />

      <!-- ===== Step 1: 会员卡 ===== -->
      <ReceiveMemberStep v-show="currentStep === 1" :form="form" :pickup-source="homeDeliveryPickup ? pickupSource : null" :current-card="currentCard" :card-types="cardTypeList" :new-card-type="newCardType" :recharge-type="rechargeType" :recharge-balance-after="rechargeBalanceAfter" :format="fmt" @open-card="openCreateCard" @detach-card="detachCard" @new-card-change="onNewCardChange" @recharge-change="onRechargeChange" @recalculate="recalc" />
      <!-- ===== Step 2: 衣物明细 ===== -->
      <ReceiveItemsStep v-show="currentStep === 2" v-model:keyword="kw" v-model:active-group="activeGroup" :rewash-source="rewashSource" :groups="groups" :categories-by-group="categoriesByGroup" :is-selected="isCatSelected" :items="form.items" :is-admin="authStore.isAdmin" :custom-category="customCategory" :format="fmt" :group-label="groupLabel" :color-hex="colorHex" @search="onSearchCategory" @add="onAddCategory" @recalculate="recalc" @edit="editItem" @remove="removeItem" />

      <!-- ===== Step 3: 瑕疵拍照 ===== -->
      <ReceivePhotoStep ref="photoStepRef" v-show="currentStep === 3" :photos="form.defectPhotos" :pedal-enabled="pedalEnabled" :pedal-key-name="pedalKeyName" :uploading="photoUploading" :photo-url="photoUrl" :preview-visible="previewVisibleFlag" :preview-urls="previewUrls" :preview-index="previewIndex" @toggle-pedal="togglePedal" @capture="onPhotoCapture" @clear="clearPhotos" @preview="previewPhoto" @edit="editDefectType" @remove="removePhoto" @close-preview="previewVisibleFlag=false" />

      <!-- ===== Step 4: 收款 ===== -->
      <ReceivePaymentStep v-show="currentStep === 4" :form="form" :pickup-source="homeDeliveryPickup ? pickupSource : null" :rewash-source="rewashSource" :totals="totals" :can-use-card="canUseCard" :card-balance="cardBalance" :card-balance-after="cardBalanceAfter" :format="fmt" @recalculate="recalc" @paid-manually="totalPaidManually = true" />
    </div>
    <!-- ============= 底部步骤导航 ============= -->
    <div class="step-nav">
      <el-button size="large" :icon="RefreshLeft" @click="resetAll">重置</el-button>
      <div class="nav-right">
        <el-button v-if="currentStep > (rewashSource ? 2 : 0)" size="large" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep < stepList.length - 1" size="large" type="primary" @click="nextStep">
          下一步 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
        <el-button
          v-if="currentStep === stepList.length - 1"
          size="large" type="success"
          :icon="Check"
          :loading="submitting"
          @click="submitOrder"
        >
          {{ rewashSource ? `免费返洗 ${_totals.count} 件` : homeDeliveryPickup ? '确认验衣并生成待付款订单' : `收款 ¥${fmt(totals.totalReceivable)} 并完成收衣` }}
        </el-button>
      </div>
    </div>

    <!-- ========== 类别详情弹窗（颜色+品牌+尺码+备注） ========== -->
    <el-dialog v-model="itemDetailVisible" :title="itemDetailTitle" width="520px" :close-on-click-modal="false">
      <el-form :model="itemDetail" label-width="80px" size="default">
        <el-form-item label="类别">
          <el-tag size="default">{{ itemDetail.categoryName }}</el-tag>
        </el-form-item>
        <el-form-item v-if="itemDetail.categoryGroup === 'CUSTOM'" label="衣物名称" required>
          <el-input v-model.trim="itemDetail.customName" maxlength="100" placeholder="例如：舞台演出服" />
        </el-form-item>
        <el-form-item v-if="itemDetail.categoryGroup === 'CUSTOM'" label="单价" required>
          <el-input-number v-model="itemDetail.customPrice" :min="0" :precision="2" :step="1" />
        </el-form-item>
        <el-form-item label="颜色" required>
          <div class="color-palette">
            <div
              v-for="c in colorList"
              :key="c"
              class="color-chip"
              :class="{ active: itemDetail.color === c }"
              :style="{ background: colorHex(c) }"
              @click="itemDetail.color = c"
            >
              <span v-if="isLightColor(c)" class="dark-text">{{ c }}</span>
              <span v-else class="light-text">{{ c }}</span>
            </div>
            <el-input v-model="itemDetail.color" placeholder="其他" size="small" style="width: 100px" />
          </div>
        </el-form-item>
        <el-form-item label="品牌">
          <el-input v-model="itemDetail.brand" placeholder="品牌（如 鸭鸭/波司登，选填）" maxlength="30" />
        </el-form-item>
        <el-form-item v-if="showSizeForGroup(itemDetail.categoryGroup)" label="尺码">
          <el-select v-model="itemDetail.size" placeholder="选择尺码" clearable style="width: 200px">
            <el-option v-for="s in sizeOptionsForGroup(itemDetail.categoryGroup)" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="瑕疵">
          <el-input v-model="itemDetail.defect" placeholder="衣物本身瑕疵备注（选填）" maxlength="50" />
        </el-form-item>
        <el-form-item label="特殊处理">
          <el-input v-model="itemDetail.special" placeholder="特殊处理要求（选填）" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDetailVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmItemDetail">确认</el-button>
      </template>
    </el-dialog>

    <!-- ========== 瑕疵类型选择弹窗 ========== -->
    <el-dialog v-model="defectTypeVisible" title="选择瑕疵类型" width="480px" :close-on-click-modal="false">
      <div class="defect-type-dialog">
        <p class="muted" style="margin-top:0">为这张照片选择瑕疵类型（可多选）：</p>
        <div class="defect-type-grid">
          <div
            v-for="t in defectTypeList"
            :key="t"
            class="defect-type-chip"
            :class="{ active: tempDefectTypes.includes(t) }"
            @click="toggleDefectType(t)"
          >
            {{ t }}
          </div>
        </div>
        <el-form label-width="80px" style="margin-top:16px">
          <el-form-item v-if="tempDefectTypes.includes('其他')" label="其他备注">
            <el-input v-model="tempDefectRemark" placeholder="描述其他瑕疵" maxlength="50" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="defectTypeVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDefectType">确认</el-button>
      </template>
    </el-dialog>

    <!-- ========== 办卡弹窗 ========== -->
    <el-dialog v-model="createCardVisible" title="新办会员卡" width="520px" :close-on-click-modal="false">
      <el-form :model="createCardForm" label-width="80px" ref="createCardFormRef" :rules="createCardRules">
        <el-form-item label="客户姓名" prop="customerName">
          <el-input v-model="createCardForm.customerName" placeholder="办卡人姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="createCardForm.phone" placeholder="办卡人手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="卡类型" prop="cardTypeId">
          <el-select v-model="createCardForm.cardTypeId" placeholder="选择卡类型" style="width: 100%">
            <el-option
              v-for="t in cardTypeList"
              :key="t.id"
              :label="`${t.name} · 充 ¥${t.amount} · 到账 ¥${t.amount} · 折扣 ${t.discountRate} 折`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="支付方式" prop="paymentMethod">
          <el-radio-group v-model="createCardForm.paymentMethod">
            <el-radio-button label="CASH">现金</el-radio-button>
            <el-radio-button label="WECHAT">微信</el-radio-button>
            <el-radio-button label="ALIPAY">支付宝</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="createCardForm.remark" type="textarea" :rows="2" maxlength="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createCardVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingCard" @click="doCreateCard">确认办卡</el-button>
      </template>
    </el-dialog>

    <!-- ========== 打印预览（收衣凭证）========== -->
    <ReceiptPreview v-model="previewVisible" :data="previewData" @reset="resetAll" />

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, CreditCard, Box, Money, RefreshLeft, Check, Camera, ArrowRight
} from '@element-plus/icons-vue'
import { categoryApi, customerApi, memberCardApi, orderApi, photoApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { localId, photoUrl as resolvePhotoUrl } from '@/utils'
import { calculateReceive, isDraftExpired as draftExpired, memberPrice, pickupItems, rewashItems } from '@/utils/receive-calculation.mjs'
import ReceiptPreview from './components/ReceiptPreview.vue'
import ReceiveDraftManager from './components/ReceiveDraftManager.vue'
import ReceiveCustomerStep from './components/ReceiveCustomerStep.vue'
import ReceivePhotoStep from './components/ReceivePhotoStep.vue'
import ReceiveItemsStep from './components/ReceiveItemsStep.vue'
import ReceiveMemberStep from './components/ReceiveMemberStep.vue'
import ReceivePaymentStep from './components/ReceivePaymentStep.vue'

const authStore = useAuthStore()
const DRAFT_TTL = 24 * 60 * 60 * 1000
const REWASH_PENDING_KEY = 'laundry_rewash_pending_v1'
const PICKUP_PENDING_KEY = 'laundry_pickup_pending_v1'
const draftStorageKey = `laundry_receive_drafts_v1:${authStore.username || 'local'}`
const drafts = ref([])
const draftDialogVisible = ref(false)
const activeDraftId = ref(localId())
const rewashSource = ref(null)
const pickupSource = ref(null)
const homeDeliveryPickup = computed(() => pickupSource.value?.homeDelivery === true)
let draftTimer = null
let restoringDraft = false

// ============= 常量/枚举 =============
const GROUPS = [
  { key: 'CLOTHES', label: '衣物类' },
  { key: 'SHOES',   label: '鞋类' },
  { key: 'HOME',    label: '家纺卧室' },
  { key: 'IRON',    label: '单烫类' },
  { key: 'LEATHER', label: '皮衣奢饰品' },
  { key: 'BAG',     label: '包包类' }
]

// 步骤列表
const stepList = [
  { title: '客户信息', icon: User },
  { title: '会员卡',   icon: CreditCard },
  { title: '衣物明细', icon: Box },
  { title: '瑕疵拍照', icon: Camera },
  { title: '收款',     icon: Money }
]
const currentStep = ref(0)
// 已达到的最大步骤（用于步骤条点击回退范围控制）
const maxReachedStep = ref(0)

// 瑕疵类型预设
const defectTypeList = ['污渍', '破损', '褪色', '划痕', '起球', '磨损', '异味', '变形', '其他']

// 颜色色板
const colorList = ['黑', '白', '灰', '红', '橙', '黄', '绿', '蓝', '紫', '粉', '棕', '花色']

// ============= 基础数据 =============
const kw = ref('')
const activeGroup = ref('CLOTHES')
const allCategories = ref([])
const cardTypeList = ref([])
const customerDetail = ref(null)
const currentCard = ref(null)
const isNewCustomer = ref(false)
const submitting = ref(false)

// 办卡弹窗
const createCardVisible = ref(false)
const createCardFormRef = ref(null)
const creatingCard = ref(false)
const receiveRequestId = ref('')
const createCardRequestId = ref('')
const createCardForm = reactive({
  customerId: null, customerName: '', phone: '',
  cardTypeId: null, paymentMethod: 'CASH', remark: ''
})
const createCardRules = {
  customerName: [{ required: true, message: '请输入客户姓名' }],
  phone: [{ required: true, pattern: /^1\d{10}$/, message: '请输入正确的手机号' }],
  cardTypeId: [{ required: true, message: '请选择卡类型' }],
  paymentMethod: [{ required: true, message: '请选择支付方式' }]
}

// ============= 衣物详情弹窗 =============
const itemDetailVisible = ref(false)
const itemDetail = reactive({
  mode: 'add', // add=新增类别时  edit=编辑已有明细
  editId: null, // 编辑时对应 form.items 的 itemTempId
  categoryId: null, categoryGroup: '', categoryName: '',
  customName: '', customPrice: 0,
  color: '', brand: '', size: '', defect: '', special: '',
  // 新增时暂存的原始类别信息（用于生成明细行）
  _category: null
})
const itemDetailTitle = computed(() =>
  itemDetail.mode === 'edit' ? `编辑衣物详情 - ${itemDetail.categoryName}` : `添加衣物 - ${itemDetail.categoryName}`
)

// ============= 瑕疵类型弹窗 =============
const defectTypeVisible = ref(false)
const tempDefectTypes = ref([])
const tempDefectRemark = ref('')
const editingPhotoIndex = ref(-1)

// ============= 表单 =============
const custForm = reactive({
  phone: '', name: '', address: '', remark: '', customerId: null
})

const totalPaidManually = ref(false)

const form = reactive({
  customerName: '', customerPhone: '', customerAddress: '', customerRemark: '',
  newCardFlag: 0, newCardTypeId: null, newCardPayMethod: 'CASH',
  rechargeFlag: 0, rechargeCardTypeId: null, rechargePayMethod: 'CASH',
  memberCardId: null,
  urgentFlag: 0,
  defectPhotos: [],
  paymentMethod: 'CASH', extraMethod: 'CASH', useCardPay: true,
  totalPaid: 0,
  priceOverrideReason: '',
  remark: '',
  items: []
})
const hasPriceOverride = computed(() => form.items.some(item =>
  Number(item.unitPrice).toFixed(2) !== Number(item.catalogPrice).toFixed(2)))

// 打印预览
const previewVisible = ref(false)
const previewData = ref(null)

// 拍照取证
const photoStepRef = ref(null)
const previewVisibleFlag = ref(false)
const previewIndex = ref(0)
const previewUrls = ref([])
const photoUploading = ref(false)

// 脚踏板
const pedalEnabled = ref(false)
const pedalKeyCode = ref(120)
const pedalKeyName = ref('F9')

// ============= 分类 =============
const groups = computed(() => GROUPS)
const customCategory = computed(() => allCategories.value.find(c => c.categoryGroup === 'CUSTOM'))
const categoriesByGroup = computed(() => {
  const m = {}
  GROUPS.forEach(g => { m[g.key] = [] })
  allCategories.value.forEach(c => {
    if (m[c.categoryGroup]) m[c.categoryGroup].push(c)
  })
  return m
})

function groupLabel(key) {
  const g = GROUPS.find(x => x.key === key)
  return g ? g.label : key
}

async function onSearchCategory() {
  if (!kw.value.trim()) {
    allCategories.value = await categoryApi.list()
    return
  }
  allCategories.value = await categoryApi.search(kw.value.trim())
  if (!categoriesByGroup.value[activeGroup.value]?.length) {
    for (const g of GROUPS) {
      if (categoriesByGroup.value[g.key]?.length) {
        activeGroup.value = g.key
        break
      }
    }
  }
}

// ============= 客户 =============
let phoneTimer = null
function onPhoneBlur() {
  if (phoneTimer) clearTimeout(phoneTimer)
  if (/^1\d{10}$/.test(custForm.phone)) {
    phoneTimer = setTimeout(() => onSearchCustomer(), 200)
  }
}

async function onSearchCustomer() {
  const phone = custForm.phone.trim()
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请输入11位手机号')
    return
  }
  try {
    const data = await customerApi.search(phone)
    if (data && data.id) {
      customerDetail.value = data
      isNewCustomer.value = false
      custForm.customerId = data.id
      custForm.name = data.name
      custForm.address = data.address || ''
      custForm.remark = data.remark || ''
      // 安全读取会员卡（兼容可能的字段缺失）
      const mc = data.memberCard || data.member_card || null
      currentCard.value = mc
      form.memberCardId = currentCard.value ? currentCard.value.id : null
      // 老客户有卡：强制取消办卡选项，改为显示充值
      if (currentCard.value) {
        form.newCardFlag = 0
        form.newCardTypeId = null
        form.newCardPayMethod = 'CASH'
        form.rechargeFlag = 0
        form.rechargeCardTypeId = null
        form.rechargePayMethod = 'CASH'
        form.useCardPay = true
      }
      recalc()
      ElMessage.success('已加载老客户信息')
    } else {
      customerDetail.value = null
      isNewCustomer.value = true
      custForm.customerId = null
      currentCard.value = null
      form.memberCardId = null
      form.newCardFlag = 0
      form.newCardTypeId = null
      form.newCardPayMethod = 'CASH'
      form.rechargeFlag = 0
      form.rechargeCardTypeId = null
      form.rechargePayMethod = 'CASH'
      form.useCardPay = true
      recalc()
      ElMessage.info('该手机号为新客户，请补充姓名后进入下一步')
    }
  } catch (e) {
    customerDetail.value = null
    isNewCustomer.value = true
    custForm.customerId = null
    currentCard.value = null
    form.memberCardId = null
    recalc()
  }
}

// ============= 会员卡 =============
async function loadCardTypes() {
  cardTypeList.value = await memberCardApi.types() || []
}

const newCardType = computed(() =>
  form.newCardTypeId ? cardTypeList.value.find(x => x.id === form.newCardTypeId) : null
)

const rechargeType = computed(() =>
  form.rechargeCardTypeId ? cardTypeList.value.find(x => x.id === form.rechargeCardTypeId) : null
)
const rechargeAmount = computed(() =>
  form.rechargeFlag === 1 && rechargeType.value ? +rechargeType.value.amount : 0
)

function onNewCardChange(val) {
  if (val === 1) {
    if (!custForm.name || !custForm.phone) {
      ElMessage.warning('请先填写客户姓名和手机号再办卡')
      nextTick(() => { form.newCardFlag = 0 })
      return
    }
    if (!form.newCardTypeId && cardTypeList.value[0]) {
      form.newCardTypeId = cardTypeList.value[0].id
    }
    form.useCardPay = true
  } else {
    form.newCardTypeId = null
    form.newCardPayMethod = 'CASH'
  }
  recalc()
}

function onRechargeChange(val) {
  if (val === 1) {
    if (!currentCard.value) {
      ElMessage.warning('需已有会员卡才能充值')
      nextTick(() => { form.rechargeFlag = 0 })
      return
    }
    if (!form.rechargeCardTypeId && cardTypeList.value[0]) {
      form.rechargeCardTypeId = cardTypeList.value[0].id
    }
  } else {
    form.rechargeCardTypeId = null
    form.rechargePayMethod = 'CASH'
  }
  recalc()
}

const canUseCard = computed(() => !!(currentCard.value) || form.newCardFlag === 1)
const cardBalance = computed(() => {
  if (form.newCardFlag === 1 && newCardType.value) return +newCardType.value.amount
  if (currentCard.value) return +(currentCard.value.balance || 0) + rechargeAmount.value
  return 0
})
const rechargeBalanceAfter = computed(() => {
  const base = currentCard.value ? +(currentCard.value.balance || 0) : 0
  return round2(base + rechargeAmount.value)
})
const cardBalanceAfter = computed(() => {
  return Math.max(0, round2(cardBalance.value - _totals.cardDeduct))
})

function detachCard() {
  currentCard.value = null
  form.memberCardId = null
  form.useCardPay = true
  form.rechargeFlag = 0
  form.rechargeCardTypeId = null
  form.rechargePayMethod = 'CASH'
  recalc()
}

function openCreateCard() {
  createCardForm.customerId = custForm.customerId
  createCardForm.customerName = custForm.name || ''
  createCardForm.phone = custForm.phone || ''
  createCardForm.cardTypeId = cardTypeList.value[0]?.id || null
  createCardForm.paymentMethod = 'CASH'
  createCardForm.remark = ''
  createCardVisible.value = true
}

async function doCreateCard() {
  if (!createCardFormRef.value) return
  await createCardFormRef.value.validate(async (valid) => {
    if (!valid) return
    creatingCard.value = true
    try {
      let saved
      if (!custForm.customerId) {
        saved = await customerApi.save({
          name: createCardForm.customerName,
          phone: createCardForm.phone,
          address: custForm.address || '',
          remark: custForm.remark || ''
        })
        custForm.customerId = saved.id
        customerDetail.value = saved
        isNewCustomer.value = false
        custForm.name = saved.name
        custForm.phone = saved.phone
        custForm.address = saved.address || ''
        custForm.remark = saved.remark || ''
      }
      const card = await memberCardApi.create({
        requestId: createCardRequestId.value || (createCardRequestId.value = localId()),
        customerId: custForm.customerId,
        customerName: custForm.name,
        customerPhone: custForm.phone,
        customerAddress: custForm.address || '',
        cardTypeId: createCardForm.cardTypeId,
        paymentMethod: createCardForm.paymentMethod,
        remark: createCardForm.remark
      })
      currentCard.value = card
      createCardRequestId.value = ''
      form.memberCardId = card.id
      form.useCardPay = true
      createCardVisible.value = false
      ElMessage.success('办卡成功，卡号 ' + card.cardNo)
      recalc()
    } finally {
      creatingCard.value = false
    }
  })
}

// ============= 衣物 =============
function isCatSelected(id) {
  return form.items.some(x => x.categoryId === id)
}

/** 点击类别：弹出详情填写窗口 */
function onAddCategory(c) {
  itemDetail.mode = 'add'
  itemDetail.editId = null
  itemDetail.categoryId = c.id
  itemDetail.categoryGroup = c.categoryGroup
  itemDetail.categoryName = (c.categoryLevel1 && c.categoryLevel1 !== c.categoryLevel2)
    ? c.categoryLevel1 + '-' + c.categoryLevel2
    : c.categoryLevel2
  itemDetail.customName = ''
  itemDetail.customPrice = Number(c.originalPrice || 0)
  itemDetail.color = ''
  itemDetail.brand = ''
  itemDetail.size = ''
  itemDetail.defect = ''
  itemDetail.special = ''
  itemDetail._category = c
  itemDetailVisible.value = true
}

/** 编辑已有明细 */
function editItem(row) {
  itemDetail.mode = 'edit'
  itemDetail.editId = row.itemTempId
  itemDetail.categoryId = row.categoryId
  itemDetail.categoryGroup = row.categoryGroup
  itemDetail.categoryName = row.categoryName
  itemDetail.customName = row.customName || (row.categoryGroup === 'CUSTOM' ? row.categoryName : '')
  itemDetail.customPrice = Number(row.unitPrice || 0)
  itemDetail.color = row.color || ''
  itemDetail.brand = row.brand || ''
  itemDetail.size = row.size || ''
  itemDetail.defect = row.defect || ''
  itemDetail.special = row.special || ''
  itemDetail._category = null
  itemDetailVisible.value = true
}

/** 确认衣物详情：新增或更新 */
function confirmItemDetail() {
  if (itemDetail.categoryGroup === 'CUSTOM' && !itemDetail.customName) {
    ElMessage.warning('请填写自定义衣物名称')
    return
  }
  if (!itemDetail.color) {
    ElMessage.warning('请选择颜色')
    return
  }
  if (itemDetail.mode === 'add') {
    const c = itemDetail._category
    const quantity = 1
    const unitPrice = c.categoryGroup === 'CUSTOM' ? Number(itemDetail.customPrice || 0) : c.originalPrice
    const memberPrice = computeMemberPrice(unitPrice, c)
    const subtotal = +(memberPrice * quantity).toFixed(2)
    form.items.push({
      itemTempId: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      categoryId: c.id,
      categoryGroup: c.categoryGroup,
      categoryName: c.categoryGroup === 'CUSTOM' ? itemDetail.customName : itemDetail.categoryName,
      customName: c.categoryGroup === 'CUSTOM' ? itemDetail.customName : null,
      quantity, unitPrice, catalogPrice: unitPrice, memberPrice, subtotal,
      color: itemDetail.color,
      brand: itemDetail.brand,
      size: itemDetail.size,
      defect: itemDetail.defect,
      special: itemDetail.special
    })
    ElMessage.success(`已添加 ${itemDetail.categoryName}`)
  } else {
    const item = form.items.find(x => x.itemTempId === itemDetail.editId)
    if (item) {
      if (item.categoryGroup === 'CUSTOM') { item.customName = itemDetail.customName; item.categoryName = itemDetail.customName; item.unitPrice = Number(itemDetail.customPrice || 0); item.catalogPrice = 0 }
      item.color = itemDetail.color
      item.brand = itemDetail.brand
      item.size = itemDetail.size
      item.defect = itemDetail.defect
      item.special = itemDetail.special
      ElMessage.success('已更新')
    }
  }
  itemDetailVisible.value = false
  recalc()
}

function removeItem(idx) {
  form.items.splice(idx, 1)
  recalc()
}

/** 尺码按类别组切换 */
function showSizeForGroup(group) {
  // 家纺/包包不需要尺码
  return group !== 'HOME' && group !== 'BAG'
}
function sizeOptionsForGroup(group) {
  if (group === 'SHOES') {
    return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44']
  }
  // 衣物/皮衣/单烫
  return ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
}

/** 颜色转色块 */
function colorHex(name) {
  const map = {
    '黑': '#303133', '白': '#f5f7fa', '灰': '#909399',
    '红': '#f56c6c', '橙': '#e6a23c', '黄': '#f7d94c',
    '绿': '#67c23a', '蓝': '#409eff', '紫': '#9b59b6',
    '粉': '#ffb6c1', '棕': '#8b4513', '花色': 'linear-gradient(45deg,#f56c6c,#409eff,#67c23a)'
  }
  return map[name] || '#dcdfe6'
}
function isLightColor(name) {
  return ['白', '黄', '粉', '花色'].includes(name)
}

// ============= 瑕疵类型弹窗 =============
function toggleDefectType(t) {
  const i = tempDefectTypes.value.indexOf(t)
  if (i >= 0) tempDefectTypes.value.splice(i, 1)
  else tempDefectTypes.value.push(t)
}

function editDefectType(idx) {
  editingPhotoIndex.value = idx
  const photo = form.defectPhotos[idx]
  tempDefectTypes.value = (photo.defectType || '').split(',').filter(Boolean)
  tempDefectRemark.value = photo.defectRemark || ''
  defectTypeVisible.value = true
}

function confirmDefectType() {
  if (editingPhotoIndex.value >= 0) {
    const photo = form.defectPhotos[editingPhotoIndex.value]
    photo.defectType = tempDefectTypes.value.join(',')
    photo.defectRemark = tempDefectTypes.value.includes('其他') ? tempDefectRemark.value : ''
  }
  defectTypeVisible.value = false
}

// ============= 拍照取证 =============
function triggerCamera() {
  photoStepRef.value?.openCamera()
}

function compressImageToBlob(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        canvas.toBlob((blob) => {
          const compressed = new File([blob], file.name || 'photo.jpg', { type: 'image/jpeg' })
          resolve(compressed)
        }, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

async function onPhotoCapture(e) {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  e.target.value = ''
  photoUploading.value = true
  try {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const compressed = await compressImageToBlob(file)
      const result = await photoApi.upload(compressed)
      const newPhoto = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        filename: result.filename,
        url: result.url,
        size: result.size,
        defectType: '',
        defectRemark: ''
      }
      form.defectPhotos.push(newPhoto)
      // 上传后立即弹出瑕疵类型选择
      editDefectType(form.defectPhotos.length - 1)
    }
    ElMessage.success(`已添加 ${files.length} 张照片`)
  } catch (err) {
    ElMessage.error('照片上传失败')
  } finally {
    photoUploading.value = false
  }
}

function photoUrl(photo) {
  if (!photo) return ''
  if (photo.thumbnail && !photo.url) return photo.thumbnail
  return resolvePhotoUrl(photo)
}

async function removePhoto(idx) {
  const photo = form.defectPhotos[idx]
  if (photo?.filename) {
    try { await photoApi.delete(photo.filename) } catch { /* 请求层已记录，继续清理本机挂单 */ }
  }
  form.defectPhotos.splice(idx, 1)
}

async function clearPhotos() {
  try {
    await ElMessageBox.confirm('确认清空所有瑕疵照片？', '提示', { type: 'warning' })
  } catch { return }
  for (const photo of form.defectPhotos) {
    if (photo?.filename) {
      try { await photoApi.delete(photo.filename) } catch (e) { /* 忽略 */ }
    }
  }
  form.defectPhotos.splice(0)
}

function previewPhoto(idx) {
  previewUrls.value = form.defectPhotos.map(p => photoUrl(p))
  previewIndex.value = idx
  previewVisibleFlag.value = true
}

// ============= 脚踏板 =============
function togglePedal() {
  pedalEnabled.value = !pedalEnabled.value
  if (pedalEnabled.value) {
    ElMessage.success(`脚踏板已启用，踩下 ${pedalKeyName.value} 键即可拍照`)
  } else {
    ElMessage.info('脚踏板已关闭')
  }
}

function onPedalKeyDown(e) {
  if (!pedalEnabled.value) return
  const tag = e.target?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.keyCode === pedalKeyCode.value) {
    e.preventDefault()
    triggerCamera()
  }
}

function computeMemberPrice(unitPrice, category) {
  const card = form.newCardFlag === 1 && newCardType.value ? newCardType.value : currentCard.value
  return memberPrice(unitPrice, category, card)
}

function recalc() {
  const card = form.newCardFlag === 1 && newCardType.value ? newCardType.value : currentCard.value
  const result = calculateReceive({ items: form.items, categories: allCategories.value, card,
    rewash: !!rewashSource.value, urgent: form.urgentFlag === 1,
    newCardAmount: form.newCardFlag === 1 && newCardType.value ? +newCardType.value.amount : 0,
    rechargeAmount: rechargeAmount.value, useCard: canUseCard.value && form.useCardPay,
    cardBalance: cardBalance.value, totalPaid: totalPaidManually.value ? form.totalPaid : null })
  form.items = result.items
  Object.assign(_totals, result.totals)
  form.totalPaid = result.totalPaid
}

const _totals = reactive({
  count: 0, totalAmount: 0, actualAmount: 0,
  urgentSurcharge: 0, payableAmount: 0,
  discountRate: 10, discountAmount: 0, newCardAmount: 0, rechargeAmount: 0,
  totalReceivable: 0, cardDeduct: 0, extraPayment: 0, debtAmount: 0
})
const totals = computed(() => _totals)

// ============= 步骤导航 =============
/** 各步骤完成条件校验 */
function stepValidate(step) {
  switch (step) {
    case 0: // 客户信息：手机号+姓名
      if (!custForm.phone || !/^1\d{10}$/.test(custForm.phone.trim())) return '请输入正确的11位手机号'
      if (!custForm.name || !custForm.name.trim()) return '请填写客户姓名'
      return null
    case 1: // 会员卡：办卡需选卡类型
      if (form.newCardFlag === 1 && !form.newCardTypeId) return '请选择办卡类型'
      if (form.rechargeFlag === 1 && !form.rechargeCardTypeId) return '请选择充值类型'
      return null
    case 2: // 衣物明细：至少1件
      if (form.items.length === 0) return '请至少添加1件衣物'
      return null
    case 3: // 瑕疵拍照：可选，但已拍照片需选瑕疵类型
      if (form.defectPhotos.length > 0) {
        const noType = form.defectPhotos.find(p => !p.defectType)
        if (noType) return '每张照片都需要选择瑕疵类型'
      }
      return null
    default:
      return null
  }
}

function nextStep() {
  const err = stepValidate(currentStep.value)
  if (err) {
    ElMessage.warning(err)
    return
  }
  if (currentStep.value < stepList.length - 1) {
    currentStep.value++
    if (currentStep.value > maxReachedStep.value) {
      maxReachedStep.value = currentStep.value
    }
  }
}

function prevStep() {
  const minimum = rewashSource.value ? 2 : 0
  if (currentStep.value > minimum) currentStep.value--
}

/** 点击步骤条：只能回退到已达到的步骤 */
function onStepClick(i) {
  if (rewashSource.value && i < 2) return
  if (i <= maxReachedStep.value) {
    currentStep.value = i
  }
}

// ============= 提交 =============
function validateSubmit() {
  const err = stepValidate(currentStep.value)
  if (err) return err
  if (rewashSource.value && (!rewashSource.value.reason || form.items.some(item => !item.sourceOrderItemId))) {
    return '返洗来源或返洗原因不完整，请重新从衣物查询发起'
  }
  if (form.paymentMethod === 'MIXED' && !form.extraMethod) {
    return '请选择组合支付的补差方式'
  }
  return null
}

async function submitOrder() {
  const err = validateSubmit()
  if (err) {
    ElMessage.warning(err)
    return
  }
  submitting.value = true
  try {
    // 关键：只有使用卡扣款时才传 memberCardId
    // 如果有卡但不使用卡扣款，memberCardId 设为 null，后端走普通支付
    const useCardForPay = canUseCard.value && form.useCardPay
    const payload = {
      requestId: receiveRequestId.value || (receiveRequestId.value = localId()),
      pickupOrderId: pickupSource.value?.id || null,
      sourceOrderId: rewashSource.value?.sourceOrderId || null,
      rewashType: rewashSource.value?.rewashType || null,
      rewashReason: rewashSource.value?.reason || null,
      customerId: custForm.customerId || null,
      customerName: custForm.name.trim(),
      customerPhone: custForm.phone.trim(),
      customerAddress: custForm.address || '',
      customerRemark: custForm.remark || '',
      newCardFlag: form.newCardFlag,
      newCardTypeId: form.newCardFlag === 1 ? form.newCardTypeId : null,
      newCardPayMethod: form.newCardFlag === 1 ? form.newCardPayMethod : null,
      rechargeFlag: form.rechargeFlag,
      rechargeCardTypeId: form.rechargeFlag === 1 ? form.rechargeCardTypeId : null,
      rechargePayMethod: form.rechargeFlag === 1 ? form.rechargePayMethod : null,
      // 只有使用卡扣款时才传卡ID；充值时也需要传（后端需要更新卡余额）
      memberCardId: (pickupSource.value || useCardForPay || form.rechargeFlag === 1) ? form.memberCardId : null,
      urgentFlag: form.urgentFlag,
      paymentMethod: homeDeliveryPickup.value ? 'WECHAT' : _totals.cardDeduct > 0
        ? (_totals.extraPayment > 0 ? 'MIXED' : 'MEMBER_CARD')
        : (form.extraMethod || 'CASH'),
      extraMethod: _totals.extraPayment > 0
        ? (form.extraMethod || 'CASH')
        : null,
      totalPaid: homeDeliveryPickup.value ? 0 : round2(form.totalPaid || 0),
      priceOverrideReason: null,
      remark: form.remark || '',
      defectPhotos: form.defectPhotos.map(p => ({
        id: p.id,
        filename: p.filename,
        url: p.url,
        size: p.size,
        defectType: p.defectType || '',
        defectRemark: p.defectRemark || ''
      })),
      items: form.items.map(it => ({
        sourceOrderItemId: it.sourceOrderItemId || null,
        categoryId: it.categoryId,
        quantity: it.quantity || 1,
        unitPrice: round2(it.unitPrice),
        color: it.color || '',
        brand: it.brand || '',
        size: it.size || '',
        defect: it.defect || '',
        special: it.special || ''
      }))
    }
    const resp = await orderApi.receive(payload)
    removeDraft(activeDraftId.value)
    localStorage.removeItem(REWASH_PENDING_KEY)
    localStorage.removeItem(PICKUP_PENDING_KEY)
    previewData.value = resp
    previewVisible.value = true
    ElMessage.success(`${rewashSource.value ? '返洗录入' : '收衣'}成功！订单号 ${resp.orderNo}`)
  } finally {
    submitting.value = false
  }
}

// ============= 重置 =============
function resetAll(clearDraft = true) {
  if (clearDraft) removeDraft(activeDraftId.value)
  custForm.phone = ''
  custForm.name = ''
  custForm.address = ''
  custForm.remark = ''
  custForm.customerId = null
  customerDetail.value = null
  currentCard.value = null
  isNewCustomer.value = false
  form.newCardFlag = 0
  form.newCardTypeId = null
  form.newCardPayMethod = 'CASH'
  form.rechargeFlag = 0
  form.rechargeCardTypeId = null
  form.rechargePayMethod = 'CASH'
  form.memberCardId = null
  form.urgentFlag = 0
  form.defectPhotos.splice(0)
  form.paymentMethod = 'CASH'
  form.extraMethod = 'CASH'
  form.totalPaid = 0
  form.priceOverrideReason = ''
  form.remark = ''
  form.items.splice(0)
  receiveRequestId.value = ''
  createCardRequestId.value = ''
  totalPaidManually.value = false
  currentStep.value = 0
  maxReachedStep.value = 0
  recalc()
  activeGroup.value = 'CLOTHES'
  kw.value = ''
  rewashSource.value = null
  pickupSource.value = null
  activeDraftId.value = localId()
}

// ============= Windows 桌面端本机挂单 =============
function readDrafts() {
  try {
    const value = JSON.parse(localStorage.getItem(draftStorageKey) || '[]')
    return Array.isArray(value) ? value.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) : []
  } catch { return [] }
}

function writeDrafts(value) {
  drafts.value = value.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  try {
    localStorage.setItem(draftStorageKey, JSON.stringify(drafts.value))
    return true
  } catch {
    ElMessage.error('本机挂单保存失败，请立即完成收衣或联系管理员清理应用存储')
    return false
  }
}

function hasDraftContent() {
  return !!(custForm.phone || custForm.name || form.items.length || form.defectPhotos.length || form.remark)
}

function persistCurrent() {
  if (restoringDraft || rewashSource.value || pickupSource.value || !hasDraftContent()) return false
  const now = Date.now()
  const previous = readDrafts().find(draft => draft.id === activeDraftId.value)
  const draft = {
    id: activeDraftId.value,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    customer: JSON.parse(JSON.stringify(custForm)),
    form: JSON.parse(JSON.stringify(form)),
    customerDetail: customerDetail.value ? JSON.parse(JSON.stringify(customerDetail.value)) : null,
    currentCard: currentCard.value ? JSON.parse(JSON.stringify(currentCard.value)) : null,
    isNewCustomer: isNewCustomer.value,
    currentStep: currentStep.value,
    maxReachedStep: maxReachedStep.value
  }
  return writeDrafts([draft, ...readDrafts().filter(item => item.id !== draft.id)])
}

function removeDraft(id) {
  if (!id) return
  writeDrafts(readDrafts().filter(draft => draft.id !== id))
}

function hangOrder() {
  if (!persistCurrent()) return ElMessage.warning('请先填写客户或衣物信息')
  ElMessage.success('挂单已保存在这台电脑上')
  activeDraftId.value = localId()
  resetAll(false)
}

function restoreDraft(draft, silent = false) {
  restoringDraft = true
  resetAll(false)
  activeDraftId.value = draft.id
  Object.assign(custForm, draft.customer || {})
  Object.assign(form, draft.form || {})
  form.items = Array.isArray(draft.form?.items) ? draft.form.items : []
  form.defectPhotos = Array.isArray(draft.form?.defectPhotos) ? draft.form.defectPhotos : []
  customerDetail.value = draft.customerDetail || null
  currentCard.value = draft.currentCard || null
  isNewCustomer.value = !!draft.isNewCustomer
  currentStep.value = Number(draft.currentStep || 0)
  maxReachedStep.value = Number(draft.maxReachedStep || 0)
  draftDialogVisible.value = false
  recalc()
  restoringDraft = false
  if (!silent) ElMessage.success(isDraftExpired(draft) ? '已恢复过期挂单，请重新核对信息' : '已恢复挂单')
}

async function deleteDraft(id) {
  const draft = readDrafts().find(item => item.id === id)
  removeDraft(id)
  if (id === activeDraftId.value) resetAll(false)
  for (const photo of draft?.form?.defectPhotos || []) {
    if (photo?.filename) photoApi.delete(photo.filename).catch(() => {})
  }
  ElMessage.success('挂单已删除')
}

function isDraftExpired(draft) { return draftExpired(draft, Date.now(), DRAFT_TTL) }

function applyPendingRewash() {
  try {
    const pending = JSON.parse(localStorage.getItem(REWASH_PENDING_KEY) || 'null')
    if (!pending?.sourceOrderId || !Array.isArray(pending.items)) return false
    restoringDraft = true
    resetAll(false)
    rewashSource.value = pending
    Object.assign(custForm, {
      customerId: null,
      name: pending.customer?.name || '',
      phone: pending.customer?.phone || '',
      address: pending.customer?.address || '',
      remark: ''
    })
    form.items = rewashItems(pending.items, localId)
    form.paymentMethod = 'CASH'
    form.extraMethod = 'CASH'
    form.totalPaid = 0
    currentStep.value = 2
    maxReachedStep.value = 4
    recalc()
    restoringDraft = false
    return true
  } catch {
    localStorage.removeItem(REWASH_PENDING_KEY)
    return false
  }
}

async function applyPendingPickup() {
  try {
    const pending = JSON.parse(localStorage.getItem(PICKUP_PENDING_KEY) || 'null')
    if (!pending?.id || !Array.isArray(pending.items)) return false
    restoringDraft = true
    resetAll(false)
    pickupSource.value = pending
    Object.assign(custForm, {
      customerId: null,
      name: pending.customer?.name || '',
      phone: pending.customer?.phone || '',
      address: pending.customer?.address || '',
      remark: ''
    })
    await onSearchCustomer()
    if (homeDeliveryPickup.value) {
      form.useCardPay = false
      form.newCardFlag = 0
      form.rechargeFlag = 0
    }
    form.items = pickupItems(pending.items, allCategories.value, computeMemberPrice, localId)
    form.remark = pending.remark ? `上门取衣：${pending.remark}` : `上门取衣预约 ${pending.pickupNo}`
    currentStep.value = 2
    maxReachedStep.value = 4
    recalc()
    restoringDraft = false
    ElMessage.success(homeDeliveryPickup.value ? '预约顾客和衣物已带入；验衣后生成小程序待付款订单' : '旧预约已带入；按原门店取衣流程收衣')
    return true
  } catch (e) {
    restoringDraft = false
    localStorage.removeItem(PICKUP_PENDING_KEY)
    ElMessage.error(e.message || '上门预约导入失败')
    return false
  }
}

// ============= 工具 =============
function fmt(v) {
  const n = v == null ? 0 : Number(v)
  return isNaN(n) ? '0.00' : n.toFixed(2)
}
function round2(n) { return Math.round(+n * 100) / 100 }

// ============= 生命周期 =============
onMounted(async () => {
  window.addEventListener('keydown', onPedalKeyDown)
  try {
    allCategories.value = await categoryApi.list() || []
    await loadCardTypes()
    drafts.value = readDrafts()
    if (!(await applyPendingPickup()) && !applyPendingRewash()) {
      const recent = drafts.value.find(draft => !isDraftExpired(draft))
      if (recent) {
        restoreDraft(recent, true)
        ElMessage.info('已恢复本机未完成的收衣挂单')
      } else recalc()
    }
  } catch (e) {
    ElMessage.warning('加载类别/卡类型失败，请检查后端')
  }
})
onUnmounted(() => {
  if (draftTimer) clearTimeout(draftTimer)
  persistCurrent()
  window.removeEventListener('keydown', onPedalKeyDown)
})

watch(() => form.totalPaid, recalc)
watch([custForm, form, currentStep, maxReachedStep], () => {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(persistCurrent, 400)
}, { deep: true })
</script>

<style scoped>
.receive-wrapper {
  height: 100%;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
  padding: 12px;
  overflow: hidden;
}
/* 步骤条 */
.steps-bar {
  background: #fff;
  border-radius: 8px;
  padding: 16px 24px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.steps-bar :deep(.el-step) { cursor: not-allowed; }
.steps-bar :deep(.el-step.clickable) { cursor: pointer; }
.steps-bar :deep(.el-step.clickable:hover .el-step__title) { color: #409eff; }

/* 步骤内容区 */
.step-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
/* 底部导航 */
.step-nav {
  background: #fff;
  border-radius: 8px;
  padding: 14px 24px;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.nav-right { display: flex; gap: 10px; }

/* 颜色色板 */
.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.color-chip {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all .15s;
}
.color-chip:hover { transform: scale(1.08); }
.color-chip.active { border-color: #409eff; box-shadow: 0 0 8px rgba(64,158,255,0.4); }
.dark-text { color: #303133; }
.light-text { color: #fff; }

/* 瑕疵类型选择 */
.defect-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.defect-type-chip {
  padding: 12px 8px;
  text-align: center;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all .15s;
  background: #fff;
}
.defect-type-chip:hover { border-color: #f56c6c; color: #f56c6c; }
.defect-type-chip.active { background: #f56c6c; border-color: #f56c6c; color: #fff; }
</style>
