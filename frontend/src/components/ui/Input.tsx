import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
  variant?: 'text';
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
  variant: 'textarea';
}

type CombinedInputProps = InputProps | TextareaProps;

export function Input({
  label,
  error,
  helperText,
  className = '',
  variant = 'text',
  ...props
}: CombinedInputProps) {
  const baseStyles =
    'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors';
  const normalStyles = 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
  const errorStyles = 'border-red-500 focus:border-red-500 focus:ring-red-500';

  const inputStyles = `${baseStyles} ${error ? errorStyles : normalStyles} ${className}`;

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      {variant === 'textarea' ? (
        <textarea
          className={inputStyles}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input className={inputStyles} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
    </div>
  );
}
