<script lang="ts">
    import type { Help } from '../../../help/help-model';
    import  { HelpType } from '../../../help/help-model';
    import get from 'lodash/get';

    let { help }: { help: Help } = $props();
    let pictureUrl = $derived(get(help, 'help.data.url'));
    let altText = $derived(get(help, 'help.data.alt'));
    let youtubeId = $derived(get(help, 'help.data.youtubeid'));

</script>

<style>
    h1 {
        text-align: center;
        margin: 20px auto;
    }
    img, iframe {
        display: block;
        margin: 10px auto;
    }
    img {
        width: 80%;
        max-height: 60vh;
    }
    p {
        margin: 20px auto;
        font-size: 1.2em;
    }
    p.youtube {
        width: 560px;
    }
    p.picture {
        width: 80%;
    }
    
</style>

<h1>{help.blockName} Block</h1>

{#if help.type === HelpType.PICTURE}
    <img src={pictureUrl} alt={altText} />
{/if}

{#if help.type === HelpType.YOUTUBE}
  <iframe title="{help.blockName}" width="560" height="315" src="https://www.youtube.com/embed/{youtubeId}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

{/if}

<p 
class:youtube={help.type === HelpType.YOUTUBE}
class:picture={help.type === HelpType.PICTURE}
>{help.information}</p>

