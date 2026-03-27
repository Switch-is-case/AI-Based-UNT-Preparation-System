<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import apiClient from '@/api/client'

const { t } = useI18n()
const leaderboard = ref([])
const loading = ref(true)
const search = ref('')

onMounted(async () => {
  try {
    const { data } = await apiClient.get('/tests/leaderboard')
    leaderboard.value = data
  } catch (err) {
    console.error('Leaderboard error:', err)
  } finally {
    loading.value = false
  }
})

function filtered() {
  if (!search.value) return leaderboard.value
  return leaderboard.value.filter(s =>
    s.username.toLowerCase().includes(search.value.toLowerCase())
  )
}

function getInitials(name) {
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}
</script>

<template>
  <div class="page-container">
    <div class="text-center mb-5 fade-in-up">
      <h1 class="page-title">🏆 {{ t('leaderboard.title') }}</h1>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="leaderboard.length === 0" class="fade-in-up">
      <div class="glass-card empty-state mx-auto" style="max-width: 600px; padding: 60px 24px;">
        <div class="empty-state-icon" style="font-size: 5rem;">👑</div>
        <h3 class="fw-bold mb-3" style="color: var(--text-primary);">{{ t('leaderboard.emptyTitle') }}</h3>
        <p class="text-secondary mb-4 fs-5" style="max-width: 450px; margin: 0 auto; line-height: 1.6;">
          {{ t('leaderboard.emptyText') }}
        </p>
        <RouterLink to="/" class="btn btn-primary-custom btn-lg bounce-in" style="animation-delay: 0.5s;">
          🚀 {{ t('leaderboard.startFirst') }}
        </RouterLink>
      </div>
    </div>

    <!-- Leaderboard Content -->
    <div v-else>
      <!-- Top 3 Podium -->
      <div v-if="leaderboard.length >= 3" class="d-flex justify-content-center align-items-end gap-3 gap-md-5 mb-5 fade-in-up">
        <!-- 2nd Place -->
        <div class="podium-item text-center">
          <div class="podium-avatar podium-silver">{{ getInitials(leaderboard[1].username) }}</div>
          <strong class="d-block text-truncate" style="max-width: 90px; font-size: 0.9rem;">{{ leaderboard[1].username }}</strong>
          <div class="text-secondary mb-2" style="font-size: 0.8rem;">{{ leaderboard[1].avg_score }}%</div>
          <div class="glass-card" style="width: 70px; height: 90px; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent); border-top: 3px solid #c0c0c0;">
            <span class="fs-4">🥈</span>
          </div>
        </div>

        <!-- 1st Place -->
        <div class="podium-item text-center">
          <div class="podium-avatar podium-gold" style="width: 75px; height: 75px; font-size: 1.7rem; border: 3px solid rgba(255, 215, 0, 0.4); transform: translateY(-10px); z-index: 2;">
            {{ getInitials(leaderboard[0].username) }}
          </div>
          <strong class="d-block text-truncate text-gradient-primary fw-bold" style="max-width: 100px; font-size: 1.05rem;">{{ leaderboard[0].username }}</strong>
          <div class="fw-bold mb-2" style="font-size: 0.85rem; color: var(--text-secondary);">{{ leaderboard[0].avg_score }}%</div>
          <div class="glass-card" style="width: 90px; height: 130px; display: flex; align-items: flex-start; justify-content: center; background: linear-gradient(180deg, rgba(255, 215, 0, 0.15), transparent); border-top: 4px solid #ffd700; padding-top: 15px; z-index: 1;">
            <span class="fs-2 drop-shadow">🥇</span>
          </div>
        </div>

        <!-- 3rd Place -->
        <div class="podium-item text-center">
          <div class="podium-avatar podium-bronze">{{ getInitials(leaderboard[2].username) }}</div>
          <strong class="d-block text-truncate" style="max-width: 90px; font-size: 0.9rem;">{{ leaderboard[2].username }}</strong>
          <div class="text-secondary mb-2" style="font-size: 0.8rem;">{{ leaderboard[2].avg_score }}%</div>
          <div class="glass-card" style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, rgba(255,255,255,0.1), transparent); border-top: 3px solid #cd7f32;">
            <span class="fs-4">🥉</span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="mb-4 fade-in-up fade-in-up-delay-1" style="max-width: 400px;">
        <div class="position-relative">
          <span class="position-absolute" style="left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">🔍</span>
          <input v-model="search" type="text" class="form-control form-control-dark w-100"
                 :placeholder="t('common.search')" style="padding-left: 40px;" />
        </div>
      </div>

      <!-- Table Section -->
      <div class="glass-card p-0 overflow-hidden fade-in-up fade-in-up-delay-2">
        <div class="table-responsive">
          <table class="table table-dark-custom mb-0 table-hover">
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">#</th>
                <th>{{ t('leaderboard.student') }}</th>
                <th>{{ t('leaderboard.avgScore') }}</th>
                <th class="d-none d-md-table-cell">{{ t('leaderboard.bestScore') }}</th>
                <th class="d-none d-sm-table-cell">{{ t('leaderboard.attempts') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filtered().length === 0">
                <td colspan="5" class="text-center py-5 text-secondary">
                  {{ t('common.noResults') }}
                </td>
              </tr>
              <tr v-for="(student, i) in filtered()" :key="student.user_id"
                  :style="{ background: i === 0 ? 'rgba(255, 215, 0, 0.04)' : i === 1 ? 'rgba(192, 192, 192, 0.04)' : i === 2 ? 'rgba(205, 127, 50, 0.04)' : '' }">
                <td class="fw-bold text-center" style="color: var(--text-secondary);">
                  <span v-if="i === 0" style="color: #ffd700; font-size: 1.1rem;">🥇</span>
                  <span v-else-if="i === 1" style="color: #c0c0c0; font-size: 1.1rem;">🥈</span>
                  <span v-else-if="i === 2" style="color: #cd7f32; font-size: 1.1rem;">🥉</span>
                  <span v-else>{{ i + 1 }}</span>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-3">
                    <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                         :style="{
                           width: '36px', height: '36px', fontSize: '0.8rem',
                           background: i === 0 ? 'linear-gradient(135deg, #ffd700, #ff8c00)' :
                                       i === 1 ? 'linear-gradient(135deg, #c0c0c0, #808080)' :
                                       i === 2 ? 'linear-gradient(135deg, #cd7f32, #8b4513)' :
                                       'linear-gradient(135deg, var(--primary), var(--info))'
                         }">
                      {{ getInitials(student.username) }}
                    </div>
                    <span class="fw-medium" :class="{'fw-bold': i < 3}" style="color: var(--text-primary);">
                      {{ student.username }}
                    </span>
                  </div>
                </td>
                <td class="fw-bold align-middle" :class="{
                  'score-excellent': student.avg_score >= 80,
                  'score-good': student.avg_score >= 60 && student.avg_score < 80,
                  'score-average': student.avg_score >= 40 && student.avg_score < 60,
                  'score-poor': student.avg_score < 40
                }">{{ student.avg_score }}%</td>
                <td class="align-middle text-secondary d-none d-md-table-cell">{{ student.best_score }}%</td>
                <td class="align-middle text-secondary d-none d-sm-table-cell">{{ student.total_attempts }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drop-shadow {
  filter: drop-shadow(0 4px 6px rgba(255, 215, 0, 0.4));
}
</style>
