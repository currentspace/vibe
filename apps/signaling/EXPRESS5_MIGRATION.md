# Express 5 Migration Guide

## Overview
This document outlines the changes made to migrate the signaling server from Express 4 to Express 5.

## Changes Made

### 1. Dependencies
- Updated `express` from `^4.21.2` to `^5.1.0`
- Updated `@types/express` to `^5.0.2` for TypeScript support

### 2. Type Imports
Added explicit type imports for better TypeScript support:
```typescript
import express, { Request, Response, NextFunction, RequestHandler } from 'express'
```

### 3. Route Handler Type Casting
Due to TypeScript type inference issues with Express 5, route handlers needed explicit type casting:
```typescript
app.get('/health', ((req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
}) as RequestHandler)
```

### 4. Error Handling
Added proper error handling middleware with all 4 parameters required by Express 5:
```typescript
app.use(((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.stack)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
}) as express.ErrorRequestHandler)
```

### 5. 404 Handler
Added a catch-all 404 handler before the error handler:
```typescript
app.use(((req, res) => {
  res.status(404).json({ error: 'Not found' })
}) as RequestHandler)
```

### 6. Test Environment Check
Added environment check to prevent server from starting during tests:
```typescript
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`Signaling server running on http://localhost:${PORT}`)
  })
}
```

### 7. Test Configuration
Updated test scripts to set NODE_ENV:
```json
"test": "NODE_ENV=test vitest",
"test:watch": "NODE_ENV=test vitest --watch"
```

## Breaking Changes in Express 5

### What Changed
1. **Router Behavior**: Express 5 has stricter router parameter matching
2. **Error Handling**: Error middleware must have exactly 4 parameters
3. **Async Handlers**: Better native support for async route handlers (though we didn't need them here)
4. **Type Definitions**: Some TypeScript types have changed requiring explicit casting

### What Stayed the Same
1. **Middleware**: Standard middleware like `cors` and `express.json()` work unchanged
2. **Socket.io Integration**: No changes needed for WebSocket handling
3. **HTTP Methods**: All HTTP method handlers work the same
4. **Request/Response Objects**: Core req/res API remains compatible

## Testing
All existing tests pass without modification, confirming backward compatibility for our use case.

## Performance
Express 5 includes performance improvements:
- Faster routing
- Better memory usage
- Improved error handling performance

## Future Considerations
1. Consider using async route handlers when adding database operations
2. Explore new Express 5 features like improved middleware composition
3. Monitor for TypeScript type definition improvements