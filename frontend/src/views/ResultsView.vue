<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import apiClient from '@/api/client'

const { t } = useI18n()
const route = useRoute()

const data = ref(null)
const loading = ref(true)
const aiLoading = ref(false)
const aiError = ref('')
let pollTimer = null

const scoreClass = computed(() => {
  if (!data.value) return ''
  const pct = (data.value.attempt.score / data.value.attempt.total_questions) * 100
  if (pct >= 80) return 'score-excellent'
  if (pct >= 60) return 'score-good'
  if (pct >= 40) return 'score-average'
  return 'score-poor'
})

// Questions that were wrong or skipped
const problemQuestions = computed(() => {
  if (!data.value) return []
  return data.value.answers.filter(a => !a.is_correct)
})

onMounted(async () => {
  try {
    const res = await apiClient.get(`/tests/results/${route.params.attemptId}`)
    data.value = res.data

    // If there are problem questions but no AI feedback yet, start polling
    if (problemQuestions.value.length > 0 && !data.value.aiFeedback) {
      aiLoading.value = true
      startPolling()
    }
  } catch (err) {
    console.error('Load results error:', err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function startPolling() {
  let attempts = 0
  const maxAttempts = 20 // poll for up to ~60 seconds (every 3s)

  pollTimer = setInterval(async () => {
    attempts++
    try {
      const res = await apiClient.get(`/tests/results/${route.params.attemptId}`)
      if (res.data.aiFeedback) {
        data.value.aiFeedback = res.data.aiFeedback
        aiLoading.value = false
        clearInterval(pollTimer)
      } else if (attempts >= maxAttempts) {
        aiLoading.value = false
        aiError.value = 'timeout'
        clearInterval(pollTimer)
      }
    } catch (err) {
      console.error('Poll error:', err)
    }
  }, 3000)
}

async function requestAiAnalysis() {
  aiLoading.value = true
  aiError.value = ''
  try {
    await apiClient.post(`/ai/analyze/${route.params.attemptId}`)
    startPolling()
  } catch (err) {
    console.error('Request AI analysis error:', err)
    aiError.value = 'error'
    aiLoading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="data">
      <!-- Score Card -->
      <div class="glass-card p-4 mb-4 text-center fade-in-up">
        <h2 class="page-title">{{ t('results.title') }}</h2>
        <p class="text-secondary mb-3">{{ data.attempt.test_title }} — {{ data.attempt.subject_name }}</p>

        <div class="display-3 fw-bold mb-2" :class="scoreClass">
          {{ data.attempt.score }}/{{ data.attempt.total_questions }}
        </div>
        <div class="fs-5 mb-3" :class="scoreClass">
          {{ Math.round((data.attempt.score / data.attempt.total_questions) * 100) }}%
        </div>

        <div class="row g-3 justify-content-center" style="max-width: 500px; margin: 0 auto;">
          <div class="col-4">
            <div class="glass-card p-3">
              <div class="fs-4 fw-bold text-success">{{ data.attempt.score }}</div>
              <small class="text-secondary">{{ t('results.correct') }}</small>
            </div>
          </div>
          <div class="col-4">
            <div class="glass-card p-3">
              <div class="fs-4 fw-bold text-danger">
                {{ data.attempt.total_questions - data.attempt.score - data.attempt.skipped_count }}
              </div>
              <small class="text-secondary">{{ t('results.wrong') }}</small>
            </div>
          </div>
          <div class="col-4">
            <div class="glass-card p-3">
              <div class="fs-4 fw-bold text-warning">{{ data.attempt.skipped_count }}</div>
              <small class="text-secondary">{{ t('results.skipped') }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Feedback Section -->
      <div v-if="problemQuestions.length > 0" class="glass-card p-4 mb-4 fade-in-up fade-in-up-delay-1">
        <h4 class="fw-bold mb-3">🤖 {{ t('results.aiFeedback') }}</h4>

        <!-- Loading state -->
        <div v-if="aiLoading" class="text-center py-4">
          <div class="spinner-border text-primary mb-3"></div>
          <p class="text-secondary mb-1">ИИ анализирует ваши ответы...</p>
          <small class="text-secondary">Это может занять до 30 секунд</small>
        </div>

        <!-- Error / Retry -->
        <div v-else-if="aiError && !data.aiFeedback" class="text-center py-3">
          <p class="text-secondary mb-3">
            {{ aiError === 'timeout' ? 'ИИ-анализ занимает больше времени, чем обычно' : 'Не удалось получить анализ от ИИ' }}
          </p>
          <button class="btn btn-primary-custom btn-sm" @click="requestAiAnalysis">
            🔄 Запросить анализ снова
          </button>
        </div>

        <!-- AI Feedback Content -->
        <div v-else-if="data.aiFeedback">
          <div v-if="data.aiFeedback.weak_topics" class="mb-4">
            <h5 class="mb-3" style="color: #ffc107;">📝 Разбор ошибок</h5>
            <div class="ai-content p-3 rounded-3" style="background: rgba(255, 193, 7, 0.08); border: 1px solid rgba(255, 193, 7, 0.2);">
              <p style="white-space: pre-line; line-height: 1.8; margin: 0;">{{ data.aiFeedback.weak_topics }}</p>
            </div>
          </div>
          <div v-if="data.aiFeedback.recommendations">
            <h5 class="mb-3" style="color: #4cc9f0;">📚 План обучения</h5>
            <div class="ai-content p-3 rounded-3" style="background: rgba(76, 201, 240, 0.08); border: 1px solid rgba(76, 201, 240, 0.2);">
              <p style="white-space: pre-line; line-height: 1.8; margin: 0;">{{ data.aiFeedback.recommendations }}</p>
            </div>
          </div>
        </div>

        <!-- No AI key configured -->
        <div v-else class="text-center py-3">
          <button class="btn btn-primary-custom btn-sm" @click="requestAiAnalysis">
            🤖 Получить анализ от ИИ
          </button>
        </div>
      </div>

      <!-- Detailed Answers -->
      <div class="glass-card p-4 mb-4 fade-in-up fade-in-up-delay-2">
        <h4 class="fw-bold mb-4">{{ t('results.details') }}</h4>

        <div v-for="(answer, i) in data.answers" :key="i" class="mb-3 p-3 rounded-3"
             :style="{ background: answer.is_correct ? 'rgba(6,214,160,0.1)' : answer.is_skipped ? 'rgba(255,209,102,0.1)' : 'rgba(239,71,111,0.1)' }">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <strong>{{ i + 1 }}. {{ answer.question_text }}</strong>
            <span class="badge" :class="{
              'bg-success': answer.is_correct,
              'bg-warning text-dark': answer.is_skipped,
              'bg-danger': !answer.is_correct && !answer.is_skipped
            }">
              {{ answer.is_correct ? '✓' : answer.is_skipped ? '⏭' : '✗' }}
            </span>
          </div>

          <div v-if="!answer.is_skipped" class="small">
            <div :class="answer.is_correct ? 'text-success' : 'text-danger'">
              {{ t('results.yourAnswer') }}: {{ answer.selected_text || '—' }}
            </div>
          </div>
          <div v-if="!answer.is_correct" class="small text-success">
            {{ t('results.correctAnswer') }}: {{ answer.correct_text }}
          </div>
          <div v-if="answer.explanation" class="small text-secondary mt-1">
            💡 {{ answer.explanation }}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex gap-3 justify-content-center fade-in-up fade-in-up-delay-3">
        <RouterLink to="/" class="btn btn-outline-glass">{{ t('results.backHome') }}</RouterLink>
        <RouterLink :to="`/test/${data.attempt.test_id}`" class="btn btn-primary-custom">
          {{ t('results.retryTest') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
