import type { WorkspaceSvg } from "blockly";
import Blockly from "blockly";
import { getAllBlocks } from "./block.helper";
import { deleteVariable, getAllVariables } from "./variable.helper";
import { mark, fail } from "$lib/telemetry/boot";

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

const LOAD_RETRY_INTERVAL = 100;
const MAX_LOAD_RETRIES = 20;

// Deferred-load queue for when loadProject is called before the Blockly
// workspace exists (WL-006). Previously the load was dropped silently.
let _pendingLoad: string | null = null;
let _loadRetries = 0;
let _loadRetryTimer: ReturnType<typeof setTimeout> | undefined;

// Workspace-readiness seam so tests can simulate the workspace appearing
// without a real Blockly main workspace (WL-006).
let _workspaceOverride: WorkspaceSvg | undefined;
const getCurrentWorkspace = (): WorkspaceSvg | undefined =>
  _workspaceOverride ?? getWorkspace();

/** Test-only: simulate workspace readiness. Pass undefined to use the real one. */
export const _setWorkspaceOverrideForTests = (ws: WorkspaceSvg | undefined) => {
  _workspaceOverride = ws;
};

const tryDeferredLoad = () => {
  _loadRetryTimer = undefined;
  if (!_pendingLoad) return;
  if (getCurrentWorkspace()) {
    const xml = _pendingLoad;
    _pendingLoad = null;
    _loadRetries = 0;
    loadProject(xml);
    return;
  }
  if (_loadRetries >= MAX_LOAD_RETRIES) {
    _pendingLoad = null;
    _loadRetries = 0;
    fail('loadProject:give-up', new Error('Blockly workspace never became ready'));
    console.error('Failed to load project: Blockly workspace never became ready');
    return;
  }
  _loadRetries += 1;
  _loadRetryTimer = setTimeout(tryDeferredLoad, LOAD_RETRY_INTERVAL);
};

/** Test-only: clears the deferred-load queue/timer/override. */
export const _resetLoadProjectForTests = () => {
  if (_loadRetryTimer) clearTimeout(_loadRetryTimer);
  _loadRetryTimer = undefined;
  _pendingLoad = null;
  _loadRetries = 0;
  _workspaceOverride = undefined;
};

export const loadProject = (xmlString: string) => {
  mark('loadProject:start', { xmlLength: xmlString.length });
  try {
    const workspace = getCurrentWorkspace();
    if (!workspace) {
      // Defer and retry once the workspace exists (WL-006) instead of dropping
      // the load silently.
      _pendingLoad = xmlString;
      if (!_loadRetryTimer) {
        _loadRetryTimer = setTimeout(tryDeferredLoad, LOAD_RETRY_INTERVAL);
      }
      return;
    }

    // A previous call may have been deferred; clear it now that we're loading.
    _pendingLoad = null;
    _loadRetries = 0;
    if (_loadRetryTimer) {
      clearTimeout(_loadRetryTimer);
      _loadRetryTimer = undefined;
    }

    const parser = new DOMParser();
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
    mark('loadProject:loaded');

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
