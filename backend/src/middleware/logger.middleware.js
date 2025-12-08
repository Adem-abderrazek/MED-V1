/**
 * Request logging middleware
 * Logs incoming requests with method, URL, and timestamp
 */
export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
};

/**
 * Response logging middleware
 * Logs response status and time taken
 */
export const responseLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    
    console.log(
      `${statusEmoji} ${req.method} ${req.originalUrl} - ${status} - ${duration}ms`
    );
  });
  
  next();
};
