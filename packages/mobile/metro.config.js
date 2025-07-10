const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve modules from the monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure Metro includes workspace packages
config.resolver.extraNodeModules = {
  '@vibe/core': path.resolve(monorepoRoot, 'packages/core'),
  '@vibe/api': path.resolve(monorepoRoot, 'packages/api'),
  '@vibe/components-native': path.resolve(monorepoRoot, 'packages/components-native'),
};

module.exports = config;