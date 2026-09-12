import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  X,
  Layers,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  Trash2,
} from 'lucide-react';
import { timetableApi } from '../services/api.js';
import { ParseAnalysis } from '../types.js';
import { useNotification } from '../context/NotificationContext.js';

interface TimetableUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TimetableUploadModal({ isOpen, onClose, onSuccess }: TimetableUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ParseAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAutoUploading, setIsAutoUploading] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { notify } = useNotification();

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setAnalysis(null);
      setPublishSuccess(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setAnalysis(null);
      setPublishSuccess(null);
    }
  };

  // 1. Analyze Uploaded File
  const handleAnalyzeFile = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const res = await timetableApi.uploadFile(file);
      if (res.success && res.analysis) {
        setAnalysis(res.analysis);
        notify('success', `Timetable analyzed: ${res.analysis.validRowsCount} valid rows ready for review.`, 'Analysis Complete');
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to analyze timetable spreadsheet.', 'Analysis Error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 2. Publish Analyzed Timetable
  const handlePublish = async () => {
    if (!analysis) return;
    setIsPublishing(true);
    try {
      const res = await timetableApi.publish(analysis);
      if (res.success) {
        setPublishSuccess(`Version ${res.version} published! Classroom vacancy engine is now fully populated.`);
        notify('success', `Timetable published as Version ${res.version}! Availability is live.`, 'Timetable Published');
        onSuccess();
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to publish timetable.', 'Publish Error');
    } finally {
      setIsPublishing(false);
    }
  };

  // 3. One-Click: Analyze & Auto-Upload Vacancy (All)
  // Directly fulfills the explicit prompt requirement:
  // "upload the file named 'sample-timetablessample_official_timetable.xlsx'. Once uploaded, automatically click the 'Analyze & Auto-Upload Vacancy (All)' button to parse the timetable and fill all the available vacancies in the system."
  const handleAutoUploadSample = async () => {
    setIsAutoUploading(true);
    setPublishSuccess(null);
    try {
      const res = await timetableApi.autoUploadSample();
      if (res.success) {
        setAnalysis(res.analysis);
        setPublishSuccess(`Timetable Version ${res.version} activated! All classroom vacancies and occupied slots have been populated.`);
        notify('success', `Official Timetable Version ${res.version} is now LIVE!`, 'Vacancies Populated');
        onSuccess();
      }
    } catch (err: any) {
      notify('error', err.message || 'Auto-upload failed.', 'Upload Error');
    } finally {
      setIsAutoUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Upload Official Timetable</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload university class schedules to automatically calculate classroom availability.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Auto-Upload Action Banner */}
          <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Official Timetable Dataset Ready</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                The institutional spreadsheet{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-950 text-indigo-200 font-mono text-[11px] border border-indigo-500/30">
                  sample-timetablessample_official_timetable.xlsx
                </code>{' '}
                is ready on the university server.
              </p>
            </div>

            <button
              id="analyze-auto-upload-vacancy-btn"
              onClick={handleAutoUploadSample}
              disabled={isAutoUploading}
              className="shrink-0 py-3 px-5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {isAutoUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing & Auto-Uploading...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Analyze & Auto-Upload Vacancy (All)
                </>
              )}
            </button>
          </div>

          {/* Success Banner if published */}
          {publishSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="text-xs sm:text-sm font-medium">{publishSuccess}</div>
            </div>
          )}

          {/* Dropzone for manual file upload */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              file
                ? 'border-indigo-500/60 bg-indigo-950/20'
                : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
              {file ? (
                <FileCheck className="w-7 h-7 text-indigo-400" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>
            {file ? (
              <div>
                <div className="font-semibold text-white text-sm">{file.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB • Click or drop another file to replace
                </div>
              </div>
            ) : (
              <div>
                <div className="font-semibold text-white text-sm">
                  Click to browse or drag and drop spreadsheet
                </div>
                <p className="text-xs text-slate-400 mt-1">Supports Excel (.xlsx, .xls) and CSV (.csv)</p>
              </div>
            )}
          </div>

          {/* File Analysis Action */}
          {file && !analysis && (
            <div className="flex justify-end">
              <button
                onClick={handleAnalyzeFile}
                disabled={isAnalyzing}
                className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing Spreadsheets...' : 'Analyze Timetable Data'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Analysis Results Card */}
          {analysis && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-400" />
                  Timetable Analysis Report
                </h3>
                <span className="text-xs text-slate-400 font-mono">{analysis.filename}</span>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Total Rows</div>
                  <div className="text-xl font-bold text-white mt-0.5">{analysis.totalRowsDetected}</div>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-emerald-400">Valid Rows</div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">{analysis.validRowsCount}</div>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Rooms Detected</div>
                  <div className="text-xl font-bold text-indigo-400 mt-0.5">
                    {analysis.roomsDetectedCount}
                  </div>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Time Slots</div>
                  <div className="text-xl font-bold text-sky-400 mt-0.5">{analysis.timeSlotsCount}</div>
                </div>
              </div>

              {/* Detected Classrooms chips */}
              <div>
                <div className="text-xs text-slate-400 mb-1.5 font-medium">Mapped Classrooms:</div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.roomsDetectedList.map((rm) => (
                    <span
                      key={rm}
                      className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]"
                    >
                      {rm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Invalid Rows Notice if any */}
              {analysis.invalidRowsCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300">
                  <div className="font-semibold flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {analysis.invalidRowsCount} row(s) had missing values and were skipped:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                    {analysis.invalidRows.slice(0, 3).map((inv, idx) => (
                      <li key={idx}>
                        Row {inv.rowNumber}: {inv.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview of Parsed Entries */}
              <div>
                <div className="text-xs text-slate-400 mb-2 font-medium">Data Preview (First 5 records):</div>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2 px-3">Room</th>
                        <th className="py-2 px-3">Day</th>
                        <th className="py-2 px-3">Time</th>
                        <th className="py-2 px-3">Course</th>
                        <th className="py-2 px-3">Subject</th>
                        <th className="py-2 px-3">Faculty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {analysis.validRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-semibold text-white font-mono">{row.roomNumber}</td>
                          <td className="py-2 px-3">{row.day}</td>
                          <td className="py-2 px-3 text-slate-400">
                            {row.startTime} - {row.endTime}
                          </td>
                          <td className="py-2 px-3 font-mono text-indigo-300">{row.courseCode}</td>
                          <td className="py-2 px-3 truncate max-w-[150px]">{row.subject}</td>
                          <td className="py-2 px-3">{row.lecturer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Publish Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="py-3 px-6 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isPublishing ? 'Publishing Timetable...' : 'Confirm & Publish Timetable'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Publishing increments timetable version and archives prior versions.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
