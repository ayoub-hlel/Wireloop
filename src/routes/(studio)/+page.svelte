<script lang="ts">
  import VerticalComponentContainer from '../../components/wireloop/VerticalComponentContainer.svelte';
  import Simulator from '../../components/wireloop/home/Simulator.svelte';
  import Step from '../../components/wireloop/home/Steps.svelte';
</script>

<VerticalComponentContainer>
  <div class="slot-wrapper" slot="top">
    <Simulator />
  </div>
  <div class="slot-wrapper" slot="bottom">
    <Step />
  </div>
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
