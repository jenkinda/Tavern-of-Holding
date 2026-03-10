<script lang="ts">
  export let title = "Hub";
</script>

<div class="flex flex-col items-center justify-center h-full pt-10 text-center">
  <div class="w-24 h-24 mb-6 rounded-full bg-[var(--tavern-bg-base)] border-2 border-[var(--tavern-accent-gold)] border-dashed flex items-center justify-center shadow-lg shadow-[var(--tavern-accent-gold)]/10">
    <span class="text-4xl opacity-50">🍺</span>
  </div>
  
  <h2 class="text-3xl font-serif text-[var(--tavern-accent-gold)] mb-4 tracking-wide">{title}</h2>
  
  <p class="max-w-md text-[var(--tavern-text-main)]/70 leading-relaxed">
    Welcome to the Tavern of Holding. The hearth is warm. <br/>
    <span class="text-sm opacity-50 italic mt-4 block">(This module is currently under construction.)</span>
  </p>
</div>
