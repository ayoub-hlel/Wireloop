import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { notification } from '../../src/lib/server/validation';

const root = resolve(__dirname, '../..');
const component = readFileSync(resolve(root, 'src/lib/components/app/NotificationsPopover.svelte'), 'utf8');
const query = readFileSync(resolve(root, 'src/routes/api/query/+server.ts'), 'utf8');
const mutation = readFileSync(resolve(root, 'src/routes/api/mutation/+server.ts'), 'utf8');

describe('notifications contract', () => {
  it('keeps the four persisted notification types in the UI', () => {
    for (const type of ['org_project_created', 'org_project_deleted', 'invite_received', 'ownership_transferred']) {
      expect(component).toContain(`${type}:`);
    }
  });

  it('uses the real notification schemas for read actions', () => {
    expect(notification.list.safeParse({}).success).toBe(true);
    expect(notification.markAllRead.safeParse({}).success).toBe(true);
    expect(notification.markRead.safeParse({ notificationId: 'n1' }).success).toBe(true);
    expect(notification.markRead.safeParse({}).success).toBe(false);
  });

  it('keeps list and mark actions registered on their API routes', () => {
    expect(query).toContain("case 'notifications:list':");
    expect(mutation).toContain("case 'notification:markAllRead':");
    expect(mutation).toContain("case 'notification:markRead':");
  });
});
