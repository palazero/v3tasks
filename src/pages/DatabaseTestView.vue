<template>
  <q-page class="q-pa-md">
    <q-card>
      <q-card-section>
        <div class="text-h6">資料庫測試工具</div>
        <div class="text-caption">管理 IndexedDB 和測試 API 連線</div>
      </q-card-section>

      <q-card-section>
        <div class="q-gutter-md">
          <!-- 清除資料庫 -->
          <div class="row items-center q-gutter-md">
            <q-btn 
              @click="clearDatabase"
              :loading="loading.clear"
              color="negative"
              icon="delete"
            >
              清除 IndexedDB
            </q-btn>
            <div class="text-caption">清除本地資料庫，強制重新初始化</div>
          </div>

          <!-- 重置資料 -->
          <div class="row items-center q-gutter-md">
            <q-btn 
              @click="resetData"
              :loading="loading.reset"
              color="warning"
              icon="refresh"
            >
              重置資料
            </q-btn>
            <div class="text-caption">清除並重新初始化資料</div>
          </div>

          <!-- 檢查服務配置 -->
          <div class="row items-center q-gutter-md">
            <q-btn 
              @click="checkConfig"
              color="info"
              icon="settings"
            >
              檢查配置
            </q-btn>
            <div class="text-caption">顯示當前服務配置</div>
          </div>

          <!-- 強制重新載入 -->
          <div class="row items-center q-gutter-md">
            <q-btn 
              @click="forceReload"
              color="primary"
              icon="refresh"
            >
              重新載入頁面
            </q-btn>
            <div class="text-caption">清除快取並重新載入</div>
          </div>
        </div>
      </q-card-section>

      <!-- 配置資訊 -->
      <q-card-section v-if="configInfo">
        <div class="text-subtitle2">當前配置</div>
        <pre class="bg-grey-1 q-pa-sm rounded-borders">{{ configInfo }}</pre>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { db } from '@/services/infrastructure/database/db/database'
import { clearMockData, resetMockData } from '@/services/infrastructure/mock/mock-data.service'
import { getServiceConfig } from '@/services/infrastructure/service-adapter'

const $q = useQuasar()

// 載入狀態
const loading = ref({
  clear: false,
  reset: false
})

const configInfo = ref<string>('')

// 清除資料庫
async function clearDatabase() {
  loading.value.clear = true
  
  try {
    await db.clearAllData()
    
    $q.notify({
      type: 'positive',
      message: 'IndexedDB 已清除',
      position: 'top'
    })
    
    // 清除 localStorage
    localStorage.clear()
    
    setTimeout(() => {
      window.location.reload()
    }, 1000)
    
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '清除資料庫失敗',
      position: 'top'
    })
    console.error('Clear database error:', error)
  } finally {
    loading.value.clear = false
  }
}

// 重置資料
async function resetData() {
  loading.value.reset = true
  
  try {
    await resetMockData()
    
    $q.notify({
      type: 'positive',
      message: '資料已重置',
      position: 'top'
    })
    
    setTimeout(() => {
      window.location.reload()
    }, 1000)
    
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '重置資料失敗',
      position: 'top'
    })
    console.error('Reset data error:', error)
  } finally {
    loading.value.reset = false
  }
}

// 檢查配置
function checkConfig() {
  const config = getServiceConfig()
  const envVars: Record<string, any> = {}
  
  for (const key in import.meta.env) {
    if (key.startsWith('VITE_')) {
      envVars[key] = import.meta.env[key]
    }
  }
  
  configInfo.value = JSON.stringify({
    serviceConfig: config,
    envVars,
    localStorage: {
      currentUserId: localStorage.getItem('currentUserId'),
      auth_token: localStorage.getItem('auth_token')
    }
  }, null, 2)
}

// 強制重新載入
function forceReload() {
  // 清除快取
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name)
      })
    })
  }
  
  // 重新載入
  window.location.reload()
}
</script>

<style scoped>
pre {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}
</style>