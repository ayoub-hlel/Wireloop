<script lang="ts">
  import VerticalComponentContainer from '../../components/wireloop/VerticalComponentContainer.svelte';
  import Simulator from '../../components/wireloop/home/Simulator.svelte';
  import Step from '../../components/wireloop/home/Steps.svelte';
</script>

<VerticalComponentContainer>
  {#snippet top()}
    <div class="slot-wrapper">
      <Simulator />
    </div>
  {/snippet}
  {#snippet bottom()}
    <div class="slot-wrapper">
      <Step />
    </div>
  {/snippet}
</VerticalComponentContainer>
<svelte:head>
  <title>Wireloop</title>
</svelte:head>

<style>
  .slot-wrapper {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>
