import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for audio/voice detection using Web Speech API
 * Detects Indonesian speech and requires minimum 3 words to trigger violation
 *
 * @returns {Object} - { isQuiet: boolean, recognizedText: string, lastSpeechTimestamp: number }
 */
const useAudioDetection = () => {
  const recognitionRef = useRef(null);
  const [isQuiet, setIsQuiet] = useState(true);
  const [recognizedText, setRecognizedText] = useState("");
  const [lastSpeechTimestamp, setLastSpeechTimestamp] = useState(null);

  useEffect(() => {
    const initSpeechRecognition = () => {
      try {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
          console.warn("Web Speech API not supported in this browser");
          return;
        }

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = "id-ID"; // Indonesian language
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            }
          }

          if (finalTranscript.trim()) {
            const words = finalTranscript
              .trim()
              .split(/\s+/)
              .filter((w) => w.length > 0);

            // Only trigger violation if 3+ words detected
            if (words.length >= 2) {
              setIsQuiet(false);
              setRecognizedText(finalTranscript.trim());
              setLastSpeechTimestamp(Date.now());

              // Auto-reset after 3 seconds
              setTimeout(() => {
                setIsQuiet(true);
              }, 3000);
            }
          }
        };

        recognitionRef.current.onerror = (event) => {
          if (event.error !== "no-speech" && event.error !== "aborted") {
            console.error("Speech recognition error:", event.error);
          }
        };

        recognitionRef.current.onend = () => {
          // Auto-restart if stopped unexpectedly
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              // Already started, ignore
            }
          }
        };

        recognitionRef.current.start();
      } catch (err) {
        console.error("Speech recognition initialization failed:", err);
      }
    };

    initSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isQuiet, recognizedText, lastSpeechTimestamp };
};

export default useAudioDetection;
