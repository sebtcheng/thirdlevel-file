import pool from '../../config/db.js';
import fs from 'fs';
import path from 'path';
import { downloadFromAzure } from '../../utils/azureBlobService.js';

export const getBinary = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM unified_binaries WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Binary not found' });
        
        const { content, mime_type, azure_blob_url } = result.rows[0];
        
        // 1. Database binary content (Primary Source of Truth)
        if (content && content.length > 0) {
            res.setHeader('Content-Type', mime_type || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.send(content);
        }

        // 2. Local disk storage fallback
        if (azure_blob_url && !azure_blob_url.startsWith('http://') && !azure_blob_url.startsWith('https://')) {
            const cleanRelative = azure_blob_url.startsWith('/') ? azure_blob_url.slice(1) : azure_blob_url;
            const localFilePath = path.join(process.cwd(), cleanRelative);
            if (fs.existsSync(localFilePath)) {
                res.setHeader('Content-Type', mime_type || 'application/octet-stream');
                res.setHeader('Cache-Control', 'public, max-age=31536000');
                return res.sendFile(localFilePath);
            }
        }

        // 3. Azure Blob Storage fallback (Stream via authenticated SDK)
        if (azure_blob_url && (azure_blob_url.startsWith('http://') || azure_blob_url.startsWith('https://'))) {
            const azureStream = await downloadFromAzure(azure_blob_url);
            if (azureStream && azureStream.readableStream) {
                res.setHeader('Content-Type', azureStream.contentType || mime_type || 'application/octet-stream');
                res.setHeader('Cache-Control', 'public, max-age=31536000');
                if (azureStream.contentLength) {
                    res.setHeader('Content-Length', azureStream.contentLength);
                }
                return azureStream.readableStream.pipe(res);
            }
        }

        return res.status(404).json({ error: 'Binary content unavailable' });
    } catch (err) {
        console.error('[BinaryController] Fetch error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

