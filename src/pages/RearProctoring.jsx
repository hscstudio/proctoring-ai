import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import NoSleep from 'nosleep.js';
<<<<<<< Updated upstream
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { ShieldCheck, AlertCircle, Users, Zap, Loader2, RefreshCw, Smartphone } from 'lucide-react';
=======
import { Room, VideoPresets, RoomEvent } from 'livekit-client';
import { 
  ShieldCheck, AlertCircle, Users, Zap, Loader2, 
  RefreshCw, Smartphone, Signal, ShieldAlert, Plus, X, Search
} from 'lucide-react';

// KONFIGURASI: 127.0.0.1 lebih stabil untuk Docker Local
const BACKEND_URL = 'http://127.0.0.1:5050';
const LIVEKIT_URL = 'ws://127.0.0.1:7880';
>>>>>>> Stashed changes

// COCO Labels (Standard 80 objects) - same as object-detector.html
const COCO_LABELS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

const RearProctoring = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || 'Peserta';

  const webcamRef = useRef(null);
<<<<<<< Updated upstream
  const modelRef = useRef(null);
=======
  const canvasRef = useRef(null);
  const roomRef = useRef(null);
  const connectingRef = useRef(false);
>>>>>>> Stashed changes
  const noSleep = useRef(new NoSleep());
  const objectDetectorRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const lastProcessTimeRef = useRef(-1);
  const animationFrameRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
<<<<<<< Updated upstream
  const [personCount, setPersonCount] = useState(0);
  const [isSafe, setIsSafe] = useState(true);
  const [noSleepEnabled, setNoSleepEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  // 1. Inisialisasi Backend yang Benar (Cegah Crash)
  useEffect(() => {
    const initAI = async () => {
      try {
        await tf.ready();
        // Gunakan backend 'wasm' atau 'webgl' secara otomatis
        modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        setIsLoaded(true);
=======
  const [isConnected, setIsConnected] = useState(false);
  const [isSafe, setIsSafe] = useState(true);
  const [noSleepEnabled, setNoSleepEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [errorMsg, setErrorMsg] = useState(null);
  
  // MediaPipe specific states
  const [allowedRules, setAllowedRules] = useState({ 'person': 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedObject, setSelectedObject] = useState('');
  const [objectCount, setObjectCount] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState(0);
  const [violations, setViolations] = useState([]);
  const [detectionCounts, setDetectionCounts] = useState({});

  // Click-outside handler for dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // 1. Initialize MediaPipe ObjectDetector
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        console.log("🚀 Initializing MediaPipe ObjectDetector...");
        
        // Dynamically import MediaPipe
        const { ObjectDetector, FilesetResolver } = await import(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2'
        );

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
        );
        
        objectDetectorRef.current = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite`,
            delegate: "CPU"
          },
          scoreThreshold: 0.20,
          runningMode: "VIDEO"
        });
        
        console.log("✅ MediaPipe ObjectDetector loaded.");
      } catch (err) {
        console.error("❌ Error loading MediaPipe:", err);
        setErrorMsg("Failed to load MediaPipe: " + err.message);
      }
    };

    initMediaPipe();
  }, []);

  // 2. Initialize LiveKit System
  useEffect(() => {
    const initSystem = async () => {
      if (roomRef.current && roomRef.current.state === 'connected') {
        setIsLoaded(true);
        setIsConnected(true);
        return;
      }

      if (connectingRef.current) return;
      connectingRef.current = true;

      try {
        console.log("🚀 Memulai Inisialisasi LiveKit...");
        
        // Wait for MediaPipe to be ready
        while (!objectDetectorRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Get Token
        console.log("📡 Mengambil token...");
        const response = await fetch(`${BACKEND_URL}/get-token?roomName=exam-room&participantName=${userId}`);
        if (!response.ok) throw new Error("Gagal mengambil token.");
        const { token } = await response.json();

        // Setup & Connect LiveKit
        if (!roomRef.current) {
          const room = new Room({
            adaptiveStream: true,
            publishDefaults: { videoCodec: 'h264' },
          });
          roomRef.current = room;
        }

        console.log("🔗 Menghubungkan ke LiveKit Server...");
        await roomRef.current.connect(LIVEKIT_URL, token);
        
        console.log("✅ Terhubung ke LiveKit.");
        setIsConnected(true);
        setIsLoaded(true);

>>>>>>> Stashed changes
      } catch (err) {
        console.error("AI Load Error:", err);
      }
    };
    initAI();

    return () => {
<<<<<<< Updated upstream
      noSleep.current.disable();
      // Penting: Bersihkan memori AI saat HP ditutup
      tf.disposeVariables(); 
=======
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
>>>>>>> Stashed changes
    };
  }, []);

<<<<<<< Updated upstream
  // 2. Loop Deteksi yang Lebih Irit Baterai
  useEffect(() => {
    if (!isLoaded) return;
=======
  // 3. Object Detection Loop
  useEffect(() => {
    if (!isLoaded || !noSleepEnabled || !objectDetectorRef.current) return;
>>>>>>> Stashed changes
    
    const detect = async () => {
      const video = webcamRef.current?.video;
<<<<<<< Updated upstream
      if (video?.readyState === 4) {
        const predictions = await modelRef.current.detect(video);
        const persons = predictions.filter(p => p.class === 'person' && p.score > 0.4);
        setPersonCount(persons.length);

        // Logika Pelanggaran: Jika lebih dari 1 orang terdeteksi selama 2 detik
        if (persons.length > 1) {
          if (!multiPersonStart.current) multiPersonStart.current = Date.now();
          if (Date.now() - multiPersonStart.current > 2000) setIsSafe(false);
        } else {
          multiPersonStart.current = null;
          setIsSafe(true);
=======
      const canvas = canvasRef.current;
      
      if (video?.readyState === 4 && canvas) {
        const startTimeMs = performance.now();
        
        // Only detect if video time changed
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          
          try {
            // MediaPipe Detection
            const detections = objectDetectorRef.current.detectForVideo(video, startTimeMs);
            
            // Analyze frame
            const analysis = analyzeFrame(detections.detections);
            
            // Update states
            setIsSafe(analysis.isClean);
            setViolations(analysis.violations);
            setDetectionCounts(analysis.currentCounts);
            
            // Draw on canvas
            drawDetections(canvas, video, detections.detections, analysis);
            
            // Update stats
            const endTimeMs = performance.now();
            setLatency(endTimeMs - startTimeMs);
            
            if (lastProcessTimeRef.current !== -1) {
              const delta = performance.now() - lastProcessTimeRef.current;
              setFps(1000 / delta);
            }
            lastProcessTimeRef.current = performance.now();

            // Publish Video if connected
            if (isConnected && roomRef.current) {
              const lp = roomRef.current.localParticipant;
              if (!lp.isCameraEnabled) {
                console.log("📸 Memulai publish video...");
                await lp.setCameraEnabled(true);
              }
              
              // Send violation data
              if (!analysis.isClean) {
                const encoder = new TextEncoder();
                const data = encoder.encode(JSON.stringify({ 
                  type: 'VIOLATION', 
                  user: userId,
                  violations: analysis.violations 
                }));
                lp.publishData(data, { reliable: true });
              }
            }
          } catch (err) {
            console.error("Detection error:", err);
          }
>>>>>>> Stashed changes
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(detectAndStream);
    };

<<<<<<< Updated upstream
    // Gunakan interval yang tidak terlalu rapat (800ms) agar HP tidak panas
    const interval = setInterval(detect, 800);
    return () => clearInterval(interval);
  }, [isLoaded]);
=======
    detectAndStream();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoaded, isConnected, noSleepEnabled, userId, minConfidence, allowedRules]);

  // Analyze frame for violations
  const analyzeFrame = (detections) => {
    const currentCounts = {};
    const violations = [];
    let isClean = true;

    // Filter by confidence
    const validDetections = detections.filter(d => d.categories[0].score >= minConfidence);

    // Tally
    validDetections.forEach(det => {
      const label = det.categories[0].categoryName.toLowerCase();
      currentCounts[label] = (currentCounts[label] || 0) + 1;
    });

    // Check against Rules
    Object.keys(currentCounts).forEach(label => {
      if (!allowedRules.hasOwnProperty(label)) {
        isClean = false;
        violations.push(`Unauthorized: ${label}`);
      } else if (currentCounts[label] > allowedRules[label]) {
        isClean = false;
        violations.push(`Limit exceeded: ${label} (${currentCounts[label]}/${allowedRules[label]})`);
      }
    });

    return { isClean, violations, currentCounts, validDetections };
  };

  // Draw detections on canvas
  const drawDetections = (canvas, video, detections, analysis) => {
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(detection => {
      const score = parseFloat(detection.categories[0].score);
      if (score < minConfidence) return;

      const label = detection.categories[0].categoryName.toLowerCase();
      
      // Determine if violation
      let isViolation = false;
      if (!allowedRules.hasOwnProperty(label)) {
        isViolation = true;
      } else if (analysis.currentCounts[label] > allowedRules[label]) {
        isViolation = true;
      }

      const color = isViolation ? "#EF4444" : "#22C55E";
      
      // Draw Box
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.rect(
        detection.boundingBox.originX,
        detection.boundingBox.originY,
        detection.boundingBox.width,
        detection.boundingBox.height
      );
      ctx.stroke();

      // Draw Label Background
      ctx.fillStyle = color;
      const text = `${label} ${Math.round(score * 100)}%`;
      ctx.font = "bold 12px sans-serif";
      const textWidth = ctx.measureText(text).width;
      const textHeight = 18;

      ctx.fillRect(
        detection.boundingBox.originX,
        detection.boundingBox.originY - textHeight,
        textWidth + 8,
        textHeight
      );

      // Draw Label Text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(
        text,
        detection.boundingBox.originX + 4,
        detection.boundingBox.originY - 4
      );
    });
  };
>>>>>>> Stashed changes

  const enableNoSleep = () => {
    noSleep.current.enable();
    setNoSleepEnabled(true);
  };

<<<<<<< Updated upstream
=======
  // Add rule handler
  const handleAddRule = () => {
    const label = selectedObject.toLowerCase().trim();
    
    if (!label) {
      alert("Please select an object.");
      return;
    }

    if (!COCO_LABELS.includes(label)) {
      alert(`'${label}' is not a recognized object.`);
      return;
    }

    setAllowedRules(prev => ({ ...prev, [label]: objectCount }));
    setSelectedObject('');
    setSearchTerm('');
    setObjectCount(1);
  };

  // Remove rule handler
  const handleRemoveRule = (label) => {
    setAllowedRules(prev => {
      const newRules = { ...prev };
      delete newRules[label];
      return newRules;
    });
  };

  // Filter COCO labels based on search
  const filteredLabels = COCO_LABELS.filter(label => 
    label.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort();

  if (errorMsg) return (
    <div className="h-screen bg-red-950 flex flex-col items-center justify-center p-10 text-white text-center">
      <ShieldAlert size={64} className="mb-4 text-red-500" />
      <h1 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Connection Failed</h1>
      <p className="text-red-200 text-xs mb-8 opacity-70">Error: {errorMsg}</p>
      <button onClick={() => window.location.reload()} className="bg-white text-red-900 px-10 py-4 rounded-3xl font-black uppercase italic text-sm shadow-2xl">Retry System</button>
    </div>
  );

>>>>>>> Stashed changes
  return (
    <div className={`h-screen flex flex-col transition-colors duration-700 ${isSafe ? 'bg-slate-950' : 'bg-red-900'}`}>
      
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center text-white p-10">
          <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
<<<<<<< Updated upstream
          <h2 className="text-xl font-black italic tracking-tighter">BOOTING AI GUARD...</h2>
=======
          <h2 className="text-xl font-black italic tracking-tighter uppercase">Initializing MediaPipe...</h2>
>>>>>>> Stashed changes
        </div>
      )}

      {!noSleepEnabled && isLoaded && (
        <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center p-8 text-center text-white">
          <Smartphone size={64} className="mb-6 animate-bounce" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Sync Completed</h2>
          <p className="text-indigo-100 text-sm mb-8 opacity-80">Letakkan HP di samping belakang Anda untuk pengawasan sudut lebar.</p>
          <button onClick={enableNoSleep} className="bg-white text-indigo-600 font-black px-12 py-5 rounded-[2rem] shadow-2xl active:scale-95 transition-all text-lg">
            AKTIFKAN SENSOR
          </button>
        </div>
      )}

<<<<<<< Updated upstream
      {/* COMPACT HUD FOR MOBILE */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5">
=======
      {/* HUD HEADER */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5">
>>>>>>> Stashed changes
        <div className="flex flex-col">
          <span className="text-slate-500 text-[8px] uppercase font-black tracking-widest">Node ID</span>
          <h1 className="text-white font-black text-sm italic uppercase">{userId}</h1>
        </div>
<<<<<<< Updated upstream
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isSafe ? 'border-emerald-500/50 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
          {isSafe ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
          <span className="text-[10px] font-black uppercase">{isSafe ? 'Active' : 'Warning'}</span>
        </div>
      </div>

      {/* CAMERA VIEW */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={{ facingMode: facingMode }}
            className="w-full h-full object-cover grayscale-[0.3]"
          />
          <button 
            onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
            className="absolute top-4 right-4 bg-black/50 p-3 rounded-2xl text-white backdrop-blur-md"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* DASHBOARD MINI */}
      <div className="p-6 grid grid-cols-2 gap-3 bg-black/40">
        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Detection</p>
          <p className={`text-xl font-black ${isSafe ? 'text-white' : 'text-red-500'}`}>{personCount} <span className="text-xs opacity-50">Pers.</span></p>
        </div>
        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Battery Save</p>
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap size={14} /> <span className="text-xs font-black uppercase">Optimized</span>
          </div>
        </div>
      </div>
=======
        
        <div className="flex gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${isConnected ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' : 'border-slate-700 text-slate-500'}`}>
            <Signal size={12} className={isConnected ? "animate-pulse" : ""} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border ${isSafe ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
            {isSafe ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
            <span className="text-[9px] font-black uppercase">{isSafe ? 'Secure' : 'Alert'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Camera Feed */}
        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 relative flex items-center justify-center">
            <div className={`relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden border-4 transition-colors ${isSafe ? 'border-emerald-500/30' : 'border-red-500 animate-pulse'} shadow-2xl bg-black`}>
              <Webcam
                ref={webcamRef}
                audio={false}
                mirrored={facingMode === "user"}
                videoConstraints={{ facingMode: facingMode, width: 640, height: 480 }}
                className="w-full h-full object-cover"
              />
              <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              <button 
                onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
                className="absolute top-4 right-4 bg-black/60 p-3 rounded-xl text-white backdrop-blur-xl border border-white/10 active:scale-90 transition-transform hover:bg-black/80"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          {/* Violations Display */}
          {violations.length > 0 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl">
              <h3 className="text-xs font-black text-red-400 uppercase mb-2">⚠ Violations Detected</h3>
              <div className="space-y-1">
                {violations.map((v, i) => (
                  <div key={i} className="text-xs text-red-300 font-mono">{v}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Controls Panel */}
        <div className="w-80 bg-black/60 backdrop-blur-2xl border-l border-white/5 flex flex-col overflow-y-auto">
          
          {/* Allowed Objects Config */}
          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-black text-blue-400 uppercase tracking-wider mb-3">Exam Allowed Objects</h3>
            
            {/* Add Object Form */}
            <div className="bg-gray-800/50 p-3 rounded-lg mb-3 border border-gray-700">
              <label className="text-[10px] text-gray-400 block mb-1">Allow Object:</label>
              <div className="relative mb-2">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <input 
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search objects..."
                      className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none border border-gray-600 focus:border-blue-500"
                    />
                    {showDropdown && (
                      <div 
                        ref={dropdownRef}
                        className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded max-h-40 overflow-y-auto z-[9999] shadow-xl">

                        {filteredLabels.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500 text-xs italic">No objects found</div>
                        ) : (
                          filteredLabels.map(label => (
                            <div
                              key={label}
                              onClick={() => {
                                setSelectedObject(label);
                                setSearchTerm(label);
                                setShowDropdown(false);
                              }}
                              className="px-3 py-2 text-xs text-gray-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors capitalize"
                            >
                              {label}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <input 
                    type="number"
                    value={objectCount}
                    onChange={(e) => setObjectCount(parseInt(e.target.value) || 1)}
                    min="0"
                    max="10"
                    className="w-14 bg-gray-700 text-white text-xs rounded px-2 py-1.5 outline-none border border-gray-600 focus:border-blue-500 text-center"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddRule}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white rounded transition-colors uppercase shadow-md flex items-center justify-center gap-1"
              >
                <Plus size={12} /> Add to Whitelist
              </button>
            </div>

            {/* Active Rules List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.keys(allowedRules).length === 0 ? (
                <div className="text-[10px] text-gray-500 italic text-center p-2">No allowed objects</div>
              ) : (
                Object.entries(allowedRules).map(([label, count]) => (
                  <div key={label} className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                    <span className="text-xs capitalize text-gray-200">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">Max: {count}</span>
                      <button 
                        onClick={() => handleRemoveRule(label)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Engine Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-gray-400">Latency</span>
                <div className="text-lg font-mono text-white">{latency.toFixed(1)} ms</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400">FPS</span>
                <div className="text-lg font-mono text-white">{fps.toFixed(0)}</div>
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-gray-400">Sensitivity:</span>
                  <span className="text-xs text-blue-400 font-bold">{Math.round(minConfidence * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="20"
                  max="90"
                  value={minConfidence * 100}
                  onChange={(e) => setMinConfidence(e.target.value / 100)}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Detection Counts */}
          <div className="p-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Current Detections</h3>
            {Object.keys(detectionCounts).length === 0 ? (
              <div className="text-[10px] text-gray-500 italic text-center p-2">No objects detected</div>
            ) : (
              <div className="space-y-1">
                {Object.entries(detectionCounts).map(([label, count]) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="capitalize text-gray-300">{label}</span>
                    <span className="font-mono text-white">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

>>>>>>> Stashed changes
    </div>
  );
};

export default RearProctoring;