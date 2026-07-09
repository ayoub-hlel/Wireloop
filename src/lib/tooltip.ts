/**
 * Custom tooltip action for Svelte 5.
 *
 * Replaces @svelte-plugins/tooltips which is not fully compatible
 * with Svelte 5's mount() API (scoped CSS not injected, $: reactivity issues).
 *
 * Usage:
 *   <button use:tooltip={{ content: "My Tooltip", position: "top" }}>
 *
 * Options:
 *   content  — Tooltip text (default: element's title attribute)
 *   position — "top" | "bottom" | "left" | "right" (default: "bottom")
 *   align    — "center" | "left" | "right" (default: "center")
 *   theme    — CSS class added to the tooltip element
 */

export type TooltipOptions = {
  content?: string;
  position?: string;
  align?: string;
  animation?: string;
  theme?: string;
};

type TooltipState = {
  el: HTMLDivElement;
};

const tooltipStyles = `
position: fixed;
z-index: 9999;
pointer-events: none;
opacity: 0;
visibility: hidden;
transition: opacity 0.15s ease, visibility 0.15s ease;
background: #1e1e1e;
color: #e0e0e0;
font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
font-size: 0.7rem;
padding: 4px 10px;
border-radius: 4px;
border: 1px solid rgba(255,255,255,0.12);
white-space: nowrap;
box-shadow: 0 4px 12px rgba(0,0,0,0.4);
`;

export function tooltip(element: HTMLElement, options?: TooltipOptions) {
  let state: TooltipState | null = null;
  const title = element.getAttribute("title");

  const config: TooltipOptions = {
    position: "bottom",
    align: "center",
    ...options,
    content: options?.content || title || "",
  };

  if (title) {
    element.removeAttribute("title");
  }

  function show() {
    if (state || !config.content) return;

    const el = document.createElement("div");
    el.setAttribute("style", tooltipStyles);
    el.textContent = config.content;
    el.className = `tooltip-custom${config.theme ? " " + config.theme : ""}`;

    document.body.appendChild(el);

    // Force layout so we can measure dimensions
    el.style.opacity = "0";
    el.style.visibility = "visible";

    const rect = element.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (config.position) {
      case "top":
        top = rect.top - tipRect.height - gap;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        break;
      case "bottom":
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tipRect.width / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.left - tipRect.width - gap;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tipRect.height / 2;
        left = rect.right + gap;
        break;
    }

    // Keep within viewport
    if (left < 4) left = 4;
    if (left + tipRect.width > window.innerWidth - 4) {
      left = window.innerWidth - tipRect.width - 4;
    }
    if (top < 4) top = 4;
    if (top + tipRect.height > window.innerHeight - 4) {
      top = window.innerHeight - tipRect.height - 4;
    }

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;

    // Switch to hidden and animate in
    el.style.visibility = "hidden";
    void el.offsetWidth; // reflow

    state = { el };

    // Fade in
    el.style.visibility = "visible";
    el.style.opacity = "1";
  }

  function hide() {
    if (!state) return;
    const { el } = state;
    el.style.opacity = "0";
    el.style.visibility = "hidden";

    const removeEl = () => {
      if (state) {
        el.removeEventListener("transitionend", removeEl);
        el.remove();
        state = null;
      }
    };

    el.addEventListener("transitionend", removeEl, { once: true });
    setTimeout(removeEl, 200);
  }

  function handleMouseEnter() {
    show();
  }

  function handleMouseLeave() {
    hide();
  }

  element.addEventListener("mouseenter", handleMouseEnter);
  element.addEventListener("mouseleave", handleMouseLeave);

  return {
    destroy() {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      if (state) {
        state.el.removeEventListener("transitionend", hide);
        state.el.remove();
        state = null;
      }
      if (title) {
        element.setAttribute("title", title);
      }
    },
    update(newOptions?: TooltipOptions) {
      if (newOptions) {
        Object.assign(config, newOptions);
        if (newOptions.content !== undefined) {
          config.content = newOptions.content;
        }
      }
    },
  };
}
