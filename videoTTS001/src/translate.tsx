// translate.tsx

type LanguageCode =
  | "es"
  | "en"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "ru"
  | "zh"
  | "ja"
  | "ar"
  | string;

// AQUI PONES TU API KEY OFICIAL DE GOOGLE TRANSLATE
const API_KEY = "TU_API_KEY_AQUI";

/**
 * Función para detectar el idioma del texto usando la API oficial de Google
 * @param {string} texto
 * @returns {Promise<string>}
 */
export async function detectLanguage(texto: string): Promise<string> {
  const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ q: texto }),
  });

  if (!response.ok) {
    throw new Error(`Error detectando idioma: ${response.status}`);
  }

  const res = await response.json();
  // Estructura: data.detections → [ [ { language: "es", ... } ] ]
  const detections = res.data?.detections;
  if (
    Array.isArray(detections) &&
    Array.isArray(detections[0]) &&
    detections[0][0]?.language
  ) {
    return detections[0][0].language;
  }

  throw new Error("Formato inesperado en detectLanguage()");
}

/**
 * Función para traducir texto usando la API de Google Translate
 * @param {string} texto
 * @param {LanguageCode} idioma
 * @returns {Promise<string>}
 */
export async function translate(
  texto: string,
  idioma: LanguageCode
): Promise<string> {
  // Verifica si el texto está vacío
  if (!texto.trim()) return texto;

  try {
    // Primero detectamos el idioma del texto, esperando su resolución
    const detected = await detectLanguage(texto);

    // Si ya está en el idioma destino, devolvemos el original
    if (detected === idioma) {
      console.log("Es el mismo idioma!");
      return texto;
    }

    // URL de la API oficial de Google para traducción
    const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        q: texto,
        target: idioma,
        format: "text",
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en la traducción: ${response.status}`);
    }

    const data = await response.json();
    // Estructura: data.translations[0].translatedText
    if (
      data &&
      data.data &&
      Array.isArray(data.data.translations) &&
      data.data.translations[0]?.translatedText
    ) {
      return data.data.translations[0].translatedText;
    }

    return texto;
  } catch (error) {
    console.error("Error al traducir:", error);
    return texto; // Devuelve el texto original si hay error
  }
}
