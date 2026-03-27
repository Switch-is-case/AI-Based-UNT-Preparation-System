<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import apiClient from '@/api/client'

const { t } = useI18n()
const subjects = ref([])
const tests = ref([])
const loading = ref(true)

// Mandatory subject names (case-insensitive partial match)
const mandatoryKeywords = [
  'история казахстана', 'қазақстан тарихы', 'history of kazakhstan',
  'грамотность чтения', 'оқу сауаттылығы', 'reading literacy',
  'математическая грамотность', 'математикалық сауаттылық', 'mathematical literacy',
  'мат. грамотность', 'мат грамотность'
]

onMounted(async () => {
  try {
    const [subjectsRes, testsRes] = await Promise.all([
      apiClient.get('/tests/subjects'),
      apiClient.get('/tests')
    ])
    subjects.value = subjectsRes.data
    tests.value = testsRes.data
  } catch (err) {
    console.error('Load error:', err)
  } finally {
    loading.value = false
  }
})

function isMandatory(subject) {
  const name = subject.name.toLowerCase()
  return mandatoryKeywords.some(kw => name.includes(kw))
}

const mandatorySubjects = computed(() => subjects.value.filter(s => isMandatory(s)))
const profileSubjects = computed(() => subjects.value.filter(s => !isMandatory(s)))

function getTestsForSubject(subjectId) {
  return tests.value.filter(t => t.subject_id === subjectId)
}

// Mock progress (based on test_count available — in real app, fetch from history)
function getProgress(subject) {
  const testCount = subject.test_count || 0
  if (testCount === 0) return 0
  // Simple mock: random deterministic based on subject id
  return Math.min(100, ((subject.id * 37 + 13) % 85) + 5)
}

function getLevelInfo(progress) {
  if (progress >= 80) return { key: 'home.levelMaster', cls: 'master', icon: '🏆' }
  if (progress >= 60) return { key: 'home.levelAdvanced', cls: 'advanced', icon: '🚀' }
  if (progress >= 30) return { key: 'home.levelLearner', cls: 'learner', icon: '📖' }
  return { key: 'home.levelBeginner', cls: 'beginner', icon: '🌱' }
}
</script>

<template>
  <div class="page-container">
    <!-- Hero -->
    <div class="text-center mb-5 fade-in-up">
      <h1 class="page-title" style="font-size: 2.2rem;">{{ t('home.welcome') }}</h1>
      <p class="page-subtitle">{{ t('home.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-secondary mt-3">{{ t('common.loading') }}</p>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Empty state -->
      <div v-if="subjects.length === 0" class="empty-state fade-in-up">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-title">{{ t('home.noSubjects') }}</div>
        <div class="empty-state-text">{{ t('home.noTests') }}</div>
      </div>

      <template v-else>
        <!-- Mandatory Subjects -->
        <div v-if="mandatorySubjects.length > 0" class="mb-5 fade-in-up">
          <div class="section-header">
            <div class="section-header-icon mandatory">⭐</div>
            <div>
              <h3>{{ t('home.mandatory') }}</h3>
              <small>{{ t('home.mandatoryDesc') }}</small>
            </div>
          </div>

          <div class="row g-3">
            <div v-for="(subject, i) in mandatorySubjects" :key="subject.id"
                 class="col-md-6 col-lg-4 fade-in-up"
                 :class="`fade-in-up-delay-${(i % 4) + 1}`">
              <div class="glass-card subject-card-mandatory p-4 h-100">
                <div class="d-flex align-items-start gap-3 mb-3">
                  <div class="subject-icon-container mandatory">
                    {{ subject.icon }}
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <h5 class="fw-bold mb-1" style="font-size: 0.95rem;">{{ subject.name }}</h5>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                      <span class="subject-badge mandatory">⭐ {{ t('home.mandatory') }}</span>
                      <span class="level-badge" :class="getLevelInfo(getProgress(subject)).cls">
                        {{ getLevelInfo(getProgress(subject)).icon }}
                        {{ t(getLevelInfo(getProgress(subject)).key) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Progress -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-secondary" style="font-size: 0.75rem;">{{ t('home.progress') }}</small>
                    <small class="fw-bold" style="font-size: 0.75rem;">{{ getProgress(subject) }}%</small>
                  </div>
                  <div class="progress-custom" style="height: 6px;">
                    <div class="progress-bar progress-bar-mandatory"
                         :style="{ width: getProgress(subject) + '%' }">
                    </div>
                  </div>
                </div>

                <!-- Tests -->
                <div class="d-flex flex-column gap-2">
                  <p class="text-secondary small mb-0">
                    {{ subject.test_count }} {{ t('home.testsAvailable') }}
                  </p>
                  <div v-for="test in getTestsForSubject(subject.id)" :key="test.id">
                    <RouterLink :to="`/test/${test.id}`"
                                class="btn btn-primary-custom btn-sm w-100 d-flex justify-content-between align-items-center">
                      <span style="font-size: 0.85rem;">{{ test.title }}</span>
                      <span class="badge bg-white text-dark" style="font-size: 0.7rem;">{{ test.question_count }} Q</span>
                    </RouterLink>
                  </div>
                  <div v-if="getTestsForSubject(subject.id).length === 0"
                       class="text-secondary small text-center py-1">
                    {{ t('home.noTests') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Subjects -->
        <div v-if="profileSubjects.length > 0" class="mb-4 fade-in-up fade-in-up-delay-2">
          <div class="section-header">
            <div class="section-header-icon profile">🎯</div>
            <div>
              <h3>{{ t('home.profile') }}</h3>
              <small>{{ t('home.profileDesc') }}</small>
            </div>
          </div>

          <div class="row g-3">
            <div v-for="(subject, i) in profileSubjects" :key="subject.id"
                 class="col-md-6 col-lg-4 fade-in-up"
                 :class="`fade-in-up-delay-${(i % 4) + 1}`">
              <div class="glass-card subject-card-profile p-4 h-100">
                <div class="d-flex align-items-start gap-3 mb-3">
                  <div class="subject-icon-container profile">
                    {{ subject.icon }}
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <h5 class="fw-bold mb-1" style="font-size: 0.95rem;">{{ subject.name }}</h5>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                      <span class="subject-badge profile">🎯 {{ t('home.profile') }}</span>
                      <span class="level-badge" :class="getLevelInfo(getProgress(subject)).cls">
                        {{ getLevelInfo(getProgress(subject)).icon }}
                        {{ t(getLevelInfo(getProgress(subject)).key) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Progress -->
                <div class="mb-3">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-secondary" style="font-size: 0.75rem;">{{ t('home.progress') }}</small>
                    <small class="fw-bold" style="font-size: 0.75rem;">{{ getProgress(subject) }}%</small>
                  </div>
                  <div class="progress-custom" style="height: 6px;">
                    <div class="progress-bar progress-bar-profile"
                         :style="{ width: getProgress(subject) + '%' }">
                    </div>
                  </div>
                </div>

                <!-- Tests -->
                <div class="d-flex flex-column gap-2">
                  <p class="text-secondary small mb-0">
                    {{ subject.test_count }} {{ t('home.testsAvailable') }}
                  </p>
                  <div v-for="test in getTestsForSubject(subject.id)" :key="test.id">
                    <RouterLink :to="`/test/${test.id}`"
                                class="btn btn-outline-glass btn-sm w-100 d-flex justify-content-between align-items-center">
                      <span style="font-size: 0.85rem;">{{ test.title }}</span>
                      <span class="badge-glass" style="font-size: 0.7rem;">{{ test.question_count }} Q</span>
                    </RouterLink>
                  </div>
                  <div v-if="getTestsForSubject(subject.id).length === 0"
                       class="text-secondary small text-center py-1">
                    {{ t('home.noTests') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
