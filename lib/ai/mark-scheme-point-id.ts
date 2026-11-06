export function nextMarkPointId(existingIds: string[]): string {
  const used = new Set(existingIds);
  let candidate = 1;
  while (used.has("M" + candidate)) candidate += 1;
  return "M" + candidate;
}
