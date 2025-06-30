import translate from "@iamtraction/google-translate";

export function splitTextIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function calculateDurations(sentences, totalDuration) {
  const totalChars = sentences.reduce(
    (sum, sentence) => sum + sentence.length,
    0
  );

  if (totalChars === 0) {
    const uniformDuration = totalDuration / sentences.length;
    return Array(sentences.length).fill(uniformDuration);
  }

  return sentences.map((sentence) => {
    const proportion = sentence.length / totalChars;
    return proportion * totalDuration;
  });
}

export async function translateText(texto, idioma = "es") {
  try {
    // Verificar que el idioma no sea undefined o null
    const targetLang = idioma || "es";

    // Forzar el idioma de destino en la llamada a translate
    const result = await translate(texto, {
      to: targetLang,
      from: "auto", // Asegurar que detecte el idioma de origen automáticamente
    });
    return result.text;
  } catch (error) {
    console.error("Error al traducir el texto:", error);
    return texto; // Devuelve el texto original si hay error
  }
}
