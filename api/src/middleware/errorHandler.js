// Global error handler: logs the raw error with the request ID, never returns it to the client.
export default function errorHandler(err, req, res, next) {
  console.error(`[${req.id || '-'}] Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  const message = status === 500 ? 'Internal server error' : 'Request could not be processed';
  res.status(status).json({ error: message, requestId: req.id });
}
