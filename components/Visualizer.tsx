import React, { useEffect, useRef } from 'react';

interface Props {
  isActive: boolean;
  volume: number; // 0 to 1
}

const Visualizer: React.FC<Props> = ({ isActive, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const draw = () => {
      // Clear with slight fade for trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!isActive) {
        // Flat line if not active
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      const centerY = canvas.height / 2;
      const amplitude = volume * (canvas.height / 2) * 4; // Scale sensitivity

      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // Sky blue
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#0ea5e9';

      for (let x = 0; x < canvas.width; x++) {
        // Sine wave math
        const y = centerY + Math.sin((x * 0.05) + phase) * amplitude * Math.sin(x / canvas.width * Math.PI); 
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;

      phase += 0.2; // Speed
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isActive, volume]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={60} 
      className="w-full h-16 rounded-lg bg-slate-900/30"
    />
  );
};

export default Visualizer;