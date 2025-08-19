<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section>
        <div class="text-h6">環境變數檢查</div>
        <div class="text-caption">檢查 Vite 環境變數讀取狀態</div>
      </q-card-section>

      <q-card-section>
        <div class="q-gutter-md">
          <div>
            <strong>VITE_SERVICE_MODE:</strong> 
            <q-chip :color="serviceMode === 'api' ? 'positive' : 'orange'">
              {{ serviceMode || 'undefined' }}
            </q-chip>
          </div>
          
          <div>
            <strong>VITE_API_BASE_URL:</strong> 
            <code>{{ apiBaseUrl || 'undefined' }}</code>
          </div>
          
          <div>
            <strong>VITE_ENABLE_MOCK_DATA:</strong> 
            <q-chip :color="enableMockData ? 'positive' : 'negative'">
              {{ enableMockData }}
            </q-chip>
          </div>

          <div>
            <strong>服務配置:</strong>
            <pre class="bg-grey-1 q-pa-sm rounded-borders">{{ JSON.stringify(currentConfig, null, 2) }}</pre>
          </div>

          <div>
            <strong>所有環境變數:</strong>
            <pre class="bg-grey-1 q-pa-sm rounded-borders">{{ JSON.stringify(allEnvVars, null, 2) }}</pre>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getServiceConfig } from '@/services/infrastructure/service-adapter'

// 環境變數
const serviceMode = computed(() => import.meta.env.VITE_SERVICE_MODE)
const apiBaseUrl = computed(() => import.meta.env.VITE_API_BASE_URL)
const enableMockData = computed(() => import.meta.env.VITE_ENABLE_MOCK_DATA === 'true')

// 服務配置
const currentConfig = computed(() => getServiceConfig())

// 所有環境變數
const allEnvVars = computed(() => {
  const env: Record<string, any> = {}
  for (const key in import.meta.env) {
    if (key.startsWith('VITE_')) {
      env[key] = import.meta.env[key]
    }
  }
  return env
})
</script>

<style scoped>
pre {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}

code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}
</style>