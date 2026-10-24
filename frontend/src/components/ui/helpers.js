export const AV = ["#E5432F", "#E9B44C", "#58B98B", "#7A9BF5", "#A98BF0", "#5A5852"];
export const TONES = ["red", "gold", "green", "blue", "violet"];
export const TONE_HEX = { red: "#E5432F", gold: "#E9B44C", green: "#58B98B", blue: "#7A9BF5", violet: "#A98BF0" };

/* 0–4 score against the backend password policy (8+, upper, lower, digit, symbol) */
export function pwScore(p) {
  if (!p) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter(r => r.test(p)).length;
  return Math.min(4, (p.length >= 8 ? 1 : 0) + (p.length >= 12 ? 1 : 0) + Math.max(0, kinds - 2));
}
export const pwOk = p => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^a-zA-Z0-9]/.test(p);
