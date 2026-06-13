<script lang="ts">
	import { planCover, coverColor, COVER_CONFIG } from '$lib/covers';
	import { SvelteSet } from 'svelte/reactivity';

	interface Props {
		name: string;
		thumbnailUrl?: string | null;
		coverThumbnails?: string[] | null;
	}

	let { name, thumbnailUrl = null, coverThumbnails = null }: Props = $props();

	// Indices of tiles (or the hero) that failed to load.
	const failed = new SvelteSet<number>();

	const plan = $derived(planCover({ name, thumbnailUrl, coverThumbnails }));
	const tint = $derived(coverColor(name));

	// A mosaic with several dead tiles looks patchy: if more than half fail,
	// drop to the full tint instead.
	const mosaicTooBroken = $derived(plan.kind === 'mosaic' && failed.size > 2);
	// If the single hero thumbnail fails, fall back to the tinted placeholder.
	const heroFailed = $derived(plan.kind === 'hero' && failed.has(0));

	function markFailed(i: number) {
		failed.add(i);
	}
</script>

{#snippet tintLayer()}
	<div
		class="cover-tint"
		aria-hidden="true"
		style:background-color={tint}
		style:mix-blend-mode={COVER_CONFIG.tintBlendMode}
		style:opacity={COVER_CONFIG.tintStrength}
	></div>
{/snippet}

{#snippet tintCover()}
	<img
		class="cover-fill"
		src={COVER_CONFIG.placeholderSrc}
		alt=""
		aria-hidden="true"
		loading="lazy"
	/>
	{@render tintLayer()}
{/snippet}

<div class="cover">
	{#if plan.kind === 'custom'}
		<img class="cover-fill" src={plan.src} alt={name} loading="lazy" />
	{:else if plan.kind === 'tint' || heroFailed || mosaicTooBroken}
		{@render tintCover()}
	{:else if plan.kind === 'hero'}
		<img
			class="cover-fill"
			src={plan.src}
			alt={name}
			loading="lazy"
			onerror={() => markFailed(0)}
		/>
	{:else}
		<!-- mosaic: 2x2 grid; a tile that fails becomes a tint-colored cell -->
		<div class="cover-mosaic">
			{#each plan.srcs as src, i (i)}
				{#if failed.has(i)}
					<div class="cover-mosaic-cell" style:background-color={tint}></div>
				{:else}
					<img
						class="cover-fill"
						{src}
						alt=""
						aria-hidden="true"
						loading="lazy"
						onerror={() => markFailed(i)}
					/>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		isolation: isolate;
	}

	.cover-fill {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cover-tint {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.cover-mosaic {
		position: absolute;
		inset: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		gap: 2px;
	}

	.cover-mosaic-cell {
		width: 100%;
		height: 100%;
	}
</style>
