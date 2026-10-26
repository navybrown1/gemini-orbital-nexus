import test from "node:test";
import assert from "node:assert/strict";
import { createMission, command, advanceFrame } from "../simulation/flight.ts";

test("slow visible frames preserve 20x time rather than reducing it to 4x", () => {
  const mission = createMission();
  command(mission, "launch");
  for (let i = 0; i < 20; i++) advanceFrame(mission, 0.5, 20);
  assert.ok(Math.abs(mission.time) < 0.021, "countdown must stay at real time");
  for (let i = 0; i < 20; i++) advanceFrame(mission, 0.5, 20);
  assert.ok(Math.abs(mission.time - 200) < 0.021);
});

test("one stalled frame cannot jump the simulation forward by minutes", () => {
  const mission = createMission();
  mission.mode = "ascent";
  mission.time = 0;
  advanceFrame(mission, 300, 20);
  assert.ok(mission.time <= 20.021 && mission.time >= 19.98);
});
