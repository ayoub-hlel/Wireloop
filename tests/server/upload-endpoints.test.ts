/**
 * Upload endpoint contracts (security surface).
 *
 * Locks: auth gate -> rate limit -> MIME allowlist -> size cap ->
 * ownership check (thumbnail) -> R2 key layout. Any future change that
 * weakens one of these gates fails here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@sentry/sveltekit', () => ({
  captureException: vi.fn(),
}));
vi.mock('$lib/server/log', () => ({ logServerError: vi.fn() }));
vi.mock('$lib/server/r2', () => ({
  putFile: vi.fn(async () => undefined),
  getFile: vi.fn(),
  deleteFile: vi.fn(),
  getFileBuffer: vi.fn(async () => null),
  isR2Configured: vi.fn(() => true),
}));
vi.mock('$lib/server/ratelimit', () => ({
  checkRateLimit: vi.fn(async () => null),
}));
vi.mock('$lib/db', () => {
  // chainable drizzle-ish stub: select().from().where() -> rows
  const rows: Array<{ owner: string }> = [];
  return {
    getDb: () => ({
      select: () => ({
        from: () => ({
          where: () => Promise.resolve(rows),
        }),
      }),
      update: () => ({ set: () => ({ where: () => Promise.resolve(undefined) }) }),
    }),
    __setOwnershipRows: (r: Array<{ owner: string }>) => {
      rows.length = 0;
      rows.push(...r);
    },
  };
});

import { POST as avatarPOST } from '@/routes/api/upload/avatar/+server';
import { POST as thumbnailPOST } from '@/routes/api/upload/thumbnail/+server';
import { GET as avatarGET } from '@/routes/api/avatars/[userId]/+server';
import { GET as thumbnailGET } from '@/routes/api/thumbnails/[projectId]/+server';
 
import * as dbModule from '$lib/db';

const { putFile } = await import('$lib/server/r2');
const { checkRateLimit } = await import('$lib/server/ratelimit');

type Event = Parameters<typeof avatarPOST>[0];

const event = (
  form: FormData | null,
  user: { id: string } | null = { id: 'u1' },
): Event =>
  ({
    // Handler only reads request.formData() — stub it directly to avoid
    // undici/vitest Request+FormData quirks.
    request: {
      formData: async () => form ?? new FormData(),
    } as unknown as Request,
    locals: { user, session: null } as unknown as App.Locals,
    getClientAddress: () => '127.0.0.1',
  }) as unknown as Event;

// jsdom's File lacks .arrayBuffer() — construct a real File (so FormData keeps
// its type/name/size) and patch on arrayBuffer.
const makeFile = (type: string, name: string, sizeBytes = 10): File => {
  const bytes = new Uint8Array(sizeBytes);
  const file = new File([bytes], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
   
  (file as any).arrayBuffer = async () => bytes.buffer.slice(0);
  return file;
};

 
const pngFile = (sizeBytes = 10): any => makeFile('image/png', 'me.png', sizeBytes);

beforeEach(() => {
  vi.clearAllMocks();
   
  (checkRateLimit as any).mockResolvedValue(null);
});

describe('avatar upload', () => {
  it('rejects unauthenticated requests before touching storage', async () => {
    await expect(avatarPOST(event(new FormData(), null))).rejects.toMatchObject({
      status: 401,
    });
    expect(putFile).not.toHaveBeenCalled();
  });

  it('rejects missing file', async () => {
    await expect(avatarPOST(event(new FormData()))).rejects.toMatchObject({
      status: 400,
    });
  });

  it('enforces the MIME allowlist (no HTML/SVG uploads)', async () => {
    for (const type of ['text/html', 'image/svg+xml', 'application/json']) {
      const form = new FormData();
      form.append('avatar', makeFile(type, 'x.html', 4));
      await expect(avatarPOST(event(form))).rejects.toMatchObject({ status: 400 });
    }
    expect(putFile).not.toHaveBeenCalled();
  });

  it('enforces the 5MB size cap', async () => {
    const form = new FormData();
    form.append('avatar', pngFile(5 * 1024 * 1024 + 1));
    await expect(avatarPOST(event(form))).rejects.toMatchObject({ status: 400 });
    expect(putFile).not.toHaveBeenCalled();
  });

  it('stores under avatars/<userId>.<ext> keyed to the session user', async () => {
    const form = new FormData();
    form.append('avatar', pngFile());
    const res = await avatarPOST(event(form));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: '/api/avatars/u1' });
    expect(putFile).toHaveBeenCalledWith(
      'avatars/u1.png',
      expect.any(Uint8Array),
      'image/png',
    );
  });
});

describe('asset serving (GET)', () => {
  const hit = { body: new Uint8Array([1, 2, 3]), contentType: 'image/png' };

  it('avatar: probes extensions and serves with immutable caching', async () => {
    const { getFileBuffer } = await import('$lib/server/r2');
     
    (getFileBuffer as any)
      .mockResolvedValueOnce(null) // .png miss
      .mockResolvedValueOnce(hit); // .jpg hit
    const res = await avatarGET({ params: { userId: 'u1' } } as never);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('content-type')).toBe('image/png');
    // probed in extension order
    expect(getFileBuffer).toHaveBeenNthCalledWith(1, 'avatars/u1.png');
    expect(getFileBuffer).toHaveBeenNthCalledWith(2, 'avatars/u1.jpg');
  });

  it('avatar: 404 when no extension matches', async () => {
    await expect(
      avatarGET({ params: { userId: 'ghost' } } as never),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('thumbnail: serves png with short cache (upload cache-busts via ?v=)', async () => {
    const { getFileBuffer } = await import('$lib/server/r2');
     
    (getFileBuffer as any).mockResolvedValueOnce(hit);
    const res = await thumbnailGET({ params: { projectId: 'p1' } } as never);
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
    expect(getFileBuffer).toHaveBeenCalledWith('thumbnails/p1.png');
  });

  it('thumbnail: 404 when missing', async () => {
    await expect(
      thumbnailGET({ params: { projectId: 'nope' } } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('thumbnail upload', () => {
  const thumbEvent = (form: FormData, user: { id: string } | null = { id: 'u1' }) =>
    event(form, user);

  const validForm = () => {
    const form = new FormData();
    form.append('projectId', 'p1');
    form.append('thumbnail', pngFile());
    return form;
  };

  it('rejects unauthenticated requests', async () => {
    await expect(thumbnailPOST(thumbEvent(validForm(), null))).rejects.toMatchObject({
      status: 401,
    });
  });

  it('requires both projectId and file', async () => {
    const missingId = new FormData();
    missingId.append('thumbnail', pngFile());
    await expect(thumbnailPOST(thumbEvent(missingId))).rejects.toMatchObject({ status: 400 });
  });

  it('accepts PNG only', async () => {
    const form = new FormData();
    form.append('projectId', 'p1');
    form.append('thumbnail', makeFile('image/jpeg', 'x.jpg', 4));
    await expect(thumbnailPOST(thumbEvent(form))).rejects.toMatchObject({ status: 400 });
    expect(putFile).not.toHaveBeenCalled();
  });

  it('enforces ownership: another user’s project is a 404, never an overwrite', async () => {
     
    (dbModule as any).__setOwnershipRows([]); // select returns no row
    await expect(thumbnailPOST(thumbEvent(validForm()))).rejects.toMatchObject({
      status: 404,
    });
    expect(putFile).not.toHaveBeenCalled();
  });

  it('stores under thumbnails/<projectId>.png and records the url', async () => {
     
    (dbModule as any).__setOwnershipRows([{ owner: 'u1' }]);
    const res = await thumbnailPOST(thumbEvent(validForm()));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^\/api\/thumbnails\/p1\?v=\d+$/);
    expect(putFile).toHaveBeenCalledWith(
      'thumbnails/p1.png',
      expect.any(Uint8Array),
      'image/png',
    );
  });

  it('is rate limited on the shared "upload" bucket', async () => {
     
    (dbModule as any).__setOwnershipRows([{ owner: 'u1' }]);
    await thumbnailPOST(thumbEvent(validForm()));
    expect(checkRateLimit).toHaveBeenCalledWith(
      'upload',
      expect.objectContaining({ user: { id: 'u1' } }),
      expect.any(Function), // getClientAddress, resolved inside checkRateLimit
    );
  });
});
