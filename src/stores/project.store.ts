import { writable, derived, get, type Readable } from "svelte/store";
import type { Project } from "../types/models";
import authStore from "./auth.store";
import { getApiClient, createQuery, createMutation } from "./api.client";

interface ProjectState {
  project: Project | null;
  projectId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  project: null,
  projectId: null,
  isLoading: false,
  error: null
};

const projectStore = writable<ProjectState>(initialState);

authStore.subscribe((auth) => {
  if (!auth.isLoggedIn) {
    projectStore.set(initialState);
  }
});

export const createProject = createMutation<{
  name: string;
  workspace: string;
  tags?: string[];
  isPublic?: boolean;
}, Project>('projects:createProject');

export const updateProject = createMutation<{
  projectId: string;
  name?: string;
  workspace?: string;
  tags?: string[];
  isPublic?: boolean;
}, void>('projects:updateProject');

export const deleteProject = createMutation<{
  projectId: string;
}, void>('projects:deleteProject');

export async function loadProject(projectId: string): Promise<void> {
  if (!projectId) return;

  projectStore.update(state => ({
    ...state,
    isLoading: true,
    error: null
  }));

  try {
    const client = getApiClient();
    const project = await client.query('projects:getProject', { projectId });

    if (project) {
      projectStore.set({
        project,
        projectId,
        isLoading: false,
        error: null
      });
    } else {
      projectStore.set({
        project: null,
        projectId: null,
        isLoading: false,
        error: 'Project not found'
      });
    }
  } catch (error) {
    console.error('Error loading project:', error);
    projectStore.set({
      project: null,
      projectId: null,
      isLoading: false,
      error: error instanceof Error ? error.message : 'Failed to load project'
    });
  }
}

export async function saveCurrentProject(workspace: string): Promise<void> {
  const currentState = getCurrentProjectState();

  if (!currentState.project || !currentState.projectId) {
    throw new Error('No project to save');
  }

  const updatedProject = { ...currentState.project, workspace };

  try {
    projectStore.update(state => ({
      ...state,
      project: updatedProject
    }));

    await updateProject({
      projectId: currentState.projectId,
      workspace
    });
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
}

export async function saveProjectWorkspace(workspace: string, options: {
  autoSave?: boolean;
  debounceMs?: number;
} = {}): Promise<void> {
  const { autoSave = true, debounceMs = 1000 } = options;

  if (autoSave) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).autoSaveTimeout) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      clearTimeout((window as any).autoSaveTimeout);
    }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).autoSaveTimeout = setTimeout(async () => {
      try {
        await saveCurrentProject(workspace);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, debounceMs);
  } else {
    await saveCurrentProject(workspace);
  }
}

export async function createNewProject(
  name: string,
  workspace: string,
  isPublic: boolean = false
): Promise<string> {
  try {
    const project = await createProject({
      name,
      workspace,
      isPublic
    });

    projectStore.set({
      project,
      projectId: project.id,
      isLoading: false,
      error: null
    });

    return project.id;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

function getCurrentProjectState(): ProjectState {
  let currentState: ProjectState = initialState;
  const unsubscribe = projectStore.subscribe(state => { currentState = state; });
  unsubscribe();
  return currentState;
}

export function getUserProjects(userId: string): Readable<{
  data: Project[] | null;
  isLoading: boolean;
  error: string | null;
}> {
  const query = createQuery<Project[]>('projects:getUserProjects', { userId });

  return derived([query], ([$query]) => ({
    data: $query.data,
    isLoading: $query.isLoading,
    error: $query.error ?? null
  }));
}

export function getPublicProjects(): Readable<{
  data: Project[] | null;
  isLoading: boolean;
  error: string | null;
}> {
  const query = createQuery<Project[]>('projects:getPublicProjects');

  return derived([query], ([$query]) => ({
    data: $query.data,
    isLoading: $query.isLoading,
    error: $query.error ?? null
  }));
}

export function setAutoSave(enabled: boolean): void {
  if (enabled) {
    console.log('Auto-save enabled for current project');
  } else {
    console.log('Auto-save disabled for current project');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).autoSaveTimeout) {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      clearTimeout((window as any).autoSaveTimeout);
    }
  }
}

const enhancedProjectStore = {
  subscribe: projectStore.subscribe,
  set: (value: { project: Project | null; projectId: string | null }) => {
    projectStore.set({
      project: value.project,
      projectId: value.projectId,
      isLoading: false,
      error: null
    });
  },
  loadProject,
  saveCurrentProject,
  createNewProject,
  saveProjectWorkspace,
  createProject,
  updateProject,
  deleteProject,
  getUserProjects,
  getPublicProjects,
  setAutoSave,
};

export default enhancedProjectStore;
