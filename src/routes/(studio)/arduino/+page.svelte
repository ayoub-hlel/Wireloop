<script lang="ts">
  import VerticalComponentContainer from '../../../components/wireloop/VerticalComponentContainer.svelte';
  import Debug from '../../../components/wireloop/arduino/Debug.svelte';
  import Message from '../../../components/wireloop/arduino/Message.svelte';
</script>

<VerticalComponentContainer>
  <div class="slot-wrapper" slot="top">
    <Message />
  </div>
  <div class="slot-wrapper" slot="bottom">
    <Debug />
  </div>
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
