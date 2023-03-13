import format from "format-duration";

export function toHumanTime(ms: number): string {
  return format(ms, { leading: true });
}
