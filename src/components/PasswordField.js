import { useState } from 'react';

function PasswordField({ id, label, name = 'password', placeholder, value, onChange }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 6 9 6a16 16 0 01-2.1 2.8M6.2 6.2C4.2 7.6 3 10 3 10s3.5 6 9 6a9.8 9.8 0 004.1-.9" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

export default PasswordField;
