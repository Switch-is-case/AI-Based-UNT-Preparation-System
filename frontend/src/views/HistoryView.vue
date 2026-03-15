<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const { t } = useI18n()
const auth = useAuthStore()
const history = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await apiClient.get(`/tests/history/${auth.userId}`)
    history.value = data
  } catch (err) {
    console.error('History error:', err)
  } finally {
    loading.value = false
  }
})

function scoreColor(pct) {
  if (pct >= 80) return 'score-excellent'
  if (pct >= 60) return 'score-good'
  if (pct >= 40) return 'score-average'
  return 'score-poor'
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title fade-in-up">{{ t('history.title') }}</h1>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="history.length === 0" class="text-center py-5 fade-in-up">
      <div style="font-size: 4rem;">📋</div>
      <p class="text-secondary fs-5 mt-3">{{ t('history.noHistory') }}</p>
      <RouterLink to="/" class="btn btn-primary-custom mt-2">{{ t('home.startTest') }}</RouterLink>
    </div>

    <div v-else class="fade-in-up">
      <div class="glass-card p-0 overflow-hidden">
        <table class="table table-dark-custom mb-0">
          <thead>
            <tr>
              <th>{{ t('history.date') }}</th>
              <th>{{ t('history.test') }}</th>
              <th>{{ t('history.score') }}</th>
              <th class="text-end"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in history" :key="item.id">
              <td class="text-secondary small">{{ formatDate(item.finished_at) }}</td>
              <td>
                <span class="me-2">{{ item.subject_icon }}</span>
                {{ item.test_title }}
              </td>
              <td>
                <span class="fw-bold" :class="scoreColor(item.percentage)">
                  {{ item.score }}/{{ item.total_questions }}
                </span>
                <small class="text-secondary ms-2">({{ item.percentage }}%)</small>
              </td>
              <td class="text-end">
                <RouterLink :to="`/results/${item.id}`" class="btn btn-outline-glass btn-sm">
                  {{ t('history.viewResults') }}
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
