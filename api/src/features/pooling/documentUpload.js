import multer from 'multer';
import { storeApplicationDocument, relinkApplicationDocument } from './repositories/documentRepository.js';

const receiveFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    done(
      allowed.includes(file.mimetype) ? null : new Error('Upload a PDF, Word (.doc/.docx), JPG, PNG, or WebP file.'),
      allowed.includes(file.mimetype)
    );
  }
}).single('file');

export const receiveApplicationDocument = (req, res, next) => {
  receiveFile(req, res, error => {
    if (error) return res.status(400).json({ success: false, error: error.code === 'LIMIT_FILE_SIZE' ? 'Document exceeds the 10 MB limit.' : error.message });
    next();
  });
};

const storedResponse = (file, stored) => ({
  binary_id: stored.binary_id,
  file_name: file.originalname,
  mime_type: file.mimetype,
  size_bytes: stored.stored_size,
  uploaded_at: new Date().toISOString()
});

export const uploadApplicationDocument = async (req, res) => {
  if (!req.file || !req.file.size) {
    return res.status(400).json({ success: false, error: 'A non-empty document is required.' });
  }
  try {
    const stored = await storeApplicationDocument(req.file.buffer, req.file.mimetype);
    res.status(201).json({ success: true, data: storedResponse(req.file, stored) });
  } catch (_err) {
    res.status(500).json({ success: false, error: 'Could not store the document. Please try again.' });
  }
};

// POST /api/pooling/history/:id/documents/:docType
// Re-uploads a document that was previously kept only in the applicant's browser and points
// the stored application at the new server copy.
export const restoreApplicationDocument = async (req, res) => {
  const candidateId = req.user?.uid || req.user?.TLOid || req.user?.id;
  if (!candidateId) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required.' });
  }
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid application id.' });
  }
  const docType = String(req.params.docType || '');
  if (!docType || docType.length > 100) {
    return res.status(400).json({ success: false, error: 'Invalid document type.' });
  }
  if (!req.file || !req.file.size) {
    return res.status(400).json({ success: false, error: 'A non-empty document is required.' });
  }
  try {
    const stored = await storeApplicationDocument(req.file.buffer, req.file.mimetype);
    const result = await relinkApplicationDocument(candidateId, id, docType, storedResponse(req.file, stored));
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Application not found.' });
    }
    if (!result.relinked) {
      return res.status(409).json({ success: false, error: 'This document is already stored on the server. Refresh to see the latest copy.' });
    }
    res.json({ success: true, data: result.attachment });
  } catch (_err) {
    res.status(500).json({ success: false, error: 'Could not restore the document. Please try again.' });
  }
};
