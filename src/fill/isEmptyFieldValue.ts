export function isEmptyFieldValue(value: string | undefined | null): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  return value.trim() === '';
}

export function valuesAreEqual(left: string | undefined, right: string): boolean {
  if (left === undefined) {
    return isEmptyFieldValue(right);
  }
  return left.trim() === right.trim();
}
