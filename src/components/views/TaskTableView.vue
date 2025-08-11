<template>
  <div class="task-table-view">

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
                  <q-badge
                    color="grey"
                    :label="`${getCachedProjectStats(projectId).total} 任務`"
                  />
                  <q-badge
                    :color="getCachedProjectStats(projectId).progress === 100 ? 'positive' : 'info'"
                    :label="`${getCachedProjectStats(projectId).progress}%`"
                  />
                  <q-badge
                    v-if="getCachedProjectStats(projectId).overdue > 0"
                    color="negative"
                    :label="`${getCachedProjectStats(projectId).overdue} 逾期`"
                  />
                  <q-badge
                    v-if="getCachedProjectStats(projectId).inProgress > 0"
                    color="warning"
                    :label="`${getCachedProjectStats(projectId).inProgress} 進行中`"
                  />
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
              flat
              square
              :pagination="{ rowsPerPage: 0 }"
              hide-pagination
              :table-style="{ minHeight: '300px' }"
              class="project-task-table"
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
                borderless
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
              outlined
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
              outlined
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
              outlined
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
        flat
        :pagination="{ rowsPerPage: 0 }"
        hide-pagination
        class="task-table full-height"
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
                borderless
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
              outlined
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
              outlined
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
              outlined
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
import { computed, ref, onMounted, watch } from 'vue'
import type { Task, View, ViewConfiguration, FilterCondition, Project } from '@/types'
import { useNestedTasks } from '@/composables/useNestedTasks'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useCustomFields, useCustomFieldUtils } from '@/composables/useCustomFields'
import { getProjectRepository } from '@/services/repositories'
import CustomFieldRenderer from '@/components/fields/CustomFieldRenderer.vue'

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
}>()

const { buildTaskTree } = useNestedTasks()
const { availableUsers } = useCurrentUser()
const { visibleFields: visibleCustomFields } = useCustomFields(props.projectId)
const { getCustomFieldDisplayValue, getCustomFieldValue } = useCustomFieldUtils()
const projectRepo = getProjectRepository()

// 搜尋查詢
const searchQuery = ref('')

// 行內編輯狀態
const editingCell = ref<{ taskId: string; field: string } | null>(null)
const editingValue = ref('')

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
async function loadProjectData(projectId: string): Promise<void> {
  if (!projectsCache.value.has(projectId)) {
    try {
      const project = await projectRepo.findById(projectId)
      if (project) {
        projectsCache.value.set(projectId, project)
        // 觸發響應式更新
        projectsCache.value = new Map(projectsCache.value)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    }
  }
}

// 取得專案名稱
function getProjectName(projectId: string): string {
  const project = projectsCache.value.get(projectId)
  if (project) {
    return project.name
  }

  // 非同步載入專案資料
  void loadProjectData(projectId)
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

// 所有可用欄位定義
const availableColumns = [
  {
    name: 'title',
    required: true,
    label: '任務標題',
    align: 'left' as const,
    field: 'title',
    sortable: true,
    style: 'width: 300px'
  },
  {
    name: 'status',
    label: '狀態',
    align: 'center' as const,
    field: 'statusId',
    sortable: true,
    style: 'width: 120px'
  },
  {
    name: 'assignee',
    label: '指派人員',
    align: 'center' as const,
    field: 'assigneeId',
    sortable: true,
    style: 'width: 150px'
  },
  {
    name: 'priority',
    label: '優先級',
    align: 'center' as const,
    field: 'priorityId',
    sortable: true,
    style: 'width: 120px'
  },
  {
    name: 'deadline',
    label: '截止日期',
    align: 'center' as const,
    field: 'endDateTime',
    sortable: true,
    style: 'width: 180px'
  },
  {
    name: 'progress',
    label: '進度',
    align: 'center' as const,
    field: 'progress',
    sortable: true,
    style: 'width: 150px'
  },
  {
    name: 'creator',
    label: '建立者',
    align: 'center' as const,
    field: 'creatorId',
    sortable: true,
    style: 'width: 120px'
  },
  {
    name: 'createdAt',
    label: '建立時間',
    align: 'center' as const,
    field: 'createdAt',
    sortable: true,
    style: 'width: 160px'
  },
  {
    name: 'updatedAt',
    label: '更新時間',
    align: 'center' as const,
    field: 'updatedAt',
    sortable: true,
    style: 'width: 160px'
  },
  {
    name: 'actions',
    label: '操作',
    align: 'center' as const,
    field: 'actions',
    style: 'width: 150px'
  }
]

// 表格欄位定義（根據配置篩選）
const tableColumns = computed(() => {
  let systemColumns = availableColumns

  if (!props.configuration?.visibleColumns) {
    // 預設顯示的欄位
    systemColumns = availableColumns.filter(col =>
      ['title', 'status', 'assignee', 'priority', 'deadline', 'progress', 'actions'].includes(col.name)
    )
  } else {
    // 根據配置顯示欄位
    const visibleColumnKeys = props.configuration.visibleColumns
      .filter(col => col.visible)
      .map(col => col.key)

    systemColumns = availableColumns.filter(col =>
      visibleColumnKeys.includes(col.name) || col.name === 'actions'
    )

    // 套用自訂寬度
    systemColumns = systemColumns.map(col => {
      const configCol = props.configuration?.visibleColumns?.find(c => c.key === col.name)
      return {
        ...col,
        style: configCol?.width ? `width: ${configCol.width}px` : col.style
      }
    })
  }

  // 添加自訂欄位欄
  const customFieldColumns = visibleCustomFields.value.map(field => ({
    name: `custom_${field.fieldId}`,
    label: field.name,
    align: 'left' as const,
    field: (row: Task): string => getCustomFieldDisplayValue(row.customFields, field.fieldId),
    sortable: true,
    style: `width: ${field.type === 'text' ? '200' : '150'}px`
  }))

  // 找到 actions 欄位的索引
  const actionsIndex = systemColumns.findIndex(col => col.name === 'actions')

  if (actionsIndex >= 0) {
    // 在 actions 欄位前插入自訂欄位
    return [
      ...systemColumns.slice(0, actionsIndex),
      ...customFieldColumns,
      ...systemColumns.slice(actionsIndex)
    ]
  } else {
    // 如果沒有 actions 欄位，直接添加到最後
    return [...systemColumns, ...customFieldColumns]
  }
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

// 排序後的專案分組
const sortedGroupedTasks = computed(() => {
  const entries = Array.from(groupedTasks.value.entries())

  entries.sort(([projectIdA, _tasksA], [projectIdB, _tasksB]) => {
    const statsA = projectStatsCache.value.get(projectIdA)
    const statsB = projectStatsCache.value.get(projectIdB)

    if (!statsA || !statsB) return 0

    if (projectSortBy.value === 'name') {
      const nameA = getProjectName(projectIdA)
      const nameB = getProjectName(projectIdB)
      return nameA.localeCompare(nameB)
    } else if (projectSortBy.value === 'taskCount') {
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

// 專案統計資訊快取
const projectStatsCache = computed(() => {
  const cache = new Map<string, ReturnType<typeof getProjectStats>>()

  groupedTasks.value.forEach((tasks, projectId) => {
    cache.set(projectId, getProjectStats(tasks))
  })

  return cache
})

// 取得專案統計資訊（從快取）
function getCachedProjectStats(projectId: string): {
  total: number
  completed: number
  inProgress: number
  overdue: number
  priority: { high: number; medium: number; low: number }
  progress: number
} {
  return projectStatsCache.value.get(projectId) || {
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
    priority: { high: 0, medium: 0, low: 0 },
    progress: 0
  }
}

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
watch(() => props.tasks, () => {
  void preloadProjectData()
}, { immediate: true })

// 組件載入時預載入資料
onMounted(() => {
  void preloadProjectData()
})
</script>

<style scoped lang="scss">
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
            height: 32px;
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
            height: 32px;
            line-height: 32px;
            vertical-align: middle;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 0;
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
          height: 32px;
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
          height: 32px;
          line-height: 32px;
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 0;
        }
      }

      .task-title-cell {
        overflow: hidden;

        .task-title-wrapper {
          display: flex;
          align-items: center;
          height: 32px;
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
            line-height: 32px;
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
            .q-field__control {
              min-height: 24px;
              height: 24px;
            }
          }
        }
      }

      .status-select,
      .assignee-select,
      .priority-select {
        min-width: 100px;
        white-space: nowrap;

        .q-field__control {
          min-height: 24px;
          height: 24px;
        }

        .q-field__native {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .priority-text {
          white-space: nowrap;
          flex-shrink: 0;
        }
      }

      .deadline-input {
        min-width: 160px;
        white-space: nowrap;

        .q-field__control {
          min-height: 24px;
          height: 24px;
        }

        .q-field__native {
          white-space: nowrap;
        }
      }

      .progress-cell {
        padding: 0 16px;

        .progress-slider {
          width: 120px;
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
