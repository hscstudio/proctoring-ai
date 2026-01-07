import React from "react";

/**
 * Status indicator component for proctoring monitor
 *
 * @param {Object} icon - Lucide icon component
 * @param {string} label - Status label text
 * @param {boolean} status - true = OK, false = violation
 */
const StatusItem = ({ icon, label, status }) => (
  <div
    className={`flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all duration-500 ${
      status
        ? "bg-slate-50 border-slate-50"
        : "bg-red-50 border-red-100 shadow-lg translate-x-2"
    }`}
  >
    <div className="flex items-center gap-4">
      <div
        className={`${
          status ? "text-slate-400" : "text-red-500"
        } transition-colors`}
      >
        {icon}
      </div>
      <span
        className={`text-xs font-black uppercase tracking-widest ${
          status ? "text-slate-600" : "text-red-700 italic"
        }`}
      >
        {label}
      </span>
    </div>
    <div
      className={`w-3 h-3 rounded-full shadow-lg ${
        status ? "bg-emerald-500" : "bg-red-500 animate-pulse"
      }`}
    ></div>
  </div>
);

export default StatusItem;
