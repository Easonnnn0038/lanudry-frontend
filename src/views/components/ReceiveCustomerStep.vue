<template>
  <div class="step-panel">
    <div class="card-box">
      <div class="card-title"><el-icon :size="18"><User /></el-icon><span>客户信息</span><el-tag v-if="isNewCustomer" type="success" size="small" effect="plain">新客户</el-tag><el-tag v-else-if="customer.phone" type="info" size="small" effect="plain">老客户</el-tag></div>
      <el-form :model="customer" label-width="80px" size="large" @submit.prevent="$emit('search')">
        <el-form-item label="手机号" class="phone-item"><el-input v-model="customer.phone" placeholder="输入11位手机号后回车查询" maxlength="11" clearable @keyup.enter="$emit('search')" @blur="$emit('phone-blur')"><template #append><el-button :icon="Search" type="primary" @click="$emit('search')">查询</el-button></template></el-input></el-form-item>
        <el-form-item label="姓名"><el-input v-model="customer.name" placeholder="请输入姓名" maxlength="20" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="customer.address" placeholder="小区/栋/门牌号（可选）" maxlength="100" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="customer.remark" type="textarea" :rows="2" maxlength="100" placeholder="客户特殊标记（可选）" /></el-form-item>
      </el-form>
      <div v-if="customerDetail" class="customer-stats"><span>累计 <b>{{ customerDetail.totalCount }}</b> 件</span><span class="divider">|</span><span>累计 <b>¥{{ format(customerDetail.totalAmount) }}</b></span></div>
    </div>
  </div>
</template>

<script setup>
import { User, Search } from '@element-plus/icons-vue'
defineProps({ customer:{type:Object,required:true}, customerDetail:Object, isNewCustomer:Boolean, format:{type:Function,required:true} })
defineEmits(['search','phone-blur'])
</script>

<style scoped>
.step-panel{max-width:1100px;margin:0 auto}.card-box{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.04);padding:20px 24px;margin-bottom:12px}.card-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:16px;color:#303133;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ebeef5}.phone-item :deep(.el-input-group){flex-wrap:nowrap}.customer-stats{margin-top:8px;font-size:14px;color:#606266;background:#f5f7fa;border-radius:4px;padding:10px 12px}.customer-stats b{color:#409eff}.divider{margin:0 10px;color:#dcdfe6}
</style>
