<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="onVisible"
    title="收衣凭证预览"
    width="960px"
    class="receipt-dialog"
    :close-on-click-modal="false"
    top="4vh"
  >
    <div class="preview-toolbar">
      <div>
        <el-radio-group v-model="viewMode">
          <el-radio-button label="receipt">
            <el-icon><Tickets /></el-icon> 收衣凭证（80mm）
          </el-radio-button>
          <el-radio-button label="tags">
            <el-icon><Collection /></el-icon> 条码标签
          </el-radio-button>
          <el-radio-button label="all">
            <el-icon><Document /></el-icon> 全部预览
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="tools-right">
        <el-button :icon="Printer" @click="doPrint('receipt')">打印80mm凭证</el-button>
        <el-button :icon="Printer" type="primary" @click="doPrint('tags')">打印30×110mm标签</el-button>
      </div>
    </div>

    <!-- 打印区域：同时渲染凭证+条码，打印时 CSS 控制 -->
    <div class="print-area" ref="printAreaRef">
      <!-- === 80mm 热敏收衣凭证 === -->
      <div v-if="viewMode !== 'tags'" class="thermal-80" :class="dft ? 'dft-font' : ''">
        <!-- 头 -->
        <div class="t-logo">
          <div class="logo-icon">小木棒</div>
          <div class="store">{{ data?.storeName || '小木棒洗衣' }}</div>
        </div>
        <div class="t-title">— 收 衣 凭 证 —</div>
        <div class="t-center small">( 客 户 联 )</div>
        <div class="t-info">
          <div class="row"><span class="k">订单号</span><span class="v mono">{{ data?.orderNo }}</span></div>
          <div class="row"><span class="k">日&nbsp;&nbsp;期</span><span class="v">{{ fmtDateTime(data?.receiveTime) }}</span></div>
          <div class="row"><span class="k">客&nbsp;&nbsp;户</span><span class="v">{{ data?.customerName }}</span></div>
          <div class="row"><span class="k">手机号</span><span class="v mono">{{ maskPhone(data?.customerPhone) }}</span></div>
          <div v-if="data?.customerAddress" class="row"><span class="k">地&nbsp;&nbsp;址</span><span class="v">{{ data.customerAddress }}</span></div>
          <div class="row"><span class="k">操作员</span><span class="v">{{ data?.operatorName }}</span></div>
        </div>

        <div class="divider-dash">------------------------------</div>

        <!-- 衣物明细 -->
        <table class="t-table">
          <thead>
            <tr>
              <th style="width: 42%">衣物</th>
              <th class="right" style="width: 10%">数</th>
              <th class="right" style="width: 18%">单价</th>
              <th class="right" style="width: 30%">小计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in data?.items" :key="it.itemSeq">
              <td>
                <div class="cname">{{ it.categoryName }}</div>
                <div v-if="it.brand || it.color || it.defect || it.special" class="cdesc">
                  <span v-if="it.brand">{{ it.brand }}</span>
                  <span v-if="it.color"> · {{ it.color }}</span>
                  <span v-if="it.defect"> · {{ it.defect }}</span>
                  <span v-if="it.special"> · {{ it.special }}</span>
                </div>
              </td>
              <td class="right">{{ it.quantity }}</td>
              <td class="right">{{ fmt(it.unitPrice) }}</td>
              <td class="right"><b>{{ fmt(it.subtotal) }}</b></td>
            </tr>
          </tbody>
        </table>

        <div class="divider-dash">------------------------------</div>

        <!-- 汇总 -->
        <div class="t-sum">
          <div class="row"><span>件&nbsp;&nbsp;数</span><b>{{ data?.totalCount }} 件</b></div>
          <div class="row"><span>原&nbsp;&nbsp;价</span><span>¥{{ fmt(data?.totalAmount) }}</span></div>
          <div v-if="data?.discountRate && data.discountRate < 10" class="row">
            <span>会员折扣</span>
            <span>{{ data.discountRate }} 折</span>
          </div>
          <div v-if="data?.discountAmount > 0" class="row green">
            <span>优惠金额</span>
            <span>-¥{{ fmt(data.discountAmount) }}</span>
          </div>
          <div v-if="data?.newCardAmount > 0" class="row">
            <span>办卡充值</span>
            <span>¥{{ fmt(data.newCardAmount) }}</span>
          </div>
          <div v-if="data?.rechargeAmount > 0" class="row">
            <span>会员卡充值</span>
            <span>¥{{ fmt(data.rechargeAmount) }}</span>
          </div>
          <div class="row big-red">
            <span>应收合计</span>
            <b>¥{{ fmt(data?.totalReceivable) }}</b>
          </div>
          <div class="row"><span>支付方式</span><span>{{ data?.paymentMethodLabel }}</span></div>
          <div v-if="data?.cardDeduct > 0" class="row">
            <span>会员卡扣</span>
            <span>-¥{{ fmt(data.cardDeduct) }}</span>
          </div>
          <div v-if="data?.extraPayment > 0" class="row">
            <span>补差（{{ data?.extraMethodLabel || '现金' }}）</span>
            <span>¥{{ fmt(data.extraPayment) }}</span>
          </div>
          <div class="row"><span>实收金额</span><b>¥{{ fmt(data?.totalPaid) }}</b></div>
          <div v-if="data?.debtAmount > 0" class="row red">
            <span>欠&nbsp;&nbsp;款</span>
            <b>¥{{ fmt(data.debtAmount) }}</b>
          </div>

          <div v-if="data?.usedMemberCard" class="card-line">
            卡：{{ data.cardNo }}（{{ data.cardTypeName }}）
            余额 ¥{{ fmt(data.cardBalanceAfter) }}
          </div>
        </div>

        <div class="divider-dash">------------------------------</div>

        <div class="t-notice">
          <div class="t-center small">◆ 客 户 须 知 ◆</div>
          <ol>
            <li>取衣时请提供手机号和衣物回店后告知的四位取衣码。</li>
            <li>洗涤以衣物内标签为准，特殊处理请提前说明。</li>
            <li>取衣周期：普通衣物3-5天，特殊衣物7-10天。</li>
            <li>如未收到取衣通知，请致电门店查询。</li>
          </ol>
        </div>

        <div class="t-footer">
          <div class="t-center small">门店：{{ data?.storeName }}</div>
          <div class="t-center small">电话：{{ data?.storePhone || '' }}</div>
          <div class="t-center small">地址：{{ data?.storeAddress || '' }}</div>
          <div class="t-sep"></div>
          <div class="t-center small">客户签收：________________</div>
          <div class="t-sep"></div>
          <div class="t-center">—— 谢谢惠顾，小木棒洗衣 ——</div>
          <div class="t-cut">═══════════════════════════════ 沿此线撕开 ═══════════════════════════════</div>
        </div>
      </div>

      <!-- 每件衣物一张 30×110mm 标签；不打印客户姓名和完整电话，工厂工人不接触客户隐私。 -->
      <div v-if="viewMode !== 'receipt'" class="tags-wrap">
        <div
          v-for="it in data?.items"
          :key="'tag-' + it.itemSeq"
          class="tag-30-110"
        >
          <div class="tag-head">
            <strong>{{ data?.storeName || '小木棒洗衣' }}</strong>
            <span>{{ it.itemSeq }}/{{ data?.totalCount }} 件</span>
          </div>
          <div class="tag-category">{{ it.categoryName }}</div>
          <div class="tag-description">
            <span v-if="it.color">颜色：{{ it.color }}</span>
            <span v-if="it.special || it.defect">{{ it.special || it.defect }}</span>
          </div>
          <div class="tag-scan-zone"><img :src="it.barcodeImageBase64" class="tag-barcode" alt="衣物条码" /></div>
          <div class="tag-code mono">{{ it.barcode }}</div>
          <div class="tag-foot"><span>订单 {{ data?.orderNo }}</span><span>收衣 {{ fmtTagDate(data?.receiveTime) }}</span></div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('reset'); onVisible(false)">
        完成，开启新单
      </el-button>
      <el-button :icon="Printer" @click="doPrint('receipt')">打印凭证</el-button>
      <el-button type="primary" :icon="Printer" @click="doPrint('tags')">打印标签</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Tickets, Collection, Document, Printer } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  data: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'reset'])

function onVisible(v) { emit('update:modelValue', v) }

const viewMode = ref('all') // receipt / tags / all
const dft = ref(true)       // 小票使用仿宋字体（更接近80mm热敏机默认）
// ============= 工具 =============
function fmt(v) {
  const n = v == null ? 0 : Number(v)
  return isNaN(n) ? '0.00' : n.toFixed(2)
}
function fmtDateTime(v) {
  if (!v) return ''
  const d = new Date(v)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function fmtTagDate(v) { return fmtDateTime(v).slice(2, 16) }
function maskPhone(p) {
  if (!p) return ''
  return p.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

// ============= 打印 =============
function doPrint(mode) {
  if (mode === 'tags' && (!props.data?.items?.length || props.data.items.some(it => !it.barcodeImageBase64))) {
    ElMessage.error('衣物条码图未准备好，请重新打开收衣预览后再打印')
    return
  }
  // 小票与标签必须分别选择各自的纸张和打印机，不能混在同一张 A4 上缩放打印。
  const printHtml = generatePrintHtml(mode)
  const w = window.open('', '_blank',
    'toolbar=no,menubar=no,scrollbars=yes,width=900,height=700')
  if (!w) {
    ElMessage.error('浏览器拦截了弹出窗口，请允许弹窗后重试')
    return
  }
  w.document.write(printHtml)
  w.document.close()
  Promise.all(Array.from(w.document.images, img => img.complete
    ? Promise.resolve()
    : new Promise(resolve => { img.onload = resolve; img.onerror = resolve })))
    .then(() => { w.focus(); w.print() })
    .catch(e => ElMessage.error('打印异常：' + e.message))
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char])
}

/** 分别生成小票或标签的打印 HTML；各自使用真实纸张尺寸。 */
function generatePrintHtml(mode) {
  const items = props.data?.items || []
  const d = props.data || {}

  // ===== 80mm 收衣凭证 =====
  const rowsHtml = items.map(it => {
    const desc = [it.brand, it.color, it.defect, it.special].filter(Boolean).join(' · ')
    return `
      <tr>
        <td>
          <div class="cname">${it.categoryName || ''}</div>
          ${desc ? `<div class="cdesc">${desc}</div>` : ''}
        </td>
        <td class="right">${it.quantity}</td>
        <td class="right">${fmt(it.unitPrice)}</td>
        <td class="right"><b>${fmt(it.subtotal)}</b></td>
      </tr>`
  }).join('')

  const receipt = `
  <div class="thermal-80 page-break">
    <div class="t-logo">
      <div class="logo-icon">小木棒</div>
      <div class="store">${d.storeName || '小木棒洗衣'}</div>
    </div>
    <div class="t-title">— 收 衣 凭 证 —</div>
    <div class="t-center small">( 客 户 联 )</div>
    <div class="t-info">
      <div class="row"><span class="k">订单号</span><span class="v mono">${d.orderNo || ''}</span></div>
      <div class="row"><span class="k">日&nbsp;&nbsp;期</span><span class="v">${fmtDateTime(d.receiveTime)}</span></div>
      <div class="row"><span class="k">客&nbsp;&nbsp;户</span><span class="v">${d.customerName || ''}</span></div>
      <div class="row"><span class="k">手机号</span><span class="v mono">${maskPhone(d.customerPhone)}</span></div>
      ${d.customerAddress ? `<div class="row"><span class="k">地&nbsp;&nbsp;址</span><span class="v">${d.customerAddress}</span></div>` : ''}
      <div class="row"><span class="k">操作员</span><span class="v">${d.operatorName || ''}</span></div>
    </div>
    <div class="divider-dash">------------------------------</div>
    <table class="t-table">
      <thead>
        <tr>
          <th style="width:42%">衣物</th>
          <th class="right" style="width:10%">数</th>
          <th class="right" style="width:18%">单价</th>
          <th class="right" style="width:30%">小计</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="divider-dash">------------------------------</div>
    <div class="t-sum">
      <div class="row"><span>件&nbsp;&nbsp;数</span><b>${d.totalCount || 0} 件</b></div>
      <div class="row"><span>原&nbsp;&nbsp;价</span><span>¥${fmt(d.totalAmount)}</span></div>
      ${(d.discountRate && d.discountRate < 10) ? `<div class="row"><span>会员折扣</span><span>${d.discountRate} 折</span></div>` : ''}
      ${d.discountAmount > 0 ? `<div class="row green"><span>优惠金额</span><span>-¥${fmt(d.discountAmount)}</span></div>` : ''}
      ${d.newCardAmount > 0 ? `<div class="row"><span>办卡充值</span><span>¥${fmt(d.newCardAmount)}</span></div>` : ''}
      ${d.rechargeAmount > 0 ? `<div class="row"><span>会员卡充值</span><span>¥${fmt(d.rechargeAmount)}</span></div>` : ''}
      <div class="row big-red"><span>应收合计</span><b>¥${fmt(d.totalReceivable)}</b></div>
      <div class="row"><span>支付方式</span><span>${d.paymentMethodLabel || ''}</span></div>
      ${d.cardDeduct > 0 ? `<div class="row"><span>会员卡扣</span><span>-¥${fmt(d.cardDeduct)}</span></div>` : ''}
      ${d.extraPayment > 0 ? `<div class="row"><span>补差（${d.extraMethodLabel || '现金'}）</span><span>¥${fmt(d.extraPayment)}</span></div>` : ''}
      <div class="row"><span>实收金额</span><b>¥${fmt(d.totalPaid)}</b></div>
      ${d.debtAmount > 0 ? `<div class="row red"><span>欠&nbsp;&nbsp;款</span><b>¥${fmt(d.debtAmount)}</b></div>` : ''}
      ${d.usedMemberCard ? `<div class="card-line">卡：${d.cardNo || ''}（${d.cardTypeName || ''}）余额 ¥${fmt(d.cardBalanceAfter)}</div>` : ''}
    </div>
    <div class="divider-dash">------------------------------</div>
    <div class="t-notice">
      <div class="t-center small">◆ 客 户 须 知 ◆</div>
      <ol>
        <li>取衣时请提供手机号和衣物回店后告知的四位取衣码。</li>
        <li>洗涤以衣物内标签为准，特殊处理请提前说明。</li>
        <li>取衣周期：普通衣物3-5天，特殊衣物7-10天。</li>
        <li>如未收到取衣通知，请致电门店查询。</li>
      </ol>
    </div>
    <div class="t-footer">
      <div class="t-center small">门店：${d.storeName || ''}</div>
      <div class="t-center small">电话：${d.storePhone || ''}</div>
      <div class="t-center small">地址：${d.storeAddress || ''}</div>
      <div class="t-sep"></div>
      <div class="t-center small">客户签收：________________</div>
      <div class="t-sep"></div>
      <div class="t-center">—— 谢谢惠顾，小木棒洗衣 ——</div>
      <div class="t-cut">═══════════════════════════════ 沿此线撕开 ═══════════════════════════════</div>
    </div>
  </div>`

  // ===== 条码标签 =====
  const tags = items.map(it => {
    const detail = it.special || it.defect
    return `
    <div class="tag-30-110">
      <div class="tag-head">
        <strong>${escapeHtml(d.storeName || '小木棒洗衣')}</strong>
        <span>${escapeHtml(it.itemSeq)}/${escapeHtml(d.totalCount)} 件</span>
      </div>
      <div class="tag-category">${escapeHtml(it.categoryName)}</div>
      <div class="tag-description">
        ${it.color ? `<span>颜色：${escapeHtml(it.color)}</span>` : ''}
        ${detail ? `<span>${escapeHtml(detail)}</span>` : ''}
      </div>
      <div class="tag-scan-zone"><img src="${escapeHtml(it.barcodeImageBase64)}" class="tag-barcode" alt="衣物条码"/></div>
      <div class="tag-code mono">${escapeHtml(it.barcode)}</div>
      <div class="tag-foot"><span>订单 ${escapeHtml(d.orderNo)}</span><span>收衣 ${escapeHtml(fmtTagDate(d.receiveTime))}</span></div>
    </div>`
  }).join('')

  // ===== 组装 =====
  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>${mode === 'tags' ? '衣物标签' : '收衣凭证'}-${escapeHtml(d.orderNo)}-小木棒洗衣</title>
<style>
${mode === 'tags' ? '@page { size: 30mm 110mm; margin: 0; }' : '@page { margin: 0; }'}
@media print {
  body { margin: 0; padding: 0; background: #fff; }
  .no-print { display: none !important; }
  .sheet { display: block; width: auto; margin: 0; padding: 0; box-shadow: none; }
}
* { box-sizing: border-box; }
body {
  font-family: "FangSong", "STFangsong", "Microsoft YaHei", monospace;
  color: #000; background: #eee; padding: 10px;
}
.mono { font-family: "Consolas", "Courier New", monospace; }
.t-center { text-align: center; }
.small { font-size: 12px; }
.right { text-align: right; }

/* 顶部提示，打印时隐藏 */
.hint { text-align: center; color: #666; padding: 6px; font-size: 12px; margin-bottom: 6px; }
.sheet {
  background: #fff; margin: 0 auto; padding: 10px;
  box-shadow: 0 0 8px rgba(0,0,0,0.1);
  display: flex; flex-wrap: wrap; align-content: flex-start;
}

/* ============ 80mm 小票 ============ */
.thermal-80 {
  width: 80mm;
  min-height: 297mm;
  margin: 0 auto 20px;
  padding: 4mm 3mm 3mm 3mm;
  background: #fff;
  border: 1px dashed #ccc;
  font-size: 12px;
  line-height: 1.6;
  color: #000;
  font-family: "FangSong", "STFangsong", "Kaiti", monospace;
}
@media print {
  .thermal-80 {
    width: 80mm;
    min-height: auto;
    border: none;
    margin: 0;
    padding: 2mm;
  }
}
.t-logo { text-align: center; margin-bottom: 4px; }
.t-logo .logo-icon {
  display: inline-block; padding: 2px 10px; border: 2px solid #000; border-radius: 3px;
  font-weight: 700; letter-spacing: 2px; margin-bottom: 4px; font-size: 14px;
}
.t-logo .store { font-size: 14px; font-weight: 700; letter-spacing: 2px; }
.t-title { text-align: center; font-weight: 700; font-size: 16px; letter-spacing: 4px; margin: 6px 0 0; }
.t-info { margin-top: 6px; }
.t-info .row, .t-sum .row {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 1px 0;
}
.t-info .k, .t-sum .k { color: #333; }
.t-sum .row.big-red { font-size: 14px; padding: 4px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin: 4px 0; }
.t-sum .row.big-red b, .t-sum .big-red span:last-child { color: #d9001b; font-size: 17px; font-weight: 700; }
.t-sum .row.red b { color: #d9001b; }
.t-sum .row.green span:last-child { color: #1a7f37; }
.t-sum .card-line {
  background: #f5f5f5; padding: 3px 6px; margin: 4px 0; border-radius: 2px;
  font-size: 11px;
}
.divider-dash { text-align: center; font-family: monospace; letter-spacing: -1px; color: #000; margin: 4px 0; }
.t-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.t-table th, .t-table td { padding: 2px 2px; vertical-align: top; border-bottom: 1px dotted #999; }
.t-table th { font-weight: 700; border-bottom: 1px solid #000; }
.t-table .cname { font-weight: 600; }
.t-table .cdesc { font-size: 11px; color: #555; }


.t-notice { margin-top: 6px; }
.t-notice ol { padding-left: 18px; margin: 4px 0; font-size: 11px; line-height: 1.6; }
.t-notice li { margin-bottom: 2px; }

.t-footer { margin-top: 8px; }
.t-sep { height: 6px; }
.t-cut {
  text-align: center;
  font-family: monospace;
  letter-spacing: -1px;
  font-size: 11px;
  color: #666;
  margin-top: 6px;
  padding: 2px 0;
  border-top: 1px dashed #666;
  border-bottom: 1px dashed #666;
}

/* 每件独立占一页 30×110mm；只有衣物码用于扫描。 */
.tags-wrap { display: flex; flex-wrap: wrap; gap: 3mm; padding: 5mm; background: #fff; }
.tag-30-110 {
  width: 30mm; height: 110mm; padding: 2mm;
  display: flex; flex-direction: column; flex: none;
  background: #fff; color: #000; border: 1px dashed #bbb;
  font-family: "Microsoft YaHei", Arial, sans-serif;
  overflow: hidden; break-inside: avoid; page-break-inside: avoid;
}
.tag-head { height: 8mm; display: flex; align-items: center; justify-content: space-between; gap: 1mm; border-bottom: 1px solid #000; font-size: 10px; }
.tag-head strong { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tag-head span { white-space: nowrap; font-weight: 700; }
.tag-category { height: 10mm; display: flex; align-items: center; font-size: 13px; line-height: 1.2; font-weight: 800; overflow: hidden; }
.tag-description { height: 10mm; display: flex; flex-direction: column; gap: 1mm; font-size: 10px; line-height: 1.1; overflow: hidden; }
.tag-description span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tag-scan-zone { position: relative; height: 60mm; width: 26mm; flex: none; overflow: hidden; }
.tag-barcode { position: absolute; width: 56mm; height: 18mm; max-width: none; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(90deg); display: block; }
.tag-code { height: 8mm; display: flex; align-items: center; justify-content: center; font: 700 11px Consolas, "Courier New", monospace; white-space: nowrap; }
.tag-foot { height: 10mm; border-top: 1px solid #000; display: flex; flex-direction: column; justify-content: center; gap: 1mm; font-size: 9px; line-height: 1.1; white-space: nowrap; }
@media print {
  .tags-wrap { display: block; width: 30mm; margin: 0; padding: 0; }
  .tag-30-110 { border: 0; margin: 0; break-after: page; page-break-after: always; }
  .tag-30-110:last-child { break-after: auto; page-break-after: auto; }
}
</style>
</head>
<body>
  <div class="hint no-print">
    此预览与打印机纸张尺寸对应：收衣凭证 80mm × 任意长度（热敏小票机），条码标签 30mm × 110mm（竖排细长条标签机）。
    请在打印对话框中选择对应的打印机和纸张，并勾选「实际尺寸 / 边距：无」。
  </div>

  <div class="sheet">${mode === 'tags' ? `<div class="tags-wrap">${tags}</div>` : receipt}</div>
  <div class="hint no-print">—— 预览结束 ——</div>
</body></html>`
}
</script>

<style scoped>
.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0 10px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 14px;
}
.tools-right { display: flex; gap: 8px; }

.print-area {
  background: #f0f2f5;
  padding: 14px;
  border-radius: 4px;
  max-height: 62vh;
  overflow: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  gap: 24px;
}

/* ========== 80mm 小票预览 ========== */
.thermal-80 {
  width: 80mm;
  background: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 4mm 3mm 3mm 3mm;
  font-size: 12px;
  line-height: 1.6;
  color: #000;
  font-family: "FangSong","STFangsong","Kaiti",monospace;
}
.thermal-80.dft-font { font-family: "FangSong","STFangsong",monospace; }

.t-logo { text-align: center; margin-bottom: 4px; }
.t-logo .logo-icon {
  display: inline-block; padding: 2px 10px; border: 2px solid #000; border-radius: 3px;
  font-weight: 700; letter-spacing: 2px; margin-bottom: 4px; font-size: 14px;
}
.t-logo .store { font-size: 14px; font-weight: 700; letter-spacing: 2px; }
.t-title { text-align: center; font-weight: 700; font-size: 16px; letter-spacing: 4px; margin: 6px 0 0; }
.t-center { text-align: center; }
.small { font-size: 12px; }
.mono { font-family: Consolas, "Courier New", monospace; }

.t-info { margin-top: 6px; }
.t-info .row, .t-sum .row {
  display: flex; justify-content: space-between; align-items: baseline; padding: 1px 0;
}
.t-sum { margin-top: 2px; }
.t-sum .row.big-red {
  font-size: 14px; padding: 4px 0;
  border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin: 4px 0;
}
.t-sum .row.big-red b { color: #d9001b; font-size: 17px; }
.t-sum .row.red b { color: #d9001b; }
.t-sum .row.green span:last-child { color: #1a7f37; }
.t-sum .card-line {
  background: #f5f5f5; padding: 3px 6px; margin: 4px 0; border-radius: 2px; font-size: 11px;
}
.divider-dash {
  text-align: center; font-family: monospace; letter-spacing: -1px; color: #000; margin: 4px 0;
}
.t-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.t-table th, .t-table td { padding: 2px 2px; vertical-align: top; border-bottom: 1px dotted #999; }
.t-table th { font-weight: 700; border-bottom: 1px solid #000; }
.t-table .right { text-align: right; }
.t-table .cname { font-weight: 600; }
.t-table .cdesc { font-size: 11px; color: #555; }


.t-notice { margin-top: 6px; }
.t-notice ol { padding-left: 18px; margin: 4px 0; font-size: 11px; line-height: 1.6; }
.t-notice li { margin-bottom: 2px; }

.t-footer { margin-top: 8px; }
.t-sep { height: 6px; }
.t-cut {
  text-align: center; font-family: monospace; letter-spacing: -1px;
  font-size: 11px; color: #666; margin-top: 6px; padding: 2px 0;
  border-top: 1px dashed #666; border-bottom: 1px dashed #666;
}

/* 与独立打印窗口使用同样的 30×110mm 标签布局。 */
.tags-wrap {
  display: flex; flex-wrap: wrap; gap: 3mm;
  padding: 5mm;
  background: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  justify-content: flex-start;
  max-width: 100%;
}
.tag-30-110 {
  width: 30mm;
  height: 110mm;
  padding: 2mm;
  border: 1px dashed #ccc;
  display: flex;
  flex-direction: column;
  flex: none;
  background: #fff;
  overflow: hidden;
  color: #000;
  font-family: "Microsoft YaHei", Arial, sans-serif;
}
.tag-head { height: 8mm; display: flex; align-items: center; justify-content: space-between; gap: 1mm; border-bottom: 1px solid #000; font-size: 10px; }
.tag-head strong { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tag-head span { white-space: nowrap; font-weight: 700; }
.tag-category { height: 10mm; display: flex; align-items: center; font-size: 13px; line-height: 1.2; font-weight: 800; overflow: hidden; }
.tag-description { height: 10mm; display: flex; flex-direction: column; gap: 1mm; font-size: 10px; line-height: 1.1; overflow: hidden; }
.tag-description span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tag-scan-zone { position: relative; width: 26mm; height: 60mm; flex: none; overflow: hidden; }
.tag-barcode { position: absolute; width: 56mm; height: 18mm; max-width: none; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(90deg); display: block; }
.tag-code { height: 8mm; display: flex; align-items: center; justify-content: center; font: 700 11px Consolas, "Courier New", monospace; white-space: nowrap; }
.tag-foot { height: 10mm; border-top: 1px solid #000; display: flex; flex-direction: column; justify-content: center; gap: 1mm; font-size: 9px; line-height: 1.1; white-space: nowrap; }
</style>
