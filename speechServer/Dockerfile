# Usa imagen oficial de Node con arquitectura Linux AMD64
FROM --platform=linux/amd64 node:20-bookworm

# Instala dependencias del sistema
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    build-essential \
    python3 \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    fonts-freefont-ttf \
    fonts-dejavu && \
    rm -rf /var/lib/apt/lists/*

# Crea directorio de la app
WORKDIR /usr/src/app

# Copia solo los archivos de dependencias
COPY package*.json ./

# Instala dependencias DENTRO del contenedor
RUN npm install --build-from-source

# Luego copia el resto del código
COPY . .

# Variables de entorno
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV NODE_ENV=production

# Expone el puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "server.js"]
