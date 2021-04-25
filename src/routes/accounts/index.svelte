<script context="module" lang="ts">
  import { dev } from "$app/env"

  export const hydrate = dev
  export const prerender = true
</script>

<script lang="ts">
  import { onMount } from "svelte"
  import AccountSyncConfiguration from "$lib/AccountSyncConfiguration.svelte"
  import type { BankAccount, YnabAccount } from "mongo/types"

  let accounts = { ynab: [], banking: [] }

  onMount(async () => {
    const response = await fetch("/accounts.json", { credentials: "include" })
    accounts = await response.json()
    if (!response.ok) console.error(`Failed`, accounts)
  })

  const onSelected = (event: CustomEvent) => {
    const detail = event.detail as { bankAccount: BankAccount, ynabAccount: YnabAccount | undefined }
    console.log("detail", detail)
  }
</script>

<svelte:head>
  <title>Accounts</title>
</svelte:head>

<section class="space-y-12">
  <h1>Connected Bank Accounts</h1>

  <form class="space-y-4" on:submit|preventDefault={() => void {}}>
    <ul
      class="bg-white shadow-md rounded-md grid gap-6 p-4"
      style="grid-template-columns: auto 1fr auto;"
    >
      {#each accounts.banking as account}
        <li class="contents">
          <AccountSyncConfiguration
            bankAccount={account}
            ynabAccounts={accounts.ynab}
            on:selected={onSelected}
          />
        </li>
      {/each}
    </ul>
    <button disabled>Save Mapping</button>
  </form>
</section>
<section>
  <h1>Ynab Accounts</h1>
  <ul class="text-lg text-red-500">
    {#each accounts.ynab as account}
      <li><pre>{JSON.stringify(account, null, 2)}</pre></li>
    {/each}
  </ul>
</section>
