// Almacenamiento de identificadores seleccionados
let selectedIdentifiers = [];
let heritageData = [];

// Manejo de pestañas
function openTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  document.getElementById(tabId).classList.add("active");
  event.currentTarget.classList.add("active");
}

// Función para añadir identificadores
document
  .getElementById("addIdentifierBtn")
  .addEventListener("click", function () {
    const input = document.getElementById("newIdentifier");
    const id = parseInt(input.value);

    if (!isNaN(id)) {
      if (!selectedIdentifiers.includes(id)) {
        selectedIdentifiers.push(id);
        renderIdentifierList();
        updateSelectedIdentifiersPreview();
      } else {
        showStatus(`El identificador ${id} ya está añadido`, "error");
      }
      input.value = "";
    } else {
      showStatus("Por favor ingresa un identificador válido", "error");
    }
    input.focus();
  });

// Función para renderizar la lista de identificadores
function renderIdentifierList() {
  const container = document.getElementById("identifierList");
  container.innerHTML = "";

  selectedIdentifiers.forEach((id) => {
    const item = document.createElement("div");
    item.className = "identifier-item";
    item.innerHTML = `
            ${id}
            <button class="remove-identifier" data-id="${id}">×</button>
        `;
    container.appendChild(item);
  });

  // Agregar event listeners a los botones de eliminar
  document.querySelectorAll(".remove-identifier").forEach((button) => {
    button.addEventListener("click", function () {
      const idToRemove = parseInt(this.getAttribute("data-id"));
      selectedIdentifiers = selectedIdentifiers.filter(
        (id) => id !== idToRemove
      );
      renderIdentifierList();
      updateSelectedIdentifiersPreview();
    });
  });
}

// Función para actualizar la vista previa de identificadores seleccionados
function updateSelectedIdentifiersPreview() {
  const preview = document.getElementById("selectedIdentifiersPreview");

  if (selectedIdentifiers.length === 0) {
    preview.textContent = "No hay identificadores seleccionados";
    return;
  }

  // Verificar si tenemos datos patrimoniales
  if (heritageData.length === 0) {
    preview.textContent = "Primero ingresa el JSON de patrimonios";
    return;
  }

  const items = [];
  selectedIdentifiers.forEach((id) => {
    const found = heritageData.find((item) => item.identifier === id);
    if (found) {
      items.push({
        identifier: found.identifier,
        name: found.name,
        type: found.type,
      });
    }
  });

  if (items.length > 0) {
    preview.textContent = JSON.stringify(items, null, 2);
  } else {
    preview.textContent =
      "No se encontraron patrimonios para los IDs seleccionados";
  }
}

// Función para validar y procesar el JSON de patrimonios
function processHeritageJson() {
  const jsonInput = document.getElementById("heritageJson").value;

  if (!jsonInput.trim()) {
    showStatus("Por favor ingresa el JSON de patrimonios", "error");
    return false;
  }

  try {
    const parsedData = JSON.parse(jsonInput);

    if (!Array.isArray(parsedData)) {
      showStatus("El JSON debe ser un array de objetos", "error");
      return false;
    }

    if (parsedData.length === 0) {
      showStatus("El JSON no contiene elementos", "error");
      return false;
    }

    // Validar estructura básica
    for (const item of parsedData) {
      if (!item.identifier || !item.description || !item.image) {
        showStatus(
          "Cada item debe tener identifier, description e image",
          "error"
        );
        return false;
      }
    }

    heritageData = parsedData;
    return true;
  } catch (error) {
    showStatus("JSON inválido: " + error.message, "error");
    return false;
  }
}

// Función separada para generar video desde datos de patrimonio
async function generateVideoFromHeritageData(
  apiUrl,
  heritageDataArray,
  targetLanguage,
  targetLength
) {
  try {
    const response = await fetch(apiUrl + "-multiJSON", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        heritageDataArray: heritageDataArray,
        targetLanguage: targetLanguage,
        targetLength: targetLength,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al generar el video");
    }

    return data;
  } catch (error) {
    console.error("Error en generateVideoFromHeritageData:", error);
    throw error;
  }
}

// Generación desde modo manual
document
  .getElementById("generateManualBtn")
  .addEventListener("click", async function () {
    const texto = document.getElementById("texto").value;
    const idioma = document.getElementById("idioma").value;
    const imageUrl = document.getElementById("imageUrl").value;
    const apiUrl = document.getElementById("apiUrl").value;

    if (!texto || !imageUrl || !apiUrl) {
      showStatus("Por favor completa todos los campos requeridos", "error");
      return;
    }

    await sendRequest(apiUrl, {
      texto: texto,
      idioma: idioma,
      imageUrl: imageUrl,
    });
  });

// Generación desde identificadores
document
  .getElementById("generateIdentifiersBtn")
  .addEventListener("click", async function () {
    const apiUrl = document.getElementById("apiUrl").value;
    const targetLanguage = document.getElementById("identifiersLanguage").value;
    const targetLength = document.getElementById(
      "identifiersTargetLength"
    ).value;

    if (!apiUrl) {
      showStatus("Por favor ingresa la URL del API", "error");
      return;
    }

    if (!processHeritageJson()) {
      return;
    }

    if (selectedIdentifiers.length === 0) {
      showStatus("Por favor añade al menos un identificador", "error");
      return;
    }

    const heritageDataArray = selectedIdentifiers
      .map((id) => {
        return heritageData.find((item) => item.identifier === id);
      })
      .filter((item) => item !== undefined);

    if (heritageDataArray.length === 0) {
      showStatus(
        "No se encontraron patrimonios para los identificadores seleccionados",
        "error"
      );
      return;
    }

    try {
      const result = await generateVideoFromHeritageData(
        apiUrl,
        heritageDataArray,
        targetLanguage,
        targetLength
      );

      const videoContainer = document.getElementById("videoContainer");
      const videoResult = document.getElementById("videoResult");
      videoResult.src = result.videoUrl;
      videoContainer.style.display = "block";
      showStatus("✅ Video generado con éxito!", "success");
    } catch (error) {
      showStatus("❌ Error al generar el video: " + error.message, "error");
    }
  });

async function sendRequest(url, body) {
  const statusDiv = document.getElementById("status");
  const videoContainer = document.getElementById("videoContainer");
  const videoResult = document.getElementById("videoResult");

  try {
    showStatus("Generando video...", "loading");
    videoContainer.style.display = "none";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al generar el video");
    }

    videoResult.src = data.videoUrl;
    videoContainer.style.display = "block";
    showStatus("✅ Video generado con éxito!", "success");
  } catch (error) {
    console.error("Error:", error);
    showStatus("❌ " + error.message, "error");
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = "block";

  statusDiv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Inicializar al cargar
document.addEventListener("DOMContentLoaded", function () {
  renderIdentifierList();

  document.getElementById("heritageJson").placeholder = `[
  {
    "identifier": 18,
    "name": "Ejemplo Patrimonio",
    "description": {
      "es": {
        "short": "Descripción corta",
        "extended": "Descripción extendida"
      },
      "en": {
        "short": "Short description",
        "extended": "Extended description"
      }
    },
    "image": "https://ejemplo.com/imagen.jpg"
  },
  ... // más elementos
]`;
});
