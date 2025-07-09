import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types/index.ts',
    utils: 'src/utils/index.ts',
    constants: 'src/constants/index.ts',
    signaling: 'src/signaling/index.ts',
    room: 'src/room/index.ts',
    webrtc: 'src/webrtc/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
})