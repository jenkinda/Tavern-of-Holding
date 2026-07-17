# Tavern of Holding – Comprehensive Audit & Project Ecosystem Notes

## 1. High-Level Concept & Core Architecture
**Tavern of Holding** is an offline-first, Virtual Tabletop (VTT)/Campaign Management application designed to run entirely locally in the browser. It bypasses server maintenance dependencies by leaning heavily into modern robust browser-storage tools, operating entirely as a Progressive Web App (PWA).

### Technical Stack
- **Framework:** Svelte 5 (leveraging Vite for modern compilation and HMR).
- **Styling:** TailwindCSS v4 with robust custom CSS variables (`var(--tavern-bg-base)`, etc.) enabling dynamic theming.
- **Storage:** Offline-first architecture backed by IndexedDB (via the `idb` wrapper). Data structures are managed functionally within Svelte stores.
- **Networking/Syncing:** PeerJS handling P2P WebRTC tunnels. This replaces complex BaaS REST APIs by beaming massive serialized JSON states directly across encrypted DataChannels between hosts and players.
- **Packaging:** JSZip for serializing the entire campaign object into downloadable blob blobs.
- **Text Rendering:** Fully featured markdown parser (`marked`) with custom bidirectional linking rules.

---

## 2. Feature Modules Breakdown

1. **The Common Room (`campaigns`)**
   - The primary routing hub where Campaigns and discrete Sessions are actively managed.
   - Handles the entire P2P data synchronization loop (Nexus Hosting/Pulling) to bypass local memory limits across devices.
   
2. **Lore & Ledger (`notes`)**
   - A fully functional Markdown-powered wiki for the dungeon master. 
   - Features robust tagging logic and bi-directional linking syntaxes (e.g., `[[Castle Highgard]]`) to automatically interconnect narrative plot threads efficiently.

3. **The Loom (`loom`)**
   - Faction and timeline worldbuilding repository.
   - Built for deep visualizations (like the "Web of Fate" graph diagram) connecting disparate world elements chronologically or socially.

4. **The Bestiary (`bestiary`)**
   - Encyclopedic system tracking monster lore, stat blocks, HP, and automated loot assignment drops.

5. **The Fray (`combat`)**
   - Active encounter management.
   - Tracks initiative dynamically, lists active turns visually, and supports live arithmetic for damage/healing applications to avoid cross-referencing complex math mid-session.

6. **The Oracle (`generators`)**
   - A dynamic set of procedurally generated probability tables.
   - Drives instant NPC generation (names, traits), rich localized loot drops based on defined weightings, and advanced Dice rolling calculation outputs.

7. **Cartographer (`maps`)**
   - Interactive visual battle maps supporting local browser file loading.
   - Contains algorithmic drag-and-drop web-tokens and simplistic fog-of-war layers for basic visualization without over-engineering complex lighting.

8. **The Underworld (`dungeon`)**
   - Dedicated algorithmic procedural generator layout engine outputting instant viable dungeon architectures.

9. **Player View (`player`)**
   - A stripped-down, simplified UI specifically aimed at players connected via PeerJS endpoints so they solely see their relevant combat metrics, rolling options, and shared visual maps.

10. **Bard's Corner (`soundboard`)**
    - Instant-audio soundboarding interface to cue ambiance, attack SFX, and environmental context easily.

11. **Theme Forge (`settings`)**
    - Central visual aesthetic command center. Modifies the underlying structural CSS DOM tokens universally across all modules.

12. **The Archive (`archive`)**
    - The structural reference repository tracking system.

---

## 3. Project Documentation Notes (`tavern-of-holding` directory)

### A. `qa-script.md`
This is the QA Playbook representing the manual sanity-check testing process. It spans 7 structured integration vectors:
- Validating true PWA Cache persistence under "Offline Network" dev environments.
- Enforcing IndexedDB persistence handling upon page reloads in The Common Room.
- Bi-directional Markdown parsing tests to assert custom `[[Brackets]]` compile safely in Lore & Ledger.
- Stress-testing array-sorting mechanics and reactive HP updating in The Fray.
- Dice math formulation verification in The Oracle.
- Checking XY cartesian permanence metrics for virtual tokens located on the canvas inside Cartographer.
- Complete File I/O simulation using JSZip backups vs Cloud node transfers.

### B. `README.md`
Standard Vite templating notes detailing the philosophy of the Svelte structural decisions:
- Specifies the project avoids SvelteKit natively given routing constraints.
- Explicit highlights on why Hot Module Reloading (HMR) state preservation is intentionally disabled by default (`svelte-hmr`) to prevent silent `$state` corruptions when building complex external data models.

---

## 4. The Collaborative Agent Ecosystem Notes

The parent project folder contains 8 specific AI persona prompts designed as a cohesive ecosystem of subagents. These files clearly define responsibilities, input constraints, and strict output requirements for specialized AI tasks:

1. **Architect** (`Architect subagent.md`) 
   - **Role:** System design, stack optimization, and entity mapping.
   - **Notes:** Dictates boundaries for how features interconnect (Campaign, Session, NPC, Encounter entities). Preventative agent that enforces the local-first, serverless limitations when deciding on tech stacks.

2. **Copy Bard** (`Copy Bard subagent.md`)
   - **Role:** Voice, UI copy, and user clarity.
   - **Notes:** Driven to write friendly, whimsical text avoiding hardcore tabletop jargon. Acts as the stylistic UX writer managing error states or tooltips to maintain the "Tavern" atmosphere.

3. **Frontend Smith** (`Frontend Smith subagent.md`) 
   - **Role:** UI execution and structural component architecture.
   - **Notes:** Translates the Architect's models and the Bard's text into React/Svelte components. Strictly mandated to handle responsive CSS breakpoints and foundational accessibility wrappers (ARIA).

4. **Generator Keeper** (`Generator Keeper subagent.md`) 
   - **Role:** Specialized Randomness integration.
   - **Notes:** Crafts the JSON schemas governing weighted probability tables. Instructed to keep content fully original (to avoid IP copyright issues) and abstract generation functionality to scale easily to diverse categories.

5. **Map Cartographer** (`Map Cartographer subagent.md`)
   - **Role:** Specialized VTT interaction functionality.
   - **Notes:** Focused purely on `canvas` behaviors, coordinate states on web tokens, drag/drop interactions, zoom states, and the visibility logic required for fog-of-war.

6. **Product DM** (`Product DM subagent.md`)
   - **Role:** Project Manager, from a working dungeon master's perspective.
   - **Notes:** Controls scope creep heavily. Prioritizes the MVP backlog, distinguishing between what genuinely aids live session flow versus bloated nice-to-have visual features.

7. **QA Familiar** (`QA Familiar subagent.md`)
   - **Role:** Regression safety and test suite architecture.
   - **Notes:** Converts module structures into Given/When/Then acceptance criteria. Specifically outlines automated matrices within Playwright or Jest to protect the ecosystem as new features deploy.

8. **Rules Scribe** (`Rules Scribe subagent.md`)
   - **Role:** Game-mechanics encoding logic.
   - **Notes:** Strictly handles the functional purity of game logic like calculating condition drops, HP floors, and initiative iteration indexing. Maintains system-agnostic math arrays so the app behaves sensibly without being bound explicitly to 5e or PF2 logic constraints.
