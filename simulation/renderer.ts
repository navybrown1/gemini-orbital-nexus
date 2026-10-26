import { clamp, EARTH_RADIUS } from "./flight.ts";
import type { Mission } from "./flight";

export type Camera = "chase" | "orbital";
type Context = CanvasRenderingContext2D;
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
}

export function overviewLayout(
  width: number,
  height: number,
  targetAltitude: number,
) {
  const x = width * 0.5,
    y = height * 0.53;
  const orbitRadius = Math.max(
    20,
    Math.min(width * 0.42, y - 90, height - y - 85),
  );
  const earthRadius = orbitRadius / (1 + (targetAltitude * 0.8) / 300000);
  return { x, y, earthRadius, orbitRadius, labelY: y - orbitRadius - 15 };
}

export class FlightRenderer {
  private particles: Particle[] = [];
  private previousTime = -10;
  private clock = 0;
  private stars = Array.from({ length: 180 }, (_, i) => ({
    x: noise(i * 3 + 1),
    y: noise(i * 3 + 2),
    size: 0.4 + noise(i * 3 + 3) * 1.1,
  }));

  draw(
    ctx: Context,
    width: number,
    height: number,
    mission: Mission,
    camera: Camera,
    dt: number,
    reducedMotion: boolean,
  ) {
    if (mission.time < this.previousTime) this.particles = [];
    this.previousTime = mission.time;
    const moving =
      !mission.paused && !["ready", "aborted", "landed"].includes(mission.mode);
    if (moving) this.clock += dt;
    ctx.clearRect(0, 0, width, height);
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#070e13");
    sky.addColorStop(0.6, "#101f2a");
    sky.addColorStop(1, "#2a4147");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    for (const star of this.stars) {
      ctx.fillStyle = `rgba(224,241,244,${0.2 + star.size * 0.2})`;
      ctx.fillRect(
        star.x * width,
        star.y * height * 0.85,
        star.size,
        star.size,
      );
    }
    if (camera === "orbital") this.overview(ctx, width, height, mission);
    else
      this.chase(ctx, width, height, mission, moving ? dt : 0, reducedMotion);
    const vignette = ctx.createRadialGradient(
      width / 2,
      height * 0.5,
      height * 0.1,
      width / 2,
      height * 0.5,
      Math.max(width, height) * 0.65,
    );
    vignette.addColorStop(0, "transparent");
    vignette.addColorStop(1, "#03070b9c");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  private chase(
    ctx: Context,
    w: number,
    h: number,
    m: Mission,
    dt: number,
    reduced: boolean,
  ) {
    const space = clamp(m.altitude / 70000, 0, 1);
    const rocketX = w * 0.49;
    const baseY = h * 0.76 - clamp(m.altitude / 2500, 0, 1) * h * 0.12;
    const scale = Math.min(w / 850, h / 550) * (m.stage === 1 ? 1.18 : 1.35);
    if (space < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - space;
      const horizon = h * 0.76 + m.altitude * 0.04;
      const glow = ctx.createRadialGradient(
        w * 0.85,
        horizon,
        0,
        w * 0.85,
        horizon,
        w * 0.7,
      );
      glow.addColorStop(0, "#a0b7a33b");
      glow.addColorStop(0.35, "#699aa517");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#0b1820";
      ctx.fillRect(0, horizon, w, h);
      ctx.strokeStyle = "#b3d5d321";
      ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const yy = horizon + 5 + i * i * 0.75;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
        ctx.stroke();
      }
      if (m.altitude < 15000)
        this.pad(ctx, rocketX, horizon, scale, m.altitude);
      ctx.restore();
    }
    if (space > 0.15) {
      ctx.save();
      ctx.globalAlpha = clamp((space - 0.15) / 0.6, 0, 1);
      const radius = w * 0.95;
      this.earth(
        ctx,
        w * 0.3 - Math.sin(m.downrange / EARTH_RADIUS) * w * 0.15,
        h + radius * 0.77,
        radius,
      );
      ctx.restore();
    }
    // Subtle altitude guides provide scale without obscuring the vehicle.
    ctx.strokeStyle = "#c4e5de12";
    ctx.fillStyle = "#8eadaa60";
    ctx.font = "9px monospace";
    for (let i = 1; i < 5; i++) {
      const yy = h * 0.17 + i * h * 0.13;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, yy);
      ctx.lineTo(w * 0.15, yy);
      ctx.stroke();
      ctx.fillText(
        `${Math.max(0, m.altitude / 1000 + (3 - i) * 0.5).toFixed(1)}`,
        w * 0.055,
        yy + 3,
      );
    }
    const angle = m.pitch;
    const centerY = baseY - (m.stage === 1 ? 125 : 68) * scale;
    ctx.save();
    ctx.translate(rocketX, centerY);
    ctx.rotate(angle);
    ctx.translate(0, (m.stage === 1 ? 125 : 68) * scale);
    this.vehicle(ctx, scale, m.stage, m.thrust > 0, this.clock, reduced);
    ctx.restore();
    const nozzleX =
      rocketX - Math.sin(angle) * (m.stage === 1 ? 125 : 68) * scale;
    const nozzleY =
      centerY + Math.cos(angle) * (m.stage === 1 ? 125 : 68) * scale;
    if (m.thrust > 0 && dt > 0 && !reduced) {
      const count = Math.min(12, Math.ceil(dt * 130));
      for (let i = 0; i < count; i++)
        this.particles.push({
          x: nozzleX,
          y: nozzleY,
          vx: -Math.sin(angle) * 170 + (Math.random() - 0.5) * 30,
          vy: Math.cos(angle) * 170 + (Math.random() - 0.5) * 30,
          life: 1,
          max: 1,
          size: 4 + Math.random() * 12,
        });
    }
    this.particles = this.particles.filter((p) => p.life > 0).slice(-260);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 1.4;
      const glow = ctx.createRadialGradient(
        p.x,
        p.y,
        0,
        p.x,
        p.y,
        p.size * (2 - p.life),
      );
      glow.addColorStop(0, `rgba(255,184,103,${Math.max(0, p.life) * 0.22})`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4);
    }
    if (m.stage === 2 && m.time - m.separationTime < 10) {
      const separation = (m.time - m.separationTime) / 10;
      ctx.save();
      ctx.translate(rocketX - 50 - separation * 90, centerY + separation * 130);
      ctx.rotate(-0.3 - separation * 1.3);
      ctx.scale(scale, scale);
      this.booster(ctx);
      ctx.restore();
    }
    // Reticle marks track the vehicle; this camera intentionally keeps it framed.
    ctx.strokeStyle = "#d4e4e538";
    ctx.lineWidth = 1;
    const bracket = Math.min(w * 0.19, 145),
      top = centerY - bracket,
      bottom = centerY + bracket;
    for (const x of [rocketX - bracket, rocketX + bracket])
      for (const y of [top, bottom]) {
        const signX = x < rocketX ? 1 : -1,
          signY = y < centerY ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x, y + signY * 12);
        ctx.lineTo(x, y);
        ctx.lineTo(x + signX * 12, y);
        ctx.stroke();
      }
  }

  private pad(
    ctx: Context,
    x: number,
    y: number,
    scale: number,
    altitude: number,
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#25373b";
    ctx.beginPath();
    ctx.moveTo(-180, 0);
    ctx.lineTo(250, 0);
    ctx.lineTo(310, 80);
    ctx.lineTo(-250, 80);
    ctx.fill();
    ctx.strokeStyle = "#486064";
    ctx.lineWidth = 1;
    for (let i = -3; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 55, 0);
      ctx.lineTo(i * 72, 80);
      ctx.stroke();
    }
    const tx = 78;
    ctx.fillStyle = "#1c2c31";
    ctx.fillRect(tx, -245, 27, 245);
    ctx.strokeStyle = "#668183";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const yy = -245 + i * 28;
      ctx.strokeRect(tx, yy, 27, 28);
      ctx.beginPath();
      ctx.moveTo(tx, yy);
      ctx.lineTo(tx + 27, yy + 28);
      ctx.stroke();
    }
    ctx.fillStyle = "#687c78";
    ctx.fillRect(tx - 5, -249, 38, 6);
    ctx.strokeStyle = "#9aa49a";
    ctx.lineWidth = 4;
    if (altitude < 50) {
      ctx.beginPath();
      ctx.moveTo(tx, -182);
      ctx.lineTo(24, -182);
      ctx.stroke();
    }
    ctx.fillStyle = "#e4a16b";
    ctx.shadowColor = "#ec995c";
    ctx.shadowBlur = 9;
    for (const yy of [-230, -145, -50]) ctx.fillRect(tx + 23, yy, 3, 3);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#344b51";
    ctx.lineWidth = 2;
    for (const mx of [-245, 260]) {
      ctx.beginPath();
      ctx.moveTo(mx, 20);
      ctx.lineTo(mx + 7, -290);
      ctx.stroke();
      ctx.fillStyle = "#be6c57";
      ctx.fillRect(mx + 5, -292, 4, 3);
    }
    ctx.fillStyle = "#060b0e";
    ctx.fillRect(-38, -2, 76, 20);
    ctx.restore();
  }

  private vehicle(
    ctx: Context,
    scale: number,
    stage: 1 | 2,
    thrusting: boolean,
    clock: number,
    reduced: boolean,
  ) {
    ctx.save();
    ctx.scale(scale, scale);
    if (thrusting) {
      const length =
        (stage === 1 ? 140 : 100) *
        (reduced ? 1 : 1 + Math.sin(clock * 45) * 0.07);
      const glow = ctx.createRadialGradient(0, 35, 0, 0, 35, 135);
      glow.addColorStop(0, "#ffbb6a45");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(-135, -100, 270, 270);
      const flame = ctx.createLinearGradient(0, 5, 0, length);
      flame.addColorStop(0, "#e4f7ff");
      flame.addColorStop(0.2, "#e3f4f8");
      flame.addColorStop(0.4, "#f6c57c");
      flame.addColorStop(1, "#ff622000");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.bezierCurveTo(-25, 50, -8, length, 0, length);
      ctx.bezierCurveTo(8, length, 25, 50, 13, 0);
      ctx.fill();
    }
    if (stage === 1) this.booster(ctx);
    const offset = stage === 1 ? -155 : -8;
    ctx.translate(0, offset);
    ctx.fillStyle = "#222c30";
    ctx.fillRect(-19, -13, 38, 13);
    const body = ctx.createLinearGradient(-19, 0, 19, 0);
    body.addColorStop(0, "#536369");
    body.addColorStop(0.28, "#c6d3d0");
    body.addColorStop(0.55, "#eceddf");
    body.addColorStop(1, "#66777a");
    ctx.fillStyle = body;
    ctx.fillRect(-18, -64, 36, 51);
    ctx.beginPath();
    ctx.moveTo(-18, -64);
    ctx.quadraticCurveTo(-21, -95, 0, -126);
    ctx.quadraticCurveTo(21, -95, 18, -64);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#46585b70";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -126);
    ctx.lineTo(0, -64);
    ctx.stroke();
    ctx.fillStyle = "#222d31";
    ctx.fillRect(-18, -40, 36, 5);
    ctx.fillStyle = "#e29262";
    ctx.beginPath();
    ctx.moveTo(0, -88);
    ctx.lineTo(6, -75);
    ctx.lineTo(0, -78);
    ctx.lineTo(-6, -75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private booster(ctx: Context) {
    const body = ctx.createLinearGradient(-19, 0, 19, 0);
    body.addColorStop(0, "#465b61");
    body.addColorStop(0.3, "#dce2d9");
    body.addColorStop(0.5, "#f3f0dd");
    body.addColorStop(1, "#67787b");
    ctx.fillStyle = body;
    ctx.fillRect(-19, -155, 38, 146);
    ctx.fillStyle = "#253239";
    ctx.fillRect(-19, -150, 38, 18);
    ctx.fillRect(-19, -22, 38, 14);
    ctx.fillStyle = "#bd714c";
    ctx.fillRect(-19, -129, 38, 3);
    ctx.strokeStyle = "#45565b70";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) ctx.strokeRect(-19, -117 + i * 24, 38, 24);
    ctx.save();
    ctx.translate(1, -92);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#30464b";
    ctx.font = "bold 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("H Y P E R I O N", 0, 2);
    ctx.restore();
    ctx.fillStyle = "#889a96";
    ctx.fillRect(-24, -119, 5, 14);
    ctx.fillRect(19, -119, 5, 14);
    ctx.fillStyle = "#1d2a30";
    ctx.beginPath();
    ctx.moveTo(-19, -35);
    ctx.lineTo(-31, -6);
    ctx.lineTo(-19, -9);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(19, -35);
    ctx.lineTo(31, -6);
    ctx.lineTo(19, -9);
    ctx.fill();
    ctx.fillStyle = "#081215";
    for (const x of [-11, 0, 11]) {
      ctx.beginPath();
      ctx.moveTo(x - 4, -9);
      ctx.lineTo(x - 6, 1);
      ctx.lineTo(x + 6, 1);
      ctx.lineTo(x + 4, -9);
      ctx.fill();
    }
  }

  private earth(ctx: Context, x: number, y: number, r: number) {
    ctx.save();
    ctx.shadowColor = "#61bacc";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#428295";
    ctx.beginPath();
    ctx.arc(x, y, r + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    const ocean = ctx.createRadialGradient(
      x - r * 0.3,
      y - r * 0.6,
      0,
      x,
      y,
      r,
    );
    ocean.addColorStop(0, "#365f6d");
    ocean.addColorStop(0.5, "#1c414f");
    ocean.addColorStop(1, "#081d29");
    ctx.fillStyle = ocean;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.clip();
    ctx.translate(x, y);
    ctx.scale(r, r);
    ctx.fillStyle = "#5c746c";
    // Stylized land forms are illustrative, not a geographic basemap.
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate(i * 1.2 + 0.2);
      ctx.beginPath();
      for (let j = 0; j < 16; j++) {
        const a = (j / 16) * Math.PI * 2,
          rad = 0.14 + noise(i * 16 + j) * 0.09;
        const px = 0.42 + Math.cos(a) * rad,
          py = Math.sin(a) * rad * 1.8;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = "#d6ede22c";
    ctx.lineWidth = 0.025;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      const yy = (i - 7) / 8;
      ctx.moveTo(-0.8 + noise(i) * 0.4, yy);
      ctx.bezierCurveTo(
        -0.3,
        yy - 0.1,
        0.1,
        yy + 0.15,
        0.6 + noise(i + 4) * 0.3,
        yy - 0.07,
      );
      ctx.stroke();
    }
    const shadow = ctx.createLinearGradient(-1, -0.8, 0.9, 0.8);
    shadow.addColorStop(0, "transparent");
    shadow.addColorStop(0.45, "#00141a15");
    shadow.addColorStop(0.8, "#00070cbd");
    shadow.addColorStop(1, "#00050aee");
    ctx.fillStyle = shadow;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }

  private overview(ctx: Context, w: number, h: number, m: Mission) {
    const layout = overviewLayout(w, h, m.targetAltitude);
    const { x, y, earthRadius: r, orbitRadius } = layout;
    this.earth(ctx, x, y, r);
    const orbitScale = (r * 0.8) / 300000;
    ctx.strokeStyle = "#94c6b95c";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(x, y, orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#8daaa5";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
      `TARGET APOGEE  ${(m.targetAltitude / 1000).toFixed(0)} KM`,
      x,
      layout.labelY,
    );
    ctx.strokeStyle = "#ace7d0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (
      let i = 0;
      i < m.history.length;
      i += Math.max(1, Math.floor(m.history.length / 600))
    ) {
      const s = m.history[i],
        angle = s.downrange / EARTH_RADIUS;
      const rr = r + Math.max(0, s.altitude) * orbitScale;
      const px = x + Math.sin(angle) * rr,
        py = y - Math.cos(angle) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    const angle = m.downrange / EARTH_RADIUS,
      rr = r + m.altitude * orbitScale;
    const rx = x + Math.sin(angle) * rr,
      ry = y - Math.cos(angle) * rr;
    ctx.fillStyle = "#f6a675";
    ctx.shadowColor = "#f6a675";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ecbaa170";
    ctx.beginPath();
    ctx.arc(rx, ry, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#dbe6e1";
    ctx.textAlign = "left";
    ctx.fillText("HYPERION V", rx + 18, ry + 4);
    ctx.textAlign = "center";
    ctx.fillStyle = "#8daaa5";
    ctx.fillText("EARTH", x, y + r * 0.5);
    ctx.fillStyle = "#5f7e7c";
    ctx.fillText("SCHEMATIC · ALTITUDE EXAGGERATED", x, h - 72);
  }
}

function noise(seed: number) {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}
