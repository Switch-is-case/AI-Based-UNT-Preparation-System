<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import LanguageSwitcher from './LanguageSwitcher.vue'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const mobileOpen = ref(false)
const darkMode = ref(localStorage.getItem('theme') === 'dark')

// Apply theme on mount
onMounted(() => {
  applyTheme(darkMode.value)
  // Restore collapsed state
  collapsed.value = localStorage.getItem('sidebar-collapsed') === 'true'
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// Close mobile sidebar on route change
watch(() => route.path, () => {
  mobileOpen.value = false
})

function handleResize() {
  if (window.innerWidth > 991) {
    mobileOpen.value = false
  }
}

function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem('sidebar-collapsed', collapsed.value)
}

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
}

function toggleTheme() {
  darkMode.value = !darkMode.value
  applyTheme(darkMode.value)
  localStorage.setItem('theme', darkMode.value ? 'dark' : 'light')
}

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

function getInitials(name) {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

const navItems = [
  { to: '/', icon: '🏠', key: 'nav.home', section: 'main' },
  { to: '/history', icon: '📋', key: 'nav.history', section: 'main' },
  { to: '/leaderboard', icon: '🏆', key: 'nav.leaderboard', section: 'main' },
  { to: '/ai-tutor', icon: '🤖', key: 'nav.aiTutor', section: 'ai' },
  { to: '/learning-path', icon: '📚', key: 'nav.learningPath', section: 'ai' },
]
</script>

<template>
  <!-- Mobile Topbar -->
  <div class="mobile-topbar">
    <button class="sidebar-toggle" @click="toggleMobile" aria-label="Toggle menu">
      <span style="font-size: 1.3rem;">☰</span>
    </button>
    <RouterLink to="/" class="mobile-topbar-brand">
      <span class="sidebar-brand-icon">🎓</span>
      UNT Prep
    </RouterLink>
    <div style="margin-left: auto;">
      <LanguageSwitcher />
    </div>
  </div>

  <!-- Overlay -->
  <div class="sidebar-overlay"
       :class="{ active: mobileOpen }"
       @click="closeMobile"
       :style="{ display: mobileOpen ? 'block' : 'none' }"></div>

  <!-- Sidebar -->
  <aside class="sidebar"
         :class="{ collapsed: collapsed, 'mobile-open': mobileOpen }"
         v-if="auth.isAuthenticated">

    <!-- Brand -->
    <RouterLink to="/" class="sidebar-brand" @click="closeMobile">
      <span class="sidebar-brand-icon">🎓</span>
      <span class="sidebar-brand-text">UNT Prep</span>
    </RouterLink>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <div class="sidebar-section-label">{{ t('nav.home') }}</div>

      <template v-for="item in navItems" :key="item.to">
        <div v-if="item === navItems[3]" class="sidebar-section-label">AI</div>
        <RouterLink
          :to="item.to"
          class="sidebar-nav-item"
          :class="{ active: route.path === item.to }"
          @click="closeMobile"
        >
          <span class="sidebar-nav-icon">{{ item.icon }}</span>
          <span class="sidebar-nav-text">{{ t(item.key) }}</span>
        </RouterLink>
      </template>

      <template v-if="auth.isAdmin">
        <div class="sidebar-section-label">{{ t('nav.admin') }}</div>
        <RouterLink
          to="/admin"
          class="sidebar-nav-item"
          :class="{ active: route.path.startsWith('/admin'), 'admin-pulse': route.path.startsWith('/admin') }"
          @click="closeMobile"
        >
          <span class="sidebar-nav-icon text-warning">⚙️</span>
          <span class="sidebar-nav-text">{{ t('nav.admin') }}</span>
        </RouterLink>
      </template>

      <div class="divider"></div>

      <!-- Theme Toggle -->
      <button class="theme-toggle" @click="toggleTheme">
        <span class="sidebar-nav-icon">{{ darkMode ? '☀️' : '🌙' }}</span>
        <span class="theme-toggle-text">{{ darkMode ? t('nav.lightTheme') : t('nav.darkTheme') }}</span>
      </button>

      <!-- Desktop Language Switcher -->
      <div style="padding: 8px 14px;" class="d-none d-lg-block">
        <LanguageSwitcher />
      </div>
    </nav>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">
          {{ getInitials(auth.user?.username) }}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">{{ auth.user?.username }}</div>
          <div class="sidebar-user-role">{{ auth.isAdmin ? 'Admin' : 'Student' }}</div>
        </div>
      </div>

      <div class="d-flex gap-2 mt-2">
        <button @click="toggleCollapse" title="Toggle sidebar" class="sidebar-toggle d-none d-lg-flex">
          <span :style="{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }">◀</span>
        </button>
        <button class="btn-ghost" @click="handleLogout" style="flex: 1;">
          <span v-if="!collapsed">{{ t('nav.logout') }}</span>
          <span v-else>🚪</span>
        </button>
      </div>
    </div>
  </aside>
</template>
