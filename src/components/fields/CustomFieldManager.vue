<template>
  <div class="custom-field-manager">
    <!-- 標題列 -->
    <div class="manager-header q-pa-md bg-white border-bottom">
      <div class="row items-center justify-between">
        <div class="text-h6">自訂欄位管理</div>
        <div class="row q-gutter-sm">
          <q-btn
            flat
            dense
            icon="download"
            label="匯出"
            @click="exportFields"
          />
          <q-btn
            flat
            dense
            icon="upload"
            label="匯入"
            @click="showImportDialog"
          />
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="新增欄位"
            @click="showCreateFieldDialog"
          />
          <q-btn
            flat
            icon="add"
            label="新增群組"
            @click="showCreateGroupDialog"
          />
        </div>
      </div>
    </div>

    <!-- 載入狀態 -->
    <div v-if="isLoading" class="q-pa-md text-center">
      <q-spinner size="2em" />
      <div class="text-body2 q-mt-sm">載入中...</div>
    </div>

    <!-- 欄位群組列表 -->
    <div v-else class="field-groups-container">
      <VueDraggable
        v-model="sortedGroups"
        :animation="200"
        handle=".group-handle"
        @change="onGroupReorder"
        class="field-groups-list"
      >
        <template #item="{ element: group }">
          <div class="field-group q-ma-md" :key="group.groupId">
            <!-- 群組標題 -->
            <div class="group-header q-pa-md bg-grey-1 rounded-borders-top">
              <div class="row items-center justify-between">
                <div class="row items-center q-gutter-sm">
                  <q-icon
                    name="drag_indicator"
                    class="group-handle cursor-pointer text-grey-6"
                  />
                  <q-icon
                    :name="group.isCollapsed ? 'expand_more' : 'expand_less'"
                    class="cursor-pointer"
                    @click="toggleGroupCollapse(group.groupId)"
                  />
                  <div class="group-title">
                    <div class="text-subtitle1 text-weight-medium">{{ group.name }}</div>
                    <div v-if="group.description" class="text-caption text-grey-6">
                      {{ group.description }}
                    </div>
                  </div>
                </div>
                <div class="row q-gutter-xs">
                  <q-btn
                    flat
                    round
                    dense
                    icon="edit"
                    size="sm"
                    @click="editGroup(group)"
                  >
                    <q-tooltip>編輯群組</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="add"
                    size="sm"
                    color="primary"
                    @click="addFieldToGroup(group.groupId)"
                  >
                    <q-tooltip>新增欄位到此群組</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    size="sm"
                    color="negative"
                    @click="deleteGroup(group)"
                  >
                    <q-tooltip>刪除群組</q-tooltip>
                  </q-btn>
                </div>
              </div>
            </div>

            <!-- 群組內欄位 -->
            <div v-if="!group.isCollapsed" class="group-fields bg-white rounded-borders-bottom">
              <VueDraggable
                :model-value="groupedFields[group.groupId] || []"
                @update:model-value="(value: CustomField[]) => updateGroupFields(group.groupId, value)"
                :group="{ name: 'fields', pull: true, put: true }"
                :animation="200"
                handle=".field-handle"
                @change="onFieldReorder"
                class="fields-list"
              >
                <template #item="{ element: field }">
                  <div class="field-item q-pa-md border-bottom" :key="field.fieldId">
                    <div class="row items-center justify-between">
                      <div class="row items-center q-gutter-md flex-1">
                        <q-icon
                          name="drag_indicator"
                          class="field-handle cursor-pointer text-grey-6"
                        />

                        <!-- 欄位類型圖示 -->
                        <div class="field-type-indicator">
                          <q-icon
                            :name="getFieldTypeIcon(field.type)"
                            :color="getFieldTypeColor(field.type)"
                            size="sm"
                          />
                        </div>

                        <!-- 欄位資訊 -->
                        <div class="field-info flex-1">
                          <div class="row items-center q-gutter-xs">
                            <span class="text-subtitle2 text-weight-medium">{{ field.name }}</span>
                            <q-chip v-if="field.isRequired" dense size="sm" color="red" text-color="white">
                              必填
                            </q-chip>
                            <q-chip v-if="field.isSystem" dense size="sm" color="grey" text-color="white">
                              系統
                            </q-chip>
                            <q-chip dense size="sm" :color="field.isVisible ? 'green' : 'grey'">
                              {{ field.isVisible ? '顯示' : '隱藏' }}
                            </q-chip>
                          </div>
                          <div class="text-caption text-grey-6">
                            {{ getFieldTypeLabel(field.type) }}
                            <span v-if="field.description"> • {{ field.description }}</span>
                          </div>
                        </div>

                        <!-- 欄位預覽 -->
                        <div class="field-preview">
                          <CustomFieldRenderer
                            :field="field"
                            :value="getFieldDefaultValue(field.fieldId)"
                            :readonly="true"
                            dense
                          />
                        </div>
                      </div>

                      <!-- 操作按鈕 -->
                      <div class="row q-gutter-xs">
                        <q-btn
                          flat
                          round
                          dense
                          :icon="field.isVisible ? 'visibility' : 'visibility_off'"
                          size="sm"
                          :color="field.isVisible ? 'primary' : 'grey'"
                          @click="toggleFieldVisibility(field)"
                        >
                          <q-tooltip>{{ field.isVisible ? '隱藏' : '顯示' }}</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="content_copy"
                          size="sm"
                          @click="duplicateField(field)"
                        >
                          <q-tooltip>複製</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="edit"
                          size="sm"
                          color="orange"
                          @click="editField(field)"
                        >
                          <q-tooltip>編輯</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          size="sm"
                          color="negative"
                          :disable="field.isSystem"
                          @click="deleteField(field)"
                        >
                          <q-tooltip>{{ field.isSystem ? '系統欄位無法刪除' : '刪除' }}</q-tooltip>
                        </q-btn>
                      </div>
                    </div>
                  </div>
                </template>
              </VueDraggable>

              <!-- 群組內空狀態 -->
              <div v-if="groupedFields[group.groupId]?.length === 0" class="empty-group q-pa-lg text-center">
                <div v-if="groupedFields[group.groupId]?.length === 0" class="empty-group q-pa-lg text-center">
                <q-icon name="text_fields" size="3em" color="grey-4" />
                <div class="text-body2 text-grey-6 q-mt-sm">此群組暫無欄位</div>
                <q-btn
                  flat
                  color="primary"
                  label="新增欄位"
                  @click="addFieldToGroup(group.groupId)"
                  class="q-mt-sm"
                />
              </div>
            </div>
            </div>
          </div>
        </template>
      </VueDraggable>

      <!-- 未分組欄位 -->
      <div v-if="groupedFields.ungrouped && groupedFields.ungrouped.length > 0" class="field-group q-ma-md">
        <div class="group-header q-pa-md bg-grey-1 rounded-borders-top">
          <div class="text-subtitle1 text-weight-medium">未分組欄位</div>
        </div>
        <div class="group-fields bg-white rounded-borders-bottom">
          <VueDraggable
            :model-value="groupedFields.ungrouped || []"
            @update:model-value="(value: CustomField[]) => updateGroupFields('ungrouped', value)"
            :group="{ name: 'fields', pull: true, put: true }"
            :animation="200"
            handle=".field-handle"
            @change="onFieldReorder"
            class="fields-list"
          >
            <template #item="{ element: field }">
              <div class="field-item q-pa-md border-bottom" :key="field.fieldId">
                <!-- 同上面的欄位項目模板 -->
                <div class="row items-center justify-between">
                  <div class="row items-center q-gutter-md flex-1">
                    <q-icon
                      name="drag_indicator"
                      class="field-handle cursor-pointer text-grey-6"
                    />

                    <div class="field-type-indicator">
                      <q-icon
                        :name="getFieldTypeIcon(field.type)"
                        :color="getFieldTypeColor(field.type)"
                        size="sm"
                      />
                    </div>

                    <div class="field-info flex-1">
                      <div class="row items-center q-gutter-xs">
                        <span class="text-subtitle2 text-weight-medium">{{ field.name }}</span>
                        <q-chip v-if="field.isRequired" dense size="sm" color="red" text-color="white">
                          必填
                        </q-chip>
                        <q-chip v-if="field.isSystem" dense size="sm" color="grey" text-color="white">
                          系統
                        </q-chip>
                        <q-chip dense size="sm" :color="field.isVisible ? 'green' : 'grey'">
                          {{ field.isVisible ? '顯示' : '隱藏' }}
                        </q-chip>
                      </div>
                      <div class="text-caption text-grey-6">
                        {{ getFieldTypeLabel(field.type) }}
                        <span v-if="field.description"> • {{ field.description }}</span>
                      </div>
                    </div>

                    <div class="field-preview">
                      <CustomFieldRenderer
                        :field="field"
                        :value="getFieldDefaultValue(field.fieldId)"
                        :readonly="true"
                        dense
                      />
                    </div>
                  </div>

                  <div class="row q-gutter-xs">
                    <q-btn
                      flat
                      round
                      dense
                      :icon="field.isVisible ? 'visibility' : 'visibility_off'"
                      size="sm"
                      :color="field.isVisible ? 'primary' : 'grey'"
                      @click="toggleFieldVisibility(field)"
                    >
                      <q-tooltip>{{ field.isVisible ? '隱藏' : '顯示' }}</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="content_copy"
                      size="sm"
                      @click="duplicateField(field)"
                    >
                      <q-tooltip>複製</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      size="sm"
                      color="orange"
                      @click="editField(field)"
                    >
                      <q-tooltip>編輯</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      size="sm"
                      color="negative"
                      :disable="field.isSystem"
                      @click="deleteField(field)"
                    >
                      <q-tooltip>{{ field.isSystem ? '系統欄位無法刪除' : '刪除' }}</q-tooltip>
                    </q-btn>
                  </div>
                </div>
              </div>
            </template>
          </VueDraggable>
        </div>
      </div>
    </div>

    <!-- 建立欄位對話框 -->
    <CustomFieldEditDialog
      v-model="showFieldDialog"
      :field="editingField"
      :groups="customFieldGroups"
      @save="onFieldSave"
    />

    <!-- 建立群組對話框 -->
    <CustomFieldGroupDialog
      v-model="showGroupDialog"
      :group="editingGroup"
      @save="onGroupSave"
    />

    <!-- 匯入對話框 -->
    <q-dialog v-model="showImportModal">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">匯入自訂欄位</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-file
            v-model="importFile"
            accept=".json"
            label="選擇 JSON 檔案"
            outlined
            @update:model-value="onImportFileSelect"
          />

          <q-input
            v-if="importData"
            v-model="importData"
            type="textarea"
            label="匯入資料"
            outlined
            rows="8"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn
            flat
            label="匯入"
            color="primary"
            :disable="!importData"
            @click="performImport"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useQuasar } from 'quasar'
import type { CustomField, CustomFieldGroup, FieldType } from '@/types'
import { useCustomFields } from '@/composables/useCustomFields'
import CustomFieldRenderer from './CustomFieldRenderer.vue'
import CustomFieldEditDialog from './CustomFieldEditDialog.vue'
import CustomFieldGroupDialog from './CustomFieldGroupDialog.vue'

// Props
const props = defineProps<{
  projectId: string
}>()

const $q = useQuasar()
const {
  customFieldGroups,
  groupedFields,
  isLoading,
  error,
  loadCustomFields,
  updateCustomField,
  deleteCustomField,
  duplicateCustomField,
  updateCustomFieldGroup,
  deleteCustomFieldGroup,
  getFieldDefaultValue,
  exportCustomFields,
  importCustomFields
} = useCustomFields(props.projectId)

// 對話框狀態
const showFieldDialog = ref(false)
const showGroupDialog = ref(false)
const showImportModal = ref(false)
const editingField = ref<CustomField | null>(null)
const editingGroup = ref<CustomFieldGroup | null>(null)

// 匯入相關
const importFile = ref<File | null>(null)
const importData = ref('')

// 排序後的群組
const sortedGroups = computed({
  get: () => [...customFieldGroups.value].sort((a, b) => a.displayOrder - b.displayOrder),
  set: (newGroups) => {
    // 處理群組重排序邏輯
    newGroups.forEach((group, index) => {
      if (group.displayOrder !== (index + 1) * 1000) {
        void updateCustomFieldGroup(group.groupId, { displayOrder: (index + 1) * 1000 })
      }
    })
  }
})

// 欄位類型配置
const fieldTypeConfig = {
  text: { icon: 'text_fields', color: 'blue', label: '文字' },
  number: { icon: 'numbers', color: 'green', label: '數字' },
  date: { icon: 'calendar_today', color: 'purple', label: '日期' },
  select: { icon: 'arrow_drop_down', color: 'orange', label: '單選' },
  multiSelect: { icon: 'checklist', color: 'red', label: '多選' },
  user: { icon: 'person', color: 'indigo', label: '用戶' },
  checkbox: { icon: 'check_box', color: 'teal', label: '核取方塊' }
}

// 初始化載入
onMounted(() => {
  void loadCustomFields()
})

// 欄位類型相關函數
function getFieldTypeIcon(type: FieldType): string {
  return fieldTypeConfig[type]?.icon || 'help'
}

function getFieldTypeColor(type: FieldType): string {
  return fieldTypeConfig[type]?.color || 'grey'
}

function getFieldTypeLabel(type: FieldType): string {
  return fieldTypeConfig[type]?.label || '未知'
}

// 群組操作
function toggleGroupCollapse(groupId: string): void {
  const group = customFieldGroups.value.find(g => g.groupId === groupId)
  if (group) {
    void updateCustomFieldGroup(groupId, { isCollapsed: !group.isCollapsed })
  }
}

function showCreateGroupDialog(): void {
  editingGroup.value = null
  showGroupDialog.value = true
}

function editGroup(group: CustomFieldGroup): void {
  editingGroup.value = group
  showGroupDialog.value = true
}

function deleteGroup(group: CustomFieldGroup): void {
  $q.dialog({
    title: '確認刪除',
    message: `確定要刪除群組「${group.name}」嗎？群組內的欄位將移至未分組。`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    void deleteCustomFieldGroup(group.groupId)
  })
}

// 欄位操作
function showCreateFieldDialog(): void {
  editingField.value = null
  showFieldDialog.value = true
}

function addFieldToGroup(_groupId: string): void {
  editingField.value = null
  showFieldDialog.value = true
  // TODO: 在對話框中預設選擇該群組
}

function editField(field: CustomField): void {
  editingField.value = field
  showFieldDialog.value = true
}

function deleteField(field: CustomField): void {
  $q.dialog({
    title: '確認刪除',
    message: `確定要刪除欄位「${field.name}」嗎？此操作無法復原。`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    void deleteCustomField(field.fieldId)
  })
}

function toggleFieldVisibility(field: CustomField): void {
  void updateCustomField(field.fieldId, { isVisible: !field.isVisible })
}

function duplicateField(field: CustomField): void {
  $q.dialog({
    title: '複製欄位',
    message: '請輸入新欄位名稱：',
    prompt: {
      model: `${field.name} (副本)`,
      type: 'text'
    },
    cancel: true,
    persistent: true
  }).onOk((newName: string) => {
    if (newName.trim()) {
      void duplicateCustomField(field.fieldId, newName.trim())
    }
  })
}

// 拖拉排序
function onGroupReorder(): void {
  // 群組排序由 sortedGroups 的 setter 處理
}

function onFieldReorder(): void {
  // TODO: 實作欄位重排序
}

function updateGroupFields(groupId: string, fields: CustomField[]): void {
  // 更新群組內欄位順序
  if (groupedFields.value[groupId]) {
    groupedFields.value[groupId] = fields
  }
}

// 對話框事件
function onFieldSave(): void {
  showFieldDialog.value = false
  editingField.value = null
  void loadCustomFields()
}

function onGroupSave(): void {
  showGroupDialog.value = false
  editingGroup.value = null
  void loadCustomFields()
}

// 匯入匯出
function exportFields(): void {
  void exportCustomFields()
    .then(data => {
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `custom-fields-${props.projectId}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      $q.notify({
        type: 'positive',
        message: '自訂欄位已匯出'
      })
    })
    .catch(err => {
      $q.notify({
        type: 'negative',
        message: '匯出失敗：' + err.message
      })
    })
}

function showImportDialog(): void {
  importFile.value = null
  importData.value = ''
  showImportModal.value = true
}

function onImportFileSelect(file: File | null): void {
  if (!file) {
    importData.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e): void => {
    importData.value = e.target?.result as string
  }
  reader.readAsText(file)
}

function performImport(): void {
  if (!importData.value) return

  void importCustomFields(importData.value)
    .then(result => {
      $q.notify({
        type: 'positive',
        message: `匯入成功：${result.fieldsCount} 個欄位，${result.groupsCount} 個群組`
      })
      showImportModal.value = false
      importData.value = ''
      importFile.value = null
    })
    .catch(err => {
      $q.notify({
        type: 'negative',
        message: '匯入失敗：' + err.message
      })
    })
}

// 錯誤處理
if (error.value) {
  $q.notify({
    type: 'negative',
    message: error.value
  })
}
</script>

<style scoped lang="scss">
.custom-field-manager {
  background-color: $grey-1;
  min-height: 100vh;

  .manager-header {
    border-bottom: 1px solid $grey-4;
  }

  .field-groups-container {
    padding: 0;
  }

  .field-group {
    background-color: white;
    border-radius: $border-radius;
    border: 1px solid $grey-4;
    overflow: hidden;

    .group-header {
      .group-handle {
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
      }
    }

    .field-item {
      transition: all 0.2s ease;

      &:hover {
        background-color: $grey-1;
      }

      .field-handle {
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
      }

      .field-type-indicator {
        min-width: 24px;
      }

      .field-preview {
        min-width: 120px;
        max-width: 200px;
      }
    }

    .empty-group {
      border-top: 1px solid $grey-4;
    }
  }

  .border-bottom {
    border-bottom: 1px solid $grey-4;
  }
}
</style>
