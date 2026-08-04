/** Portrait placeholder keys until art assets land (`{class}-{gender}`). */

export type PortraitGender = 'male' | 'female';

export function portraitPlaceholderKey(
  classId: string,
  gender: PortraitGender,
): string {
  return `${classId}-${gender}`;
}

/** Display monogram from class id (first letter). */
export function classMonogram(classId: string): string {
  return classId.charAt(0).toUpperCase();
}
