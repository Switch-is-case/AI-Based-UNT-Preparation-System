<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const { t } = useI18n()
const auth = useAuthStore()

const data = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await apiClient.get(`/ai/learning-path/${auth.userId}`)
    data.value = res.data
  } catch (err) {
    console.error('Learning path error:', err)
  } finally {
    loading.value = false
  }
})

function getBarColor(pct) {
  if (pct >= 80) return 'bg-success'
  if (pct >= 60) return 'bg-primary'
  if (pct >= 40) return 'bg-warning'
  return 'bg-danger'
}

function getStatusIcon(pct) {
  if (pct >= 80) return '✅'
  if (pct >= 60) return '📈'
  if (pct >= 40) return '⚠️'
  return '🔴'
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title fade-in-up">📚 {{ t('ai.learningPathTitle') }}</h1>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="!data || data.topics.length === 0" class="text-center py-5 fade-in-up">
      <div style="font-size: 4rem;">📚</div>
      <p class="text-secondary fs-5 mt-3">{{ t('ai.noData') }}</p>
      <RouterLink to="/" class="btn btn-primary-custom mt-2">{{ t('home.startTest') }}</RouterLink>
    </div>

    <div v-else>
      <!-- Subject Progress Cards -->
      <div class="row g-4 mb-4">
        <div v-for="(topic, i) in data.topics" :key="i"
             class="col-md-6 fade-in-up" :class="`fade-in-up-delay-${(i % 3) + 1}`">
          <div class="glass-card p-4 h-100">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="fw-bold mb-1">{{ topic.subject_name }}</h5>
                <small class="text-secondary">
                  {{ topic.correct_answers }}/{{ topic.total_answers }} {{ t('results.correct') }}
                </small>
              </div>
              <span class="fs-4">{{ getStatusIcon(topic.accuracy_percent) }}</span>
            </div>

            <div class="progress-custom mb-2" style="height: 10px;">
              <div class="progress-bar" :class="getBarColor(topic.accuracy_percent)"
                   :style="{ width: topic.accuracy_percent + '%' }">
              </div>
            </div>

            <div class="d-flex justify-content-between">
              <small class="text-secondary">{{ t('ai.accuracy') }}</small>
              <strong :class="{
                'score-excellent': topic.accuracy_percent >= 80,
                'score-good': topic.accuracy_percent >= 60,
                'score-average': topic.accuracy_percent >= 40,
                'score-poor': topic.accuracy_percent < 40
              }">{{ topic.accuracy_percent }}%</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Recommendation -->
      <div v-if="data.recommendation" class="glass-card p-4 fade-in-up fade-in-up-delay-3">
        <h4 class="fw-bold mb-3">🤖 {{ t('ai.recommendation') }}</h4>
        <p class="text-secondary" style="white-space: pre-line; line-height: 1.8;">
          {{ data.recommendation }}
        </p>
      </div>
    </div>
  </div>
</template>
