<template>
  <div class="project-general-settings">
    <div class="settings-section-header">
      <h5 class="text-h5 q-mt-none q-mb-sm">基本資訊</h5>
      <p class="text-body2 text-grey-6 q-mt-none">
        設定專案的基本資訊，包含名稱、描述等。
      </p>
    </div>

    <q-separator class="q-mb-lg" />

    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">專案詳情</div>

          <!-- 專案名稱 -->
          <div class="form-group">
            <q-input
              v-model="localProject.name"
              label="專案名稱 *"
              outlined
              :rules="[(val: string) => !!val || '請輸入專案名稱']"
              @update:model-value="emitChange"
              class="q-mb-md"
            />
          </div>

          <!-- 專案描述 -->
          <div class="form-group">
            <q-input
              v-model="localProject.description"
              label="專案描述"
              outlined
              type="textarea"
              rows="4"
              placeholder="描述此專案的目標和內容..."
              @update:model-value="emitChange"
              class="q-mb-md"
            />
          </div>

          <!-- 專案圖示 -->
          <div class="form-group">
            <div class="text-body2 text-weight-medium q-mb-sm">專案圖示</div>
            
            <!-- 圖示選擇 -->
            <div class="icon-selection-container">
              <div class="icon-search q-mb-sm">
                <q-input
                  v-model="iconSearch"
                  placeholder="搜尋圖示..."
                  outlined
                  dense
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
              
              <div class="icon-grid q-mb-md">
                <q-btn
                  v-for="iconName in filteredIcons"
                  :key="iconName"
                  flat
                  size="sm"
                  @click="selectIcon(iconName)"
                  :class="['icon-btn', { 'selected': localProject.icon === iconName }]"
                >
                  <q-icon 
                    :name="iconName" 
                    :color="localProject.icon === iconName ? localProject.iconColor || 'primary' : 'grey-6'"
                    size="18px"
                  />
                </q-btn>
              </div>
            </div>

            <!-- 顏色選擇 -->
            <div class="text-body2 text-weight-medium q-mb-sm">圖示顏色</div>
            <div class="color-grid">
              <q-btn
                v-for="color in iconColors"
                :key="color.value"
                flat
                size="sm"
                @click="selectColor(color.value)"
                :class="['color-btn', { 'selected': (localProject.iconColor || 'primary') === color.value }]"
                :style="{ backgroundColor: color.hex }"
                :title="color.name"
              >
                <q-icon 
                  name="check" 
                  color="white" 
                  size="14px"
                  v-if="(localProject.iconColor || 'primary') === color.value"
                />
              </q-btn>
            </div>
          </div>

          <!-- 建立資訊（唯讀） -->
          <q-separator class="q-my-md" />

          <div class="project-meta text-caption text-grey-6">
            <div class="row q-gutter-md">
              <div>
                <strong>建立者：</strong>{{ creatorName }}
              </div>
              <div>
                <strong>建立時間：</strong>{{ formatDate(localProject.createdAt) }}
              </div>
              <div>
                <strong>最後更新：</strong>{{ formatDate(localProject.updatedAt) }}
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Project } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'

// Props
const props = defineProps<{
  project: Project | null
}>()

// Emits
const emit = defineEmits<{
  'update:project': [project: Project]
  'change': []
}>()

const { getUserDisplayName } = useCurrentUser()

// 圖標搜尋
const iconSearch = ref('')

// 本地專案資料
const localProject = ref<Project>({
  projectId: '',
  name: '',
  description: '',
  icon: 'folder',
  iconColor: 'primary',
  ownerId: '',
  memberIds: [],
  createdAt: new Date(),
  updatedAt: new Date()
})

// 專案圖示選項 (60個 Material Design Icons)
const projectIcons = [
  // 專案與工作類 (20個)
  'folder', 'work', 'business', 'domain', 'assignment', 'task_alt', 'checklist', 'bookmark',
  'flag', 'label', 'category', 'inventory', 'archive', 'dashboard', 'analytics', 'report',
  'timeline', 'schedule', 'event', 'calendar_today',
  
  // 技術與開發類 (15個)
  'computer', 'code', 'bug_report', 'integration_instructions', 'api', 'data_object', 'terminal',
  'memory', 'storage', 'cloud', 'web', 'mobile_friendly', 'apps', 'extension', 'settings',
  
  // 創意與設計類 (10個)
  'palette', 'brush', 'design_services', 'photo', 'video_library', 'music_note', 'theater_comedy',
  'camera', 'movie', 'collections',
  
  // 生活與情緒類 (15個)
  'home', 'favorite', 'mood', 'sentiment_satisfied', 'sentiment_very_satisfied', 'celebration',
  'local_cafe', 'restaurant', 'fitness_center', 'spa', 'beach_access', 'nature', 'pets', 'child_care', 'school'
]

// 圖示名稱對照表（用於搜尋）
const iconNames: Record<string, string> = {
  'folder': '資料夾', 'work': '工作', 'business': '商業', 'domain': '網域', 'assignment': '作業',
  'task_alt': '任務', 'checklist': '清單', 'bookmark': '書籤', 'flag': '旗幟', 'label': '標籤',
  'category': '分類', 'inventory': '庫存', 'archive': '歸檔', 'dashboard': '儀表板', 'analytics': '分析',
  'report': '報告', 'timeline': '時間線', 'schedule': '排程', 'event': '事件', 'calendar_today': '行事曆',
  'computer': '電腦', 'code': '程式碼', 'bug_report': '錯誤報告', 'integration_instructions': '整合',
  'api': 'API', 'data_object': '資料', 'terminal': '終端', 'memory': '記憶體', 'storage': '儲存',
  'cloud': '雲端', 'web': '網頁', 'mobile_friendly': '行動', 'apps': '應用程式', 'extension': '擴充功能',
  'settings': '設定', 'palette': '調色盤', 'brush': '筆刷', 'design_services': '設計', 'photo': '照片',
  'video_library': '影片', 'music_note': '音樂', 'theater_comedy': '戲劇', 'camera': '相機',
  'movie': '電影', 'collections': '收藏', 'home': '家', 'favorite': '最愛', 'mood': '心情',
  'sentiment_satisfied': '滿意', 'sentiment_very_satisfied': '非常滿意', 'celebration': '慶祝',
  'local_cafe': '咖啡', 'restaurant': '餐廳', 'fitness_center': '健身', 'spa': '水療', 'beach_access': '海灘',
  'nature': '自然', 'pets': '寵物', 'child_care': '兒童', 'school': '學校'
}

// 過濾後的圖示
const filteredIcons = computed(() => {
  if (!iconSearch.value.trim()) {
    return projectIcons
  }
  
  const searchTerm = iconSearch.value.toLowerCase().trim()
  return projectIcons.filter(icon => {
    const iconName = iconNames[icon] || ''
    return icon.toLowerCase().includes(searchTerm) || 
           iconName.toLowerCase().includes(searchTerm)
  })
})

// 圖示顏色選項
const iconColors = [
  { name: '藍色', value: 'primary', hex: '#1976d2' },
  { name: '綠色', value: 'positive', hex: '#21ba45' },
  { name: '紅色', value: 'negative', hex: '#c10015' },
  { name: '橙色', value: 'warning', hex: '#f2c037' },
  { name: '紫色', value: 'secondary', hex: '#26a69a' },
  { name: '粉色', value: 'pink', hex: '#e91e63' },
  { name: '青色', value: 'cyan', hex: '#00bcd4' },
  { name: '深綠', value: 'green', hex: '#4caf50' },
  { name: '深藍', value: 'blue', hex: '#2196f3' },
  { name: '靛藍', value: 'indigo', hex: '#3f51b5' },
  { name: '黃色', value: 'yellow', hex: '#ffeb3b' },
  { name: '棕色', value: 'brown', hex: '#795548' },
  { name: '灰色', value: 'grey', hex: '#9e9e9e' },
  { name: '黑色', value: 'dark', hex: '#424242' }
]

// 計算建立者名稱
const creatorName = computed(() => {
  if (!localProject.value.ownerId) return '未知'
  return getUserDisplayName(localProject.value.ownerId)
})

// 選擇圖示
function selectIcon(icon: string): void {
  localProject.value.icon = icon
  emitChange()
}

// 選擇顏色
function selectColor(color: string): void {
  localProject.value.iconColor = color
  emitChange()
}

// 發出變更事件
function emitChange(): void {
  emit('update:project', localProject.value)
  emit('change')
}

// 格式化日期
function formatDate(date: Date): string {
  return new Date(date).toLocaleString('zh-TW')
}

// 監聽 props 變化
watch(() => props.project, (newProject) => {
  if (newProject) {
    localProject.value = { ...newProject }
  }
}, { immediate: true, deep: true })
</script>

<style scoped lang="scss">
.project-general-settings {
  .settings-section-header {
    margin-bottom: 24px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .icon-selection-container {
    .icon-search {
      max-width: 300px;
    }
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fafafa;
  }

  .icon-btn {
    width: 40px;
    height: 40px;
    min-width: 40px;
    border: 2px solid transparent;
    border-radius: 6px;
    transition: all 0.2s ease;
    background-color: white;

    &:hover {
      border-color: #bdbdbd;
      background-color: #f5f5f5;
      transform: scale(1.05);
    }

    &.selected {
      border-color: #1976d2;
      background-color: rgba(25, 118, 210, 0.1);
      transform: scale(1.05);
      box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3);
    }
  }

  .color-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .color-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.1);
      border-color: #bdbdbd;
    }

    &.selected {
      border-color: #424242;
      transform: scale(1.1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }

  .project-meta {
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 4px;
  }
}
</style>
