export function maskAuthKeyValue(value: string) {
  if (!value) {
    return '****';
  }

  if (value.includes('****')) {
    return value;
  }

  const suffix = value.slice(-4);
  const prefix = value.startsWith('sk_') ? value.split('_').slice(0, 2).join('_') : '';

  return prefix ? `${prefix}_****${suffix}` : `****${suffix}`;
}
