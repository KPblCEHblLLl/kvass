import { Khlebets } from '../types/khlebets';

export function formatKhlebetsLabel(khlebets: Khlebets): string {
  const sugarValue = khlebets.sugar !== undefined && khlebets.sugar !== null ? String(khlebets.sugar) : '0';
  const snackSuffix = khlebets.isSnack ? ' plus seeds' : '';
  return `# ${khlebets.iteration}: ${khlebets.flowerType} — ${khlebets.flower}:${khlebets.water}:${sugarValue}${snackSuffix}`;
}
