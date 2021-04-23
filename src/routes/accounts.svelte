<script context="module" lang="ts">
  export const prerender = true

  import type { Load } from "@sveltejs/kit"
  import type { Account } from "mongo/truelayer"

  export const load: Load = async ({ fetch }) => {
    const response = await fetch("http://localhost:3001/accounts")

    const json = await response.json()
    if (!response.ok) console.error(`Failed`, json)

    const accounts: Account[] = await (response.ok ? json : Promise.resolve<Account[]>([]))

    return {
      props: { accounts }
    }
  }
</script>

<svelte:head>
  <title>Accounts</title>
</svelte:head>

<section>
  <h1>Accounts</h1>

  <ul class="text-lg text-red-500">
    {#each $$props.accounts as account}
      <li><pre>{JSON.stringify(account, null, 2)}</pre></li>
    {/each}
  </ul>
</section>
