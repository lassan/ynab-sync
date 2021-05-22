<script lang="ts">
  import type { BankAccount, YnabAccount, YnabToBankConnection } from "../../../libs/src/types"
  import { createEventDispatcher } from "svelte"

  export let bankAccount: BankAccount
  export let ynabAccounts: YnabAccount[] = []

  let selected: YnabAccount

  type EventMap = {
    selected: YnabToBankConnection
  }

  const dispatch = createEventDispatcher<EventMap>()

  $: if (bankAccount && selected)
    dispatch("selected", { bank_account_id: bankAccount.account_id, ynab_account_id: selected.id })

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
