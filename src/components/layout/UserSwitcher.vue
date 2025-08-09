<template>
  <q-btn-dropdown
    flat
    dense
    no-caps
    :loading="userStore.isLoading"
    class="user-switcher"
  >
    <template v-slot:label>
      <div class="row items-center no-wrap q-gutter-sm">
        <q-avatar size="32px">
          <img 
            v-if="userStore.currentUser?.avatar" 
            :src="userStore.currentUser.avatar"
            :alt="userStore.currentUser.name"
          >
          <q-icon v-else name="person" />
        </q-avatar>
        
        <div class="column items-start" v-if="$q.screen.gt.xs">
          <div class="text-weight-medium">
            {{ userStore.currentUser?.name || '未登入' }}
          </div>
          <div class="text-caption text-grey">
            <q-badge 
              v-if="userStore.currentUser"
              :color="userStore.isAdmin ? 'red' : 'blue'"
              :label="userStore.isAdmin ? '管理員' : '一般用戶'"
              dense
            />
          </div>
        </div>
        
        <q-icon name="arrow_drop_down" size="20px" />
      </div>
    </template>

    <q-list dense>
      <q-item-label header class="text-weight-bold">
        切換用戶
      </q-item-label>
      
      <q-separator />
      
      <q-item
        v-for="user in userStore.availableUsers"
        :key="user.userId"
        clickable
        v-close-popup
        @click="handleSwitchUser(user.userId)"
        :class="{ 'bg-blue-1': user.userId === userStore.currentUserId }"
      >
        <q-item-section avatar>
          <q-avatar size="28px">
            <img 
              v-if="user.avatar" 
              :src="user.avatar"
              :alt="user.name"
            >
            <q-icon v-else name="person" />
          </q-avatar>
        </q-item-section>
        
        <q-item-section>
          <q-item-label>{{ user.name }}</q-item-label>
          <q-item-label caption>{{ user.email }}</q-item-label>
        </q-item-section>
        
        <q-item-section side>
          <q-badge 
            :color="user.role === 'admin' ? 'red' : 'grey'"
            :label="user.role === 'admin' ? 'Admin' : 'User'"
            dense
          />
        </q-item-section>
        
        <q-item-section side v-if="user.userId === userStore.currentUserId">
          <q-icon name="check" color="primary" />
        </q-item-section>
      </q-item>
      
      <q-separator />
      
      <q-item clickable v-close-popup @click="handleRefresh">
        <q-item-section avatar>
          <q-icon name="refresh" />
        </q-item-section>
        <q-item-section>重新載入用戶</q-item-section>
      </q-item>
      
      <q-item 
        v-if="userStore.currentUser"
        clickable 
        v-close-popup 
        @click="handleLogout"
      >
        <q-item-section avatar>
          <q-icon name="logout" />
        </q-item-section>
        <q-item-section>登出</q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const userStore = useUserStore()

// 切換用戶
async function handleSwitchUser(userId: string) {
  if (userId === userStore.currentUserId) {
    return
  }

  try {
    await userStore.switchUser(userId)
    
    $q.notify({
      type: 'positive',
      message: `已切換至: ${userStore.currentUserName}`,
      position: 'top',
      timeout: 2000
    })
    
    // 可選：切換用戶後重新載入頁面或路由
    // router.push('/')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '切換用戶失敗',
      caption: error instanceof Error ? error.message : '未知錯誤',
      position: 'top'
    })
  }
}

// 重新載入用戶列表
async function handleRefresh() {
  try {
    await userStore.initializeUsers()
    
    $q.notify({
      type: 'positive',
      message: '用戶列表已更新',
      position: 'top',
      timeout: 1500
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '載入用戶失敗',
      caption: error instanceof Error ? error.message : '未知錯誤',
      position: 'top'
    })
  }
}

// 登出
function handleLogout() {
  $q.dialog({
    title: '確認登出',
    message: '確定要登出嗎？',
    cancel: true,
    persistent: false
  }).onOk(() => {
    userStore.logout()
    
    $q.notify({
      type: 'info',
      message: '已登出',
      position: 'top',
      timeout: 1500
    })
  })
}
</script>

<style scoped lang="scss">
.user-switcher {
  min-width: 120px;
  
  .q-btn__content {
    justify-content: flex-start;
  }
}

// 深色模式支援
.body--dark {
  .user-switcher {
    .bg-blue-1 {
      background-color: rgba(33, 150, 243, 0.15);
    }
  }
}
</style>