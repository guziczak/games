export interface PlatformCapabilities {
  readonly webgl2: boolean;
  readonly reducedMotion: boolean;
  readonly coarsePointer: boolean;
  readonly touchPoints: number;
}

export function probeCapabilities(documentRef: Document = document): PlatformCapabilities {
  const probe = documentRef.createElement('canvas');
  let webgl2 = false;

  try {
    webgl2 = Boolean(probe.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
    }));
  } catch {
    webgl2 = false;
  }

  return Object.freeze({
    webgl2,
    reducedMotion: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    coarsePointer: globalThis.matchMedia?.('(pointer: coarse)').matches ?? false,
    touchPoints: globalThis.navigator?.maxTouchPoints ?? 0,
  });
}
