import React from 'react';

/**
 * Simple accessible spinner using the same animated SVG used in AIInterview.
 * Props:
 * - size: number (pixels) -> width/height
 * - label: string -> optional text below/alongside spinner
 * - className: string -> extra classes for the wrapper
 * - inline: boolean -> if true, renders inline-flex and smaller gap
 */
export default function Spinner({ size = 24, label = '', className = '', inline = false }) {
  const Wrapper = inline ? 'span' : 'div';
  return (
    <Wrapper
      className={`${inline ? 'inline-flex items-center gap-2' : 'flex flex-col items-center justify-center gap-2'} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <svg
        className="animate-spin text-gray-900"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {label ? <span className="text-xs text-gray-600 select-none">{label}</span> : null}
    </Wrapper>
  );
}
