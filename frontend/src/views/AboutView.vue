<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const techStack = [
  { name: 'Vue.js 3', icon: '💚', desc: 'Frontend framework' },
  { name: 'Bootstrap 5', icon: '🎨', desc: 'CSS framework' },
  { name: 'Node.js + Express', icon: '🟢', desc: 'Backend server' },
  { name: 'PostgreSQL', icon: '🐘', desc: 'Database' },
  { name: 'Redis', icon: '🔴', desc: 'Caching' },
  { name: 'Dify AI', icon: '🤖', desc: 'AI Integration' },
  { name: 'JWT + Argon2', icon: '🔐', desc: 'Security' },
  { name: 'Docker', icon: '🐳', desc: 'Containerization' }
]
</script>

<template>
  <div class="page-container">
    <div class="text-center mb-5 fade-in-up">
      <div style="font-size: 4rem;">🎓</div>
      <h1 class="page-title mt-3">{{ t('about.title') }}</h1>
      <p class="page-subtitle mx-auto" style="max-width: 600px;">{{ t('about.description') }}</p>
    </div>

    <!-- Features -->
    <div class="glass-card p-4 mb-4 fade-in-up fade-in-up-delay-1">
      <h4 class="fw-bold mb-4">✨ {{ t('about.features') }}</h4>
      <div class="row g-3">
        <div v-for="i in 5" :key="i" class="col-md-6">
          <div class="d-flex align-items-start gap-3 p-2">
            <span class="badge-glass">{{ i }}</span>
            <span>{{ t(`about.feature${i}`) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tech Stack -->
    <div class="glass-card p-4 fade-in-up fade-in-up-delay-2">
      <h4 class="fw-bold mb-4">🛠️ {{ t('about.tech') }}</h4>
      <div class="row g-3">
        <div v-for="tech in techStack" :key="tech.name" class="col-md-3 col-6">
          <div class="glass-card p-3 text-center h-100" style="background: rgba(255,255,255,0.03);">
            <div style="font-size: 2rem;">{{ tech.icon }}</div>
            <strong class="d-block mt-2 small">{{ tech.name }}</strong>
            <small class="text-secondary">{{ tech.desc }}</small>
          </div>
        </div>
      </div>
    </div>

    <div class="text-center mt-4 text-secondary small fade-in-up fade-in-up-delay-3">
      <p>© 2026 UNT Prep Platform • Дипломный проект</p>
    </div>
  </div>
</template>
