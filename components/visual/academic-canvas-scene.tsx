"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import {
  getCappedDevicePixelRatio,
  isLowPowerDevice,
  prefersReducedMotion,
} from "@/lib/performance/frame";
import type { CanvasSceneVariant } from "@/lib/visual/types";

export type { CanvasSceneVariant };

type Particle = {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
};

type SceneContext = {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  particles: Particle[];
  elapsedSeconds: number;
  alpha: number;
  reduceMotion: boolean;
  variant: CanvasSceneVariant;
};

function createParticles(count: number, variant: CanvasSceneVariant): Particle[] {
  const variantSeed = {
    "landing-blueprint": 31,
    "dashboard-orbit": 47,
    "curriculum-map": 53,
    "grades-waveform": 59,
    "planner-path": 61,
    "analytics-grid": 67,
    "loading-orbit": 89,
  }[variant];

  return Array.from({ length: count }, (_, index) => {
    const band = index % 7;

    return {
      x: (((index + 1) * (97 + variantSeed)) % 1000) / 1000,
      y: (((index + 3) * (193 + variantSeed)) % 1000) / 1000,
      r: 1.1 + (band % 3) * 0.42,
      speed: 0.014 + band * 0.0035,
      phase: index * 0.61 + variantSeed,
    };
  });
}

function drawSoftGrid(context: CanvasRenderingContext2D, width: number, height: number, alpha: number) {
  const gridSize = Math.max(26, Math.min(54, width / 16));

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = "rgba(255, 255, 255, 0.16)";
  context.lineWidth = 1;

  for (let x = 0; x <= width; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let y = 0; y <= height; y += gridSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  context.restore();
}

function drawParticles({
  context,
  width,
  height,
  particles,
  elapsedSeconds,
  reduceMotion,
}: SceneContext) {
  context.save();

  for (const particle of particles) {
    const drift = reduceMotion ? 0 : elapsedSeconds * particle.speed;
    const x = ((particle.x + drift) % 1) * width;
    const y = (particle.y + Math.sin(elapsedSeconds * 0.42 + particle.phase) * 0.018) * height;

    context.beginPath();
    context.fillStyle = "rgba(255, 255, 255, 0.58)";
    context.arc(x, y, particle.r, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawBlueprintNodes(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  alpha = 0.72,
) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = "rgba(255, 255, 255, 0.42)";
  context.fillStyle = "rgba(7, 102, 255, 0.72)";
  context.lineWidth = 2;
  context.setLineDash([10, 12]);
  context.beginPath();

  points.forEach(([x, y], index) => {
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });

  context.stroke();
  context.setLineDash([]);

  points.forEach(([x, y], index) => {
    context.beginPath();
    context.fillStyle = index % 2 ? "rgba(255, 255, 255, 0.66)" : "rgba(7, 102, 255, 0.78)";
    context.arc(x, y, 4.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.34)";
    context.stroke();
  });

  context.restore();
}

function drawLandingBlueprint(scene: SceneContext) {
  const { context, width, height, elapsedSeconds, reduceMotion } = scene;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(7, 102, 255, 0.22)");
  gradient.addColorStop(0.48, "rgba(255, 255, 255, 0.06)");
  gradient.addColorStop(1, "rgba(0, 25, 54, 0.24)");

  drawSoftGrid(context, width, height, 0.42);

  context.save();
  context.strokeStyle = gradient;
  context.lineWidth = Math.max(1, width / 920);

  for (let row = 0; row < 7; row += 1) {
    const y = (height * (row + 1)) / 8;
    context.beginPath();

    for (let step = 0; step <= 26; step += 1) {
      const x = (width * step) / 26;
      const motion = reduceMotion ? 0 : elapsedSeconds * 0.55;
      const wave = Math.sin(step * 0.82 + row + motion) * (height * 0.014);

      if (step === 0) {
        context.moveTo(x, y + wave);
      } else {
        context.lineTo(x, y + wave);
      }
    }

    context.stroke();
  }

  context.restore();
  drawBlueprintNodes(context, [
    [width * 0.16, height * 0.72],
    [width * 0.32, height * 0.56],
    [width * 0.48, height * 0.62],
    [width * 0.66, height * 0.42],
    [width * 0.82, height * 0.48],
  ], 0.5);
  drawParticles(scene);
}

function drawOrbit(scene: SceneContext) {
  const { context, width, height, elapsedSeconds, reduceMotion, variant } = scene;
  const centerX = width * (variant === "dashboard-orbit" ? 0.66 : 0.5);
  const centerY = height * 0.52;
  const radiusBase = Math.min(width, height) * 0.19;
  const spin = reduceMotion ? 0 : elapsedSeconds * 0.34;

  drawSoftGrid(context, width, height, 0.24);

  context.save();
  context.translate(centerX, centerY);

  for (let ring = 0; ring < 4; ring += 1) {
    const radius = radiusBase + ring * (radiusBase * 0.42);
    context.beginPath();
    context.strokeStyle = ring % 2 ? "rgba(255, 255, 255, 0.16)" : "rgba(7, 102, 255, 0.24)";
    context.lineWidth = Math.max(1, width / 1100);
    context.setLineDash(ring % 2 ? [8, 12] : []);
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.setLineDash([]);

  for (let node = 0; node < 8; node += 1) {
    const angle = spin + (node / 8) * Math.PI * 2;
    const radius = radiusBase * (1.1 + (node % 3) * 0.42);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.72;

    context.beginPath();
    context.fillStyle = node % 2 ? "rgba(255, 255, 255, 0.62)" : "rgba(7, 102, 255, 0.72)";
    context.arc(x, y, Math.max(2.2, width / 380), 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
  drawParticles(scene);
}

function drawAnalyticsGrid(scene: SceneContext) {
  const { context, width, height, elapsedSeconds, reduceMotion } = scene;
  const motion = reduceMotion ? 0 : elapsedSeconds;
  const left = width * 0.12;
  const bottom = height * 0.78;
  const chartWidth = width * 0.76;
  const chartHeight = height * 0.52;

  drawSoftGrid(context, width, height, 0.3);

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.24)";
  context.lineWidth = Math.max(1, width / 900);
  context.beginPath();
  context.moveTo(left, bottom - chartHeight);
  context.lineTo(left, bottom);
  context.lineTo(left + chartWidth, bottom);
  context.stroke();

  const gradient = context.createLinearGradient(0, bottom - chartHeight, 0, bottom);
  gradient.addColorStop(0, "rgba(7, 102, 255, 0.38)");
  gradient.addColorStop(1, "rgba(7, 102, 255, 0.02)");
  context.fillStyle = gradient;

  context.beginPath();
  context.moveTo(left, bottom);
  for (let index = 0; index <= 12; index += 1) {
    const x = left + (chartWidth * index) / 12;
    const trend = 0.42 + index * 0.035;
    const pulse = Math.sin(index * 0.92 + motion * 1.2) * 0.08;
    const y = bottom - chartHeight * Math.min(0.88, trend + pulse);

    if (index === 0) {
      context.lineTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.lineTo(left + chartWidth, bottom);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.62)";
  context.lineWidth = Math.max(2, width / 420);
  context.beginPath();
  for (let index = 0; index <= 12; index += 1) {
    const x = left + (chartWidth * index) / 12;
    const trend = 0.42 + index * 0.035;
    const pulse = Math.sin(index * 0.92 + motion * 1.2) * 0.08;
    const y = bottom - chartHeight * Math.min(0.88, trend + pulse);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.stroke();

  context.restore();
  drawParticles(scene);
}

function drawCurriculumMap(scene: SceneContext) {
  const { context, width, height, elapsedSeconds, reduceMotion } = scene;
  const motion = reduceMotion ? 0 : elapsedSeconds * 0.18;
  const startX = width * 0.14;
  const rowGap = height * 0.17;
  const points = Array.from({ length: 5 }, (_, index): [number, number] => [
    startX + width * 0.17 * index,
    height * (0.24 + (index % 2) * 0.12) + Math.sin(motion + index) * height * 0.01,
  ]);

  drawSoftGrid(context, width, height, 0.28);
  drawBlueprintNodes(context, points, 0.78);

  context.save();
  context.strokeStyle = "rgba(7, 102, 255, 0.22)";
  context.lineWidth = Math.max(1, width / 820);

  for (let row = 0; row < 4; row += 1) {
    const y = height * 0.5 + row * rowGap * 0.55;
    context.beginPath();
    context.moveTo(width * 0.12, y);
    context.lineTo(width * 0.88, y);
    context.stroke();

    for (let node = 0; node < 4; node += 1) {
      const x = width * (0.18 + node * 0.18);
      context.strokeRect(x, y - 10, width * 0.08, 20);
    }
  }

  context.restore();
  drawParticles(scene);
}

function drawGradesWaveform(scene: SceneContext) {
  const { context, width, height, elapsedSeconds, reduceMotion } = scene;
  const motion = reduceMotion ? 0 : elapsedSeconds * 1.2;
  const baseline = height * 0.54;

  drawSoftGrid(context, width, height, 0.22);

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.56)";
  context.lineWidth = Math.max(2, width / 460);
  context.beginPath();

  for (let step = 0; step <= 48; step += 1) {
    const x = (width * step) / 48;
    const amplitude = height * (0.055 + (step % 5) * 0.006);
    const y = baseline + Math.sin(step * 0.62 + motion) * amplitude;

    if (step === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();

  for (let bar = 0; bar < 10; bar += 1) {
    const x = width * (0.12 + bar * 0.078);
    const barHeight = height * (0.12 + ((bar * 7) % 5) * 0.036);
    context.fillStyle = bar % 3 ? "rgba(7, 102, 255, 0.24)" : "rgba(255, 255, 255, 0.2)";
    context.fillRect(x, height * 0.78 - barHeight, width * 0.024, barHeight);
  }

  context.restore();
  drawParticles(scene);
}

function drawPlannerPath(scene: SceneContext) {
  const { context, width, height, elapsedSeconds, reduceMotion } = scene;
  const motion = reduceMotion ? 0 : elapsedSeconds * 0.24;
  const points: Array<[number, number]> = [
    [width * 0.12, height * 0.72],
    [width * 0.28, height * 0.52 + Math.sin(motion) * 5],
    [width * 0.44, height * 0.6],
    [width * 0.62, height * 0.38 + Math.cos(motion) * 5],
    [width * 0.82, height * 0.46],
  ];

  drawSoftGrid(context, width, height, 0.24);

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.48)";
  context.lineWidth = Math.max(2, width / 520);
  context.setLineDash([12, 10]);
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);

  for (let index = 1; index < points.length; index += 1) {
    const [x, y] = points[index];
    const [previousX, previousY] = points[index - 1];
    context.quadraticCurveTo((previousX + x) / 2, previousY - height * 0.08, x, y);
  }

  context.stroke();
  context.setLineDash([]);
  context.restore();
  drawBlueprintNodes(context, points, 0.86);
  drawParticles(scene);
}

function drawScene(scene: SceneContext) {
  const { context, width, height, alpha, variant } = scene;

  context.clearRect(0, 0, width, height);
  context.save();
  context.globalAlpha = alpha;

  if (variant === "analytics-grid") {
    drawAnalyticsGrid(scene);
  } else if (variant === "curriculum-map") {
    drawCurriculumMap(scene);
  } else if (variant === "grades-waveform") {
    drawGradesWaveform(scene);
  } else if (variant === "planner-path") {
    drawPlannerPath(scene);
  } else if (variant === "dashboard-orbit" || variant === "loading-orbit") {
    drawOrbit(scene);
  } else {
    drawLandingBlueprint(scene);
  }

  context.restore();
}

export function AcademicCanvasScene({
  className,
  density = "normal",
  variant = "landing-blueprint",
}: Readonly<{
  className?: string;
  density?: "low" | "normal";
  variant?: CanvasSceneVariant;
}>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      return;
    }

    const drawingCanvas = canvas;
    const drawingContext = context;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let startedAt = 0;
    const reduceMotion = prefersReducedMotion();
    const lowPower = isLowPowerDevice();
    const particleCount = density === "low" || lowPower ? 16 : 34;
    const particles = createParticles(particleCount, variant);

    function getScene(elapsedSeconds: number): SceneContext {
      return {
        context: drawingContext,
        width,
        height,
        particles,
        elapsedSeconds,
        alpha: lowPower ? 0.44 : 0.62,
        reduceMotion,
        variant,
      };
    }

    function resize() {
      const rect = drawingCanvas.getBoundingClientRect();
      const ratio = getCappedDevicePixelRatio(lowPower ? 1.2 : 1.7);
      width = Math.max(1, Math.floor(rect.width * ratio));
      height = Math.max(1, Math.floor(rect.height * ratio));
      drawingCanvas.width = width;
      drawingCanvas.height = height;
      drawingContext.setTransform(1, 0, 0, 1, 0, 0);
    }

    function render(timestamp: number) {
      if (!startedAt) {
        startedAt = timestamp;
      }

      drawScene(getScene((timestamp - startedAt) / 1000));

      if (!reduceMotion && document.visibilityState === "visible") {
        animationFrame = window.requestAnimationFrame(render);
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
      drawScene(getScene(0));
    });

    function handleVisibilityChange() {
      window.cancelAnimationFrame(animationFrame);

      if (document.visibilityState === "visible" && !reduceMotion) {
        animationFrame = window.requestAnimationFrame(render);
      }
    }

    resize();
    resizeObserver.observe(drawingCanvas);
    animationFrame = window.requestAnimationFrame(render);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [density, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={clsx("ambient-canvas pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
    />
  );
}
