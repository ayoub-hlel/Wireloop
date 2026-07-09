import type { WorkspaceSvg } from "blockly";
import Blockly from "blockly";
import { getAllBlocks } from "./block.helper";
import { deleteVariable, getAllVariables } from "./variable.helper";

export const getWorkspace = () => {
  return Blockly.getMainWorkspace() as WorkspaceSvg;
};

export const resizeWorkspace = () => {
  Blockly.svgResize(getWorkspace());
};

export const updateToolbox = (toolbox: string) => {
  if (getWorkspace()) {
    return getWorkspace().updateToolbox(toolbox);
  }
};

export const getArduinoCode = () => {
  return Blockly["Arduino"].workspaceToCode(getWorkspace()) as string;
};

export const workspaceToXML = () => {
  const workspace = getWorkspace();
  if (!workspace) return;
  const xml = Blockly.Xml.workspaceToDom(workspace);
  return Blockly.Xml.domToText(xml);
};

export const loadProjectFromUrl = async (url: string) => {
  const response = await fetch(url);
  const fileText = await response.text();

  loadProject(fileText);
};

export const loadProject = (xmlString: string) => {
  try {
    const workspace = getWorkspace();
    if (!workspace) {
      console.warn("Blockly workspace not ready, deferring project load");
      return;
    }

    const parser = new DOMParser();
    localStorage.setItem("no_alert", "yes");
    // Delete all the old blocks and variables
    const blocksToDelete = getAllBlocks(); // get a list of all the old blocks
    blocksToDelete.forEach((b) => b.dispose(false)); // delete the old blocks
    getAllVariables().forEach((v) => deleteVariable(v.getId()));
    // Load the new blocks
    const xml = parser.parseFromString(xmlString, "application/xml");
    if (xml.querySelector("parsererror")) {
      console.warn("Malformed workspace XML, loading default workspace instead");
      localStorage.removeItem("reload_once_workspace");
      return;
    }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    Blockly.Xml.domToWorkspace(xml.documentElement as any, workspace); // load new blocks
    localStorage.removeItem("no_alert");

    // Scroll to the center
    workspace.scrollCenter();
  } catch (e) {
    console.warn("Failed to load workspace XML:", e);
    localStorage.removeItem("reload_once_workspace");
  }
};

export const resetWorkspace = () => {
  const workspace = getWorkspace();
  workspace.getAllBlocks(true).forEach((b) => {
    if (b.type !== "arduino_loop") {
      b.dispose(true);
    }
    if (b.type === "arduino_loop") {
      b.setFieldValue(3, "LOOP_TIMES");
    }
  });
};
