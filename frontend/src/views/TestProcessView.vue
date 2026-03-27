<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '@/api/client'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const testId = route.params.id
const testInfo = ref(null)
const questions = ref([])
const currentIndex = ref(0)
const answers = ref({})
const loading = ref(true)
const submitting = ref(false)
const timeLeft = ref(0)
let timer = null

const currentQuestion = computed(() => questions.value[currentIndex.value])
const progress = computed(() => {
  if (questions.value.length === 0) return 0
  return Math.round(((currentIndex.value + 1) / questions.value.length) * 100)
})
const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

onMounted(async () => {
  try {
    const [infoRes, qRes] = await Promise.all([
      apiClient.get(`/tests/${testId}`),
      apiClient.get(`/tests/${testId}/questions`)
    ])
    testInfo.value = infoRes.data
    questions.value = qRes.data
    timeLeft.value = (infoRes.data.time_limit || 60) * 60

    timer = setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
      } else {
        handleSubmit()
      }
    }, 1000)
  } catch (err) {
    console.error('Load test error:', err)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function selectOption(questionId, optionId) {
  answers.value[questionId] = { selectedOptionId: optionId, isSkipped: false }
}

function skipQuestion(questionId) {
  answers.value[questionId] = { isSkipped: true, selectedOptionId: null }
}

async function handleSubmit() {
  if (submitting.value) return
  if (!confirm(t('test.confirmSubmit'))) return

  if (timer) clearInterval(timer)
  submitting.value = true

  try {
    const answersArray = questions.value.map(q => ({
      questionId: q.id,
      selectedOptionId: answers.value[q.id]?.selectedOptionId || null,
      isSkipped: answers.value[q.id]?.isSkipped || !answers.value[q.id]
    }))

    const totalTime = (testInfo.value.time_limit * 60) - timeLeft.value
    const { data } = await apiClient.post('/tests/submit', {
      testId: parseInt(testId),
      answers: answersArray,
      timeSpent: totalTime
    })

    router.push(`/results/${data.attemptId}`)
  } catch (err) {
    console.error('Submit error:', err)
    submitting.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="questions.length === 0" class="text-center py-5">
      <p class="text-secondary fs-5">{{ t('home.noTests') }}</p>
    </div>

    <div v-else>
      <!-- Header Bar -->
      <div class="glass-card p-3 mb-4 d-flex justify-content-between align-items-center fade-in-up">
        <div>
          <h5 class="mb-0 fw-bold">{{ testInfo?.title }}</h5>
          <small class="text-secondary">
            {{ t('test.question') }} {{ currentIndex + 1 }} {{ t('test.of') }} {{ questions.length }}
          </small>
        </div>
        <div class="d-flex align-items-center gap-3">
          <div class="badge-glass d-flex align-items-center gap-2" 
               :class="{ 'text-danger': timeLeft < 300 }">
            ⏱️ {{ formattedTime }}
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="progress-custom mb-4 fade-in-up">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>

      <!-- Question Card -->
      <div class="glass-card p-4 mb-4 fade-in-up" :key="currentQuestion.id">
        <div class="d-flex justify-content-between mb-3">
          <span class="badge-glass">{{ t('test.question') }} {{ currentIndex + 1 }}</span>
          <span class="badge" :class="{
            'bg-success': currentQuestion.difficulty === 'easy',
            'bg-warning text-dark': currentQuestion.difficulty === 'medium',
            'bg-danger': currentQuestion.difficulty === 'hard'
          }">{{ currentQuestion.difficulty }}</span>
        </div>

        <h5 class="mb-4 fw-semibold" style="line-height: 1.6;">{{ currentQuestion.text }}</h5>

        <!-- Options -->
        <div class="d-grid gap-2">
          <button v-for="(option, idx) in currentQuestion.options" :key="option.id"
                  class="btn text-start p-3 d-flex align-items-center gap-3"
                  :class="answers[currentQuestion.id]?.selectedOptionId === option.id
                    ? 'btn-primary-custom' : 'btn-outline-glass'"
                  @click="selectOption(currentQuestion.id, option.id)">
            <span class="fw-bold" style="min-width: 24px;">{{ String.fromCharCode(65 + idx) }}.</span>
            <span>{{ option.text }}</span>
          </button>
        </div>

        <!-- I Don't Know Button -->
        <button class="btn w-100 mt-3"
                :class="answers[currentQuestion.id]?.isSkipped ? 'btn-skip-active' : 'btn-accent'"
                @click="skipQuestion(currentQuestion.id)">
          {{ answers[currentQuestion.id]?.isSkipped ? '✓ ' + t('test.iDontKnow') : '🤷 ' + t('test.iDontKnow') }}
        </button>
      </div>

      <!-- Navigation -->
      <div class="d-flex justify-content-between align-items-center fade-in-up">
        <button class="btn btn-outline-glass"
                :disabled="currentIndex === 0"
                @click="currentIndex--">
          ← {{ t('test.previous') }}
        </button>

        <div class="d-flex gap-1 flex-wrap justify-content-center" style="max-width: 400px;">
          <button v-for="(q, i) in questions" :key="q.id"
                  class="btn btn-sm"
                  :class="{
                    'btn-primary-custom': i === currentIndex,
                    'btn-success': answers[q.id] && !answers[q.id].isSkipped,
                    'btn-warning': answers[q.id]?.isSkipped,
                    'btn-outline-glass': !answers[q.id] && i !== currentIndex
                  }"
                  style="width: 36px; height: 36px; padding: 0; font-size: 0.8rem;"
                  @click="currentIndex = i">
            {{ i + 1 }}
          </button>
        </div>

        <template v-if="currentIndex < questions.length - 1">
          <button class="btn btn-outline-glass" @click="currentIndex++">
            {{ t('test.next') }} →
          </button>
        </template>
        <template v-else>
          <button class="btn btn-primary-custom" @click="handleSubmit" :disabled="submitting">
            <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
            {{ t('test.submit') }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
