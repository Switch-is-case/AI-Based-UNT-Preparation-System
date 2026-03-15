<script setup>
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/client'

const { t } = useI18n()
const auth = useAuthStore()

const messages = ref([])
const input = ref('')
const loading = ref(false)
const chatBox = ref(null)

async function sendMessage() {
  if (!input.value.trim() || loading.value) return

  const userMsg = input.value.trim()
  messages.value.push({ role: 'user', text: userMsg })
  input.value = ''
  loading.value = true

  await scrollToBottom()

  try {
    const { data } = await apiClient.post('/ai/chat', { message: userMsg })
    messages.value.push({ role: 'ai', text: data.answer })
  } catch (err) {
    messages.value.push({ role: 'ai', text: t('common.error') })
  } finally {
    loading.value = false
    await scrollToBottom()
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatBox.value) {
    chatBox.value.scrollTop = chatBox.value.scrollHeight
  }
}
</script>

<template>
  <div class="page-container d-flex flex-column" style="height: calc(100vh - 70px);">
    <h1 class="page-title mb-3 fade-in-up">🤖 {{ t('ai.tutorTitle') }}</h1>

    <!-- Chat Messages -->
    <div ref="chatBox" class="glass-card flex-grow-1 p-4 mb-3 overflow-auto fade-in-up"
         style="min-height: 0;">
      <div v-if="messages.length === 0" class="text-center py-5">
        <div style="font-size: 4rem;">🤖</div>
        <p class="text-secondary mt-3">{{ t('ai.placeholder') }}</p>
      </div>

      <div v-for="(msg, i) in messages" :key="i" class="d-flex"
           :class="{ 'justify-content-end': msg.role === 'user' }">
        <div class="chat-bubble" :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'">
          {{ msg.text }}
        </div>
      </div>

      <div v-if="loading" class="d-flex">
        <div class="chat-bubble chat-bubble-ai loading-pulse">
          {{ t('ai.thinking') }}
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="d-flex gap-2 fade-in-up">
      <input v-model="input" type="text" class="form-control form-control-dark flex-grow-1"
             :placeholder="t('ai.placeholder')"
             @keyup.enter="sendMessage"
             :disabled="loading" />
      <button class="btn btn-primary-custom" @click="sendMessage" :disabled="loading || !input.trim()">
        {{ t('ai.send') }}
      </button>
    </div>
  </div>
</template>
