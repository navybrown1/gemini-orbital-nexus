import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Mission } from "../simulation/flight";
import { FlightRenderer } from "../simulation/renderer";
import type { Camera } from "../simulation/renderer";

export function FlightScene({
  mission,
  camera,
}: {
  mission: RefObject<Mission>;
  camera: Camera;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const renderer = new FlightRenderer();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      height = 0,
      animation = 0,
      previous = performance.now();
    const resize = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    });
    resize.observe(element);
    const draw = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      if (width && height && !document.hidden)
        renderer.draw(
          context,
          width,
          height,
          mission.current,
          camera,
          dt,
          motion.matches,
        );
      animation = requestAnimationFrame(draw);
    };
    animation = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animation);
      resize.disconnect();
    };
  }, [mission, camera]);
  return (
    <canvas
      ref={canvas}
      className="flight-canvas"
      role="img"
      aria-label={
        camera === "chase"
          ? "Animated Hyperion V vehicle and launch environment. Flight data appears in the instruments below."
          : "Schematic Earth overview showing the measured flight path and target apogee."
      }
    />
  );
}
