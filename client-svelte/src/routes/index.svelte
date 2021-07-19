<script context="module" lang="ts">
  export const prerender = true
  import { config } from "../env"
</script>

<svelte:head>
  <title>Home</title>
</svelte:head>

<section class="flex flex-grow flex-col justify-center items-center">
  <a href={config.ynab_auth_href}>Authorize Ynab</a>
  <a href={config.truelayer_auth_href}>Authorize TrueLayer</a>
</section>

<style>
</style>
