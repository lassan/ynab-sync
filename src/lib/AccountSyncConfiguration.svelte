<script lang="ts">
  import type { BankAccount, YnabAccount } from "mongo/types"
  import { createEventDispatcher } from "svelte"

  export let bankAccount: BankAccount
  export let ynabAccounts: YnabAccount[] = []

  let selected: YnabAccount

  const dispatch = createEventDispatcher()

  $: dispatch("selected", { bankAccount, ynabAccount: selected })
</script>

<div class="flex space-x-2 items-center">
  <img
    class="w-6 h-6"
    src={bankAccount.provider.logo_uri}
    alt={bankAccount.provider.display_name}
  />
  <div>{bankAccount.provider.display_name}</div>
</div>

<div>{bankAccount.display_name}</div>
<select bind:value={selected}>
  <option value={undefined} />
  {#each ynabAccounts as ynab}
    <option selected={selected == ynab} value={ynab}>{ynab.name}</option>
  {/each}
</select>
