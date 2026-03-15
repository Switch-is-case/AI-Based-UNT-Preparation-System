<script setup>
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const languages = [
  { code: 'ru', label: 'RU' },
  { code: 'kk', label: 'KZ' },
  { code: 'en', label: 'EN' }
]

function switchLang(code) {
  locale.value = code
  localStorage.setItem('locale', code)
}
</script>

<template>
  <div class="lang-switcher btn-group btn-group-sm">
    <button
      v-for="lang in languages"
      :key="lang.code"
      class="btn btn-outline-light"
      :class="{ active: locale === lang.code }"
      @click="switchLang(lang.code)"
    >
      {{ lang.label }}
    </button>
  </div>
</template>
