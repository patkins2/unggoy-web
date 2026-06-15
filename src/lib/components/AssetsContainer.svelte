<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { BrowseData } from '$lib/api';
	import { getAssetCardGroups } from '$lib/functions';
	import AssetCard from './AssetCard.svelte';
	import MobileAssetCard from './MobileAssetCard.svelte';
	import SkeletonAssetsContainer from './SkeletonAssetsContainer.svelte';
	import { addAssetModal, playlistModal, inlineBrowsePairingModal, addToPlaylistModal } from '../../stores/modal';
	import FilterModal from '$lib/components/FilterModal.svelte';
	import { SortOrder, Filter } from './icons';
	import { currentPage } from '$lib/assets/js/store';
	import { navigating } from '$app/stores';
	import { user } from '../../stores/user';
	import { onMount } from 'svelte';

	const PAGE_SIZE_OPTIONS = [10, 20, 30];
	const PAGE_SIZE_STORAGE_KEY = 'unggoy:browse-page-size';
	const PAGE_SIZE_PATHS = ['/browse', '/browse/playlist', '/playlist/me', '/playlist/favorites'];

	let filterModal: FilterModal;
	interface Props {
		browseData: BrowseData;
		filterTitle?: string;
	}

	let { browseData, filterTitle }: Props = $props();

	const resolvePageSize = (value: number | undefined) =>
		value && PAGE_SIZE_OPTIONS.includes(value) ? value : 20;

	// Subscribe to modal stores once at parent level using Svelte 5 runes
	const addAssetModalVar = $derived($addAssetModal);
	const playlistModalVar = $derived($playlistModal);
	const inlineBrowsePairingModalVar = $derived($inlineBrowsePairingModal);
	const addToPlaylistModalVar = $derived($addToPlaylistModal);
	const activeUser = $derived($user);
	const showPageSizeSelector = $derived(PAGE_SIZE_PATHS.includes($page.url.pathname));
	let selectedPageSize = $state<number>(resolvePageSize(browseData.selectedPageSize ?? browseData.pageSize));

	// Mobile detection
	let isMobile = $state(false);

	function checkMobile() {
		isMobile = window.innerWidth <= 769;
	}
	
	// Debouncing for URL updates
	let updateTimer: number;
	
	// Cache URLSearchParams to avoid recreation using Svelte 5 runes
	const cachedSearchParams = $derived(new URLSearchParams($page.url.searchParams.toString()));

	const changePage = (newPage: number) => {
		// Clamp the new page number between 1 and totalPages
		const clampedPage = Math.max(1, Math.min(newPage, browseData.totalPages));

		// Only update if the page has changed
		if (clampedPage !== browseData.currentPage) {
			const query = new URLSearchParams(cachedSearchParams);
			query.set('page', clampedPage.toString());
			if (showPageSizeSelector) {
				query.set('count', selectedPageSize.toString());
			}
			goto(`?${query.toString()}`);
		}
	};

	const updatePageSize = () => {
		if (!showPageSizeSelector) {
			return;
		}

		const parsedPageSize = parseInt(selectedPageSize.toString(), 10);
		selectedPageSize = resolvePageSize(parsedPageSize);

		localStorage.setItem(PAGE_SIZE_STORAGE_KEY, selectedPageSize.toString());

		const query = new URLSearchParams(cachedSearchParams);
		query.set('count', selectedPageSize.toString());
		query.delete('page');

		goto(`?${query.toString()}`);
	};

	const updateSortOrder = () => {
		browseData.order = browseData.order === 'desc' ? 'asc' : 'desc';
		updateUrl();
	};
	const debouncedUpdateUrl = () => {
		clearTimeout(updateTimer);
		updateTimer = setTimeout(updateUrl, 300);
	};
	
	const updateUrl = () => {
		let query = new URLSearchParams(cachedSearchParams);
		// const query = new URLSearchParams();

		const defaultValues = {
			assetKind: '',
			gamertag: '',
			sort: 'publishedAt',
			order: 'desc',
			ownerOnly: false,
			hide343Assets: false
		};

		const filterParams = {
			assetKind: browseData.filter,
			tags: browseData.tag,
			gamertag: browseData.gamertag,
			sort: browseData.sort,
			order: browseData.order,
			ownerOnly: browseData.gamertag ? browseData.ownerOnly : undefined,
			hide343Assets: browseData.hide343Assets
		};

		// Add parameters that have been explicitly set and differ from defaults
		for (const [key, value] of Object.entries(filterParams)) {
			if (value !== undefined && value !== '' && value !== defaultValues[key]) {
				query.set(key, typeof value === 'string' ? value : value.toString());
			} else {
				query.delete(key);
			}
		}

		if (showPageSizeSelector) {
			query.set('count', selectedPageSize.toString());
		}

		// Rset page to 1 when filters change
		query.delete('page');

		goto(`?${query.toString()}`);
	};

	async function loadModal() {
		try {
			let data = await filterModal.create({
				sort: browseData.sort,
				order: browseData.order,
				filter: browseData.filter,
				gamertag: browseData.gamertag,
				ownerOnly: browseData.ownerOnly,
				hide343Assets: browseData.hide343Assets,
				tag: browseData.tag
			});
			browseData = { ...browseData, ...data };
			updateUrl();
		} catch {}
	}

	onMount(() => {
		checkMobile();

		if (showPageSizeSelector) {
			const rawCount = $page.url.searchParams.get('count');
			const urlPageSize = parseInt(rawCount || '', 10);

			if (!rawCount) {
				const savedPageSize = parseInt(localStorage.getItem(PAGE_SIZE_STORAGE_KEY) || '', 10);
				if (PAGE_SIZE_OPTIONS.includes(savedPageSize)) {
					selectedPageSize = savedPageSize;
					const query = new URLSearchParams($page.url.searchParams.toString());
					query.set('count', savedPageSize.toString());
					query.delete('page');
					goto(`?${query.toString()}`, { replaceState: true, noScroll: true, keepFocus: true });
				}
			} else if (!PAGE_SIZE_OPTIONS.includes(urlPageSize)) {
				const query = new URLSearchParams($page.url.searchParams.toString());
				query.set('count', selectedPageSize.toString());
				query.delete('page');
				goto(`?${query.toString()}`, { replaceState: true, noScroll: true, keepFocus: true });
			}
		}

		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});

	$effect(() => {
		selectedPageSize = resolvePageSize(browseData.selectedPageSize ?? browseData.pageSize);
	});
</script>

<FilterModal bind:this={filterModal}></FilterModal>
<div class="assets-container browse">
	<div class="browse-filter-container">
		<div class="filter-container">
			{#if browseData.filter != undefined}
				<select
					bind:value={browseData.filter}
					onchange={updateUrl}
					name="AssetFilter"
					class="dropdown-asset"
				>
					<option value="" label="All Types"></option>
					<option value="Map" label="Maps"></option>
					<option value="UgcGameVariant" label="Modes"></option>
					<option value="Prefab" label="Prefabs"></option>
				</select>
			{:else}
				<div class="dropdown-asset">{filterTitle ?? 'Playlists'}</div>
			{/if}
		</div>
		<div class="filter-container">
			{#if browseData.tag != undefined}
				<div class="filter-group input">
					<!-- <p class="filter-text">Tags:</p> -->
					<div class="search-bar-filter">
						<div class="text-on-input">
							<label>Tag</label>
							<input
								bind:value={browseData.tag}
								onkeydown={(event) => event.key === 'Enter' && updateUrl()}
								type="text"
								placeholder="tag"
							/>
						</div>
					</div>
				</div>
			{/if}

			{#if browseData.gamertag != undefined}
				<div class="filter-group input">
					<!-- <p class="filter-text">Contributor:</p> -->
					<div class="search-bar-filter">
						<div class="text-on-input">
							<label>Contributor</label>
							<input
								bind:value={browseData.gamertag}
								onkeydown={(event) => event.key === 'Enter' && updateUrl()}
								type="text"
								placeholder="gamertag"
							/>
						</div>
					</div>
					{#if browseData.gamertag !== '' && browseData.ownerOnly != undefined}
						<!-- Toggle Input with Label -->
						<div class="toggle-group">
							<p class="filter-text">Only owned assets:</p>
							<label class="toggle">
								<input type="checkbox" bind:checked={browseData.ownerOnly} onchange={updateUrl} />
								<span class="slider"></span>
							</label>
						</div>
					{/if}
				</div>
			{/if}
			{#if browseData.hide343Assets !== undefined}
				<!-- Toggle Input with Label -->
				<div class="toggle-group front">
					<p class="filter-text">Hide 343 assets:</p>
					<label class="toggle">
						<input type="checkbox" bind:checked={browseData.hide343Assets} onchange={updateUrl} />
						<span class="slider"></span>
					</label>
				</div>
			{/if}

			<div class="filter-group">
				{#if showPageSizeSelector}
					<div class="text-on-input">
						<label>Results</label>
						<select
							bind:value={selectedPageSize}
							onchange={updatePageSize}
							name="PageSizeFilter"
							class="dropdown-el"
						>
							{#each PAGE_SIZE_OPTIONS as pageSize}
								<option value={pageSize}>{pageSize} / page</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- <p class="filter-text">Sort:</p> -->
				<div class="text-on-input">
					<label>Sort</label>
					<select
						bind:value={browseData.sort}
						onchange={updateUrl}
						name="SortFilter"
						class="dropdown-el"
					>
						{#if browseData.filter != undefined}
							<option value="publishedAt" label="Date Published"></option>
							<option value="name" label="Name"></option>
							<option value="averageRating" label="Rating"></option>
							<option value="bookmarks" label="Bookmarks"></option>
							<option value="playsRecent" label="Plays Recent"></option>
							<option value="playsAllTime" label="Plays"></option>
						{:else}
							<option value="updatedAt" label="Date Updated"></option>
							<option value="name" label="Name"></option>
							<option value="favorites" label="Favorites"></option>
						{/if}
					</select>
				</div>
				<button class="order-button" onclick={updateSortOrder}
					><SortOrder desc={browseData.order === 'desc'}></SortOrder></button
				>
				<button class="filter-button order-button" onclick={loadModal}
					><Filter desc={browseData.order === 'desc'}></Filter></button
				>
			</div>
		</div>
	</div>

	{#if browseData.assets.length}
		<div class="assets browse" class:mobile={isMobile}>
			{#each browseData.assets as asset (asset.assetId)}
				{@const groups = getAssetCardGroups({
					assetId: asset.assetId,
					assetKind: asset.assetKind,
					asset: asset,
					playlist: browseData.playlist || undefined,
					playlistModalVar: playlistModalVar,
					addAssetModalVar: addAssetModalVar,
					inlineBrowsePairingModalVar: inlineBrowsePairingModalVar,
					activeUser: activeUser
				})}
				{@const assetUrl = `/${asset.assetKind == 2 ? 'maps' : asset.assetKind == 6 ? 'modes' : asset.assetKind == 4 ? 'prefabs' : 'playlist'}/${asset.assetId}`}

				{#if isMobile}
					{@const drawerOptions = groups.flatMap(group =>
						group.map(item => ({
							icon: item.icon,
							text: item.text,
							onClick: item.function
						}))
					)}
					<MobileAssetCard
						{asset}
						{assetUrl}
						pairedMode={asset.pairedMode ?? null}
						{drawerOptions}
					/>
				{:else}
					<AssetCard
						{asset}
						{groups}
						{assetUrl}
					/>
				{/if}
			{/each}
		</div>
	{:else}
		<div class="no-results">
			<div>
				<img src="/superintendent_sad.webp" alt="Superintendent Sad" />
				<div>Sorry, no results.</div>
				<div>Try searching for something else.</div>
			</div>
		</div>
	{/if}
</div>
<div class="pagination-container">
	<div class="pagination">
		<ul>
			{#if browseData.currentPage > 1}
				<li>
					<button onclick={() => changePage(1)}>&lt;&lt;</button>
				</li>
			{/if}
			<li class="prev-nav-group">
				<button onclick={() => changePage(browseData.currentPage - 1)}>&lt;</button>
			</li>
			<li class="text-only">{browseData.currentPage} - {browseData.totalPages}</li>
			<li class="next-nav-group">
				<button onclick={() => changePage(browseData.currentPage + 1)}>&gt;</button>
			</li>
			{#if browseData.currentPage < browseData.totalPages}
				<li>
					<button onclick={() => changePage(browseData.totalPages)}>&gt;&gt;</button>
				</li>
			{/if}
		</ul>
	</div>
</div>
