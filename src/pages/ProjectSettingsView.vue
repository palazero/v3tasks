<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">專案設定</div>
    
    <q-card>
      <q-card-section>
        <div class="text-h6">專案資訊</div>
        <p>專案 ID: {{ projectId }}</p>
        <p>此頁面正在開發中...</p>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
// Props
defineProps<{
  projectId: string
}>()
</script>