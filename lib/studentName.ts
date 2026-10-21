export function formatStudentName(value: string) {
  return value
    .toLowerCase()
    .replace(/(^| )(\p{L})/gu, (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
}

export function formatStudentNameInput(value: string) {
  return formatStudentName(value.replace(/[^\p{L} ]/gu, ""));
}
