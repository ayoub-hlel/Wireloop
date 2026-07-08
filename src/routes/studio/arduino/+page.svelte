<script lang="ts">
  import VerticalComponentContainer from '../../../components/wireloop/VerticalComponentContainer.svelte';
  import Debug from '../../../components/wireloop/arduino/Debug.svelte';
  import Message from '../../../components/wireloop/arduino/Message.svelte';
</script>

<VerticalComponentContainer>
  {#snippet top()}
    <div class="slot-wrapper">
      <Message />
    </div>
  {/snippet}
  {#snippet bottom()}
    <div class="slot-wrapper">
      <Debug />
    </div>
  {/snippet}
</VerticalComponentContainer>
<svelte:head>
  <title>Wireloop - Arduino</title>
</svelte:head>

<style>
  .slot-wrapper {
    height: 100%;
    width: 100%;
  }
</style>
