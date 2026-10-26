import { formatTime } from "../simulation/flight";
import type { Mission, Sample } from "../simulation/flight";

export function Chart({
  mission,
  metric = "altitude",
  large = false,
}: {
  mission: Mission;
  metric?: "altitude" | "velocity" | "pressure";
  large?: boolean;
}) {
  const width = 600,
    height = large ? 200 : 130,
    pad = 30;
  const data = mission.history;
  const maxTime = Math.max(data.at(-1)?.time ?? 0, 60);
  const minMax =
    metric === "altitude"
      ? mission.targetAltitude
      : metric === "velocity"
        ? 8000
        : 50000;
  let maximum = minMax;
  for (const sample of data) maximum = Math.max(maximum, sample[metric] * 1.1);
  const sampled: Sample[] = data.filter(
    (_, i) => i % Math.max(1, Math.floor(data.length / 500)) === 0,
  );
  if (data.length && sampled.at(-1) !== data.at(-1)) sampled.push(data.at(-1)!);
  const points = sampled.map(
    (s) =>
      `${pad + (s.time / maxTime) * (width - pad * 2)},${height - pad - (s[metric] / maximum) * (height - pad * 2)}`,
  );
  const unit =
    metric === "altitude" ? "km" : metric === "velocity" ? "km/s" : "kPa";
  const labels =
    metric === "altitude"
      ? "Altitude"
      : metric === "velocity"
        ? "Velocity"
        : "Dynamic pressure";
  return (
    <svg
      className={`telemetry-chart ${large ? "large" : ""}`}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${labels} over mission elapsed time; ${data.length ? `${data.length} measured samples` : "awaiting flight data"}`}
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={pad}
            y1={pad + (height - pad * 2) * f}
            x2={width - pad}
            y2={pad + (height - pad * 2) * f}
            stroke="#2c3739"
            strokeDasharray="3 6"
          />
          <text
            x={pad - 8}
            y={pad + (height - pad * 2) * f + 3}
            textAnchor="end"
          >
            {((maximum * (1 - f)) / 1000).toFixed(
              metric === "velocity" ? 1 : 0,
            )}
          </text>
        </g>
      ))}
      <text x={pad} y="12">
        {unit}
      </text>
      <text x={pad} y={height - 6}>
        T+00:00
      </text>
      <text x={width - pad} y={height - 6} textAnchor="end">
        {formatTime(maxTime).replace("00:", "")}
      </text>
      {points.length > 1 ? (
        <>
          <polygon
            points={`${pad},${height - pad} ${points.join(" ")} ${pad + (data.at(-1)!.time / maxTime) * (width - pad * 2)},${height - pad}`}
            fill="#a4dfc80e"
          />
          <polyline
            points={points.join(" ")}
            stroke="#a4dfc8"
            strokeWidth="2"
            fill="none"
            strokeLinejoin="round"
          />
          <circle
            cx={points.at(-1)?.split(",")[0]}
            cy={points.at(-1)?.split(",")[1]}
            r="3"
            fill="#d6f7e9"
          />
        </>
      ) : (
        <text
          x={width / 2}
          y={height / 2 + 5}
          textAnchor="middle"
          className="chart-placeholder"
        >
          AWAITING FLIGHT DATA
        </text>
      )}
    </svg>
  );
}

export function Readout({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  detail?: string;
}) {
  return (
    <div className="readout">
      <span className="eyebrow">{label}</span>
      <div className="readout-value">
        {value}
        <span>{unit}</span>
      </div>
      {detail && <span className="readout-detail">{detail}</span>}
    </div>
  );
}

export function TelemetryPage({ mission }: { mission: Mission }) {
  return (
    <div className="telemetry-page">
      <div className="expanded-readouts">
        <Readout
          label="Altitude"
          value={(mission.altitude / 1000).toFixed(2)}
          unit="km"
          detail="Above mean Earth radius"
        />
        <Readout
          label="Total velocity"
          value={(mission.velocity / 1000).toFixed(3)}
          unit="km/s"
          detail="In the model's inertial frame"
        />
        <Readout
          label="Vertical velocity"
          value={mission.radialVelocity.toFixed(0)}
          unit="m/s"
          detail="Radial component"
        />
        <Readout
          label="Horizontal velocity"
          value={mission.tangentialVelocity.toFixed(0)}
          unit="m/s"
          detail="Tangential component"
        />
      </div>
      <div className="telemetry-grid">
        {(["altitude", "velocity", "pressure"] as const).map((metric) => (
          <section className="panel chart-panel" key={metric}>
            <div className="panel-heading">
              <h2>
                {metric === "altitude"
                  ? "Altitude profile"
                  : metric === "velocity"
                    ? "Velocity profile"
                    : "Aerodynamic load"}
              </h2>
              <span className="small-muted">MEASURED</span>
            </div>
            <Chart mission={mission} metric={metric} large />
          </section>
        ))}
        <section className="panel orbit-data">
          <div className="panel-heading">
            <h2>Orbital solution</h2>
            <span className="status-dot" />
          </div>
          <dl>
            <div>
              <dt>Apogee</dt>
              <dd>{formatApsis(mission.apoapsis)} km</dd>
            </div>
            <div>
              <dt>Perigee</dt>
              <dd>
                {mission.periapsis > 0
                  ? `${(mission.periapsis / 1000).toFixed(1)} km`
                  : "Below surface"}
              </dd>
            </div>
            <div>
              <dt>Flight path angle</dt>
              <dd>
                {(
                  (Math.atan2(
                    mission.radialVelocity,
                    mission.tangentialVelocity,
                  ) *
                    180) /
                  Math.PI
                ).toFixed(1)}
                °
              </dd>
            </div>
            <div>
              <dt>Pitch from vertical</dt>
              <dd>{((mission.pitch * 180) / Math.PI).toFixed(1)}°</dd>
            </div>
            <div>
              <dt>Vehicle mass</dt>
              <dd>{(mission.mass / 1000).toFixed(1)} t</dd>
            </div>
            <div>
              <dt>Peak dynamic pressure</dt>
              <dd>{(mission.maxQ / 1000).toFixed(1)} kPa</dd>
            </div>
          </dl>
          <p className="note">
            A high altitude alone does not mean orbit. Perigee must clear 160 km
            before the flight computer confirms insertion.
          </p>
        </section>
      </div>
    </div>
  );
}

export function formatApsis(value: number) {
  return Number.isFinite(value)
    ? (Math.max(0, value) / 1000).toFixed(1)
    : "Escape";
}
