<template>
  <div class="shelf-page">
    <header><div><h2>上架 / 下架</h2><p>扫描已回店衣物，系统优先为同一订单分配相邻位置。每个货架号只能挂一件衣物。</p></div><el-button @click="refreshOverview">刷新容量</el-button></header>
    <div v-if="overview" class="capacity-line"><b>{{ overview.free }}</b><span>个空闲位置</span><i/>总容量 {{ overview.maxShelfNo }}　已占用 {{ overview.occupied }}　预留 {{ overview.reserved }}　停用 {{ overview.disabled }}</div>
    <el-tabs v-model="tab" @tab-change="resetWork">
      <el-tab-pane label="上架" name="SHELF"/><el-tab-pane label="移架" name="MOVE"/><el-tab-pane label="货架查询" name="QUERY"/><el-tab-pane v-if="isAdmin" label="货架设置" name="SETTINGS"/>
    </el-tabs>

    <section v-if="tab==='SHELF'||tab==='MOVE'" class="work-area">
      <div class="scan-side">
        <h3>{{ tab==='SHELF'?'扫描衣物并分配位置':'扫描已上架衣物并更换位置' }}</h3>
        <el-input ref="barcodeInput" v-model.trim="barcode" size="large" placeholder="扫描或输入完整衣物码" clearable @keyup.enter="allocate"/>
        <div class="manual"><el-input-number v-model="preferred" :min="1" :max="overview?.maxShelfNo||9999" controls-position="right" placeholder="手动指定（选填）"/><span>留空时自动联排分配</span></div>
        <el-button type="primary" size="large" :disabled="!barcode||!!allocation" :loading="busy" @click="allocate">分配货架号</el-button>
        <p class="rule">只有完成回店签收的衣物可以上架。系统给号后必须确认，5分钟未确认会自动释放。</p>
      </div>
      <div class="allocation-side" :class="{ active: allocation }">
        <template v-if="allocation"><span>请挂到</span><strong>{{ allocation.shelfNo }}</strong><b>号位置</b><p>{{ allocation.categoryName }} · 订单 {{ allocation.orderNo }}</p><div class="actions"><el-button size="large" @click="cancelAllocation">取消分配</el-button><el-button type="success" size="large" :loading="busy" @click="confirm">确认{{ tab==='MOVE'?'移架':'上架' }}</el-button></div></template>
        <template v-else><strong class="waiting">—</strong><p>等待扫描衣物码</p></template>
      </div>
    </section>

    <section v-else-if="tab==='QUERY'" class="query-area">
      <div class="query-row"><el-input v-model.trim="query" placeholder="衣物码、订单号、手机号或货架号" clearable @keyup.enter="search"/><el-button type="primary" :disabled="!query" @click="search">查询</el-button></div>
      <el-table :data="results" border stripe empty-text="暂无在架衣物"><el-table-column prop="shelfNo" label="货架号" width="105"/><el-table-column prop="barcode" label="衣物码" min-width="145"/><el-table-column prop="categoryName" label="衣物" min-width="130"/><el-table-column prop="orderNo" label="订单号" min-width="170"/><el-table-column prop="phone" label="手机号" min-width="140"/><el-table-column label="上架时间" min-width="165"><template #default="{row}">{{ time(row.onShelfTime) }}</template></el-table-column></el-table>
    </section>

    <section v-else class="settings-area">
      <div><h3>调整容量</h3><p>缩小容量前，超出新范围的衣物必须先移架。</p><div class="setting-row"><el-input-number v-model="newMax" :min="1" :max="9999"/><el-button type="primary" @click="resize">保存容量</el-button></div></div>
      <div><h3>停用或恢复位置</h3><p>损坏的挂位停用后不会参与自动分配。</p><div class="setting-row"><el-input-number v-model="manageNo" :min="1" :max="overview?.maxShelfNo||9999"/><el-button type="danger" plain @click="setDisabled(true)">停用</el-button><el-button @click="setDisabled(false)">恢复</el-button></div></div>
    </section>
  </div>
</template>
<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shelfApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
const auth=useAuthStore(),isAdmin=computed(()=>auth.role==='ADMIN'),tab=ref('SHELF'),overview=ref(null),barcode=ref(''),preferred=ref(),allocation=ref(null),busy=ref(false),barcodeInput=ref(null),query=ref(''),results=ref([]),newMax=ref(1700),manageNo=ref(1)
const time=v=>v?String(v).replace('T',' ').slice(0,19):'—'
async function refreshOverview(){overview.value=await shelfApi.overview();newMax.value=overview.value.maxShelfNo}
function resetWork(){if(allocation.value)cancelAllocation();barcode.value='';preferred.value=undefined;nextTick(()=>barcodeInput.value?.focus())}
async function allocate(){if(!barcode.value||allocation.value)return;busy.value=true;try{allocation.value=await shelfApi.allocate({barcode:barcode.value,preferredShelfNo:preferred.value||null,mode:tab.value})}finally{busy.value=false}}
async function confirm(){busy.value=true;try{await shelfApi.confirm(barcode.value,allocation.value.shelfNo);ElMessage.success(`${allocation.value.shelfNo}号位置已确认`);allocation.value=null;barcode.value='';preferred.value=undefined;await refreshOverview();nextTick(()=>barcodeInput.value?.focus())}finally{busy.value=false}}
async function cancelAllocation(){if(allocation.value)await shelfApi.cancel(barcode.value);allocation.value=null;nextTick(()=>barcodeInput.value?.focus())}
async function search(){results.value=await shelfApi.search(query.value)}
async function resize(){await ElMessageBox.confirm(`确认将本店货架容量调整为 ${newMax.value}？`,'调整货架容量',{type:'warning'});await shelfApi.resize(newMax.value);ElMessage.success('货架容量已更新');await refreshOverview()}
async function setDisabled(disabled){const action=disabled?'停用':'恢复';await ElMessageBox.confirm(`确认${action} ${manageNo.value} 号位置？`,`${action}货架位置`,{type:'warning'});await shelfApi.disable(manageNo.value,disabled);ElMessage.success(`${manageNo.value}号位置已${action}`);await refreshOverview()}
onMounted(async()=>{await refreshOverview();nextTick(()=>barcodeInput.value?.focus())})
</script>
<style scoped>.shelf-page{background:#fff;padding:24px;border-radius:12px;color:#263445}header{display:flex;justify-content:space-between;align-items:flex-start}h2{margin:0 0 7px}header p,.rule,.settings-area p{margin:0;color:#65758a}.capacity-line{display:flex;align-items:baseline;gap:8px;margin:22px 0 16px;padding:13px 0;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;color:#64748b}.capacity-line b{font-size:28px;color:#207348}.capacity-line i{width:1px;height:18px;background:#d8e0e8;margin:0 10px}.work-area{display:grid;grid-template-columns:minmax(350px,1fr) minmax(330px,.8fr);gap:28px;padding-top:12px}.scan-side{max-width:560px}.scan-side h3,.settings-area h3{margin:0 0 16px}.manual{display:flex;align-items:center;gap:12px;margin:14px 0}.manual span{color:#718095;font-size:13px}.rule{margin-top:18px;line-height:1.7}.allocation-side{min-height:310px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f5f7f9;border-radius:14px;color:#778599}.allocation-side.active{background:#eef8f2;color:#24583b}.allocation-side>span{font-size:17px}.allocation-side>strong:not(.waiting){font-size:108px;line-height:1;margin:10px 0 0;font-variant-numeric:tabular-nums;letter-spacing:-.03em}.allocation-side>b{font-size:22px}.allocation-side p{margin:16px 0;color:inherit}.waiting{font-size:72px;color:#b5c0ca}.actions{display:flex;gap:12px}.query-row{display:flex;gap:12px;max-width:600px;margin:18px 0}.settings-area{display:grid;grid-template-columns:1fr 1fr;gap:42px;padding-top:18px}.setting-row{display:flex;gap:10px;margin-top:18px}@media(max-width:850px){.work-area,.settings-area{grid-template-columns:1fr}.allocation-side>strong:not(.waiting){font-size:82px}header{gap:15px}}</style>
