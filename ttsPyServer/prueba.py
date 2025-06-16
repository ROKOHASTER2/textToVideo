from flask import Flask, request, jsonify, send_file
import subprocess
import os
import pyttsx3
import uuid
import shutil
import requests
from io import BytesIO
from PIL import Image

app = Flask(__name__)

# Configuración de directorios
TEMP_DIR = "temp_assets"
os.makedirs(TEMP_DIR, exist_ok=True)

def clean_temp_files():
    """Elimina todos los archivos temporales"""
    try:
        shutil.rmtree(TEMP_DIR)
        os.makedirs(TEMP_DIR)
    except Exception as e:
        app.logger.error(f"Error cleaning temp files: {str(e)}")

def download_image(image_url):
    """Descarga una imagen desde una URL y devuelve su ruta local"""
    try:
        response = requests.get(image_url, stream=True)
        response.raise_for_status()
        
        # Verificar que sea una imagen
        content_type = response.headers.get('content-type', '').lower()
        if 'image' not in content_type:
            raise ValueError("URL no apunta a una imagen válida")
        
        # Crear nombre único para la imagen
        ext = content_type.split('/')[-1] if '/' in content_type else 'png'
        file_id = uuid.uuid4().hex
        image_path = os.path.join(TEMP_DIR, f"{file_id}_image.{ext}")
        
        # Guardar imagen
        with open(image_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        # Verificar que sea una imagen válida
        try:
            with Image.open(image_path) as img:
                img.verify()
        except:
            os.remove(image_path)
            raise ValueError("Archivo descargado no es una imagen válida")
            
        return image_path
        
    except Exception as e:
        app.logger.error(f"Image Download Error: {str(e)}")
        raise

def text_to_speech(text, audio_file):
    """Convierte texto a voz usando pyttsx3"""
    try:
        engine = pyttsx3.init()
        engine.save_to_file(text, audio_file)
        engine.runAndWait()
        return True
    except Exception as e:
        app.logger.error(f"TTS Error: {str(e)}")
        return False

def create_video_with_audio(input_image, output_file, audio_file, duration_sec=None, fps=30):
    """Crea video desde imagen estática con FFmpeg"""
    try:
        duration_args = ['-t', str(duration_sec)] if duration_sec else []
        
        command = [
            'ffmpeg',
            '-loop', '1',
            '-i', input_image,
            '-i', audio_file,
            *duration_args,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
            '-pix_fmt', 'yuv420p',
            '-shortest',
            '-y',  # Sobrescribir si existe
            output_file
        ]
        
        result = subprocess.run(
            command, 
            capture_output=True, 
            text=True
        )
        
        if result.returncode != 0:
            app.logger.error(f"FFmpeg Error: {result.stderr}")
            return False
            
        return True
    except Exception as e:
        app.logger.error(f"Video Creation Error: {str(e)}")
        return False

@app.route('/generate-video', methods=['POST'])
def generate_video():
    """Endpoint para generación de videos con TTS usando URL de imagen"""
    # Validar datos de entrada
    data = request.get_json()
    
    if not data:
        return jsonify({
            "error": "Invalid JSON format",
            "message": "Please provide JSON data"
        }), 400
        
    if 'text' not in data:
        return jsonify({
            "error": "Missing text parameter",
            "message": "Please provide text for TTS conversion"
        }), 400
        
    if 'image_url' not in data:
        return jsonify({
            "error": "Missing image_url parameter",
            "message": "Please provide image URL"
        }), 400

    # Obtener parámetros
    text = data['text']
    image_url = data['image_url']
    duration = data.get('duration')
    fps = data.get('fps', 30)
    
    
   
    # Generar nombres únicos para archivos
    file_id = uuid.uuid4().hex
    audio_path = os.path.join(TEMP_DIR, f"{file_id}_audio.mp3")
    video_path = os.path.join(TEMP_DIR, f"{file_id}_video.mp4")
    
    try:
        # Descargar imagen
        image_path = download_image(image_url)
        
        # Generar audio
        if not text_to_speech(text, audio_path):
            return jsonify({
                "error": "TTS Conversion Failed",
                "message": "Could not convert text to speech"
            }), 500
            
        # Generar video
        if not create_video_with_audio(
            image_path, 
            video_path, 
            audio_path,
            duration_sec=duration,
            fps=fps
        ):
            return jsonify({
                "error": "Video Generation Failed",
                "message": "Could not create video with audio"
            }), 500
            
        # Enviar archivo de video
        return send_file(
            video_path,
            mimetype='video/mp4',
            as_attachment=True,
            download_name='generated_video.mp4'
        )
        
    except Exception as e:
        app.logger.error(f"API Error: {str(e)}")
        return jsonify({
            "error": "Internal Server Error",
            "message": str(e)
        }), 500
        
    finally:
        # Limpiar archivos temporales
        try:
            for path in [image_path, audio_path, video_path]:
                if path and os.path.exists(path):
                    os.remove(path)
        except:
            pass

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)