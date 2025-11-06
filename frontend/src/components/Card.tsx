import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
  return (
    <div className={`card ${hover ? 'hover:shadow-md transition-shadow' : ''} ${className}`}>
      {children}
    </div>
  );
};

export default Card;

