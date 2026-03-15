<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import apiClient from '@/api/client'

const { t } = useI18n()
const subjects = ref([])
const tests = ref([])
const loading = ref(true)

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

function getTestsForSubject(subjectId) {
  return tests.value.filter(t => t.subject_id === subjectId)
}
</script>

<template>
  <div class="page-container">
    <!-- Hero -->
    <div class="text-center mb-5 fade-in-up">
      <h1 class="page-title" style="font-size: 2.5rem;">{{ t('home.welcome') }}</h1>
      <p class="page-subtitle">{{ t('home.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-secondary mt-3">{{ t('common.loading') }}</p>
    </div>

    <!-- Subjects Grid -->
    <div v-else>
      <h3 class="mb-4" style="color: var(--text-secondary);">{{ t('home.chooseSubject') }}</h3>

      <div v-if="subjects.length === 0" class="text-center py-5">
        <p class="text-secondary fs-5">{{ t('home.noTests') }}</p>
      </div>

      <div class="row g-4">
        <div v-for="(subject, i) in subjects" :key="subject.id"
             class="col-md-6 col-lg-4 fade-in-up"
             :class="`fade-in-up-delay-${(i % 3) + 1}`">
          <div class="glass-card p-4 h-100">
            <span class="subject-icon">{{ subject.icon }}</span>
            <h5 class="fw-bold mb-2">{{ subject.name }}</h5>
            <p class="text-secondary small mb-3">
              {{ subject.test_count }} {{ t('home.testsAvailable') }}
            </p>

            <div v-for="test in getTestsForSubject(subject.id)" :key="test.id" class="mb-2">
              <RouterLink :to="`/test/${test.id}`"
                          class="btn btn-primary-custom btn-sm w-100 d-flex justify-content-between align-items-center">
                <span>{{ test.title }}</span>
                <span class="badge bg-white text-dark">{{ test.question_count }} Q</span>
              </RouterLink>
            </div>

            <div v-if="getTestsForSubject(subject.id).length === 0"
                 class="text-secondary small text-center py-2">
              {{ t('home.noTests') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
