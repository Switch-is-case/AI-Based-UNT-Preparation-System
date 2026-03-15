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
  return name.slice(0, 2).toUpperCase()
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title fade-in-up">🏆 {{ t('leaderboard.title') }}</h1>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="leaderboard.length === 0" class="text-center py-5 fade-in-up">
      <div style="font-size: 4rem;">🏆</div>
      <p class="text-secondary fs-5 mt-3">{{ t('leaderboard.noData') }}</p>
    </div>

    <div v-else>
      <!-- Top 3 Podium -->
      <div v-if="leaderboard.length >= 3" class="d-flex justify-content-center align-items-end gap-4 mb-5 fade-in-up">
        <!-- 2nd Place -->
        <div class="podium-item text-center">
          <div class="podium-avatar podium-silver">{{ getInitials(leaderboard[1].username) }}</div>
          <strong class="small">{{ leaderboard[1].username }}</strong>
          <div class="text-secondary small">{{ leaderboard[1].avg_score }}%</div>
          <div class="glass-card mt-2" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
            <span class="fs-4">🥈</span>
          </div>
        </div>

        <!-- 1st Place -->
        <div class="podium-item text-center">
          <div class="podium-avatar podium-gold" style="width: 80px; height: 80px; font-size: 1.6rem;">
            {{ getInitials(leaderboard[0].username) }}
          </div>
          <strong>{{ leaderboard[0].username }}</strong>
          <div class="text-secondary small">{{ leaderboard[0].avg_score }}%</div>
          <div class="glass-card mt-2" style="width: 80px; height: 120px; display: flex; align-items: center; justify-content: center;">
            <span class="fs-3">🥇</span>
          </div>
        </div>

        <!-- 3rd Place -->
        <div class="podium-item text-center">
          <div class="podium-avatar podium-bronze">{{ getInitials(leaderboard[2].username) }}</div>
          <strong class="small">{{ leaderboard[2].username }}</strong>
          <div class="text-secondary small">{{ leaderboard[2].avg_score }}%</div>
          <div class="glass-card mt-2" style="width: 80px; height: 60px; display: flex; align-items: center; justify-content: center;">
            <span class="fs-4">🥉</span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="mb-4 fade-in-up fade-in-up-delay-1">
        <input v-model="search" type="text" class="form-control form-control-dark"
               :placeholder="t('common.search')" />
      </div>

      <!-- Table -->
      <div class="glass-card p-0 overflow-hidden fade-in-up fade-in-up-delay-2">
        <table class="table table-dark-custom mb-0">
          <thead>
            <tr>
              <th style="width:60px">#</th>
              <th>{{ t('leaderboard.student') }}</th>
              <th>{{ t('leaderboard.avgScore') }}</th>
              <th>{{ t('leaderboard.bestScore') }}</th>
              <th>{{ t('leaderboard.attempts') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, i) in filtered()" :key="student.user_id">
              <td class="fw-bold">{{ i + 1 }}</td>
              <td>
                <div class="d-flex align-items-center gap-2">
                  <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                       :style="{
                         width: '32px', height: '32px', fontSize: '0.7rem',
                         background: i < 3 ? 'var(--primary)' : 'var(--card-bg)',
                         border: '1px solid var(--card-border)'
                       }">
                    {{ getInitials(student.username) }}
                  </div>
                  {{ student.username }}
                </div>
              </td>
              <td class="fw-bold" :class="{
                'score-excellent': student.avg_score >= 80,
                'score-good': student.avg_score >= 60 && student.avg_score < 80,
                'score-average': student.avg_score >= 40 && student.avg_score < 60,
                'score-poor': student.avg_score < 40
              }">{{ student.avg_score }}%</td>
              <td>{{ student.best_score }}%</td>
              <td>{{ student.total_attempts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
