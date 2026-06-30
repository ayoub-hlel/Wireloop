// ponytail: API calls through convex.store.ts — file bytes go to R2 when configured, fall back to DB inline
import { getConvexClient } from '../stores/convex.store';

export interface FileUploadResult {
  storageId: string;
  filename: string;
  size: number;
  contentType: string;
  checksum: string;
}

export interface FileDownloadResult {
  content: string;
  filename: string;
  contentType: string;
  size: number;
}

export async function uploadProjectFile(
  projectId: string,
  xmlContent: string,
  userId: string
): Promise<FileUploadResult> {
  const convexClient = getConvexClient();
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
  const filename = `${projectId}.xml`;

  const result = await convexClient.mutation('projects:saveProjectFile', {
    projectId,
    userId,
    content: xmlContent,
    filename,
  });

  return {
    storageId: result.storageId || `inline:${projectId}`,
    filename,
    size: blob.size,
    contentType: 'application/xml',
    checksum: simpleChecksum(xmlContent),
  };
}

export async function downloadProjectFile(
  projectId: string,
  userId: string
): Promise<FileDownloadResult> {
  const convexClient = getConvexClient();
  const fileData = await convexClient.query('projects:getProjectFile', { projectId, userId });

  if (!fileData || !fileData.filename) {
    throw new Error('Project file not found');
  }

  return {
    content: fileData.content || '<xml></xml>',
    filename: fileData.filename,
    contentType: fileData.contentType || 'application/xml',
    size: fileData.size || 0,
  };
}

export async function deleteProjectFile(projectId: string, userId: string): Promise<void> {
  const convexClient = getConvexClient();
  await convexClient.mutation('projects:deleteProjectFile', { projectId, userId });
}

export async function listUserFiles(userId: string): Promise<FileUploadResult[]> {
  const convexClient = getConvexClient();
  return (await convexClient.query('projects:getUserFiles', { userId })) || [];
}

export async function projectFileExists(projectId: string, userId: string): Promise<boolean> {
  try {
    await downloadProjectFile(projectId, userId);
    return true;
  } catch {
    return false;
  }
}

export async function getProjectFileSize(projectId: string, userId: string): Promise<number> {
  try {
    const fileData = await downloadProjectFile(projectId, userId);
    return fileData.size;
  } catch {
    return 0;
  }
}

export function validateXmlContent(xmlContent: string): boolean {
  if (!xmlContent.trim()) return false;
  return xmlContent.includes('<xml>') && xmlContent.includes('</xml>');
}

function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function saveFile(projectId: string, uid: string, xmlContent?: string): Promise<void> {
  let content = xmlContent;
  if (!content) {
    try {
      const { workspaceToXML } = await import('../core/blockly/helpers/workspace.helper');
      content = workspaceToXML();
    } catch {
      content = '<xml></xml>';
    }
  }
  await uploadProjectFile(projectId, content!, uid);
}

export async function getFile(projectId: string, uid: string): Promise<string> {
  const fileData = await downloadProjectFile(projectId, uid);
  return fileData.content;
}
