// ponytail: compat shim — calls API routes through convex.store.ts until pages are migrated
import { type Settings, type Project, defaultSetting } from "./model";
import { workspaceToXML } from "../core/blockly/helpers/workspace.helper";
import { getConvexClient } from "../stores/convex.store";

export async function fbSaveSettings(uid: string, settings: Settings) {
  const client = getConvexClient();
  await client.mutation('users:updateUserSettings', { userId: uid, settings });
}

export async function getSettings(uid: string): Promise<Settings> {
  try {
    const client = getConvexClient();
    const settings = await client.query('users:getUserSettings', { userId: uid });
    return settings || defaultSetting;
  } catch { return defaultSetting; }
}

export async function addProject(project: Project) {
  const client = getConvexClient();
  project.created = project.created || new Date();
  project.updated = new Date();
  const projectId = await client.mutation('projects:createProject', {
    name: project.name, description: project.description
  });
  await saveFile(projectId, project.userId);
  return { projectId, project: { ...project, id: projectId } };
}

export async function saveProject(project: Project, projectId: string) {
  const client = getConvexClient();
  await client.mutation('projects:updateProject', { projectId, name: project.name, description: project.description });
  await saveFile(projectId, project.userId);
}

export async function getProject(projectId: string): Promise<Project> {
  const client = getConvexClient();
  return client.query('projects:getProject', { projectId });
}

export async function getProjects(uid: string): Promise<[Project, string][]> {
  try {
    const client = getConvexClient();
    const projects = await client.query('projects:getUserProjects', { userId: uid });
    return (projects || []).map((p: any) => [p, p._id || p.id || ''] as [Project, string]);
  } catch { return []; }
}

async function saveFile(projectId: string, uid: string) {
  const workspace = workspaceToXML();
  if (!workspace) throw new Error('No workspace content to save');
  const client = getConvexClient();
  await client.mutation('projects:saveProjectFile', { projectId, userId: uid, content: workspace, filename: `${projectId}.xml` });
}

export async function saveUserProfile(bio: string, username: string, uid: string) {
  const client = getConvexClient();
  await client.mutation('users:updateUserProfile', { userId: uid, profile: { bio, username } });
}

export async function getUserProfile(uid: string) {
  try {
    const client = getConvexClient();
    return await client.query('users:getUserProfile', { userId: uid }) || { username: "", bio: "" };
  } catch { return { username: "", bio: "" }; }
}

export async function getFile(projectId: string, uid: string) {
  try {
    const client = getConvexClient();
    const fileData = await client.query('projects:getProjectFile', { projectId, userId: uid });
    return fileData?.content || '';
  } catch { return ''; }
}

export async function deleteProject(projectId: string, _uid: string) {
  const client = getConvexClient();
  await client.mutation('projects:deleteProject', { projectId });
}
