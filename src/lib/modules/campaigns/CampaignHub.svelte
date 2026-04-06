<script lang="ts">
    import { onMount } from "svelte";
    import {
        campaignStore,
        sessionStore,
        loadCampaigns,
        createTreeOfLife,
        removeCampaign,
        setActiveCampaign,
        createSession,
        removeSession,
        setActiveSession,
    } from "./stores";
    import { startHosting, stopHosting } from "../../core/sync/peerHost";
    import QRCode from "qrcode";
    import {
        exportCampaignData,
        importCampaignData,
        downloadJsonFile,
    } from "../../core/storage/transfer";
    import { pushToCloud, pullFromCloud, updateCloud } from "../../core/storage/cloud";

    let importInput: HTMLInputElement;

    let newCampaignName = $state("");
    let newSessionName = $state("");

    async function handleExport(campaignId: string, campaignName: string) {
        try {
            const json = await exportCampaignData(campaignId);
            const slug = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            downloadJsonFile(json, `campaign-${slug}.json`);
        } catch (e) {
            console.error(e);
            alert("Export failed");
        }
    }

    async function handleImport(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const content = ev.target?.result as string;
                await importCampaignData(content);
                await loadCampaigns();
                alert("Import successful!");
            } catch (err) {
                console.error(err);
                alert("Import failed. Invalid file format.");
            }
            if (importInput) importInput.value = "";
        };
        reader.readAsText(file);
    }

    let cloudToken = $state("");
    let isCloudLoading = $state(false);

    async function handlePushCloud(campaignId: string) {
        isCloudLoading = true;
        try {
            const json = await exportCampaignData(campaignId);
            if (cloudToken) {
                await updateCloud(cloudToken, json);
                alert("Successfully pushed updates to Cloud Node!");
            } else {
                cloudToken = await pushToCloud(json);
                alert(`Successfully created Cloud Node! Your Host Token is: ${cloudToken}\n\nSave this token to load this campaign elsewhere.`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Cloud push failed: ${e.message}`);
        }
        isCloudLoading = false;
    }

    async function handlePullCloud() {
        if (!cloudToken) return alert("Enter a Host Token first to pull data.");
        isCloudLoading = true;
        try {
            const json = await pullFromCloud(cloudToken);
            await importCampaignData(json);
            await loadCampaigns();
            alert("Successfully pulled and merged from Cloud Node!");
        } catch (e: any) {
            console.error(e);
            alert(`Cloud pull failed: ${e.message}`);
        }
        isCloudLoading = false;
    }

    onMount(() => {
        loadCampaigns();
    });

    function handleCreateCampaign() {
        if (!newCampaignName.trim()) return;
        createTreeOfLife(newCampaignName.trim());
        newCampaignName = "";
    }

    function handleCreateSession() {
        if (!newSessionName.trim() || !$campaignStore.activeCampaignId) return;
        createSession($campaignStore.activeCampaignId, newSessionName.trim());
        newSessionName = "";
    }

    function formatDate(ms: number) {
        return new Date(ms).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    let hostCode = $state<string | null>(null);
    let hostStatus = $state("Not hosting.");

    function toggleHost() {
        if (hostCode) {
            stopHosting();
            hostCode = null;
            hostStatus = "Not hosting.";
        } else {
            hostStatus = "Generating code...";
            hostCode = startHosting(
                (code) => {
                    hostStatus = "Hosting active.";
                    // The peerHost module auto prepends 'TOH-', we can just display the bare code part usually,
                    // but we return the full hostId from startHosting.
                    // Wait, startHosting is synchronous returning the prefix ID!
                },
                (msg) => {
                    hostStatus = msg;
                },
            );
        }
    }

    function qrCodeAction(node: HTMLCanvasElement, text: string) {
        if (text) {
            QRCode.toCanvas(node, text, {
                width: 100,
                margin: 1,
                color: { dark: "#1e293b", light: "#fae8b0" }, // #fae8b0 is similar to our light gold/bg
            });
        }
        return {
            update(newText: string) {
                if (newText) {
                    QRCode.toCanvas(node, newText, {
                        width: 100,
                        margin: 1,
                        color: { dark: "#1e293b", light: "#fae8b0" },
                    });
                }
            },
        };
    }
</script>

<div class="space-y-8 animate-in fade-in duration-500">
    <!-- Header -->
    <header
        class="border-b border-[var(--tavern-accent-gold)]/20 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
    >
        <div>
            <h1
                class="text-4xl font-serif text-[var(--tavern-accent-gold)] mb-2 tracking-wide"
            >
                The Common Room
            </h1>
            <p class="text-[var(--tavern-text-main)]/60">
                Manage your campaigns, sessions, and overall progress.
            </p>
        </div>
        <div
            class="flex items-center gap-4 bg-[var(--tavern-bg-base)] p-3 rounded-xl border border-[var(--tavern-accent-gold)]/20"
        >
            <input
                type="file"
                accept=".json"
                class="hidden"
                bind:this={importInput}
                onchange={handleImport}
            />
            <button
                onclick={() => importInput.click()}
                class="px-3 py-1.5 rounded font-medium text-xs transition-colors border bg-[var(--tavern-bg-panel)] text-[var(--tavern-accent-gold)] border-[var(--tavern-accent-gold)]/30 hover:bg-[var(--tavern-accent-gold)]/10"
                title="Import Dashboard"
            >
                Import Campaign
            </button>
            <div>
                <div
                    class="text-xs text-[var(--tavern-text-main)]/40 uppercase tracking-widest mb-1"
                >
                    Nexus Sync
                </div>
                {#if hostCode}
                    <div class="flex items-center gap-3">
                        <div>
                            <div
                                class="font-mono text-xl text-green-400 font-bold tracking-widest"
                            >
                                {hostCode.split("-")[1]}
                            </div>
                            <div
                                class="text-[0.65rem] text-[var(--tavern-text-main)]/60"
                            >
                                {hostStatus}
                            </div>
                        </div>
                        <canvas
                            use:qrCodeAction={`https://tavern-of-holding.com/#/player?code=${hostCode.split("-")[1]}`}
                            class="rounded-md border border-[var(--tavern-accent-gold)]/30"
                            title="Scan with phone to join"
                        ></canvas>
                    </div>
                {:else}
                    <div
                        class="text-sm text-[var(--tavern-text-main)]/60 font-medium"
                    >
                        Offline
                    </div>
                {/if}
            </div>
            <button
                onclick={toggleHost}
                class="px-4 py-2 rounded font-medium text-sm transition-colors border {hostCode
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                    : 'bg-[var(--tavern-accent-gold)]/20 text-[var(--tavern-accent-gold)] border-[var(--tavern-accent-gold)]/30 hover:bg-[var(--tavern-accent-gold)]/30'}"
            >
                {hostCode ? "Stop Hosting" : "Host Session"}
            </button>
        </div>
    </header>

    {#if $campaignStore.loading}
        <div
            class="flex justify-center p-12 text-[var(--tavern-accent-gold)]/50"
        >
            <span class="animate-pulse">Consulting the ledger...</span>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Campaigns Column -->
            <section
                class="lg:col-span-1 bg-[var(--tavern-bg-panel)] rounded-xl p-5 border border-[var(--tavern-accent-gold)]/10 shadow-lg"
            >
                <h2
                    class="text-xl font-serif text-[var(--tavern-accent-gold)] border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4"
                >
                    My Campaigns
                </h2>

                <form
                    class="flex gap-2 mb-4"
                    onsubmit={(e) => {
                        e.preventDefault();
                        handleCreateCampaign();
                    }}
                >
                    <input
                        type="text"
                        bind:value={newCampaignName}
                        placeholder="New Campaign Name..."
                        class="flex-1 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--tavern-accent-gold)] transition-colors"
                    />
                    <button
                        type="submit"
                        class="bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-3 py-2 rounded text-sm transition-colors"
                        >+</button
                    >
                </form>

                {#if $campaignStore.campaigns.length === 0}
                    <div
                        class="text-center py-8 text-[var(--tavern-text-main)]/40 text-sm italic"
                    >
                        No campaigns yet. Pull up a chair and start one!
                    </div>
                {:else}
                    <ul class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {#each $campaignStore.campaigns as campaign (campaign.id)}
                            <li class="flex items-center justify-between group">
                                <button
                                    class="flex-1 text-left px-3 py-2 rounded-lg transition-colors
                         {$campaignStore.activeCampaignId === campaign.id
                                        ? 'bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 text-[var(--tavern-accent-gold)]'
                                        : 'hover:bg-[var(--tavern-bg-base)]/50 text-[var(--tavern-text-main)]/80'}"
                                    onclick={() =>
                                        setActiveCampaign(campaign.id)}
                                >
                                    <div class="font-medium truncate">
                                        {campaign.name}
                                    </div>
                                    <div
                                        class="text-[0.65rem] opacity-50 uppercase tracking-widest mt-0.5"
                                    >
                                        {formatDate(campaign.createdAt)}
                                    </div>
                                </button>
                                <button
                                    class="opacity-0 group-hover:opacity-100 p-2 text-[var(--tavern-accent-gold)] hover:text-white transition-opacity shrink-0"
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        handleExport(
                                            campaign.id,
                                            campaign.name,
                                        );
                                    }}
                                    title="Export Campaign">📤</button
                                >
                                <button
                                    class="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-300 transition-opacity ml-1 shrink-0"
                                    onclick={() => {
                                        if (
                                            confirm(
                                                "Delete campaign and all its sessions?",
                                            )
                                        )
                                            removeCampaign(campaign.id);
                                    }}
                                    title="Delete Campaign">✕</button
                                >
                            </li>
                        {/each}
                    </ul>
                {/if}

                <!-- Cloud Sync Panel -->
                {#if $campaignStore.activeCampaignId}
                    <div class="mt-6 bg-[var(--tavern-bg-base)] rounded-xl border border-[var(--tavern-accent-gold)]/30 p-4 shadow-inner animate-in slide-in-from-bottom-2">
                        <h3 class="text-sm font-serif text-[var(--tavern-accent-gold)] tracking-widest uppercase mb-1">Cloud Database (BaaS)</h3>
                        <p class="text-[0.65rem] text-[var(--tavern-text-main)]/60 mb-3 leading-tight opacity-80">Backup/Sync this campaign via JSONBlob Node (Fixed headers).</p>
                        
                        <input 
                            type="text" 
                            bind:value={cloudToken} 
                            placeholder="Host Token (Leave blank to generate)" 
                            class="w-full bg-[var(--tavern-bg-panel)] border border-[var(--tavern-accent-gold)]/40 rounded px-2 py-1.5 text-xs text-[var(--tavern-text-main)] font-mono mb-3 focus:outline-none focus:border-[var(--tavern-accent-gold)] transition-colors"
                        />
                        
                        <div class="flex gap-2">
                            <button 
                                onclick={() => handlePushCloud($campaignStore.activeCampaignId!)} 
                                class="flex-1 bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-2 py-1.5 rounded text-xs transition-all font-medium shadow {isCloudLoading ? 'opacity-50 cursor-not-allowed' : ''}" 
                                disabled={isCloudLoading}
                            >
                                {isCloudLoading ? 'Syncing...' : 'Push to Cloud'}
                            </button>
                            <button 
                                onclick={handlePullCloud} 
                                class="flex-1 bg-[var(--tavern-bg-panel)] hover:bg-[var(--tavern-bg-base)] text-[var(--tavern-accent-gold)] border border-[var(--tavern-accent-gold)]/40 px-2 py-1.5 rounded text-xs transition-all font-medium shadow {isCloudLoading ? 'opacity-50 cursor-not-allowed' : ''}" 
                                disabled={isCloudLoading}
                            >
                                Pull & Merge
                            </button>
                        </div>
                    </div>
                {/if}
            </section>

            <!-- Sessions Column -->
            <section class="lg:col-span-2">
                {#if !$campaignStore.activeCampaignId}
                    <div
                        class="h-full bg-[var(--tavern-bg-panel)]/50 rounded-xl border border-[var(--tavern-accent-gold)]/5 border-dashed flex items-center justify-center p-12 text-[var(--tavern-text-main)]/40 text-center"
                    >
                        Select or create a campaign to view its active sessions.
                    </div>
                {:else}
                    <div
                        class="bg-[var(--tavern-bg-panel)] rounded-xl p-5 border border-[var(--tavern-accent-gold)]/10 shadow-lg h-full flex flex-col"
                    >
                        <h2
                            class="text-xl font-serif text-[var(--tavern-accent-gold)] border-b border-[var(--tavern-accent-gold)]/20 pb-2 mb-4 flex justify-between items-center"
                        >
                            <span>Sessions Log</span>
                            <span
                                class="text-xs font-sans text-[var(--tavern-text-main)]/50 uppercase tracking-widest font-normal"
                                >Active Campaign</span
                            >
                        </h2>

                        <form
                            class="flex gap-2 mb-6"
                            onsubmit={(e) => {
                                e.preventDefault();
                                handleCreateSession();
                            }}
                        >
                            <input
                                type="text"
                                bind:value={newSessionName}
                                placeholder="Name new session (e.g., Session 14: The Dragon's Lair)..."
                                class="flex-1 bg-[var(--tavern-bg-base)] border border-[var(--tavern-accent-gold)]/30 rounded px-3 py-2 focus:outline-none focus:border-[var(--tavern-accent-gold)] transition-colors"
                            />
                            <button
                                type="submit"
                                class="bg-[var(--tavern-accent-red)] hover:bg-[var(--tavern-accent-red-hover)] text-white px-4 py-2 rounded transition-colors text-sm font-medium"
                                >Record Session</button
                            >
                        </form>

                        <div class="flex-1 overflow-y-auto pr-2">
                            {#if $sessionStore.loading}
                                <div
                                    class="text-center py-8 text-[var(--tavern-accent-gold)]/50 animate-pulse"
                                >
                                    Loading sessions...
                                </div>
                            {:else if $sessionStore.sessions.length === 0}
                                <div
                                    class="text-center py-12 text-[var(--tavern-text-main)]/40 text-sm italic"
                                >
                                    No sessions recorded for this campaign.
                                </div>
                            {:else}
                                <div
                                    class="grid grid-cols-1 md:grid-cols-2 gap-4"
                                >
                                    {#each $sessionStore.sessions as session (session.id)}
                                        <div
                                            class="text-left bg-[var(--tavern-bg-base)] p-4 rounded-lg border transition-all duration-200 relative group cursor-pointer
                             {$sessionStore.activeSessionId === session.id
                                                ? 'border-[var(--tavern-accent-gold)] shadow-[0_0_15px_rgba(198,162,91,0.1)]'
                                                : 'border-[var(--tavern-accent-gold)]/10 hover:border-[var(--tavern-accent-gold)]/40'}"
                                            onclick={() =>
                                                setActiveSession(session.id)}
                                            onkeydown={(e) => {
                                                if (e.key === "Enter")
                                                    setActiveSession(
                                                        session.id,
                                                    );
                                            }}
                                            role="button"
                                            tabindex="0"
                                        >
                                            <h3
                                                class="font-medium text-lg text-[var(--tavern-text-main)] break-words pr-6 leading-tight mb-2"
                                            >
                                                {session.name}
                                            </h3>
                                            <div
                                                class="flex items-center text-[var(--tavern-accent-gold)]/60 text-xs"
                                            >
                                                <span class="mr-2">📅</span>
                                                {formatDate(session.date)}
                                            </div>

                                            <button
                                                class="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 text-[var(--tavern-text-main)]/40 transition-all rounded"
                                                onclick={(e) => {
                                                    e.stopPropagation();
                                                    if (
                                                        confirm(
                                                            "Delete this session?",
                                                        )
                                                    )
                                                        removeSession(
                                                            session.id,
                                                        );
                                                }}
                                                title="Delete Session">✕</button
                                            >
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </section>
        </div>
    {/if}
</div>
