<script lang="ts">
	import { cn } from "$lib/utils.js";
	import { Command as CommandPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		...restProps
	}: CommandPrimitive.RootProps = $props();

	// ponytail: bits-ui never clears `data-selected` on pointer-leave (upstream
	// cmdk's handlePointerLeave does), so the last hovered item keeps glowing.
	// Clear the selection when the pointer leaves an item; the next pointermove
	// re-selects it. `null` (cast) avoids the `""` remount path.
	function onPointerOut(e: PointerEvent) {
		const next = e.relatedTarget as Element | null;
		if (!next?.closest?.('[data-slot="command-item"]')) {
			value = null as unknown as string;
		}
	}
</script>

<CommandPrimitive.Root
	bind:value
	bind:ref
	onpointerout={onPointerOut}
	data-slot="command"
	class={cn("bg-popover text-popover-foreground rounded-xl! p-1 flex size-full flex-col overflow-hidden", className)}
	{...restProps}
/>
