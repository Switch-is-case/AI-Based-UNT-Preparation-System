<script setup>
import NavBar from '@/components/NavBar.vue'
</script>

<template>
  <div id="app">
    <NavBar />
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
main {
  padding-top: 70px;
}
</style>
