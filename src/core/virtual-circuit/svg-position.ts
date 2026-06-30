import { findSvgElement } from "./svg-helpers";
import type { Element, Svg } from "@svgdotjs/svg.js";

export const positionComponent = (
  element: Element,
  arduino: Element,
  draw: Svg,
  hole: number,
  isDown: boolean,
  connectionId: string
) => {
  // 1 Take the Arduino X position
  // 2 Add to it the hole's x position
  // 3 minus the center of the pin in the virtual component
  const holeId = `pin${hole}${isDown ? "E" : "F"}`;
  element.x(
    parseFloat(String(arduino.x())) +
      parseFloat(String(findSvgElement(holeId, draw).cx())) -
      parseFloat(String(findSvgElement(connectionId, element).cx()))
  );

  element.y(
    parseFloat(String(arduino.y())) +
      parseFloat(String(findSvgElement("breadboard", arduino).y())) -
      5 -
      parseFloat(String(element.height()))
  );
};
