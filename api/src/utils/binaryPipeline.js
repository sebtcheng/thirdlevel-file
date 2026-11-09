import crypto from 'crypto';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { fileURLToPath } from 'url';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.resolve(process.cwd(), 'compress_pdf.py');

/**
 * Robust cleanup helper for temporary files.
 * @param {string} filePath 
 */
function safeUnlink(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error(`⚠️ [BinaryPipeline] Cleanup failed for ${filePath}:`, err.message);
        }
    }
}

const WEBP_MAX_WIDTH = 1200;
const WEBP_QUALITY = 65;

/**
 * Compress an image buffer to WebP (Extreme Leanness).
 */
export async function compressToWebP(inputBuffer) {
    return sharp(inputBuffer)
        .resize({ width: WEBP_MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toBuffer();
}

/**
 * Compress a PDF buffer (96 DPI Optimized).
 * Uses the external 'compress_pdf.py' script for heavy-duty compression.
 */
export async function compressPDF(inputBuffer) {
    const tempId = Date.now() + Math.random().toString(36).substring(7);
    const tempIn = path.join(os.tmpdir(), `bin_in_${tempId}.pdf`);
    const tempOut = path.join(os.tmpdir(), `bin_out_${tempId}.pdf`);

    try {
        fs.writeFileSync(tempIn, inputBuffer);
        
        // Strategy: Try 'python', 'py', 'python3' for cross-platform robustness
        const cmdPattern = (py) => `${py} "${SCRIPT_PATH.replace(/\\/g, '/')}" "${tempIn.replace(/\\/g, '/')}" "${tempOut.replace(/\\/g, '/')}" 96`;
        
        let success = false;
        const pyCommands = ['python', 'py', 'python3'];
        
        for (const py of pyCommands) {
            try {
                await execAsync(cmdPattern(py));
                if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 0) {
                    success = true;
                    break;
                }
            } catch (err) {
                const msg = err.stderr || err.stdout || err.message || '';
                // Only log if it's a real Python error, not just a missing executor
                if (!msg.includes('not recognized') && !msg.includes('not found') && !msg.includes('No such file')) {
                    console.warn(`⚠️ [BinaryPipe-Compress] ${py} failed:`, msg);
                }
            }
        }

        if (success) {
            const optimizedBuffer = fs.readFileSync(tempOut);
            // Only use optimized if it's actually smaller
            if (optimizedBuffer.length < inputBuffer.length) {
                console.log(`[BinaryPipeline] PDF Optimized: ${(inputBuffer.length / 1024).toFixed(1)}KB -> ${(optimizedBuffer.length / 1024).toFixed(1)}KB`);
                return optimizedBuffer;
            }
            console.log(`[BinaryPipeline] PDF Optimization skipped (original smaller/equal)`);
        } else {
            console.warn('[BinaryPipeline] PDF Optimization failed all Python executors, skipping.');
        }

        return inputBuffer;
    } catch (err) {
        console.error('[BinaryPipeline] PDF compression logic error:', err.message);
        return inputBuffer;
    } finally {
        safeUnlink(tempIn);
        safeUnlink(tempOut);
    }
}

/**
 * Compute SHA-256 hex digest of a buffer.
 * @param {Buffer} buf
 * @returns {string}
 */
export function sha256(buf) {
    return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Determine if a MIME type is an image type we can compress.
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isCompressibleImage(mimeType) {
    return /^image\/(jpeg|jpg|png|gif|bmp|tiff|webp)$/i.test(mimeType);
}

/**
 * Upsert a binary into unified_binaries with deduplication.
 * Returns the binary_id (UUID) — existing if duplicate, new if first time.
 *
 * @param {import('pg').Pool} pool
 * @param {Buffer} rawBuffer  — unprocessed or pre-compressed upload buffer
 * @param {string} mimeType
 * @param {number} [originalSize] — true original size if rawBuffer is already compressed
 * @returns {Promise<{ binary_id: string, deduplicated: boolean, stored_size: number, original_size: number }>}
 */
export async function upsertBinary(pool, rawBuffer, mimeType, originalSize) {
    let finalBuffer = rawBuffer;
    let finalMime = mimeType;
    const trueOriginalSize = originalSize || rawBuffer.length;

    // Skip compression if the buffer appears to be already optimized (size mismatch with originalSize)
    // or if the user explicitly wants to store it as is.
    const alreadyOptimized = originalSize && originalSize > rawBuffer.length;

    if (!alreadyOptimized) {
        if (isCompressibleImage(mimeType)) {
            try {
                finalBuffer = await compressToWebP(rawBuffer);
                finalMime = 'image/webp';
            } catch (err) {
                console.warn('[BinaryPipeline] WebP conversion failed, using original:', err.message);
            }
        } else if (mimeType === 'application/pdf') {
            try {
                finalBuffer = await compressPDF(rawBuffer);
            } catch (err) {
                console.warn('[BinaryPipeline] PDF compression failed, using original:', err.message);
            }
        }
    }

    console.log('[BinaryPipeline] Calling sha256');
    const hash = sha256(finalBuffer);

    console.log('[BinaryPipeline] Checking existing deduplication...');
    // Deduplication check
    const existing = await pool.query(
        'SELECT id FROM unified_binaries WHERE hash = $1',
        [hash]
    );
    console.log(`[BinaryPipeline] Deduplication check done, found: ${existing.rows.length}`);

    if (existing.rows.length > 0) {
        const existingId = existing.rows[0].id;
        // Fetch actual size for accurate metadata persistence
        const sizeRes = await pool.query('SELECT size_bytes FROM unified_binaries WHERE id = $1', [existingId]);
        const actualSize = sizeRes.rows.length > 0 ? Number(sizeRes.rows[0].size_bytes) : finalBuffer.length;

        return {
            binary_id: existingId,
            deduplicated: true,
            stored_size: actualSize,
            original_size: trueOriginalSize
        };
    }

    const insertResult = await pool.query(
        `INSERT INTO unified_binaries (hash, content, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [hash, finalBuffer, finalMime, finalBuffer.length]
    );

    return {
        binary_id: insertResult.rows[0].id,
        deduplicated: false,
        stored_size: finalBuffer.length,
        original_size: trueOriginalSize
    };
}
