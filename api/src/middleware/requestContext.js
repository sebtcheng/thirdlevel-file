import crypto from 'crypto';

const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;
const MASKED_FIELDS = ['error', 'message', 'details', 'detail', 'stack'];

// Assigns a request ID, logs one line per request, and masks raw error text in 5xx JSON responses.
export default function requestContext(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && SAFE_ID.test(incoming) ? incoming : crypto.randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);

  const started = process.hrtime.bigint();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === 'object' && !Array.isArray(body)) {
      console.error(`[${id}] ${req.method} ${req.originalUrl} -> ${res.statusCode} masked error:`, body.error ?? body.message ?? body);
      const masked = { ...body };
      for (const f of MASKED_FIELDS) delete masked[f];
      return originalJson({ ...masked, success: body.success === undefined ? undefined : false, error: 'Internal server error', requestId: id });
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(`[${id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
}
