<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import SideBar from '@/components/SideBar.vue'

const auth = useAuthStore()
const sidebarCollapsed = computed(() => {
  return localStorage.getItem('sidebar-collapsed') === 'true'
})
</script>

<template>
  <div class="app-layout">
    <SideBar v-if="auth.isAuthenticated" />
    <div class="app-main"
         :class="{ 'sidebar-collapsed': auth.isAuthenticated && sidebarCollapsed }"
         :style="{ marginLeft: !auth.isAuthenticated ? '0' : undefined }">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.app-main {
  min-height: 100vh;
}
</style>
