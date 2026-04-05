<script lang="ts">
    import type { Monster } from "../../types/models";
    import { pushChatMessage } from "../../core/sync/chatStore";

    let { monster } = $props<{ monster: Monster }>();

    function calculateModifier(score: number): string {
        const mod = Math.floor((score - 10) / 2);
        return mod >= 0 ? `+${mod}` : `${mod}`;
    }

    function injectRollSpans(desc: string, actionName: string) {
        // Match standard dice notation e.g. 1d6, 2d8 + 4
        const diceRegex = /(\d+d\d+(?:\s*[+-]\s*\d+)?)(?![^<]*>)/g;
        return desc.replace(diceRegex, (match) => {
            const cleanMatch = match.replace(/\s+/g, '');
            return `<span class="rollable-dice cursor-pointer text-red-800 font-bold hover:underline bg-red-100/50 rounded px-1 border border-red-800/20 shadow-sm" data-roll="${cleanMatch}" data-action="${actionName}" title="Click to roll!">${match}</span>`;
        });
    }

    function handleStatblockClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const diceSpan = target.closest('.rollable-dice') as HTMLElement;
        if (!diceSpan) return;

        const diceStr = diceSpan.dataset.roll;
        const actionName = diceSpan.dataset.action || "Action";

        if (diceStr) {
            const match = diceStr.match(/(\d+)d(\d+)(?:([+-])(\d+))?/);
            if (match) {
                const count = parseInt(match[1]);
                const sides = parseInt(match[2]);
                const sign = match[3];
                const mod = match[4] ? parseInt(match[4]) : 0;

                let total = 0;
                let rolls = [];
                for (let i = 0; i < count; i++) {
                    const r = Math.floor(Math.random() * sides) + 1;
                    rolls.push(r);
                    total += r;
                }

                if (sign && mod) {
                    if (sign === '+') total += mod;
                    else if (sign === '-') total -= mod;
                }

                const modStr = sign && mod ? ` ${sign} ${mod}` : '';
                const text = `uses ${actionName}! Rolls ${diceStr} ➔ [${rolls.join(', ')}]${modStr} = **${total}**`;
                
                pushChatMessage({
                    id: crypto.randomUUID(),
                    sender: monster.name,
                    text: text,
                    timestamp: Date.now(),
                    color: 'var(--tavern-accent-red)'
                });
            }
        }
    }
</script>

<div
    class="bg-[#fdf1dc] text-[#58180d] font-serif border-[5px] border-[var(--tavern-accent-gold-bright)] rounded-sm p-4 shadow-xl max-w-sm w-full mx-auto relative overflow-hidden"
>
    <!-- Texture overlay for parchment feel -->
    <div
        class="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"
    ></div>

    <div class="relative z-10">
        <!-- Header -->
        <h1
            class="font-serif text-3xl font-bold tracking-wider mb-1 text-[#58180d]"
        >
            {monster.name}
        </h1>
        <p class="italic text-sm text-[#000] mb-2">
            {monster.size}
            {monster.type}, {monster.alignment}
        </p>

        <hr class="border-t-2 border-[#922610] mb-2" />

        <!-- Core Stats -->
        <div class="text-[#000] text-sm leading-snug mb-2">
            <div>
                <span class="font-bold text-[#58180d]">Armor Class</span>
                {monster.ac}
                {monster.acType ? `(${monster.acType})` : ""}
            </div>
            <div>
                <span class="font-bold text-[#58180d]">Hit Points</span>
                {monster.hp}
                {monster.hpDice ? `(${monster.hpDice})` : ""}
            </div>
            <div>
                <span class="font-bold text-[#58180d]">Speed</span>
                {monster.speed}
            </div>
        </div>

        <hr class="border-t-2 border-[#922610] mb-2" />

        <!-- Ability Scores -->
        <div class="grid grid-cols-6 text-center text-[#58180d] mb-2">
            <div>
                <div class="font-bold text-xs">STR</div>
                <div class="text-sm">
                    {monster.stats.str} ({calculateModifier(monster.stats.str)})
                </div>
            </div>
            <div>
                <div class="font-bold text-xs">DEX</div>
                <div class="text-sm">
                    {monster.stats.dex} ({calculateModifier(monster.stats.dex)})
                </div>
            </div>
            <div>
                <div class="font-bold text-xs">CON</div>
                <div class="text-sm">
                    {monster.stats.con} ({calculateModifier(monster.stats.con)})
                </div>
            </div>
            <div>
                <div class="font-bold text-xs">INT</div>
                <div class="text-sm">
                    {monster.stats.int} ({calculateModifier(monster.stats.int)})
                </div>
            </div>
            <div>
                <div class="font-bold text-xs">WIS</div>
                <div class="text-sm">
                    {monster.stats.wis} ({calculateModifier(monster.stats.wis)})
                </div>
            </div>
            <div>
                <div class="font-bold text-xs">CHA</div>
                <div class="text-sm">
                    {monster.stats.cha} ({calculateModifier(monster.stats.cha)})
                </div>
            </div>
        </div>

        <hr class="border-t-2 border-[#922610] mb-2" />

        <!-- Attributes -->
        <div class="text-[#000] text-sm leading-snug mb-2">
            {#if monster.skills}<div class="mb-0.5">
                    <span class="font-bold text-[#58180d]">Skills</span>
                    {monster.skills}
                </div>{/if}
            {#if monster.senses}<div class="mb-0.5">
                    <span class="font-bold text-[#58180d]">Senses</span>
                    {monster.senses}
                </div>{/if}
            {#if monster.languages}<div class="mb-0.5">
                    <span class="font-bold text-[#58180d]">Languages</span>
                    {monster.languages}
                </div>{/if}
            <div>
                <span class="font-bold text-[#58180d]">Challenge</span>
                {monster.cr}
            </div>
        </div>

        <hr class="border-t-2 border-[#922610] mb-3" />

        <!-- Traits -->
        {#if monster.traits && monster.traits.length > 0}
            <div class="space-y-2 mb-4 text-[#000] text-sm leading-snug">
                {#each monster.traits as trait}
                    <p>
                        <span class="font-bold italic text-[#58180d]"
                            >{trait.name}.</span
                        >
                        {@html trait.desc}
                    </p>
                {/each}
            </div>
        {/if}

        <!-- Actions -->
        {#if monster.actions && monster.actions.length > 0}
            <h2
                class="text-2xl font-serif text-[#58180d] border-b border-[#922610] pb-1 mb-2"
            >
                Actions
            </h2>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="space-y-2 mb-4 text-[#000] text-sm leading-snug" onclick={handleStatblockClick}>
                {#each monster.actions as action}
                    <p>
                        <span class="font-bold italic text-[#58180d]"
                            >{action.name}.</span
                        >
                        {@html injectRollSpans(action.desc, action.name)}
                    </p>
                {/each}
            </div>
        {/if}
    </div>
</div>
