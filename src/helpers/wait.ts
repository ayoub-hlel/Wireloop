export function wait(msTime: number) {
  return new Promise((resolve) => setTimeout(resolve, msTime));
}
