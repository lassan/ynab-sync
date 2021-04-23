<script context="module" lang="ts">
  import type { Load } from "@sveltejs/kit"
  import { dev } from "$app/env"

  export const hydrate = dev
  export const prerender = true

  export const load: Load = async ({ fetch, page: { query } }) => {
    const code = query.get("code")

    const response = await fetch(`http://localhost:3001/truelayer/authorize?code=${code}`)

    const json = await response.json()
    if (!response.ok) console.error(`Failed`, json)

    return {
      props: { code },
      status: 302,
      redirect: "/accounts"
    }
  }
</script>

<pre>{JSON.stringify($$props,null, 2)}</pre>
