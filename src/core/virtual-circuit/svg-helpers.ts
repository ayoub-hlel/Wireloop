import type { ArduinoComponentState } from "../frames/arduino.frame";
import type { Element, Svg } from "@svgdotjs/svg.js";
import { Line } from "@svgdotjs/svg.js";
import { arduinoComponentStateToId } from "../frames/arduino-component-id";

export const findComponentConnection = (
  element: Element,
  connectionId: string
) => {
  const connection = findSvgElement(connectionId, element);

  return {
    x: parseFloat(String(connection.cx())) + parseFloat(String(element.x())),
    y: parseFloat(String(connection.y())) + parseFloat(String(connection.height())) + parseFloat(String(element.y())),
  };
};

export const findArduinoConnectionCenter = (
  element: Element,
  connectionId: string
) => {
  const connection = findSvgElement(connectionId, element);

  if (connection instanceof Line) {
    return {
      x: parseFloat(String(connection.cx())) + parseFloat(String(element.x())),
      y: parseFloat(String(connection.plot()[0][1])) + parseFloat(String(element.y())),
    };
  }

  return {
    x: parseFloat(String(connection.cx())) + parseFloat(String(element.x())),
    y: parseFloat(String(connection.cy())) + parseFloat(String(element.y())),
  };
};

export const findSvgElement = (
  id: string,
  draw: Svg | Element
): Svg | Element => {
  return draw.findOne("#" + id) as Svg | Element;
};

export const deleteWires = (draw: Svg, id: string) => {
  draw
    .find("line")
    .filter((w) => w.data("component-id") === id)
    .forEach((w) => w.remove());
};

export const createComponentEl = (
  draw: Svg,
  state: ArduinoComponentState,
  svgText: string
) => {
  const componentEl = draw.svg(svgText).last()!;
  componentEl.addClass("component");
  componentEl.attr("id", arduinoComponentStateToId(state));
  componentEl.data("component-type", state.type);
  (componentEl as Svg).viewbox(0, 0, parseFloat(String(componentEl.width())), parseFloat(String(componentEl.height())));

  return componentEl;
};

export const findMicronControllerEl = (draw: Svg): Element => {
  return draw.findOne("#microcontroller_main_svg") as Element | Svg;
};

export const addWireConnectionClass = (ids: string[], componentEl: Element) => {
  ids.forEach((id) => {
    const el = componentEl.findOne("#" + id);
    if (el) {
      el.addClass("wire-connection");
    }
  });
};

export enum LED_COLORS {
  LED_ON = "#ffa922",
  LED_OFF = "#F2F2F2",
  POWER_ON = "#49ff7e",
}

export const colorBrightnessAdjuster = (hex: string, lum: number) => {
  // validate hex string
  hex = String(hex).replace(/[^0-9a-f]/gi, "");
  if (hex.length < 6) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  lum = lum || 0;

  // convert to decimal and change luminosity
  let rgb = "#",
    c,
    i;
  for (i = 0; i < 3; i++) {
    c = parseInt(hex.substr(i * 2, 2), 16);
    c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
    rgb += ("00" + c).substr(c.length);
  }

  return rgb;
};
