import React from 'react';
import './AnimatedBackground.css';

const AnimatedBackground = ({ className = '' }) => {
  return (
    <div className={`animated-background ${className}`} aria-hidden="true">
      <div className="bg bg1" />
      <div className="bg bg2" />
      <div className="bg bg3" />
    </div>
  );
};

export default AnimatedBackground;