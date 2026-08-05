import { writable } from "svelte/store";
import type { Project } from "../types/models";
import authStore from "./auth.store";
import { getApiClient, createMutation } from "./api.client";
import * as Sentry from "@sentry/sveltekit";
import { captureEmulatorThumbnail } from '../core/virtual-circuit/thumbnail';

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

  Sentry.addBreadcrumb({ category: 'store', message: 'loadProject', level: 'info', data: { projectId } });
  projectStore.update(state => ({
    ...state,
    isLoading: true,
    error: null
  }));

  try {
    const client = getApiClient();
    const project = (await client.query('projects:getProject', { projectId })) as Project | null;

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
    Sentry.captureException(error, { tags: { store: 'project', action: 'load' }, extra: { projectId } });
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

  Sentry.addBreadcrumb({ category: 'store', message: 'saveCurrentProject', level: 'info', data: { projectId: currentState.projectId } });
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

    // ponytail: thumbnails are best-effort — never fail a save if the
    // capture or upload flakes out. This runs on the emulator tab only
    // (no svg → no-op). A stale thumbnail is better than a failed save.
    captureAndUploadThumbnail(currentState.projectId).catch(() => {});
  } catch (error) {
    Sentry.captureException(error, { tags: { store: 'project', action: 'save' }, extra: { projectId: currentState.projectId } });
    throw error;
  }
}

function getCurrentProjectState(): ProjectState {
  let currentState: ProjectState = initialState;
  const unsubscribe = projectStore.subscribe(state => { currentState = state; });
  unsubscribe();
  return currentState;
}

async function captureAndUploadThumbnail(projectId: string): Promise<void> {
  const blob = await captureEmulatorThumbnail();
  if (!blob) return;

  const form = new FormData();
  form.append('projectId', projectId);
  form.append('thumbnail', blob, 'thumbnail.png');
  await fetch('/api/upload/thumbnail', { method: 'POST', body: form, credentials: 'same-origin' });
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
  createProject,
  updateProject,
  deleteProject,
};

export default enhancedProjectStore;
