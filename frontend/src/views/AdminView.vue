<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import apiClient from '@/api/client'

const { t } = useI18n()

const activeTab = ref('stats')
const stats = ref(null)
const students = ref([])
const questions = ref([])
const loading = ref(true)
const formError = ref('')
const formSuccess = ref('')

// Subjects & tests for the form dropdowns
const subjects = ref([])
const testsForSubject = ref([])

// New question form
const showForm = ref(false)
const form = ref(resetForm())

function resetForm() {
  return {
    subjectId: '',
    testId: '',
    variantNumber: '',
    orderNum: '',
    textRu: '', textKk: '', textEn: '',
    type: 'single',
    difficulty: 'medium',
    options: [
      { textRu: '', textKk: '', textEn: '', isCorrect: false },
      { textRu: '', textKk: '', textEn: '', isCorrect: false },
      { textRu: '', textKk: '', textEn: '', isCorrect: false },
      { textRu: '', textKk: '', textEn: '', isCorrect: false }
    ]
  }
}

onMounted(async () => {
  try {
    const [statsRes, subjectsRes] = await Promise.all([
      apiClient.get('/admin/stats'),
      apiClient.get('/admin/subjects')
    ])
    stats.value = statsRes.data
    subjects.value = subjectsRes.data
  } catch (err) {
    console.error('Admin init error:', err)
  } finally {
    loading.value = false
  }
})

// When subject changes, load tests for that subject
watch(() => form.value.subjectId, async (newId) => {
  form.value.testId = ''
  testsForSubject.value = []
  if (!newId) return
  try {
    const { data } = await apiClient.get('/admin/tests', { params: { subjectId: newId } })
    testsForSubject.value = data
  } catch (err) {
    console.error('Load tests error:', err)
  }
})

// When type changes, reset correct answers to avoid invalid state
watch(() => form.value.type, (newType) => {
  if (newType === 'single') {
    // Keep only one correct answer (the first one found or none)
    let foundFirst = false
    form.value.options.forEach(opt => {
      if (opt.isCorrect && !foundFirst) {
        foundFirst = true
      } else {
        opt.isCorrect = false
      }
    })
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

function removeOption(index) {
  if (form.value.options.length > 2) {
    form.value.options.splice(index, 1)
  }
}

function selectCorrect(index) {
  if (form.value.type === 'single') {
    form.value.options.forEach((opt, i) => {
      opt.isCorrect = i === index
    })
  } else {
    form.value.options[index].isCorrect = !form.value.options[index].isCorrect
  }
}

async function submitQuestion() {
  formError.value = ''
  formSuccess.value = ''

  // Client-side validation
  if (!form.value.subjectId) {
    formError.value = 'Выберите предмет'
    return
  }
  if (!form.value.testId) {
    formError.value = 'Выберите тест'
    return
  }
  if (!form.value.textRu.trim()) {
    formError.value = 'Введите текст вопроса (RU)'
    return
  }
  if (!form.value.options || form.value.options.length < 2) {
    formError.value = 'Добавьте минимум 2 варианта ответа'
    return
  }
  const hasCorrect = form.value.options.some(opt => opt.isCorrect)
  if (!hasCorrect) {
    formError.value = 'Выберите правильный ответ'
    return
  }
  const hasEmptyOption = form.value.options.some(opt => !opt.textRu.trim())
  if (hasEmptyOption) {
    formError.value = 'Заполните текст всех вариантов ответа (RU)'
    return
  }

  try {
    await apiClient.post('/admin/questions', form.value)
    formSuccess.value = 'Вопрос успешно сохранён!'
    setTimeout(() => {
      showForm.value = false
      formSuccess.value = ''
      form.value = resetForm()
    }, 1500)
    await loadQuestions()
  } catch (err) {
    console.error('Create question error:', err)
    formError.value = err.response?.data?.error || 'Ошибка при сохранении вопроса'
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

        <!-- ═══════════════ Add Question Form ═══════════════ -->
        <div v-if="showForm" class="glass-card p-4 mb-4">

          <!-- Error / Success alerts -->
          <div v-if="formError" class="alert alert-danger d-flex align-items-center mb-3" role="alert" style="background: rgba(220, 53, 69, 0.15); border: 1px solid rgba(220, 53, 69, 0.4); color: #ff6b7a; border-radius: 10px;">
            <span class="me-2">⚠️</span> {{ formError }}
          </div>
          <div v-if="formSuccess" class="alert alert-success d-flex align-items-center mb-3" role="alert" style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #4ade80; border-radius: 10px;">
            <span class="me-2">✅</span> {{ formSuccess }}
          </div>

          <!-- Row 1: Subject, Test, Variant -->
          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label class="form-label small text-secondary">{{ t('admin.subject') }}</label>
              <select v-model="form.subjectId" class="form-control form-control-dark" id="admin-subject-select">
                <option value="" disabled>{{ t('admin.selectSubject') }}</option>
                <option v-for="s in subjects" :key="s.id" :value="s.id">
                  {{ s.icon }} {{ s.name_ru }}
                </option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small text-secondary">{{ t('admin.test') }}</label>
              <select v-model="form.testId" class="form-control form-control-dark" :disabled="!form.subjectId" id="admin-test-select">
                <option value="" disabled>{{ t('admin.selectTest') }}</option>
                <option v-for="ts in testsForSubject" :key="ts.id" :value="ts.id">
                  {{ ts.title_ru }}
                </option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small text-secondary">{{ t('admin.variantNumber') }}</label>
              <input v-model="form.variantNumber" type="text" class="form-control form-control-dark"
                     placeholder="2145" id="admin-variant-input" />
            </div>
          </div>

          <!-- Row 2: Question Number, Type, Difficulty -->
          <div class="row g-3 mb-3">
            <div class="col-md-4">
              <label class="form-label small text-secondary">{{ t('admin.questionNumber') }}</label>
              <input v-model.number="form.orderNum" type="number" min="1" max="40"
                     class="form-control form-control-dark" placeholder="1" id="admin-order-input" />
            </div>
            <div class="col-md-4">
              <label class="form-label small text-secondary">{{ t('admin.type') }}</label>
              <select v-model="form.type" class="form-control form-control-dark" id="admin-type-select">
                <option value="single">{{ t('admin.singleAnswer') }}</option>
                <option value="multiple">{{ t('admin.multipleAnswers') }}</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label small text-secondary">{{ t('admin.difficulty') }}</label>
              <select v-model="form.difficulty" class="form-control form-control-dark" id="admin-difficulty-select">
                <option value="easy">{{ t('admin.easy') }}</option>
                <option value="medium">{{ t('admin.medium') }}</option>
                <option value="hard">{{ t('admin.hard') }}</option>
              </select>
            </div>
          </div>

          <!-- Type indicator badge -->
          <div class="mb-3">
            <span class="badge" :class="form.type === 'single' ? 'bg-info' : 'bg-warning'" style="font-size: 0.8rem;">
              {{ form.type === 'single' ? '⊙ ' + t('admin.singleHint') : '☑ ' + t('admin.multipleHint') }}
            </span>
          </div>

          <!-- Question text (RU / KZ / EN) -->
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

          <!-- Options with multilingual inputs -->
          <h6 class="text-secondary mt-3 mb-2">{{ t('admin.options') }}</h6>

          <div v-for="(opt, i) in form.options" :key="i" class="option-block mb-3 p-3"
               :class="{ 'option-correct': opt.isCorrect }">

            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="badge bg-secondary">{{ i + 1 }}</span>

              <!-- Radio for single, Checkbox for multiple -->
              <div class="form-check" @click.prevent="selectCorrect(i)" style="cursor: pointer;">
                <!-- Single: radio -->
                <input v-if="form.type === 'single'"
                       type="radio"
                       class="form-check-input"
                       :checked="opt.isCorrect"
                       :name="'correct-answer'"
                       :id="`correct-${i}`"
                       @click.prevent="selectCorrect(i)" />
                <!-- Multiple: checkbox -->
                <input v-else
                       type="checkbox"
                       class="form-check-input"
                       :checked="opt.isCorrect"
                       :id="`correct-${i}`"
                       @click.prevent="selectCorrect(i)" />
                <label class="form-check-label text-secondary" :for="`correct-${i}`"
                       style="cursor: pointer;">✓ {{ t('admin.correctAnswer') }}</label>
              </div>

              <!-- Remove option button -->
              <button v-if="form.options.length > 2"
                      class="btn btn-outline-danger btn-sm ms-auto" style="padding: 0 6px;"
                      @click="removeOption(i)" type="button">✕</button>
            </div>

            <!-- RU -->
            <input v-model="opt.textRu" class="form-control form-control-dark form-control-sm mb-1"
                   :placeholder="`${t('admin.optionRu')} ${i + 1}`" />
            <!-- KZ -->
            <input v-model="opt.textKk" class="form-control form-control-dark form-control-sm mb-1"
                   :placeholder="`${t('admin.optionKk')} ${i + 1}`" />
            <!-- EN -->
            <input v-model="opt.textEn" class="form-control form-control-dark form-control-sm"
                   :placeholder="`${t('admin.optionEn')} ${i + 1}`" />
          </div>

          <div class="d-flex gap-2 mt-3">
            <button class="btn btn-outline-glass btn-sm" @click="addOption" type="button">+ {{ t('admin.addOption') }}</button>
            <button class="btn btn-primary-custom btn-sm" @click="submitQuestion">{{ t('common.save') }}</button>
          </div>
        </div>

        <!-- Questions List -->
        <div class="glass-card p-0 overflow-hidden">
          <table class="table table-dark-custom mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>№</th>
                <th>{{ t('admin.questions') }}</th>
                <th>{{ t('admin.subject') }}</th>
                <th>{{ t('admin.variant') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in questions" :key="q.id">
                <td>{{ q.id }}</td>
                <td class="text-secondary">{{ q.order_num || '—' }}</td>
                <td>{{ q.text_ru?.substring(0, 60) }}...</td>
                <td class="text-secondary small">{{ q.subject_name }}</td>
                <td class="text-secondary small">{{ q.variant_number || '—' }}</td>
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

<style scoped>
.option-block {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
}

.option-block:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}

.option-correct {
  border-color: rgba(34, 197, 94, 0.4) !important;
  background: rgba(34, 197, 94, 0.06) !important;
}

.form-check-input:checked {
  background-color: #22c55e;
  border-color: #22c55e;
}
</style>
