import React from 'react';

export const AuthLoadingSpinner: React.FC = () => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-dark-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-primary-glow border-dark-border" />
        <p className="text-sm font-medium text-gray-400">Authenticating with Firebase...</p>
      </div>
    </div>
  );
};
