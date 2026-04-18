import type { InputHTMLAttributes } from 'react';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  /** Group name shared by all radio inputs. */
  name: string;
  /** Must match the htmlFor on the wrapping Field (used as base id). */
  id: string;
  options: RadioOption[];
  value?: string | undefined;
  onChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
  /** Validation error text (used for aria-describedby). */
  error?: string | undefined;
}

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--citey-space-2)',
  fontFamily: 'var(--citey-font-family)',
  fontSize: 'var(--citey-font-size-md)',
};

const optionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--citey-space-2)',
  cursor: 'pointer',
};

const radioStyle: React.CSSProperties = {
  accentColor: 'var(--citey-color-primary)',
};

export function RadioGroup({
  name,
  id,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      id={id}
      aria-describedby={error != null ? `${id}-error` : undefined}
      style={groupStyle}
    >
      {options.map((opt) => {
        const optId = `${id}-${opt.value}`;
        return (
          <label key={opt.value} htmlFor={optId} style={optionStyle}>
            <input
              type="radio"
              id={optId}
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={onChange}
              style={radioStyle}
            />
            <span style={{ color: 'var(--citey-color-text)' }}>
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
