import React from 'react';

const MaterialIcon = ({ name, size = 20, className = '', filled = false, color, style, ...props }) => (
  <span
    className={`material-symbols-rounded ${className}`}
    style={{
      fontSize: size,
      width: size,
      height: size,
      fontVariationSettings: filled ? `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24` : `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`,
      color: color || 'inherit',
      lineHeight: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style,
    }}
    aria-hidden="true"
    {...props}
  >
    {name}
  </span>
);

export default MaterialIcon;
