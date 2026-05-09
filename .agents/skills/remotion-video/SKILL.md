---
name: remotion-video
description: Build and render programmatic videos with Remotion and React. Use when the user wants to generate real MP4/WebM video files from React code, needs frame-accurate animations, data-driven video pipelines, serverless cloud rendering (Lambda), or programmatic rendering via Node.js CLI. NOT the same as the video-js skill — Remotion produces actual rendered video files, not browser animations. Use video-js instead for browser-only animated previews with Framer Motion.
---

# Remotion Video Generation

Remotion turns React components into rendered MP4/WebM files. Every frame is a deterministic snapshot — the framework controls time via `useCurrentFrame()`. This is fundamentally different from browser animations: **CSS transitions and Tailwind animation classes do not work** and will produce broken output.

## When to Use This Skill vs `video-js`

| Need | Use |
|---|---|
| Rendered MP4/WebM file the user can download | **This skill (Remotion)** |
| Serverless cloud rendering / Lambda | **This skill (Remotion)** |
| Data-driven programmatic render pipeline | **This skill (Remotion)** |
| Browser animation preview only | `video-js` (Framer Motion) |
| Canvas iframe embed / mockup | `video-js` |

## Project Setup

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
cd my-video
npm install
```

Recommended folder layout:
```
src/
  Root.tsx           # Register compositions here
  compositions/      # Main video templates
  components/        # Reusable scene components
  hooks/             # Custom hooks (data fetching, calculateMetadata)
  utils/             # interpolation helpers, constants
public/              # Static assets (fonts, images, audio) — use staticFile()
out/                 # Rendered output (gitignore this)
```

## Core Primitives

### 1. Register a Composition (`src/Root.tsx`)

```tsx
import { Composition } from 'remotion';
import { MyVideo } from './compositions/MyVideo';

export const RemotionRoot = () => (
  <>
    <Composition
      id="MyVideo"
      component={MyVideo}
      durationInFrames={150}   // 5 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
```

Multiple compositions can be registered in the same Root — wrap in a Fragment `<>`.

### 2. Frame-Based Animation (the golden pattern)

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

export const MyComp = () => {
  const frame = useCurrentFrame();     // 0-indexed, increments per frame
  const { fps } = useVideoConfig();    // get fps, width, height, durationInFrames

  // Physics-based spring (preferred for UI elements)
  const scale = spring({ frame, fps, config: { damping: 80 } });

  // Linear interpolation with easing + clamping
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Delay an animation by offsetting the frame
  const delayedProgress = spring({ frame: Math.max(0, frame - 20), fps });

  return (
    <div style={{ opacity, transform: `scale(${scale})` }}>
      Content
    </div>
  );
};
```

**Time reference:** `frame / fps = seconds`. At 30fps: frame 30 = 1s, frame 90 = 3s, frame 150 = 5s.

### 3. Sequences — Scene Management

```tsx
import { Sequence } from 'remotion';

export const MyVideo = () => (
  <>
    <Sequence from={0} durationInFrames={60}>
      <IntroScene />
    </Sequence>
    <Sequence from={60} durationInFrames={90}>
      <MainScene />
    </Sequence>
    <Sequence from={150} durationInFrames={60}>
      <OutroScene />
    </Sequence>
  </>
);
```

Inside a `<Sequence>`, `useCurrentFrame()` resets to 0 at the sequence start — each scene component is self-contained.

### 4. Assets — Images, Audio, Video

Always place files in `public/` and reference them with `staticFile()`:

```tsx
import { Img, Audio, Video, staticFile } from 'remotion';

// Image
<Img src={staticFile('hero.png')} />

// Audio with trim and volume
<Audio
  src={staticFile('bgmusic.mp3')}
  startFrom={0}
  endAt={30 * 15}   // trim to 15 seconds
  volume={0.8}
/>

// Video overlay
<Video src={staticFile('background.mp4')} />
```

**Never use bare paths like `src="/hero.png"`** — use `staticFile()` always.

### 5. Dynamic / Data-Driven Compositions

Use `calculateMetadata` when duration or props depend on async data:

```tsx
import { Composition, CalculateMetadataFunction } from 'remotion';
import { z } from 'zod';

const schema = z.object({ videoId: z.string() });

const calculateMetadata: CalculateMetadataFunction<z.infer<typeof schema>> = async ({
  props,
  abortSignal,
}) => {
  const data = await fetch(`https://api.example.com/video/${props.videoId}`, {
    signal: abortSignal,
  }).then((r) => r.json());

  return {
    durationInFrames: Math.ceil(data.duration * 30),
    props: { ...props, title: data.title },
  };
};

// In Root.tsx:
<Composition
  id="DataVideo"
  component={DataVideoComp}
  fps={30}
  width={1920}
  height={1080}
  schema={schema}
  defaultProps={{ videoId: 'abc123' }}
  calculateMetadata={calculateMetadata}
/>
```

## CLI Rendering

```bash
# Basic render
npx remotion render src/index.tsx MyVideo out/video.mp4

# With quality and concurrency flags
npx remotion render MyVideo out/video.mp4 \
  --crf=18 \
  --concurrency=4 \
  --jpeg-quality=90 \
  --codec=h264

# Render a single frame (fast layout check)
npx remotion still MyVideo --scale=0.25 --frame=30

# Find optimal concurrency for your machine
npx remotion benchmark

# Pass input props
npx remotion render MyVideo out/video.mp4 --props='{"title":"Hello"}'
```

**Tip:** Always do a short 3–10 second test render first before committing to a full render.

## Programmatic Rendering (Node.js)

```ts
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const bundleLocation = await bundle({ entryPoint: 'src/index.tsx' });

const composition = await selectComposition({
  serveUrl: bundleLocation,
  id: 'MyVideo',
});

await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264',
  outputLocation: 'out/video.mp4',
  inputProps: { title: 'Hello World' },
  crf: 18,
  onProgress: ({ progress }) => console.log(`${Math.round(progress * 100)}%`),
});
```

## Output Quality Settings

| Use Case | CRF | Notes |
|---|---|---|
| Archive | 15–17 | Maximum quality |
| High-quality release | 18–20 | Recommended default |
| Web delivery | 21–24 | Good balance |
| Preview / draft | 25–28 | Fast, smaller file |

- **Codec:** H.264 (yuv420p + AAC) for max compatibility. H.265/VP9 for smaller files.
- **Sharpness on Retina:** Use `--scale=2` to render at 2x resolution for crisp text on HiDPI displays.
- **Color accuracy:** Export in bt709 (Remotion v4.0.138+).
- **PNG frames:** `--image-format=png` for lossless screenshots (slower but pixel-perfect).

## Performance Optimization

```tsx
import { freeze } from 'remotion';

// Freeze a static component so it never re-renders after mount
const FrozenBg = freeze(BackgroundComponent);
```

- Use `freeze()` on components that don't animate after they appear.
- Memoize `inputProps` when using the `<Player>` component — unmemoized props cause full re-renders every frame.
- Avoid GPU-heavy CSS (`box-shadow`, `filter: blur()`, `drop-shadow()`, gradients) on cloud rendering instances — no GPU available. Replace with precomputed images when possible.
- `useCurrentFrame()` re-renders the component every frame — minimize work inside hot components.
- Run `npx remotion benchmark` to find optimal `--concurrency` for your machine.

## Lambda / Serverless Rendering

```bash
npm install @remotion/lambda

# One-time setup
npx remotion lambda functions deploy
npx remotion lambda sites create src/index.tsx --site-name=my-video

# Render on Lambda
npx remotion lambda render my-video MyVideo --props='{"title":"Hello"}'
```

Key Lambda notes:
- Adding more memory also scales CPU proportionally — faster renders, higher cost.
- Default codec: H.264 + AAC. Set `audioCodec: 'mp3'` to speed up the "combining videos" stage.
- `abortSignal` in `calculateMetadata` lets you cancel renders triggered by stale requests.

## Ecosystem Packages

| Package | Purpose |
|---|---|
| `@remotion/player` | Embed video preview in a React app |
| `@remotion/lambda` | Serverless cloud rendering |
| `@remotion/three` | 3D via React Three Fiber |
| `@remotion/transitions` | Scene transition helpers |
| `@remotion/lottie` | Lottie animation support |
| `@remotion/google-fonts` | Load Google Fonts reliably |
| `@remotion/light-leaks` | Light leak overlay effects |

## Critical Rules — Common Pitfalls

| Do NOT | Do Instead |
|---|---|
| `transition: opacity 0.5s` in CSS | `interpolate(frame, [0, 15], [0, 1])` |
| Tailwind `animate-*` classes | Frame-driven inline `style={}` |
| `useFrame()` from React Three Fiber | `useCurrentFrame()` from Remotion |
| `src="/image.png"` bare paths | `staticFile('image.png')` |
| Assume `window` / `document` available | Guard: `typeof window !== 'undefined'` |
| High concurrency without benchmarking | Run `npx remotion benchmark` first |
| Heavy CSS filters on cloud renders | Use precomputed images instead |

## Embedding a Preview in a React App (`<Player>`)

```tsx
import { Player } from '@remotion/player';
import { MyVideo } from './compositions/MyVideo';

export const VideoPreview = () => (
  <Player
    component={MyVideo}
    inputProps={{ title: 'Hello World' }}
    durationInFrames={150}
    compositionWidth={1920}
    compositionHeight={1080}
    fps={30}
    style={{ width: '100%' }}
    controls
  />
);
```

Always memoize `inputProps` passed to `<Player>`:
```tsx
const inputProps = useMemo(() => ({ title }), [title]);
```
