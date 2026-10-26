import test from "node:test";
import assert from "node:assert/strict";
import { overviewLayout } from "../simulation/renderer.ts";

test("Pathfinder target ring and label remain inside short and narrow views", () => {
  for (const [width, height] of [
    [974, 550],
    [600, 460],
    [330, 400],
  ]) {
    const layout = overviewLayout(width, height, 300000);
    assert.ok(
      layout.labelY >= 65,
      `target label clipped at ${width}x${height}`,
    );
    assert.ok(layout.y + layout.orbitRadius <= height - 70);
    assert.ok(layout.x - layout.orbitRadius >= 0);
    assert.ok(layout.x + layout.orbitRadius <= width);
  }
});
