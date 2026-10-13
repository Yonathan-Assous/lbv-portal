import { isAuthed, storageReady } from './_lib.js';

// Tells the admin page whether it is logged in and whether storage is connected.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    storage: storageReady() ? 'blob' : 'none',
    configured: Boolean(process.env.ADMIN_PASSWORD),
    authed: isAuthed(req),
  });
}
