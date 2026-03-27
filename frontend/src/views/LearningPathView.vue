<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const { t } = useI18n()
const auth = useAuthStore()

const data = ref(null)
const loading = ref(true)

// Track which cards are expanded (by index)
const expandedCards = ref(new Set())

function toggleCard(index) {
  if (expandedCards.value.has(index)) {
    expandedCards.value.delete(index)
  } else {
    expandedCards.value.add(index)
  }
  // Force reactivity
  expandedCards.value = new Set(expandedCards.value)
}

function isExpanded(index) {
  return expandedCards.value.has(index)
}

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

function getBarGradient(pct) {
  if (pct >= 80) return 'linear-gradient(135deg, #06d6a0, #04b88a)'
  if (pct >= 60) return 'linear-gradient(135deg, #4361ee, #4cc9f0)'
  if (pct >= 40) return 'linear-gradient(135deg, #ffd166, #f0a500)'
  return 'linear-gradient(135deg, #ef476f, #d63d5e)'
}

function getNodeStatus(pct) {
  if (pct >= 80) return 'completed'
  if (pct >= 30) return 'current'
  return 'locked'
}

function getLevelLabel(index, total) {
  const fraction = index / (total - 1 || 1)
  if (fraction <= 0.25) return '1'
  if (fraction <= 0.5) return '2'
  if (fraction <= 0.75) return '3'
  return '4'
}

function getStatusIcon(pct) {
  if (pct >= 80) return '✅'
  if (pct >= 60) return '📈'
  if (pct >= 40) return '⚠️'
  return '🔴'
}

function getStatusText(pct) {
  if (pct >= 80) return t('home.levelMaster')
  if (pct >= 60) return t('home.levelAdvanced')
  if (pct >= 40) return t('home.levelLearner')
  return t('home.levelBeginner')
}

function getStatusClass(pct) {
  if (pct >= 80) return 'chip-success'
  if (pct >= 60) return 'chip-primary'
  if (pct >= 40) return 'chip-warning'
  return 'chip-danger'
}

// Generate mock sub-topics for a subject (simulated based on subject name)
function getSubTopics(topic) {
  const total = topic.total_answers || 0
  const correct = topic.correct_answers || 0
  const topicCount = Math.max(3, Math.min(8, Math.ceil(total / 2)))
  const passed = Math.min(topicCount, Math.floor((topic.accuracy_percent / 100) * topicCount))

  return { passed, total: topicCount }
}

// Overall progress for stats
const overallProgress = computed(() => {
  if (!data.value || data.value.topics.length === 0) return 0
  const sum = data.value.topics.reduce((a, t) => a + (t.accuracy_percent || 0), 0)
  return Math.round(sum / data.value.topics.length)
})
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

    <!-- Main Content -->
    <div v-else>
      <!-- Overall Stats Bar -->
      <div class="glass-card p-3 mb-4 fade-in-up fade-in-up-delay-1">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="d-flex align-items-center gap-3">
            <div class="overall-stat-circle">
              <svg width="52" height="52" style="transform: rotate(-90deg);">
                <circle cx="26" cy="26" r="22" fill="none" stroke="var(--input-bg)" stroke-width="4"/>
                <circle cx="26" cy="26" r="22" fill="none"
                        :stroke="overallProgress >= 60 ? 'var(--success)' : overallProgress >= 40 ? 'var(--warning)' : 'var(--danger)'"
                        stroke-width="4" stroke-linecap="round"
                        :stroke-dasharray="138"
                        :stroke-dashoffset="138 - (138 * overallProgress / 100)"
                        style="transition: stroke-dashoffset 1s ease;"/>
              </svg>
              <span class="overall-stat-value">{{ overallProgress }}%</span>
            </div>
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">{{ t('ai.progress') }}</div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">
                {{ data.topics.length }} {{ t('ai.subject').toLowerCase() }}
              </div>
            </div>
          </div>

          <!-- Mini chips for each subject -->
          <div class="d-flex flex-wrap gap-2">
            <div v-for="(topic, i) in data.topics" :key="i"
                 class="lp-mini-chip"
                 :class="getStatusClass(topic.accuracy_percent)"
                 @click="toggleCard(i)"
                 style="cursor: pointer;">
              {{ getStatusIcon(topic.accuracy_percent) }}
              <span style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ topic.subject_name }}
              </span>
              <strong>{{ topic.accuracy_percent }}%</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Accordion Cards -->
      <div class="lp-accordion-list">
        <div v-for="(topic, i) in data.topics" :key="i"
             class="lp-accordion-card fade-in-up"
             :class="[
               `fade-in-up-delay-${(i % 4) + 1}`,
               { 'lp-accordion-card--open': isExpanded(i) }
             ]">

          <!-- Collapsed Header (always visible) -->
          <div class="lp-accordion-header" @click="toggleCard(i)">
            <!-- Left: dot + info -->
            <div class="d-flex align-items-center gap-3 flex-grow-1 min-w-0">
              <!-- Status dot -->
              <div class="lp-status-dot" :class="getNodeStatus(topic.accuracy_percent)">
                <span v-if="topic.accuracy_percent >= 80" style="font-size: 0.6rem;">✓</span>
                <span v-else-if="topic.accuracy_percent >= 30" style="font-size: 0.5rem;">▶</span>
                <span v-else style="font-size: 0.45rem;">○</span>
              </div>

              <div class="flex-grow-1 min-w-0">
                <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <span class="lp-level-tag">{{ t('ai.level') }} {{ getLevelLabel(i, data.topics.length) }}</span>
                  <h6 class="fw-bold mb-0" style="font-size: 0.95rem;">{{ topic.subject_name }}</h6>
                </div>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                  <span class="lp-chip" :class="getStatusClass(topic.accuracy_percent)">
                    {{ getStatusIcon(topic.accuracy_percent) }} {{ getStatusText(topic.accuracy_percent) }}
                  </span>
                  <small class="text-secondary" style="font-size: 0.78rem;">
                    {{ topic.correct_answers }}/{{ topic.total_answers }} {{ t('results.correct') }}
                  </small>
                </div>
              </div>
            </div>

            <!-- Right: percentage + progress + expand icon -->
            <div class="d-flex align-items-center gap-3">
              <div class="text-end" style="min-width: 70px;">
                <strong :class="{
                  'score-excellent': topic.accuracy_percent >= 80,
                  'score-good': topic.accuracy_percent >= 60,
                  'score-average': topic.accuracy_percent >= 40,
                  'score-poor': topic.accuracy_percent < 40
                }" style="font-size: 1.1rem;">{{ topic.accuracy_percent }}%</strong>
                <div class="progress-custom mt-1" style="height: 6px; width: 70px;">
                  <div class="progress-bar" :class="getBarColor(topic.accuracy_percent)"
                       :style="{ width: topic.accuracy_percent + '%' }">
                  </div>
                </div>
              </div>
              <div class="lp-expand-icon" :class="{ 'lp-expand-icon--open': isExpanded(i) }">
                ▾
              </div>
            </div>
          </div>

          <!-- Expanded Content -->
          <transition name="lp-slide">
            <div v-if="isExpanded(i)" class="lp-accordion-body">
              <div class="lp-accordion-body-inner">
                <!-- Grid: Left = Topics, Right = AI Recommendation -->
                <div class="row g-3">
                  <!-- Left: Subject detail + sub-topics -->
                  <div class="col-md-6">
                    <div class="lp-detail-block">
                      <div class="lp-detail-block-header">
                        <span>📊</span>
                        <span style="font-weight: 600; font-size: 0.85rem;">{{ t('ai.progress') }}</span>
                      </div>

                      <!-- Sub-topics chips -->
                      <div class="lp-subtopics-chip-row">
                        <div class="lp-subtopic-chip">
                          <span style="font-size: 0.82rem;">📝</span>
                          <span>{{ getSubTopics(topic).passed }}/{{ getSubTopics(topic).total }}</span>
                          <span style="color: var(--text-secondary); font-size: 0.75rem;">тем пройдено</span>
                        </div>
                        <div class="lp-subtopic-chip">
                          <span style="font-size: 0.82rem;">✅</span>
                          <span>{{ topic.correct_answers }}</span>
                          <span style="color: var(--text-secondary); font-size: 0.75rem;">{{ t('results.correct') }}</span>
                        </div>
                        <div class="lp-subtopic-chip">
                          <span style="font-size: 0.82rem;">❌</span>
                          <span>{{ topic.total_answers - topic.correct_answers }}</span>
                          <span style="color: var(--text-secondary); font-size: 0.75rem;">{{ t('results.wrong') }}</span>
                        </div>
                      </div>

                      <!-- Detailed progress bar -->
                      <div class="mt-3">
                        <div class="d-flex justify-content-between mb-1">
                          <small style="font-size: 0.75rem; color: var(--text-secondary);">{{ t('ai.accuracy') }}</small>
                          <small style="font-size: 0.75rem; font-weight: 700;">{{ topic.accuracy_percent }}%</small>
                        </div>
                        <div class="progress-custom" style="height: 10px;">
                          <div class="progress-bar"
                               :style="{ width: topic.accuracy_percent + '%', background: getBarGradient(topic.accuracy_percent) }">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Right: AI Recommendation -->
                  <div class="col-md-6">
                    <div class="lp-ai-message-block">
                      <div class="lp-ai-message-header">
                        <div class="lp-ai-avatar">🤖</div>
                        <div>
                          <div style="font-weight: 700; font-size: 0.85rem;">{{ t('ai.recommendation') }}</div>
                          <div style="font-size: 0.7rem; color: var(--text-muted);">AI-Репетитор</div>
                        </div>
                      </div>
                      <div class="lp-ai-message-body">
                        <p v-if="data.recommendation" style="white-space: pre-line; line-height: 1.8; font-size: 0.85rem; margin: 0; color: var(--text-primary);">
                          {{ data.recommendation }}
                        </p>
                        <p v-else style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
                          {{ t('ai.noData') }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Accordion Card ── */
.lp-accordion-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lp-accordion-card {
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.lp-accordion-card:hover {
  border-color: var(--card-hover-border);
  box-shadow: var(--shadow-lg);
}

.lp-accordion-card--open {
  border-color: rgba(67, 97, 238, 0.25);
  box-shadow: 0 8px 32px rgba(67, 97, 238, 0.1);
}

/* ── Header ── */
.lp-accordion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  cursor: pointer;
  user-select: none;
  gap: 16px;
  transition: background 0.2s ease;
}

.lp-accordion-header:hover {
  background: rgba(67, 97, 238, 0.03);
}

/* ── Status Dot ── */
.lp-status-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.lp-status-dot.completed {
  background: var(--success);
  color: #fff;
  box-shadow: 0 0 12px rgba(6, 214, 160, 0.4);
}

.lp-status-dot.current {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(67, 97, 238, 0.15), 0 0 12px rgba(67, 97, 238, 0.3);
}

.lp-status-dot.locked {
  background: var(--input-bg);
  border: 2px solid var(--card-border);
  color: var(--text-muted);
}

/* ── Level Tag ── */
.lp-level-tag {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  background: var(--input-bg);
  padding: 2px 8px;
  border-radius: 6px;
}

/* ── Status Chip ── */
.lp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
}

.lp-chip.chip-success {
  background: rgba(6, 214, 160, 0.1);
  color: #028a67;
}

.lp-chip.chip-primary {
  background: rgba(67, 97, 238, 0.1);
  color: var(--primary);
}

.lp-chip.chip-warning {
  background: rgba(255, 209, 102, 0.15);
  color: #d4a017;
}

.lp-chip.chip-danger {
  background: rgba(239, 71, 111, 0.1);
  color: var(--danger);
}

/* ── Mini Chip (top stats bar) ── */
.lp-mini-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.lp-mini-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.lp-mini-chip.chip-success {
  background: rgba(6, 214, 160, 0.1);
  color: #028a67;
}

.lp-mini-chip.chip-primary {
  background: rgba(67, 97, 238, 0.1);
  color: var(--primary);
}

.lp-mini-chip.chip-warning {
  background: rgba(255, 209, 102, 0.15);
  color: #d4a017;
}

.lp-mini-chip.chip-danger {
  background: rgba(239, 71, 111, 0.1);
  color: var(--danger);
}

/* ── Expand Icon ── */
.lp-expand-icon {
  font-size: 1.1rem;
  color: var(--text-muted);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.lp-expand-icon--open {
  transform: rotate(180deg);
}

/* ── Accordion Body ── */
.lp-accordion-body {
  overflow: hidden;
}

.lp-accordion-body-inner {
  padding: 0 20px 20px;
  border-top: 1px solid var(--divider);
  padding-top: 16px;
}

/* ── Slide Transition ── */
.lp-slide-enter-active,
.lp-slide-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 500px;
  opacity: 1;
}

.lp-slide-enter-from,
.lp-slide-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

/* ── Detail Block ── */
.lp-detail-block {
  background: var(--input-bg);
  border-radius: var(--radius-sm);
  padding: 16px;
  height: 100%;
}

.lp-detail-block-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

/* ── Sub-topics Chips ── */
.lp-subtopics-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lp-subtopic-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  background: var(--card-bg-solid);
  border: 1px solid var(--card-border);
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.lp-subtopic-chip:hover {
  border-color: var(--card-hover-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* ── AI Message Block ── */
.lp-ai-message-block {
  background: linear-gradient(135deg, rgba(67, 97, 238, 0.04), rgba(114, 9, 183, 0.04));
  border: 1px solid rgba(67, 97, 238, 0.12);
  border-radius: var(--radius-sm);
  padding: 16px;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.lp-ai-message-block::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
}

.lp-ai-message-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.lp-ai-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(67, 97, 238, 0.15), rgba(114, 9, 183, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.lp-ai-message-body {
  background: var(--card-bg-solid);
  border-radius: 8px;
  padding: 12px 14px;
  border: 1px solid var(--card-border);
  position: relative;
}

.lp-ai-message-body::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 18px;
  width: 10px;
  height: 10px;
  background: var(--card-bg-solid);
  border-left: 1px solid var(--card-border);
  border-top: 1px solid var(--card-border);
  transform: rotate(45deg);
}

/* ── Overall Stat Circle ── */
.overall-stat-circle {
  position: relative;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.overall-stat-value {
  position: absolute;
  font-size: 0.72rem;
  font-weight: 800;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .lp-accordion-header {
    padding: 14px 14px;
    flex-wrap: wrap;
  }

  .lp-mini-chip span {
    max-width: 60px !important;
  }
}
</style>
