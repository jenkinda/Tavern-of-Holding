<script lang="ts">
  import type { Snippet } from "svelte";

  let { children, currentHash }: { children: Snippet; currentHash: string } =
    $props();

  function goTo(path: string) {
    window.location.hash = path;
  }

  const navItems = [
    { name: "The Common Room", path: "/", icon: "🍺" },
    { name: "Lore & Ledger", path: "/notes", icon: "📜" },
    { name: "The Loom", path: "/loom", icon: "🧵" },
    { name: "The Bestiary", path: "/bestiary", icon: "🐉" },
    { name: "Bard's Corner", path: "/soundboard", icon: "🎵" },
    { name: "The Fray", path: "/combat", icon: "⚔️" },
    { name: "The Oracle", path: "/generators", icon: "🎲" },
    { name: "Cartographer", path: "/map", icon: "🗺️" },
    { name: "The Archive", path: "/archive", icon: "📚" },
    { name: "The Underworld", path: "/dungeon", icon: "🗝️" },
    { name: "Theme Forge", path: "/forge", icon: "🎨" },
  ];
</script>

<div
  class="flex h-screen w-full bg-[var(--tavern-bg-base)] text-[var(--tavern-text-main)] font-sans selection:bg-[var(--tavern-accent-red)] selection:text-[var(--tavern-text-main)]"
>
  <!-- Sidebar -->
  <aside
    class="w-64 bg-[var(--tavern-bg-panel)] border-r border-[var(--tavern-accent-gold)]/20 flex flex-col items-center py-6 shadow-2xl z-10 hidden md:flex shrink-0"
  >
    <div class="mb-10 text-center px-4">
      <h1
        class="text-2xl font-serif text-[var(--tavern-accent-gold)] tracking-wider mb-2"
      >
        Tavern of Holding
      </h1>
      <div
        class="h-px w-3/4 mx-auto bg-gradient-to-r from-transparent via-[var(--tavern-accent-gold)]/50 to-transparent"
      ></div>
    </div>

    <nav class="w-full flex-1 px-4 space-y-2">
      {#each navItems as item}
        <button
          class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group text-left
                 {currentHash === item.path
            ? 'bg-[var(--tavern-accent-red)]/20 text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-red)]/50'
            : 'hover:bg-[var(--tavern-bg-base)]/50 text-[var(--tavern-text-main)]/80 hover:text-[var(--tavern-text-main)]'}"
          onclick={() => goTo(item.path)}
        >
          <span
            class="text-xl opacity-80 group-hover:opacity-100 transition-opacity"
            >{item.icon}</span
          >
          <span class="font-medium tracking-wide">{item.name}</span>
        </button>
      {/each}
    </nav>

    <div class="mt-auto px-6 w-full flex flex-col items-center">
      <div class="text-xs text-[var(--tavern-text-main)]/40 mb-4">
        v0.1.0 MVP
      </div>
    </div>
  </aside>

  <!-- Mobile Bottom Nav (Visible only on small screens) -->
  <nav
    class="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--tavern-bg-panel)] border-t border-[var(--tavern-accent-gold)]/20 flex justify-around p-2 z-50"
  >
    {#each navItems as item}
      <button
        class="flex flex-col items-center p-2 rounded-lg
               {currentHash === item.path
          ? 'text-[var(--tavern-accent-gold)]'
          : 'text-[var(--tavern-text-main)]/60'}"
        onclick={() => goTo(item.path)}
      >
        <span class="text-xl mb-1">{item.icon}</span>
        <span
          class="text-[0.6rem] font-medium tracking-wider uppercase opacity-80"
          >{item.name.split(" ")[1] || item.name}</span
        >
      </button>
    {/each}
  </nav>

  <!-- Main Content Area -->
  <main class="flex-1 overflow-y-auto relative pb-20 md:pb-0">
    <!-- Subtle background pattern overlay -->
    <div
      class="absolute inset-0 pointer-events-none opacity-[0.03]"
      style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f4ecd8\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"
    ></div>

    <div
      class="max-w-6xl mx-auto p-4 md:p-8 relative z-10 w-full min-h-full flex flex-col"
    >
      <!-- Slot for router component -->
      {@render children()}
    </div>
  </main>
</div>
