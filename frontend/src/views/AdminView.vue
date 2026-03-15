<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import apiClient from '@/api/client'

const { t } = useI18n()

const activeTab = ref('stats')
const stats = ref(null)
const students = ref([])
const questions = ref([])
const loading = ref(true)

// New question form
const showForm = ref(false)
const form = ref({
  testId: '', textRu: '', textKk: '', textEn: '',
  type: 'single', difficulty: 'medium',
  options: [
    { textRu: '', textKk: '', textEn: '', isCorrect: false },
    { textRu: '', textKk: '', textEn: '', isCorrect: false },
    { textRu: '', textKk: '', textEn: '', isCorrect: false },
    { textRu: '', textKk: '', textEn: '', isCorrect: false }
  ]
})

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/admin/stats')
    stats.value = data
  } catch (err) {
    console.error('Admin stats error:', err)
  } finally {
    loading.value = false
  }
})

async function loadStudents() {
  activeTab.value = 'students'
  const { data } = await apiClient.get('/admin/students')
  students.value = data
}

async function loadQuestions() {
  activeTab.value = 'questions'
  const { data } = await apiClient.get('/admin/questions')
  questions.value = data
}

function addOption() {
  form.value.options.push({ textRu: '', textKk: '', textEn: '', isCorrect: false })
}

async function submitQuestion() {
  try {
    await apiClient.post('/admin/questions', form.value)
    showForm.value = false
    form.value.textRu = ''
    form.value.textKk = ''
    form.value.textEn = ''
    form.value.options = [
      { textRu: '', textKk: '', textEn: '', isCorrect: false },
      { textRu: '', textKk: '', textEn: '', isCorrect: false },
      { textRu: '', textKk: '', textEn: '', isCorrect: false },
      { textRu: '', textKk: '', textEn: '', isCorrect: false }
    ]
    await loadQuestions()
  } catch (err) {
    console.error('Create question error:', err)
  }
}

async function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return
  await apiClient.delete(`/admin/questions/${id}`)
  await loadQuestions()
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title fade-in-up">⚙️ {{ t('admin.title') }}</h1>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else>
      <!-- Tab Navigation -->
      <div class="d-flex gap-2 mb-4 fade-in-up">
        <button class="btn" :class="activeTab === 'stats' ? 'btn-primary-custom' : 'btn-outline-glass'"
                @click="activeTab = 'stats'">{{ t('admin.stats') }}</button>
        <button class="btn" :class="activeTab === 'students' ? 'btn-primary-custom' : 'btn-outline-glass'"
                @click="loadStudents">{{ t('admin.students') }}</button>
        <button class="btn" :class="activeTab === 'questions' ? 'btn-primary-custom' : 'btn-outline-glass'"
                @click="loadQuestions">{{ t('admin.questions') }}</button>
      </div>

      <!-- Stats -->
      <div v-if="activeTab === 'stats'" class="row g-4 fade-in-up">
        <div class="col-md-3 col-6" v-for="(stat, key) in {
          totalStudents: stats.studentsCount,
          totalTests: stats.testsCount,
          totalQuestions: stats.questionsCount,
          totalAttempts: stats.attemptsCount
        }" :key="key">
          <div class="glass-card p-4 text-center">
            <div class="display-5 fw-bold mb-1" style="color: var(--primary);">{{ stat }}</div>
            <small class="text-secondary">{{ t(`admin.${key}`) }}</small>
          </div>
        </div>
      </div>

      <!-- Students -->
      <div v-if="activeTab === 'students'" class="glass-card p-0 overflow-hidden fade-in-up">
        <table class="table table-dark-custom mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>{{ t('auth.username') }}</th>
              <th>{{ t('auth.email') }}</th>
              <th>{{ t('leaderboard.attempts') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in students" :key="s.id">
              <td>{{ s.id }}</td>
              <td>{{ s.username }}</td>
              <td class="text-secondary">{{ s.email }}</td>
              <td>{{ s.attempts_count }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Questions -->
      <div v-if="activeTab === 'questions'" class="fade-in-up">
        <button class="btn btn-primary-custom mb-3" @click="showForm = !showForm">
          {{ showForm ? t('common.cancel') : t('admin.addQuestion') }}
        </button>

        <!-- Add Question Form -->
        <div v-if="showForm" class="glass-card p-4 mb-4">
          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label class="form-label small text-secondary">Test ID</label>
              <input v-model="form.testId" type="number" class="form-control form-control-dark" />
            </div>
            <div class="col-md-4">
              <label class="form-label small text-secondary">Type</label>
              <select v-model="form.type" class="form-control form-control-dark">
                <option value="single">Single</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small text-secondary">Difficulty</label>
              <select v-model="form.difficulty" class="form-control form-control-dark">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small text-secondary">Вопрос (RU)</label>
            <textarea v-model="form.textRu" class="form-control form-control-dark" rows="2"></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label small text-secondary">Сұрақ (KZ)</label>
            <textarea v-model="form.textKk" class="form-control form-control-dark" rows="2"></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label small text-secondary">Question (EN)</label>
            <textarea v-model="form.textEn" class="form-control form-control-dark" rows="2"></textarea>
          </div>

          <h6 class="text-secondary mt-3 mb-2">Options</h6>
          <div v-for="(opt, i) in form.options" :key="i" class="row g-2 mb-2 align-items-center">
            <div class="col">
              <input v-model="opt.textRu" class="form-control form-control-dark form-control-sm"
                     :placeholder="`Option ${i + 1} (RU)`" />
            </div>
            <div class="col-auto">
              <div class="form-check">
                <input type="checkbox" class="form-check-input" v-model="opt.isCorrect" :id="`correct-${i}`" />
                <label class="form-check-label text-secondary" :for="`correct-${i}`">✓</label>
              </div>
            </div>
          </div>

          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-outline-glass btn-sm" @click="addOption">+ Add Option</button>
            <button class="btn btn-primary-custom btn-sm" @click="submitQuestion">{{ t('common.save') }}</button>
          </div>
        </div>

        <!-- Questions List -->
        <div class="glass-card p-0 overflow-hidden">
          <table class="table table-dark-custom mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>{{ t('admin.questions') }}</th>
                <th>Test</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in questions" :key="q.id">
                <td>{{ q.id }}</td>
                <td>{{ q.text_ru?.substring(0, 80) }}...</td>
                <td class="text-secondary small">{{ q.test_title }}</td>
                <td class="text-end">
                  <button class="btn btn-outline-danger btn-sm" @click="deleteQuestion(q.id)">
                    {{ t('common.delete') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
