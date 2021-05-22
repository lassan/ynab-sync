const c = [
	() => import("..\\..\\..\\src\\routes\\__layout.svelte"),
	() => import("..\\components\\error.svelte"),
	() => import("..\\..\\..\\src\\routes\\index.svelte"),
	() => import("..\\..\\..\\src\\routes\\truelayer-redirect.svelte"),
	() => import("..\\..\\..\\src\\routes\\ynab-redirect.svelte"),
	() => import("..\\..\\..\\src\\routes\\accounts\\index.svelte")
];

const d = decodeURIComponent;

export const routes = [
	// src/routes/index.svelte
	[/^\/$/, [c[0], c[2]], [c[1]]],

	// src/routes/truelayer-redirect.svelte
	[/^\/truelayer-redirect\/?$/, [c[0], c[3]], [c[1]]],

	// src/routes/ynab-redirect.svelte
	[/^\/ynab-redirect\/?$/, [c[0], c[4]], [c[1]]],

	// src/routes/accounts/index.json.ts
	[/^\/accounts\.json$/],

	// src/routes/accounts/index.svelte
	[/^\/accounts\/?$/, [c[0], c[5]], [c[1]]],

	// src/routes/ynab/authorize.ts
	[/^\/ynab\/authorize\/?$/]
];

export const fallback = [c[0](), c[1]()];