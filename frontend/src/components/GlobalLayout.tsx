import React from 'react';
import ShaderBackground from './lightswind/shader-background';

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Shader Background - Fixed and behind everything */}
      <div className="fixed inset-0 z-0">
        <ShaderBackground
          color="#3b82f6"
          backdropBlurAmount="lg"
          className="w-full h-full"
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
};

export default GlobalLayout;
