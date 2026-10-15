<template>
  <div class="step-panel"><div class="card-box">
    <div class="card-title"><el-icon :size="18"><Money /></el-icon><span>收款汇总</span></div>
    <el-alert v-if="pickupSource" title="此单统一寄回家。这里确认洗护金额，不在门店收款；运费配置后生成最终账单，顾客在小程序付款。" type="info" :closable="false" show-icon />
    <el-alert v-if="rewashSource" title="返洗订单默认免费，不扣会员余额、不重复计入营业额。" type="success" :closable="false" show-icon />
    <div v-else class="urgent-toggle"><el-checkbox v-model="form.urgentFlag" :true-value="1" :false-value="0" @change="$emit('recalculate')"><el-icon><AlarmClock /></el-icon> 加急订单（整体加价 20%）</el-checkbox></div>
    <div class="summary-block">
      <div class="line"><span>衣物件数</span><b>{{ totals.count }} 件</b></div>
      <div class="line"><span>原价合计</span><span>¥{{ format(totals.totalAmount) }}</span></div>
      <div v-if="totals.discountAmount > 0" class="line discount"><span>优惠（{{ totals.discountRate }}折）</span><span class="neg">-¥{{ format(totals.discountAmount) }}</span></div>
      <div class="line"><span>折扣后金额</span><span>¥{{ format(totals.actualAmount) }}</span></div>
      <div v-if="form.urgentFlag === 1" class="line urgent"><span>加急加价（20%）</span><span class="pos">+¥{{ format(totals.urgentSurcharge) }}</span></div>
      <div class="line highlight"><span>洗衣应付</span><b class="big">¥{{ format(totals.payableAmount) }}</b></div>
      <div v-if="form.newCardFlag === 1" class="line"><span>办卡金额</span><b class="new-card">¥{{ format(totals.newCardAmount) }}</b></div>
      <div v-if="form.rechargeFlag === 1" class="line"><span>充值金额</span><b class="new-card">¥{{ format(totals.rechargeAmount) }}</b></div>
      <div class="line total-line"><span>{{ pickupSource ? '洗护待付（运费另计）' : '本次应收' }}</span><b class="huge">¥{{ format(totals.totalReceivable) }}</b></div>
    </div>
    <el-divider />
    <div v-if="!rewashSource && !pickupSource" class="payment-block">
      <div class="block-title">支付方式</div>
      <div v-if="canUseCard" class="card-pay-toggle"><el-checkbox v-model="form.useCardPay" size="large" @change="$emit('recalculate')">使用会员卡余额支付（余额：¥{{ format(cardBalance) }}）</el-checkbox></div>
      <div v-if="canUseCard && form.useCardPay" class="pay-options">
        <div class="card-deduct-box">
          <div v-if="form.newCardFlag === 1" class="line"><span>办卡充值</span><b class="new-card">¥{{ format(totals.newCardAmount) }}</b></div>
          <div v-else class="line"><span>会员卡余额</span><b>¥{{ format(cardBalance) }}</b></div>
          <div v-if="form.rechargeFlag === 1" class="line"><span>追加充值</span><b class="new-card">¥{{ format(totals.rechargeAmount) }}</b></div>
          <div class="line success"><span>卡扣金额</span><b>-¥{{ format(totals.cardDeduct) }}</b></div>
          <div v-if="totals.extraPayment > 0" class="line danger"><span>补差金额</span><b>¥{{ format(totals.extraPayment) }}</b></div>
          <div v-else class="line success"><span>补差金额</span><b>¥0.00（余额充足）</b></div>
          <div class="line balance-after"><span>支付后卡内余额</span><b class="pos">¥{{ format(cardBalanceAfter) }}</b></div>
          <div class="line danger total-pay"><span>本次需支付</span><b>¥{{ format(totals.totalReceivable) }}</b></div>
        </div>
        <div v-if="totals.extraPayment > 0" class="extra-pay-row"><span class="extra-label">补差方式：</span><el-radio-group v-model="form.extraMethod" @change="$emit('recalculate')"><el-radio-button label="CASH">现金</el-radio-button><el-radio-button label="WECHAT">微信</el-radio-button><el-radio-button label="ALIPAY">支付宝</el-radio-button></el-radio-group></div>
      </div>
      <div v-else class="pay-options"><el-radio-group v-model="form.extraMethod" class="pay-radio" @change="$emit('recalculate')"><el-radio-button label="CASH"><el-icon><Money /></el-icon> 现金</el-radio-button><el-radio-button label="WECHAT">微信</el-radio-button><el-radio-button label="ALIPAY">支付宝</el-radio-button></el-radio-group><div class="card-deduct-box no-card"><div class="line danger"><span>应付金额</span><b>¥{{ format(totals.totalReceivable) }}</b></div></div></div>
    </div>
    <el-divider />
    <div class="paid-block"><el-form label-width="80px">
      <el-form-item v-if="!rewashSource && !pickupSource" label="实收金额"><el-input-number v-model="form.totalPaid" :min="0" :precision="2" :step="10" size="large" controls-position="right" style="width:100%" @change="$emit('paid-manually')" /></el-form-item>
      <el-form-item v-if="totals.debtAmount > 0" label="欠款"><el-alert type="warning" show-icon :closable="false" :title="`本次实收少于应收，将记录欠款 ¥${format(totals.debtAmount)}`" /></el-form-item>
      <el-form-item label="整单备注"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" placeholder="整单备注/客户留言（可选）" /></el-form-item>
    </el-form></div>
  </div></div>
</template>

<script setup>
import { Money, AlarmClock } from '@element-plus/icons-vue'
defineProps({ form:{type:Object,required:true}, pickupSource:Object, rewashSource:Object, totals:{type:Object,required:true}, canUseCard:Boolean, cardBalance:Number, cardBalanceAfter:Number, format:{type:Function,required:true} })
defineEmits(['recalculate','paid-manually'])
</script>

<style scoped>
.step-panel{max-width:1100px;margin:0 auto}.card-box{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.04);padding:20px 24px;margin-bottom:12px}.card-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:16px;color:#303133;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ebeef5}.urgent-toggle{background:#fef0f0;border:1px solid #fde2e2;border-radius:6px;padding:12px 14px;margin-bottom:12px}.urgent-toggle :deep(.el-checkbox__label){font-size:15px;font-weight:600;color:#c2413b}.summary-block .line{display:flex;justify-content:space-between;align-items:center;padding:8px 2px;font-size:14px;color:#606266}.summary-block .line.highlight{padding:12px 4px;border-top:1px dashed #ebeef5;border-bottom:1px dashed #ebeef5;margin:8px 0}.summary-block .line.discount .neg{color:#26823d}.summary-block .line.urgent .pos{color:#c2413b;font-weight:600}.summary-block .line.total-line{padding:14px 4px;background:linear-gradient(90deg,#ecf5ff 0%,#e1f3d8 100%);border-radius:6px;margin-top:8px}.summary-block .huge{color:#c2413b;font-size:26px;font-weight:700}.new-card{color:#9a5b00}.block-title{font-weight:600;color:#303133;margin:4px 0 12px;font-size:15px}.pay-radio{display:flex;flex-wrap:wrap;margin-bottom:12px}.card-deduct-box{background:#fdf6ec;border:1px solid #faecd8;border-radius:6px;padding:12px 14px;margin-top:8px}.card-deduct-box .line{display:flex;justify-content:space-between;gap:12px;padding:5px 0}.card-deduct-box .line.success b{color:#26823d}.card-deduct-box .line.danger b{color:#c2413b;font-size:16px}.card-deduct-box .line.total-pay{border-top:2px solid #e6a23c;margin-top:8px;padding-top:10px;font-weight:600;font-size:16px}.card-deduct-box .line.total-pay b{font-size:18px}.card-deduct-box .line.balance-after{background:#f0f9eb;border-radius:4px;padding:8px 10px;margin:5px 0}.card-deduct-box .line.balance-after b{color:#26823d;font-size:16px}.card-pay-toggle{margin-bottom:12px}.card-pay-toggle :deep(.el-checkbox__label){font-weight:600}.extra-pay-row{display:flex;align-items:center;gap:8px;margin-top:10px}.extra-label{font-size:14px;color:#606266;white-space:nowrap}.paid-block :deep(.el-input-number){width:100%}@media(max-width:760px){.extra-pay-row{align-items:flex-start;flex-direction:column}.card-deduct-box .line{flex-wrap:wrap}}
</style>
