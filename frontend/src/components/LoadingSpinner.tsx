import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
        <h2 className="text-white text-xl font-semibold">CEG Connect</h2>
        <p className="text-white/80 mt-2">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;

