import React, { useRef, useEffect } from 'react';
import { Planet } from '../types';
import { PLANETS } from '../constants';

interface Props {
  onPlanetSelect: (planet: Planet) => void;
  activePlanetId: string | null;
}

const OrbitalCanvas: React.FC<Props> = ({ onPlanetSelect, activePlanetId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const planetsRef = useRef<Planet[]>(JSON.parse(JSON.stringify(PLANETS))); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Generate background elements once
    const stars: {x: number, y: number, size: number, alpha: number, color: string, speed: number}[] = [];
    for(let i=0; i<800; i++) {
        const r = Math.random();
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() > 0.99 ? Math.random() * 2 + 1 : Math.random() * 1.2,
            alpha: Math.random() * 0.8 + 0.2,
            color: r > 0.9 ? '#bfdbfe' : r > 0.8 ? '#fecaca' : '#ffffff', // Blue, Red tint, or White
            speed: Math.random() * 0.05
        });
    }
    
    // Nebula clouds (circles with very low alpha)
    const nebulas: {x: number, y: number, radius: number, color: string}[] = [];
    for(let i=0; i<6; i++) {
        nebulas.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 400 + 200,
            color: i % 2 === 0 ? 'rgba(14, 165, 233, 0.03)' : 'rgba(139, 92, 246, 0.03)'
        });
    }

    let time = 0;

    const animate = () => {
      if (!ctx || !canvas) return;
      time += 0.01;
      
      // Clear
      ctx.fillStyle = '#020617'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Nebula
      nebulas.forEach(neb => {
          const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, neb.radius);
          grad.addColorStop(0, neb.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
          ctx.fill();
      });

      // Draw Stars with parallax drift
      stars.forEach(star => {
          // Drift
          star.x -= star.speed;
          if(star.x < 0) star.x = canvas.width;

          ctx.fillStyle = star.color;
          ctx.globalAlpha = star.alpha * (0.7 + Math.sin(time * 2 + star.x) * 0.3); // Twinkle
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
      });
      ctx.globalAlpha = 1;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 1000;
      const orbitScale = canvas.width > 800 ? 1.5 * scale : 0.8 * scale;

      // Sun Glow (Pulsing) - Multilayered
      const pulse = 1 + Math.sin(time * 1.5) * 0.02;
      
      // Outer Corona
      const coronaGrad = ctx.createRadialGradient(centerX, centerY, 30 * scale, centerX, centerY, 300 * scale * pulse);
      coronaGrad.addColorStop(0, 'rgba(255, 237, 213, 0.1)');
      coronaGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.05)');
      coronaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 300 * scale * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Inner Glow
      const sunGradient = ctx.createRadialGradient(centerX, centerY, 10 * scale, centerX, centerY, 80 * scale * pulse);
      sunGradient.addColorStop(0, '#fff7ed');
      sunGradient.addColorStop(0.2, '#f97316');
      sunGradient.addColorStop(0.6, 'rgba(234, 88, 12, 0.1)');
      sunGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 100 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Sun Core
      ctx.shadowBlur = 50;
      ctx.shadowColor = '#fdba74';
      ctx.fillStyle = '#fffbf0';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 25 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Planets
      planetsRef.current.forEach((planet) => {
        planet.angle += planet.speed * 0.2; 

        const dist = planet.distance * 3 * orbitScale; // Spread them out more
        const x = centerX + Math.cos(planet.angle) * dist;
        const y = centerY + Math.sin(planet.angle) * dist;
        const pRadius = planet.radius * scale;

        // Draw Orbit Track
        ctx.strokeStyle = activePlanetId === planet.id ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = activePlanetId === planet.id ? 2 : 1;
        if (activePlanetId === planet.id) ctx.setLineDash([5, 5]); // Dashed for active
        ctx.beginPath();
        ctx.arc(centerX, centerY, dist, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Selection Highlight Ring
        if (activePlanetId === planet.id) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#0ea5e9';
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, pRadius + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        // Planet Shading Logic (Pseudo 3D)
        // Light source is always centerX, centerY
        const angleToSun = Math.atan2(centerY - y, centerX - x);
        
        // The "Day" side faces the sun.
        const grad = ctx.createRadialGradient(
            x - Math.cos(angleToSun) * (pRadius * 0.5), // Offset highlight towards sun
            y - Math.sin(angleToSun) * (pRadius * 0.5),
            pRadius * 0.1,
            x,
            y,
            pRadius
        );
        
        grad.addColorStop(0, planet.color); // Lit area
        grad.addColorStop(0.4, planet.color); 
        grad.addColorStop(1, '#020617'); // Shadow side (matches bg)

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, pRadius, 0, Math.PI * 2);
        ctx.fill();

        // Atmosphere Glow (for Earth/Venus/Giants)
        if (planet.radius > 10) {
             const atmColor = planet.id === 'earth' ? 'rgba(56,189,248,0.3)' : planet.id === 'venus' ? 'rgba(250,204,21,0.2)' : 'rgba(255,255,255,0.1)';
             ctx.shadowBlur = 15;
             ctx.shadowColor = atmColor;
             ctx.strokeStyle = atmColor;
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.arc(x, y, pRadius, 0, Math.PI * 2);
             ctx.stroke();
             ctx.shadowBlur = 0;
        }

        // Label
        ctx.fillStyle = activePlanetId === planet.id ? '#ffffff' : 'rgba(255,255,255,0.4)';
        ctx.font = activePlanetId === planet.id ? 'bold 14px Orbitron' : '10px Orbitron';
        const textX = x + pRadius + 15;
        const textY = y + 5;
        
        // Connecting line to label
        if (activePlanetId === planet.id) {
            ctx.beginPath();
            ctx.moveTo(x + pRadius + 5, y);
            ctx.lineTo(textX - 5, y);
            ctx.strokeStyle = 'rgba(56,189,248,0.5)';
            ctx.stroke();
        }

        ctx.fillText(planet.name.toUpperCase(), textX, textY);
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [activePlanetId]);

  // Handle Click
  const handleClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const centerX = canvasRef.current.width / 2;
    const centerY = canvasRef.current.height / 2;
    const scale = Math.min(canvasRef.current.width, canvasRef.current.height) / 1000;
    const orbitScale = canvasRef.current.width > 800 ? 1.5 * scale : 0.8 * scale;

    let clickedPlanet: Planet | null = null;

    planetsRef.current.forEach(planet => {
        const dist = planet.distance * 3 * orbitScale;
        const x = centerX + Math.cos(planet.angle) * dist;
        const y = centerY + Math.sin(planet.angle) * dist;
        const pRadius = planet.radius * scale;
        
        // Hitbox slightly larger
        const mouseDist = Math.sqrt((x - clickX)**2 + (y - clickY)**2);
        
        if (mouseDist < pRadius + 30) {
            clickedPlanet = planet;
        }
    });

    if (clickedPlanet) {
        onPlanetSelect(clickedPlanet);
    }
  };

  return (
    <canvas 
      ref={canvasRef} 
      onClick={handleClick}
      className="absolute top-0 left-0 w-full h-full cursor-pointer z-0"
    />
  );
};

export default OrbitalCanvas;