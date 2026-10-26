# Orbital Nexus

Your seat at mission control. An interactive educational launch simulator for the fictional **Hyperion V** two-stage vehicle, built with React, TypeScript, Vite, and Canvas 2D.

## Run

Requires Node.js **22.18+** (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the printed local URL, normally `http://127.0.0.1:3000`. No API key, microphone permission, account, or external runtime service is needed.

```sh
npm test           # engine regression tests, using Node's built-in test runner
npm run typecheck  # strict TypeScript check
npm run build      # type check and production build
npm run preview    # serve the production build
npm audit          # dependency advisories
```

## Fly a mission

Choose a profile before launch. Initiate launch starts a real-time ten-second countdown. Automatic guidance handles the pitch program, aerodynamic throttling, stage separation, and orbital engine cutoff. Pause, resume, change time to 1×/5×/10×/20×, switch chase/orbital camera, and optionally enable synthesized engine audio. Abort stops the flight immediately, including during countdown. Reset clears the current flight and allows profile selection again.

| Profile | Payload | Target apogee | Expected result in this simplified model |
| --- | --- | --- | --- |
| Orbital insertion | 15 t | 200 km | Orbit, with perigee above 160 km |
| Pathfinder | 8 t | 300 km | Orbit, with perigee above 160 km |
| Heavy lift | 18 t | 250 km | Performance challenge: propellant runs out before orbit |

Flight telemetry shows measured altitude, velocity, aerodynamic pressure, mass, and orbital elements. The mission log records milestones once. CSV export contains SI-unit telemetry sampled every half simulated second, retaining the latest two hours. Every instrument is available on mobile. The orbit view exaggerates altitude and uses illustrative land shapes rather than a geographic map.

## Model and limits

The deterministic engine uses a fixed **20 ms** integration step, polar two-dimensional motion around a spherical Earth, inverse-square gravity, a simple exponential atmosphere, drag, finite propellant, changing mass, and two stages. A controller guides the upper stage toward its target altitude. Apogee and perigee come from orbital energy and angular momentum; altitude alone never confirms orbit. Insertion requires perigee above 160 km while the vehicle is near the selected target apogee. The resulting orbit may be elliptical.

This is a fictional educational simulation, not validated engineering software. It omits Earth rotation, 3D geometry, detailed atmosphere, lift, hardware failures, and perturbations. It uses a first-order numerical integrator. Runtime assets are self-contained; audio is optional. Reduced-motion preferences suppress plume flicker and exhaust particles.

Simulation time stops when the browser tab is hidden. Slow frames account for up to one second of real time before applying time warp; longer stalls are capped to avoid skipping minutes. Flights remain in memory only and are cleared by reload. Export before resetting or closing the page.

Read more: [NASA — Flight to Orbit](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-to-orbit/), [NASA — Ideal Rocket Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/).

## Structure

- `simulation/flight.ts`: browser-independent flight engine, controls, orbital solution, CSV.
- `simulation/renderer.ts`: procedural chase/orbit scenes and vehicle rendering.
- `hooks/useMission.ts`: animation lifecycle, throttled React snapshots, sound, speed.
- `components/`: visualization, telemetry, icons.
- `services/audio.ts`: user-activated Web Audio and resource cleanup.
- `tests/flight.test.ts`: real engine regression tests.

## Deployment

`npm run build` produces a self-contained static `dist/` directory with relative asset paths. Serve it from an HTTP(S) static host; no server-side environment variables are required. The development server binds to loopback by default. CI runs install, tests, type checking/build, and dependency audit on pull requests and pushes.

The repository retains its original `gemini-orbital-nexus` name. This modernization follows the active Hyperion V launch app; disconnected legacy Gemini explorer modules and client-side API-key injection were retired. Their previous versions remain in Git history.
