import os
import sys
import time
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import pygame
import yt_dlp
import urllib.request
import tempfile

class YouTubeMusicPlayer:
    def __init__(self, root):
        self.root = root
        self.root.title("YouTube Music Player")
        self.root.geometry("800x600")
        self.root.configure(bg="#f0f0f0")
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # Initialize pygame mixer
        pygame.mixer.init()
        
        # Create temp directory for audio files
        self.temp_dir = tempfile.mkdtemp()
        
        # Search area
        self.search_frame = tk.Frame(root, bg="#f0f0f0")
        self.search_frame.pack(pady=20, fill=tk.X, padx=20)
        
        self.search_label = tk.Label(self.search_frame, text="Search for a song:", bg="#f0f0f0", font=("Arial", 12))
        self.search_label.pack(side=tk.LEFT, padx=5)
        
        self.search_entry = tk.Entry(self.search_frame, width=50, font=("Arial", 12))
        self.search_entry.pack(side=tk.LEFT, padx=5)
        self.search_entry.bind("<Return>", self.search_songs)
        
        self.search_button = tk.Button(self.search_frame, text="Search", command=self.search_songs, bg="#4CAF50", fg="white", font=("Arial", 10, "bold"))
        self.search_button.pack(side=tk.LEFT, padx=5)
        
        # Results area
        self.results_frame = tk.Frame(root, bg="#f0f0f0")
        self.results_frame.pack(pady=10, fill=tk.BOTH, expand=True, padx=20)
        
        self.results_label = tk.Label(self.results_frame, text="Search Results:", bg="#f0f0f0", font=("Arial", 12, "bold"))
        self.results_label.pack(anchor="w", pady=5)
        
        # Create a frame for the treeview with scrollbar
        self.tree_frame = tk.Frame(self.results_frame)
        self.tree_frame.pack(fill=tk.BOTH, expand=True)
        
        # Scrollbar
        self.scrollbar = ttk.Scrollbar(self.tree_frame)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Treeview for results
        self.results_tree = ttk.Treeview(self.tree_frame, columns=("title", "duration", "url"), show="headings", height=10)
        self.results_tree.heading("title", text="Title")
        self.results_tree.heading("duration", text="Duration")
        self.results_tree.heading("url", text="URL")
        
        self.results_tree.column("title", width=500)
        self.results_tree.column("duration", width=100)
        self.results_tree.column("url", width=0, stretch=tk.NO)  # Hide URL column
        
        self.results_tree.pack(fill=tk.BOTH, expand=True)
        self.scrollbar.config(command=self.results_tree.yview)
        self.results_tree.config(yscrollcommand=self.scrollbar.set)
        
        self.results_tree.bind("<Double-1>", self.play_selected_song)
        
        # Now playing area
        self.now_playing_frame = tk.Frame(root, bg="#e0e0e0", height=100)
        self.now_playing_frame.pack(fill=tk.X, side=tk.BOTTOM)
        
        self.song_title_label = tk.Label(self.now_playing_frame, text="No song playing", bg="#e0e0e0", font=("Arial", 12, "bold"))
        self.song_title_label.pack(pady=5)
        
        self.progress_frame = tk.Frame(self.now_playing_frame, bg="#e0e0e0")
        self.progress_frame.pack(fill=tk.X, padx=20)
        
        self.current_time_label = tk.Label(self.progress_frame, text="0:00", bg="#e0e0e0")
        self.current_time_label.pack(side=tk.LEFT)
        
        self.progress_bar = ttk.Progressbar(self.progress_frame, orient=tk.HORIZONTAL, length=600, mode="determinate")
        self.progress_bar.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=10)
        
        self.total_time_label = tk.Label(self.progress_frame, text="0:00", bg="#e0e0e0")
        self.total_time_label.pack(side=tk.RIGHT)
        
        self.control_frame = tk.Frame(self.now_playing_frame, bg="#e0e0e0")
        self.control_frame.pack(pady=10)
        
        self.play_button = tk.Button(self.control_frame, text="Play", command=self.play_pause, width=10)
        self.play_button.pack(side=tk.LEFT, padx=5)
        
        self.stop_button = tk.Button(self.control_frame, text="Stop", command=self.stop_playback, width=10)
        self.stop_button.pack(side=tk.LEFT, padx=5)
        
        # Variables for playback
        self.current_song = None
        self.playing = False
        self.paused = False
        self.song_length = 0
        self.temp_file = None
        self.progress_updater = None
        self.download_thread = None

    def search_songs(self, event=None):
        # Clear previous results
        for item in self.results_tree.get_children():
            self.results_tree.delete(item)
        
        query = self.search_entry.get()
        if not query.strip():
            return
            
        # Change cursor to show loading
        self.root.config(cursor="wait")
        self.root.update()
        
        # Use threading for search to keep UI responsive
        search_thread = threading.Thread(target=self._search_thread, args=(query,))
        search_thread.daemon = True
        search_thread.start()
    
    def _search_thread(self, query):
        try:
            # Configure yt-dlp options
            ydl_opts = {
                'format': 'bestaudio',
                'noplaylist': True,
                'quiet': False,  # Enable logging for debugging
                'verbose': True,  # Detailed logs
                'extract_flat': True,
                'force_generic_extractor': False,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                # Optional: Add cookies or proxy
                # 'cookiefile': 'path/to/cookies.txt',
                # 'proxy': 'http://your-proxy:port',
            }
            
            # Add delay to avoid rate-limiting
            time.sleep(1)
            
            # Search YouTube
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                search_query = f"ytsearch10:{query}"
                info = ydl.extract_info(search_query, download=False)
                
                # Update UI in main thread
                self.root.after(0, lambda: self._update_search_results(info))
                
        except Exception as e:
            print(f"Error searching: {e}")
            self.root.after(0, lambda: self._show_error(f"Error searching: {e}"))
        
        # Reset cursor
        self.root.after(0, lambda: self.root.config(cursor=""))
    
    def _update_search_results(self, info):
        # Clear previous results first
        for item in self.results_tree.get_children():
            self.results_tree.delete(item)
            
        # Display results
        if 'entries' in info:
            for idx, entry in enumerate(info['entries']):
                if entry:
                    title = entry.get('title', 'Unknown')
                    duration = self.format_duration(entry.get('duration', 0))
                    
                    # YouTube video ID
                    video_id = entry.get('id', '')
                    if video_id:
                        full_url = f"https://www.youtube.com/watch?v={video_id}"
                        self.results_tree.insert("", tk.END, values=(title, duration, full_url))

    def _show_error(self, message):
        messagebox.showerror("Error", message)

    def format_duration(self, seconds):
        if not seconds:
            return "Unknown"
        minutes, seconds = divmod(int(seconds), 60)
        hours, minutes = divmod(minutes, 60)
        if hours > 0:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"

    def play_selected_song(self, event=None):
        # Check if treeview still exists (prevent errors when closing window)
        if not self.results_tree.winfo_exists():
            return
            
        selected_item = self.results_tree.selection()
        if not selected_item:
            return
        
        values = self.results_tree.item(selected_item, "values")
        if values:
            title, duration_str, url = values
            
            # Cancel any existing download
            if self.download_thread and self.download_thread.is_alive():
                # Can't actually cancel thread, but we'll ignore its results
                pass
                
            # Stop any current playback
            self.stop_playback()
            
            # Show loading in the UI
            self.song_title_label.config(text=f"Loading: {title}")
            self.root.update()
            
            # Create a thread for downloading
            self.download_thread = threading.Thread(target=self._download_and_play_thread, args=(url, title))
            self.download_thread.daemon = True
            self.download_thread.start()

    def _download_and_play_thread(self, url, title):
        try:
            # Create temp file path
            temp_file = os.path.join(self.temp_dir, f"temp_audio_{int(time.time())}.mp3")
            
            # Clean up old temp files
            self._cleanup_temp_files()
            
            # Configure yt-dlp options for downloading audio
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': temp_file,
                'quiet': False,  # Enable logging for debugging
                'verbose': True,  # Detailed logs
                'no_warnings': True,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                # Optional: Add cookies or proxy
                # 'cookiefile': 'path/to/cookies.txt',
                # 'proxy': 'http://your-proxy:port',
            }
            
            # Add delay to avoid rate-limiting
            time.sleep(1)
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                
                # yt-dlp might add extension
                if not os.path.exists(temp_file):
                    temp_file = f"{temp_file}.mp3"
                    if not os.path.exists(temp_file):
                        for file in os.listdir(self.temp_dir):
                            if file.startswith(f"temp_audio_{int(time.time())}"):
                                temp_file = os.path.join(self.temp_dir, file)
                                break
                
                # Get the duration
                duration = info.get('duration', 0)
                self.song_length = duration
                
                # Store temp file path
                self.temp_file = temp_file
                
                # Play the file in main thread
                self.root.after(0, lambda: self._play_audio_file(temp_file, title, duration))
                
        except Exception as e:
            print(f"Error downloading: {e}")
            self.root.after(0, lambda: self.song_title_label.config(text=f"Error: {str(e)[:50]}"))

    def _cleanup_temp_files(self):
        """Delete old temporary files to save space"""
        try:
            files = os.listdir(self.temp_dir)
            for file in files:
                if file.startswith("temp_audio_"):
                    file_path = os.path.join(self.temp_dir, file)
                    try:
                        os.remove(file_path)
                    except:
                        pass
        except:
            pass

    def _play_audio_file(self, file_path, title, duration):
        try:
            # Make sure the file exists
            if not os.path.exists(file_path):
                self.song_title_label.config(text=f"Error: File not found")
                return
                
            # Initialize pygame mixer
            pygame.mixer.quit()
            pygame.mixer.init(frequency=44100)
            
            # Load and play the music
            pygame.mixer.music.load(file_path)
            pygame.mixer.music.play()
            
            # Update UI
            self.playing = True
            self.paused = False
            self.current_song = title
            self.song_title_label.config(text=f"Now Playing: {title}")
            self.play_button.config(text="Pause")
            
            # Update total time label
            self.total_time_label.config(text=self.format_duration(duration))
            
            # Start progress updater
            if self.progress_updater:
                self.root.after_cancel(self.progress_updater)
            
            self.update_progress()
            
        except Exception as e:
            print(f"Error playing audio: {e}")
            self.song_title_label.config(text=f"Error playing: {str(e)[:50]}")

    def update_progress(self):
        if not self.root.winfo_exists():
            return
            
        if self.playing and not self.paused and pygame.mixer.music.get_busy():
            current_pos = pygame.mixer.music.get_pos() / 1000  # Convert ms to seconds
            
            # Update progress bar
            if self.song_length > 0:
                progress = (current_pos / self.song_length) * 100
                self.progress_bar["value"] = min(progress, 100)  # Ensure we don't exceed 100%
            
            # Update current time label
            self.current_time_label.config(text=self.format_duration(current_pos))
            
            # Schedule next update
            self.progress_updater = self.root.after(1000, self.update_progress)
        elif self.playing and not pygame.mixer.music.get_busy():
            # Song finished playing
            self.stop_playback()

    def play_pause(self):
        if self.playing:
            if self.paused:
                pygame.mixer.music.unpause()
                self.paused = False
                self.play_button.config(text="Pause")
                self.update_progress()
            else:
                pygame.mixer.music.pause()
                self.paused = True
                self.play_button.config(text="Play")

    def stop_playback(self):
        if self.progress_updater and self.root.winfo_exists():
            self.root.after_cancel(self.progress_updater)
            self.progress_updater = None
            
        try:
            pygame.mixer.music.stop()
        except:
            pass
            
        self.playing = False
        self.paused = False
        self.current_song = None
        
        # Reset UI if window still exists
        if self.root.winfo_exists():
            self.song_title_label.config(text="No song playing")
            self.play_button.config(text="Play")
            self.progress_bar["value"] = 0
            self.current_time_label.config(text="0:00")
            self.total_time_label.config(text="0:00")

    def on_closing(self):
        """Handle window closing properly"""
        # Stop playback and clean up
        self.stop_playback()
        
        # Clean up temp files
        try:
            for file in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, file)
                try:
                    os.remove(file_path)
                except:
                    pass
            os.rmdir(self.temp_dir)
        except:
            pass
            
        # Quit pygame
        pygame.mixer.quit()
        pygame.quit()
        
        # Close window
        self.root.destroy()

def main():
    root = tk.Tk()
    app = YouTubeMusicPlayer(root)
    root.mainloop()

if __name__ == "__main__":
    main()