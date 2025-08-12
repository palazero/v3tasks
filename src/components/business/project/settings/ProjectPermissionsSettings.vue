<template>
  <div class="project-permissions-settings">
    <div class="settings-section-header">
      <h5 class="text-h5 q-mt-none q-mb-sm">權限設定</h5>
      <p class="text-body2 text-grey-6 q-mt-none">
        設定專案成員的權限和存取控制。只有專案擁有者才能修改這些設定。
      </p>
    </div>

    <q-separator class="q-mb-lg" />

    <!-- 專案可見性 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">專案可見性</div>
          
          <q-option-group
            v-model="localProject.visibility"
            :options="visibilityOptions"
            color="primary"
            @update:model-value="emitChange"
          >
            <template v-slot:label="opt">
              <div class="row items-center q-gutter-sm full-width">
                <q-icon :name="opt.icon" size="sm" />
                <div class="col">
                  <div class="text-body2 text-weight-medium">{{ opt.label }}</div>
                  <div class="text-caption text-grey-6">{{ opt.description }}</div>
                </div>
              </div>
            </template>
          </q-option-group>
        </q-card>
      </div>
    </div>

    <!-- 成員權限 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">成員權限</div>
          
          <div class="permissions-grid">
            <div
              v-for="permission in permissions"
              :key="permission.key"
              class="permission-item"
            >
              <div class="permission-header">
                <q-icon :name="permission.icon" size="sm" class="q-mr-sm" />
                <span class="text-body2 text-weight-medium">{{ permission.title }}</span>
              </div>
              
              <div class="permission-description text-caption text-grey-6 q-mb-sm">
                {{ permission.description }}
              </div>
              
              <q-select
                v-model="permission.level"
                :options="permissionLevels"
                emit-value
                map-options
                outlined
                dense
                @update:model-value="updatePermission(permission.key, $event)"
              />
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 進階設定 -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">進階設定</div>
          
          <div class="advanced-settings">
            <q-toggle
              v-model="localProject.allowGuestAccess"
              label="允許訪客存取"
              @update:model-value="emitChange"
            />
            <div class="text-caption text-grey-6 q-mb-md">
              啟用後，未登入用戶也可以檢視公開專案的基本資訊
            </div>

            <q-toggle
              v-model="localProject.requireApproval"
              label="成員加入需要審核"
              @update:model-value="emitChange"
            />
            <div class="text-caption text-grey-6 q-mb-md">
              啟用後，新成員需要專案擁有者或管理員審核才能加入
            </div>

            <q-toggle
              v-model="localProject.allowMemberInvite"
              label="允許成員邀請其他人"
              @update:model-value="emitChange"
            />
            <div class="text-caption text-grey-6 q-mb-md">
              啟用後，一般成員也可以邀請新成員加入專案
            </div>

            <q-separator class="q-my-md" />

            <div class="text-subtitle2 q-mb-sm">資料匯出權限</div>
            <q-select
              v-model="localProject.exportPermission"
              :options="exportPermissionOptions"
              emit-value
              map-options
              outlined
              dense
              @update:model-value="emitChange"
              class="q-mb-md"
            />

            <div class="text-subtitle2 q-mb-sm">任務刪除權限</div>
            <q-select
              v-model="localProject.deletePermission"
              :options="deletePermissionOptions"
              emit-value
              map-options
              outlined
              dense
              @update:model-value="emitChange"
            />
          </div>
        </q-card>
      </div>
    </div>

    <!-- 權限預覽 -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">權限摘要</div>
          
          <q-markup-table flat bordered>
            <thead>
              <tr>
                <th class="text-left">功能</th>
                <th class="text-center">擁有者</th>
                <th class="text-center">管理員</th>
                <th class="text-center">成員</th>
                <th class="text-center">檢視者</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="feature in featurePermissions" :key="feature.name">
                <td>{{ feature.name }}</td>
                <td class="text-center">
                  <q-icon name="check" color="positive" v-if="feature.owner" />
                  <q-icon name="close" color="negative" v-else />
                </td>
                <td class="text-center">
                  <q-icon name="check" color="positive" v-if="feature.admin" />
                  <q-icon name="close" color="negative" v-else />
                </td>
                <td class="text-center">
                  <q-icon name="check" color="positive" v-if="feature.member" />
                  <q-icon name="close" color="negative" v-else />
                </td>
                <td class="text-center">
                  <q-icon name="check" color="positive" v-if="feature.viewer" />
                  <q-icon name="close" color="negative" v-else />
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Project } from '@/types'

// Props
const props = defineProps<{
  project: Project | null
}>()

// Emits
const emit = defineEmits<{
  'update:project': [project: Project]
  'change': []
}>()

// 本地專案資料
const localProject = ref<Project & {
  visibility?: string
  allowGuestAccess?: boolean
  requireApproval?: boolean
  allowMemberInvite?: boolean
  exportPermission?: string
  deletePermission?: string
}>({
  projectId: '',
  name: '',
  description: '',
  icon: 'folder',
  ownerId: '',
  memberIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  visibility: 'private',
  allowGuestAccess: false,
  requireApproval: true,
  allowMemberInvite: false,
  exportPermission: 'admin',
  deletePermission: 'owner'
})

// 可見性選項
const visibilityOptions = [
  {
    label: '私人專案',
    value: 'private',
    icon: 'lock',
    description: '只有專案成員可以存取'
  },
  {
    label: '內部專案',
    value: 'internal',
    icon: 'business',
    description: '組織內所有用戶都可以檢視'
  },
  {
    label: '公開專案',
    value: 'public',
    icon: 'public',
    description: '任何人都可以檢視專案內容'
  }
]

// 權限級別
const permissionLevels = [
  { label: '擁有者', value: 'owner' },
  { label: '管理員', value: 'admin' },
  { label: '成員', value: 'member' },
  { label: '檢視者', value: 'viewer' },
  { label: '無權限', value: 'none' }
]

// 匯出權限選項
const exportPermissionOptions = [
  { label: '只有擁有者', value: 'owner' },
  { label: '擁有者和管理員', value: 'admin' },
  { label: '所有成員', value: 'member' }
]

// 刪除權限選項
const deletePermissionOptions = [
  { label: '只有擁有者', value: 'owner' },
  { label: '擁有者和管理員', value: 'admin' },
  { label: '所有成員', value: 'member' }
]

// 權限設定
const permissions = ref([
  {
    key: 'createTask',
    title: '建立任務',
    description: '允許建立新的任務',
    icon: 'add_task',
    level: 'member'
  },
  {
    key: 'editTask',
    title: '編輯任務',
    description: '允許編輯現有任務',
    icon: 'edit',
    level: 'member'
  },
  {
    key: 'deleteTask',
    title: '刪除任務',
    description: '允許刪除任務',
    icon: 'delete',
    level: 'admin'
  },
  {
    key: 'manageViews',
    title: '管理視圖',
    description: '允許建立和修改專案視圖',
    icon: 'view_module',
    level: 'member'
  },
  {
    key: 'manageMembers',
    title: '管理成員',
    description: '允許邀請和移除專案成員',
    icon: 'people',
    level: 'admin'
  },
  {
    key: 'exportData',
    title: '匯出資料',
    description: '允許匯出專案資料',
    icon: 'download',
    level: 'admin'
  }
])

// 功能權限矩陣
const featurePermissions = [
  { name: '檢視專案', owner: true, admin: true, member: true, viewer: true },
  { name: '建立任務', owner: true, admin: true, member: true, viewer: false },
  { name: '編輯任務', owner: true, admin: true, member: true, viewer: false },
  { name: '刪除任務', owner: true, admin: true, member: false, viewer: false },
  { name: '管理成員', owner: true, admin: true, member: false, viewer: false },
  { name: '管理視圖', owner: true, admin: true, member: true, viewer: false },
  { name: '匯出資料', owner: true, admin: true, member: false, viewer: false },
  { name: '專案設定', owner: true, admin: false, member: false, viewer: false }
]

// 更新權限
function updatePermission(key: string, level: string): void {
  const permission = permissions.value.find(p => p.key === key)
  if (permission) {
    permission.level = level
    emitChange()
  }
}

// 發出變更事件
function emitChange(): void {
  emit('update:project', localProject.value)
  emit('change')
}

// 監聽 props 變化
watch(() => props.project, (newProject) => {
  if (newProject) {
    localProject.value = {
      ...newProject,
      visibility: 'private',
      allowGuestAccess: false,
      requireApproval: true,
      allowMemberInvite: false,
      exportPermission: 'admin',
      deletePermission: 'owner'
    }
  }
}, { immediate: true, deep: true })
</script>

<style scoped lang="scss">
.project-permissions-settings {
  .settings-section-header {
    margin-bottom: 24px;
  }

  .permissions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }

  .permission-item {
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fafafa;

    .permission-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .permission-description {
      margin-bottom: 12px;
      min-height: 32px;
    }
  }

  .advanced-settings {
    .q-toggle {
      margin-bottom: 8px;
    }
  }
}
</style>