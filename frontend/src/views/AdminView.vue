<script setup>
import { ref, onMounted, watch, computed } from 'vue'
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

// Students Search
const studentSearch = ref('')

const filteredStudents = computed(() => {
  if (!studentSearch.value) return students.value
  const query = studentSearch.value.toLowerCase()
  return students.value.filter(s => 
    s.username.toLowerCase().includes(query) || 
    s.email.toLowerCase().includes(query)
  )
})

// Formatting helpers
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Sparkline SVG helper
const sparklinePoints = computed(() => {
  if (!stats.value || !stats.value.recentActivity || stats.value.recentActivity.length === 0) return ''
  const acts = stats.value.recentActivity
  const max = Math.max(...acts.map(a => a.count), 1)
  const min = 0
  
  // Draw inside a 200x50 SVG box
  const width = 200
  const height = 50
  const points = acts.map((a, i) => {
    const x = (i / (acts.length - 1 || 1)) * width
    const y = height - ((a.count - min) / (max - min) * height)
    return `${x},${y}`
  })
  
  return points.join(' ')
})

// Subjects & tests for the form dropdowns
const subjects = ref([])
const testsForSubject = ref([])

// New question form
const showForm = ref(false)
const formLang = ref('ru')
const form = ref(resetForm())

function resetForm() {
  formLang.value = 'ru'
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

// Drag & Drop Handlers for options
let draggedOptionIndex = -1
function onDragStart(index) {
  draggedOptionIndex = index
}
function onDrop(index) {
  if (draggedOptionIndex === -1 || draggedOptionIndex === index) return
  const item = form.value.options.splice(draggedOptionIndex, 1)[0]
  form.value.options.splice(index, 0, item)
  draggedOptionIndex = -1
}

async function submitQuestion() {
  formError.value = ''
  formSuccess.value = ''

  if (!form.value.subjectId) { formError.value = 'Выберите предмет'; return }
  if (!form.value.testId) { formError.value = 'Выберите тест'; return }
  if (!form.value.textRu.trim()) { formError.value = 'Введите текст вопроса (RU)'; return }
  if (!form.value.options || form.value.options.length < 2) { formError.value = 'Добавьте минимум 2 варианта ответа'; return }
  
  const hasCorrect = form.value.options.some(opt => opt.isCorrect)
  if (!hasCorrect) { formError.value = 'Выберите правильный ответ'; return }
  
  const hasEmptyOption = form.value.options.some(opt => !opt.textRu.trim())
  if (hasEmptyOption) { formError.value = 'Заполните текст всех вариантов ответа (RU)'; return }

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

// Custom Confirm Modal
const showDeleteConfirm = ref(false)
const questionToDelete = ref(null)

function promptDeleteQuestion(id) {
  questionToDelete.value = id
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!questionToDelete.value) return
  try {
    await apiClient.delete(`/admin/questions/${questionToDelete.value}`)
    await loadQuestions()
  } catch (err) {
    console.error('Delete error', err)
  } finally {
    showDeleteConfirm.value = false
    questionToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteConfirm.value = false
  questionToDelete.value = null
}
</script>

<template>
  <div class="page-container">
    <div class="d-flex justify-content-between align-items-center mb-4 fade-in-up">
      <h1 class="page-title mb-0">⚙️ {{ t('admin.title') }}</h1>
    </div>

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
      <div v-if="activeTab === 'stats'" class="fade-in-up">
        <div class="row g-4 mb-4">
          <!-- Overview Cards -->
          <div class="col-md-3 col-6" v-for="(stat, key) in {
            totalStudents: { val: stats.studentsCount, icon: '👨‍🎓', trend: '+12%' },
            totalTests: { val: stats.testsCount, icon: '📄', trend: '+3' },
            totalQuestions: { val: stats.questionsCount, icon: '❓', trend: '+45' },
            totalAttempts: { val: stats.attemptsCount, icon: '🎯', trend: '+150' }
          }" :key="key">
            <div class="glass-card p-4 position-relative overflow-hidden h-100">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span style="font-size: 1.5rem;">{{ stat.icon }}</span>
                <span class="badge bg-success" style="font-size: 0.75rem; border-radius: 4px;">{{ stat.trend }}</span>
              </div>
              <div class="display-6 fw-bold mb-1" style="color: var(--text-primary);">{{ stat.val }}</div>
              <small class="text-secondary">{{ t(`admin.${key}`) }}</small>
            </div>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="row g-4">
          <div class="col-lg-8">
            <div class="glass-card p-4">
              <h6 class="fw-bold mb-4">📈 Количество тестов по дням (За неделю)</h6>
              <div class="chart-container" style="height: 120px; position: relative;">
                <svg viewBox="0 0 200 50" preserveAspectRatio="none" style="width: 100%; height: 100%; overflow: visible;">
                  <polyline
                    fill="none"
                    stroke="var(--primary)"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    :points="sparklinePoints"
                  />
                  <!-- Gradient fill under line -->
                  <polygon
                    fill="url(#gradient)"
                    opacity="0.2"
                    :points="`0,50 ${sparklinePoints} 200,50`"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stop-color="var(--primary)" />
                      <stop offset="100%" stop-color="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
                <div class="d-flex justify-content-between text-secondary mt-2" style="font-size: 0.75rem;">
                  <span v-for="a in stats.recentActivity" :key="a.date">{{ a.date.split('-')[2] }}.{{ a.date.split('-')[1] }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Students -->
      <div v-if="activeTab === 'students'" class="fade-in-up">
        <!-- Search bar -->
        <div class="mb-3 d-flex gap-2" style="max-width: 400px;">
          <input v-model="studentSearch" type="text" class="form-control form-control-dark" placeholder="Поиск по Email или Имени..." />
        </div>

        <div class="glass-card p-0 overflow-hidden">
          <table class="table table-dark-custom mb-0 table-hover align-middle">
            <thead>
              <tr>
                <th>{{ t('auth.username') }}</th>
                <th>{{ t('auth.email') }}</th>
                <th>Прогресс</th>
                <th>Ср. балл</th>
                <th>Последняя акт.</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in filteredStudents" :key="s.id">
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 0.8rem;">
                      {{ s.username.slice(0, 2).toUpperCase() }}
                    </div>
                    <strong>{{ s.username }}</strong>
                  </div>
                </td>
                <td class="text-secondary small">{{ s.email }}</td>
                <td class="text-secondary small">{{ s.attempts_count }} тестов</td>
                <td>
                  <span class="badge" :class="Number(s.avg_score) >= 70 ? 'bg-success' : Number(s.avg_score) >= 40 ? 'bg-warning' : 'bg-danger'">
                    {{ s.avg_score || 0 }}%
                  </span>
                </td>
                <td class="text-secondary small">{{ formatDate(s.last_active_at) }}</td>
                <td>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-glass" title="Профиль">👤</button>
                    <button class="btn btn-sm btn-outline-danger" title="Сбросить пароль">🔑</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredStudents.length === 0">
                <td colspan="6" class="text-center py-4 text-secondary">Студенты не найдены</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Questions -->
      <div v-if="activeTab === 'questions'" class="fade-in-up">
        <button class="btn btn-primary-custom mb-4" @click="showForm = !showForm">
          {{ showForm ? t('common.cancel') : '➕ ' + t('admin.addQuestion') }}
        </button>

        <!-- ═══════════════ Add Question Form (2-Column Layout) ═══════════════ -->
        <div v-if="showForm" class="glass-card p-4 mb-4" style="animation: slideDown 0.3s ease;">
          <h5 class="fw-bold mb-4">Создание вопроса</h5>

          <div v-if="formError" class="alert alert-danger d-flex align-items-center mb-3 py-2 px-3" style="border-radius: 8px;">
            <span class="me-2">⚠️</span> {{ formError }}
          </div>
          <div v-if="formSuccess" class="alert alert-success d-flex align-items-center mb-3 py-2 px-3" style="border-radius: 8px;">
            <span class="me-2">✅</span> {{ formSuccess }}
          </div>

          <div class="row g-4">
            <!-- LEFT COLUMN: Settings -->
            <div class="col-lg-4">
              <div class="p-3" style="background: rgba(0,0,0,0.1); border-radius: 12px; border: 1px solid var(--border-color);">
                <h6 class="mb-3 text-secondary" style="font-size: 0.85rem; text-transform: uppercase;">Настройки вопроса</h6>
                
                <div class="mb-3">
                  <label class="form-label small text-secondary mb-1">{{ t('admin.subject') }}</label>
                  <select v-model="form.subjectId" class="form-control form-control-dark form-control-sm">
                    <option value="" disabled>{{ t('admin.selectSubject') }}</option>
                    <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.icon }} {{ s.name_ru }}</option>
                  </select>
                </div>
                
                <div class="mb-3">
                  <label class="form-label small text-secondary mb-1">{{ t('admin.test') }}</label>
                  <select v-model="form.testId" class="form-control form-control-dark form-control-sm" :disabled="!form.subjectId">
                    <option value="" disabled>{{ t('admin.selectTest') }}</option>
                    <option v-for="ts in testsForSubject" :key="ts.id" :value="ts.id">{{ ts.title_ru }}</option>
                  </select>
                </div>
                
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label small text-secondary mb-1">{{ t('admin.variantNumber') }}</label>
                    <input v-model="form.variantNumber" type="text" class="form-control form-control-dark form-control-sm" placeholder="2145" />
                  </div>
                  <div class="col-6">
                    <label class="form-label small text-secondary mb-1">{{ t('admin.questionNumber') }}</label>
                    <input v-model.number="form.orderNum" type="number" min="1" class="form-control form-control-dark form-control-sm" placeholder="1" />
                  </div>
                </div>

                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <label class="form-label small text-secondary mb-1">{{ t('admin.type') }}</label>
                    <select v-model="form.type" class="form-control form-control-dark form-control-sm">
                      <option value="single">Один ответ (⊙)</option>
                      <option value="multiple">Несколько (☑)</option>
                    </select>
                  </div>
                  <div class="col-6">
                    <label class="form-label small text-secondary mb-1">{{ t('admin.difficulty') }}</label>
                    <select v-model="form.difficulty" class="form-control form-control-dark form-control-sm">
                      <option value="easy">Лёгкий</option>
                      <option value="medium">Средний</option>
                      <option value="hard">Сложный</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN: Content (Tabs) -->
            <div class="col-lg-8">
              <!-- Custom Tabs -->
              <div class="lang-tabs mb-3 d-flex">
                <button class="lang-tab" :class="{ active: formLang === 'ru' }" @click.prevent="formLang = 'ru'">🇷🇺 Русский</button>
                <button class="lang-tab" :class="{ active: formLang === 'kk' }" @click.prevent="formLang = 'kk'">🇰🇿 Казақша</button>
                <button class="lang-tab" :class="{ active: formLang === 'en' }" @click.prevent="formLang = 'en'">🇬🇧 English</button>
              </div>

              <!-- Question Text area -->
              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-end mb-1">
                  <label class="form-label small fw-bold mb-0">Текст вопроса ({{ formLang }})</label>
                  <small class="text-muted" style="font-size: 0.7rem;">Поддерживается Markdown: **жирный**, *курсив*, `код`</small>
                </div>
                
                <textarea v-if="formLang === 'ru'" v-model="form.textRu" class="form-control form-control-dark" rows="3" placeholder="Введите текст вопроса на русском..."></textarea>
                <textarea v-else-if="formLang === 'kk'" v-model="form.textKk" class="form-control form-control-dark" rows="3" placeholder="Сұрақты қазақша енгізіңіз..."></textarea>
                <textarea v-else v-model="form.textEn" class="form-control form-control-dark" rows="3" placeholder="Enter question in English..."></textarea>
              </div>

              <!-- Options -->
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0 fw-bold">Варианты ответов <span class="badge bg-secondary ms-2" style="font-size: 0.7rem;">{{ form.type === 'single' ? 'Max 1 correct' : 'Multiple correct' }}</span></h6>
                <button class="btn btn-outline-glass btn-sm" @click="addOption" style="padding: 2px 8px; font-size: 0.8rem;">+ Добавить вариант</button>
              </div>

              <div class="options-container">
                <div v-for="(opt, i) in form.options" :key="i" 
                     class="option-row d-flex gap-2 align-items-start mb-2"
                     :class="{ 'option-correct-row': opt.isCorrect }"
                     draggable="true" 
                     @dragstart="onDragStart(i)" 
                     @dragover.prevent 
                     @drop="onDrop(i)">
                  
                  <!-- Drag Handle -->
                  <div class="drag-handle text-muted d-flex align-items-center justify-content-center" style="cursor: grab; width: 24px; padding-top: 8px;">
                    ⋮⋮
                  </div>

                  <!-- Radio/Checkbox -->
                  <div class="d-flex align-items-center justify-content-center" style="width: 30px; padding-top: 8px;">
                    <input v-if="form.type === 'single'" type="radio" :name="`correct-answer-${Date.now()}`" class="form-check-input" :checked="opt.isCorrect" @click="selectCorrect(i)" />
                    <input v-else type="checkbox" class="form-check-input" :checked="opt.isCorrect" @click="selectCorrect(i)" />
                  </div>

                  <!-- Input -->
                  <div class="flex-grow-1">
                    <input v-if="formLang === 'ru'" v-model="opt.textRu" class="form-control form-control-dark form-control-sm" :placeholder="`Вариант ${i + 1} (RU)`" />
                    <input v-else-if="formLang === 'kk'" v-model="opt.textKk" class="form-control form-control-dark form-control-sm" :placeholder="`Вариант ${i + 1} (KZ)`" />
                    <input v-else v-model="opt.textEn" class="form-control form-control-dark form-control-sm" :placeholder="`Вариант ${i + 1} (EN)`" />
                  </div>

                  <!-- Delete btn -->
                  <button v-if="form.options.length > 2" class="btn btn-sm btn-ghost text-danger action-btn" @click="removeOption(i)" tabindex="-1">✕</button>
                </div>
              </div>

              <div class="d-flex justify-content-end mt-4 pt-3" style="border-top: 1px solid var(--border-color);">
                <button class="btn btn-secondary me-2" @click="showForm = false">{{ t('common.cancel') }}</button>
                <button class="btn btn-primary-custom px-4" @click="submitQuestion">{{ t('common.save') }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Questions List -->
        <div class="glass-card p-0 overflow-hidden">
          <table class="table table-dark-custom mb-0 table-hover align-middle">
            <thead>
              <tr>
                <th>№</th>
                <th>{{ t('admin.questions') }}</th>
                <th>{{ t('admin.subject') }} / {{ t('admin.test') }}</th>
                <th>{{ t('admin.type') }}</th>
                <th class="text-end">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in questions" :key="q.id">
                <td class="text-secondary">{{ q.order_num || '-' }}</td>
                <td>
                  <div style="font-weight: 500; font-size: 0.9rem; max-width: 350px;" class="text-truncate">{{ q.text_ru }}</div>
                  <div class="small text-secondary mt-1">Вар: {{ q.variant_number || '—' }} | {{ q.difficulty }}</div>
                </td>
                <td>
                  <div class="small">{{ q.subject_name }}</div>
                  <div class="small text-secondary">{{ q.test_title?.substring(0, 20) }}...</div>
                </td>
                <td><span class="badge bg-dark border border-secondary">{{ q.type === 'single' ? 'Один' : 'Много' }}</span></td>
                <td class="text-end">
                  <button class="btn btn-outline-danger btn-sm" @click="promptDeleteQuestion(q.id)">🗑️ {{ t('common.delete') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal Overlay -->
    <div v-if="showDeleteConfirm" class="modal-overlay d-flex align-items-center justify-content-center">
      <div class="glass-card p-4 bounce-in text-center" style="width: 100%; max-width: 350px; z-index: 1050;">
        <div class="mb-3" style="font-size: 3rem;">🗑️</div>
        <h5 class="fw-bold mb-2">Удалить вопрос?</h5>
        <p class="text-secondary small mb-4">Это действие нельзя будет отменить. Вопрос будет навсегда удален из базы данных.</p>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-glass flex-grow-1" @click="cancelDelete">Отмена</button>
          <button class="btn btn-danger flex-grow-1" @click="confirmDelete">Удалить</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lang-tabs {
  border-bottom: 2px solid var(--input-bg);
}
.lang-tab {
  background: none;
  border: none;
  padding: 8px 16px;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}
.lang-tab:hover {
  color: var(--text-primary);
}
.lang-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.option-row {
  background: var(--input-bg);
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 6px;
  transition: border-color 0.2s;
}
.option-row:hover {
  border-color: rgba(255,255,255,0.1);
}
.option-correct-row {
  border-color: rgba(34, 197, 94, 0.5) !important;
  background: rgba(34, 197, 94, 0.05);
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1040;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

input[type="radio"], input[type="checkbox"] {
  cursor: pointer;
  transform: scale(1.2);
}
</style>
