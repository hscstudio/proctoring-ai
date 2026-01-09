import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer, useParticipants, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { Monitor, Users, AlertCircle, ArrowLeft, Video, Wifi, ShieldAlert } from 'lucide-react';

const BACKEND_URL = 'http://127.0.0.1:5050';
const LIVEKIT_URL = 'ws://127.0.0.1:7880';

const ExamViewer = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // FIX: generate viewer name only once
  const viewerName = useRef(`Proctor_${Date.now().toString().slice(-4)}`).current;

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${BACKEND_URL}/get-token?roomName=exam-room&participantName=${viewerName}`
        );

        if (!response.ok) {
          throw new Error('Failed to get viewer token');
        }

        const data = await response.json();
        setToken(data.token);
        setError(null);
      } catch (err) {
        console.error('Token fetch error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, []); // only run ONCE

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Connecting to Exam Room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Connection Failed</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-500 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <Monitor className="w-8 h-8 text-indigo-500" />
              <div>
                <h1 className="text-xl font-bold text-white">Exam Monitoring Dashboard</h1>
                <p className="text-sm text-slate-400">Room: exam-room</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* LiveKit Room */}
      <div className="h-[calc(100vh-80px)]">
        <LiveKitRoom
          video={false}
          audio={false}
          token={token}
          serverUrl={LIVEKIT_URL}
          connect={true}
          className="h-full"
        >
          <ExamRoomContent />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
};

const ExamRoomContent = () => {
  const participants = useParticipants();
  const room = useRoomContext();
  const [participantViolations, setParticipantViolations] = useState({});
  const [totalViolations, setTotalViolations] = useState(0);

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload, participant) => {
      const decoder = new TextDecoder();
      const strData = decoder.decode(payload);

      try {
        const data = JSON.parse(strData);

        if (data.type === 'VIOLATION') {
          const participantId = participant?.identity || data.user;

          setParticipantViolations(prev => ({
            ...prev,
            [participantId]: {
              violations: data.violations || [],
              timestamp: Date.now(),
              user: data.user
            }
          }));

          setTotalViolations(prev => prev + (data.violations?.length || 0));
        }
      } catch (err) {
        console.error('Error parsing violation data:', err);
      }
    };

    room.on('dataReceived', handleDataReceived);

    return () => room.off('dataReceived', handleDataReceived);
  }, [room]);

  return (
    /* (content unchanged, same as your original code) */
    <div>...</div>
  );
};

export default ExamViewer;
