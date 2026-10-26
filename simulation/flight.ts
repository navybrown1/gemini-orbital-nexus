// Educational two-dimensional ascent model. SI units throughout.
export const EARTH_RADIUS = 6371000;
export const MU = 3.986004418e14;
export const G0 = 9.80665;
export const STEP = 0.02;
export const STAGES = [
  { thrust: 7607000, isp: 300, dry: 22200, fuel: 411000 },
  { thrust: 934000, isp: 348, dry: 4000, fuel: 107500 },
] as const;
export const PRESETS = {
  standard: {
    name: "Orbital insertion",
    subtitle: "The original mission, reimagined.",
    payload: 15000,
    target: 200000,
    id: "HX-01",
  },
  pathfinder: {
    name: "Pathfinder",
    subtitle: "Light payload. Higher orbit.",
    payload: 8000,
    target: 300000,
    id: "HX-02",
  },
  heavy: {
    name: "Heavy lift",
    subtitle: "Push the vehicle to its limits.",
    payload: 18000,
    target: 250000,
    id: "HX-03",
  },
} as const;
export type Preset = keyof typeof PRESETS;
export type Mode =
  | "ready"
  | "countdown"
  | "ascent"
  | "staging"
  | "coast"
  | "orbit"
  | "aborted"
  | "landed";
export type FlightCommand = "launch" | "pause" | "abort" | "reset";
export interface FlightEvent {
  time: number;
  code: string;
  title: string;
  detail: string;
}
export interface Sample {
  time: number;
  altitude: number;
  velocity: number;
  pressure: number;
  mass: number;
  downrange: number;
  stage: number;
}
export interface Mission {
  preset: Preset;
  payload: number;
  targetAltitude: number;
  mode: Mode;
  paused: boolean;
  time: number;
  accumulator: number;
  altitude: number;
  downrange: number;
  radialVelocity: number;
  tangentialVelocity: number;
  velocity: number;
  mass: number;
  fuel1: number;
  fuel2: number;
  stage: 1 | 2;
  thrust: number;
  throttle: number;
  pitch: number;
  pressure: number;
  maxQ: number;
  mach: number;
  gForce: number;
  apoapsis: number;
  periapsis: number;
  separationTime: number;
  history: Sample[];
  events: FlightEvent[];
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function event(m: Mission, code: string, title: string, detail: string) {
  if (!m.events.some((e) => e.code === code))
    m.events.push({ time: m.time, code, title, detail });
}

export function createMission(preset: Preset = "standard"): Mission {
  const config = PRESETS[preset];
  return {
    preset,
    payload: config.payload,
    targetAltitude: config.target,
    mode: "ready",
    paused: false,
    time: -10,
    accumulator: 0,
    altitude: 0,
    downrange: 0,
    radialVelocity: 0,
    tangentialVelocity: 0,
    velocity: 0,
    mass:
      STAGES[0].dry +
      STAGES[0].fuel +
      STAGES[1].dry +
      STAGES[1].fuel +
      config.payload,
    fuel1: STAGES[0].fuel,
    fuel2: STAGES[1].fuel,
    stage: 1,
    thrust: 0,
    throttle: 0,
    pitch: 0,
    pressure: 0,
    maxQ: 0,
    mach: 0,
    gForce: 1,
    apoapsis: 0,
    periapsis: -EARTH_RADIUS,
    separationTime: 0,
    history: [],
    events: [
      {
        time: -10,
        code: "ready",
        title: "All systems ready",
        detail: "Flight computer initialized. Awaiting launch command.",
      },
    ],
  };
}

export function command(m: Mission, action: FlightCommand) {
  if (action === "reset") {
    Object.assign(m, createMission(m.preset));
    return;
  }
  if (action === "launch" && m.mode === "ready") {
    m.mode = "countdown";
    event(
      m,
      "countdown",
      "Terminal count",
      "Launch sequence started. Vehicle on internal power.",
    );
  }
  if (action === "pause" && !["ready", "aborted", "landed"].includes(m.mode))
    m.paused = !m.paused;
  if (
    action === "abort" &&
    !["ready", "aborted", "landed", "orbit"].includes(m.mode)
  ) {
    m.mode = "aborted";
    m.paused = false;
    m.thrust = 0;
    m.throttle = 0;
    m.accumulator = 0;
    event(
      m,
      "abort",
      "Mission aborted",
      "Engine cutoff commanded. Simulation stopped. Reset to begin a new flight.",
    );
  }
}

// Osculating Keplerian apsides derived from energy and angular momentum.
export function orbitalElements(
  radius: number,
  radialVelocity: number,
  tangentialVelocity: number,
) {
  const energy =
    (radialVelocity ** 2 + tangentialVelocity ** 2) / 2 - MU / radius;
  const angularMomentum = radius * tangentialVelocity;
  const eccentricity = Math.sqrt(
    Math.max(0, 1 + (2 * energy * angularMomentum ** 2) / MU ** 2),
  );
  const parameter = angularMomentum ** 2 / MU;
  const periapsis = parameter / (1 + eccentricity) - EARTH_RADIUS;
  // Energy form remains well-conditioned when tangential velocity is zero.
  const apoapsis =
    energy < 0
      ? (-MU / (2 * energy)) * (1 + eccentricity) - EARTH_RADIUS
      : Infinity;
  return { apoapsis, periapsis };
}

function integrate(m: Mission) {
  m.time += STEP;
  if (m.mode === "countdown") {
    if (m.time >= -3)
      event(
        m,
        "ignition",
        "Engine chilldown",
        "Propellant tanks pressurized. Ignition sequence armed.",
      );
    if (m.time < -1e-8) return;
    m.time = 0;
    m.mode = "ascent";
    event(m, "liftoff", "Liftoff", "Hyperion V has cleared the tower.");
  }
  if (m.mode === "staging" && m.time - m.separationTime >= 3) {
    m.mode = "ascent";
    event(
      m,
      "stage2",
      "Second stage ignition",
      "Vacuum engine online. Guidance targeting orbital insertion.",
    );
  }
  const radius = EARTH_RADIUS + m.altitude;
  const gravity = MU / radius ** 2;
  const density =
    m.altitude > 150000 ? 0 : 1.225 * Math.exp(-m.altitude / 8500);
  m.pressure = 0.5 * density * m.velocity ** 2;
  m.maxQ = Math.max(m.maxQ, m.pressure);
  const stage = STAGES[m.stage - 1];
  m.throttle =
    m.mode === "ascent" ? (m.pressure > 28000 && m.stage === 1 ? 0.72 : 1) : 0;
  if (
    m.stage === 2 &&
    m.mode === "ascent" &&
    m.periapsis >= 160000 &&
    Math.abs(m.altitude - m.targetAltitude) < 20000
  ) {
    m.mode = "orbit";
    m.throttle = 0;
    event(
      m,
      "orbit",
      "Orbit confirmed",
      `${(m.periapsis / 1000).toFixed(0)} × ${(m.apoapsis / 1000).toFixed(0)} km. Engine cutoff. Payload in a stable model orbit.`,
    );
  }
  const fuel = m.stage === 1 ? m.fuel1 : m.fuel2;
  const isp = m.stage === 1 ? 282 + 18 * (1 - density / 1.225) : stage.isp;
  const requestedThrust = stage.thrust * m.throttle;
  const burn = Math.min(fuel, (requestedThrust / (isp * G0)) * STEP);
  m.thrust = (burn * isp * G0) / STEP;
  if (m.stage === 1) m.fuel1 = Math.max(0, m.fuel1 - burn);
  else m.fuel2 = Math.max(0, m.fuel2 - burn);
  const averageMass = m.mass - burn / 2;
  m.mass -= burn;
  if (m.stage === 1) {
    m.pitch = clamp((m.time - 12) / 145, 0, 1) * 1.25;
    if (m.pitch > 0.01)
      event(
        m,
        "turn",
        "Gravity turn",
        "Pitch program active. Building downrange velocity.",
      );
  } else if (m.thrust > 0) {
    const targetVerticalSpeed = clamp(
      (m.targetAltitude - m.altitude) / 65,
      -300,
      1100,
    );
    const desiredAcceleration = (targetVerticalSpeed - m.radialVelocity) / 18;
    const radialThrust =
      desiredAcceleration + gravity - m.tangentialVelocity ** 2 / radius;
    m.pitch = Math.acos(
      clamp(radialThrust / (m.thrust / averageMass), -0.6, 0.98),
    );
  }
  m.mach =
    m.velocity /
    Math.sqrt(
      1.4 * 287 * Math.max(190, 288.15 - 0.0065 * Math.min(m.altitude, 11000)),
    );
  const dragCoefficient = m.mach < 0.8 ? 0.28 : m.mach < 1.2 ? 0.6 : 0.36;
  const drag = m.pressure * dragCoefficient * 10.5;
  const dragRadial =
    m.velocity > 0 ? (drag * m.radialVelocity) / m.velocity : 0;
  const dragTangential =
    m.velocity > 0 ? (drag * m.tangentialVelocity) / m.velocity : 0;
  const radialAcceleration =
    (m.thrust * Math.cos(m.pitch) - dragRadial) / averageMass -
    gravity +
    m.tangentialVelocity ** 2 / radius;
  const tangentialAcceleration =
    (m.thrust * Math.sin(m.pitch) - dragTangential) / averageMass -
    (m.radialVelocity * m.tangentialVelocity) / radius;
  m.radialVelocity += radialAcceleration * STEP;
  m.tangentialVelocity += tangentialAcceleration * STEP;
  m.altitude += m.radialVelocity * STEP;
  m.downrange += (m.tangentialVelocity / radius) * EARTH_RADIUS * STEP;
  m.velocity = Math.hypot(m.radialVelocity, m.tangentialVelocity);
  m.gForce =
    Math.hypot(
      m.thrust * Math.cos(m.pitch) - dragRadial,
      m.thrust * Math.sin(m.pitch) - dragTangential,
    ) /
    averageMass /
    G0;
  const orbit = orbitalElements(
    EARTH_RADIUS + Math.max(0, m.altitude),
    m.radialVelocity,
    m.tangentialVelocity,
  );
  m.apoapsis = orbit.apoapsis;
  m.periapsis = orbit.periapsis;
  if (m.mach >= 1)
    event(m, "mach1", "Supersonic", "Vehicle has passed Mach 1.");
  if (m.maxQ > 15000 && m.pressure < m.maxQ * 0.7 && m.time > 40)
    event(
      m,
      "maxq",
      "Maximum dynamic pressure passed",
      `Peak aerodynamic load: ${(m.maxQ / 1000).toFixed(1)} kPa.`,
    );
  if (m.altitude >= 100000)
    event(
      m,
      "space",
      "Kármán line crossed",
      "100 km altitude. Beyond the conventional boundary of space.",
    );
  if (m.stage === 1 && m.fuel1 <= 0 && m.mode === "ascent") {
    m.stage = 2;
    m.mass -= STAGES[0].dry;
    m.mode = "staging";
    m.thrust = 0;
    m.throttle = 0;
    m.separationTime = m.time;
    event(
      m,
      "separation",
      "Stage separation",
      "Main engine cutoff. First stage released. Three-second coast before second-stage ignition.",
    );
  } else if (m.stage === 2 && m.fuel2 <= 0 && m.mode === "ascent") {
    m.mode = "coast";
    m.thrust = 0;
    m.throttle = 0;
    event(
      m,
      "cutoff",
      "Propellant depleted",
      m.periapsis >= 160000
        ? "Engine cutoff. Coasting on the measured trajectory."
        : "Engine cutoff. Suborbital trajectory; the orbital target was not reached.",
    );
  }
  if (m.altitude < 0) {
    m.altitude = 0;
    m.mode = "landed";
    m.thrust = 0;
    m.throttle = 0;
    m.velocity = 0;
    m.radialVelocity = 0;
    m.tangentialVelocity = 0;
    m.gForce = 0;
    event(
      m,
      "impact",
      "Surface impact",
      "Vehicle reached the surface. Mission ended.",
    );
  }
  const previous = m.history.at(-1);
  if (!previous || m.time - previous.time >= 0.5 - 1e-8) {
    m.history.push({
      time: m.time,
      altitude: m.altitude,
      velocity: m.velocity,
      pressure: m.pressure,
      mass: m.mass,
      downrange: m.downrange,
      stage: m.stage,
    });
    if (m.history.length > 14400) m.history.shift();
  }
}

export function advanceMission(m: Mission, elapsed: number) {
  if (
    !Number.isFinite(elapsed) ||
    elapsed <= 0 ||
    m.paused ||
    ["ready", "aborted", "landed"].includes(m.mode)
  )
    return;
  m.accumulator += elapsed;
  while (m.accumulator + 1e-10 >= STEP) {
    m.accumulator -= STEP;
    integrate(m);
    if (m.mode === "landed") {
      m.accumulator = 0;
      break;
    }
  }
}

export function advanceFrame(m: Mission, realSeconds: number, speed: number) {
  if (!Number.isFinite(realSeconds) || realSeconds <= 0) return;
  // Occluded but visible browser windows may render only a few times a second.
  // Account for those frames without allowing long stalls to skip minutes.
  const scale = m.mode === "countdown" ? 1 : clamp(speed, 1, 20);
  advanceMission(m, Math.min(realSeconds, 1) * scale);
}

export function formatTime(time: number) {
  const seconds =
    time < -0.001
      ? Math.ceil(Math.abs(time) - 1e-7)
      : Math.floor(Math.abs(time) + 1e-7);
  return `T${time < -0.001 ? "−" : "+"}${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function exportTelemetry(m: Mission) {
  return (
    "time_s,altitude_m,velocity_m_s,pressure_pa,mass_kg,downrange_m,stage\n" +
    m.history
      .map((s) =>
        [
          s.time,
          s.altitude,
          s.velocity,
          s.pressure,
          s.mass,
          s.downrange,
          s.stage,
        ]
          .map((v) => v.toFixed(3))
          .join(","),
      )
      .join("\n")
  );
}
