import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import useAudioDetection from "./useAudioDetection";

/**
 * Custom hook for AI proctoring (face detection + audio monitoring)
 * Collects evidence for all violations
 *
 * @param {Object} webcamRef - Reference to webcam component
 * @param {boolean} isAiReady - Whether AI models are loaded
 * @param {number} currentStep - Current exam step (0 = exam, 1 = results)
 * @param {Function} onAutoSubmit - Callback when violations exceed limit
 * @returns {Object} - { proctorStatus, violations, violationEvidence }
 */
const useProctoring = (webcamRef, isAiReady, currentStep, onAutoSubmit) => {
  const violationTimers = useRef({
    faceMissing: null,
    multiplePeople: null,
    notFocus: null,
    noise: null,
  });
  const lastViolationTime = useRef({});

  const [violations, setViolations] = useState(0);
  const [violationEvidence, setViolationEvidence] = useState([]);
  const [proctorStatus, setProctorStatus] = useState({
    faceDetected: true,
    lookingCenter: true,
    singlePerson: true,
    isQuiet: true,
  });

  const { isQuiet, recognizedText, lastSpeechTimestamp, audioUrl } = useAudioDetection();

  // Function to capture screenshot from webcam
  const captureScreenshot = () => {
    const video = webcamRef.current?.video;
    if (!video) return null;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      return null;
    }
  };

  // Function to add evidence
  const addEvidence = (type, description, evidenceData = null) => {
    // Prevent duplicate evidence for same type and description
    setViolationEvidence((prev) => {
      if (prev.length > 0) {
        const last = prev[0];
        if (last.type === type && last.description === description) {
          // Duplicate detected, do not add
          return prev;
        }
      }
      const newEvidence = {
        type,
        timestamp: new Date(),
        description,
        evidence: evidenceData || captureScreenshot(),
      };
      return [newEvidence, ...prev].slice(0, 10); // Keep last 10
    });
  };

  useEffect(() => {
    if (currentStep === 1 || !isAiReady) return;

    const checkViolation = (
      condition,
      type,
      delay = 2500,
      description = ""
    ) => {
      const now = Date.now();
      if (!condition) {
        if (!violationTimers.current[type]) {
          // start timer when violation condition first detected
          violationTimers.current[type] = now;
        } else if (now - violationTimers.current[type] > delay) {
          // violation persisted beyond delay, count it
          const lastRecorded = lastViolationTime.current[type] || 0;
          const debouncePeriod = 5000; // 5 seconds debounce for recording the same violation type

          if (now - lastRecorded > debouncePeriod) {
            setViolations((v) => {
              const newVal = v + 1;

              // Add evidence based on type
              if (type === "noise") {
                addEvidence(
                  "voice",
                  description || `Terdeteksi berbicara: "${recognizedText}"`,
                  { transcript: recognizedText, audioUrl: audioUrl }
                );
              } else {
                addEvidence(type, description);
              }

              if (newVal >= 10 && onAutoSubmit) {
                onAutoSubmit();
              }
              return newVal;
            });
            lastViolationTime.current[type] = now; // Update last recorded time for this violation type
          }
          // Reset the initial delay timer regardless of whether a new violation was recorded
          // This ensures the 'delay' for the *next* potential violation starts fresh.
          violationTimers.current[type] = null;
        }
      } else {
        // condition cleared, reset timer
        violationTimers.current[type] = null;
      }
    };

    const runDetection = async () => {
      const video = webcamRef.current?.video;
      if (video && video.readyState === 4) {
        const detections = await faceapi
          .detectAllFaces(video)
          .withFaceLandmarks();

        let facePresent = detections.length > 0;
        let singlePerson = detections.length <= 1;
        let lookingCenter = true;

        if (facePresent) {
          const landmarks = detections[0].landmarks;
          const nose = landmarks.getNose();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          const distL = Math.abs(nose[0].x - leftEye[0].x);
          const distR = Math.abs(nose[0].x - rightEye[3].x);
          const ratio = distL / distR;
          if (ratio < 0.4 || ratio > 2.5) lookingCenter = false;
        }

        setProctorStatus({
          faceDetected: facePresent,
          lookingCenter: lookingCenter,
          singlePerson: singlePerson,
          isQuiet: isQuiet,
        });

        checkViolation(
          facePresent,
          "faceMissing",
          2500,
          "Wajah tidak terdeteksi"
        );
        checkViolation(
          lookingCenter,
          "notFocus",
          2500,
          "Tidak fokus / menoleh"
        );
        checkViolation(
          singlePerson,
          "multiplePeople",
          2500,
          `Terdeteksi ${detections.length} orang`
        );
        checkViolation(
          isQuiet,
          "noise",
          1000,
          `Terdeteksi berbicara: "${recognizedText}"`
        );
      }
    };

    const interval = setInterval(runDetection, 600);
    return () => {
      clearInterval(interval);
      Object.values(violationTimers.current).forEach((t) => {
        if (t && typeof t === "number" && t > 1000000) clearTimeout(t);
      });
    };
  }, [
    isAiReady,
    currentStep,
    webcamRef,
    isQuiet,
    recognizedText,
    audioUrl,
    onAutoSubmit,
  ]);

  return { proctorStatus, violations, violationEvidence };
};

export default useProctoring;
