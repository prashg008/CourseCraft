import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'draft' | 'published' | 'generating' | 'default' | 'success' | 'warning' | 'error';
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const variants = {
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    published: 'bg-green-100 text-green-700 border-green-300',
    generating: 'bg-blue-100 text-blue-700 border-blue-300',
    default: 'bg-gray-100 text-gray-700 border-gray-300',
    success: 'bg-green-100 text-green-700 border-green-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    error: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
