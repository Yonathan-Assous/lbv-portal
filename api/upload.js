import { handleUpload } from '@vercel/blob/client';
import { isAuthed, can, storageReady, readBody } from './_lib.js';

// Photos and videos go straight from the admin's browser to Blob storage; this route only
// hands out a short-lived upload token to a logged-in admin (so large videos never pass
// through the serverless function size limit).
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!storageReady()) return res.status(503).json({ error: 'not-configured' });
  try {
    const body = await readBody(req);
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!can(isAuthed(req), 'content')) throw new Error('login');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'],
          maximumSizeInBytes: 300 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(e.message === 'login' ? 401 : 400).json({ error: e.message });
  }
}
