import { useEffect, useRef, useState } from "react";
import { FlightScene } from "./components/FlightScene";
import { Icon } from "./components/Icons";
import type { IconName } from "./components/Icons";
import {
  Chart,
  Readout,
  TelemetryPage,
  formatApsis,
} from "./components/Telemetry";
import { useMission } from "./hooks/useMission";
import {
  clamp,
  exportTelemetry,
  formatTime,
  PRESETS,
  STAGES,
} from "./simulation/flight";
import type { Mission, Mode, Preset } from "./simulation/flight";
import type { Camera } from "./simulation/renderer";
import "./styles.css";

type Page = "control" | "telemetry" | "log";
const PHASE: Record<Mode, string> = {
  ready: "Ready for launch",
  countdown: "Terminal countdown",
  ascent: "Powered ascent",
  staging: "Stage separation",
  orbit: "Orbit confirmed",
  coast: "Coasting · suborbital",
  aborted: "Mission aborted",
  landed: "Surface impact",
};
const SEQUENCE = [
  { code: "liftoff", title: "Liftoff", subtitle: "Clear the launch tower" },
  { code: "maxq", title: "Max-Q", subtitle: "Peak aerodynamic load" },
  {
    code: "separation",
    title: "Stage separation",
    subtitle: "First stage released",
  },
  { code: "space", title: "Edge of space", subtitle: "Cross 100 km altitude" },
  {
    code: "orbit",
    title: "Orbital insertion",
    subtitle: "Confirm a stable trajectory",
  },
];

export default function App() {
  const {
    mission,
    snapshot: m,
    act,
    selectPreset,
    speed,
    changeSpeed,
    sound,
    toggleSound,
    audioError,
  } = useMission();
  const [page, setPage] = useState<Page>("control");
  const [camera, setCamera] = useState<Camera>("chase");
  const [help, setHelp] = useState(false);
  const [exported, setExported] = useState(false);
  const missionInfo = PRESETS[m.preset];
  const terminal = ["aborted", "landed"].includes(m.mode);
  const active = !["ready", "aborted", "landed"].includes(m.mode);
  const abortable = active && m.mode !== "orbit";
  const download = () => {
    const blob = new Blob([exportTelemetry(mission.current)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orbital-nexus-${missionInfo.id.toLowerCase()}-telemetry.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExported(true);
  };
  const nav: { page: Page; label: string; short: string; icon: IconName }[] = [
    {
      page: "control",
      label: "Mission control",
      short: "Control",
      icon: "dashboard",
    },
    {
      page: "telemetry",
      label: "Flight telemetry",
      short: "Telemetry",
      icon: "chart",
    },
    { page: "log", label: "Mission log", short: "Log", icon: "log" },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to mission content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="Orbital Nexus home"
          onClick={(e) => {
            e.preventDefault();
            setPage("control");
          }}
        >
          <span className="brand-mark">
            <Icon name="orbit" size={31} />
          </span>
          <span>
            orbital<span className="brand-light">nexus</span>
            <small>EXPLORATION, ENGINEERED.</small>
          </span>
        </a>
        <div className="nav-label eyebrow">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.page}
              aria-label={item.label}
              className={`nav-item ${page === item.page ? "selected" : ""}`}
              aria-current={page === item.page ? "page" : undefined}
              onClick={() => setPage(item.page)}
            >
              <Icon name={item.icon} />
              <span className="nav-full">{item.label}</span>
              <span className="nav-short">{item.short}</span>
              {item.page === "log" && (
                <span className="nav-count">{m.events.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="simulation-note">
            <span className="status-dot" />
            <span>LOCAL SIMULATION</span>
            <small>Flight computer online</small>
          </div>
          <button
            className="nav-item help-button"
            aria-label="Flight manual"
            onClick={() => setHelp(true)}
          >
            <Icon name="help" />
            <span>Flight manual</span>
            <span className="key-hint">?</span>
          </button>
          <div className="sidebar-version">
            ORBITAL NEXUS <span>V1.0</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span>{" "}
            <strong>
              {page === "control"
                ? "Mission control"
                : page === "telemetry"
                  ? "Flight telemetry"
                  : "Mission log"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="local-label">SIMULATION ENVIRONMENT</span>
            <span className="profile-badge">EB</span>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow page-eyebrow">
                <span className="orange-dash" /> FLIGHT OPERATIONS{" "}
                <span className="heading-divider">/</span> {missionInfo.id}
              </div>
              <h1>
                {page === "control"
                  ? "Your seat at mission control."
                  : page === "telemetry"
                    ? "Every second. Every signal."
                    : "The story of your flight."}
              </h1>
              <p>
                {page === "control"
                  ? "From the launchpad to the edge of possibility."
                  : page === "telemetry"
                    ? "Measured flight data, straight from the simulation."
                    : "A time-stamped record of every mission milestone."}
              </p>
            </div>
            <div className="mission-clock">
              <span className="eyebrow">MISSION ELAPSED TIME</span>
              <strong>{formatTime(m.time)}</strong>
              <span
                className={
                  terminal ? "clock-status danger-text" : "clock-status"
                }
              >
                <span
                  className={`status-dot ${terminal ? "danger-dot" : m.paused ? "amber-dot" : ""}`}
                />
                {m.paused ? "Simulation paused" : PHASE[m.mode]}
              </span>
            </div>
          </div>
          <div className="mission-strip">
            <div className="mission-identity">
              <span className="mission-number">{missionInfo.id}</span>
              <strong>{missionInfo.name}</strong>
              <span className="tag">HYPERION V</span>
            </div>
            <label className="mission-selector">
              <span>Mission profile</span>
              <select
                aria-label="Mission profile"
                value={m.preset}
                disabled={m.mode !== "ready"}
                onChange={(e) => {
                  selectPreset(e.target.value as Preset);
                  setExported(false);
                }}
              >
                {Object.entries(PRESETS).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.name} · {p.payload / 1000} t
                  </option>
                ))}
              </select>
              <Icon name="chevron" size={14} />
            </label>
          </div>
          {page === "control" ? (
            <div className="control-layout">
              <div className="primary-column">
                <section className="scene" aria-label="Flight visualization">
                  <FlightScene mission={mission} camera={camera} />
                  <div className="scene-top">
                    <span className="live-indicator">
                      <span className="live-dot" /> LIVE SIMULATION
                    </span>
                    <div className="camera-controls" aria-label="Camera view">
                      <button
                        aria-label="Chase camera"
                        aria-pressed={camera === "chase"}
                        onClick={() => setCamera("chase")}
                      >
                        <Icon name="camera" size={16} />
                        <span>Chase</span>
                      </button>
                      <button
                        aria-label="Orbital view"
                        aria-pressed={camera === "orbital"}
                        onClick={() => setCamera("orbital")}
                      >
                        <Icon name="orbit" size={16} />
                        <span>Orbit</span>
                      </button>
                    </div>
                  </div>
                  <div className="scene-coordinate">
                    <span>EARTH</span>
                    <span>
                      {camera === "chase"
                        ? "ASCENT TRACKING"
                        : "ORBITAL OVERVIEW"}
                    </span>
                    <span className="scene-coordinate-line" />
                  </div>
                  {m.mode === "countdown" && (
                    <div className="countdown" role="status">
                      <span>TERMINAL COUNT</span>
                      <strong>{Math.max(0, Math.ceil(-m.time))}</strong>
                      <small>
                        {m.time < -3
                          ? "Vehicle on internal power"
                          : "Ignition sequence armed"}
                      </small>
                    </div>
                  )}
                  {(terminal || m.mode === "orbit" || m.paused) && (
                    <div
                      className={`scene-result ${terminal ? "is-danger" : ""}`}
                      role="status"
                    >
                      <Icon
                        name={
                          m.paused
                            ? "pause"
                            : m.mode === "orbit"
                              ? "check"
                              : "stop"
                        }
                        size={17}
                      />
                      {m.paused
                        ? "SIMULATION PAUSED"
                        : PHASE[m.mode].toUpperCase()}
                    </div>
                  )}
                  <div className="scene-bottom">
                    <div>
                      <span className="scene-vehicle-label">
                        TWO-STAGE LAUNCH VEHICLE
                      </span>
                      <h2>
                        HYPERION <span>V</span>
                      </h2>
                      <p>
                        {m.mode === "ready"
                          ? "On the pad. Ready for what’s next."
                          : `Stage ${m.stage} · ${PHASE[m.mode]}`}
                      </p>
                    </div>
                    <div className="scene-altitude">
                      <span className="eyebrow">ALTITUDE</span>
                      <strong>
                        {(m.altitude / 1000).toFixed(1)}
                        <small> km</small>
                      </strong>
                      <div className="scene-scale">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                  </div>
                </section>
                <div className="primary-readouts">
                  <Readout
                    label="Altitude"
                    value={(m.altitude / 1000).toFixed(2)}
                    unit="km"
                  />
                  <Readout
                    label="Velocity"
                    value={(m.velocity / 1000).toFixed(2)}
                    unit="km/s"
                  />
                  <Readout
                    label="Downrange"
                    value={(m.downrange / 1000).toFixed(1)}
                    unit="km"
                  />
                  <Readout
                    label="G-load"
                    value={m.gForce.toFixed(2)}
                    unit="g"
                  />
                </div>
                <section className="panel trajectory-panel">
                  <div className="panel-heading">
                    <div className="heading-with-dot">
                      <span className="mint-line" />
                      <h2>Flight trajectory</h2>
                    </div>
                    <div className="chart-legend">
                      <span /> Altitude{" "}
                      <span className="chart-target">
                        Target {m.targetAltitude / 1000} km
                      </span>
                    </div>
                  </div>
                  <Chart mission={m} />
                </section>
              </div>
              <aside className="instruments">
                <section className="panel flight-computer">
                  <div className="panel-heading">
                    <h2>Flight computer</h2>
                    <span className="autopilot">AUTO</span>
                  </div>
                  <div className="vehicle-summary">
                    <div className="vehicle-drawing">
                      <RocketDiagram />
                    </div>
                    <div>
                      <span className="eyebrow">CURRENT PHASE</span>
                      <h3>
                        {m.mode === "ready"
                          ? "Pre-launch"
                          : m.mode === "ascent"
                            ? `Stage ${m.stage} ascent`
                            : PHASE[m.mode]}
                      </h3>
                      <span className="small-muted">
                        {m.mode === "ready"
                          ? "All launch checks complete"
                          : m.paused
                            ? "Flight computer on hold"
                            : m.thrust > 0
                              ? `${(m.thrust / 1000).toFixed(0)} kN thrust`
                              : "Engines offline"}
                      </span>
                    </div>
                  </div>
                  <Fuel
                    label="First stage"
                    number="01"
                    percent={(m.fuel1 / STAGES[0].fuel) * 100}
                    active={m.stage === 1}
                  />
                  <Fuel
                    label="Second stage"
                    number="02"
                    percent={(m.fuel2 / STAGES[1].fuel) * 100}
                    active={m.stage === 2}
                  />
                  <dl className="computer-data">
                    <div>
                      <dt>Throttle</dt>
                      <dd>
                        {(m.throttle * 100).toFixed(0)}
                        <span>%</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Dynamic pressure</dt>
                      <dd>
                        {(m.pressure / 1000).toFixed(1)}
                        <span>kPa</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Apogee</dt>
                      <dd>
                        {formatApsis(m.apoapsis)}
                        <span>km</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Payload</dt>
                      <dd>
                        {m.payload / 1000}
                        <span>t</span>
                      </dd>
                    </div>
                  </dl>
                </section>
                <section className="panel sequence-panel">
                  <div className="panel-heading">
                    <h2>Mission sequence</h2>
                    <span className="small-muted">
                      {
                        SEQUENCE.filter((s) =>
                          m.events.some((e) => e.code === s.code),
                        ).length
                      }{" "}
                      / 5
                    </span>
                  </div>
                  <ol className="sequence">
                    {SEQUENCE.map((step, i) => {
                      const occurred = m.events.find(
                        (e) => e.code === step.code,
                      );
                      const next =
                        !occurred &&
                        (i === 0 ||
                          m.events.some(
                            (e) => e.code === SEQUENCE[i - 1].code,
                          ));
                      return (
                        <li
                          key={step.code}
                          className={`${occurred ? "complete" : next && active ? "next" : ""}`}
                        >
                          <span className="sequence-marker">
                            {occurred ? (
                              <Icon name="check" size={12} />
                            ) : (
                              String(i + 1).padStart(2, "0")
                            )}
                          </span>
                          <div>
                            <strong>{step.title}</strong>
                            <small>{step.subtitle}</small>
                          </div>
                          <time>
                            {occurred
                              ? formatTime(occurred.time).slice(4)
                              : "—"}
                          </time>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              </aside>
            </div>
          ) : page === "telemetry" ? (
            <TelemetryPage mission={m} />
          ) : (
            <MissionLog mission={m} download={download} />
          )}
          <div className="flight-controls">
            <div className="launch-group">
              <button
                className="launch-button"
                disabled={active}
                onClick={() => {
                  if (terminal) act("reset");
                  act("launch");
                  setExported(false);
                }}
              >
                <Icon name="arrow" size={19} />
                {terminal
                  ? "Launch again"
                  : active
                    ? m.mode === "orbit"
                      ? "Orbit achieved"
                      : "Mission in progress"
                    : "Initiate launch"}
              </button>
              <span className="launch-hint">
                {m.mode === "ready" || terminal
                  ? "10-second automatic countdown"
                  : m.mode === "orbit"
                    ? "Engine cutoff · orbital coast"
                    : m.paused
                      ? "Resume to continue the mission"
                      : `Flight guidance active · ${speed}× time`}
              </span>
            </div>
            <div className="playback-controls">
              <button
                className="icon-button pause-button"
                aria-label={m.paused ? "Resume simulation" : "Pause simulation"}
                disabled={!active}
                onClick={() => act("pause")}
              >
                <Icon name={m.paused ? "play" : "pause"} size={18} />
              </button>
              <div
                className="time-controls"
                role="group"
                aria-label="Simulation speed"
              >
                {[1, 5, 10, 20].map((v) => (
                  <button
                    key={v}
                    aria-pressed={speed === v}
                    onClick={() => changeSpeed(v)}
                  >
                    {v}×
                  </button>
                ))}
              </div>
              <span className="control-divider" />
              <button
                className="icon-button"
                aria-label={sound ? "Mute audio" : "Enable audio"}
                aria-pressed={sound}
                onClick={() => void toggleSound()}
              >
                <Icon name={sound ? "volume" : "mute"} size={19} />
              </button>
              <button
                className="icon-button"
                aria-label="Reset mission"
                onClick={() => {
                  act("reset");
                  setExported(false);
                }}
              >
                <Icon name="reset" size={18} />
              </button>
              <button
                className="abort-button"
                disabled={!abortable}
                onClick={() => act("abort")}
              >
                <Icon name="stop" size={14} />
                Abort
              </button>
            </div>
          </div>
          <div className="latest-event">
            <span className="event-signal">
              <Icon name="log" size={16} />
            </span>
            <span className="eyebrow">LATEST EVENT</span>
            <time>{formatTime(m.events.at(-1)!.time)}</time>
            <span className="event-title" role="status">
              {m.events.at(-1)!.title}
            </span>
            <button className="text-button" onClick={() => setPage("log")}>
              View log <Icon name="arrow" size={14} />
            </button>
          </div>
          {audioError && (
            <p className="audio-error" role="alert">
              {audioError}
            </p>
          )}
          <footer>
            <span>
              FICTIONAL VEHICLE. REAL CURIOSITY.
              <span className="footer-detail">
                {" "}
                Educational simulation · 2D flight dynamics
              </span>
            </span>
            <button
              className="text-button"
              disabled={!m.history.length}
              onClick={download}
            >
              <Icon name="download" size={14} />
              {exported ? "Export CSV again" : "Export flight data"}
            </button>
          </footer>
        </main>
      </div>
      {help && <FlightManual close={() => setHelp(false)} />}
    </div>
  );
}

function Fuel({
  label,
  number,
  percent,
  active,
}: {
  label: string;
  number: string;
  percent: number;
  active: boolean;
}) {
  return (
    <div className={`fuel ${active ? "active-fuel" : ""}`}>
      <div className="fuel-label">
        <span>
          <b>{number}</b>
          {label}
        </span>
        <strong>
          {clamp(percent, 0, 100).toFixed(0)}
          <small>%</small>
        </strong>
      </div>
      <div
        className="fuel-track"
        role="progressbar"
        aria-label={`${label} propellant remaining`}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${clamp(percent, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function RocketDiagram() {
  return (
    <svg viewBox="0 0 40 110" aria-hidden="true">
      <path
        d="M15 92V31Q13 18 20 6q7 12 5 25v61ZM15 77l-8 19 8-4m10-15 8 19-8-4"
        fill="#aebeb8"
        fillOpacity=".1"
        stroke="#a9beb8"
        strokeWidth="1"
      />
      <path d="M15 42h10M15 68h10M15 88h10M18 92v9m4-9v9" stroke="#8fb7a6" />
      <path d="M17 33h6" stroke="#eea376" strokeWidth="3" />
    </svg>
  );
}

function MissionLog({
  mission,
  download,
}: {
  mission: Mission;
  download: () => void;
}) {
  return (
    <section className="panel mission-log">
      <div className="panel-heading">
        <div>
          <h2>Flight event recorder</h2>
          <p className="small-muted">
            {mission.events.length} events recorded for this mission
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={!mission.history.length}
          onClick={download}
        >
          <Icon name="download" size={16} />
          Export telemetry
        </button>
      </div>
      <div className="log-table">
        <div className="log-table-head">
          <span>MISSION TIME</span>
          <span>EVENT / DETAILS</span>
          <span>STATUS</span>
        </div>
        {[...mission.events].reverse().map((e) => (
          <div className="log-entry" key={e.code}>
            <time>{formatTime(e.time)}</time>
            <div>
              <h3>{e.title}</h3>
              <p>{e.detail}</p>
            </div>
            <span
              className={`tag ${["abort", "impact", "cutoff"].includes(e.code) ? "warning-tag" : ""}`}
            >
              {["abort", "impact"].includes(e.code)
                ? "STOPPED"
                : e.code === "cutoff"
                  ? "COAST"
                  : "RECORDED"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FlightManual({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="manual-dialog"
      aria-labelledby="manual-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="manual-heading">
        <Icon name="orbit" size={30} />
        <button
          className="icon-button"
          aria-label="Close flight manual"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <span className="eyebrow">WELCOME ABOARD</span>
      <h2 id="manual-title">
        A little guidance
        <br />
        before liftoff.
      </h2>
      <p>
        Launch a fictional two-stage vehicle and follow the physics of reaching
        orbit.
      </p>
      <ol>
        <li>
          <strong>Choose your mission.</strong> Orbital insertion is the
          standard flight. Pathfinder carries a lighter payload. Heavy lift is a
          performance challenge and can fall short of orbit.
        </li>
        <li>
          <strong>Initiate launch.</strong> The ten-second countdown runs in
          real time. Automatic guidance handles throttle, pitch, staging, and
          engine cutoff.
        </li>
        <li>
          <strong>Explore the flight.</strong> Change camera views, pause, or
          use up to 20× time. Telemetry and the mission log remain available
          throughout.
        </li>
        <li>
          <strong>Take the data with you.</strong> Export measured telemetry as
          CSV. Reset clears the current flight.
        </li>
      </ol>
      <p className="note">
        The model includes spherical gravity, a simple exponential atmosphere,
        drag, propellant mass, and two-stage guidance. Orbit requires a perigee
        above 160 km near the selected target apogee. It omits 3D motion, Earth
        rotation, lift, detailed atmosphere, and hardware failures. The visuals
        are illustrative. Flights are not saved across page reloads. Simulation
        time stops while this browser tab is hidden.
      </p>
      <p className="manual-sources">
        Explore the science:{" "}
        <a
          href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-to-orbit/"
          target="_blank"
          rel="noreferrer"
        >
          NASA: Flight to orbit ↗
        </a>
      </p>
      <button className="launch-button" onClick={close}>
        Ready for flight <Icon name="arrow" size={18} />
      </button>
    </dialog>
  );
}
