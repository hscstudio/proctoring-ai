import React from "react";
import Webcam from "react-webcam";
import { User, Users, Eye, MicOff } from "lucide-react";
import StatusItem from "./StatusItem";
import ViolationEvidence from "./ViolationEvidence";

/**
 * Proctoring Monitor Panel Component
 * Displays webcam feed, status indicators, violation meter, and evidence
 *
 * @param {Object} webcamRef - Reference to webcam component
 * @param {Object} proctorStatus - Status object { faceDetected, lookingCenter, singlePerson, isQuiet }
 * @param {number} violations - Current violation count
 * @param {Array} violationEvidence - Array of violation evidence objects
 */
const ProctoringMonitor = ({
  webcamRef,
  proctorStatus,
  violations,
  violationEvidence = [],
}) => {
  return (
    <div className="w-full lg:w-96">
      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-200 sticky top-32 shadow-2xl shadow-slate-200/60">
        {/* Webcam Feed */}
        <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-slate-950 border-4 border-white shadow-2xl mb-8 group">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored={true}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute top-5 left-5 bg-red-600 text-[9px] text-white px-4 py-2 rounded-full font-black flex items-center gap-2 shadow-xl tracking-widest uppercase italic">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>{" "}
            AI Guard Active
          </div>
        </div>

        {/* Status Indicators */}
        <div className="space-y-3">
          <StatusItem
            icon={<User size={16} />}
            label="Wajah"
            status={proctorStatus.faceDetected}
          />
          <StatusItem
            icon={<Eye size={16} />}
            label="Fokus"
            status={proctorStatus.lookingCenter}
          />
          <StatusItem
            icon={<Users size={16} />}
            label="Person"
            status={proctorStatus.singlePerson}
          />
          <StatusItem
            icon={<MicOff size={16} />}
            label="Voice"
            status={proctorStatus.isQuiet}
          />
        </div>

        {/* Violation Meter */}
        <div className="mt-10 p-8 bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full"></div>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] italic mb-2 opacity-50">
            Violation Meter
          </p>
          <div className="flex items-end justify-between">
            <h2
              className={`text-6xl font-black leading-none italic tracking-tighter ${
                violations > 7 ? "text-red-500" : "text-indigo-400"
              }`}
            >
              {violations}
            </h2>
            <p className="text-[11px] text-slate-500 mb-1 font-black tracking-[0.2em]">
              MAX: 10
            </p>
          </div>
          <div className="w-full bg-white/5 h-3 rounded-full mt-6 overflow-hidden border border-white/5">
            <div
              className="bg-indigo-500 h-full transition-all duration-1000 ease-out shadow-[0_0_20px_#6366f1]"
              style={{ width: `${(violations / 10) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Violation Evidence */}
        <ViolationEvidence evidence={violationEvidence} />
      </div>
    </div>
  );
};

export default ProctoringMonitor;
