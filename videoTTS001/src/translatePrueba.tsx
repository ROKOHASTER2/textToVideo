// translate.tsx
import React from "react";
// si queremos traducir a mas idiomas
// habra que cambiar esto
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

/**
 * Función para traducir texto usando la API de Google Translate
 * @param {string} texto - Texto a traducir
 * @param {LanguageCode} idioma - Idioma objetivo
 * @returns {Promise<string>} - Promesa que resuelve con el texto traducido
 */
export async function translate(
  texto: string,
  idioma: LanguageCode
): Promise<string> {
  // Verifica si el texto está vacío
  if (!texto.trim()) return texto;

  try {
    // URL de la API de Google Translate (versión gratuita)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${idioma}&dt=t&q=${encodeURIComponent(
      texto
    )}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error en la traducción: ${response.status}`);
    }

    const data = await response.json();

    // La respuesta de Google Translate viene en un formato peculiar
    // El texto traducido está en el primer elemento del primer array
    if (data && Array.isArray(data[0])) {
      return data[0].map((item: any[]) => item[0]).join("");
    }

    return texto;
  } catch (error) {
    console.error("Error al traducir:", error);
    return texto; // Devuelve el texto original si hay error
  }
}
