<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const { t } = useI18n()
const auth = useAuthStore()

const data = ref(null)
const loading = ref(true)

// ENT date: June 20, 2026
const entDate = new Date('2026-06-20')
const today = new Date()
const daysUntilENT = computed(() => {
  const diff = entDate.getTime() - today.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

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

function getNodeStatus(pct) {
  if (pct >= 80) return 'completed'
  if (pct >= 30) return 'current'
  return 'locked'
}

function getNodeIcon(pct) {
  if (pct >= 80) return '✓'
  if (pct >= 30) return '▶'
  return '🔒'
}

function getLevelLabel(index, total) {
  const fraction = index / (total - 1 || 1)
  if (fraction <= 0.25) return '1'
  if (fraction <= 0.5) return '2'
  if (fraction <= 0.75) return '3'
  return '4'
}
</script>

<template>
  <div class="page-container">
    <!-- Header Row -->
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-4 mb-4 fade-in-up">
      <div>
        <h1 class="page-title">📚 {{ t('ai.learningPathTitle') }}</h1>
        <p class="page-subtitle mb-0">{{ t('ai.roadmapTitle') }}</p>
      </div>

      <!-- ENT Countdown Widget -->
      <div class="countdown-widget fade-in-up fade-in-up-delay-1" style="min-width: 200px;">
        <div class="countdown-number">{{ daysUntilENT }}</div>
        <div class="countdown-label">{{ t('ai.daysUntilENT') }}</div>
        <div class="countdown-date">{{ t('ai.entDate') }}: 20.06.2026</div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!data || data.topics.length === 0" class="fade-in-up">
      <div class="empty-state">
        <div class="empty-state-icon">🚀</div>
        <div class="empty-state-title">{{ t('ai.noDataTitle') }}</div>
        <div class="empty-state-text">{{ t('ai.noDataText') }}</div>
        <RouterLink to="/" class="btn btn-primary-custom">{{ t('home.startTest') }}</RouterLink>
      </div>
    </div>

    <!-- Roadmap -->
    <div v-else>
      <div class="row g-4">
        <!-- Left: Timeline Roadmap -->
        <div class="col-lg-8 col-xl-9 fade-in-up fade-in-up-delay-1">
          <div class="glass-card p-4">
            <h5 class="fw-bold mb-4 d-flex align-items-center gap-2">
              <span>🗺️</span> {{ t('ai.roadmapTitle') }}
            </h5>

            <div class="roadmap">
              <div v-for="(topic, i) in data.topics" :key="i" class="roadmap-node">
                <!-- Dot -->
                <div class="roadmap-dot" :class="getNodeStatus(topic.accuracy_percent)">
                  <span v-if="topic.accuracy_percent >= 80" style="font-size: 0.65rem;">✓</span>
                  <span v-else-if="topic.accuracy_percent >= 30" style="font-size: 0.55rem;">▶</span>
                  <span v-else style="font-size: 0.5rem;">○</span>
                </div>

                <div class="glass-card p-3">
                  <!-- Level label -->
                  <div class="roadmap-level">
                    {{ t('ai.level') }} {{ getLevelLabel(i, data.topics.length) }}
                  </div>

                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold mb-0" style="font-size: 0.95rem;">{{ topic.subject_name }}</h6>
                    <strong :class="{
                      'score-excellent': topic.accuracy_percent >= 80,
                      'score-good': topic.accuracy_percent >= 60,
                      'score-average': topic.accuracy_percent >= 40,
                      'score-poor': topic.accuracy_percent < 40
                    }" style="font-size: 0.85rem;">{{ topic.accuracy_percent }}%</strong>
                  </div>

                  <small class="text-secondary d-block mb-2" style="font-size: 0.8rem;">
                    {{ topic.correct_answers }}/{{ topic.total_answers }} {{ t('results.correct') }}
                  </small>

                  <!-- Progress bar -->
                  <div class="progress-custom" style="height: 8px;">
                    <div class="progress-bar" :class="getBarColor(topic.accuracy_percent)"
                         :style="{ width: topic.accuracy_percent + '%' }">
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Stats + AI Recommendation -->
        <div class="col-lg-4 col-xl-3">
          <!-- Quick Stats -->
          <div class="glass-card p-4 mb-4 fade-in-up fade-in-up-delay-2">
            <h6 class="fw-bold mb-3">📊 {{ t('ai.progress') }}</h6>

            <div v-for="(topic, i) in data.topics" :key="i" class="stat-mini">
              <div class="stat-mini-icon" :style="{
                background: topic.accuracy_percent >= 80 ? 'rgba(6, 214, 160, 0.1)' :
                            topic.accuracy_percent >= 60 ? 'rgba(67, 97, 238, 0.1)' :
                            topic.accuracy_percent >= 40 ? 'rgba(255, 209, 102, 0.15)' : 'rgba(239, 71, 111, 0.1)'
              }">
                {{ topic.accuracy_percent >= 80 ? '✅' : topic.accuracy_percent >= 60 ? '📈' : topic.accuracy_percent >= 40 ? '⚠️' : '🔴' }}
              </div>
              <div class="flex-grow-1 min-w-0">
                <div style="font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  {{ topic.subject_name }}
                </div>
              </div>
              <small class="fw-bold" :class="{
                'score-excellent': topic.accuracy_percent >= 80,
                'score-good': topic.accuracy_percent >= 60,
                'score-average': topic.accuracy_percent >= 40,
                'score-poor': topic.accuracy_percent < 40
              }">{{ topic.accuracy_percent }}%</small>
            </div>
          </div>

          <!-- AI Recommendation -->
          <div v-if="data.recommendation" class="glass-card p-4 fade-in-up fade-in-up-delay-3">
            <h6 class="fw-bold mb-3 d-flex align-items-center gap-2">
              <span>🤖</span> {{ t('ai.recommendation') }}
            </h6>
            <p class="text-secondary" style="white-space: pre-line; line-height: 1.8; font-size: 0.88rem; margin: 0;">
              {{ data.recommendation }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
