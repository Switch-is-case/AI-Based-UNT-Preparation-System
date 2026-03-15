<script setup>
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import LanguageSwitcher from './LanguageSwitcher.vue'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark navbar-custom fixed-top">
    <div class="container">
      <RouterLink class="navbar-brand" to="/">🎓 UNT Prep</RouterLink>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu"
              aria-controls="navMenu" aria-expanded="false">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navMenu">
        <ul class="navbar-nav me-auto" v-if="auth.isAuthenticated">
          <li class="nav-item">
            <RouterLink class="nav-link" to="/">{{ t('nav.home') }}</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/history">{{ t('nav.history') }}</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/leaderboard">{{ t('nav.leaderboard') }}</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/ai-tutor">{{ t('nav.aiTutor') }}</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/learning-path">{{ t('nav.learningPath') }}</RouterLink>
          </li>
          <li class="nav-item" v-if="auth.isAdmin">
            <RouterLink class="nav-link" to="/admin">{{ t('nav.admin') }}</RouterLink>
          </li>
        </ul>

        <div class="d-flex align-items-center gap-3">
          <LanguageSwitcher />

          <template v-if="auth.isAuthenticated">
            <span class="text-light small d-none d-md-inline">
              {{ auth.user?.username }}
            </span>
            <button class="btn btn-outline-glass btn-sm" @click="handleLogout">
              {{ t('nav.logout') }}
            </button>
          </template>
          <template v-else>
            <RouterLink class="btn btn-outline-glass btn-sm" to="/login">
              {{ t('nav.login') }}
            </RouterLink>
          </template>
        </div>
      </div>
    </div>
  </nav>
</template>
