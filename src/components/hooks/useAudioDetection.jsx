import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for audio/voice detection using Web Speech API + MediaRecorder
 * Detects Indonesian speech, records audio with gain amplification for whisper detection
 *
 * @returns {Object} - { isQuiet, recognizedText, lastSpeechTimestamp, audioUrl }
 */
const useAudioDetection = () => {
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const isRecordingRef = useRef(false);

  const [isQuiet, setIsQuiet] = useState(true);
  const [recognizedText, setRecognizedText] = useState("");
  const [lastSpeechTimestamp, setLastSpeechTimestamp] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    const initAudioRecording = async () => {
      try {
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // Disable to capture whispers
            autoGainControl: false,  // We'll handle gain manually
          } 
        });
        streamRef.current = stream;

        // Setup Web Audio API for gain amplification (whisper detection)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 3.5; // Amplify by 3.5x for whisper detection
        gainNodeRef.current = gainNode;

        // Create destination for the amplified audio
        const destination = audioContext.createMediaStreamDestination();
        source.connect(gainNode);
        gainNode.connect(destination);

        // Setup MediaRecorder with amplified stream
        const options = { mimeType: 'audio/webm' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'audio/mp4';
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = ''; // Let browser choose
        }

        mediaRecorderRef.current = new MediaRecorder(destination.stream, options);

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            audioChunksRef.current = [];
          }
          isRecordingRef.current = false;
        };

      } catch (err) {
        console.error("Audio recording initialization failed:", err);
      }
    };

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

            // Only trigger violation if 2+ words detected
            if (words.length >= 2) {
              // Start recording if not already recording
              if (mediaRecorderRef.current && !isRecordingRef.current) {
                audioChunksRef.current = [];
                mediaRecorderRef.current.start();
                isRecordingRef.current = true;

                // Stop recording after 5 seconds or when speech ends
                setTimeout(() => {
                  if (mediaRecorderRef.current && isRecordingRef.current) {
                    mediaRecorderRef.current.stop();
                  }
                }, 5000);
              }

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

    initAudioRecording().then(() => {
      initSpeechRecognition();
    });

    return () => {
      // Cleanup
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && isRecordingRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  return { isQuiet, recognizedText, lastSpeechTimestamp, audioUrl };
};

export default useAudioDetection;
