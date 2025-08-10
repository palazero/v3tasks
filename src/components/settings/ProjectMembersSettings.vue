<template>
  <div class="project-members-settings">
    <div class="settings-section-header">
      <h5 class="text-h5 q-mt-none q-mb-sm">成員管理</h5>
      <p class="text-body2 text-grey-6 q-mt-none">
        管理專案成員、設定角色權限，以及控制專案存取權限。
      </p>
    </div>

    <q-separator class="q-mb-lg" />

    <!-- 專案擁有者 -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="text-subtitle1 text-weight-medium q-mb-md">專案擁有者</div>
          
          <div class="owner-card">
            <q-item class="q-pa-none">
              <q-item-section avatar>
                <q-avatar size="48px" color="orange" text-color="white">
                  <q-icon v-if="!ownerInfo.avatar" name="person" />
                  <img v-else :src="ownerInfo.avatar" :alt="ownerInfo.name" />
                </q-avatar>
              </q-item-section>
              
              <q-item-section>
                <q-item-label class="text-subtitle1 text-weight-medium">
                  {{ ownerInfo.name }}
                </q-item-label>
                <q-item-label caption>
                  <q-chip size="sm" color="orange" text-color="white" dense>
                    專案擁有者
                  </q-chip>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="text-caption text-grey-6">
                  完整控制權限
                </div>
              </q-item-section>
            </q-item>
          </div>

          <q-separator class="q-my-md" />

          <div class="text-caption text-grey-6">
            專案擁有者擁有專案的完整控制權，包括管理成員、修改設定、刪除專案等權限。
          </div>
        </q-card>
      </div>
    </div>

    <!-- 專案成員 -->
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="q-pa-md">
          <div class="row items-center justify-between q-mb-md">
            <div class="text-subtitle1 text-weight-medium">專案成員 ({{ members.length }})</div>
            <q-btn
              v-if="canManageMembers"
              color="primary"
              icon="person_add"
              label="新增成員"
              size="sm"
              @click="showAddMemberDialog = true"
            />
          </div>

          <!-- 成員列表 -->
          <div v-if="members.length > 0" class="members-list">
            <q-item
              v-for="member in members"
              :key="member.userId"
              class="member-item"
            >
              <q-item-section avatar>
                <q-avatar size="40px" color="blue" text-color="white">
                  <q-icon v-if="!member.avatar" name="person" />
                  <img v-else :src="member.avatar" :alt="member.name" />
                </q-avatar>
              </q-item-section>
              
              <q-item-section>
                <q-item-label class="text-subtitle2">
                  {{ member.name }}
                </q-item-label>
                <q-item-label caption>
                  {{ member.email || '未設定 Email' }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="row items-center q-gutter-sm">
                  <!-- 角色標籤 -->
                  <q-chip
                    size="sm"
                    :color="getMemberRoleColor(member.userId)"
                    :text-color="getMemberRoleTextColor(member.userId)"
                    dense
                  >
                    {{ getMemberRoleName(member.userId) }}
                  </q-chip>

                  <!-- 操作按鈕 -->
                  <q-btn-dropdown
                    v-if="canManageMembers && member.userId !== currentUserId"
                    flat
                    dense
                    round
                    icon="more_vert"
                    size="sm"
                  >
                    <q-list dense>
                      <q-item clickable @click="changeRole(member.userId)">
                        <q-item-section avatar>
                          <q-icon name="swap_horiz" />
                        </q-item-section>
                        <q-item-section>變更角色</q-item-section>
                      </q-item>
                      
                      <q-separator />
                      
                      <q-item clickable @click="removeMember(member.userId)">
                        <q-item-section avatar>
                          <q-icon name="person_remove" color="negative" />
                        </q-item-section>
                        <q-item-section>移除成員</q-item-section>
                      </q-item>
                    </q-list>
                  </q-btn-dropdown>
                </div>
              </q-item-section>
            </q-item>
          </div>

          <!-- 無成員狀態 -->
          <div v-else class="text-center q-pa-lg text-grey-6">
            <q-icon name="people_outline" size="3em" />
            <div class="q-mt-sm">尚無其他成員</div>
            <div class="text-caption">點擊「新增成員」邀請其他人加入專案</div>
          </div>
        </q-card>
      </div>
    </div>

    <!-- 新增成員對話框 -->
    <q-dialog v-model="showAddMemberDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">新增專案成員</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-select
            v-model="selectedNewMember"
            :options="availableUsersForAdd"
            option-label="name"
            option-value="userId"
            outlined
            label="選擇用戶"
            emit-value
            map-options
            clearable
          >
            <template v-slot:selected-item="scope">
              <div class="row items-center q-gutter-sm">
                <q-avatar size="24px" color="primary" text-color="white">
                  <q-icon v-if="!scope.opt.avatar" name="person" />
                  <img v-else :src="scope.opt.avatar" :alt="scope.opt.name" />
                </q-avatar>
                <span>{{ scope.opt.name }}</span>
              </div>
            </template>

            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-avatar size="32px" color="primary" text-color="white">
                    <q-icon v-if="!scope.opt.avatar" name="person" />
                    <img v-else :src="scope.opt.avatar" :alt="scope.opt.name" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.name }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.email || '未設定 Email' }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" v-close-popup />
          <q-btn
            color="primary"
            label="新增"
            :disabled="!selectedNewMember"
            @click="addMember"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import type { Project, User } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { usePermission } from '@/composables/usePermission'
import { getUserRepository } from '@/services/repositories'

// Props
const props = defineProps<{
  project: Project | null
}>()

// Emits
const emit = defineEmits<{
  'update:project': [project: Project]
  'change': []
}>()

const $q = useQuasar()
const { availableUsers, currentUserId, getUserDisplayName, getUserAvatar } = useCurrentUser()
const { isProjectOwner } = usePermission()
const userRepo = getUserRepository()

// 狀態
const showAddMemberDialog = ref(false)
const selectedNewMember = ref<string | null>(null)
const members = ref<User[]>([])

// 計算屬性
const canManageMembers = computed(() => {
  return props.project && isProjectOwner(props.project.ownerId)
})

const ownerInfo = computed(() => {
  if (!props.project) return { name: '', avatar: null }
  return {
    name: getUserDisplayName(props.project.ownerId),
    avatar: getUserAvatar(props.project.ownerId)
  }
})

const availableUsersForAdd = computed(() => {
  if (!props.project) return []
  
  const existingMemberIds = [props.project.ownerId, ...props.project.memberIds]
  return availableUsers.value.filter(user => !existingMemberIds.includes(user.userId))
})

// 載入成員資料
async function loadMembers(): Promise<void> {
  if (!props.project) return
  
  try {
    const memberUsers = await userRepo.findByIds(props.project.memberIds)
    members.value = memberUsers
  } catch (error) {
    console.error('Failed to load members:', error)
    $q.notify({
      type: 'negative',
      message: '載入成員資料失敗',
      position: 'top'
    })
  }
}

// 取得成員角色名稱
function getMemberRoleName(_userId: string): string {
  if (!props.project) return '成員'
  return userId === props.project.ownerId ? '擁有者' : '成員'
}

// 取得成員角色顏色
function getMemberRoleColor(userId: string): string {
  if (!props.project) return 'blue'
  return userId === props.project.ownerId ? 'orange' : 'blue'
}

// 取得成員角色文字顏色
function getMemberRoleTextColor(_userId: string): string {
  return 'white'
}

// 新增成員
async function addMember(): Promise<void> {
  if (!props.project || !selectedNewMember.value) return

  try {
    const updatedProject = {
      ...props.project,
      memberIds: [...props.project.memberIds, selectedNewMember.value],
      updatedAt: new Date()
    }

    emit('update:project', updatedProject)
    emit('change')
    
    await loadMembers()
    
    $q.notify({
      type: 'positive',
      message: '成員新增成功',
      position: 'top'
    })
    
    showAddMemberDialog.value = false
    selectedNewMember.value = null
    
  } catch (error) {
    console.error('Failed to add member:', error)
    $q.notify({
      type: 'negative',
      message: '新增成員失敗',
      position: 'top'
    })
  }
}

// 移除成員
async function removeMember(userId: string): Promise<void> {
  if (!props.project) return

  const userName = getUserDisplayName(userId)
  
  const confirmed = await new Promise<boolean>((resolve) => {
    $q.dialog({
      title: '移除成員',
      message: `確定要將「${userName}」從專案中移除嗎？`,
      cancel: true,
      persistent: false
    }).onOk(() => resolve(true)).onCancel(() => resolve(false))
  })
  
  if (!confirmed) return

  try {
    const updatedProject = {
      ...props.project,
      memberIds: props.project.memberIds.filter(id => id !== userId),
      updatedAt: new Date()
    }

    emit('update:project', updatedProject)
    emit('change')
    
    await loadMembers()
    
    $q.notify({
      type: 'positive',
      message: `已移除成員「${userName}」`,
      position: 'top'
    })
    
  } catch (error) {
    console.error('Failed to remove member:', error)
    $q.notify({
      type: 'negative',
      message: '移除成員失敗',
      position: 'top'
    })
  }
}

// 變更角色（預留功能）
function changeRole(_userId: string): void {
  $q.notify({
    type: 'info',
    message: '角色管理功能將在未來版本中提供',
    position: 'top'
  })
}

// 監聽專案變化，載入成員
import { watch } from 'vue'
watch(() => props.project, async (newProject) => {
  if (newProject) {
    await loadMembers()
  }
}, { immediate: true })
</script>

<style scoped lang="scss">
.project-members-settings {
  .settings-section-header {
    margin-bottom: 24px;
  }

  .owner-card {
    background-color: #fafafa;
    border-radius: 8px;
    padding: 16px;
  }

  .members-list {
    .member-item {
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover {
        background-color: #f5f5f5;
        border-radius: 4px;
        margin: 0 -8px;
        padding: 12px 8px;
      }
    }
  }
}
</style>