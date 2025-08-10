<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
    persistent
  >
    <q-card class="q-dialog-plugin" style="min-width: 500px; max-width: 600px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">管理專案成員</div>
        <q-space />
        <q-btn
          icon="close"
          flat
          round
          dense
          @click="onDialogCancel"
        />
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle2 q-mb-md text-grey-7">
          專案: {{ project?.name }}
        </div>

        <!-- 當前成員列表 -->
        <div class="q-mb-lg">
          <div class="text-subtitle1 q-mb-md">當前成員</div>
          <div v-if="currentMembers.length === 0" class="text-grey-6">
            暫無成員
          </div>
          <q-list v-else separator>
            <q-item
              v-for="member in currentMembers"
              :key="member.userId"
              class="q-px-none"
            >
              <q-item-section avatar>
                <q-avatar size="32px">
                  <img :src="getUserAvatar(member.userId)" />
                </q-avatar>
              </q-item-section>
              
              <q-item-section>
                <q-item-label>{{ getUserDisplayName(member.userId) }}</q-item-label>
                <q-item-label caption>
                  {{ member.role === 'owner' ? '擁有者' : member.role === 'admin' ? '管理員' : '成員' }}
                </q-item-label>
              </q-item-section>

              <q-item-section side v-if="member.userId !== currentUserId && canManageMembers">
                <q-btn
                  icon="remove_circle"
                  flat
                  round
                  size="sm"
                  color="negative"
                  @click="removeMember(member.userId)"
                >
                  <q-tooltip>移除成員</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- 添加新成員 -->
        <div v-if="canManageMembers">
          <div class="text-subtitle1 q-mb-md">添加成員</div>
          <div class="row q-gutter-sm">
            <div class="col">
              <q-select
                v-model="selectedNewMember"
                :options="availableUsers"
                option-label="name"
                option-value="userId"
                emit-value
                map-options
                label="選擇用戶"
                outlined
                dense
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-avatar size="24px">
                        <img :src="getUserAvatar(scope.opt.userId)" />
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.name }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.role }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div class="col-auto">
              <q-btn
                icon="add"
                color="primary"
                outline
                @click="addMember"
                :disabled="!selectedNewMember"
              >
                添加
              </q-btn>
            </div>
          </div>
        </div>

        <!-- 權限提示 -->
        <div v-if="!canManageMembers" class="text-caption text-grey-6 q-mt-md">
          只有專案擁有者可以管理成員
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="關閉"
          color="grey"
          @click="onDialogCancel"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import { useUserStore } from '@/stores/user'
import { getProjectRepository } from '@/services/repositories'
import type { Project, ProjectMember } from '@/types'

interface Props {
  project: Project
}

const props = defineProps<Props>()

defineEmits([
  ...useDialogPluginComponent.emits
])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const $q = useQuasar()

const userStore = useUserStore()
const projectRepo = getProjectRepository()

// 狀態
const currentMembers = ref<ProjectMember[]>([])
const selectedNewMember = ref<string | null>(null)

// 計算屬性
const currentUserId = computed(() => userStore.currentUserId)
const canManageMembers = computed(() => {
  return userStore.isAdmin || props.project?.ownerId === currentUserId.value
})

const availableUsers = computed(() => {
  const memberIds = new Set(currentMembers.value.map((m: ProjectMember) => m.userId))
  return userStore.availableUsers.filter(user => !memberIds.has(user.userId))
})

// 方法
function getUserDisplayName(userId: string): string {
  return userStore.getUserDisplayName(userId)
}

function getUserAvatar(userId: string): string {
  return userStore.getUserAvatar(userId)
}

async function loadMembers(): Promise<void> {
  if (!props.project) return

  try {
    // 構建成員列表：擁有者 + 一般成員
    const members: ProjectMember[] = [
      { userId: props.project.ownerId, role: 'owner' },
      ...props.project.memberIds.map(userId => ({ userId, role: 'member' as const }))
    ]
    currentMembers.value = members
  } catch (error) {
    console.error('Failed to load project members:', error)
    $q.notify({
      type: 'negative',
      message: '載入成員列表失敗',
      position: 'top'
    })
  }
}

async function addMember(): Promise<void> {
  if (!selectedNewMember.value || !props.project) return

  try {
    await projectRepo.addMember(props.project.projectId, selectedNewMember.value)
    $q.notify({
      type: 'positive',
      message: '成員添加成功',
      position: 'top'
    })
    selectedNewMember.value = null
    await loadMembers()
  } catch (error) {
    console.error('Failed to add member:', error)
    $q.notify({
      type: 'negative',
      message: '添加成員時發生錯誤',
      position: 'top'
    })
  }
}

async function removeMember(userId: string): Promise<void> {
  if (!props.project) return

  try {
    await projectRepo.removeMember(props.project.projectId, userId)
    $q.notify({
      type: 'positive',
      message: '成員移除成功',
      position: 'top'
    })
    await loadMembers()
  } catch (error) {
    console.error('Failed to remove member:', error)
    $q.notify({
      type: 'negative',
      message: '移除成員時發生錯誤',
      position: 'top'
    })
  }
}

onMounted(() => {
  loadMembers()
})
</script>

<style scoped lang="scss">
.q-dialog-plugin {
  .q-item {
    min-height: 48px;
  }
}
</style>