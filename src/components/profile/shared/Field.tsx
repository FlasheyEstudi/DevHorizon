// =============================================================================
// shared/Field.tsx
// =============================================================================
// Wrapper de input con label + helper text + error. Sigue el patron visual
// del RegisterContent.astro (icono a la izquierda, focus ring primary,
// border transparente en focus).
// =============================================================================

import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface BaseFieldProps {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
  optional?: boolean;
  children?: ReactNode;
}

type InputFieldProps = BaseFieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'children'>;

export function Field({
  label,
  error,
  helper,
  required,
  optional,
  id,
  children,
  ...inputProps
}: InputFieldProps) {
  const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-texto"
      >
        {label}
        {required && <span className="text-error ml-1">*</span>}
        {optional && (
          <span className="text-texto-secundario font-normal ml-1.5 text-xs">
            (opcional)
          </span>
        )}
      </label>
      <input
        id={inputId}
        className="w-full px-3.5 py-2.5 border border-borde rounded-xl bg-blanco text-texto placeholder:text-texto-secundario focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        {...inputProps}
      />
      {helper && !error && (
        <p className="text-xs text-texto-secundario">{helper}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

type TextareaFieldProps = BaseFieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'children'>;

export function TextareaField({
  label,
  error,
  helper,
  required,
  optional,
  id,
  ...textareaProps
}: TextareaFieldProps) {
  const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-texto"
      >
        {label}
        {required && <span className="text-error ml-1">*</span>}
        {optional && (
          <span className="text-texto-secundario font-normal ml-1.5 text-xs">
            (opcional)
          </span>
        )}
      </label>
      <textarea
        id={inputId}
        className="w-full px-3.5 py-2.5 border border-borde rounded-xl bg-blanco text-texto placeholder:text-texto-secundario focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-y"
        {...textareaProps}
      />
      {helper && !error && (
        <p className="text-xs text-texto-secundario">{helper}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}

type SelectFieldProps = BaseFieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
    options: Array<{ value: string; label: string }>;
  };

export function SelectField({
  label,
  error,
  helper,
  required,
  optional,
  id,
  options,
  ...selectProps
}: SelectFieldProps) {
  const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-texto"
      >
        {label}
        {required && <span className="text-error ml-1">*</span>}
        {optional && (
          <span className="text-texto-secundario font-normal ml-1.5 text-xs">
            (opcional)
          </span>
        )}
      </label>
      <select
        id={inputId}
        className="w-full px-3.5 py-2.5 border border-borde rounded-lg bg-blanco text-texto focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
        {...selectProps}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {helper && !error && (
        <p className="text-xs text-texto-secundario">{helper}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}