<script lang="ts">
  import { rgbToHex } from "../../../core/blockly/helpers/color.helper";
  import keys from "lodash/keys";
  import currentFrameStore from "../../../stores/currentFrame.store";
  import frameStore from "../../../stores/frame.store";
  import { onDestroy } from "svelte";
  import { VariableTypes } from "../../../core/blockly/dto/variable.type";
  let variables: any[] = [];

  const unsubscribes: (() => void)[] = [];

  unsubscribes.push(
    currentFrameStore.subscribe((frame) => {
      if (!frame) {
        variables = [];
        return;
      }
      variables = keys(frame.variables).map((varName) => {
        return frame.variables[varName];
      });
    })
  );

  unsubscribes.push(
    frameStore.subscribe((frameContainer) => {
      // This means no frames so we should reset variables to none
      if (frameContainer.frames.length === 0) {
        variables = [];
        return;
      }
    })
  );

  function mapArrayValues(values: any[], type: string) {
    const innerString = values
      .map((v: any) => (v === null ? "_" : v))
      .map((v) => {
        if (v === "_" || type !== VariableTypes.LIST_STRING) {
          return v;
        }

        return `"${v}"`;
      })
      .reduce((acc, next) => {
        return acc + next + ", ";
      }, "");

    return `[ ${innerString.substring(0, innerString.length - 2)} ]`;
  }

  onDestroy(() => {
    unsubscribes.forEach((unSubFunc) => unSubFunc());
  });
</script>

<div class="debugger" class:open={variables.length > 0} id="debugger">
  <ul>
    {#each variables as variable (variable.name)}
      {#if ['Number', 'Boolean'].includes(variable.type)}
        <li>{variable.name} = {variable.value}</li>
      {/if}
      {#if ['String'].includes(variable.type)}
        <li>{variable.name} = "{variable.value}"</li>
      {/if}
      {#if ['List Number', 'List String', 'List Boolean'].includes(variable.type)}
        <li>
          {variable.name}
          =
          {mapArrayValues(variable.value, variable.type)}
        </li>
      {/if}
      {#if 'Colour' === variable.type}
        <li>
          <span
            class="color"
            style="border-bottom: {rgbToHex(variable.value)} solid 2px;"
          >
            {variable.name}
            = (r={variable.value.red},g={variable.value.green},b={variable.value.blue})
          </span>
        </li>
      {/if}
      {#if 'List Colour' === variable.type}
        <li>
          <span class="color-list-name-equal">{variable.name} =</span>
          {#each variable.value as color, i (i)}
            {#if color}
              <span
                class="color-item"
                style="border: solid {rgbToHex(color)} 4px;"
              >
                {i + 1}
              </span>
            {:else}
              <span class="color-item" style="border: dotted gray 4px;">
                {i + 1}
              </span>
            {/if}
          {/each}
        </li>
      {/if}
    {/each}
  </ul>
</div>

<style>
  .debugger {
    box-sizing: border-box;
    position: absolute;
    right: 0;
    top: 0;
    max-width: 300px;
    transform: translateX(300%);
    border: solid hsl(var(--border)) 1px;
    border-bottom: none;
    background-color: hsl(var(--card));
    transition: 1s ease-in-out transform;
  }
  .debugger.open {
    transform: translateX(0);
  }
  ul {
    list-style-type: none;
    padding: 0;
    margin-top: 0px;
    margin-bottom: 0px;
  }
  ul li {
    border-bottom: solid gray 1px;
    padding: 10px;
    overflow-wrap: break-word;
  }
  .color {
    background-color: #fff;
  }
  .color-item {
    padding: 5px;
    margin-left: 5px;
    display: inline-block;
    margin-top: 5px;
  }
  .color-list-name-equal {
    display: inline-block;
  }
</style>
