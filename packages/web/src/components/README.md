# WebGL Components

This directory contains WebGL demonstration components showing different approaches to 3D graphics in React.

## Components

### ModernWebGL.tsx
- Pure WebGL implementation with animation
- Features: rotating rainbow hexagon, FPS counter, responsive canvas
- Uses WebGL 2 with fallback to WebGL 1
- Manual shader compilation and buffer management

### ThreeJSHexagon.tsx
- Three.js implementation using React Three Fiber
- Same visual output as ModernWebGL but with declarative API
- Features: interactive orbit controls, built-in performance monitoring
- Demonstrates the ergonomic advantages of using a 3D library

### SimpleWebGL.tsx
- Minimal WebGL example - just a red triangle
- Used for testing basic WebGL functionality
- Good starting point for understanding WebGL basics

### WebGLCanvas.tsx (deprecated)
- Original WebGL implementation with issues
- Kept for reference but not actively used

## Key Differences

**Pure WebGL (ModernWebGL)**
- Direct control over rendering pipeline
- Smaller bundle size (no dependencies)
- More complex code
- Manual resource management

**Three.js (ThreeJSHexagon)**
- Declarative React-like API
- Larger bundle size (~150KB gzipped)
- Simpler, more maintainable code
- Automatic resource management
- Rich ecosystem of helpers and plugins

## Performance

Both implementations achieve 60 FPS for this simple scene. Three.js adds minimal overhead and provides better optimizations for complex scenes.

## Recommendations

- Use Three.js/React Three Fiber for most production applications
- Use pure WebGL only when bundle size is critical or you need specific low-level optimizations
- Consider code-splitting Three.js to reduce initial bundle impact