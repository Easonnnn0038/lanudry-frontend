<template>
  <div class="step-panel">
    <div class="card-box">
      <div class="card-title">
        <el-icon :size="18"><CreditCard /></el-icon><span>会员卡</span>
        <el-tooltip v-if="!currentCard && form.newCardFlag !== 1" content="请先勾选下方「收衣同时办卡」" placement="top">
          <el-button type="primary" link class="ml-auto" disabled><el-icon><Plus /></el-icon>办卡</el-button>
        </el-tooltip>
        <el-button v-else-if="!currentCard" type="primary" link class="ml-auto" @click="$emit('open-card')"><el-icon><Plus /></el-icon>办卡</el-button>
      </div>

      <div v-if="currentCard" class="mc-box">
        <div class="mc-header">
          <div><div class="mc-no">{{ currentCard.cardNo }}</div><div class="mc-type"><el-tag type="warning" size="small">{{ currentCard.cardTypeName }}</el-tag><span class="mc-rate">折扣 {{ currentCard.discountRate }} 折</span></div></div>
          <div class="mc-balance"><div class="label">余额</div><div class="value">¥{{ format(currentCard.balance) }}</div></div>
        </div>
        <div class="mc-stats"><span>累计充值 ¥{{ format(currentCard.totalRecharge) }}</span><span>累计消费 ¥{{ format(currentCard.totalConsume) }}</span></div>
        <div class="mc-actions"><el-button size="small" type="danger" link @click="$emit('detach-card')">不使用此卡</el-button></div>
      </div>
      <el-empty v-else description="暂无会员卡，可勾选「收衣同时办卡」" :image-size="70">
        <template #footer><el-button type="primary" link @click="$emit('open-card')">新办一张会员卡</el-button></template>
      </el-empty>

      <div v-if="currentCard" class="new-card-toggle">
        <el-checkbox v-model="form.rechargeFlag" :true-value="1" :false-value="0" @change="$emit('recharge-change', $event)">收衣同时充值</el-checkbox>
        <div v-if="form.rechargeFlag === 1" class="new-card-options">
          <el-form label-width="80px">
            <el-form-item label="充值类型" required><el-select v-model="form.rechargeCardTypeId" placeholder="选择充值类型" style="width:100%" @change="$emit('recalculate')"><el-option v-for="type in cardTypes" :key="type.id" :label="`${type.name} · 充 ¥${type.amount}`" :value="type.id" /></el-select></el-form-item>
            <el-form-item label="支付方式" required><el-radio-group v-model="form.rechargePayMethod"><el-radio-button label="CASH">现金</el-radio-button><el-radio-button label="WECHAT">微信</el-radio-button><el-radio-button label="ALIPAY">支付宝</el-radio-button></el-radio-group></el-form-item>
            <el-alert type="success" :closable="false" show-icon :title="`充值 ¥${rechargeType?.amount || 0} 将计入本次收款，充后余额 ¥${format(rechargeBalanceAfter)}`" />
          </el-form>
        </div>
      </div>

      <div v-else class="new-card-toggle">
        <el-checkbox v-model="form.newCardFlag" :true-value="1" :false-value="0" @change="$emit('new-card-change', $event)">收衣同时办卡</el-checkbox>
        <div v-if="form.newCardFlag === 1" class="new-card-options">
          <el-form label-width="80px">
            <el-form-item label="卡类型" required><el-select v-model="form.newCardTypeId" placeholder="选择卡类型" style="width:100%" @change="$emit('recalculate')"><el-option v-for="type in cardTypes" :key="type.id" :label="`${type.name} · 充 ¥${type.amount} · ${type.discountRate}折`" :value="type.id" /></el-select></el-form-item>
            <el-form-item label="支付方式" required><el-radio-group v-model="form.newCardPayMethod"><el-radio-button label="CASH">现金</el-radio-button><el-radio-button label="WECHAT">微信</el-radio-button><el-radio-button label="ALIPAY">支付宝</el-radio-button></el-radio-group></el-form-item>
            <el-alert type="success" :closable="false" show-icon :title="`所选卡：¥${newCardType?.amount || 0} 将作为余额到账，折扣 ${newCardType?.discountRate || '—'} 折`" />
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { CreditCard, Plus } from '@element-plus/icons-vue'
defineProps({ form:{type:Object,required:true}, currentCard:Object, cardTypes:{type:Array,required:true}, newCardType:Object, rechargeType:Object, rechargeBalanceAfter:Number, format:{type:Function,required:true} })
defineEmits(['open-card','detach-card','new-card-change','recharge-change','recalculate'])
</script>

<style scoped>
.step-panel{max-width:1100px;margin:0 auto}.card-box{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.04);padding:20px 24px;margin-bottom:12px}.card-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:16px;color:#303133;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ebeef5}.ml-auto{margin-left:auto}.mc-box{background:linear-gradient(135deg,#fa8c16 0%,#f5222d 100%);color:#fff;border-radius:8px;padding:16px;margin-bottom:12px}.mc-header{display:flex;justify-content:space-between}.mc-no{font-family:monospace;letter-spacing:1px;font-size:16px;font-weight:700}.mc-type{margin-top:6px;display:flex;align-items:center;gap:8px}.mc-rate{font-size:12px;opacity:.9}.mc-balance{text-align:right}.mc-balance .label{font-size:12px;opacity:.85}.mc-balance .value{font-size:24px;font-weight:700;margin-top:2px}.mc-stats{margin-top:12px;font-size:13px;opacity:.92;display:flex;justify-content:space-between;gap:12px}.mc-actions{margin-top:12px;display:flex;justify-content:flex-end}.mc-actions .el-button{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.3);color:#fff}.new-card-toggle{margin-top:12px;background:#f5f7fa;border-radius:6px;padding:12px 14px}.new-card-options{margin-top:12px}.new-card-options .el-form-item{margin-bottom:10px}@media(max-width:760px){.mc-stats{flex-wrap:wrap}}
</style>
