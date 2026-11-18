import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/features/pooling/repositories/documentRepository.js', () => ({
  storeApplicationDocument: vi.fn(),
  relinkApplicationDocument: vi.fn()
}));

import { uploadApplicationDocument, restoreApplicationDocument } from '../src/features/pooling/documentUpload.js';
import { storeApplicationDocument, relinkApplicationDocument } from '../src/features/pooling/repositories/documentRepository.js';
import { getBinary } from '../src/features/binary/controller.js';
import pool from '../src/config/db.js';

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
const pdf = Buffer.from('%PDF-1.4 test');

describe('Application document upload', () => {
  beforeEach(() => vi.resetAllMocks());

  it('rejects an empty upload', async () => {
    const res = response();
    await uploadApplicationDocument({ file: { size: 0, buffer: Buffer.alloc(0) } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(storeApplicationDocument).not.toHaveBeenCalled();
  });

  it('stores a valid file and returns its binary reference', async () => {
    storeApplicationDocument.mockResolvedValue({ binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f', stored_size: 42 });
    const res = response();
    await uploadApplicationDocument({ file: { size: pdf.length, buffer: pdf, mimetype: 'application/pdf', originalname: 'PDS.pdf' } }, res);
    expect(storeApplicationDocument).toHaveBeenCalledWith(pdf, 'application/pdf');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.objectContaining({
      binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f', file_name: 'PDS.pdf', size_bytes: 42
    }) });
  });

  it('hides storage errors from the client', async () => {
    storeApplicationDocument.mockRejectedValue(new Error('database unavailable'));
    const res = response();
    await uploadApplicationDocument({ file: { size: pdf.length, buffer: pdf, mimetype: 'application/pdf', originalname: 'PDS.pdf' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Could not store the document. Please try again.' });
  });
});

describe('Binary preview', () => {
  it('refuses browser-only ids without querying the database', async () => {
    const query = vi.spyOn(pool, 'query');
    const res = response();
    await getBinary({ params: { id: 'bin-me2618z8-1794458893205' } }, res);
    expect(query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    query.mockRestore();
  });
});

describe('Restoring legacy browser-only documents', () => {
  beforeEach(() => vi.resetAllMocks());

  const file = { size: pdf.length, buffer: pdf, mimetype: 'application/pdf', originalname: 'PDS.pdf' };

  it('requires authentication and a valid application id', async () => {
    const unauthenticated = response();
    await restoreApplicationDocument({ params: { id: '5', docType: 'pds' }, file }, unauthenticated);
    expect(unauthenticated.status).toHaveBeenCalledWith(401);

    const invalid = response();
    await restoreApplicationDocument({ user: { uid: 'owner' }, params: { id: 'abc', docType: 'pds' }, file }, invalid);
    expect(invalid.status).toHaveBeenCalledWith(400);
    expect(storeApplicationDocument).not.toHaveBeenCalled();
  });

  it('does not relink another candidate application', async () => {
    storeApplicationDocument.mockResolvedValue({ binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f', stored_size: 42 });
    relinkApplicationDocument.mockResolvedValue({ found: false, relinked: false });
    const res = response();
    await restoreApplicationDocument({ user: { uid: 'stranger' }, params: { id: '5', docType: 'pds' }, file }, res);
    expect(relinkApplicationDocument).toHaveBeenCalledWith('stranger', 5, 'pds', expect.objectContaining({ binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f' }));
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('reports when the document is already stored on the server', async () => {
    storeApplicationDocument.mockResolvedValue({ binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f', stored_size: 42 });
    relinkApplicationDocument.mockResolvedValue({ found: true, relinked: false });
    const res = response();
    await restoreApplicationDocument({ user: { uid: 'owner' }, params: { id: '5', docType: 'pds' }, file }, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns the server-stored attachment for the owner', async () => {
    storeApplicationDocument.mockResolvedValue({ binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f', stored_size: 42 });
    relinkApplicationDocument.mockResolvedValue({
      found: true, relinked: true,
      attachment: { doc_type: 'pds', binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f', file_name: 'PDS.pdf' }
    });
    const res = response();
    await restoreApplicationDocument({ user: { uid: 'owner' }, params: { id: '5', docType: 'pds' }, file }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.objectContaining({
      doc_type: 'pds', binary_id: '9c9c0a52-0d6a-4a4f-8b57-69f5d33d7d5f'
    }) });
  });
});
