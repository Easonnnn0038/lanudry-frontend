<template>
  <div class="page">
    <header><div><h2>衣物项目与定价</h2><p>价格修改仅影响之后新增的订单，历史订单保持原价。</p></div><el-button type="primary" @click="edit()">新增项目</el-button></header>
    <el-table :data="rows" border stripe v-loading="loading">
      <el-table-column prop="name" label="项目名称" min-width="180"/><el-table-column label="分组" width="130"><template #default="{row}">{{ groups[row.categoryGroup]||row.categoryGroup }}</template></el-table-column>
      <el-table-column label="标准价格" width="130"><template #default="{row}">¥{{ Number(row.price).toFixed(2) }}/{{row.unit}}</template></el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80"/><el-table-column label="状态" width="90"><template #default="{row}"><el-tag :type="row.status===1?'success':'info'">{{row.status===1?'启用':'停用'}}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="100"><template #default="{row}"><el-button v-if="row.categoryGroup!=='CUSTOM'" link type="primary" @click="edit(row)">编辑</el-button><span v-else>系统保留</span></template></el-table-column>
    </el-table>
    <el-dialog v-model="visible" :title="form.id?'编辑衣物项目':'新增衣物项目'" width="480px">
      <el-form label-width="90px"><el-form-item label="项目名称"><el-input v-model.trim="form.name" maxlength="100"/></el-form-item><el-form-item label="分组"><el-select v-model="form.categoryGroup" style="width:100%"><el-option v-for="(label,key) in groups" :key="key" :label="label" :value="key"/></el-select></el-form-item><el-form-item label="标准价格"><el-input-number v-model="form.price" :min="0" :precision="2"/></el-form-item><el-form-item label="单位"><el-input v-model.trim="form.unit" maxlength="10"/></el-form-item><el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0"/></el-form-item><el-form-item label="状态"><el-switch v-model="enabled" active-text="启用" inactive-text="停用"/></el-form-item></el-form>
      <template #footer><el-button @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" :disabled="!form.name||!form.categoryGroup||!form.unit" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed,onMounted,reactive,ref } from 'vue'
import { ElMessage } from 'element-plus'
import { categoryApi } from '@/api'
const groups={CLOTHES:'衣物类',SHOES:'鞋类',HOME:'家纺卧室',IRON:'单烫类',LEATHER:'皮衣/奢饰品',BAG:'包包类'}
const rows=ref([]),loading=ref(false),visible=ref(false),saving=ref(false),form=reactive({id:null,name:'',categoryGroup:'CLOTHES',price:0,unit:'件',sortOrder:0,status:1})
const enabled=computed({get:()=>form.status===1,set:v=>form.status=v?1:0})
async function load(){loading.value=true;try{rows.value=await categoryApi.adminList()}finally{loading.value=false}}
function edit(row){Object.assign(form,row?{...row,price:Number(row.price)}:{id:null,name:'',categoryGroup:'CLOTHES',price:0,unit:'件',sortOrder:0,status:1});visible.value=true}
async function save(){saving.value=true;try{await categoryApi.save({...form});visible.value=false;ElMessage.success('衣物项目已保存');await load()}finally{saving.value=false}}
onMounted(load)
</script>
<style scoped>.page{background:#fff;padding:24px;border-radius:12px;color:#263445}header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}h2{margin:0 0 7px}header p{margin:0;color:#667588}</style>
