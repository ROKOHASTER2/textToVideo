export function detectSentenceEnds(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

export function getCurrentText(sentences: string[], index: number): string {
  return sentences.slice(0, index + 1).join(" ");
}

export function calculateDuration(text: string): number {
  return Math.max(3, text.length / 15); // estimación de duración en segundos
}
