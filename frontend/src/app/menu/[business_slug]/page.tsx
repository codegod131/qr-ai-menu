"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { MenuItem } from "@/lib/dummy-data";
import { getMenuItems, aiSearchMenu } from "@/lib/api";

// Web Audio API synth tones
const playTone = (frequency: number, type: OscillatorType, duration: number, vol: number) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(vol, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio tones playback failed", e);
  }
};

const playStartRecordingSound = () => {
  playTone(523.25, 'sine', 0.15, 0.1); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.15, 0.1), 100); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.4, 0.1), 200); // G5
};

const playStopRecordingSound = () => {
  playTone(783.99, 'sine', 0.15, 0.1); // G5
  setTimeout(() => playTone(523.25, 'sine', 0.4, 0.1), 100); // C5
};

// Formats duration: e.g. 3 -> "0:03"
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

interface MenuPageProps {
  params: Promise<{ business_slug: string }>;
}

export default function BusinessMenuPage({ params }: MenuPageProps) {
  const resolvedParams = use(params);
  const { business_slug } = resolvedParams;

  const [menuCatalog, setMenuCatalog] = useState<MenuItem[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [scrollY, setScrollY] = useState(0);
  const [showPopular, setShowPopular] = useState(false);

  // Chat panel states
  const [chatInputText, setChatInputText] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "done">("idle");
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastQuery, setLastQuery] = useState<{ type: "text" | "voice"; content: string; duration?: number } | null>(null);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState<string | null>(null);
  const [pendingVoiceDuration, setPendingVoiceDuration] = useState(0);
  const [pendingVoiceBlob, setPendingVoiceBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Fetch initial menu catalog for this business slug
  useEffect(() => {
    async function loadInitial() {
      try {
        setIsLoading(true);
        const data = await getMenuItems(business_slug);
        setMenuCatalog(data);
        setItems(data);
      } catch (err) {
        console.error("Failed to load initial menu items", err);
        setErrorCode("Error loading items. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, [business_slug]);

  // Window scroll event for parallax effects on Hero
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cleanup status timeout & audio on unmount
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
    };
  }, []);

  // Perform AI or plain backend search
  const triggerBackendSearch = async (query: string | Blob) => {
    setIsLoading(true);
    setSearchStatus("searching");
    setErrorCode(null);
    setShowPopular(false);
    try {
      // Connects to FastAPI endpoint /api/menu/ai-search
      const response = await aiSearchMenu(query, business_slug);
      setItems(response.items);
      setSearchStatus("done");

      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => {
        setSearchStatus("idle");
      }, 4000);

      return response;
    } catch (err) {
      console.error("Search API failed", err);
      // Fallback to text query locally or plain text filter
      if (typeof query === "string") {
        const textMatches = menuCatalog.filter(
          (m) =>
            m.name.toLowerCase().includes(query.toLowerCase()) ||
            m.description.toLowerCase().includes(query.toLowerCase())
        );
        setItems(textMatches);
      }
      setSearchStatus("done");

      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => {
        setSearchStatus("idle");
      }, 4000);

      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const stopLastAudio = () => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current = null;
      setIsAudioPlaying(false);
    }
  };

  const handlePlayLastAudio = () => {
    if (!lastQuery || lastQuery.type !== "voice") return;
    
    if (audioInstanceRef.current) {
      if (isAudioPlaying) {
        audioInstanceRef.current.pause();
        setIsAudioPlaying(false);
      } else {
        audioInstanceRef.current.play()
          .then(() => setIsAudioPlaying(true))
          .catch((err) => console.error("Audio play failed:", err));
      }
    } else {
      const audio = new Audio(lastQuery.content);
      audioInstanceRef.current = audio;
      
      const handleEnded = () => setIsAudioPlaying(false);
      audio.addEventListener("ended", handleEnded);
      
      audio.play()
        .then(() => setIsAudioPlaying(true))
        .catch((err) => console.error("Audio play failed:", err));
    }
  };

  const handleFeedback = (type: "like" | "dislike") => {
    setFeedback((prev) => (prev === type ? null : type));
  };

  const handleSend = async () => {
    if (isRecording) {
      // Stop recording and send immediately
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        setIsRecording(false);
        playStopRecordingSound();
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const elapsed = recordingStartTimeRef.current ? (Date.now() - recordingStartTimeRef.current) / 1000 : 0;
          
          stopLastAudio();
          setLastQuery({
            type: "voice",
            content: audioUrl,
            duration: elapsed,
          });
          setFeedback(null);
          
          triggerBackendSearch(audioBlob);
        };
        mediaRecorderRef.current.stop();
      }
      return;
    }

    if (pendingVoiceUrl && pendingVoiceBlob) {
      stopLastAudio();
      setLastQuery({
        type: "voice",
        content: pendingVoiceUrl,
        duration: pendingVoiceDuration,
      });
      setFeedback(null);

      const blobToSend = pendingVoiceBlob;
      setPendingVoiceUrl(null);
      setPendingVoiceDuration(0);
      setPendingVoiceBlob(null);

      triggerBackendSearch(blobToSend);
      return;
    }

    const text = chatInputText.trim();
    if (!text) return;

    stopLastAudio();
    setLastQuery({
      type: "text",
      content: text,
    });
    setFeedback(null);

    setChatInputText("");
    triggerBackendSearch(text);
  };

  const handleMicClick = async () => {
    if (pendingVoiceUrl) {
      // Discard voice note
      setPendingVoiceUrl(null);
      setPendingVoiceDuration(0);
      setPendingVoiceBlob(null);
      return;
    }

    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        recordingStartTimeRef.current = Date.now();

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const elapsed = recordingStartTimeRef.current ? (Date.now() - recordingStartTimeRef.current) / 1000 : 0;
          setPendingVoiceUrl(audioUrl);
          setPendingVoiceDuration(elapsed);
          setPendingVoiceBlob(audioBlob);

          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        playStartRecordingSound();
      } catch (err) {
        console.error("Microphone access error:", err);
        alert("Could not access your microphone. Please check permissions.");
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      playStopRecordingSound();
    }
  };

  const heroStyle = {
    transform: scrollY < 300 ? `translateY(${scrollY * 0.2}px)` : "none",
    opacity: scrollY < 300 ? Math.max(0.1, 1 - scrollY * 0.003) : 0.1,
  };

  return (
    <>
      {/* Header bar section */}
      <header className="top-nav">
        <div className="logo">weQRAi</div>
      </header>

      {/* Main page layout */}
      <main id="home">
        <section className="hero" style={heroStyle}>
          <h1>find your preference with AI search</h1>
          <button
            className={`popular-btn ${showPopular ? "active" : ""}`}
            onClick={() => {
              const nextShowPopular = !showPopular;
              setShowPopular(nextShowPopular);
              if (nextShowPopular) {
                setItems(menuCatalog.filter((item) => item.rating >= 4.5));
              } else {
                setItems(menuCatalog);
              }
            }}
          >
            <span className="dot"></span>
            POPULAR
          </button>
        </section>

        {isLoading && items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted italic">Loading items...</p>
          </div>
        ) : errorCode ? (
          <div className="text-center py-20 px-4">
            <p className="text-error">{errorCode}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-muted text-base font-medium mb-1">No items match your choice</p>
            <p className="text-muted text-xs">Try selecting a different filter option or entering another search query.</p>
          </div>
        ) : (
          <div className="food-grid" id="menu">
            {items.map((item) => (
              <Link href={`/item/${item.id}`} key={item.id} className="food-card">
                <div className="image-wrapper">
                  <img src={item.image} alt={item.name} />
                </div>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Fixed bottom chatbot panel */}
      <section className={`chatbot-panel ${searchStatus}`}>
        {/* Last Query & Feedback Controls */}
        {lastQuery && (
          <div className="search-feedback-row">
            <div className="last-query-container">
              {lastQuery.type === "voice" ? (
                <button
                  className={`last-query-btn voice ${isAudioPlaying ? "playing" : ""}`}
                  onClick={handlePlayLastAudio}
                  aria-label="Listen to last voice query"
                >
                  <i className={`fa-solid ${isAudioPlaying ? "fa-pause" : "fa-play"}`}></i>
                  <span>Listen to Voice ({formatDuration(lastQuery.duration || 0)})</span>
                </button>
              ) : (
                <button
                  className="last-query-btn text"
                  onClick={() => alert(`Last search: "${lastQuery.content}"`)}
                  aria-label="View last text query"
                >
                  <i className="fa-solid fa-comment-dots"></i>
                  <span className="truncate max-w-[200px]">Last: "{lastQuery.content}"</span>
                </button>
              )}
            </div>

            <div className="feedback-buttons">
              <button
                className={`feedback-btn ${feedback === "like" ? "active" : ""}`}
                onClick={() => handleFeedback("like")}
                aria-label="Thumbs up"
              >
                <i className={feedback === "like" ? "fa-solid fa-thumbs-up" : "fa-regular fa-thumbs-up"}></i>
              </button>
              <button
                className={`feedback-btn ${feedback === "dislike" ? "active" : ""}`}
                onClick={() => handleFeedback("dislike")}
                aria-label="Thumbs down"
              >
                <i className={feedback === "dislike" ? "fa-solid fa-thumbs-down" : "fa-regular fa-thumbs-down"}></i>
              </button>
            </div>
          </div>
        )}

        {/* Input box wrap */}
        <div className={`chat-input-wrapper ${isRecording ? "recording" : ""}`}>
          <input
            type="text"
            id="chatInput"
            className="chat-input"
            placeholder={
              isRecording
                ? "Recording in progress..."
                : pendingVoiceUrl
                ? `🎤 Voice note ready (${formatDuration(pendingVoiceDuration)}). Click Send.`
                : "Ask anything"
            }
            disabled={isRecording || !!pendingVoiceUrl}
            value={chatInputText}
            onChange={(e) => setChatInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
          />
          <button className="icon-btn send-btn" onClick={handleSend} aria-label="Send query">
            <i className="fa-solid fa-paper-plane"></i>
          </button>
          <button className="icon-btn mic-btn" onClick={handleMicClick} aria-label="Microphone button">
            <i className={`fa-solid ${pendingVoiceUrl ? "fa-trash" : isRecording ? "fa-pause" : "fa-microphone"}`}></i>
          </button>
        </div>
      </section>
    </>
  );
}
