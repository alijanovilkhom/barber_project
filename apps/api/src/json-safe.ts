/** Prisma can return BigInt IDs that JSON.stringify cannot serialize. */
export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item,
  )) as T;
}
