import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadRequest } from '../../app/lib/upload-validation.ts';

describe('validateUploadRequest', () => {
  it('accepts valid image, audio, video, and PDF uploads and sanitizes filenames', () => {
    const img = validateUploadRequest('My Headshot (2026).JPG', 'image/jpeg');
    assert.equal(img.ok, true);
    if (img.ok) {
      assert.equal(img.safeFilename, 'My-Headshot-2026.JPG');
      assert.equal(img.contentType, 'image/jpeg');
    }

    const audio = validateUploadRequest('backing track.mp3', 'audio/mpeg');
    assert.equal(audio.ok, true);

    const pdf = validateUploadRequest('waiver.pdf', 'application/pdf');
    assert.equal(pdf.ok, true);
  });

  it('strips directory traversal segments from filenames', () => {
    const res = validateUploadRequest('../../etc/passwd.png', 'image/png');
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.safeFilename, 'passwd.png');
    }
  });

  it('rejects disallowed MIME types and missing fields', () => {
    const html = validateUploadRequest('evil.html', 'text/html');
    assert.equal(html.ok, false);

    const js = validateUploadRequest('script.js', 'application/javascript');
    assert.equal(js.ok, false);

    const missing = validateUploadRequest('', 'image/png');
    assert.equal(missing.ok, false);
  });
});
