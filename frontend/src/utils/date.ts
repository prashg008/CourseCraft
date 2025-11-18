const DEFAULT_LOCALE = 'en-US';

const parseDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateShort = (value?: string | null): string => {
  const date = parseDate(value);
  if (!date) {
    return 'Unknown date';
  }

  return date.toLocaleDateString(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateWithTime = (value?: string | null): string => {
  const date = parseDate(value);
  if (!date) {
    return 'Unknown date';
  }

  return date.toLocaleString(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
