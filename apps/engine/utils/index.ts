export type StreamFieldList = string[]; // ["data", "{...}", "k2", "v2", ...]
export type StreamEntry = [id: string, fields: StreamFieldList];
export type StreamRead = Array<[stream: string, entries: StreamEntry[]]>;

export function fieldsToObjects(
  fields: StreamFieldList
): Record<string, string> {
  const obj: Record<string, string> = {};

  for (let i = 0; i + 1 < fields.length; i += 2) {
    obj[fields[i]!] = fields[i + 1] ?? "";
  }

  return obj;
}
