import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [progress, setProgress] = useState(0);
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem("nox_player_volume");
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState(null);

  // Initialize persistent single audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
      setPlaybackError(null);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onTimeUpdate = () => {
      if (!audio.duration || isNaN(audio.duration)) return;
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const onError = (e) => {
      console.warn("[AudioContext] Audio error:", e);
      setIsPlaying(false);
      setPlaybackError("Preview audio could not be streamed.");
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const playTrack = useCallback((track) => {
    const audio = audioRef.current;
    if (!audio || !track?.preview_url) return;

    if (currentTrack?.preview_url === track.preview_url) {
      if (audio.paused) {
        audio.play().catch((err) => {
          console.warn("[AudioContext] Play interrupted:", err);
        });
      }
      return;
    }

    setPlaybackError(null);
    setCurrentTrack(track);
    audio.src = track.preview_url;
    audio.currentTime = 0;
    setProgress(0);
    setCurrentTime(0);

    audio.play().catch((err) => {
      console.warn("[AudioContext] Autoplay prevented or failed:", err);
      setIsPlaying(false);
    });
  }, [currentTrack]);

  const pauseTrack = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resumeTrack = useCallback(() => {
    audioRef.current?.play().catch((err) => {
      console.warn("[AudioContext] Resume failed:", err);
    });
  }, []);

  const togglePlay = useCallback((track) => {
    if (track && track.preview_url) {
      if (currentTrack?.preview_url === track.preview_url) {
        if (isPlaying) {
          pauseTrack();
        } else {
          resumeTrack();
        }
      } else {
        playTrack(track);
      }
    } else {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    }
  }, [currentTrack, isPlaying, pauseTrack, resumeTrack, playTrack]);

  const seek = useCallback((percentage) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    const target = (percentage / 100) * audio.duration;
    audio.currentTime = target;
    setCurrentTime(target);
    setProgress(percentage);
  }, []);

  const setVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    localStorage.setItem("nox_player_volume", clamped.toString());
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setCurrentTrack(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        progress,
        volume,
        isMuted,
        playbackError,
        playTrack,
        pauseTrack,
        resumeTrack,
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        closePlayer,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
