/** Date-only entries use local calendar days, never UTC midnight. */
export function validLogDate(value: string, latest: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > latest) return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10))
  );
}

export function validNumber(
  value: string,
  min: number,
  max: number,
  optional = true,
  integer = false,
): boolean {
  if (!value.trim()) return optional;
  const number = Number(value);
  return (
    Number.isFinite(number) &&
    number >= min &&
    number <= max &&
    (!integer || Number.isInteger(number))
  );
}

export function validDoseTimes(value: string): boolean {
  const times = value.split(",").map((t) => t.trim());
  return times.length <= 6 && times.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t));
}
