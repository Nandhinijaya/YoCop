import json
import os
import torch
import librosa
import tempfile
import requests
import logging
import traceback
import subprocess

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from transformers import (
    Wav2Vec2ForSequenceClassification,
    Wav2Vec2FeatureExtractor,
    pipeline
)

from urgency_analysis import get_urgency_analysis
from pinata_store import upload_to_pinata
import db

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://your-frontend.com"]}})

# Emotion labels
EMOTION_LABELS = [
    "Neutral", "Happy", "Sad", "Angry", "Fearful", "Disgusted", "Surprised"
]

# Model info
MODEL_NAME = "superb/wav2vec2-base-superb-er"
LOCAL_MODEL_DIR = "."
LOCAL_FEATURE_EXTRACTOR_DIR = "."

# Whisper-based transcription pipeline
pipe = pipeline("automatic-speech-recognition", model="openai/whisper-base")

# Convert audio to 16kHz mono PCM WAV
def convert_to_pcm_wav(input_path, output_path):
    try:
        subprocess.run([
            'ffmpeg', '-y', '-i', input_path,
            '-acodec', 'pcm_s16le', '-ac', '1', '-ar', '16000',
            output_path
        ], check=True)
    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg conversion failed: {e}")
        raise

# Load emotion detection model
def load_model():
    try:
        model_files_exist = any(f.startswith("pytorch_model") for f in os.listdir(LOCAL_MODEL_DIR))
        config_file_exists = os.path.exists(os.path.join(LOCAL_MODEL_DIR, "config.json"))
        feature_extractor_exists = os.path.exists(os.path.join(LOCAL_FEATURE_EXTRACTOR_DIR, "preprocessor_config.json"))

        if model_files_exist and config_file_exists and feature_extractor_exists:
            logger.info("✅ Loading model from local files...")
            feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(LOCAL_FEATURE_EXTRACTOR_DIR)
            model = Wav2Vec2ForSequenceClassification.from_pretrained(LOCAL_MODEL_DIR)
        else:
            logger.info("📦 Local files not found. Loading model from Hugging Face...")
            feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(MODEL_NAME)
            model = Wav2Vec2ForSequenceClassification.from_pretrained(MODEL_NAME)

        return model, feature_extractor
    except Exception as e:
        logger.error(f"⚠️ Error loading model: {e}")
        logger.error(traceback.format_exc())
        from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
        feature_extractor = AutoFeatureExtractor.from_pretrained(MODEL_NAME)
        model = AutoModelForAudioClassification.from_pretrained(MODEL_NAME)
        return model, feature_extractor

model, feature_extractor = load_model()
model.eval()

# Predict emotion
def predict_emotion(temp_path):
    try:
        speech_array, sampling_rate = librosa.load(temp_path, sr=16000)
        inputs = feature_extractor(speech_array, sampling_rate=sampling_rate, return_tensors="pt")
        with torch.no_grad():
            logits = model(**inputs).logits
        predicted_class_id = torch.argmax(logits, dim=-1).item()
        return EMOTION_LABELS[predicted_class_id]
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        logger.error(traceback.format_exc())
        return "error"

@app.route('/')
def index():
    return "🚀 Flask App is running."

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    logger.info("📩 Incoming /transcribe request")

    if 'file' not in request.files:
        logger.error("🚫 No file part in the request.")
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    logger.info(f"📁 File received: {file.filename}, MIME: {file.mimetype}")

    try:
        metadata_raw = request.form.get('metadata', '{}')
        logger.info(f"🧾 Raw metadata: {metadata_raw}")
        metadata = json.loads(metadata_raw)
    except json.JSONDecodeError:
        logger.error("❌ Metadata parsing failed")
        return jsonify({"error": "Invalid metadata format. Must be valid JSON."}), 400

    phone_number = metadata.get('phoneNumber', '')
    ip_address = metadata.get('ipAddress', '')

    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file.mimetype not in ['audio/wav', 'audio/x-wav', 'audio/wave']:
        return jsonify({"error": f"Invalid MIME type: {file.mimetype}. Supported types: audio/wav, audio/x-wav, audio/wave."}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        logger.info(f"📂 File saved temporarily at {tmp_path}")

        # Convert audio
        converted_path = tmp_path.replace(".wav", "_converted.wav")
        convert_to_pcm_wav(tmp_path, converted_path)

        # Transcription
        result = pipe(converted_path)
        transcription = result['text']
        logger.info(f"📝 Transcription: {transcription}")

        # Emotion detection
        emotion_response = predict_emotion(converted_path)
        logger.info(f"😐 Emotion: {emotion_response}")

        # Clean up temp files
        os.unlink(tmp_path)
        os.unlink(converted_path)

        # Analyze urgency
        urgency_analysis = get_urgency_analysis(transcription, emotion_response)
        urgency_analysis.update({
            "emotion": emotion_response,
            "transcription": transcription,
            "phone_number": phone_number,
            "ip_address": ip_address,
            "timestamp": datetime.now().isoformat()
        })

        # Upload to IPFS
        ipfs_hash = upload_to_pinata(urgency_analysis)
        tracking_id = db.store_in_db({'ph': phone_number, 'ipfsHash': ipfs_hash})
        ipfs_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}" if ipfs_hash else None

        return jsonify({
            "status": "success",
            "tracking_id": str(tracking_id),
            "ipfs_url": ipfs_url,
            "ipfs_hash": ipfs_hash,
            "transcription": transcription,
            "emotion": emotion_response,
            "urgency": urgency_analysis.get("urgency", "unknown"),
            "metadata": {
                "phone_number": phone_number,
                "ip_address": ip_address
            },
            "timestamp": urgency_analysis.get("timestamp")
        }), 200

    except Exception as e:
        logger.error(f"❌ Error processing file: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"status": "error", "message": f"Error processing file: {str(e)}"}), 500

@app.route('/getbuffer', methods=['POST'])
def get_buffer():
    # handle POST request here
    return "POST received"

@app.route('/getlatestcomplaint', methods=['POST'])
def get_latest_complaint():
    try:
        data = request.get_json()
        raw_number = data.get('phone_number')
        if not raw_number:
            return jsonify({"error": "Phone number is required"}), 400

        phone_number = ''.join(filter(str.isdigit, raw_number))
        if phone_number.startswith("91"):
            phone_number = phone_number[2:]

        logger.info(f"🔍 Looking up complaint for phone: {phone_number}")
        complaint = db.fetch_from_phone(phone_number)
        return jsonify({'data': complaint})
    except Exception as e:
        logger.error(f"Error fetching latest complaint: {e}")
        logger.error(traceback.format_exc())
        return jsonify({"error": "Server error fetching latest complaint"}), 500

@app.route('/getcomplaint', methods=['POST'])
def getcomplaint():
    json_data = request.get_json()
    if not json_data:
        return jsonify({"error": "Tracking ID is required"}), 400
    return jsonify({'data': db.fetch_from_id(json_data)})

@app.route('/insert', methods=['POST'])
def insert():
    data = request.get_json()
    inserted_id = db.store_in_db(data)
    return jsonify({'status': "success", 'tracking_id': str(inserted_id)})

@app.route('/getComplaints', methods=['GET'])
def get_complaints():
    return jsonify({'data': db.fetch_all()})

@app.route('/getcomplaints', methods=['POST'])
def get_all_complaints():
    return jsonify({'data': db.fetch_all_comp()})

@app.route('/get-complaint-data/<ipfs_hash>', methods=['GET'])
def get_complaint_data(ipfs_hash):
    ipfs_url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
    try:
        response = requests.get(ipfs_url, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return jsonify({
                "success": True,
                "data": data
            })
        else:
            logger.warning(f"Failed to fetch data: {response.status_code}")
            return jsonify({
                "success": False,
                "error": f"Failed to fetch data from IPFS. Status code: {response.status_code}"
            }), 500

    except Exception as e:
        logger.error(f"IPFS fetch error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Run Flask App
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
