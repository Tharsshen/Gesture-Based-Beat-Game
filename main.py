import cv2
import mediapipe as mp
import numpy as np
import threading
import time
import json
import os
import random
import webbrowser
from flask import Flask, Response, request, send_from_directory, jsonify
import logging
import yt_dlp
import librosa
import sounddevice as sd
import re
from flask_socketio import SocketIO, emit

logging.getLogger('mediapipe').setLevel(logging.ERROR)

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.7, min_tracking_confidence=0.5)

WEBCAM_WIDTH = 640
WEBCAM_HEIGHT = 480
PORT = 8000

os.makedirs('static/css', exist_ok=True)
os.makedirs('static/js', exist_ok=True)
os.makedirs('static/songs', exist_ok=True)
os.makedirs('static/sounds', exist_ok=True)
os.makedirs('static/images', exist_ok=True)

def detect_gesture(hand_landmarks):
    if not hand_landmarks:
        return "none"
    landmarks = [(lm.x, lm.y, lm.z) for lm in hand_landmarks.landmark]
    if (landmarks[8][1] < landmarks[5][1] and landmarks[12][1] < landmarks[9][1] and
        landmarks[16][1] > landmarks[13][1] and landmarks[20][1] > landmarks[17][1]):
        return "peace"
    if (landmarks[8][1] < landmarks[5][1] and landmarks[12][1] > landmarks[9][1] and
        landmarks[16][1] > landmarks[13][1] and landmarks[20][1] > landmarks[17][1]):
        return "index"
    if (landmarks[8][1] > landmarks[5][1] and landmarks[12][1] > landmarks[9][1] and
        landmarks[16][1] > landmarks[13][1] and landmarks[20][1] > landmarks[17][1]):
        return "fist"
    if (landmarks[8][1] < landmarks[5][1] and landmarks[12][1] < landmarks[9][1] and
        landmarks[16][1] < landmarks[13][1] and landmarks[20][1] < landmarks[17][1]):
        return "open_hand"
    return "none"

def sanitize_filename(filename):
    return re.sub(r'[<>:"/\\|?*]', '_', filename).strip()

def estimate_difficulty(bpm, duration):
    score = (bpm / 100) + (duration / 300)
    if score < 1.5:
        return {'level': 'Easy', 'multiplier': 1.0}
    elif score < 2.0:
        return {'level': 'Medium', 'multiplier': 1.2}
    elif score < 2.5:
        return {'level': 'Hard', 'multiplier': 1.5}
    else:
        return {'level': 'Expert', 'multiplier': 2.0}

def generate_patterns(song_name, bpm, duration, difficulty_multiplier):
    gestures = ["peace", "index", "fist", "open_hand"]
    total_beats = int((bpm / 60) * duration * difficulty_multiplier)
    sequence = [random.choice(gestures) for _ in range(total_beats)]
    return {song_name: sequence}

def cleanup_temp_files(temp_dir):
    try:
        files = os.listdir(temp_dir)
        for file in files:
            if file.startswith("temp_") or file.endswith('.webm'):
                file_path = os.path.join(temp_dir, file)
                try:
                    os.remove(file_path)
                except:
                    pass
    except:
        pass

def search_youtube_songs(query):
    ydl_opts = {
        'format': 'bestaudio',
        'noplaylist': True,
        'quiet': True,
        'noprogress': True,
        'extract_flat': True,
        'force_generic_extractor': False,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    try:
        time.sleep(1)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            search_query = f"ytsearch5:{query}"
            result = ydl.extract_info(search_query, download=False)
            videos = result.get('entries', [])
            return [{'title': video['title'], 'id': video['id']} for video in videos]
    except Exception as e:
        print(f"Error searching YouTube: {e}")
        return []

def download_song(video_id, song_name):
    sanitized_song_name = sanitize_filename(song_name)
    file_path = f'static/songs/{sanitized_song_name}.mp3'
    temp_dir = 'static/songs'

    cleanup_temp_files(temp_dir)

    if os.path.exists(file_path):
        print(f"Song {song_name} already downloaded")
        try:
            y, sr = librosa.load(file_path)
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
            duration = librosa.get_duration(y=y, sr=sr)
            difficulty = estimate_difficulty(float(tempo), float(duration))
            return {
                'bpm': float(tempo),
                'duration': float(duration),
                'difficulty': difficulty,
                'file': f'/songs/{sanitized_song_name}.mp3'
            }
        except Exception as e:
            print(f"Error analyzing existing song {song_name}: {e}")
            raise

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'static/songs/{sanitized_song_name}.%(ext)s',
        'quiet': True,
        'noprogress': True,
        'no_warnings': True,
        'noplaylist': True,
        'nooverwrites': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }
    try:
        time.sleep(1)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Downloading song: {song_name} (Sanitized: {sanitized_song_name}, ID: {video_id})")
            ydl.download([f"https://www.youtube.com/watch?v={video_id}"])

        if not os.path.exists(file_path):
            for file in os.listdir(temp_dir):
                if file.startswith(sanitized_song_name):
                    temp_file = os.path.join(temp_dir, file)
                    if os.path.exists(temp_file):
                        os.rename(temp_file, file_path)
                        break
            if not os.path.exists(file_path):
                raise Exception(f"Downloaded file not found for {song_name}")

        y, sr = librosa.load(file_path)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        duration = librosa.get_duration(y=y, sr=sr)
    except Exception as e:
        print(f"Error downloading or analyzing song {song_name}: {e}")
        raise
    
    difficulty = estimate_difficulty(float(tempo), float(duration))
    return {
        'bpm': float(tempo),
        'duration': float(duration),
        'difficulty': difficulty,
        'file': f'/songs/{sanitized_song_name}.mp3'
    }

class WebcamFeed:
    def __init__(self, player_id):
        self.player_id = player_id
        cam_index = 0
        self.cap = cv2.VideoCapture(cam_index)
        self.current_gesture = "none"
        self.lock = threading.Lock()
        if not self.cap.isOpened():
            print(f"Error: Could not open webcam for player {player_id} (index {cam_index})")
        else:
            print(f"Webcam {player_id} (index {cam_index}) opened successfully")

    def read_frame(self):
        ret, frame = self.cap.read()
        if not ret:
            return None
        frame = cv2.resize(frame, (WEBCAM_WIDTH, WEBCAM_HEIGHT))
        frame = cv2.flip(frame, 1)
        return frame

    def process_gestures(self):
        while True:
            frame = self.read_frame()
            if frame is None:
                continue
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb_frame)
            gesture = "none"
            if results.multi_hand_landmarks:
                for hand_landmarks in results.multi_hand_landmarks:
                    gesture = detect_gesture(hand_landmarks)
                    mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            with self.lock:
                self.current_gesture = gesture
                
            try:
                socketio.emit('gesture', {'player': self.player_id, 'gesture': gesture})
            except Exception as e:
                print(f"Error sending gesture via SocketIO: {e}")
                
            time.sleep(0.03)

    def get_gesture(self):
        with self.lock:
            return self.current_gesture

    def generate_feed(self):
        while True:
            frame = self.read_frame()
            if frame is None:
                continue
            _, buffer = cv2.imencode('.jpg', frame)
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

    def release(self):
        self.cap.release()

feeds = {1: WebcamFeed(1)}
threading.Thread(target=feeds[1].process_gestures, daemon=True).start()

@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')

@app.route('/video_feed')
def video_feed():
    return Response(feeds[1].generate_feed(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_gesture/<player>')
def get_gesture(player):
    return {"gesture": feeds[1].get_gesture()}

@app.route('/search_song', methods=['POST'])
def search_song():
    query = request.json.get('query', '')
    return jsonify(search_youtube_songs(query))

@app.route('/select_song', methods=['POST'])
def select_song():
    try:
        video_id = request.json.get('video_id')
        song_name = request.json.get('song_name')
        if not video_id or not song_name:
            return jsonify({'error': 'Missing video_id or song_name'}), 400

        song_data = download_song(video_id, song_name)

        sanitized_song_name = sanitize_filename(song_name)
        patterns_file = 'static/songs/patterns.json'
        
        try:
            patterns = {}
            if os.path.exists(patterns_file):
                try:
                    with open(patterns_file, 'r') as f:
                        patterns = json.load(f)
                except json.JSONDecodeError:
                    print(f"Error parsing patterns file, creating new one")
                    patterns = {}
            
            if sanitized_song_name not in patterns:
                print(f"Creating new patterns for {sanitized_song_name}")
                song_patterns = generate_patterns(
                    sanitized_song_name, 
                    song_data['bpm'], 
                    song_data['duration'], 
                    song_data['difficulty']['multiplier']
                )
                patterns.update(song_patterns)
                
                with open(patterns_file, 'w') as f:
                    json.dump(patterns, f)
                print(f"Saved patterns for {sanitized_song_name}")
        except Exception as e:
            print(f"Error with patterns for {sanitized_song_name}: {e}")

        return jsonify({
            'name': sanitized_song_name,
            'bpm': float(song_data['bpm']),
            'duration': float(song_data['duration']),
            'difficulty': song_data['difficulty']['level'],
            'multiplier': float(song_data['difficulty']['multiplier']),
            'file': song_data['file']
        })

    except Exception as e:
        print(f"Error in /select_song: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/songs/<path:filename>')
def serve_song(filename):
    return send_from_directory('static/songs', filename)

@app.route('/save_score', methods=['POST'])
def save_score():
    try:
        data = request.json
        score_data = {
            'player': data.get('player'),
            'score': data.get('score'),
            'song': data.get('song'),
            'timestamp': time.time()
        }
        leaderboard_file = 'static/leaderboard.json'
        leaderboard = []
        if os.path.exists(leaderboard_file):
            with open(leaderboard_file, 'r') as f:
                leaderboard = json.load(f)
        leaderboard.append(score_data)
        leaderboard = sorted(leaderboard, key=lambda x: x['score'], reverse=True)[:10]
        with open(leaderboard_file, 'w') as f:
            json.dump(leaderboard, f)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        leaderboard_file = 'static/leaderboard.json'
        if os.path.exists(leaderboard_file):
            with open(leaderboard_file, 'r') as f:
                leaderboard = json.load(f)
            return jsonify(leaderboard)
        return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug/check_audio/<filename>')
def debug_check_audio(filename):
    file_path = f'static/sounds/{filename}'
    if os.path.exists(file_path):
        return jsonify({'exists': True, 'size': os.path.getsize(file_path)})
    return jsonify({'exists': False})

@app.route('/debug/info')
def debug_info():
    info = {
        'version': '1.0.0',
        'webcam_available': all(feed.cap.isOpened() for feed in feeds.values()),
        'song_directory': os.path.exists('static/songs'),
        'pattern_file': os.path.exists('static/songs/patterns.json'),
        'sounds_directory': os.path.exists('static/sounds'),
        'sound_files': [f for f in os.listdir('static/sounds') if os.path.isfile(os.path.join('static/sounds', f))] if os.path.exists('static/sounds') else []
    }
    
    if info['pattern_file']:
        try:
            with open('static/songs/patterns.json', 'r') as f:
                patterns = json.load(f)
            info['patterns'] = list(patterns.keys())
        except Exception as e:
            info['pattern_error'] = str(e)
    
    if info['song_directory']:
        try:
            song_files = [f for f in os.listdir('static/songs') if f.endswith('.mp3')]
            info['song_files'] = song_files
        except Exception as e:
            info['song_error'] = str(e)
            
    return jsonify(info)

@app.route('/debug/log', methods=['POST'])
def debug_log():
    log_data = request.json
    level = log_data.get('level', 'info')
    message = log_data.get('message', '')
    
    if level == 'error':
        logging.error(f"FRONTEND: {message}")
    elif level == 'warn':
        logging.warning(f"FRONTEND: {message}")
    else:
        logging.info(f"FRONTEND: {message}")
        
    return jsonify({'success': True})

@app.route('/debug/patterns')
def debug_patterns():
    patterns_file = 'static/songs/patterns.json'
    
    if not os.path.exists(patterns_file):
        return jsonify({'error': 'Patterns file does not exist'}), 404
    
    try:
        with open(patterns_file, 'r') as f:
            patterns = json.load(f)
        
        result = {}
        for song, pattern in patterns.items():
            result[song] = {
                'length': len(pattern),
                'sample': pattern[:10] if len(pattern) > 0 else [],
                'unique_gestures': list(set(pattern))
            }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/debug/pattern/<song_name>')
def debug_pattern(song_name):
    patterns_file = 'static/songs/patterns.json'
    
    if not os.path.exists(patterns_file):
        return jsonify({'error': 'Patterns file does not exist'}), 404
    
    try:
        with open(patterns_file, 'r') as f:
            patterns = json.load(f)
        
        if song_name not in patterns:
            return jsonify({'error': f'No pattern found for song: {song_name}'}), 404
        
        return jsonify({
            'song': song_name,
            'pattern_length': len(patterns[song_name]),
            'pattern': patterns[song_name]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('request_gesture')
def handle_request_gesture(data):
    gesture = feeds[1].get_gesture()
    emit('gesture', {'player': 1, 'gesture': gesture})

@app.route('/restart_webcam', methods=['POST'])
def restart_webcam():
    global feeds
    try:
        print("Releasing webcam...")
        feeds[1].release()
        print("Reinitializing webcam...")
        feeds[1] = WebcamFeed(1)
        threading.Thread(target=feeds[1].process_gestures, daemon=True).start()
        return jsonify({'success': True, 'message': 'Webcam restarted successfully'})
    except Exception as e:
        print(f"Error restarting webcam: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def start_server():
    try:
        webbrowser.open(f'http://localhost:{PORT}')
        socketio.run(app, host='0.0.0.0', port=PORT, allow_unsafe_werkzeug=True)
    finally:
        for feed in feeds.values():
            feed.release()

if __name__ == '__main__':
    start_server()