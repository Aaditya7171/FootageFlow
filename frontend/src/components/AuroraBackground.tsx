import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ children, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createGradient = (x: number, y: number, radius: number, colors: string[]) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });
      return gradient;
    };

    const animate = () => {
      time += 0.005;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create multiple aurora layers
      const layers = [
        {
          x: canvas.width * 0.2 + Math.sin(time * 0.8) * 200,
          y: canvas.height * 0.3 + Math.cos(time * 0.6) * 150,
          radius: 400 + Math.sin(time * 1.2) * 100,
          colors: ['rgba(255, 90, 95, 0.15)', 'rgba(255, 124, 130, 0.08)', 'rgba(255, 90, 95, 0.02)', 'transparent']
        },
        {
          x: canvas.width * 0.7 + Math.cos(time * 1.1) * 180,
          y: canvas.height * 0.6 + Math.sin(time * 0.9) * 120,
          radius: 350 + Math.cos(time * 0.8) * 80,
          colors: ['rgba(124, 58, 237, 0.12)', 'rgba(147, 51, 234, 0.06)', 'rgba(124, 58, 237, 0.02)', 'transparent']
        },
        {
          x: canvas.width * 0.5 + Math.sin(time * 0.7) * 250,
          y: canvas.height * 0.2 + Math.cos(time * 1.3) * 100,
          radius: 500 + Math.sin(time * 0.5) * 150,
          colors: ['rgba(59, 130, 246, 0.1)', 'rgba(99, 102, 241, 0.05)', 'rgba(59, 130, 246, 0.01)', 'transparent']
        },
        {
          x: canvas.width * 0.8 + Math.cos(time * 0.9) * 160,
          y: canvas.height * 0.8 + Math.sin(time * 1.1) * 140,
          radius: 300 + Math.cos(time * 1.5) * 70,
          colors: ['rgba(236, 72, 153, 0.08)', 'rgba(219, 39, 119, 0.04)', 'rgba(236, 72, 153, 0.01)', 'transparent']
        },
        {
          x: canvas.width * 0.1 + Math.sin(time * 1.4) * 120,
          y: canvas.height * 0.7 + Math.cos(time * 0.8) * 180,
          radius: 450 + Math.sin(time * 0.9) * 120,
          colors: ['rgba(16, 185, 129, 0.06)', 'rgba(5, 150, 105, 0.03)', 'rgba(16, 185, 129, 0.01)', 'transparent']
        }
      ];

      // Draw aurora layers
      layers.forEach(layer => {
        const gradient = createGradient(layer.x, layer.y, layer.radius, layer.colors);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Add subtle noise texture
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 8;
        data[i] += noise;     // Red
        data[i + 1] += noise; // Green
        data[i + 2] += noise; // Blue
      }
      
      ctx.putImageData(imageData, 0, 0);

      animationId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Aurora Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-neutral-900/20 via-transparent to-neutral-900/30 pointer-events-none z-10" />
      
      {/* Animated Particles */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 20 + 10,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
};

export default AuroraBackground;
