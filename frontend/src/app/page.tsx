"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { MenuItem } from "@/lib/dummy-data";
import { getMenuItems, searchMenu, aiSearchMenu } from "@/lib/api";

// Web Audio API synth tones
const playTone = (frequency: number, type: OscillatorType, duration: number, vol: number) => {
  try {
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

// Separate Voice play component for message notes
const VoiceMessageNode = ({ voiceUrl, voiceDuration }: { voiceUrl: string; voiceDuration: number }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(voiceUrl);
    const handleEnded = () => setIsPlaying(false);
    audioRef.current.addEventListener("ended", handleEnded);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, [voiceUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error("Playback prompt blocked:", err));
      setIsPlaying(true);
    }
  };

  return (
    <button
      onClick={togglePlay}
      style={{
        background: "transparent",
        border: "none",
        color: "#fff",
        cursor: "pointer",
        fontSize: "0.95rem",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <i className={`fa-solid ${isPlaying ? "fa-pause" : "fa-play"}`}></i>
      <span>{isPlaying ? "Playing..." : "Voice Note"}</span>
      <span className="vn-duration">{formatDuration(voiceDuration)}</span>
    </button>
  );
};

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text?: string;
  voiceUrl?: string;
  voiceDuration?: number;
}

export default function Home() {
  const [menuCatalog, setMenuCatalog] = useState<MenuItem[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [scrollY, setScrollY] = useState(0);

  // Chat panel states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInputText, setChatInputText] = useState("");
  const [likedMessages, setLikedMessages] = useState<Record<string, "like" | "dislike">>({});

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [pendingVoiceUrl, setPendingVoiceUrl] = useState<string | null>(null);
  const [pendingVoiceDuration, setPendingVoiceDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  const tagOptions = [
    { id: "salad", label: "Tag 01" },
    { id: "burger", label: "Tag 02" },
    { id: "spicy", label: "Tag 03" },
    { id: "dessert", label: "Tag 04" },
    { id: "popular", label: "Tag 05" },
  ];

  // Fetch initial menu catalog
  useEffect(() => {
    async function loadInitial() {
      try {
        setIsLoading(true);
        const data = await getMenuItems();
        setMenuCatalog(data);
        setItems(data);
      } catch (err) {
        console.error("Failed to load initial menu items", err);
        setErrorCode("Error loading dishes. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitial();
  }, []);

  // Window scroll event for parallax effects on Hero
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll chat panel to bottom
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const filterMenu = (tags: string[], catalog: MenuItem[] = menuCatalog) => {
    if (tags.length === 0) {
      setItems(catalog);
      return;
    }
    const filtered = catalog.filter((item) => {
      return tags.some((tagId) => {
        if (tagId === "salad") {
          return item.category?.toLowerCase() === "salad" || item.tags?.some((t) => t.toLowerCase() === "salad");
        }
        if (tagId === "burger") {
          return item.category?.toLowerCase() === "burger" || item.tags?.some((t) => t.toLowerCase() === "burger");
        }
        if (tagId === "spicy") {
          return item.tags?.some((t) => t.toLowerCase() === "spicy") || item.name.toLowerCase().includes("spicy");
        }
        if (tagId === "dessert") {
          return item.category?.toLowerCase() === "dessert" || item.tags?.some((t) => t.toLowerCase() === "dessert");
        }
        if (tagId === "popular") {
          return item.rating >= 4.5;
        }
        return false;
      });
    });
    setItems(filtered);
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTags((prev) => {
      const isSelected = prev.includes(tagId);
      const nextTags = isSelected ? prev.filter((t) => t !== tagId) : [...prev, tagId];
      filterMenu(nextTags);
      return nextTags;
    });
  };

  // Perform AI or plain backend search
  const triggerBackendSearch = async (query: string) => {
    setIsLoading(true);
    setErrorCode(null);
    try {
      // Connects to FastAPI endpoint /api/menu/ai-search
      const response = await aiSearchMenu(query);
      setItems(response.items);
    } catch (err) {
      console.error("Search API failed", err);
      // Fallback to text query locally or plain text filter
      const textMatches = menuCatalog.filter(
        (m) =>
          m.name.toLowerCase().includes(query.toLowerCase()) ||
          m.description.toLowerCase().includes(query.toLowerCase())
      );
      setItems(textMatches);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (isRecording) {
      // Stop recording and send immediately
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        setIsRecording(false);
        playStopRecordingSound();
        
        // Setup listener on stop trigger to send once blob ready
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const elapsed = recordingStartTimeRef.current ? (Date.now() - recordingStartTimeRef.current) / 1000 : 0;
          
          const voiceMessageId = String(Date.now());
          const botResponseId = String(Date.now() + 1);

          setChatMessages((prev) => [
            ...prev,
            { id: voiceMessageId, sender: "user", voiceUrl: audioUrl, voiceDuration: elapsed },
          ]);

          // Trigger search for voice results (using "salad" or similar as demo criteria)
          triggerBackendSearch("salad");

          setTimeout(() => {
            setChatMessages((prev) => [
              ...prev,
              {
                id: botResponseId,
                sender: "bot",
                text: "Got your voice note! Processing your request...",
              },
            ]);
          }, 1000);
        };
        mediaRecorderRef.current.stop();
      }
      return;
    }

    if (pendingVoiceUrl) {
      const voiceMessageId = String(Date.now());
      const botResponseId = String(Date.now() + 1);

      setChatMessages((prev) => [
        ...prev,
        { id: voiceMessageId, sender: "user", voiceUrl: pendingVoiceUrl, voiceDuration: pendingVoiceDuration },
      ]);

      setPendingVoiceUrl(null);
      setPendingVoiceDuration(0);

      // Trigger standard voice request loading
      triggerBackendSearch("healthy dishes");

      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            id: botResponseId,
            sender: "bot",
            text: "Got your voice note! Processing your request...",
          },
        ]);
      }, 1000);
      return;
    }

    const text = chatInputText.trim();
    if (!text) return;

    const userMessageId = String(Date.now());
    const botResponseId = String(Date.now() + 1);

    setChatMessages((prev) => [...prev, { id: userMessageId, sender: "user", text }]);
    setChatInputText("");

    // Invoke backend NLP query parsing
    triggerBackendSearch(text);

    setTimeout(() => {
      // Craft response mentioning their preference
      const isSalad = text.toLowerCase().includes("salad");
      const isBurger = text.toLowerCase().includes("burger");
      let botText = "Thanks for sharing your preference! I am finding the best options for you.";
      if (isSalad) {
        botText = "Thanks for sharing your preference! I am finding the best salads for you.";
      } else if (isBurger) {
        botText = "Thanks for sharing your preference! I am finding the best burgers for you.";
      }
      setChatMessages((prev) => [...prev, { id: botResponseId, sender: "bot", text: botText }]);
    }, 1000);
  };

  const handleMicClick = async () => {
    if (pendingVoiceUrl) {
      // Discard voice note
      setPendingVoiceUrl(null);
      setPendingVoiceDuration(0);
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

  const handleThumbsMessage = (msgId: string, ratingType: "like" | "dislike") => {
    setLikedMessages((prev) => {
      const current = prev[msgId];
      if (current === ratingType) {
        // Toggle off
        const next = { ...prev };
        delete next[msgId];
        return next;
      }
      return { ...prev, [msgId]: ratingType };
    });
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
        <button
          className={`menu-toggle ${isMenuOpen ? "active" : ""}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span style={isMenuOpen ? { transform: "rotate(45deg) translate(5px, 5px)" } : undefined}></span>
          <span style={isMenuOpen ? { opacity: 0 } : undefined}></span>
          <span style={isMenuOpen ? { transform: "rotate(-45deg) translate(6px, -6px)" } : undefined}></span>
        </button>
        <nav className={`nav-links ${isMenuOpen ? "active" : ""}`}>
          <a href="#home" onClick={() => setIsMenuOpen(false)}>Home</a>
          <a href="#menu" onClick={() => setIsMenuOpen(false)}>Menu</a>
          <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
          <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
        </nav>
      </header>

      {/* Main page layout */}
      <main id="home">
        <section className="hero" style={heroStyle}>
          <h1>find your preference with our chat bot</h1>
          <button className="popular-btn" onClick={() => {
            // Standard action: filter popular
            handleTagClick("popular");
          }}>
            <span className="dot"></span>
            POPULAR
          </button>
        </section>

        {isLoading && items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted italic">Loading dishes...</p>
          </div>
        ) : errorCode ? (
          <div className="text-center py-20 px-4">
            <p className="text-error">{errorCode}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-muted text-base font-medium mb-1">No dishes match your choice</p>
            <p className="text-muted text-xs">Try selecting a different filter option or querying the chat agent.</p>
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
      <section className="chatbot-panel">
        <div className="tags-container">
          {tagOptions.map((tag) => (
            <button
              key={tag.id}
              className={`tag-btn ${selectedTags.includes(tag.id) ? "selected" : ""}`}
              onClick={() => handleTagClick(tag.id)}
            >
              <span className="dot"></span>
              {tag.label}
            </button>
          ))}
        </div>

        {/* Messaging thread panel */}
        {chatMessages.length > 0 && (
          <div className="chat-messages" id="chatMessages">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender}`}>
                {msg.voiceUrl ? (
                  <VoiceMessageNode voiceUrl={msg.voiceUrl} voiceDuration={msg.voiceDuration || 0} />
                ) : (
                  msg.text
                )}

                {msg.sender === "bot" && (
                  <div className="bot-feedback">
                    <button
                      className={`feedback-btn ${likedMessages[msg.id] === "like" ? "active" : ""}`}
                      onClick={() => handleThumbsMessage(msg.id, "like")}
                      aria-label="Like this response"
                    >
                      <i className={likedMessages[msg.id] === "like" ? "fa-solid fa-thumbs-up" : "fa-regular fa-thumbs-up"}></i>
                    </button>
                    <button
                      className={`feedback-btn ${likedMessages[msg.id] === "dislike" ? "active" : ""}`}
                      onClick={() => handleThumbsMessage(msg.id, "dislike")}
                      aria-label="Dislike this response"
                    >
                      <i className={likedMessages[msg.id] === "dislike" ? "fa-solid fa-thumbs-down" : "fa-regular fa-thumbs-down"}></i>
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatMessagesEndRef} />
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
