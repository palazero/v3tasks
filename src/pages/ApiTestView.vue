<template>
  <q-page class="q-pa-md">
    <div class="row q-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6">API 測試工具</div>
            <div class="text-caption">測試前後端 API 整合狀態</div>
          </q-card-section>

          <q-card-section>
            <div class="q-gutter-md">
              <!-- 服務模式切換 -->
              <div class="row items-center q-gutter-md">
                <q-btn-toggle
                  v-model="serviceMode"
                  @update:model-value="onServiceModeChange"
                  :options="[
                    {label: '本地模式', value: 'local'},
                    {label: 'API 模式', value: 'api'}
                  ]"
                  color="primary"
                />
                <q-chip 
                  :color="serviceMode === 'api' ? 'positive' : 'orange'"
                  text-color="white"
                  icon="settings"
                >
                  {{ serviceMode === 'api' ? 'API 模式' : '本地模式' }}
                </q-chip>
              </div>

              <!-- 健康檢查 -->
              <div class="row items-center q-gutter-md">
                <q-btn 
                  @click="testHealthCheck"
                  :loading="loading.health"
                  color="primary"
                  icon="favorite"
                >
                  健康檢查
                </q-btn>
                <q-chip 
                  v-if="healthStatus !== null"
                  :color="healthStatus ? 'positive' : 'negative'"
                  text-color="white"
                  :icon="healthStatus ? 'check' : 'close'"
                >
                  {{ healthStatus ? '後端正常' : '後端異常' }}
                </q-chip>
              </div>

              <!-- 用戶 API 測試 -->
              <div class="row items-center q-gutter-md">
                <q-btn 
                  @click="testUserApi"
                  :loading="loading.users"
                  color="secondary"
                  icon="people"
                >
                  測試用戶 API
                </q-btn>
                <q-chip 
                  v-if="userApiStatus !== null"
                  :color="userApiStatus ? 'positive' : 'negative'"
                  text-color="white"
                  :icon="userApiStatus ? 'check' : 'close'"
                >
                  {{ userApiStatus ? '用戶 API 正常' : '用戶 API 異常' }}
                </q-chip>
              </div>

              <!-- 專案 API 測試 -->
              <div class="row items-center q-gutter-md">
                <q-btn 
                  @click="testProjectApi"
                  :loading="loading.projects"
                  color="accent"
                  icon="folder"
                >
                  測試專案 API
                </q-btn>
                <q-chip 
                  v-if="projectApiStatus !== null"
                  :color="projectApiStatus ? 'positive' : 'negative'"
                  text-color="white"
                  :icon="projectApiStatus ? 'check' : 'close'"
                >
                  {{ projectApiStatus ? '專案 API 正常' : '專案 API 異常' }}
                </q-chip>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- 測試結果 -->
      <div class="col-12" v-if="testResults.length > 0">
        <q-card>
          <q-card-section>
            <div class="text-h6">測試結果</div>
          </q-card-section>

          <q-card-section>
            <q-timeline color="primary">
              <q-timeline-entry
                v-for="(result, index) in testResults"
                :key="index"
                :title="result.title"
                :subtitle="result.timestamp"
                :icon="result.success ? 'check' : 'close'"
                :color="result.success ? 'positive' : 'negative'"
              >
                <div>
                  <div class="text-body2">{{ result.message }}</div>
                  <div v-if="result.data" class="q-mt-sm">
                    <q-expansion-item
                      label="詳細資料"
                      icon="info"
                      header-class="text-caption"
                    >
                      <pre class="text-caption q-pa-sm bg-grey-1 rounded-borders">{{ JSON.stringify(result.data, null, 2) }}</pre>
                    </q-expansion-item>
                  </div>
                </div>
              </q-timeline-entry>
            </q-timeline>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { 
  getServiceConfig, 
  updateServiceConfig, 
  getUserService,
  getProjectService 
} from '@/services/infrastructure/service-adapter'
import { HealthApiService } from '@/services/infrastructure/http/api.service'

const $q = useQuasar()

// 狀態
const serviceMode = ref<'local' | 'api'>('api')
const healthStatus = ref<boolean | null>(null)
const userApiStatus = ref<boolean | null>(null)
const projectApiStatus = ref<boolean | null>(null)

// 載入狀態
const loading = ref({
  health: false,
  users: false,
  projects: false
})

// 測試結果
interface TestResult {
  title: string
  message: string
  success: boolean
  timestamp: string
  data?: any
}

const testResults = ref<TestResult[]>([])

// 初始化
onMounted(() => {
  const config = getServiceConfig()
  serviceMode.value = config.mode
})

// 服務模式切換
function onServiceModeChange(mode: 'local' | 'api') {
  updateServiceConfig({ mode })
  $q.notify({
    type: 'info',
    message: `已切換到${mode === 'api' ? 'API' : '本地'}模式`,
    position: 'top'
  })
}

// 添加測試結果
function addTestResult(result: Omit<TestResult, 'timestamp'>) {
  testResults.value.unshift({
    ...result,
    timestamp: new Date().toLocaleString()
  })
}

// 健康檢查
async function testHealthCheck() {
  loading.value.health = true
  
  try {
    const response = await HealthApiService.getHealth()
    
    if (response.success) {
      healthStatus.value = true
      addTestResult({
        title: '健康檢查',
        message: '後端服務運行正常',
        success: true,
        data: response.data
      })
      
      $q.notify({
        type: 'positive',
        message: '後端服務運行正常',
        position: 'top'
      })
    } else {
      healthStatus.value = false
      addTestResult({
        title: '健康檢查',
        message: response.error?.message || '健康檢查失敗',
        success: false,
        data: response.error
      })
      
      $q.notify({
        type: 'negative',
        message: '健康檢查失敗',
        position: 'top'
      })
    }
  } catch (error) {
    healthStatus.value = false
    addTestResult({
      title: '健康檢查',
      message: '無法連接到後端服務',
      success: false,
      data: error
    })
    
    $q.notify({
      type: 'negative',
      message: '無法連接到後端服務',
      position: 'top'
    })
  } finally {
    loading.value.health = false
  }
}

// 測試用戶 API
async function testUserApi() {
  loading.value.users = true
  
  try {
    const userService = getUserService()
    const users = await userService.getAllUsers()
    
    userApiStatus.value = true
    addTestResult({
      title: '用戶 API 測試',
      message: `成功取得 ${users.length} 個用戶`,
      success: true,
      data: users.slice(0, 3) // 只顯示前3個用戶
    })
    
    $q.notify({
      type: 'positive',
      message: `用戶 API 測試成功，取得 ${users.length} 個用戶`,
      position: 'top'
    })
  } catch (error) {
    userApiStatus.value = false
    addTestResult({
      title: '用戶 API 測試',
      message: error instanceof Error ? error.message : '用戶 API 測試失敗',
      success: false,
      data: error
    })
    
    $q.notify({
      type: 'negative',
      message: '用戶 API 測試失敗',
      position: 'top'
    })
  } finally {
    loading.value.users = false
  }
}

// 測試專案 API
async function testProjectApi() {
  loading.value.projects = true
  
  try {
    const projectService = getProjectService()
    const projects = await projectService.getAllProjects()
    
    projectApiStatus.value = true
    addTestResult({
      title: '專案 API 測試',
      message: `成功取得 ${projects.length} 個專案`,
      success: true,
      data: projects.slice(0, 3) // 只顯示前3個專案
    })
    
    $q.notify({
      type: 'positive',
      message: `專案 API 測試成功，取得 ${projects.length} 個專案`,
      position: 'top'
    })
  } catch (error) {
    projectApiStatus.value = false
    addTestResult({
      title: '專案 API 測試',
      message: error instanceof Error ? error.message : '專案 API 測試失敗',
      success: false,
      data: error
    })
    
    $q.notify({
      type: 'negative',
      message: '專案 API 測試失敗',
      position: 'top'
    })
  } finally {
    loading.value.projects = false
  }
}
</script>

<style scoped>
pre {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}
</style>