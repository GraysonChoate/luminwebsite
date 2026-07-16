import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site — export plain HTML/CSS/JS to ./out
  output: "export",
  // React StrictMode double-invokes mount/unmount in DEV, which disposes and
  // remounts the R3F <Canvas>; @react-three/postprocessing's EffectComposer
  // then runs addPass against the disposed (null) WebGL context and throws
  // "Cannot read properties of null (reading 'alpha')" — crashing the scene to
  // a black frame. StrictMode is a no-op in production (so this only bit dev),
  // but it made localhost unusable. Off: the scene mounts once and renders.
  reactStrictMode: false,
};

export default nextConfig;
