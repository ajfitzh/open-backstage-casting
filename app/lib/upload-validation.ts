const ALLOWED_MIME_PREFIXES = ['image/', 'audio/', 'video/'] as const;
const ALLOWED_EXACT_MIMES = new Set(['application/pdf']);

export function validateUploadRequest(filename: unknown, fileType: unknown):
  | { ok: true; safeFilename: string; contentType: string }
  | { ok: false; error: string } {
  if (typeof filename !== 'string' || !filename.trim()) {
    return { ok: false, error: 'Missing or invalid filename.' };
  }

  if (typeof fileType !== 'string' || !fileType.trim()) {
    return { ok: false, error: 'Missing or invalid fileType.' };
  }

  // Strip codec suffixes like "video/webm;codecs=vp8,opus" so S3 Content-Type signing stays clean
  const normalizedType = fileType.split(';')[0].trim().toLowerCase();
  const isAllowedType =
    ALLOWED_EXACT_MIMES.has(normalizedType) ||
    ALLOWED_MIME_PREFIXES.some((prefix) => normalizedType.startsWith(prefix));

  if (!isAllowedType) {
    return { ok: false, error: `Unsupported file type: ${normalizedType}` };
  }

  // Strip directory segments and unsafe characters to prevent path traversal
  const basename = filename.split(/[\\/]/).pop() || '';
  const sanitized = basename
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');

  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return { ok: false, error: 'Invalid filename after sanitization.' };
  }

  return {
    ok: true,
    safeFilename: sanitized.slice(0, 120),
    contentType: normalizedType,
  };
}
