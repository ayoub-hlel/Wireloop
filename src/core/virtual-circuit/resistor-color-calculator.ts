const resistorIndex = [
  "BLACK",
  "BROWN",
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "BLUE",
  "PURPLE",
  "GRAY",
  "WHITE",
];

const resistorColor: Record<string, string> = {
  BROWN: "#964B00",
  RED: "#FF0000",
  ORANGE: "#FFA500",
  YELLOW: "#FFFF00",
  GREEN: "#00FF00",
  BLUE: "#0000FF",
  PURPLE: "#AA00AA",
  GRAY: "#101010",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
};

export const ohmsToBands = (ohms: number): [string, string, string] => {
  const firstColor = resistorColor[resistorIndex[+ohms.toString()[0]]];
  const secondColor = resistorColor[resistorIndex[+ohms.toString()[1]]];
  const thirdColor = ohms < 100
    ? resistorColor.BLACK
    : resistorColor[resistorIndex[ohms.toString().length - 2]];

  return [firstColor, secondColor, thirdColor];
};
