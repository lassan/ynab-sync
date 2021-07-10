<script context="module" lang="ts">
  import { dev } from "$app/env"

  export const hydrate = dev
  export const prerender = true

  export async function load({ page, fetch }) {
    const res = await fetch("/accounts.json", { credentials: "include" })
    if (res.ok) {
      return { props: { accounts: await res.json() } }
    }
  }
</script>

<script lang="ts">
  import AccountSyncConfiguration from "$lib/AccountSyncConfiguration.svelte"
  import type { Connection, YnabAccount, YnabToBankConnection } from "../../../../libs/src/types"

  import dayjs from "dayjs"

  const _throw = (msg: string) => {
    throw new Error(msg)
  }

  export let accounts: { ynab: YnabAccount[]; connections: Connection[] }
  let saveMapping: Promise<void>

  const onSelected = (event: CustomEvent<YnabToBankConnection>) => {
    console.log("detail", event.detail)
    saveMapping = fetch(`http://localhost:3001/connect`, {
      credentials: "include",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event.detail)
    })
      .then((r) => (r.ok ? void {} : _throw("")))
      .then(() => fetch("/accounts.json", { credentials: "include" }))
      .then(async (res) =>
        res.ok ? (accounts = await res.json()) : _throw("Failed to refresh accounts")
      )
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
          <div class="text-xs">
            <pre>{connection.id}</pre>
            <pre>Connected {dayjs().diff(connection.connected_at, "days")} days ago on {dayjs(connection.connected_at).format("YYYY-MM-DD")}</pre>
          </div>
          <ul
            class="bg-white shadow-md rounded-b-md grid gap-6 p-4 items-center"
            style="grid-template-columns: auto 1fr auto auto;"
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
