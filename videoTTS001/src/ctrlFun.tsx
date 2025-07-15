import { useState, useRef } from "react";

export interface HeritageDescription {
  local: {
    short: string;
    extended: string;
  };
}
export const DEFAULT_IMAGE_URL =
  "https://res.cloudinary.com/worldpackers/image/upload/c_limit,f_auto,q_auto,w_1140/ywx1rgzx6zwpavg3db1f";

export interface HeritageItem {
  id: string;
  name: string;
  description: HeritageDescription;
  imageUrl: string;
}
export const useCtrlFun = () => {
  const [heritageItems, setHeritageItems] = useState<HeritageItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [jsonInput, setJsonInput] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [descriptionLength, setDescriptionLength] = useState<
    "short" | "extended"
  >("extended");
  const [testText, setTestText] = useState("");
  const [testImageUrl, setTestImageUrl] = useState("");
  const isAutoAdvancing = useRef(false);

  const currentItem = heritageItems[currentItemIndex] || {
    id: "default",
    name: "Patrimonio Cultural",
    description: {
      local: {
        short: "Ingrese un JSON válido para comenzar",
        extended: "Ingrese un JSON válido para comenzar",
      },
    },
    imageUrl: "",
  };

  const loadHeritageFromJson = () => {
    try {
      setJsonError(null);
      const parsedItems = JSON.parse(jsonInput);

      if (!Array.isArray(parsedItems)) {
        throw new Error("El JSON debe ser un array de objetos");
      }

      const validatedItems = parsedItems.map((item, index) => ({
        id: item.identifier?.toString() || `item-${index}`,
        name: item.name || `Patrimonio ${index + 1}`,
        description: {
          local: item.description?.local || { short: "", extended: "" },
        },
        imageUrl: item.image || "",
      }));

      setHeritageItems(validatedItems);
      setCurrentItemIndex(0);
      isAutoAdvancing.current = false;
    } catch (error: any) {
      setJsonError(`Error en el JSON: ${error.message}`);
      console.error("Error parsing JSON:", error);
    }
  };

  const prepareTestItem = () => {
    const testItem = {
      id: "test-item",
      name: "Prueba personalizada",
      description: {
        local: {
          short: testText,
          extended: testText,
        },
      },
      imageUrl: testImageUrl || DEFAULT_IMAGE_URL,
    };

    setHeritageItems([testItem]);
    setCurrentItemIndex(0);
    isAutoAdvancing.current = false;
  };

  const safeAdvance = () => {
    if (!isAutoAdvancing.current || heritageItems.length <= 1) return;

    setCurrentItemIndex((prev) =>
      prev < heritageItems.length - 1 ? prev + 1 : 0
    );
  };

  return {
    heritageItems,
    currentItemIndex,
    setCurrentItemIndex,
    jsonInput,
    setJsonInput,
    jsonError,
    descriptionLength,
    setDescriptionLength,
    testText,
    setTestText,
    testImageUrl,
    setTestImageUrl,
    currentItem,
    loadHeritageFromJson,
    prepareTestItem,
    isAutoAdvancing,
    safeAdvance,
  };
};
