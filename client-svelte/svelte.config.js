import sveltePreprocess from 'svelte-preprocess';
import node from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: sveltePreprocess({ postcss: true }),
	kit: {
		// By default, `npm run build` will create a standard Node app.
		// You can create optimized builds for different platforms by
		// specifying a different adapter
		adapter: node(),
		target: '#svelte',

		vite: {
			optimizeDeps: ["axios", "cookie"],
		}
	}
}

export default config
