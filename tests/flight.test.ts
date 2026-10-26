import test from "node:test";
import assert from "node:assert/strict";
import {
  createMission,
  command,
  advanceMission,
  orbitalElements,
  exportTelemetry,
  formatTime,
} from "../simulation/flight.ts";

test("abort during countdown cannot reignite the vehicle later", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, 3);
  command(mission, "abort");
  advanceMission(mission, 30);
  assert.equal(mission.mode, "aborted");
  assert.equal(mission.altitude, 0);
  assert.equal(mission.thrust, 0);
});

test("pause freezes countdown and resume continues from the same instant", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, 2);
  command(mission, "pause");
  const t = mission.time;
  advanceMission(mission, 50);
  assert.equal(mission.time, t);
  command(mission, "pause");
  advanceMission(mission, 1);
  assert.ok(Math.abs(mission.time - t - 1) < 0.021);
});

test("reset clears the previous mission, events, and fuel use", () => {
  const mission = createMission("heavy");
  command(mission, "launch");
  advanceMission(mission, 60);
  command(mission, "reset");
  assert.equal(mission.mode, "ready");
  assert.equal(mission.time, -10);
  assert.equal(mission.fuel1, 411000);
  assert.equal(mission.altitude, 0);
  assert.equal(mission.history.length, 0);
  assert.equal(mission.events.length, 1);
  assert.equal(mission.preset, "heavy");
});

test("duplicate launch commands cannot restart an active flight", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, 30);
  command(mission, "launch");
  assert.ok(mission.time > 19);
});

test("fixed integration gives the same flight at different rendering frame rates", () => {
  const a = createMission(),
    b = createMission();
  command(a, "launch");
  command(b, "launch");
  for (let i = 0; i < 240; i++) advanceMission(a, 0.5);
  for (let i = 0; i < 7200; i++) advanceMission(b, 1 / 60);
  assert.ok(Math.abs(a.altitude - b.altitude) < 1);
  assert.ok(Math.abs(a.velocity - b.velocity) < 1);
});

test("burning propellant conserves vehicle mass before stage separation", () => {
  const mission = createMission();
  const initialMass = mission.mass;
  command(mission, "launch");
  advanceMission(mission, 40);
  assert.ok(mission.fuel1 < 411000);
  assert.ok(
    Math.abs(initialMass - mission.mass - (411000 - mission.fuel1)) < 0.001,
  );
  assert.equal(mission.stage, 1);
});

test("stage separation is unique and propellant never becomes negative", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, 800);
  assert.equal(mission.events.filter((e) => e.code === "separation").length, 1);
  assert.ok(mission.fuel1 >= 0 && mission.fuel2 >= 0);
  assert.ok(mission.mass >= mission.payload + 4000);
});

test("a circular 200 km orbit has two matching apsides", () => {
  const orbit = orbitalElements(6571000, 0, 7788.487984973157);
  assert.ok(Math.abs(orbit.apoapsis - 200000) < 1000);
  assert.ok(Math.abs(orbit.periapsis - 200000) < 1000);
});

test("a high vertical ascent is classified as suborbital", () => {
  const orbit = orbitalElements(6571000, 2000, 1000);
  assert.ok(orbit.apoapsis > 200000);
  assert.ok(orbit.periapsis < 0);
});

test("a purely vertical ascent still has a correct positive apogee", () => {
  const orbit = orbitalElements(6571000, 2000, 0);
  assert.ok(orbit.apoapsis > 400000 && orbit.apoapsis < 450000);
  assert.equal(orbit.periapsis, -6371000);
});

test("countdown clock rounds toward launch, matching the countdown overlay", () => {
  assert.equal(formatTime(-9.98), "T−00:00:10");
  assert.equal(formatTime(9.98), "T+00:00:09");
});

test("falling vehicle impacts the surface instead of sticking at zero altitude", () => {
  const mission = createMission();
  mission.mode = "coast";
  mission.altitude = 10;
  mission.radialVelocity = -100;
  advanceMission(mission, 1);
  assert.equal(mission.mode, "landed");
  assert.equal(mission.altitude, 0);
  assert.equal(mission.thrust, 0);
});

test("nominal mission reaches a verified orbit rather than declaring success at burnout", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, 900);
  assert.equal(mission.mode, "orbit");
  assert.ok(mission.periapsis >= 160000);
  assert.ok(mission.altitude >= 160000 && mission.altitude < 300000);
  assert.equal(mission.events.filter((e) => e.code === "orbit").length, 1);
});

test("mission presets change payload and the requested target altitude", () => {
  const light = createMission("pathfinder"),
    heavy = createMission("heavy");
  assert.equal(light.payload, 8000);
  assert.equal(heavy.payload, 18000);
  assert.equal(heavy.targetAltitude, 250000);
});

test("non-finite or negative elapsed time does not corrupt state", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, NaN);
  advanceMission(mission, -1);
  advanceMission(mission, Infinity);
  assert.equal(mission.time, -10);
});

test("peak dynamic pressure never decreases after Max-Q", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, 100);
  const peak = mission.maxQ;
  advanceMission(mission, 300);
  assert.ok(mission.maxQ >= peak && peak > 0);
  assert.equal(mission.events.filter((e) => e.code === "maxq").length, 1);
});

test("CSV exports actual sampled flight data with units", () => {
  const mission = createMission();
  command(mission, "launch");
  advanceMission(mission, 30);
  const csv = exportTelemetry(mission);
  assert.ok(csv.startsWith("time_s,altitude_m,velocity_m_s"));
  assert.ok(csv.split("\n").length > 10);
  assert.ok(!csv.includes("NaN"));
});
