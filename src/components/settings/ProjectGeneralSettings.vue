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
            <div class="row q-gutter-sm">
              <q-btn
                v-for="icon in projectIcons"
                :key="icon"
                :color="localProject.icon === icon ? 'primary' : 'grey'"
                :outline="localProject.icon !== icon"
                size="sm"
                @click="selectIcon(icon)"
                class="icon-btn"
              >
                <span class="text-body1">{{ icon }}</span>
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

// 本地專案資料
const localProject = ref<Project>({
  projectId: '',
  name: '',
  description: '',
  icon: '📁',
  ownerId: '',
  memberIds: [],
  createdAt: new Date(),
  updatedAt: new Date()
})

// 專案圖示選項
const projectIcons = [
  '📁', '📂', '💼', '🏢', '💻', '📱', '🌐', '☁️',
  '🔨', '💻', '🎨', '📊', '📈', '📋', '✅', '🚀'
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

  .icon-btn {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }

  .project-meta {
    padding: 12px;
    background-color: #f5f5f5;
    border-radius: 4px;
  }
}
</style>
