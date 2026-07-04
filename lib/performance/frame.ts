export function getCappedDevicePixelRatio(maxRatio = 1.75) {
  if (typeof window === "undefined") {
    return 1;
  }

  return Math.min(window.devicePixelRatio || 1, maxRatio);
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isLowPowerDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const device = navigator as Navigator & {
    deviceMemory?: number;
  };
  const cores = navigator.hardwareConcurrency ?? 8;

  return (device.deviceMemory !== undefined && device.deviceMemory <= 2) || cores <= 4;
}
