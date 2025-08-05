import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface InteractiveAuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const InteractiveAuroraBackground: React.FC<InteractiveAuroraBackgroundProps> = ({ 
  children, 
  className = '' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [clickRipples, setClickRipples] = useState<Array<{ id: number; x: number; y: number; time: number }>>([]);

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

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleClick = (e: MouseEvent) => {
      const newRipple = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
        time: 0
      };
      setClickRipples(prev => [...prev, newRipple]);
      
      setTimeout(() => {
        setClickRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 2000);
    };

    const createGradient = (x: number, y: number, radius: number, colors: string[]) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color);
      });
      return gradient;
    };

    const animate = () => {
      time += 0.008;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Mouse influence factor
      const mouseInfluence = isHovering ? 1.5 : 1;
      const mouseX = mousePos.x / canvas.width;
      const mouseY = mousePos.y / canvas.height;

      // Create multiple aurora layers with mouse interaction
      const layers = [
        {
          x: canvas.width * (0.2 + mouseX * 0.1) + Math.sin(time * 0.8) * 200 * mouseInfluence,
          y: canvas.height * (0.3 + mouseY * 0.1) + Math.cos(time * 0.6) * 150 * mouseInfluence,
          radius: (400 + Math.sin(time * 1.2) * 100) * mouseInfluence,
          colors: [
            `rgba(255, 90, 95, ${0.2 * mouseInfluence})`, 
            `rgba(255, 124, 130, ${0.12 * mouseInfluence})`, 
            `rgba(255, 90, 95, ${0.04 * mouseInfluence})`, 
            'transparent'
          ]
        },
        {
          x: canvas.width * (0.7 - mouseX * 0.05) + Math.cos(time * 1.1) * 180 * mouseInfluence,
          y: canvas.height * (0.6 - mouseY * 0.05) + Math.sin(time * 0.9) * 120 * mouseInfluence,
          radius: (350 + Math.cos(time * 0.8) * 80) * mouseInfluence,
          colors: [
            `rgba(124, 58, 237, ${0.15 * mouseInfluence})`, 
            `rgba(147, 51, 234, ${0.08 * mouseInfluence})`, 
            `rgba(124, 58, 237, ${0.03 * mouseInfluence})`, 
            'transparent'
          ]
        },
        {
          x: canvas.width * (0.5 + mouseX * 0.08) + Math.sin(time * 0.7) * 250 * mouseInfluence,
          y: canvas.height * (0.2 + mouseY * 0.08) + Math.cos(time * 1.3) * 100 * mouseInfluence,
          radius: (500 + Math.sin(time * 0.5) * 150) * mouseInfluence,
          colors: [
            `rgba(59, 130, 246, ${0.12 * mouseInfluence})`, 
            `rgba(99, 102, 241, ${0.06 * mouseInfluence})`, 
            `rgba(59, 130, 246, ${0.02 * mouseInfluence})`, 
            'transparent'
          ]
        },
        {
          x: canvas.width * (0.8 - mouseX * 0.1) + Math.cos(time * 0.9) * 160 * mouseInfluence,
          y: canvas.height * (0.8 - mouseY * 0.1) + Math.sin(time * 1.1) * 140 * mouseInfluence,
          radius: (300 + Math.cos(time * 1.5) * 70) * mouseInfluence,
          colors: [
            `rgba(236, 72, 153, ${0.1 * mouseInfluence})`, 
            `rgba(219, 39, 119, ${0.05 * mouseInfluence})`, 
            `rgba(236, 72, 153, ${0.02 * mouseInfluence})`, 
            'transparent'
          ]
        }
      ];

      // Draw aurora layers
      layers.forEach(layer => {
        const gradient = createGradient(layer.x, layer.y, layer.radius, layer.colors);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Draw click ripples
      clickRipples.forEach(ripple => {
        ripple.time += 0.05;
        const rippleRadius = ripple.time * 200;
        const rippleOpacity = Math.max(0, 1 - ripple.time);
        
        const rippleGradient = ctx.createRadialGradient(
          ripple.x, ripple.y, 0,
          ripple.x, ripple.y, rippleRadius
        );
        rippleGradient.addColorStop(0, `rgba(255, 255, 255, ${rippleOpacity * 0.3})`);
        rippleGradient.addColorStop(0.5, `rgba(255, 90, 95, ${rippleOpacity * 0.2})`);
        rippleGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = rippleGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      });

      // Add subtle noise texture
      if (Math.random() > 0.95) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 6;
          data[i] += noise;     // Red
          data[i + 1] += noise; // Green
          data[i + 2] += noise; // Blue
        }
        
        ctx.putImageData(imageData, 0, 0);
      }

      animationId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationId);
    };
  }, [mousePos, isHovering, clickRipples]);

  return (
    <div 
      className={`relative min-h-screen overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Interactive Aurora Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-0"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Dynamic Gradient Overlay */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-10"
        animate={{
          background: isHovering 
            ? 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.1) 0%, transparent 50%)'
            : 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
        }}
        style={{
          '--mouse-x': `${(mousePos.x / window.innerWidth) * 100}%`,
          '--mouse-y': `${(mousePos.y / window.innerHeight) * 100}%`
        } as React.CSSProperties}
      />
      
      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 25 + 15,
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

export default InteractiveAuroraBackground;
