<script context="module" lang="ts">
  import { dev } from "$app/env"

  export const hydrate = dev
  export const prerender = true
</script>

<script lang="ts">
  import { goto } from "$app/navigation"
  import { onMount } from "svelte"

  let error: string = ""

  onMount(async () => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")

    const response = await fetch(`http://localhost:3001/truelayer/authorize?code=${code}`, {
      credentials: "include"
    })

    if (response.ok) goto("/")
    else error = "An error occurred when authorizing with Ynab"
  })
</script>

<div>{JSON.stringify($$props)}</div>
