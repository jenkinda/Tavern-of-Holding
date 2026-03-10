<script lang="ts">
  import { onMount } from "svelte";
  import Layout from "./lib/core/components/Layout.svelte";
  import Placeholder from "./lib/core/components/Placeholder.svelte";
  import CampaignHub from "./lib/modules/campaigns/CampaignHub.svelte";
  import NoteEditor from "./lib/modules/notes/NoteEditor.svelte";
  import InitiativeTracker from "./lib/modules/combat/InitiativeTracker.svelte";
  import Bestiary from "./lib/modules/bestiary/Bestiary.svelte";
  import Soundboard from "./lib/modules/soundboard/Soundboard.svelte";
  import RollUI from "./lib/modules/generators/RollUI.svelte";
  import MapBoard from "./lib/modules/maps/MapBoard.svelte";
  import TheLoom from "./lib/modules/loom/TheLoom.svelte";
  import TheArchive from "./lib/modules/archive/TheArchive.svelte";
  import TheUnderworld from "./lib/modules/dungeon/TheUnderworld.svelte";
  import PlayerView from "./lib/modules/player/PlayerView.svelte";
  import ThemeForge from "./lib/modules/settings/ThemeForge.svelte";

  let currentHash = $state("");

  onMount(() => {
    // Apply Theme on Initial Boot
    const saved = localStorage.getItem("tavern-theme-v1");
    if (saved) {
      try {
        const theme = JSON.parse(saved);
        for (const [key, value] of Object.entries(theme)) {
          document.documentElement.style.setProperty(key, value as string);
        }
      } catch (e) {}
    }

    const updateHash = () => {
      const hash = window.location.hash.slice(1);
      currentHash = hash || "/";
    };
    window.addEventListener("hashchange", updateHash);
    updateHash();
    return () => window.removeEventListener("hashchange", updateHash);
  });
</script>

<svelte:head>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap");
  </style>
</svelte:head>

{#if currentHash === "/player"}
  <PlayerView />
{:else}
  <Layout {currentHash}>
    {#if currentHash === "/"}
      <CampaignHub />
    {:else if currentHash === "/notes"}
      <NoteEditor />
    {:else if currentHash === "/bestiary"}
      <Bestiary />
    {:else if currentHash === "/soundboard"}
      <Soundboard />
    {:else if currentHash === "/forge"}
      <ThemeForge />
    {:else if currentHash === "/combat"}
      <InitiativeTracker />
    {:else if currentHash === "/generators"}
      <RollUI />
    {:else if currentHash === "/loom"}
      <TheLoom />
    {:else if currentHash === "/archive"}
      <TheArchive />
    {:else if currentHash === "/dungeon"}
      <TheUnderworld />
    {:else if currentHash === "/map"}
      <MapBoard />
    {:else}
      <Placeholder title="Lost in the Woods (404)" />
    {/if}
  </Layout>
{/if}
