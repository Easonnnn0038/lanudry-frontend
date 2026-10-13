<template>
  <div class="step-panel"><div class="card-box photo-card">
    <div class="card-title"><el-icon :size="18"><Camera /></el-icon><span>瑕疵拍照取证</span><el-tag v-if="photos.length" type="warning" size="small" class="photo-count">已拍 {{ photos.length }} 张</el-tag></div>
    <div class="pedal-status" :class="{ active: pedalEnabled }"><el-icon :size="14"><VideoCamera /></el-icon><span>脚踏板：{{ pedalEnabled ? `已连接 (键: ${pedalKeyName})` : '未启用' }}</span><el-button link size="small" @click="$emit('toggle-pedal')">{{ pedalEnabled ? '关闭' : '启用' }}</el-button></div>
    <div class="photo-actions">
      <el-button :icon="Camera" type="primary" size="large" :loading="uploading" @click="openCamera"><input ref="cameraInput" type="file" accept="image/*" capture="environment" hidden @change="$emit('capture', $event)" />拍照</el-button>
      <el-button :icon="UploadFilled" size="large" :disabled="uploading" @click="fileInput?.click()"><input ref="fileInput" type="file" accept="image/*" multiple hidden @change="$emit('capture', $event)" />上传</el-button>
      <el-button v-if="photos.length" :icon="Delete" type="danger" link @click="$emit('clear')">清空</el-button>
    </div>
    <div v-if="photos.length" class="photo-grid">
      <div v-for="(photo,idx) in photos" :key="photo.id||idx" class="photo-item">
        <img :src="photoUrl(photo)" :alt="`瑕疵照片 ${idx+1}`" @click="$emit('preview',idx)" />
        <div v-if="photo.defectType" class="photo-defect-tag"><el-tag v-for="type in photo.defectType.split(',').filter(Boolean)" :key="type" size="small" type="danger" effect="dark">{{type}}</el-tag><span v-if="photo.defectRemark" class="defect-remark">{{photo.defectRemark}}</span></div>
        <div v-else class="photo-defect-tag empty"><el-button link size="small" type="warning" @click="$emit('edit',idx)">点此选瑕疵类型</el-button></div>
        <button class="photo-delete" type="button" :aria-label="`删除第 ${idx+1} 张照片`" @click.stop="$emit('remove',idx)"><el-icon :size="14"><Close /></el-icon></button>
      </div>
    </div>
    <div v-else class="photo-empty"><el-icon :size="60" color="#c0c4cc"><Picture /></el-icon><div>踩脚踏板或点拍照上传瑕疵照片</div><div class="muted">每张照片需要选择瑕疵类型</div></div>
    <el-image-viewer v-if="previewVisible" :url-list="previewUrls" :initial-index="previewIndex" @close="$emit('close-preview')" />
  </div></div>
</template>

<script setup>
import { ref } from 'vue'
import { Camera, UploadFilled, Delete, Close, Picture, VideoCamera } from '@element-plus/icons-vue'
defineProps({photos:{type:Array,default:()=>[]},pedalEnabled:Boolean,pedalKeyName:String,uploading:Boolean,photoUrl:{type:Function,required:true},previewVisible:Boolean,previewUrls:{type:Array,default:()=>[]},previewIndex:Number})
defineEmits(['toggle-pedal','capture','clear','preview','edit','remove','close-preview'])
const cameraInput=ref(),fileInput=ref()
const openCamera=()=>cameraInput.value?.click()
defineExpose({openCamera})
</script>

<style scoped>
.step-panel{max-width:1100px;margin:0 auto}.card-box{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.04);padding:20px 24px;margin-bottom:12px}.card-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:16px;color:#303133;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ebeef5}.photo-count{margin-left:auto}.pedal-status{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:6px;font-size:13px;background:#f4f4f5;color:#909399;margin-bottom:12px}.pedal-status.active{background:#e8f4ff;color:#409eff}.pedal-status .el-button{margin-left:auto}.photo-actions{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.photo-item{position:relative;border-radius:8px;overflow:hidden;border:1px solid #ebeef5;background:#fff}.photo-item img{width:100%;aspect-ratio:1;object-fit:cover;display:block;cursor:pointer}.photo-defect-tag{padding:8px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;background:#f5f7fa;min-height:40px}.photo-defect-tag.empty{justify-content:center}.defect-remark{font-size:12px;color:#6b7280;width:100%}.photo-delete{position:absolute;top:6px;right:6px;width:32px;height:32px;border:0;background:rgba(0,0,0,.65);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer}.photo-delete:hover{background:#dc2626}.photo-delete:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}.photo-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 0;color:#6b7280;font-size:15px;gap:10px}.muted{color:#6b7280;font-size:12px}@media(max-width:760px){.photo-grid{grid-template-columns:repeat(2,1fr)}}
</style>
