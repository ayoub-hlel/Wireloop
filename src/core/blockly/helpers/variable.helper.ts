import { getWorkspace } from './workspace.helper';

// Guard every workspace read: getWorkspace() is undefined before the workspace
// is created (studio boot), same class as WL-014. Return empty values instead
// of throwing.
export const deleteVariable = (id: string) => {
  const workspace = getWorkspace();
  if (workspace) workspace.deleteVariableById(id);
};

export const getAllVariables = () => {
  const workspace = getWorkspace();
  return workspace ? workspace.getAllVariables() : [];
};

export const isVariableBeingUsed = (id: string) => {
  const workspace = getWorkspace();
  return workspace ? workspace.getVariableUsesById(id).length > 0 : false;
};

export const getVariableByName = (variableName: string) => {
  const workspace = getWorkspace();
  return workspace
    ? workspace.getAllVariables().find((variable) => variable.name === variableName)
    : undefined;
};
