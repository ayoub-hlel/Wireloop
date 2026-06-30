import { MenuOption } from "blockly";
import { getTimesThroughLoop } from "./arduino_loop_block.helper";

const loopTimes = () => {
  // Reason for +1 is because it does not include end number
  return Array.from({ length: getTimesThroughLoop() }, (_, i) => 1 + i).map((loop) => {
    const menuOption: MenuOption = [loop.toString(), loop.toString()];
    return menuOption;
  });
};
export default loopTimes;
