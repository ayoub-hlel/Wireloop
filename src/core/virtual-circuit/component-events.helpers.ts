import { Svg, Element } from '@svgdotjs/svg.js';
import { updateWires } from './wire';

export const addDraggableEvent = (
  componentEl: Element,
  arduino: Element,
  draw: Svg
) => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  (componentEl as any).draggable().on('dragmove', (e: Event) => {
    e.stopPropagation();
    updateWires(componentEl, draw, arduino as Svg);
  });
};