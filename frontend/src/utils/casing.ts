const camelCaseKey = (key: string) => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && !Array.isArray(value) && typeof value === 'object';

const camelizeRecursive = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(camelizeRecursive);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
      acc[camelCaseKey(key)] = camelizeRecursive(nestedValue);
      return acc;
    }, {});
  }

  return value;
};

export const camelizeKeys = <T>(value: T): T => camelizeRecursive(value) as T;
