/** Random integer between min and max (inclusive) */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float between min and max */
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/** Pick a random element from an array */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Shuffle an array in place (Fisher-Yates) */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr;
}

/** Generate a UUID v4 */
export function uuid() {
  return crypto.randomUUID();
}
