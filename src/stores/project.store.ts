import { writable } from "svelte/store";
import { get } from "svelte/store";
import type { Project } from "../types/models";
import authStore from "./auth.store";
import { getApiClient, createMutation } from "./api.client";
import * as Sentry from "@sentry/sveltekit";
import { captureOrGenerateThumbnail } from '../core/virtual-circuit/thumbnail';
import settingsStore from './settings.store';

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
  boardType?: 'uno' | 'nano' | 'mega';
  tags?: string[];
  isPublic?: boolean;
  orgId?: string | null;
}, { projectId: string; project: Project }>('projects:createProject');

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
    // capture or upload flakes out. Tries emulator SVG first, falls back to
    // generating from workspace XML + board type so every save gets a preview.
    // ponytail: model uses 'ARDUINO_UNO' format, thumbnail generator expects 'uno'.
    const bt = currentState.project?.boardType?.replace('ARDUINO_', '').toLowerCase() ?? 'uno';
    captureAndUploadThumbnail(currentState.projectId, workspace, bt).catch(() => {});
  } catch (error) {
    Sentry.captureException(error, { tags: { store: 'project', action: 'save' }, extra: { projectId: currentState.projectId } });
    throw error;
  }
}

export async function createCurrentProject(name: string, workspace: string, orgId?: string | null): Promise<void> {
  const boardType = get(settingsStore).boardType.replace('ARDUINO_', '').toLowerCase() as 'uno' | 'nano' | 'mega';
  const result = await createProject({ name, workspace, boardType, orgId: orgId ?? undefined });
  projectStore.set({ project: result.project, projectId: result.projectId, isLoading: false, error: null });
}

function getCurrentProjectState(): ProjectState {
  let currentState: ProjectState = initialState;
  const unsubscribe = projectStore.subscribe(state => { currentState = state; });
  unsubscribe();
  return currentState;
}

async function captureAndUploadThumbnail(projectId: string, workspaceXml?: string, boardType?: string): Promise<void> {
  const blob = await captureOrGenerateThumbnail(workspaceXml ?? '', boardType ?? 'uno');
  if (!blob) return;

  const form = new FormData();
  form.append('projectId', projectId);
  form.append('thumbnail', blob, 'thumbnail.png');
  // Background op: check the result but never nag the user — a failed thumbnail
  // is invisible by design (previously a 429/500 here was swallowed silently).
  const res = await fetch('/api/upload/thumbnail', { method: 'POST', body: form, credentials: 'same-origin' });
  if (!res.ok) console.warn('[PROJECT] thumbnail upload failed', { status: res.status });
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
  createCurrentProject,
  createProject,
  updateProject,
  deleteProject,
};

export default enhancedProjectStore;
