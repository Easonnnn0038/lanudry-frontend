<template>
  <el-tag :type="source === 'MINIAPP' ? 'success' : 'info'" effect="plain" size="small" class="order-source">
    {{ source === 'MINIAPP' ? '小程序下单' : '门店下单' }}
  </el-tag>
</template>

<script setup>
defineProps({ source: { type: String, default: 'STORE' } })
</script>

<style scoped>
.order-source { margin-inline-start: 8px; white-space: nowrap; font-weight: 500; }
</style>
