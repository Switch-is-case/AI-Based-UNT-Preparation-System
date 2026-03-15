<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(username.value, email.value, password.value, locale.value)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || t('auth.registerError')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center">
    <div class="glass-card p-5 fade-in-up" style="width: 100%; max-width: 440px;">
      <div class="text-center mb-4">
        <div style="font-size: 3rem;">📝</div>
        <h2 class="page-title mt-2">{{ t('auth.registerTitle') }}</h2>
      </div>

      <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>

      <form @submit.prevent="handleRegister">
        <div class="mb-3">
          <label class="form-label small text-secondary">{{ t('auth.username') }}</label>
          <input v-model="username" type="text" class="form-control form-control-dark"
                 :placeholder="t('auth.username')" required minlength="3" />
        </div>

        <div class="mb-3">
          <label class="form-label small text-secondary">{{ t('auth.email') }}</label>
          <input v-model="email" type="email" class="form-control form-control-dark"
                 :placeholder="t('auth.email')" required />
        </div>

        <div class="mb-4">
          <label class="form-label small text-secondary">{{ t('auth.password') }}</label>
          <input v-model="password" type="password" class="form-control form-control-dark"
                 :placeholder="t('auth.password')" required minlength="6" />
        </div>

        <button type="submit" class="btn btn-primary-custom w-100" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          {{ t('auth.registerBtn') }}
        </button>
      </form>

      <p class="text-center mt-4 mb-0 small">
        <span class="text-secondary">{{ t('auth.hasAccount') }} </span>
        <RouterLink to="/login" class="text-decoration-none" style="color: var(--primary);">
          {{ t('nav.login') }}
        </RouterLink>
      </p>
    </div>
  </div>
</template>
