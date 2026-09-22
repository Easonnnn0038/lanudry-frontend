<template>
  <div class="page">
    <div class="heading"><div><h2>错误回店</h2><p>仅管理员可登记和处理。本店异常大件冻结；错店大件不能在本店签收。</p></div><el-button @click="load">刷新</el-button></div>
    <el-form :model="form" label-width="90px" class="form" @submit.prevent>
      <el-form-item label="大件码"><el-input v-model.trim="form.packageNo" placeholder="PK..." /></el-form-item>
      <el-form-item label="异常类型"><el-select v-model="form.type"><el-option label="缺件" value="MISSING"/><el-option label="错件" value="WRONG_ITEM"/><el-option label="错店" value="WRONG_STORE"/><el-option label="其他" value="OTHER"/></el-select></el-form-item>
      <el-form-item label="异常说明"><el-input v-model.trim="form.description" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
      <el-form-item><el-button type="danger" :disabled="!form.packageNo||!form.description" @click="create">登记异常</el-button></el-form-item>
    </el-form>
    <el-table :data="rows" border stripe v-loading="loading" empty-text="暂无错误回店记录">
      <el-table-column prop="packageNo" label="大件码" min-width="155"/><el-table-column prop="orderNo" label="订单号" min-width="155"/>
      <el-table-column label="类型" width="90"><template #default="{row}">{{ labels[row.type]||row.type }}</template></el-table-column>
      <el-table-column prop="description" label="异常说明" min-width="200"/><el-table-column prop="status" label="状态" width="100"/>
      <el-table-column prop="resolutionNote" label="处理说明" min-width="190"/>
      <el-table-column label="操作" min-width="210"><template #default="{row}"><template v-if="row.status==='OPEN'"><el-button size="small" @click="resolve(row,'RETURNED')">已退回工厂</el-button><el-button v-if="row.type!=='WRONG_STORE'" size="small" type="primary" @click="resolve(row,'RECHECK')">重新核对</el-button></template></template></el-table-column>
    </el-table>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { storeOperationsApi } from '@/api'
const rows=ref([]),loading=ref(false),form=reactive({packageNo:'',type:'MISSING',description:''})
const labels={MISSING:'缺件',WRONG_ITEM:'错件',WRONG_STORE:'错店',OTHER:'其他'}
async function load(){loading.value=true;try{rows.value=await storeOperationsApi.errors()}finally{loading.value=false}}
async function create(){await ElMessageBox.confirm('确认登记异常？本店待签收大件将被冻结。','登记错误回店',{type:'warning'});await storeOperationsApi.createError({...form});form.packageNo='';form.description='';ElMessage.success('异常已登记');await load()}
async function resolve(row,action){const {value}=await ElMessageBox.prompt('请填写处理经过。重新核对会清空此前扫描记录，并恢复逐件签收。','处理异常',{inputValidator:v=>!!v?.trim()||'请填写处理说明'});await storeOperationsApi.resolveError(row.id,action,value.trim());ElMessage.success('已记录处理结果');await load()}
onMounted(load)
</script>
<style scoped>.page{background:#fff;padding:24px;border-radius:12px}.heading{display:flex;justify-content:space-between;margin-bottom:20px}.heading h2{margin:0 0 6px}.heading p{margin:0;color:#64748b}.form{max-width:650px;padding:18px;background:#f8fafc;margin-bottom:24px}.form .el-select{width:100%}</style>
