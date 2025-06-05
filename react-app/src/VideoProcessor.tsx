/**
 * Clase VideoProcessor - Maneja todo lo relacionado con el procesamiento de video
 * 
 * Responsabilidad:
 * - Capturar video desde la cámara
 * - Procesar frames de video
 * - Proporcionar utilidades para manipulación de video
 */
class VideoProcessor {
    private videoStream: MediaStream | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private recordedChunks: Blob[] = [];

    /**
     * Solicita acceso a la cámara y inicia la transmisión de video
     * @param videoElement - Elemento HTMLVideoElement donde mostrar el video
     * @returns Promise<void>
     */
    public async startCamera(videoElement: HTMLVideoElement): Promise<void> {
        try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            videoElement.srcObject = this.videoStream;
        } catch (error) {
            throw new Error(`Error accessing camera: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Detiene la transmisión de video de la cámara
     */
    public stopCamera(): void {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    }

    /**
     * Inicia la grabación de video
     */
    public startRecording(): void {
        if (!this.videoStream) {
            throw new Error("Camera not initialized");
        }

        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(this.videoStream);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        };

        this.mediaRecorder.start();
    }

    /**
     * Detiene la grabación de video
     * @returns Promise<Blob> - Video grabado como Blob
     */
    public async stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error("Recording not started"));
                return;
            }

            this.mediaRecorder.onstop = () => {
                const videoBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                resolve(videoBlob);
            };

            this.mediaRecorder.onerror = (event) => {
                reject(new Error(`Recording error: ${event}`));
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Captura un frame del video como imagen
     * @param videoElement - Elemento HTMLVideoElement del que capturar el frame
     * @returns Promise<Blob> - Imagen capturada como Blob
     */
    public async captureFrame(videoElement: HTMLVideoElement): Promise<Blob> {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error("Could not get canvas context");
        }

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Could not capture frame"));
                    return;
                }
                resolve(blob);
            }, 'image/png');
        });
    }
}

export default VideoProcessor;