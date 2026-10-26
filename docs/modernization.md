# Orbital Nexus modernization

Goal: turn the current Hyperion V launch simulation into a reliable, responsive educational mission-control app.

The entry point currently runs a rocket simulator. Older solar-system/Gemini modules are disconnected. Preserve the launch product and repository history; retire unused modules and the client-side key injection. This is an educational, fictional vehicle, not flight-certified engineering software.

Design: charcoal flight console, warm white typography, orange launch actions, mint telemetry, restrained borders, a cinematic procedural vehicle scene, and a visible mission sequence. Desktop shows a flight viewport beside instruments. Mobile stacks every instrument below the viewport instead of hiding data. All controls have accessible labels and visible focus. No external fonts, CDN scripts, images, credentials, or runtime services are required.

Approach: retain React/TypeScript/Vite and Canvas 2D; split simulation, rendering, audio, and UI by responsibility. A cosmetic-only pass leaves lifecycle and physics bugs intact. Replacing the framework adds migration cost without improving the product.

Implementation plan:
1. Add regression tests for countdown abort, pause, reset, step-size consistency, mass/fuel conservation, staging, impact, orbital classification, and telemetry export. Implement a fixed 20 ms step engine with spherical gravity, drag, finite propellant, automatic guidance, and calculated apsides. Success requires a periapsis above 160 km and altitude near the selected target.
2. Implement the responsive console, launch presets, chase/overview camera, mission/telemetry/log tabs, pause/speed/audio/reset/abort controls, charts, help, and downloadable CSV. Keep the simulation ref separate from React's throttled snapshots. Suspend the simulation when the tab is hidden. Close audio and animation resources on unmount.
3. Update supported dependencies, enable strict type checks, remove unused Gemini code and Tailwind CDN, document startup/limits, add CI, and verify the full browser flow plus desktop/mobile layouts.

Verification: node:test for the real engine, strict TypeScript, production build, npm audit, and direct browser inspection of countdown, abort, restart, pause, speed, view changes, telemetry, and export.

Calls made: continue the active launch experience; keep all source changes on a separate branch; do not restore unused Gemini features or introduce a new hosted AI backend. User operating instructions authorize proceeding with reasonable assumptions without design approval gates.
