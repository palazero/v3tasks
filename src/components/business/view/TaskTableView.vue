<template>
  <div class="task-table-view">
    <!-- 欄位管理對話框 -->
    <ViewColumnManager
      v-model="showColumnManager"
      :view-type="'table'"
      :columns="currentColumnConfig"
      :field-definitions="allFieldDefinitions"
      @apply="handleColumnConfigUpdate"
    />

    <!-- 表格主體 -->
    <div class="table-container">
      <!-- AllTasks 專案分組顯示 -->
      <template v-if="projectId === 'all' && view.config.groupBy === 'projectId'">
        <div
          v-for="[projectId, projectTasks] in sortedGroupedTasks"
          :key="projectId"
          class="project-group q-mb-sm"
        >
          <!-- 專案分組標題 -->
          <div
            class="project-group-header q-pa-xs bg-grey-2 rounded-borders-top cursor-pointer"
            @click="toggleProjectExpanded(projectId)"
          >
            <div class="row items-center justify-between no-wrap">
              <div class="row items-center q-gutter-sm no-wrap">
                <q-btn
                  flat
                  dense
                  round
                  size="sm"
                  :icon="isProjectExpanded(projectId) ? 'expand_less' : 'expand_more'"
                  @click.stop="toggleProjectExpanded(projectId)"
                />
                <q-avatar size="24px" :color="getProjectIconColor(projectId)" text-color="white">
                  <q-icon :name="getProjectIcon(projectId)" />
                </q-avatar>
                <span class="text-h6 text-weight-medium project-name">
                  {{ getProjectName(projectId) }}
                </span>

                <!-- 專案統計資訊 -->
                <div class="project-stats row items-center q-gutter-xs no-wrap">
                  <template v-if="projectStatsCache[projectId]">
                    <q-badge
                      color="grey"
                      :label="`${projectStatsCache[projectId].total} 任務`"
                    />
                    <q-badge
                      :color="projectStatsCache[projectId].progress === 100 ? 'positive' : 'info'"
                      :label="`${projectStatsCache[projectId].progress}%`"
                    />
                    <q-badge
                      v-if="projectStatsCache[projectId].overdue > 0"
                      color="negative"
                      :label="`${projectStatsCache[projectId].overdue} 逾期`"
                    />
                    <q-badge
                      v-if="projectStatsCache[projectId].inProgress > 0"
                      color="warning"
                      :label="`${projectStatsCache[projectId].inProgress} 進行中`"
                    />
                  </template>
                </div>
              </div>

              <div class="row q-gutter-xs no-wrap">
                <!-- 專案排序選單 -->
                <q-btn
                  flat
                  dense
                  icon="sort"
                  size="sm"
                  @click.stop
                >
                  <q-tooltip>排序專案</q-tooltip>
                  <q-menu>
                    <q-list dense style="min-width: 150px">
                      <q-item clickable @click="setProjectSort('name')">
                        <q-item-section>
                          <q-item-label>依名稱排序</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon v-if="projectSortBy === 'name'" name="check" />
                        </q-item-section>
                      </q-item>
                      <q-item clickable @click="setProjectSort('taskCount')">
                        <q-item-section>
                          <q-item-label>依任務數量</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon v-if="projectSortBy === 'taskCount'" name="check" />
                        </q-item-section>
                      </q-item>
                      <q-item clickable @click="setProjectSort('progress')">
                        <q-item-section>
                          <q-item-label>依進度排序</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon v-if="projectSortBy === 'progress'" name="check" />
                        </q-item-section>
                      </q-item>
                      <q-item clickable @click="setProjectSort('overdue')">
                        <q-item-section>
                          <q-item-label>依逾期任務</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-icon v-if="projectSortBy === 'overdue'" name="check" />
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-menu>
                </q-btn>

                <q-btn
                  flat
                  dense
                  icon="open_in_new"
                  size="sm"
                  @click.stop="$router.push({ name: 'ProjectView', params: { projectId } })"
                >
                  <q-tooltip>開啟專案</q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>

          <!-- 專案任務表格 -->
          <div
            v-show="isProjectExpanded(projectId)"
            class="project-tasks bg-white rounded-borders-bottom"
          >
            <q-table
              :rows="getFilteredProjectTasks(projectTasks)"
              :columns="tableColumns"
              row-key="taskId"
              bordered
              separator="cell"
              :pagination="{ rowsPerPage: 0 }"
              hide-pagination
              :table-style="{
                minHeight: '300px',
                '--q-table-row-height': '30px',
                '--q-table-cell-height': '30px'
              }"
              table-class="project-task-table compact-table compact-rows"
              dense
            >
        <!-- 任務標題欄（支援樹狀結構） -->
        <template v-slot:body-cell-title="props">
          <q-td :props="props" class="task-title-cell">
            <div
              class="task-title-wrapper row no-wrap"
              :style="{ paddingLeft: `${(props.row.level || 0) * 20 }px` }"
            >
              <!-- 展開/收合按鈕 -->
              <q-btn
                v-if="hasChildren(props.row)"
                :icon="props.row.isExpanded ? 'expand_more' : 'chevron_right'"
                flat
                dense
                round
                size="xs"
                @click="toggleExpanded(props.row)"
                class="expand-btn"
              />
              <div v-else class="table-expand-btn-spacer"> </div>

              <!-- 任務標題（行內編輯） -->
              <div
                v-if="!isEditing(props.row.taskId, 'title')"
                class="task-title-display cursor-pointer"
                @click="startEdit(props.row.taskId, 'title', props.row.title)"
                :title="props.row.title"
              >
                {{ props.row.title }}
              </div>
              <q-input
                v-else
                v-model="editingValue"
                dense
                autofocus
                @blur="saveEdit(props.row.taskId, 'title')"
                @keyup.enter="saveEdit(props.row.taskId, 'title')"
                @keyup.esc="cancelEdit"
                class="task-title-input"
              />
            </div>
          </q-td>
        </template>

        <!-- 狀態欄 -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-xs no-wrap">
              <!-- 快速切換按鈕 -->
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="getStatusIcon(props.row.statusId)"
                :color="getStatusColor(props.row.statusId)"
                @click="cycleStatus(props.row)"
                class="status-btn"
              >
                <q-tooltip>{{ getStatusLabel(props.row.statusId) }} (點擊切換)</q-tooltip>
              </q-btn>

              <!-- 下拉選單（備選） -->
              <q-select
                :model-value="props.row.statusId"
                :options="statusOptions"
                emit-value
                map-options
                dense
                @update:model-value="updateTask(props.row.taskId, { statusId: $event })"
                class="status-select"
                style="min-width: 80px;"
              >
                <template v-slot:selected>
                  <span class="text-caption">{{ getStatusLabel(props.row.statusId) }}</span>
                </template>
              </q-select>
            </div>
          </q-td>
        </template>

        <!-- 指派人員欄 -->
        <template v-slot:body-cell-assignee="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.assigneeId"
              :options="assigneeOptions"
              emit-value
              map-options
              dense
              clearable
              @update:model-value="updateTask(props.row.taskId, { assigneeId: $event })"
              class="assignee-select"
            >
              <template v-slot:selected-item="scope">
                <div class="row items-center q-gutter-xs no-wrap">
                  <q-avatar size="20px" color="primary" text-color="white">
                    {{ getUserInitials(scope.opt.value) }}
                  </q-avatar>
                  <span>{{ scope.opt.label }}</span>
                </div>
              </template>
            </q-select>
          </q-td>
        </template>

        <!-- 優先級欄 -->
        <template v-slot:body-cell-priority="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.priorityId"
              :options="priorityOptions"
              emit-value
              map-options
              dense
              @update:model-value="updateTask(props.row.taskId, { priorityId: $event })"
              class="priority-select"
            >
              <template v-slot:selected-item="scope">
                <div class="row items-center q-gutter-xs no-wrap">
                  <q-icon
                    :name="getPriorityIcon(scope.opt.value)"
                    :color="getPriorityColor(scope.opt.value)"
                    size="sm"
                  />
                  <span class="priority-text">{{ scope.opt.label }}</span>
                </div>
              </template>
            </q-select>
          </q-td>
        </template>

        <!-- 截止日期欄 -->
        <template v-slot:body-cell-deadline="props">
          <q-td :props="props">
            <q-input
              :model-value="formatDateForInput(props.row.endDateTime)"
              type="datetime-local"
              dense
              @update:model-value="updateTaskDate(props.row.taskId, $event)"
              class="deadline-input"
            />
          </q-td>
        </template>

        <!-- 進度欄 -->
        <template v-slot:body-cell-progress="props">
          <q-td :props="props">
            <div class="progress-cell">
              <q-slider
                :model-value="props.row.progress || 0"
                :min="0"
                :max="100"
                :step="10"
                label
                @update:model-value="$event != null && updateTask(props.row.taskId, { progress: $event })"
                class="progress-slider"
              />
            </div>
          </q-td>
        </template>

        <!-- 建立者欄 -->
        <template v-slot:body-cell-creator="props">
          <q-td :props="props">
            <div class="row items-center justify-center q-gutter-xs">
              <q-avatar size="24px" color="primary" text-color="white">
                {{ getUserInitials(props.row.creatorId) }}
              </q-avatar>
              <span class="text-caption">{{ getUserName(props.row.creatorId) }}</span>
            </div>
          </q-td>
        </template>

        <!-- 建立時間欄 -->
        <template v-slot:body-cell-createdAt="props">
          <q-td :props="props">
            <div class="text-caption">
              {{ formatDateTime(props.row.createdAt) }}
            </div>
          </q-td>
        </template>

        <!-- 更新時間欄 -->
        <template v-slot:body-cell-updatedAt="props">
          <q-td :props="props">
            <div class="text-caption">
              {{ formatDateTime(props.row.updatedAt) }}
            </div>
          </q-td>
        </template>

        <!-- 標籤欄 -->
        <template v-slot:body-cell-tags="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-xs no-wrap">
              <q-chip
                v-for="(tag, index) in (props.value || [])"
                :key="index"
                dense
                size="sm"
                color="grey-3"
                text-color="grey-8"
              >
                {{ tag }}
              </q-chip>
              <span v-if="!props.value || props.value.length === 0" class="text-grey-5">
                無標籤
              </span>
            </div>
          </q-td>
        </template>

        <!-- 開始日期欄 -->
        <template v-slot:body-cell-startDate="props">
          <q-td :props="props">
            <span v-if="props.value">
              {{ formatDate(props.value) }}
            </span>
            <span v-else class="text-grey-5">-</span>
          </q-td>
        </template>

        <!-- 工期欄 -->
        <template v-slot:body-cell-duration="props">
          <q-td :props="props">
            {{ props.value }}
          </q-td>
        </template>

        <!-- 描述欄 -->
        <template v-slot:body-cell-description="props">
          <q-td :props="props">
            <div class="text-caption text-grey-7" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
              {{ props.value || '-' }}
            </div>
          </q-td>
        </template>

        <!-- 自訂欄位欄 -->
        <template
          v-for="field in visibleCustomFields"
          :key="`custom_${field.fieldId}`"
          #[`body-cell-custom_${field.fieldId}`]="props"
        >
          <q-td :props="props">
            <CustomFieldRenderer
              :field="field"
              :value="getCustomFieldValue(props.row.customFields, field.fieldId)"
              :readonly="true"
              :show-label="false"
              :show-help="false"
              dense
            />
          </q-td>
        </template>

        <!-- 操作欄 -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="actions-cell">
            <div class="row q-gutter-xs no-wrap actions-container">
              <q-btn
                flat
                dense
                round
                icon="add"
                size="xs"
                color="primary"
                @click="addSubtask(props.row)"
              >
                <q-tooltip>新增子任務</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="edit"
                size="xs"
                color="orange"
                @click="editTask(props.row)"
              >
                <q-tooltip>編輯任務</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="delete"
                size="xs"
                color="negative"
                @click="deleteTask(props.row)"
              >
                <q-tooltip>刪除任務</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
            </q-table>
          </div>
        </div>
      </template>

      <!-- 一般表格顯示（非專案分組模式）-->
      <q-table
        v-else
        :rows="filteredTasks"
        :columns="tableColumns"
        row-key="taskId"
        bordered
        separator="cell"
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        :table-style="{
          '--q-table-row-height': '30px',
          '--q-table-cell-height': '30px'
        }"
        table-class="task-table full-height compact-table compact-rows"
        dense
      >
        <!-- 任務標題欄（支援樹狀結構） -->
        <template v-slot:body-cell-title="props">
          <q-td :props="props" class="task-title-cell">
            <div
              class="task-title-wrapper row no-wrap"
              :style="{ paddingLeft: `${(props.row.level || 0) * 20 }px` }"
            >
              <!-- 展開/收合按鈕 -->
              <q-btn
                v-if="hasChildren(props.row)"
                :icon="props.row.isExpanded ? 'expand_more' : 'chevron_right'"
                flat
                dense
                round
                size="xs"
                @click="toggleExpanded(props.row)"
                class="expand-btn"
              />
              <div v-else class="expand-btn-spacer"> </div>

              <!-- 任務標題（行內編輯） -->
              <div
                v-if="!isEditing(props.row.taskId, 'title')"
                class="task-title-display cursor-pointer"
                @click="startEdit(props.row.taskId, 'title', props.row.title)"
                :title="props.row.title"
              >
                {{ props.row.title }}
              </div>
              <q-input
                v-else
                v-model="editingValue"
                dense
                autofocus
                @blur="saveEdit(props.row.taskId, 'title')"
                @keyup.enter="saveEdit(props.row.taskId, 'title')"
                @keyup.esc="cancelEdit"
                class="task-title-input"
              />
            </div>
          </q-td>
        </template>

        <!-- 狀態欄 -->
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-xs no-wrap">
              <!-- 快速切換按鈕 -->
              <q-btn
                flat
                dense
                round
                size="sm"
                :icon="getStatusIcon(props.row.statusId)"
                :color="getStatusColor(props.row.statusId)"
                @click="cycleStatus(props.row)"
                class="status-btn"
              >
                <q-tooltip>{{ getStatusLabel(props.row.statusId) }} (點擊切換)</q-tooltip>
              </q-btn>

              <!-- 下拉選單（備選） -->
              <q-select
                :model-value="props.row.statusId"
                :options="statusOptions"
                emit-value
                map-options
                dense
                @update:model-value="updateTask(props.row.taskId, { statusId: $event })"
                class="status-select"
                style="min-width: 80px;"
              >
                <template v-slot:selected>
                  <span class="text-caption">{{ getStatusLabel(props.row.statusId) }}</span>
                </template>
              </q-select>
            </div>
          </q-td>
        </template>

        <!-- 指派人員欄 -->
        <template v-slot:body-cell-assignee="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.assigneeId"
              :options="assigneeOptions"
              emit-value
              map-options
              dense
              clearable
              @update:model-value="updateTask(props.row.taskId, { assigneeId: $event })"
              class="assignee-select"
            >
              <template v-slot:selected-item="scope">
                <div class="row items-center q-gutter-xs no-wrap">
                  <q-avatar size="20px" color="primary" text-color="white">
                    {{ getUserInitials(scope.opt.value) }}
                  </q-avatar>
                  <span>{{ scope.opt.label }}</span>
                </div>
              </template>
            </q-select>
          </q-td>
        </template>

        <!-- 優先級欄 -->
        <template v-slot:body-cell-priority="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.priorityId"
              :options="priorityOptions"
              emit-value
              map-options
              dense
              @update:model-value="updateTask(props.row.taskId, { priorityId: $event })"
              class="priority-select"
            >
              <template v-slot:selected-item="scope">
                <div class="row items-center q-gutter-xs no-wrap">
                  <q-icon
                    :name="getPriorityIcon(scope.opt.value)"
                    :color="getPriorityColor(scope.opt.value)"
                    size="sm"
                  />
                  <span class="priority-text">{{ scope.opt.label }}</span>
                </div>
              </template>
            </q-select>
          </q-td>
        </template>

        <!-- 截止日期欄 -->
        <template v-slot:body-cell-deadline="props">
          <q-td :props="props">
            <q-input
              :model-value="formatDateForInput(props.row.endDateTime)"
              type="datetime-local"
              dense
              @update:model-value="updateTaskDate(props.row.taskId, $event)"
              class="deadline-input"
            />
          </q-td>
        </template>

        <!-- 進度欄 -->
        <template v-slot:body-cell-progress="props">
          <q-td :props="props">
            <div class="progress-cell">
              <q-slider
                :model-value="props.row.progress || 0"
                :min="0"
                :max="100"
                :step="10"
                label
                @update:model-value="$event != null && updateTask(props.row.taskId, { progress: $event })"
                class="progress-slider"
              />
            </div>
          </q-td>
        </template>

        <!-- 建立者欄 -->
        <template v-slot:body-cell-creator="props">
          <q-td :props="props">
            <div class="row items-center justify-center q-gutter-xs">
              <q-avatar size="24px" color="primary" text-color="white">
                {{ getUserInitials(props.row.creatorId) }}
              </q-avatar>
              <span class="text-caption">{{ getUserName(props.row.creatorId) }}</span>
            </div>
          </q-td>
        </template>

        <!-- 建立時間欄 -->
        <template v-slot:body-cell-createdAt="props">
          <q-td :props="props">
            <div class="text-caption">
              {{ formatDateTime(props.row.createdAt) }}
            </div>
          </q-td>
        </template>

        <!-- 更新時間欄 -->
        <template v-slot:body-cell-updatedAt="props">
          <q-td :props="props">
            <div class="text-caption">
              {{ formatDateTime(props.row.updatedAt) }}
            </div>
          </q-td>
        </template>

        <!-- 標籤欄 -->
        <template v-slot:body-cell-tags="props">
          <q-td :props="props">
            <div class="row items-center q-gutter-xs no-wrap">
              <q-chip
                v-for="(tag, index) in (props.value || [])"
                :key="index"
                dense
                size="sm"
                color="grey-3"
                text-color="grey-8"
              >
                {{ tag }}
              </q-chip>
              <span v-if="!props.value || props.value.length === 0" class="text-grey-5">
                無標籤
              </span>
            </div>
          </q-td>
        </template>

        <!-- 開始日期欄 -->
        <template v-slot:body-cell-startDate="props">
          <q-td :props="props">
            <span v-if="props.value">
              {{ formatDate(props.value) }}
            </span>
            <span v-else class="text-grey-5">-</span>
          </q-td>
        </template>

        <!-- 工期欄 -->
        <template v-slot:body-cell-duration="props">
          <q-td :props="props">
            {{ props.value }}
          </q-td>
        </template>

        <!-- 描述欄 -->
        <template v-slot:body-cell-description="props">
          <q-td :props="props">
            <div class="text-caption text-grey-7" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
              {{ props.value || '-' }}
            </div>
          </q-td>
        </template>

        <!-- 自訂欄位欄 -->
        <template
          v-for="field in visibleCustomFields"
          :key="`custom_${field.fieldId}`"
          #[`body-cell-custom_${field.fieldId}`]="props"
        >
          <q-td :props="props">
            <CustomFieldRenderer
              :field="field"
              :value="getCustomFieldValue(props.row.customFields, field.fieldId)"
              :readonly="true"
              :show-label="false"
              :show-help="false"
              dense
            />
          </q-td>
        </template>

        <!-- 操作欄 -->
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="actions-cell">
            <div class="row q-gutter-xs no-wrap actions-container">
              <q-btn
                flat
                dense
                round
                icon="add"
                size="xs"
                color="primary"
                @click="addSubtask(props.row)"
              >
                <q-tooltip>新增子任務</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="edit"
                size="xs"
                color="orange"
                @click="editTask(props.row)"
              >
                <q-tooltip>編輯任務</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="delete"
                size="xs"
                color="negative"
                @click="deleteTask(props.row)"
              >
                <q-tooltip>刪除任務</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import type { Task, View, ViewConfiguration, FilterCondition, Project, ColumnConfig, RichTextNode } from '@/types'
import { useNestedTasks } from '@/composables/useNestedTasks'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useCustomFields, useCustomFieldUtils } from '@/composables/useCustomFields'
import { getProjectRepository } from '@/services/repositories'
import CustomFieldRenderer from '@/components/business/shared/CustomFieldRenderer.vue'
import ViewColumnManager from '@/components/business/view/ViewColumnManager.vue'
import { getFieldsForView, type FieldDefinition } from '@/config/columnDefinitions'
import { getColumnConfigService } from '@/services/application/column-config.service'

// Props
const props = defineProps<{
  view: View
  tasks: Task[]
  projectId: string
  configuration?: ViewConfiguration
}>()

// Emits
const emit = defineEmits<{
  'task-click': [task: Task]
  'task-update': [taskId: string, updates: Partial<Task>]
  'task-create': [taskData: Partial<Task>]
  'task-delete': [taskId: string]
  'configuration-update': [configuration: ViewConfiguration]
}>()

const { buildTaskTree } = useNestedTasks()
const { availableUsers } = useCurrentUser()
const { visibleFields: visibleCustomFields, customFields: projectCustomFields } = useCustomFields(props.projectId)
const { getCustomFieldDisplayValue, getCustomFieldValue } = useCustomFieldUtils()
const projectRepo = getProjectRepository()
const columnConfigService = getColumnConfigService()

// 搜尋查詢
const searchQuery = ref('')

// 行內編輯狀態
const editingCell = ref<{ taskId: string; field: string } | null>(null)
const editingValue = ref('')

// 欄位管理狀態
const showColumnManager = ref(false)
const currentColumnConfig = ref<ColumnConfig[]>([])
const allFieldDefinitions = ref<FieldDefinition[]>([])

// 編輯選單狀態
const editingDateMenu = ref<string | null>(null)
const editingProgressMenu = ref<string | null>(null)

// 專案資料快取（響應式）
const projectsCache = ref<Map<string, Project>>(new Map())

// 專案展開/收合狀態管理
const PROJECT_EXPAND_KEY = 'projectExpandState_table'

function loadProjectExpandState(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(PROJECT_EXPAND_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveProjectExpandState(state: Record<string, boolean>): void {
  try {
    localStorage.setItem(PROJECT_EXPAND_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save project expand state:', error)
  }
}

const projectExpandState = ref<Record<string, boolean>>(loadProjectExpandState())

function isProjectExpanded(projectId: string): boolean {
  return projectExpandState.value[projectId] ?? true
}

function toggleProjectExpanded(projectId: string): void {
  const currentState = isProjectExpanded(projectId)
  projectExpandState.value[projectId] = !currentState
  saveProjectExpandState(projectExpandState.value)
}

// 專案排序狀態管理
const PROJECT_SORT_KEY = 'projectSortBy_table'

function loadProjectSortBy(): string {
  return localStorage.getItem(PROJECT_SORT_KEY) || 'name'
}

function saveProjectSortBy(sortBy: string): void {
  localStorage.setItem(PROJECT_SORT_KEY, sortBy)
}

const projectSortBy = ref<string>(loadProjectSortBy())

function setProjectSort(sortBy: string): void {
  projectSortBy.value = sortBy
  saveProjectSortBy(sortBy)
}

// 計算專案統計資訊
function getProjectStats(tasks: Task[]): {
  total: number
  completed: number
  inProgress: number
  overdue: number
  priority: { high: number; medium: number; low: number }
  progress: number
} {
  const total = tasks.length
  const completed = tasks.filter(task => task.statusId === 'completed').length
  const inProgress = tasks.filter(task => task.statusId === 'in-progress').length
  const overdue = tasks.filter(task => {
    if (!task.endDateTime) return false
    return new Date(task.endDateTime) < new Date() && task.statusId !== 'completed'
  }).length

  const priority = {
    high: tasks.filter(task => task.priorityId === 'high').length,
    medium: tasks.filter(task => task.priorityId === 'medium').length,
    low: tasks.filter(task => task.priorityId === 'low').length
  }

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    total,
    completed,
    inProgress,
    overdue,
    priority,
    progress
  }
}

// 載入專案資料
const loadingProjects = new Set<string>()
async function loadProjectData(projectId: string): Promise<void> {
  // 避免重複載入
  if (projectsCache.value.has(projectId) || loadingProjects.has(projectId)) {
    return
  }

  loadingProjects.add(projectId)
  try {
    const project = await projectRepo.findById(projectId)
    if (project) {
      // 使用函數式更新避免觸發不必要的響應
      projectsCache.value = new Map([...projectsCache.value, [projectId, project]])
    }
  } catch (error) {
    console.error('Failed to load project:', error)
  } finally {
    loadingProjects.delete(projectId)
  }
}

// 取得專案名稱
function getProjectName(projectId: string): string {
  const project = projectsCache.value.get(projectId)
  if (project) {
    return project.name
  }

  // 使用 nextTick 避免在渲染過程中觸發響應式更新
  nextTick(() => {
    void loadProjectData(projectId)
  })
  return '載入中...'
}

// 取得專案圖示
function getProjectIcon(projectId: string): string {
  const project = projectsCache.value.get(projectId)
  return project?.icon || 'folder'
}

// 取得專案圖示顏色
function getProjectIconColor(projectId: string): string {
  const project = projectsCache.value.get(projectId)
  return project?.iconColor || 'primary'
}

// 初始化欄位定義
function initializeFieldDefinitions(): void {
  // 取得所有可用的欄位定義（系統 + 自訂）
  allFieldDefinitions.value = getFieldsForView('table', projectCustomFields.value || [])

  // 初始化欄位配置
  if (props.configuration?.visibleColumns) {
    // 使用現有配置
    currentColumnConfig.value = columnConfigService.mergeWithFieldDefinitions(
      props.configuration.visibleColumns,
      allFieldDefinitions.value
    )
  } else {
    // 使用預設配置
    currentColumnConfig.value = columnConfigService.getDefaultColumns(
      'table',
      projectCustomFields.value || []
    )
  }

  // 加入操作欄位
  if (!currentColumnConfig.value.find(col => col.key === 'actions')) {
    currentColumnConfig.value.push({
      key: 'actions',
      label: '操作',
      visible: true,
      width: 150,
      order: currentColumnConfig.value.length,
      required: false
    })
  }
}

// 表格欄位定義
const tableColumns = computed(() => {
  const visibleColumns = currentColumnConfig.value
    .filter(col => col.visible)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  return visibleColumns.map(col => {
    // 系統欄位的特殊處理
    if (col.key === 'title') {
      return {
        name: 'title',
        label: col.label,
        align: 'left' as const,
        field: 'title',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 300px'
      }
    } else if (col.key === 'status') {
      return {
        name: 'status',
        label: col.label,
        align: 'center' as const,
        field: 'statusId',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 120px'
      }
    } else if (col.key === 'assignee') {
      return {
        name: 'assignee',
        label: col.label,
        align: 'center' as const,
        field: 'assigneeId',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 150px'
      }
    } else if (col.key === 'priority') {
      return {
        name: 'priority',
        label: col.label,
        align: 'center' as const,
        field: 'priorityId',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 120px'
      }
    } else if (col.key === 'deadline') {
      return {
        name: 'deadline',
        label: col.label,
        align: 'center' as const,
        field: 'endDateTime',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 180px'
      }
    } else if (col.key === 'progress') {
      return {
        name: 'progress',
        label: col.label,
        align: 'center' as const,
        field: 'progress',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 150px'
      }
    } else if (col.key === 'creator') {
      return {
        name: 'creator',
        label: col.label,
        align: 'center' as const,
        field: 'creatorId',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 120px'
      }
    } else if (col.key === 'createdAt') {
      return {
        name: 'createdAt',
        label: col.label,
        align: 'center' as const,
        field: 'createdAt',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 160px'
      }
    } else if (col.key === 'updatedAt') {
      return {
        name: 'updatedAt',
        label: col.label,
        align: 'center' as const,
        field: 'updatedAt',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 160px'
      }
    } else if (col.key === 'tags') {
      // 標籤欄位特殊處理
      return {
        name: 'tags',
        label: col.label,
        align: 'left' as const,
        field: (row: Task) => row.tags || [],
        sortable: false,
        style: col.width ? `width: ${col.width}px` : 'width: 200px'
      }
    } else if (col.key === 'startDate') {
      // 開始日期欄位映射
      return {
        name: 'startDate',
        label: col.label,
        align: 'center' as const,
        field: 'startDateTime',
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 120px'
      }
    } else if (col.key === 'duration') {
      // 工期欄位計算
      return {
        name: 'duration',
        label: col.label,
        align: 'center' as const,
        field: (row: Task) => {
          if (row.startDateTime && row.endDateTime) {
            const start = new Date(row.startDateTime)
            const end = new Date(row.endDateTime)
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            return days > 0 ? `${days} 天` : '0 天'
          }
          return '-'
        },
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 80px'
      }
    } else if (col.key === 'description') {
      // 描述欄位文字提取
      return {
        name: 'description',
        label: col.label,
        align: 'left' as const,
        field: (row: Task) => {
          if (!row.description) return ''
          // 提取純文字內容
          const extractText = (nodes: RichTextNode[]): string => {
            let text = ''
            for (const node of nodes || []) {
              if (node.text) {
                text += node.text
              }
              if (node.content) {
                text += extractText(node.content)
              }
            }
            return text
          }
          const fullText = extractText(row.description.content || [])
          // 限制長度
          return fullText.length > 100 ? fullText.substring(0, 100) + '...' : fullText
        },
        sortable: false,
        style: col.width ? `width: ${col.width}px` : 'width: 300px'
      }
    } else if (col.key === 'actions') {
      return {
        name: 'actions',
        label: col.label,
        align: 'center' as const,
        field: 'actions',
        style: col.width ? `width: ${col.width}px` : 'width: 150px'
      }
    } else if (col.key.startsWith('custom_')) {
      // 自訂欄位
      const fieldId = col.key.replace('custom_', '')
      return {
        name: col.key,
        label: col.label,
        align: 'left' as const,
        field: (row: Task): string => getCustomFieldDisplayValue(row.customFields, fieldId),
        sortable: true,
        style: col.width ? `width: ${col.width}px` : 'width: 150px'
      }
    }

    // 預設返回 - 應該不會到這裡，但保留作為安全網
    return {
      name: col.key,
      label: col.label,
      align: 'center' as const,
      field: () => '', // 返回空字串避免錯誤
      sortable: false,
      style: col.width ? `width: ${col.width}px` : 'width: 150px'
    }
  })
})

// 狀態選項
const statusOptions = [
  { label: '待辦', value: 'todo' },
  { label: '進行中', value: 'inProgress' },
  { label: '已完成', value: 'done' }
]

// 指派人員選項
const assigneeOptions = computed(() =>
  availableUsers.value.map(user => ({
    label: user.name,
    value: user.userId
  }))
)

// 優先級選項
const priorityOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '緊急', value: 'urgent' }
]

// 樹狀結構任務
const nestedTasks = computed(() => buildTaskTree(props.tasks))

// 根據專案分組任務
const groupedTasks = computed(() => {
  if (props.projectId !== 'all' || props.view.config.groupBy !== 'projectId') {
    return new Map()
  }

  const grouped = new Map<string, Task[]>()

  props.tasks.forEach(task => {
    const projectId = task.projectId
    if (!grouped.has(projectId)) {
      grouped.set(projectId, [])
    }
    grouped.get(projectId)!.push(task)
  })

  // 每個分組內部排序（任務排序）
  grouped.forEach((tasks) => {
    tasks.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  return grouped
})

// 專案統計資訊快取 - 使用物件而非 Map，減少響應式開銷
const projectStatsCache = computed(() => {
  if (props.projectId !== 'all' || props.view.config.groupBy !== 'projectId') {
    return {}
  }

  const cache: Record<string, ReturnType<typeof getProjectStats>> = {}

  // 直接從 props.tasks 計算，避免依賴 groupedTasks
  const grouped: Record<string, Task[]> = {}
  props.tasks.forEach(task => {
    const projectId = task.projectId
    if (!grouped[projectId]) {
      grouped[projectId] = []
    }
    grouped[projectId].push(task)
  })

  Object.entries(grouped).forEach(([projectId, tasks]) => {
    cache[projectId] = getProjectStats(tasks)
  })

  return cache
})

// 排序後的專案分組
const sortedGroupedTasks = computed(() => {
  const entries = Array.from(groupedTasks.value.entries())

  entries.sort(([projectIdA, tasksA], [projectIdB, tasksB]) => {
    if (projectSortBy.value === 'name') {
      // 直接從快取取得專案名稱，避免異步操作
      const projectA = projectsCache.value.get(projectIdA)
      const projectB = projectsCache.value.get(projectIdB)
      const nameA = projectA?.name || projectIdA
      const nameB = projectB?.name || projectIdB
      return nameA.localeCompare(nameB)
    }

    // 計算統計資訊（不依賴 computed 屬性）
    const statsA = getProjectStats(tasksA)
    const statsB = getProjectStats(tasksB)

    if (projectSortBy.value === 'taskCount') {
      return statsB.total - statsA.total
    } else if (projectSortBy.value === 'progress') {
      return statsB.progress - statsA.progress
    } else if (projectSortBy.value === 'overdue') {
      return statsB.overdue - statsA.overdue
    }

    return 0
  })

  return new Map(entries)
})


// 篩選專案任務（用於表格顯示）
function getFilteredProjectTasks(projectTasks: Task[]): Task[] {
  // 先構建樹狀結構
  const nestedProjectTasks = buildTaskTree(projectTasks)

  // 然後扁平化
  const flattenWithLevel = (tasks: Task[], level = 0): Task[] => {
    const result: Task[] = []

    tasks.forEach(task => {
      const taskWithLevel = { ...task, level }

      let passesSearch = true
      if (searchQuery.value) {
        passesSearch = task.title.toLowerCase().includes(searchQuery.value.toLowerCase())
      }

      if (passesSearch) {
        result.push(taskWithLevel)
      }

      // 如果任務有子項目且展開，遞迴處理子項目
      if ((task.isExpanded !== false) && task.children && task.children.length > 0) {
        result.push(...flattenWithLevel(task.children, level + 1))
      }
    })

    return result
  }

  return flattenWithLevel(nestedProjectTasks)
}

// 篩選後的任務（扁平化顯示，但保留層級信息）
const filteredTasks = computed(() => {
  const flattenWithLevel = (tasks: Task[], level = 0): Task[] => {
    const result: Task[] = []

    tasks.forEach(task => {
      const taskWithLevel = { ...task, level }

      // 基本搜尋篩選
      let passesSearch = true
      if (searchQuery.value) {
        passesSearch = task.title.toLowerCase().includes(searchQuery.value.toLowerCase())
      }

      // 配置篩選
      let passesConfigFilters = true
      if (props.configuration?.filters && props.configuration.filters.length > 0) {
        passesConfigFilters = props.configuration.filters.every(filter => {
          return applyFilter(task, filter)
        })
      }

      // 隱藏已完成任務篩選
      let passesCompletedFilter = true
      if (props.configuration?.hideCompleted && task.statusId === 'done') {
        passesCompletedFilter = false
      }

      if (passesSearch && passesConfigFilters && passesCompletedFilter) {
        result.push(taskWithLevel)
      }

      // 如果有子任務且展開
      if (task.children && task.children.length > 0 && task.isExpanded) {
        result.push(...flattenWithLevel(task.children, level + 1))
      }
    })

    return result
  }

  let result = flattenWithLevel(nestedTasks.value)

  // 排序
  if (props.configuration?.sortBy) {
    result = applySorting(result, props.configuration.sortBy, props.configuration.sortOrder || 'asc')
  }

  return result
})

// 是否有子任務
function hasChildren(task: Task): boolean {
  return !!(task.children && task.children.length > 0)
}

// 切換展開狀態
function toggleExpanded(task: Task): void {
  emit('task-update', task.taskId, { isExpanded: !task.isExpanded })
}

// 全部展開
function _expandAll(): void {
  props.tasks.forEach(task => {
    if (hasChildren(task) && !task.isExpanded) {
      emit('task-update', task.taskId, { isExpanded: true })
    }
  })
}

// 全部收合
function _collapseAll(): void {
  props.tasks.forEach(task => {
    if (hasChildren(task) && task.isExpanded) {
      emit('task-update', task.taskId, { isExpanded: false })
    }
  })
}

// 行內編輯相關
function isEditing(taskId: string, field: string): boolean {
  return editingCell.value?.taskId === taskId && editingCell.value?.field === field
}

function startEdit(taskId: string, field: string, currentValue: string): void {
  editingCell.value = { taskId, field }
  editingValue.value = currentValue
}

function saveEdit(taskId: string, field: string): void {
  if (editingValue.value !== undefined && editingValue.value !== null) {
    emit('task-update', taskId, { [field]: editingValue.value })
  }
  cancelEdit()
}

function cancelEdit(): void {
  editingCell.value = null
  editingValue.value = ''
}

// 更新任務
function updateTask(taskId: string, updates: Partial<Task>): void {
  emit('task-update', taskId, updates)
}

// 狀態相關函數
function getStatusIcon(statusId: string): string {
  const iconMap: Record<string, string> = {
    todo: 'radio_button_unchecked',
    inProgress: 'play_circle',
    done: 'check_circle',
    cancelled: 'cancel'
  }
  return iconMap[statusId] || 'radio_button_unchecked'
}

function getStatusColor(statusId: string): string {
  const colorMap: Record<string, string> = {
    todo: 'grey',
    inProgress: 'blue',
    done: 'green',
    cancelled: 'red'
  }
  return colorMap[statusId] || 'grey'
}

function getStatusLabel(statusId: string): string {
  const labelMap: Record<string, string> = {
    todo: '待辦',
    inProgress: '進行中',
    done: '已完成',
    cancelled: '已取消'
  }
  return labelMap[statusId] || '待辦'
}

function cycleStatus(task: Task): void {
  const statusCycle = ['todo', 'inProgress', 'done']
  const currentStatus = task.statusId || 'todo'
  const currentIndex = statusCycle.indexOf(currentStatus)
  const nextIndex = (currentIndex + 1) % statusCycle.length
  const newStatus = statusCycle[nextIndex]

  if (newStatus) {
    updateTask(task.taskId, { statusId: newStatus })
  }
}

// 更新日期
function updateTaskDate(taskId: string, dateString: string | number | null): void {
  const date = dateString ? new Date(dateString) : null
  emit('task-update', taskId, { endDateTime: date })
}

// 格式化日期給輸入框使用
function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm 格式
}

// 格式化日期顯示
function formatDate(date: Date | null | undefined): string {
  if (!date) return '未設定'
  const d = new Date(date)
  return d.toLocaleDateString('zh-TW')
}

// 更新任務時間
function updateTaskTime(taskId: string, time: Date): void {
  // 這裡需要實現時間更新邏輯
  console.log('Update task time:', taskId, time)
}

// 顯示日期選單
function showDateMenu(taskId: string, _event: Event): void {
  editingDateMenu.value = taskId
}

// 顯示進度選單
function showProgressMenu(taskId: string, _event: Event): void {
  editingProgressMenu.value = taskId
}

// 取得優先級圖標
function getPriorityIcon(priority: string): string {
  const icons = {
    'urgent': 'keyboard_double_arrow_up',
    'high': 'keyboard_arrow_up',
    'medium': 'remove',
    'low': 'keyboard_arrow_down'
  }
  return icons[priority as keyof typeof icons] || 'remove'
}

// 取得優先級顏色
function getPriorityColor(priority: string): string {
  const colors = {
    'urgent': 'red',
    'high': 'orange',
    'medium': 'grey',
    'low': 'blue'
  }
  return colors[priority as keyof typeof colors] || 'grey'
}

// 取得用戶姓名縮寫
function getUserInitials(userId: string | undefined | null): string {
  if (!userId || typeof userId !== 'string') {
    return '??'
  }

  const user = availableUsers.value.find(u => u.userId === userId)

  if (user && user.name && user.name.length > 0) {
    return user.name.substring(0, 2).toUpperCase()
  }

  // 如果沒有找到用戶或用戶名為空，使用 userId 的前兩個字符
  if (userId.length > 0) {
    return userId.substring(0, 2).toUpperCase()
  }

  return '??'
}

// 取得用戶姓名
function getUserName(userId: string | undefined | null): string {
  if (!userId || typeof userId !== 'string') {
    return '未指派'
  }

  const user = availableUsers.value.find(u => u.userId === userId)
  return user && user.name ? user.name : userId
}

// 格式化日期時間
function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 套用篩選條件
function applyFilter(task: Task, filter: FilterCondition): boolean {
  const fieldValue = getTaskFieldValue(task, filter.field)

  if (filter.operator === 'equals') {
    return fieldValue === filter.value
  } else if (filter.operator === 'notEquals') {
    return fieldValue !== filter.value
  } else if (filter.operator === 'contains') {
    if (typeof fieldValue === 'string' && typeof filter.value === 'string') {
      return fieldValue.toLowerCase().includes(filter.value.toLowerCase())
    }
    return false
  } else if (filter.operator === 'notContains') {
    if (typeof fieldValue === 'string' && typeof filter.value === 'string') {
      return !fieldValue.toLowerCase().includes(filter.value.toLowerCase())
    }
    return true
  }

  return true
}

// 取得任務欄位值
function getTaskFieldValue(task: Task, field: string): string | number | Date | null {
  const fieldMap: Record<string, string | number | Date | null> = {
    'title': task.title,
    'statusId': task.statusId,
    'assigneeId': task.assigneeId || null,
    'priorityId': task.priorityId || null,
    'creatorId': task.creatorId,
    'createdAt': task.createdAt,
    'updatedAt': task.updatedAt,
    'endDateTime': task.endDateTime || null,
    'startDateTime': task.startDateTime || null,
    'progress': task.progress || 0
  }

  return fieldMap[field] || null
}

// 套用排序
function applySorting(tasks: Task[], sortBy: string, sortOrder: 'asc' | 'desc'): Task[] {
  return [...tasks].sort((a, b) => {
    const aValue = getTaskFieldValue(a, sortBy)
    const bValue = getTaskFieldValue(b, sortBy)

    // 處理 null/undefined 值
    if (aValue === null && bValue === null) return 0
    if (aValue === null) return sortOrder === 'asc' ? 1 : -1
    if (bValue === null) return sortOrder === 'asc' ? -1 : 1

    let comparison = 0
    if (aValue < bValue) {
      comparison = -1
    } else if (aValue > bValue) {
      comparison = 1
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })
}

// 操作功能
function addSubtask(parentTask: Task): void {
  // 發出新增子任務事件，確保使用正確的專案 ID
  emit('task-create', {
    parentTaskId: parentTask.taskId,
    projectId: parentTask.projectId || props.projectId,
    title: '',
    statusId: 'todo',
    priorityId: 'medium'
  })
}

function editTask(task: Task): void {
  // 發出任務點擊事件，開啟編輯對話框
  emit('task-click', task)
}

function deleteTask(task: Task): void {
  // 發出刪除事件
  emit('task-delete', task.taskId)
}

// 處理欄位配置更新
function handleColumnConfigUpdate(columns: ColumnConfig[]): void {
  currentColumnConfig.value = columns

  // 發出配置更新事件
  emit('configuration-update', {
    ...props.configuration,
    viewType: props.configuration?.viewType || 'table',
    visibleColumns: columns
  })
}

// 暴露方法給父元件
function openColumnManager(): void {
  showColumnManager.value = true
}

// 暴露方法
defineExpose({
  openColumnManager
})

// 預載入所有專案資料
async function preloadProjectData(): Promise<void> {
  if (props.projectId === 'all' && props.view.config.groupBy === 'projectId') {
    const projectIds = new Set(props.tasks.map(task => task.projectId))

    const loadPromises = Array.from(projectIds).map(projectId =>
      loadProjectData(projectId)
    )

    await Promise.all(loadPromises)
  }
}

// 監聽任務變化，載入新專案資料
watch(() => props.tasks, (newTasks, oldTasks) => {
  // 只有當任務真的改變時才載入
  if (newTasks !== oldTasks) {
    void preloadProjectData()
  }
})

// 監聽自訂欄位變化
watch(() => projectCustomFields.value, () => {
  initializeFieldDefinitions()
}, { deep: true })

// 監聽配置變化
watch(() => props.configuration?.visibleColumns, () => {
  initializeFieldDefinitions()
}, { deep: true })

// 組件載入時預載入資料
onMounted(() => {
  void preloadProjectData()
  initializeFieldDefinitions()
})
</script>

<style scoped lang="scss">
// 緊湊型表格全局樣式 - 強制 30px 行高
.compact-table {
  // 最高優先級覆蓋：針對 Quasar dense 模式的 40px 預設高度
  :deep(.q-field--auto-height.q-field--dense .q-field__control),
  :deep(.q-field--auto-height.q-field--dense .q-field__native),
  :deep(.q-field--dense .q-field__control),
  :deep(.q-field--dense .q-field__native),
  :deep(.q-field--dense .q-field__marginal) {
    min-height: 30px !important;
    height: 30px !important;
    max-height: 30px !important;
    box-sizing: border-box !important;
  }
  
  // 全局覆蓋所有 Quasar 組件高度
  :deep(.q-field),
  :deep(.q-select),
  :deep(.q-input),
  :deep(.q-btn:not(.status-btn)) {
    height: 30px !important;
    min-height: 30px !important;
    max-height: 30px !important;
  }

  :deep(.q-field__control),
  :deep(.q-select__control),
  :deep(.q-input__control) {
    min-height: 30px !important;
    height: 30px !important;
    max-height: 30px !important;
    padding: 0 8px !important;
  }

  :deep(.q-field__native),
  :deep(.q-select__native),
  :deep(.q-input__native) {
    height: 30px !important;
    line-height: 30px !important;
    padding: 0 !important;
  }

  :deep(.q-field__control-container) {
    height: 30px !important;
    min-height: 30px !important;
  }

  :deep(.q-slider) {
    height: 30px !important;

    .q-slider__track-container {
      height: 30px !important;
    }

    .q-slider__track {
      height: 4px !important;
      top: 13px !important;
    }

    .q-slider__thumb {
      top: 9px !important;
    }
  }

  // 狀態按鈕特殊處理
  :deep(.status-btn) {
    height: 24px !important;
    width: 24px !important;
    min-height: 24px !important;
    min-width: 24px !important;
  }

  // 操作按鈕
  :deep(.actions-container .q-btn) {
    height: 20px !important;
    min-height: 20px !important;
    width: 20px !important;
    min-width: 20px !important;
    padding: 0 !important;
  }
}

// 專門針對緊湊行高的樣式 - 使用最高優先級覆蓋 Quasar 預設
.compact-rows {
  // 使用 CSS 變數設定行高
  --q-table-row-height: 30px;
  --q-table-cell-height: 30px;

  // 直接針對 Quasar 表格元素設定高度
  :deep(.q-table) {
    thead tr {
      height: 30px !important;
    }

    tbody tr {
      height: 30px !important;
      max-height: 30px !important;
    }

    thead th,
    tbody td {
      height: 30px !important;
      max-height: 30px !important;
      padding: 0px 8px !important;
      line-height: 30px !important;
      vertical-align: middle !important;
    }
  }

  // 針對 Quasar dense 模式的額外優化
  &.q-table--dense {
    :deep(.q-table) {
      tbody tr {
        height: 30px !important;
      }

      tbody td {
        height: 30px !important;
        padding: 0px 6px !important;
        line-height: 30px !important;
      }
    }
  }
}

.task-table-view {
  background-color: $grey-1;


  .table-toolbar {
    border-bottom: 1px solid $grey-4;
  }

  .table-container {
    // 專案分組樣式
    .project-group {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s ease;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .project-group-header {
        border-bottom: 1px solid #e0e0e0;
        transition: background-color 0.2s ease;
        overflow: hidden;

        &:hover {
          background-color: #f5f5f5 !important;
        }

        .project-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex-shrink: 0;
          min-width: 0;
        }

        .project-stats {
          flex-shrink: 0;

          .q-badge {
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
          }
        }
      }

      .project-task-table {
        background-color: white;

        .q-table__top {
          padding: 0;
        }

        thead {
          th {
            position: sticky;
            top: 0;
            background-color: $grey-2;
            font-weight: 600;
            border-bottom: 2px solid $grey-4;
          }
        }

        tbody {
          tr {
            height: 30px !important;
            border-bottom: 1px solid $grey-3;

            &:hover {
              background-color: $grey-1;
            }

            &:last-child {
              border-bottom: none;
            }
          }

          td {
            padding: 0 6px !important;
            height: 30px !important;
            line-height: 30px !important;
            vertical-align: middle;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 0;

            // 強制所有 Quasar 組件符合 30px 行高
            .q-field,
            .q-select,
            .q-input,
            .q-btn,
            .q-slider {
              height: 30px !important;
              min-height: 30px !important;
              max-height: 30px !important;
            }

            .q-field__control,
            .q-select__control,
            .q-input__control {
              min-height: 30px !important;
              height: 30px !important;
              max-height: 30px !important;
              padding: 0 8px !important;
            }

            .q-field__native,
            .q-select__native,
            .q-input__native {
              height: 30px !important;
              line-height: 30px !important;
              padding: 0 !important;
            }

            .q-field__control-container {
              height: 30px !important;
              min-height: 30px !important;
            }

            .q-btn {
              height: 20px !important;
              min-height: 20px !important;
              width: 20px !important;
              min-width: 20px !important;
              padding: 0 !important;

              &.status-btn {
                height: 24px !important;
                width: 24px !important;
                min-height: 24px !important;
                min-width: 24px !important;
              }
            }
          }
        }

        // 任務標題欄樣式
        .task-title-cell {
          .task-title-wrapper {
            .table-expand-btn-spacer {
              width: 20px !important;
              min-width: 20px !important;
              flex-shrink: 0 !important;
              display: inline-block;
            }
          }
        }
      }
    }

    .task-table {
      background-color: white;

      .q-table__top {
        padding: 0;
      }

      thead {
        th {
          position: sticky;
          top: 0;
          background-color: $grey-2;
          font-weight: 600;
          border-bottom: 2px solid $grey-4;
        }
      }

      tbody {
        tr {
          height: 30px !important;
          border-bottom: 1px solid $grey-3;

          &:hover {
            background-color: $grey-1;
          }

          &:last-child {
            border-bottom: none;
          }
        }

        td {
          padding: 0 6px;
          height: 30px !important;
          line-height: 30px !important;
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 0;

          // 強制所有 Quasar 組件符合 30px 行高
          .q-field,
          .q-select,
          .q-input,
          .q-btn,
          .q-slider {
            height: 30px !important;
            min-height: 30px !important;
            max-height: 30px !important;
          }

          .q-field__control,
          .q-select__control,
          .q-input__control {
            min-height: 30px !important;
            height: 30px !important;
            max-height: 30px !important;
            padding: 0 8px !important;
          }

          .q-field__native,
          .q-select__native,
          .q-input__native {
            height: 30px !important;
            line-height: 30px !important;
            padding: 0 !important;
          }

          .q-field__marginal {
            height: 30px !important;
            line-height: 30px !important;
            padding: 0 !important;
          }

          .q-field__control-container {
            height: 30px !important;
            min-height: 30px !important;
          }

          .q-btn {
            height: 20px !important;
            min-height: 20px !important;
            width: 20px !important;
            min-width: 20px !important;
            padding: 0 !important;

            &.status-btn {
              height: 24px !important;
              width: 24px !important;
              min-height: 24px !important;
              min-width: 24px !important;
            }
          }
        }
      }

              .task-title-cell {
          overflow: hidden;

          .task-title-wrapper {
            display: flex;
            align-items: center;
            height: 30px;
            white-space: nowrap;
            overflow: hidden;

          .expand-btn {
            min-width: 18px;
            width: 18px;
            height: 18px;
            padding: 0;
            margin-right: 2px;
            flex-shrink: 0;
          }

          .table-expand-btn-spacer,
          .expand-btn-spacer {
            width: 20px !important;
            min-width: 20px !important;
            flex-shrink: 0 !important;
            display: inline-block;
          }

          .task-title-display {
            flex: 1;
            min-width: 0;
            padding: 0 4px;
            line-height: 30px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            border-radius: 4px;

            &:hover {
              background-color: $grey-2;
            }
          }

          .task-title-input {
            flex: 1;
            min-width: 0;
            height: 30px !important;

            .q-field__control {
              min-height: 30px !important;
              height: 30px !important;
              padding: 0 8px !important;
            }

            .q-field__native {
              height: 30px !important;
              line-height: 30px !important;
              padding: 0 !important;
            }

            .q-field__control-container {
              height: 30px !important;
              min-height: 30px !important;
            }
          }
        }
      }

      .status-select,
      .assignee-select,
      .priority-select {
        min-width: 100px;
        white-space: nowrap;
        height: 30px !important;

        .q-field__control {
          min-height: 30px !important;
          height: 30px !important;
          padding: 0 8px !important;
        }

        .q-field__native {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          height: 30px !important;
          line-height: 30px !important;
          padding: 0 !important;
        }

        .priority-text {
          white-space: nowrap;
          flex-shrink: 0;
        }

        .q-field__control-container {
          height: 30px !important;
          min-height: 30px !important;
        }
      }

      .deadline-input {
        min-width: 160px;
        white-space: nowrap;
        height: 30px !important;

        .q-field__control {
          min-height: 30px !important;
          height: 30px !important;
          padding: 0 8px !important;
        }

        .q-field__native {
          white-space: nowrap;
          height: 30px !important;
          line-height: 30px !important;
          padding: 0 !important;
        }

        .q-field__control-container {
          height: 30px !important;
          min-height: 30px !important;
        }
      }

      .progress-cell {
        padding: 0 16px;
        height: 30px !important;

        .progress-slider {
          width: 120px;
          height: 30px !important;

          .q-slider__track-container {
            height: 30px !important;
          }

          .q-slider__track {
            height: 4px !important;
            top: 13px !important;
          }

          .q-slider__thumb {
            top: 9px !important;
          }
        }
      }

      .actions-cell {
        overflow: hidden;

        .actions-container {
          overflow: hidden;

          .q-btn {
            width: 20px;
            height: 20px;
            min-width: 20px;
            flex-shrink: 0;
          }
        }
      }
    }
  }
}
</style>

<!-- Global CSS fallback for maximum table row height override -->
<style lang="scss">
// 全局 CSS 覆蓋 - 確保所有 TaskTableView 表格行高為 30px
.task-table-view {
  // 最高優先級：覆蓋 Quasar dense 模式的 40px 預設高度
  .q-field--auto-height.q-field--dense .q-field__control,
  .q-field--auto-height.q-field--dense .q-field__native,
  .q-field--dense .q-field__control,
  .q-field--dense .q-field__native,
  .q-field--dense .q-field__marginal {
    min-height: 30px !important;
    height: 30px !important;
    max-height: 30px !important;
    box-sizing: border-box !important;
  }
  
  // 覆蓋所有 Quasar 表單組件
  .q-field .q-field__control,
  .q-field .q-field__native,
  .q-select .q-field__control,
  .q-select .q-field__native,
  .q-input .q-field__control,
  .q-input .q-field__native {
    min-height: 30px !important;
    height: 30px !important;
    max-height: 30px !important;
  }
  
  .q-table {
    thead tr, tbody tr {
      height: 30px !important;
      max-height: 30px !important;
    }

    thead th, tbody td {
      height: 30px !important;
      max-height: 30px !important;
      padding: 0px 8px !important;
      line-height: 30px !important;
      vertical-align: middle !important;
    }

    // Quasar dense 模式覆蓋
    &.q-table--dense {
      thead tr, tbody tr {
        height: 30px !important;
      }

      thead th, tbody td {
        height: 30px !important;
        padding: 0px 6px !important;
        line-height: 30px !important;
      }
    }
  }
}
</style>
