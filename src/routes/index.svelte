<script context="module" lang="ts">
  export const prerender = true
</script>

<script lang="ts">
  import Counter from "$lib/Counter/index.svelte"
</script>

<svelte:head>
  <title>Home</title>
</svelte:head>

<section>
  <a
    href="https://auth.truelayer-sandbox.com/?response_type=code&client_id=sandbox-ynabsync-52b117&scope=info%20accounts%20balance%20cards%20transactions%20direct_debits%20standing_orders%20offline_access&redirect_uri=http://localhost:3000/truelayer-redirect&providers=uk-ob-all%20uk-oauth-all%20uk-cs-mock"
    >Authorize TrueLayer</a
  >

  <a
    href="https://app.youneedabudget.com/oauth/authorize?client_id=ef29f60b98d8f2af56bfc52091b9ab066932368ee1098bfa58b48ac33664a454&redirect_uri=http://localhost:3000/ynab_redirect&response_type=code"
    >Authorize Ynab</a
  >

  <h1>
    <div class="welcome">
      <picture>
        <source srcset="svelte-welcome.webp" type="image/webp" />
        <img src="svelte-welcome.png" alt="Welcome" />
      </picture>
    </div>

    to your new<br />SvelteKit app
  </h1>

  <h2>
    try editing <strong>src/routes/index.svelte</strong>
  </h2>

  <Counter />
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
  }

  h1 {
    width: 100%;
  }

  .welcome {
    position: relative;
    width: 100%;
    height: 0;
    padding: 0 0 calc(100% * 495 / 2048) 0;
  }

  .welcome img {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    display: block;
  }
</style>
