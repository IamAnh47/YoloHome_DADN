import React, { useState, useEffect } from 'react';

/**
 * Component to display a live countdown timer
 */
const CountdownStatus = ({ initialSeconds, onComplete }) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  
  useEffect(() => {
    if (seconds <= 0) {
      if (onComplete) onComplete();
      return;
    }
    
    const timer = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(timer);
          if (onComplete) onComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [seconds, onComplete]);
  
  // Format seconds to mm:ss
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="countdown-remaining">
      Còn lại: {formatTime(seconds)}
    </div>
  );
};

export default CountdownStatus; 