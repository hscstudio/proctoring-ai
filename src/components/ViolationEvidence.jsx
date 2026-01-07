import React from "react";
import { AlertTriangle, User, Users, Eye, MicOff } from "lucide-react";

/**
 * Violation Evidence Display Component
 * Shows recent violations with evidence (screenshots or text)
 *
 * @param {Array} evidence - Array of violation evidence objects
 */
const ViolationEvidence = ({ evidence }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="mt-6 p-6 bg-slate-50 rounded-[2rem] text-center">
        <p className="text-xs text-slate-400 font-black uppercase tracking-widest">
          Belum ada pelanggaran
        </p>
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case "voice":
        return <MicOff size={14} />;
      case "faceMissing":
        return <User size={14} />;
      case "multiplePeople":
        return <Users size={14} />;
      case "notFocus":
        return <Eye size={14} />;
      default:
        return <AlertTriangle size={14} />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "voice":
        return "SUARA";
      case "faceMissing":
        return "WAJAH";
      case "multiplePeople":
        return "PERSON";
      case "notFocus":
        return "FOKUS";
      default:
        return "LAINNYA";
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="mt-6 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-red-500" />
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
          Bukti Pelanggaran
        </p>
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
        {evidence.map((item, idx) => (
          <div
            key={idx}
            className="bg-red-50 border-2 border-red-100 rounded-[1.5rem] p-3 hover:shadow-lg transition-all"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center">
                {getIcon(item.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">
                    {getTypeLabel(item.type)}
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">
                    {formatTime(item.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-slate-700 font-bold mb-2 leading-tight">
                  {item.description}
                </p>

                {/* Evidence Display */}
                {item.type === "voice" ? (
                  <div className="bg-white p-2 rounded-lg border border-red-200">
                    <p className="text-[10px] text-red-700 italic font-semibold">
                      "{item.evidence}"
                    </p>
                  </div>
                ) : item.evidence ? (
                  <img
                    src={item.evidence}
                    alt="Evidence"
                    className="w-full h-20 object-cover rounded-lg border-2 border-red-200"
                  />
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViolationEvidence;
