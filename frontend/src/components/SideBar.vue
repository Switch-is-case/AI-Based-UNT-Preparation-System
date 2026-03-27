<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const mobileOpen = ref(false)
const darkMode = ref(localStorage.getItem('theme') === 'dark')
const langMenuOpen = ref(false)

const languages = [
  { code: 'ru', label: 'RU' },
  { code: 'kk', label: 'KZ' },
  { code: 'en', label: 'EN' }
]

const currentLangLabel = computed(() => {
  const lang = languages.find(l => l.code === locale.value)
  return lang ? lang.label : 'RU'
})

// Apply theme on mount
onMounted(() => {
  applyTheme(darkMode.value)
  collapsed.value = localStorage.getItem('sidebar-collapsed') === 'true'
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', closeLangMenu)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', closeLangMenu)
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

function toggleLangMenu(e) {
  e.stopPropagation()
  langMenuOpen.value = !langMenuOpen.value
}

function closeLangMenu() {
  langMenuOpen.value = false
}

function switchLang(code) {
  locale.value = code
  localStorage.setItem('locale', code)
  langMenuOpen.value = false
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
      <div class="lang-switcher btn-group btn-group-sm">
        <button
          v-for="lang in languages"
          :key="lang.code"
          class="btn btn-outline-light"
          :class="{ active: locale === lang.code }"
          @click="switchLang(lang.code)"
        >
          {{ lang.label }}
        </button>
      </div>
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
    <RouterLink to="/" class="sb-brand" @click="closeMobile">
      <span class="sb-brand-icon">🎓</span>
      <span class="sb-brand-text">UNT Prep</span>
    </RouterLink>

    <!-- Navigation -->
    <nav class="sb-nav">
      <!-- Section: Main -->
      <div class="sb-section-divider">
        <span class="sb-section-label-text">{{ t('nav.home') }}</span>
      </div>

      <template v-for="item in navItems" :key="item.to">
        <!-- Section divider before AI items -->
        <div v-if="item === navItems[3]" class="sb-section-divider">
          <span class="sb-section-label-text">AI</span>
        </div>

        <RouterLink
          :to="item.to"
          class="sb-nav-item"
          :class="{ active: route.path === item.to }"
          @click="closeMobile"
        >
          <span class="sb-nav-icon-wrap" :class="{ active: route.path === item.to }">
            {{ item.icon }}
          </span>
          <span class="sb-nav-text">{{ t(item.key) }}</span>
          <!-- Tooltip for collapsed mode -->
          <span class="sb-tooltip">{{ t(item.key) }}</span>
        </RouterLink>
      </template>

      <!-- Admin -->
      <template v-if="auth.isAdmin">
        <div class="sb-section-divider">
          <span class="sb-section-label-text">{{ t('nav.admin') }}</span>
        </div>
        <RouterLink
          to="/admin"
          class="sb-nav-item"
          :class="{ active: route.path.startsWith('/admin') }"
          @click="closeMobile"
        >
          <span class="sb-nav-icon-wrap" :class="{ active: route.path.startsWith('/admin') }">
            ⚙️
          </span>
          <span class="sb-nav-text">{{ t('nav.admin') }}</span>
          <span class="sb-tooltip">{{ t('nav.admin') }}</span>
        </RouterLink>
      </template>

      <!-- Spacer -->
      <div style="flex: 1;"></div>

      <!-- Bottom Controls -->
      <div class="sb-section-divider">
        <span class="sb-section-label-text">⚙</span>
      </div>

      <!-- Theme Toggle -->
      <button class="sb-nav-item sb-btn-item" @click="toggleTheme">
        <span class="sb-nav-icon-wrap">
          {{ darkMode ? '☀️' : '🌙' }}
        </span>
        <span class="sb-nav-text">{{ darkMode ? t('nav.lightTheme') : t('nav.darkTheme') }}</span>
        <span class="sb-tooltip">{{ darkMode ? t('nav.lightTheme') : t('nav.darkTheme') }}</span>
      </button>

      <!-- Language Switcher -->
      <div class="sb-lang-wrapper">
        <!-- Expanded: full switcher -->
        <div class="sb-lang-full">
          <div class="lang-switcher btn-group btn-group-sm" style="width: 100%;">
            <button
              v-for="lang in languages"
              :key="lang.code"
              class="btn btn-outline-light"
              :class="{ active: locale === lang.code }"
              @click="switchLang(lang.code)"
              style="flex: 1;"
            >
              {{ lang.label }}
            </button>
          </div>
        </div>
        <!-- Collapsed: globe icon with popup -->
        <div class="sb-lang-collapsed">
          <button class="sb-nav-item sb-btn-item" @click="toggleLangMenu" style="width: 100%;">
            <span class="sb-nav-icon-wrap">🌐</span>
            <span class="sb-tooltip">{{ currentLangLabel }}</span>
          </button>
          <!-- Mini popup -->
          <transition name="sb-popup">
            <div v-if="langMenuOpen" class="sb-lang-popup" @click.stop>
              <button
                v-for="lang in languages"
                :key="lang.code"
                class="sb-lang-popup-item"
                :class="{ active: locale === lang.code }"
                @click="switchLang(lang.code)"
              >
                {{ lang.label }}
              </button>
            </div>
          </transition>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div class="sb-footer">
      <div class="sb-user">
        <div class="sb-user-avatar">
          {{ getInitials(auth.user?.username) }}
        </div>
        <div class="sb-user-info">
          <div class="sb-user-name">{{ auth.user?.username }}</div>
          <div class="sb-user-role">{{ auth.isAdmin ? 'Admin' : 'Student' }}</div>
        </div>
        <span class="sb-tooltip sb-tooltip-user">{{ auth.user?.username }}</span>
      </div>

      <div class="sb-footer-actions">
        <button @click="toggleCollapse" class="sb-footer-btn sb-collapse-btn d-none d-lg-flex" :title="collapsed ? 'Expand' : 'Collapse'">
          <span :style="{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }">◀</span>
        </button>
        <button class="sb-footer-btn sb-logout-btn" @click="handleLogout" :title="t('nav.logout')">
          <span class="sb-logout-icon">🚪</span>
          <span class="sb-logout-text">{{ t('nav.logout') }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════
   SIDEBAR — Refined Collapsed / Expanded States
   ═══════════════════════════════════════════════════ */

/* ── Brand ── */
.sb-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  text-decoration: none;
  color: var(--text-primary);
  font-weight: 800;
  font-size: 1.25rem;
  border-bottom: 1px solid var(--divider);
  white-space: nowrap;
  transition: padding 0.3s ease;
}

.sb-brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.sb-brand-text {
  transition: opacity 0.2s ease, width 0.2s ease;
  overflow: hidden;
}

.sidebar.collapsed .sb-brand {
  justify-content: center;
  padding: 20px 8px 16px;
}

.sidebar.collapsed .sb-brand-text {
  opacity: 0;
  width: 0;
  overflow: hidden;
}

/* ── Navigation ── */
.sb-nav {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Section Divider (replaces dots with thin lines) ── */
.sb-section-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px 6px;
  white-space: nowrap;
  overflow: hidden;
}

.sb-section-label-text {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.sb-section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--divider);
  min-width: 10px;
}

/* Collapsed: centered thin line */
.sidebar.collapsed .sb-section-divider {
  justify-content: center;
  padding: 10px 8px 6px;
}

.sidebar.collapsed .sb-section-label-text {
  display: none;
}

.sidebar.collapsed .sb-section-divider::after {
  flex: none;
  width: 65%;
}

/* ── Nav Item ── */
.sb-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  margin: 2px 4px;
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;
  border: none;
  background: none;
  cursor: pointer;
  width: calc(100% - 8px);
  text-align: left;
}

.sb-nav-item:hover {
  background: var(--sidebar-hover);
  color: var(--text-primary);
}

.sb-nav-item.active {
  color: var(--sidebar-text-active);
  font-weight: 600;
}

/* ── Nav Icon Wrap (circle highlight for active) ── */
.sb-nav-icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
  transition: all 0.25s ease;
  background: transparent;
}

.sb-nav-icon-wrap.active {
  background: linear-gradient(135deg, rgba(67, 97, 238, 0.15), rgba(114, 9, 183, 0.08));
  box-shadow: 0 2px 8px rgba(67, 97, 238, 0.15);
}

/* ── Nav Text ── */
.sb-nav-text {
  transition: opacity 0.2s ease, width 0.2s ease;
  overflow: hidden;
}

/* ── Tooltip ── */
.sb-tooltip {
  display: none;
}

/* ── Collapsed State ── */
.sidebar.collapsed .sb-nav-item {
  justify-content: center;
  padding: 8px;
  margin: 2px 4px;
  width: calc(100% - 8px);
}

.sidebar.collapsed .sb-nav-text {
  opacity: 0;
  width: 0;
  position: absolute;
  pointer-events: none;
}

/* Tooltip visible on hover in collapsed mode */
.sidebar.collapsed .sb-tooltip {
  display: none;
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%);
  background: var(--card-bg-solid);
  color: var(--text-primary);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--card-border);
  z-index: 1100;
  pointer-events: none;
}

.sidebar.collapsed .sb-tooltip::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: var(--card-bg-solid);
  border-left: 1px solid var(--card-border);
  border-bottom: 1px solid var(--card-border);
}

.sidebar.collapsed .sb-nav-item:hover .sb-tooltip {
  display: block;
}

.sidebar.collapsed .sb-user:hover .sb-tooltip-user {
  display: block;
}

/* ── Button-styled nav item (theme toggle) ── */
.sb-btn-item {
  border: none;
  background: none;
  cursor: pointer;
}

/* ── Language Switcher ── */
.sb-lang-wrapper {
  padding: 4px 4px;
  position: relative;
}

.sb-lang-full {
  padding: 4px 8px;
}

.sb-lang-collapsed {
  display: none;
}

/* Collapsed: show globe, hide full */
.sidebar.collapsed .sb-lang-full {
  display: none;
}

.sidebar.collapsed .sb-lang-collapsed {
  display: block;
}

/* Language popup */
.sb-lang-popup {
  position: absolute;
  left: calc(100% + 8px);
  bottom: 0;
  background: var(--card-bg-solid);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 50px;
}

.sb-lang-popup-item {
  padding: 6px 14px;
  border: none;
  background: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}

.sb-lang-popup-item:hover {
  background: var(--sidebar-hover);
  color: var(--text-primary);
}

.sb-lang-popup-item.active {
  background: var(--primary);
  color: #fff;
}

/* Popup transition */
.sb-popup-enter-active,
.sb-popup-leave-active {
  transition: all 0.2s ease;
}

.sb-popup-enter-from,
.sb-popup-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

/* ── Footer ── */
.sb-footer {
  padding: 10px;
  border-top: 1px solid var(--divider);
  transition: padding 0.3s ease;
}

.sb-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px;
  border-radius: var(--radius-sm);
  overflow: visible;
  position: relative;
  transition: all 0.2s ease;
}

.sb-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), var(--info));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.72rem;
  color: #fff;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.sb-user-info {
  overflow: hidden;
  white-space: nowrap;
  transition: opacity 0.2s ease, width 0.2s ease;
}

.sb-user-name {
  font-weight: 600;
  font-size: 0.82rem;
  color: var(--text-primary);
}

.sb-user-role {
  font-size: 0.68rem;
  color: var(--text-secondary);
}

/* Collapsed user */
.sidebar.collapsed .sb-user {
  justify-content: center;
  padding: 8px 4px;
}

.sidebar.collapsed .sb-user-info {
  opacity: 0;
  width: 0;
  position: absolute;
  pointer-events: none;
}

/* ── Footer Actions ── */
.sb-footer-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  align-items: center;
}

.sb-footer-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 6px 8px;
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}

.sb-footer-btn:hover {
  background: var(--sidebar-hover);
  color: var(--text-primary);
}

.sb-collapse-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.sb-logout-btn {
  flex: 1;
  gap: 6px;
}

.sb-logout-icon {
  font-size: 0.9rem;
}

.sb-logout-text {
  font-size: 0.82rem;
  font-weight: 500;
  transition: opacity 0.2s ease;
}

/* Collapsed footer */
.sidebar.collapsed .sb-footer-actions {
  flex-direction: column;
  align-items: center;
}

.sidebar.collapsed .sb-collapse-btn {
  width: 100%;
}

.sidebar.collapsed .sb-logout-btn {
  width: 100%;
  justify-content: center;
}

.sidebar.collapsed .sb-logout-text {
  display: none;
}

/* ═══════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════ */
@media (max-width: 991px) {
  .sb-lang-full {
    display: block !important;
  }
  .sb-lang-collapsed {
    display: none !important;
  }
}
</style>
