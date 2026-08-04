/**
 * Formats a decimal hour number or string (e.g., 8.5, "8.5", "08:30", "8:3") into a clean "hh:mm" string (e.g., "08:30").
 */
export function formatHoursToHHMM(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '00:00';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    value = parseFloat(trimmed.replace(',', '.'));
  }

  if (isNaN(value) || value <= 0) return '00:00';

  const totalMinutes = Math.round(value * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Parses a string in "hh:mm", "h:mm", "8.5", or number into decimal hours (e.g. "08:30" -> 8.5)
 * for use in calculations like earnings/hour.
 */
export function parseHHMMToHours(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  const str = value.toString().trim();
  if (str.includes(':')) {
    const [hStr, mStr] = str.split(':');
    const h = parseFloat(hStr) || 0;
    const m = parseFloat(mStr) || 0;
    return h + (m / 60);
  }

  if (str.toLowerCase().includes('h')) {
    const match = str.toLowerCase().match(/^(\d+)\s*h\s*(\d+)?/);
    if (match) {
      const h = parseInt(match[1], 10) || 0;
      const m = parseInt(match[2] || '0', 10) || 0;
      return h + (m / 60);
    }
  }

  const num = parseFloat(str.replace(',', '.'));
  return isNaN(num) ? 0 : num;
}
