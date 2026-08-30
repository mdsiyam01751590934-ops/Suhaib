import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Star,
  Trash2,
  FileText,
  Music,
  Film,
  Info,
  Maximize2,
  Send,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { CloudFile } from '../types';
import { formatBytes, formatDate, isImage, isVideo, isAudio, isPdf } from '../utils/formatters';
import { getFileUrl } from '../utils/api';

interface MediaViewerProps {
  files: CloudFile[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleFavorite?: (file: CloudFile) => void;
  onDelete?: (file: CloudFile) => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  files,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onToggleFavorite,
  onDelete,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentFile = files[currentIndex];

  useEffect(() => {
    setZoom(1);
    setRotation(0);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < files.length - 1) {
        onNavigate(currentIndex + 1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, files.length, onClose, onNavigate]);

  if (!isOpen || !currentFile) return null;

  const fileName = currentFile.name || currentFile.fileName || 'Untitled';
  const fileSize = currentFile.size || currentFile.fileSize || 0;
  const isStarred = currentFile.isStarred || currentFile.favorite || false;

  const isImg = isImage(currentFile.mimeType, fileName);
  const isVid = isVideo(currentFile.mimeType, fileName);
  const isAud = isAudio(currentFile.mimeType, fileName);
  const isDoc = isPdf(currentFile.mimeType, fileName);
  const viewUrl = getFileUrl(currentFile.id, 'view');
  const downloadUrl = getFileUrl(currentFile.id, 'download');

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${viewUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
      >
        {/* Top Floating Control Bar */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-3 text-white truncate max-w-md">
            <span className="text-xs font-semibold truncate">{fileName}</span>
            <span className="text-[11px] text-zinc-400">({formatBytes(fileSize)})</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isImg && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(currentFile)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isStarred
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
                title="Star"
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Copy Direct Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <a
              href={downloadUrl}
              download={fileName}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                showInfo ? 'text-sky-400 bg-sky-500/20' : 'text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
              title="File Information"
            >
              <Info className="w-4 h-4" />
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(currentFile)}
                className="p-2 rounded-lg text-zinc-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete File"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors ml-2 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Previous Button */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 hover:scale-110 transition-all border border-white/10 shadow-xl cursor-pointer"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {currentIndex < files.length - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 hover:scale-110 transition-all border border-white/10 shadow-xl cursor-pointer"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Main Content Viewer */}
        <div className="relative w-full h-full flex items-center justify-center p-8 overflow-hidden select-none">
          {isImg && (
            <div className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200">
              <img
                src={viewUrl}
                alt={fileName}
                referrerPolicy="no-referrer"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="max-h-[82vh] max-w-[85vw] object-contain rounded-lg shadow-2xl drop-shadow-2xl"
              />
            </div>
          )}

          {isVid && (
            <div className="relative max-w-4xl w-full max-h-[80vh] flex items-center justify-center">
              <video
                src={viewUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[80vh] w-full rounded-xl shadow-2xl bg-black outline-hidden border border-white/10"
              />
            </div>
          )}

          {isAud && (
            <div className="bg-zinc-900/90 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center text-white">
              <div className="w-20 h-20 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-500/30 animate-pulse">
                <Music className="w-10 h-10" />
              </div>
              <h3 className="text-base font-semibold truncate mb-1">{fileName}</h3>
              <p className="text-xs text-zinc-400 mb-6">{formatBytes(fileSize)} • Audio Stream</p>
              <audio src={viewUrl} controls autoPlay className="w-full" />
            </div>
          )}

          {isDoc && (
            <div className="w-full max-w-5xl h-[80vh] bg-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col border border-zinc-800">
              <div className="bg-zinc-800/80 px-4 py-2 border-b border-zinc-700 flex items-center justify-between text-zinc-200 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>PDF Document Viewer</span>
                </div>
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                >
                  <span>Open in new tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <iframe
                src={viewUrl}
                title={fileName}
                className="w-full h-full border-none bg-zinc-950"
              />
            </div>
          )}

          {!isImg && !isVid && !isAud && !isDoc && (
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center text-white">
              <div className="w-20 h-20 bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                <FileText className="w-10 h-10" />
              </div>
              <h3 className="text-base font-semibold truncate mb-1">{fileName}</h3>
              <p className="text-xs text-zinc-400 mb-6">
                {currentFile.mimeType} • {formatBytes(fileSize)}
              </p>
              <div className="flex justify-center">
                <a
                  href={downloadUrl}
                  download={fileName}
                  className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* File Information Side Drawer */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-900/95 border-l border-zinc-800 p-6 z-30 overflow-y-auto backdrop-blur-xl text-zinc-200"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
                <h4 className="font-semibold text-white flex items-center gap-2 text-xs">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>File Details</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">File Name</label>
                  <p className="font-medium text-white break-words mt-0.5">{fileName}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">File Size</label>
                  <p className="font-medium text-white mt-0.5">{formatBytes(fileSize)} ({fileSize.toLocaleString()} bytes)</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">MIME Type</label>
                  <p className="font-mono text-[11px] text-zinc-300 mt-0.5 bg-zinc-800/80 px-2 py-1 rounded">
                    {currentFile.mimeType || 'unknown'}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Folder</label>
                  <p className="font-medium text-white mt-0.5 capitalize">{currentFile.folder || 'Root'}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Upload Date</label>
                  <p className="font-medium text-white mt-0.5">{formatDate(currentFile.createdAt)}</p>
                </div>

                {/* Telegram Vault Metadata */}
                <div className="pt-4 border-t border-zinc-800 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram MTProto Vault</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 font-medium">Telegram Message ID</label>
                    <p className="font-mono text-xs text-zinc-300 mt-0.5">
                      #{currentFile.telegramMessageId || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 font-medium">Telegram Storage Target</label>
                    <p className="font-mono text-[10px] text-zinc-400 mt-0.5 break-all bg-zinc-950 p-2 rounded border border-zinc-800">
                      Saved Messages (MTProto Direct Stream)
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom index indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-zinc-300 z-20">
          {currentIndex + 1} of {files.length}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
export default MediaViewer;
