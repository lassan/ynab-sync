<script context="module" lang="ts">
  import { dev } from "$app/env"

  export const hydrate = dev
  export const prerender = true

</script>

<script lang="ts">
  import { onMount } from "svelte"
  import AccountSyncConfiguration from "$lib/AccountSyncConfiguration.svelte"
  import type { Connection, YnabAccount, YnabToBankConnection } from "../../../../libs/src/types"

  const _throw = (msg: string) => {
    throw new Error(msg)
  }

  let accounts: { ynab: YnabAccount[]; connections: Connection[] } = { ynab: [], connections: [] }
  let saveMapping: Promise<void>

  onMount(async () => {
    const response = await fetch("/accounts.json", { credentials: "include" })
    accounts = await response.json()
    if (!response.ok) console.error(`Failed`, accounts)
  })

  const onSelected = (event: CustomEvent<YnabToBankConnection>) => {
    console.log("detail", event.detail)
    saveMapping = fetch(`http://localhost:3001/connect`, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event.detail)
    }).then((r) => (r.ok ? void {} : _throw("")))
  }

</script>

<svelte:head>
  <title>Accounts</title>
</svelte:head>

<section class="space-y-12">
  <h1>Connected Bank Accounts</h1>

  <form class="space-y-4" on:submit|preventDefault={() => void {}}>
    <ul class="space-y-4">
      {#each accounts.connections as connection}
        <li>
          <pre>
            {connection.id}
            {connection.connected_at}
          </pre>
          <ul
            class="bg-white shadow-md rounded-b-md grid gap-6 p-4"
            style="grid-template-columns: auto 1fr auto;"
          >
            {#each Object.entries(connection.accounts) as account}
              <li class="contents">
                <AccountSyncConfiguration
                  connectionId={connection.id}
                  bankAccount={account[1]}
                  ynabAccounts={accounts.ynab}
                  on:selected={onSelected}
                />
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
    {#await saveMapping}
      Saving...
    {/await}
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
