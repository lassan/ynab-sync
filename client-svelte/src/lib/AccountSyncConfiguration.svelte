<script lang="ts">
  import type {
    Account,
    BankAccount,
    YnabAccount,
    YnabToBankConnection
  } from "../../../libs/src/types"
  import { createEventDispatcher } from "svelte"

  export let bankAccount: Account
  export let connectionId: string
  export let ynabAccounts: YnabAccount[] = []

  let selected: YnabAccount

  type EventMap = {
    selected: YnabToBankConnection
  }

  const dispatch = createEventDispatcher<EventMap>()

  $: if (bankAccount && selected) {
    if (bankAccount.connected_to !== selected.id)
      dispatch("selected", {
        bank_account_id: bankAccount.id,
        ynab_account_id: selected.id,
        connection_id: connectionId
      })
  }
</script>

<div class="flex space-x-2 items-center">
  <div>{bankAccount.provider}</div>
</div>

<div>{bankAccount.display_name}</div>
<select bind:value={selected}>
  <option value={null} selected={false} disabled />
  {#each ynabAccounts as ynab}
    <option selected={ynab.id == bankAccount.connected_to} value={ynab}>{ynab.name}</option>
  {/each}
</select>
