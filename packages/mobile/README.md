# @vibe/mobile

React Native client for the Vibe video chat application.

## Setup

### Prerequisites

- iOS: Xcode 15+ and iOS Simulator
- Android: Android Studio and Android SDK
- CocoaPods: `brew install cocoapods`

### Installation

From the root of the monorepo:

```bash
# Install dependencies
pnpm install

# iOS specific setup
cd packages/mobile/ios && pod install
```

## Development

### From monorepo root:

```bash
# Run iOS simulator
pnpm dev:mobile:ios

# Run Android emulator
pnpm dev:mobile:android

# Run with web and signaling servers
pnpm dev:all
```

### From this directory:

```bash
# Start Metro bundler
pnpm start

# Run iOS
pnpm ios

# Run Android
pnpm android
```

## Building

```bash
# Create a prebuild
pnpm prebuild

# Build for iOS
pnpm build:ios

# Build for Android
pnpm build:android
```

## Architecture

This package uses:
- Expo SDK 54 (canary)
- React Native 0.80.1
- React 19.1
- TypeScript

The app integrates with:
- `@vibe/core` - Core business logic and types
- `@vibe/api` - API client for signaling server communication
- `@vibe/components-native` - Shared React Native components (planned)