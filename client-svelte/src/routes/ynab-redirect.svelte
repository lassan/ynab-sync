<script context="module" lang="ts">
  import { dev } from "$app/env"

  export const hydrate = dev
  export const prerender = true

  export async function load({ page, fetch }) {
    const code = page.query.get("code")
    const res = await fetch(`/ynab/authorize?code=${code}`, {
      credentials: "include",
      mode: "cors"
    })

    if (res.ok) {
      return { redirect: "/", status: 307 }
    } else {
      return { props: { error: "An error occurred when authorizing with Ynab" } }
    }
  }
</script>

<script lang="ts">
  export let error: string
</script>

<div>{error}</div>
