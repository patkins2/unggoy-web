// Layered playlist cover logic. Framework-free so it can be unit-tested and
// reused anywhere a cover is rendered (listing grids + the detail-page hero).
//
// Fallback ladder (see planCover): custom upload -> mosaic -> hero -> name tint.

// Slightly muted so the tint reads as "themed", not neon.
export const COVER_PALETTE = [
	'#1f9e93',
	'#3f74c4',
	'#7163d6',
	'#cc6336',
	'#6f9a2c',
	'#c25680',
	'#c79030',
	'#cf4f4f',
	'#2f93a8',
	'#9166cf'
];

export const COVER_CONFIG = {
	placeholderSrc: '/placeholder.webp',
	// 'soft-light' is calmer; 'overlay' has more pop. One-line A/B.
	tintBlendMode: 'soft-light' as 'soft-light' | 'overlay',
	// 0..1 — lower is a subtler tint. A full-strength hue-replacing blend looks
	// too vibrant, so this stays well under 1.
	tintStrength: 0.65
};

export function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
	return Math.abs(h);
}

export function coverColor(name: string): string {
	return COVER_PALETTE[hashString(name) % COVER_PALETTE.length];
}

export type CoverPlan =
	| { kind: 'custom'; src: string }
	| { kind: 'mosaic'; srcs: string[] } // length 4
	| { kind: 'hero'; src: string }
	| { kind: 'tint'; color: string };

// The backend returns the placeholder path as a sentinel `thumbnailUrl` when a
// playlist has no real uploaded cover, so a non-empty value is not enough to
// count as "custom" — exclude the placeholder (by path or any host + path).
export function isCustomCover(url?: string | null): url is string {
	return !!url && url !== COVER_CONFIG.placeholderSrc && !url.endsWith('/placeholder.webp');
}

export function planCover(p: {
	name: string;
	thumbnailUrl?: string | null; // playlist cover ('/placeholder.webp' when none)
	coverThumbnails?: string[] | null; // up to 4 map thumbnail URLs
}): CoverPlan {
	if (isCustomCover(p.thumbnailUrl)) return { kind: 'custom', src: p.thumbnailUrl };
	const thumbs = (p.coverThumbnails ?? []).filter(Boolean);
	if (thumbs.length >= 4) return { kind: 'mosaic', srcs: thumbs.slice(0, 4) };
	if (thumbs.length >= 1) return { kind: 'hero', src: thumbs[0] };
	return { kind: 'tint', color: coverColor(p.name) };
}
