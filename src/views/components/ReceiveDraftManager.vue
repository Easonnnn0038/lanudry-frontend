<template>
  <div class="draft-toolbar">
    <div><b>{{ title }}</b><span>{{ subtitle }}</span></div>
    <div v-if="!pickupSource && !rewashSource" class="draft-actions">
      <el-button @click="$emit('save')">保存挂单</el-button>
      <el-button type="primary" plain @click="open = true">挂单记录（{{ drafts.length }}）</el-button>
    </div>
  </div>
  <el-dialog v-model="open" title="本机挂单记录" width="720px">
    <el-empty v-if="!drafts.length" description="暂无挂单" />
    <div v-else class="draft-list">
      <div v-for="draft in drafts" :key="draft.id" class="draft-row">
        <div>
          <div class="draft-name"><b>{{ draft.customer?.name || '未填写姓名' }}</b><span>{{ draft.customer?.phone || '未填写手机号' }}</span><el-tag v-if="isExpired(draft)" type="danger" size="small">已过期</el-tag></div>
          <p>{{ draft.form?.items?.length || 0 }} 件衣物 · 保存于 {{ formatTime(draft.updatedAt) }}</p>
        </div>
        <div><el-button type="primary" link @click="$emit('restore', draft); open = false">继续录入</el-button><el-button type="danger" link @click="$emit('delete', draft.id)">删除</el-button></div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ pickupSource:Object, rewashSource:Object, drafts:{type:Array,default:()=>[]}, isExpired:{type:Function,required:true} })
defineEmits(['save','restore','delete'])
const open = defineModel({ type:Boolean, default:false })
const title = computed(() => props.pickupSource ? `上门预约导入 · ${props.pickupSource.pickupNo}` : props.rewashSource ? `${props.rewashSource.rewashType==='STORE_RETURN'?'店返':'客返'}录入 · 来源订单 ${props.rewashSource.sourceOrderNo}` : '门店收衣')
const subtitle = computed(() => props.pickupSource ? '顾客和衣物已带入，请按正常收衣流程核对并结算' : props.rewashSource ? `返洗原因：${props.rewashSource.reason}` : '本机自动保存，24小时后标记过期')
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { hour12:false }) : '—'
</script>

<style scoped>
.draft-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 16px;margin-bottom:12px;background:#fff;border:1px solid #dfe6ee;border-radius:12px}.draft-toolbar b{display:block;color:#1f2d3d}.draft-toolbar span{display:block;margin-top:3px;color:#526579;font-size:13px}.draft-actions{display:flex;gap:8px;flex:none}.draft-list{display:grid;gap:10px}.draft-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;border:1px solid #dfe6ee;border-radius:12px}.draft-name{display:flex;align-items:center;gap:10px}.draft-name span{color:#526579;font-variant-numeric:tabular-nums}.draft-row p{margin:6px 0 0;color:#607286;font-size:13px}@media(max-width:760px){.draft-toolbar,.draft-row{align-items:stretch;flex-direction:column}.draft-actions{width:100%}}
</style>
