<script setup>
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue'
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

// Bookmarked cards (persisted to localStorage)
const savedCards = reactive(new Set(JSON.parse(localStorage.getItem('savedCards') || '[]')))

const scoreClass = computed(() => {
  if (!data.value) return ''
  const pct = (data.value.attempt.score / data.value.attempt.total_questions) * 100
  if (pct >= 80) return 'score-excellent'
  if (pct >= 60) return 'score-good'
  if (pct >= 40) return 'score-average'
  return 'score-poor'
})

const scorePct = computed(() => {
  if (!data.value) return 0
  return Math.round((data.value.attempt.score / data.value.attempt.total_questions) * 100)
})

const problemQuestions = computed(() => {
  if (!data.value) return []
  return data.value.answers.filter(a => !a.is_correct)
})

onMounted(async () => {
  try {
    const res = await apiClient.get(`/tests/results/${route.params.attemptId}`)
    data.value = res.data

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
  const maxAttempts = 20

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

function toggleSave(cardId) {
  if (savedCards.has(cardId)) {
    savedCards.delete(cardId)
  } else {
    savedCards.add(cardId)
  }
  localStorage.setItem('savedCards', JSON.stringify([...savedCards]))
}

function isCardSaved(cardId) {
  return savedCards.has(cardId)
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
        <h2 class="page-title" style="font-size: 1.6rem;">{{ t('results.title') }}</h2>
        <p class="text-secondary mb-4" style="font-size: 0.9rem;">
          {{ data.attempt.test_title }} — {{ data.attempt.subject_name }}
        </p>

        <!-- Score circle -->
        <div class="d-flex justify-content-center mb-4">
          <div style="width: 140px; height: 140px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
            <svg width="140" height="140" style="position: absolute; transform: rotate(-90deg);">
              <circle cx="70" cy="70" r="60" fill="none" stroke="var(--input-bg)" stroke-width="8"/>
              <circle cx="70" cy="70" r="60" fill="none"
                      :stroke="scorePct >= 80 ? 'var(--success)' : scorePct >= 60 ? 'var(--primary)' : scorePct >= 40 ? 'var(--warning)' : 'var(--danger)'"
                      stroke-width="8" stroke-linecap="round"
                      :stroke-dasharray="377"
                      :stroke-dashoffset="377 - (377 * scorePct / 100)"
                      style="transition: stroke-dashoffset 1.5s ease;"/>
            </svg>
            <div class="fw-bold" :class="scoreClass" style="position: relative; z-index: 1; font-size: 2.5rem; line-height: 1;">
              {{ scorePct }}%
            </div>
            <small class="text-secondary" style="position: relative; z-index: 1; font-size: 0.75rem;">
              {{ data.attempt.score }}/{{ data.attempt.total_questions }}
            </small>
          </div>
        </div>

        <!-- Stats row -->
        <div class="row g-3 justify-content-center" style="max-width: 500px; margin: 0 auto;">
          <div class="col-4">
            <div class="glass-card p-3" style="border-top: 3px solid var(--success);">
              <div class="fs-4 fw-bold score-excellent">{{ data.attempt.score }}</div>
              <small class="text-secondary" style="font-size: 0.75rem;">{{ t('results.correct') }}</small>
            </div>
          </div>
          <div class="col-4">
            <div class="glass-card p-3" style="border-top: 3px solid var(--danger);">
              <div class="fs-4 fw-bold text-danger">
                {{ data.attempt.total_questions - data.attempt.score - data.attempt.skipped_count }}
              </div>
              <small class="text-secondary" style="font-size: 0.75rem;">{{ t('results.wrong') }}</small>
            </div>
          </div>
          <div class="col-4">
            <div class="glass-card p-3" style="border-top: 3px solid var(--warning);">
              <div class="fs-4 fw-bold" style="color: var(--warning);">{{ data.attempt.skipped_count }}</div>
              <small class="text-secondary" style="font-size: 0.75rem;">{{ t('results.skipped') }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Feedback Section -->
      <div v-if="problemQuestions.length > 0" class="glass-card p-4 mb-4 fade-in-up fade-in-up-delay-1">
        <h4 class="fw-bold mb-4 d-flex align-items-center gap-2">
          <span style="font-size: 1.3rem;">🤖</span>
          {{ t('results.aiFeedback') }}
        </h4>

        <!-- Loading state -->
        <div v-if="aiLoading" class="text-center py-4">
          <div class="spinner-border text-primary mb-3"></div>
          <p class="text-secondary mb-1">{{ t('results.aiAnalyzing') }}</p>
          <small class="text-muted">{{ t('results.aiAnalyzingHint') }}</small>
        </div>

        <!-- Error / Retry -->
        <div v-else-if="aiError && !data.aiFeedback" class="text-center py-3">
          <p class="text-secondary mb-3">
            {{ aiError === 'timeout' ? t('results.aiTimeout') : t('results.aiError') }}
          </p>
          <button class="btn btn-primary-custom btn-sm" @click="requestAiAnalysis">
            🔄 {{ t('results.aiRetry') }}
          </button>
        </div>

        <!-- AI Feedback Content — structured blocks -->
        <div v-else-if="data.aiFeedback">
          <!-- Error Analysis Block -->
          <div v-if="data.aiFeedback.weak_topics" class="ai-block ai-block-errors mb-3">
            <div class="d-flex align-items-start gap-3">
              <div class="ai-block-icon">📝</div>
              <div class="flex-grow-1">
                <h6 class="fw-bold mb-2" style="color: var(--danger); font-size: 0.9rem;">
                  {{ t('results.errorAnalysis') }}
                </h6>
                <p style="white-space: pre-line; line-height: 1.8; margin: 0; font-size: 0.9rem; color: var(--text-primary);">
                  {{ data.aiFeedback.weak_topics }}
                </p>
              </div>
            </div>
          </div>

          <!-- Recommendations / Tips Block -->
          <div v-if="data.aiFeedback.recommendations" class="ai-block ai-block-tips mb-3">
            <div class="d-flex align-items-start gap-3">
              <div class="ai-block-icon">💡</div>
              <div class="flex-grow-1">
                <h6 class="fw-bold mb-2" style="color: #d4a017; font-size: 0.9rem;">
                  {{ t('results.tips') }}
                </h6>
                <p style="white-space: pre-line; line-height: 1.8; margin: 0; font-size: 0.9rem; color: var(--text-primary);">
                  {{ data.aiFeedback.recommendations }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- No AI key configured -->
        <div v-else class="text-center py-3">
          <button class="btn btn-primary-custom btn-sm" @click="requestAiAnalysis">
            🤖 {{ t('results.aiRequest') }}
          </button>
        </div>
      </div>

      <!-- Detailed Answers as Knowledge Cards -->
      <div class="glass-card p-4 mb-4 fade-in-up fade-in-up-delay-2">
        <h4 class="fw-bold mb-4">{{ t('results.details') }}</h4>

        <div v-for="(answer, i) in data.answers" :key="i" class="knowledge-card mb-3">
          <!-- Header -->
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div class="d-flex align-items-start gap-2 flex-grow-1">
              <span class="badge rounded-pill" :class="{
                'bg-success': answer.is_correct,
                'bg-warning text-dark': answer.is_skipped,
                'bg-danger': !answer.is_correct && !answer.is_skipped
              }" style="font-size: 0.7rem; padding: 4px 8px;">
                {{ answer.is_correct ? '✓' : answer.is_skipped ? '⏭' : '✗' }}
              </span>
              <strong style="font-size: 0.9rem;">{{ i + 1 }}. {{ answer.question_text }}</strong>
            </div>
            <button class="knowledge-card-bookmark"
                    :class="{ saved: isCardSaved(`q-${route.params.attemptId}-${i}`) }"
                    @click="toggleSave(`q-${route.params.attemptId}-${i}`)"
                    :title="isCardSaved(`q-${route.params.attemptId}-${i}`) ? t('results.saved') : t('results.saveCard')">
              {{ isCardSaved(`q-${route.params.attemptId}-${i}`) ? '⭐' : '☆' }}
            </button>
          </div>

          <!-- Answer details -->
          <div v-if="!answer.is_skipped" class="small mb-1">
            <div :style="{ color: answer.is_correct ? 'var(--success)' : 'var(--danger)' }">
              {{ t('results.yourAnswer') }}: {{ answer.selected_text || '—' }}
            </div>
          </div>
          <div v-if="!answer.is_correct" class="small" style="color: var(--success);">
            {{ t('results.correctAnswer') }}: {{ answer.correct_text }}
          </div>
          <div v-if="answer.explanation" class="small mt-2"
               style="color: var(--text-secondary); background: var(--input-bg); padding: 8px 12px; border-radius: 8px;">
            💡 {{ answer.explanation }}
          </div>

          <!-- Review theory button for wrong answers -->
          <div v-if="!answer.is_correct && !answer.is_skipped" class="mt-2">
            <RouterLink :to="`/ai-tutor`" class="btn-ghost" style="font-size: 0.8rem; color: var(--primary);">
              📖 {{ t('results.reviewTheory') }} →
            </RouterLink>
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
