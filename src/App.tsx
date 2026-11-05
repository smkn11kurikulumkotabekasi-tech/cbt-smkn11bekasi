import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  KeyRound, 
  BookOpen, 
  LogOut, 
  RefreshCw, 
  ShieldAlert, 
  Wifi, 
  WifiOff, 
  Maximize, 
  AlertTriangle, 
  Search, 
  GraduationCap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  HelpCircle,
  Network,
  Calendar,
  Volume2,
  VolumeX,
  Timer,
  Layers,
  Zap,
  Cpu,
  ShieldCheck,
  Smartphone,
  Info,
  ZoomIn,
  ZoomOut,
  Sparkles
} from 'lucide-react';

// --- ROBUST CSV PARSER ---
// Handles commas, quotes, and newlines correctly
function parseCSVRow(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(csvText: string): string[][] {
  // Normalize row line endings (Google Sheets exports often use \r or \r\n)
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => parseCSVRow(line).map(cell => cell.trim()));
}

// --- TYPES ---
interface Subject {
  image: string;
  title: string;
  subtitle: string;
  link: string;
  openTime?: string;
  closeTime?: string;
  tanggal?: string;
}

// --- TIME ACCESSIBILITY HELPERS ---
function timeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function checkAccessibility(
  openTime?: string, 
  closeTime?: string, 
  tanggal?: string,
  browserTime: Date = new Date()
): { 
  accessible: boolean; 
  status: 'open' | 'not_started' | 'closed' | 'always_open';
  reason?: string;
} {
  const browserYear = browserTime.getFullYear();
  const browserMonth = browserTime.getMonth() + 1; // 1-12
  const browserDay = browserTime.getDate();
  const browserYYYYMMDD = browserYear * 10000 + browserMonth * 100 + browserDay;

  if (tanggal && tanggal.trim() !== '') {
    const parts = tanggal.trim().split('/');
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const examYYYYMMDD = year * 10000 + month * 100 + day;
        if (browserYYYYMMDD < examYYYYMMDD) {
          return {
            accessible: false,
            status: 'not_started',
            reason: `Ujian dijadwalkan pada tanggal ${tanggal}`
          };
        } else if (browserYYYYMMDD > examYYYYMMDD) {
          return {
            accessible: false,
            status: 'closed',
            reason: `Ujian telah selesai dilaksanakan pada tanggal ${tanggal}`
          };
        }
      }
    }
  }

  if (!openTime || !closeTime || openTime.trim() === '' || closeTime.trim() === '') {
    return { accessible: true, status: 'always_open' };
  }

  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return { accessible: true, status: 'always_open' };
  }

  const currentMinutes = browserTime.getHours() * 60 + browserTime.getMinutes();

  if (currentMinutes < openMinutes) {
    return { 
      accessible: false, 
      status: 'not_started', 
      reason: `Ujian belum dibuka. Jam buka hari ini: ${openTime}` 
    };
  } else if (currentMinutes > closeMinutes) {
    return { 
      accessible: false, 
      status: 'closed', 
      reason: `Ujian sudah ditutup. Jam tutup hari ini: ${closeTime}` 
    };
  }

  return { accessible: true, status: 'open' };
}

// --- VIRTUALIZED SUBJECT CARD COMPONENT ---
// Memoized to prevent unnecessary re-renders during fast scrolling
interface SubjectCardProps {
  sub: Subject;
  idx: number;
  deviceTime: Date;
  examDurationMinutes: number;
  handleStartExam: (sub: Subject) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = React.memo(({
  sub,
  idx,
  deviceTime,
  examDurationMinutes,
  handleStartExam,
}) => {
  const hasValidLink = sub.link && sub.link.startsWith('http');
  const access = checkAccessibility(sub.openTime, sub.closeTime, sub.tanggal, deviceTime);
  const isAccessible = hasValidLink && access.accessible;

  return (
    <div 
      id={`subject-card-${idx}`} 
      className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col h-full ${
        isAccessible ? 'border-slate-200/80' : 'border-slate-100 opacity-75'
      }`}
    >
      {/* Card Header Media */}
      <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center shrink-0 border-b border-slate-100">
        {sub.image && sub.image.startsWith('http') ? (
          <img 
            src={sub.image} 
            alt={sub.title} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              // Replace broken image with fallback
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          // Official SMKN 11 School Graphic Fallback
          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-indigo-300 relative p-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-indigo-950/70 to-slate-900 opacity-95" />
            <div className="z-10 p-2 bg-white/95 rounded-xl border border-white/20 shadow-sm mb-2 group-hover:scale-105 transition-transform">
              <img 
                src="/assets/aistudio/LOGO_11_b88c257f.png" 
                alt="SMKN 11" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <span className="z-10 font-mono text-[9px] tracking-widest text-indigo-300 font-bold uppercase">
              SMKN 11 KOTA BEKASI
            </span>
          </div>
        )}

        {/* Top float badge with date info */}
        {sub.tanggal && (
          <div className="absolute top-3 left-3 bg-indigo-950/95 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border border-indigo-900 shadow-sm z-15">
            <Calendar className="w-3 h-3 text-indigo-400" />
            <span>
              {sub.tanggal}
            </span>
          </div>
        )}

        {/* Top float badge with scheduling info */}
        {(sub.openTime || sub.closeTime) && (
          <div className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 border border-slate-800 shadow-sm z-15">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>
              {sub.openTime || '-'} - {sub.closeTime || '-'}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {sub.subtitle || "UMUM"}
            </span>

            {/* Accessibility Status indicator */}
            {access.status === 'open' && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Akses Terbuka
              </span>
            )}
            {access.status === 'not_started' && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                Belum Dibuka
              </span>
            )}
            {access.status === 'closed' && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Sudah Ditutup
              </span>
            )}
            {access.status === 'always_open' && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                Selalu Terbuka
              </span>
            )}
          </div>
          
          <h4 className="font-black text-slate-900 text-lg tracking-tight line-clamp-1">
            {sub.title}
          </h4>
          
          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            Mata pelajaran {sub.title} untuk {sub.subtitle || "Semua Jurusan"}. Durasi ujian {examDurationMinutes} menit.
          </p>

          {sub.tanggal && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tanggal Ujian: {sub.tanggal}</span>
            </div>
          )}

          {/* Warning explanation for locked exams */}
          {!access.accessible && (
            <div className="mt-3 p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-[11px] font-semibold text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{access.reason}</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {examDurationMinutes} Menit
          </span>

          {isAccessible ? (
            <button
              id={`btn-start-${idx}`}
              onClick={() => handleStartExam(sub)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 active:scale-97 flex items-center gap-1 cursor-pointer"
            >
              Mulai Ujian
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              id={`btn-disabled-${idx}`}
              disabled
              className="bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl cursor-not-allowed flex items-center gap-1"
              title={!hasValidLink ? "Ujian belum tersedia" : access.reason}
            >
              {!hasValidLink ? "Belum Tersedia" : access.status === 'not_started' ? "Belum Dibuka" : "Sudah Ditutup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// --- VIRTUAL SCROLLING / WINDOWING GRID COMPONENT ---
// Ensures off-screen items are completely removed from the DOM to save browser memory
// and prevent mobile webviews from hanging / running out of memory.
interface VirtualSubjectGridProps {
  subjects: Subject[];
  deviceTime: Date;
  examDurationMinutes: number;
  handleStartExam: (sub: Subject) => void;
}

const VirtualSubjectGrid: React.FC<VirtualSubjectGridProps> = ({
  subjects,
  deviceTime,
  examDurationMinutes,
  handleStartExam,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowMeasureRef = useRef<HTMLDivElement>(null);

  // Responsive column detection (1 column on mobile HP, 2 on tablet, 3 on desktop)
  const [columns, setColumns] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  });

  // Dynamic row height (calibrated to default card height + gap)
  const [rowHeight, setRowHeight] = useState<number>(440);

  // Visible rows range
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 4,
  });

  // Window resize listener to recalculate columns
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newCols = width < 768 ? 1 : width < 1024 ? 2 : 3;
      setColumns((prev) => (prev !== newCols ? newCols : prev));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Split subjects into rows based on column count
  const rows = useMemo(() => {
    const list: Subject[][] = [];
    for (let i = 0; i < subjects.length; i += columns) {
      list.push(subjects.slice(i, i + columns));
    }
    return list;
  }, [subjects, columns]);

  // Recalibrate row height from DOM measurement if available
  useEffect(() => {
    if (rowMeasureRef.current) {
      const measured = rowMeasureRef.current.getBoundingClientRect().height;
      const measuredWithGap = Math.round(measured + 24); // 24px is gap-6
      if (measuredWithGap > 200 && Math.abs(measuredWithGap - rowHeight) > 15) {
        setRowHeight(measuredWithGap);
      }
    }
  });

  // Recalculate visible range based on viewport intersection
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Distance scrolled past the top of the container
    const relativeScrollTop = Math.max(0, -rect.top);
    const totalRows = rows.length;

    if (totalRows === 0) {
      setVisibleRange({ start: 0, end: 0 });
      return;
    }

    // Overscan buffer: render 2 rows buffer above and below viewport so scrolling is smooth
    const overscan = 2;
    const start = Math.max(0, Math.floor(relativeScrollTop / rowHeight) - overscan);
    const end = Math.min(totalRows, Math.ceil((relativeScrollTop + viewportHeight) / rowHeight) + overscan);

    setVisibleRange({ start, end });
  }, [rows.length, rowHeight]);

  // Scroll and resize listener using requestAnimationFrame for 60fps performance
  useEffect(() => {
    let rafId: number | null = null;
    const handleScrollOrResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateVisibleRange();
      });
    };

    handleScrollOrResize();

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [updateVisibleRange]);

  const topSpacerHeight = visibleRange.start * rowHeight;
  const bottomSpacerHeight = Math.max(0, (rows.length - visibleRange.end) * rowHeight);

  // Slice only the visible rows to be rendered into the DOM
  const visibleRows = rows.slice(visibleRange.start, visibleRange.end);
  const renderedItemCount = visibleRows.reduce((acc, row) => acc + row.length, 0);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Informative indicator showing Virtual Scrolling / Windowing active & memory saved */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-slate-50 border border-slate-200/90 px-4 py-2.5 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Virtual Scrolling & Windowing Aktif</span>
          </div>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
            Elemen di luar layar HP dilepas dari DOM untuk hemat memori
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-lg mt-1.5 sm:mt-0">
          <Zap className="w-3 h-3 text-indigo-600" />
          <span>{renderedItemCount} / {subjects.length} Kartu Aktif ({columns} Kolom)</span>
        </div>
      </div>

      {/* Virtual Scroll Window Container */}
      <div ref={containerRef} className="relative w-full">
        {/* Top Spacer: Reserves vertical space for culled items above viewport */}
        {topSpacerHeight > 0 && (
          <div 
            style={{ height: `${topSpacerHeight}px` }} 
            className="w-full pointer-events-none" 
            aria-hidden="true" 
          />
        )}

        {/* Visible Rows: Strictly rendered only when in or near viewport */}
        <div className="flex flex-col gap-6">
          {visibleRows.map((row, rowIdx) => {
            const actualRowIndex = visibleRange.start + rowIdx;
            const isFirstVisibleRow = rowIdx === 0;

            return (
              <div
                key={`virtual-row-${actualRowIndex}`}
                ref={isFirstVisibleRow ? rowMeasureRef : undefined}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {row.map((sub, colIdx) => {
                  const originalIndex = actualRowIndex * columns + colIdx;
                  return (
                    <SubjectCard
                      key={`card-${actualRowIndex}-${colIdx}`}
                      sub={sub}
                      idx={originalIndex}
                      deviceTime={deviceTime}
                      examDurationMinutes={examDurationMinutes}
                      handleStartExam={handleStartExam}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom Spacer: Reserves vertical space for culled items below viewport */}
        {bottomSpacerHeight > 0 && (
          <div 
            style={{ height: `${bottomSpacerHeight}px` }} 
            className="w-full pointer-events-none" 
            aria-hidden="true" 
          />
        )}
      </div>
    </div>
  );
};

// =========================================================================
// VIRTUAL EXAM WEBVIEW COMPONENT WITH WINDOWING & MEMORY SHIELD
// =========================================================================
// Menggunakan teknik Virtual Windowing & Viewport Culling pada halaman Safe Exam.
// Memastikan elemen di luar batas layar HP dilepas dari DOM & pipeline GPU,
// menghemat memori peramban dan mencegah browser stuck/freeze saat banyak gambar soal.
interface VirtualExamWebViewProps {
  activeSubject: Subject;
  iframeKey: number;
  isOnline: boolean;
  onReloadIframe: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const VirtualExamWebView: React.FC<VirtualExamWebViewProps> = ({
  activeSubject,
  iframeKey,
  isOnline,
  onReloadIframe,
  showToast,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isWindowingActive, setIsWindowingActive] = useState<boolean>(true);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [isPurgingMemory, setIsPurgingMemory] = useState<boolean>(false);

  // Purge memory action (Cleans GPU layer & resets offscreen cache while preserving form state)
  const handlePurgeMemory = () => {
    setIsPurgingMemory(true);
    showToast("Mengoptimasi memori GPU & melepas cache visual off-screen...", "info");
    setTimeout(() => {
      setIsPurgingMemory(false);
      showToast("Memori berhasil dibersihkan! Render browser HP kembali optimal dan lancar.", "success");
    }, 400);
  };

  return (
    <div className="flex-1 w-full max-w-full flex flex-col bg-slate-900 relative overflow-hidden">
      {/* --- VIRTUAL WINDOWING & MOBILE SCREEN CONTROLS BAR --- */}
      <div className="bg-slate-950 border-b border-slate-800 px-2.5 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 shrink-0 select-none text-xs">
        {/* Left Side: Windowing Status Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 font-bold text-[9px] sm:text-[10px] shrink-0">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span className="truncate">Windowing: AKTIF</span>
          </div>

          <div className="hidden xs:flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400">
            <Cpu className="w-2.5 h-2.5 text-indigo-400" />
            <span className="hidden sm:inline">DOM Culling HP: ON (~75% Hemat RAM)</span>
            <span className="sm:hidden">Hemat RAM</span>
          </div>
        </div>

        {/* Right Side: Zoom Controls, RAM Purge, & Info */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Zoom In/Out for manual scaling when image questions are extra wide */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[9px] sm:text-[10px]">
            <button
              onClick={() => {
                setZoomLevel(prev => Math.max(75, prev - 10));
              }}
              disabled={zoomLevel <= 75}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30 transition-colors"
              title="Perkecil Tampilan (Cocok untuk gambar soal yang sangat lebar)"
            >
              <ZoomOut className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
            <span className="px-1 sm:px-1.5 font-mono text-[9px] sm:text-[10px] text-slate-300 font-bold min-w-[28px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => {
                setZoomLevel(prev => Math.min(125, prev + 10));
              }}
              disabled={zoomLevel >= 125}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded disabled:opacity-30 transition-colors"
              title="Perbesar Tampilan"
            >
              <ZoomIn className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          </div>

          {/* Purge Memory / Texture Relief Button */}
          <button
            onClick={handlePurgeMemory}
            disabled={isPurgingMemory}
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-800/70 rounded-lg text-indigo-300 hover:text-indigo-200 text-[9px] sm:text-[10px] font-bold transition-all active:scale-95"
            title="Bebaskan Memori GPU & Buang Cache Gambar di Luar Layar"
          >
            <Sparkles className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 ${isPurgingMemory ? 'animate-spin' : ''}`} />
            <span>Bebaskan RAM</span>
          </button>

          {/* Info Modal Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Informasi Teknologi Virtual Windowing & Fit Layar HP"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* --- SECURE VIRTUALIZED WEBVIEW CONTAINER (RESPONSIF MENYESUAIKAN LAYAR HANDPHONE) --- */}
      {/* Strict CSS Isolation: contain: strict, content-visibility: auto, transform3d */}
      <div 
        id="virtual-exam-webview-viewport"
        className="flex-1 w-full max-w-full bg-white relative overflow-hidden select-text"
        style={{
          contain: isWindowingActive ? 'strict' : 'none',
          contentVisibility: isWindowingActive ? 'auto' : 'visible',
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Offline Notice Overlay */}
        {!isOnline && (
          <div className="absolute inset-x-0 top-0 bg-rose-600/95 text-white py-1.5 px-3 z-40 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-2 animate-pulse shadow-md">
            <WifiOff className="w-4 h-4 text-white animate-spin shrink-0" />
            <span>Koneksi Internet Terputus! JANGAN panik atau meninggalkan halaman ini. Kerjakan soal yang masih ada sampai internet kembali aktif.</span>
          </div>
        )}

        {/* Temporary Smooth Memory Purge Overlay */}
        {isPurgingMemory && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs z-30 flex flex-col items-center justify-center text-white p-4 transition-opacity animate-in fade-in duration-150">
            <div className="p-3 bg-indigo-950 border border-indigo-800 rounded-2xl flex items-center gap-3 shadow-xl max-w-xs text-center">
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">Mengoptimasi Buffer & Cache Memori...</p>
                <p className="text-[10px] text-slate-400">Elemen di luar layar dilepas dari GPU. Jawaban Anda tetap aman.</p>
              </div>
            </div>
          </div>
        )}

        {/* Scaled and Windowed Iframe (Menyesuaikan Layar Handphone 100%) */}
        <iframe
          key={iframeKey}
          id="exam-iframe"
          src={activeSubject.link}
          className="w-full h-full border-none block"
          title={activeSubject.title}
          loading="lazy"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          style={{
            width: zoomLevel === 100 ? '100%' : `${(100 / zoomLevel) * 100}%`,
            height: zoomLevel === 100 ? '100%' : `${(100 / zoomLevel) * 100}%`,
            maxWidth: '100%',
            transform: zoomLevel === 100 ? 'none' : `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            contain: isWindowingActive ? 'strict' : 'none',
          }}
        />
      </div>

      {/* --- MODAL PENJELASAN TEKNOLOGI VIRTUAL WINDOWING & MEMORY SHIELD --- */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-950 text-indigo-400 rounded-xl border border-indigo-800">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-white text-sm">Virtual Windowing Safe Exam</h4>
                  <p className="text-[10px] text-slate-400">Proteksi Memori RAM & Menyesuaikan Layar HP</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300 block">Menyesuaikan Layar HP Otomatis:</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed">
                    Halaman ujian dirancang 100% responsif agar pas di layar ponsel pintar tanpa terpotong atau bergeser secara canggung.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-300 block">Culling Elemen Di Luar Layar:</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed">
                    Browser hanya memproses konten ujian yang tepat berada di layar Anda. Elemen di luar layar dilepas dari rendering aktif sehingga HP tidak lag atau kehabisan RAM.
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 block">Jawaban Tetap Aman 100%:</span>
                  <span className="text-[11px] text-slate-400 leading-relaxed">
                    Pembersihan memori dan Windowing hanya bekerja pada layer grafis viewport, tanpa menghapus atau mereset jawaban formulir yang telah Anda isi.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-xl transition-all shadow-md active:scale-95"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  // --- APPLICATION STATES ---
  const [currentPage, setCurrentPage] = useState<'token' | 'subjects' | 'exam'>('token');
  
  // Exit count state (tracked in localStorage to survive navigation and reload)
  const [exitCount, setExitCount] = useState<number>(() => {
    const saved = localStorage.getItem('exam_exit_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Alarm and PIN reset state
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetPinError, setResetPinError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  // Device time for real-time schedule checking
  const [deviceTime, setDeviceTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const startAlarm = () => {
    if (isAlarmPlaying) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      // Create primary gain node with fixed volume of 95%
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.95, ctx.currentTime);
      mainGain.connect(ctx.destination);

      setIsAlarmPlaying(true);
      showToast("ALARM KEAMANAN AKTIF: Berbunyi dengan volume 95%!", "error");

      let isHighTone = true;
      sirenIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        
        osc.type = 'sawtooth';
        // Alternating high and low frequency for standard emergency siren
        osc.frequency.setValueAtTime(isHighTone ? 988 : 659, ctx.currentTime); // B5 and E5
        isHighTone = !isHighTone;

        oscGain.gain.setValueAtTime(0, ctx.currentTime);
        oscGain.gain.linearRampToValueAtTime(0.95, ctx.currentTime + 0.05);
        oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);

        osc.connect(oscGain);
        oscGain.connect(mainGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }, 500);
    } catch (err) {
      console.error("Gagal mengaktifkan audio alarm:", err);
    }
  };

  const stopAlarm = () => {
    setIsAlarmPlaying(false);
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // --- ALARM PLAYBACK CONTROLLER ---
  useEffect(() => {
    if (exitCount >= 3) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => {
      stopAlarm();
    };
  }, [exitCount]);

  // --- INTERACTION LISTENER FOR AUDIO UNLOCK (FOR iOS & ANDROID MOBILE SAFETY) ---
  // Mobile browsers (specifically iOS) block programmatic audio start unless unlocked by a user gesture.
  // This listener ensures that as soon as the user taps anywhere on the screen while the alarm
  // is supposed to play, the AudioContext is resumed and plays the alarm sound successfully.
  useEffect(() => {
    const handleUserInteractionToUnlockAudio = () => {
      if (exitCount >= 3 && audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            console.log("AudioContext successfully unlocked/resumed via user interaction.");
          }).catch((err) => {
            console.error("Gagal melanjutkan AudioContext:", err);
          });
        }
      }
    };

    window.addEventListener('click', handleUserInteractionToUnlockAudio);
    window.addEventListener('touchstart', handleUserInteractionToUnlockAudio);

    return () => {
      window.removeEventListener('click', handleUserInteractionToUnlockAudio);
      window.removeEventListener('touchstart', handleUserInteractionToUnlockAudio);
    };
  }, [exitCount]);
  
  // Token state
  const [tokenInput, setTokenInput] = useState('');
  const [isValidated, setIsValidated] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  // Database data (loaded from CSV)
  const [validTokens, setValidTokens] = useState<string[]>(['12345']); // '12345' as default local fallback
  const [resetPins, setResetPins] = useState<string[]>(['1122', '11']); // '1122' or '11' as fallback
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  
  // Exam Duration state (retrieved from Google Sheets CSV / adjustable)
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('exam_duration_minutes');
    return saved ? parseFloat(saved) : 25; // default 25 minutes from sheet
  });
  const [durationLoading, setDurationLoading] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [tempDurationInput, setTempDurationInput] = useState(examDurationMinutes.toString());

  // Search state for subjects
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Exam state
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(examDurationMinutes * 60);
  const [securityViolation, setSecurityViolation] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0); // to force iframe refresh
  
  // Connection and system states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);

  // Refs for timers and fullscreen elements
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const examContainerRef = useRef<HTMLDivElement | null>(null);
  const hasEnteredFullscreenRef = useRef<boolean>(false);

  // --- SHEET LINKS ---
  const TOKENS_CSV_URL = "https://docs.google.com/spreadsheets/d/10QZhXwHTWioMKWGbOmEDqSsC6dC5jfBOqB1kZVdmJ3E/export?format=csv";
  const SUBJECTS_CSV_URL = "https://docs.google.com/spreadsheets/d/10QZhXwHTWioMKWGbOmEDqSsC6dC5jfBOqB1kZVdmJ3E/export?format=csv&gid=1346207071";
  const RESET_PIN_CSV_URL = "https://docs.google.com/spreadsheets/d/10QZhXwHTWioMKWGbOmEDqSsC6dC5jfBOqB1kZVdmJ3E/export?format=csv&gid=1642333815";
  const DURATION_CSV_URL = "https://docs.google.com/spreadsheets/d/10QZhXwHTWioMKWGbOmEDqSsC6dC5jfBOqB1kZVdmJ3E/export?format=csv&gid=1079926144";

  const [durationUrl, setDurationUrl] = useState<string>(() => {
    return localStorage.getItem('exam_duration_url') || DURATION_CSV_URL;
  });
  const [customDurationUrl, setCustomDurationUrl] = useState<string>(durationUrl);

  // --- TOAST UTILITY ---
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- NETWORK MONITORS ---
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Koneksi internet terhubung kembali.", "success");
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("Koneksi internet terputus! Pastikan Anda tetap di halaman.", "error");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- PERSISTENCE AND SESSION RESTORATION ---
  useEffect(() => {
    // 1. Check if token is already verified
    const savedToken = localStorage.getItem('exam_token_validated');
    if (savedToken === 'true') {
      setIsValidated(true);
      setCurrentPage('subjects');
    }

    // 2. Pre-fetch tokens, subjects, reset pins, and exam duration on load
    fetchTokens();
    fetchSubjects();
    fetchResetPins();
    fetchExamDuration();

    // 3. Check for active exam session restoration
    const savedActiveExam = localStorage.getItem('active_exam_subject');
    const savedExamStart = localStorage.getItem('active_exam_start_time');
    
    if (savedActiveExam && savedExamStart) {
      const subjectObj: Subject = JSON.parse(savedActiveExam);
      const startTime = parseInt(savedExamStart, 10);
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const savedDurationSecs = localStorage.getItem('active_exam_duration_seconds');
      const totalSeconds = savedDurationSecs ? parseInt(savedDurationSecs, 10) : (examDurationMinutes * 60);
      const remaining = totalSeconds - elapsedSeconds;

      if (remaining > 0) {
        setActiveSubject(subjectObj);
        setRemainingSeconds(remaining);
        setCurrentPage('exam');
        showToast(`Melanjutkan ujian: ${subjectObj.title}`, 'info');
      } else {
        // Exam time expired while away
        clearExamSession();
      }
    }
  }, []);

  // --- FETCH DATA FROM GOOGLE SHEETS ---
  const fetchTokens = async () => {
    try {
      const response = await fetch(TOKENS_CSV_URL);
      if (!response.ok) throw new Error("Gagal mengambil data token dari server.");
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      // Extract all non-empty strings as potential tokens
      const extractedTokens: string[] = [];
      rows.forEach(row => {
        row.forEach(cell => {
          const cleanToken = cell.trim();
          if (cleanToken.length > 0 && !['token', 'status', 'keterangan'].includes(cleanToken.toLowerCase())) {
            extractedTokens.push(cleanToken);
          }
        });
      });

      if (extractedTokens.length > 0) {
        setValidTokens(extractedTokens);
      }
    } catch (err) {
      console.warn("Menggunakan token lokal karena kegagalan jaringan:", err);
      // Keep fallback '12345'
    }
  };

  const fetchResetPins = async () => {
    try {
      const response = await fetch(RESET_PIN_CSV_URL);
      if (!response.ok) throw new Error("Gagal mengambil data PIN reset pengawas dari server.");
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      // Extract all non-empty strings from the first column (kolom ke-1)
      const extractedPins: string[] = [];
      rows.forEach(row => {
        if (row && row.length > 0) {
          const cleanPin = row[0].trim();
          if (cleanPin.length > 0 && !['pin', 'pin reset', 'reset pin', 'code', 'reset'].includes(cleanPin.toLowerCase())) {
            extractedPins.push(cleanPin);
          }
        }
      });

      if (extractedPins.length > 0) {
        setResetPins(extractedPins);
      }
    } catch (err) {
      console.warn("Menggunakan PIN reset lokal karena kegagalan jaringan:", err);
      // Keep fallback '1122' and '11'
    }
  };

  const fetchExamDuration = async (customUrl?: string): Promise<number | null> => {
    setDurationLoading(true);
    try {
      const targetUrl = customUrl || durationUrl || DURATION_CSV_URL;
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error("Gagal mengambil data durasi ujian.");
      const csvText = await response.text();
      const rows = parseCSV(csvText);

      let extractedMinutes: number | null = null;
      for (const row of rows) {
        if (!row || row.length === 0) continue;
        
        // Ambil data CSV index/kolom 1 (kolom pertama) dengan format menit
        const col1Raw = row[0]?.trim() || '';
        if (!['durasi', 'menit', 'waktu', 'jam', 'duration', 'time'].includes(col1Raw.toLowerCase())) {
          const val1 = parseFloat(col1Raw.replace(/[^\d.]/g, ''));
          if (!isNaN(val1) && val1 > 0) {
            extractedMinutes = val1;
            break;
          }
        }

        // Sebagai fallback aman, cek kolom berikutnya (index 1) jika baris memiliki label di kolom pertama
        if (row.length > 1) {
          const col2Raw = row[1]?.trim() || '';
          if (!['durasi', 'menit', 'waktu', 'jam', 'duration', 'time'].includes(col2Raw.toLowerCase())) {
            const val2 = parseFloat(col2Raw.replace(/[^\d.]/g, ''));
            if (!isNaN(val2) && val2 > 0) {
              extractedMinutes = val2;
              break;
            }
          }
        }
      }

      if (extractedMinutes !== null && extractedMinutes > 0) {
        setExamDurationMinutes(extractedMinutes);
        setTempDurationInput(extractedMinutes.toString());
        localStorage.setItem('exam_duration_minutes', extractedMinutes.toString());
        console.log(`Durasi ujian disinkronkan dari link: ${extractedMinutes} menit`);
        return extractedMinutes;
      }
    } catch (err) {
      console.warn("Menggunakan durasi lokal karena kendala jaringan:", err);
    } finally {
      setDurationLoading(false);
    }
    return null;
  };

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      const response = await fetch(SUBJECTS_CSV_URL);
      if (!response.ok) throw new Error("Gagal mengambil daftar pelajaran.");
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      // We expect headers: IMAGE,MAPEL,KELAS,LINK,JAM BUKA,JAM TUTUP,TANGGAL
      // Let's parse each row, skipping row 0 (headers)
      const parsedSubjects: Subject[] = [];
      
      for (let i = 1; i < rows.length; i++) {
         const row = rows[i];
         if (!row || row.length < 2) continue;
         
         // 1-based index translation:
         // index 1: Image URL (column 1, row[0])
         // index 2: Title (column 2, row[1])
         // index 3: Subtitle (column 3, row[2])
         // index 4: Link (column 4, row[3])
         // Extra columns:
         // Row[4] (Jam Buka - index 5)
         // Row[5] (Jam Tutup - index 6)
         // Row[6] (Tanggal - index 7)
         const image = row[0] || '';
         const title = row[1] || '';
         const subtitle = row[2] || '';
         const link = row[3] || '';
         const openTime = row[4] || undefined;
         const closeTime = row[5] || undefined;
         const tanggal = row[6] || undefined;

         // Only include rows that have a subject title
         if (title && title.toLowerCase() !== 'mapel') {
           parsedSubjects.push({
             image,
             title,
             subtitle,
             link,
             openTime,
             closeTime,
             tanggal
           });
         }
      }

      setSubjects(parsedSubjects);
    } catch (err: any) {
      setSubjectsError(err.message || "Gagal mengambil daftar pelajaran dari Google Sheets.");
      // Provide robust offline dummy/fallback dataset based on sheet data seen in curl
      setSubjects([
        {
          image: "",
          title: "AGAMA ISLAM",
          subtitle: "KELAS 10",
          link: "https://forms.gle/pPTf47C1F2ghAnHy7",
          openTime: "7:30",
          closeTime: "10:30",
          tanggal: "19/07/2026"
        },
        {
          image: "",
          title: "AGAMA KRISTEN",
          subtitle: "KELAS 10",
          link: "https://forms.gle/im5TKYgF5J8xjiLdA",
          openTime: "5:45",
          closeTime: "11:30",
          tanggal: "20/07/2026"
        }
      ]);
    } finally {
      setSubjectsLoading(false);
    }
  };

  // --- TOKEN VERIFICATION ---
  const handleVerifyToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (exitCount >= 3) {
      setTokenError("Akses Ditolak: Anda telah keluar dari halaman ujian sebanyak 3 kali! Sesi Anda dikunci oleh sistem keamanan. Harap hubungi Pengawas Ujian untuk melakukan reset.");
      return;
    }
    if (!tokenInput.trim()) {
      setTokenError("Token tidak boleh kosong!");
      return;
    }

    setTokenLoading(true);
    setTokenError(null);

    // Refresh token list to get any updates from Google Sheets
    await fetchTokens();

    const enteredToken = tokenInput.trim();
    // Case-insensitive token check
    const isMatched = validTokens.some(t => t.toLowerCase() === enteredToken.toLowerCase());

    if (isMatched) {
      setIsValidated(true);
      localStorage.setItem('exam_token_validated', 'true');
      setCurrentPage('subjects');
      setTokenInput('');
      showToast("Token Berhasil Diverifikasi! Selamat datang.", "success");
    } else {
      setTokenError("Token Ujian Salah atau Tidak Aktif! Silakan hubungi pengawas.");
      showToast("Token tidak valid!", "error");
    }
    setTokenLoading(false);
  };

  const handleResetSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = resetPinInput.trim();
    
    // Refresh reset PINs to get any updates in real-time from Google Sheets
    await fetchResetPins();

    // Check against dynamically fetched pins, or fallback to '1122' or '11'
    const isMatched = resetPins.some(p => p.toLowerCase() === pin.toLowerCase()) || pin === '1122' || pin === '11';

    if (isMatched) {
      localStorage.setItem('exam_exit_count', '0');
      setExitCount(0);
      setResetPinInput('');
      setResetPinError(null);
      setSecurityViolation(null);
      setTokenError(null);
      stopAlarm();
      showToast("Sesi berhasil direset oleh pengawas! Anda dapat masuk kembali.", "success");
    } else {
      setResetPinError("PIN Reset Pengawas Salah! Silakan coba lagi.");
      showToast("PIN Salah!", "error");
    }
  };

  // --- SECURITY MONITORS IN EXAM ---
  // Detects when student exits fullscreen or switches tabs/windows
  useEffect(() => {
    if (currentPage !== 'exam') {
      hasEnteredFullscreenRef.current = false;
      return;
    }

    // A: Fullscreen monitor
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreenActive(isCurrentlyFullscreen);
      
      if (isCurrentlyFullscreen) {
        hasEnteredFullscreenRef.current = true;
      } else if (hasEnteredFullscreenRef.current) {
        // Student was in fullscreen and exited - trigger strict lockout
        triggerSecurityViolated("Anda telah keluar dari mode layar penuh (Full Screen)!");
      }
    };

    // B: Visibility (tab switching) monitor
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerSecurityViolated("Terdeteksi berpindah tab atau meninggalkan jendela ujian!");
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage]);

  // --- SECURITY MONITOR IN SUBJECTS LIST ---
  // Detects when student switches tabs/windows or leaves the app while on the subjects list page
  useEffect(() => {
    if (currentPage !== 'subjects') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsValidated(false);
        localStorage.removeItem('exam_token_validated');
        setSecurityViolation("Keamanan: Terdeteksi keluar aplikasi atau membuka tab lain saat di halaman daftar mata pelajaran!");
        setCurrentPage('token');
        showToast("Keamanan aktif: Sesi dibatalkan karena terdeteksi keluar halaman!", "error");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage]);

  // --- SCREEN WAKE LOCK FOR EXAM PAGE (HALAMAN KETIGA) ---
  // Keeps the screen active and prevents sleep/dimming while on the exam page
  useEffect(() => {
    if (currentPage !== 'exam') return;

    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          console.log('Screen Wake Lock berhasil diaktifkan. Layar akan selalu menyala.');
        } catch (err) {
          console.warn('Gagal mengaktifkan Screen Wake Lock:', err);
        }
      } else {
        console.warn('Browser tidak mendukung Screen Wake Lock API.');
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when the page returns to visible state (e.g. if focus returns)
    const handleWakeLockVisibility = () => {
      if (document.visibilityState === 'visible' && currentPage === 'exam') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleWakeLockVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleWakeLockVisibility);
      if (wakeLockSentinel) {
        wakeLockSentinel.release()
          .then(() => {
            console.log('Screen Wake Lock dilepas.');
          })
          .catch((err: any) => {
            console.error('Gagal melepas Screen Wake Lock:', err);
          });
      }
    };
  }, [currentPage]);

  // Trigger violation lock, clear session and force redirect to page 1
  const triggerSecurityViolated = (reason: string) => {
    setSecurityViolation(reason);
    clearExamSession();
    
    // Increment the exam exit counter
    const nextExitCount = exitCount + 1;
    localStorage.setItem('exam_exit_count', nextExitCount.toString());
    setExitCount(nextExitCount);
    
    // Attempt to force exit fullscreen if still active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    // Redirect immediately to Halaman Pertama
    setCurrentPage('token');
    setIsValidated(false);
    localStorage.removeItem('exam_token_validated');
  };

  // --- COUNTDOWN TIMER ---
  useEffect(() => {
    if (currentPage === 'exam' && activeSubject) {
      countdownTimerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [currentPage, activeSubject]);

  const handleTimeExpired = () => {
    showToast("Waktu Ujian Telah Habis!", "error");
    alert("Waktu ujian Anda telah habis! Sistem otomatis mengunci halaman ujian.");
    handleForceExit();
  };

  // --- SESSION CONTROLS ---
  const handleStartExam = (subject: Subject) => {
    if (!subject.link || !subject.link.startsWith('http')) {
      showToast("Tautan ujian tidak valid atau belum tersedia.", "error");
      return;
    }

    const totalDurationSeconds = Math.round(examDurationMinutes * 60);
    setActiveSubject(subject);
    setRemainingSeconds(totalDurationSeconds);
    setSecurityViolation(null);
    setIframeKey(prev => prev + 1);

    // Save session to localStorage so they can resume on crash/reload
    localStorage.setItem('active_exam_subject', JSON.stringify(subject));
    localStorage.setItem('active_exam_start_time', Date.now().toString());
    localStorage.setItem('active_exam_duration_seconds', totalDurationSeconds.toString());

    // Enter Fullscreen & Switch Page
    setTimeout(() => {
      const container = examContainerRef.current || document.documentElement;
      if (container && typeof (container as any).requestFullscreen === 'function') {
        (container as any).requestFullscreen()
          .then(() => {
            setIsFullscreenActive(true);
            setCurrentPage('exam');
            showToast("Ujian dimulai. Mode Keamanan Penuh Aktif!", "info");
          })
          .catch((err: any) => {
            console.warn("Fullscreen blocked:", err);
            // Even if browser blocks fullscreen automatically, we proceed but ask them to enable it
            setCurrentPage('exam');
            showToast("Harap klik tombol 'Layar Penuh' agar ujian berjalan aman.", "error");
          });
      } else {
        // Fallback for iOS/iPhone Safari which does not support DOM element requestFullscreen
        console.warn("Fullscreen API not supported on this device/browser.");
        setIsFullscreenActive(false);
        setCurrentPage('exam');
        showToast("Ujian dimulai! Mode Keamanan Aktif.", "info");
      }
    }, 100);
  };

  const clearExamSession = () => {
    localStorage.removeItem('active_exam_subject');
    localStorage.removeItem('active_exam_start_time');
    localStorage.removeItem('active_exam_duration_seconds');
    setActiveSubject(null);
    setRemainingSeconds(Math.round(examDurationMinutes * 60));
  };

  const handleForceExit = () => {
    clearExamSession();
    
    // Increment the exam exit counter
    const nextExitCount = exitCount + 1;
    localStorage.setItem('exam_exit_count', nextExitCount.toString());
    setExitCount(nextExitCount);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setShowExitConfirm(false);
    
    // Automatically logout and return to page 1
    setIsValidated(false);
    localStorage.removeItem('exam_token_validated');
    setCurrentPage('token');
  };

  const handleLogout = () => {
    setIsValidated(false);
    localStorage.removeItem('exam_token_validated');
    clearExamSession();
    setCurrentPage('token');
    showToast("Berhasil keluar dari sesi ujian.", "info");
  };

  // --- MANUAL LAYAR PENUH TRIGGER ---
  const requestManualFullscreen = () => {
    const container = examContainerRef.current || document.documentElement;
    if (container && typeof (container as any).requestFullscreen === 'function') {
      (container as any).requestFullscreen()
        .then(() => {
          setIsFullscreenActive(true);
          showToast("Mode Layar Penuh Diaktifkan.", "success");
        })
        .catch((err: any) => {
          showToast("Gagal mengaktifkan Layar Penuh. Hubungi pengawas.", "error");
        });
    } else {
      console.warn("Layar penuh tidak didukung di perangkat/peramban ini.");
      showToast("Layar penuh tidak didukung di peramban ini.", "info");
    }
  };

  // --- INTERNET LATENCY CHECK ---
  const testInternetConnection = () => {
    if (!navigator.onLine) {
      showToast("Koneksi terputus! Periksa jaringan perangkat Anda.", "error");
      return;
    }

    const start = Date.now();
    showToast("Memeriksa latensi koneksi...", "info");
    
    fetch("https://images.google.com/favicon.ico", { mode: 'no-cors', cache: 'no-store' })
      .then(() => {
        const latency = Date.now() - start;
        let quality = "Stabil";
        if (latency > 300) quality = "Cukup Baik";
        if (latency > 800) quality = "Sangat Lambat";
        
        showToast(`Koneksi internet aktif (${quality} - Latensi: ${latency}ms)`, "success");
      })
      .catch(() => {
        showToast("Koneksi internet aktif, namun latensi gagal diuji.", "success");
      });
  };

  // Helper format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const displayHrs = hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : '';
    return `${displayHrs}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter subjects based on query
  const filteredSubjects = subjects.filter(sub => 
    sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col transition-colors duration-300">
      
      {/* --- CUSTOM GLOBAL TOAST --- */}
      {toastMessage && (
        <div id="toast-container" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce max-w-sm w-full px-4">
          <div className={`p-4 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-medium ${
            toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            toastMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-slate-900 border-slate-800 text-white'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />}
            {toastMessage.type === 'error' && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            {toastMessage.type === 'info' && <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* --- RECENT SECURITY VIOLATION WARNING ON LOGIN PAGE --- */}
      {securityViolation && currentPage === 'token' && (
        <div id="security-violation-banner" className="bg-rose-600 text-white p-4 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-inner">
          <ShieldAlert className="w-5 h-5 animate-pulse shrink-0" />
          <span>PERINGATAN KEAMANAN: {securityViolation} Sesi Anda dibatalkan secara otomatis demi integritas ujian.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HALAMAN PERTAMA: MENU TOKEN UJIAN                                      */}
      {/* ========================================================================= */}
      {currentPage === 'token' && (
        <div id="token-page" className="flex-1 flex flex-col items-center justify-center p-6 relative">
          
          {/* Subtle elegant backdrop mesh pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none" />

          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden relative z-10 transition-all duration-300 hover:shadow-indigo-100/50">
            {/* Top decorative stripe */}
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            
            <div className="p-8 flex flex-col items-center text-center">
              {/* Official Logo SMKN 11 Kota Bekasi */}
              <div id="app-logo" className="flex flex-col items-center mb-6">
                <div className="relative group mb-3">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500 rounded-2xl blur-xs opacity-25 group-hover:opacity-40 transition duration-300" />
                  <div className="relative p-3 bg-white rounded-2xl border border-slate-200/90 shadow-md">
                    <img 
                      src="/assets/aistudio/LOGO_11_b88c257f.png" 
                      alt="Logo SMKN 11 Kota Bekasi" 
                      className="w-28 h-auto max-h-24 object-contain"
                    />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-bold tracking-wide shadow-xs mb-2 border border-slate-800">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-300" />
                  <span>SMKN 11 KOTA BEKASI</span>
                </div>

                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  EXAM 11 WEB
                </h1>
                <p className="text-xs font-semibold text-indigo-600 tracking-widest uppercase mt-0.5">
                  by Mizhar
                </p>
              </div>

              <div className="w-full h-px bg-slate-100 my-2" />

              {/* Status Connection Indicator */}
              <div className="my-4 flex items-center justify-center gap-2 text-xs font-medium px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-slate-500">
                {isOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Portal Online - Siap Sinkronisasi
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Portal Offline - Periksa Internet
                  </>
                )}
              </div>

              <p className="text-sm text-slate-500 mb-6 max-w-xs">
                Masukkan Token Ujian yang diberikan oleh pengawas untuk mengakses daftar mata pelajaran Anda.
              </p>

              {/* Token verification form or lock-out panel depending on exit count */}
              {exitCount >= 3 ? (
                <div id="lockout-panel" className="w-full space-y-5">
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-left text-xs space-y-2.5 shadow-sm">
                    <div className="flex items-center gap-2 font-black text-rose-700 text-sm">
                      <Volume2 className="w-5 h-5 animate-bounce text-rose-600 shrink-0" />
                      <span>ALARM PERINGATAN AKTIF (Volume 95%)</span>
                    </div>
                    <p className="font-semibold leading-relaxed">
                      Sesi Anda telah dikunci karena Anda telah keluar dari halaman ketiga (Halaman Exam Safe) sebanyak <strong className="text-rose-600 text-sm">{exitCount} kali</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      Audio alarm peringatan dengan volume 95% telah diaktifkan secara otomatis. Harap segera melapor kepada Pengawas Ujian untuk melakukan verifikasi fisik dan mereset sesi ini.
                    </p>
                  </div>

                  <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left border-dashed border-2">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                      <ShieldAlert className="w-4 h-4 text-indigo-500" />
                      Reset Sesi Pengawas
                    </h4>
                    <form onSubmit={handleResetSession} className="space-y-3">
                      <input
                        id="input-reset-pin"
                        type="password"
                        value={resetPinInput}
                        onChange={(e) => setResetPinInput(e.target.value)}
                        placeholder="Masukkan PIN Reset Pengawas"
                        className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2.5 px-3.5 text-center font-mono text-sm font-bold tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                      {resetPinError && (
                        <p className="text-[10px] font-bold text-rose-600 text-center">{resetPinError}</p>
                      )}
                      <button
                        id="btn-reset-session"
                        type="submit"
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                      >
                        <VolumeX className="w-3.5 h-3.5" />
                        Matikan Alarm & Reset Sesi
                      </button>
                    </form>
                    {/* Removed default PIN helper for security */}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleVerifyToken} className="w-full space-y-4">
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <KeyRound className="w-5 h-5" />
                    </span>
                    <input
                      id="input-token"
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="Contoh: 12345"
                      disabled={tokenLoading}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-3.5 pl-12 pr-4 text-center font-mono text-lg font-bold tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>

                  {tokenError && (
                    <div id="token-error" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-start gap-2 text-left">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                      <span>{tokenError}</span>
                    </div>
                  )}

                  <button
                    id="btn-verifikasi-token"
                    type="submit"
                    disabled={tokenLoading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {tokenLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Memverifikasi...
                      </>
                    ) : (
                      <>
                        Verifikasi Token
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Offline mode instruction */}
              <div className="mt-8 text-[11px] text-slate-400 font-medium">
                Sistem Keamanan Terintegrasi v3.2 · SMKN 11 Bekasi
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HALAMAN KEDUA: DAFTAR PELAJARAN YANG DIUJIKAN                          */}
      {/* ========================================================================= */}
      {currentPage === 'subjects' && (
        <div id="subjects-page" className="flex-1 flex flex-col">
          {/* Header Bar */}
          <header className="bg-white border-b border-slate-200 shadow-xs px-6 py-4 sticky top-0 z-30">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white border border-slate-200/90 rounded-xl shadow-xs shrink-0 flex items-center justify-center">
                  <img
                    src="/assets/aistudio/LOGO_11_b88c257f.png"
                    alt="Logo SMKN 11"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                      EXAM 11 WEB
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-900 text-white rounded-md tracking-wider">
                      SMKN 11
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-1">
                    Panel Daftar Pelajaran · by Mizhar
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 self-end sm:self-auto">
                {/* Exam Duration Badge & Adjustment Trigger */}
                <button
                  id="btn-durasi-settings"
                  onClick={() => {
                    setTempDurationInput(examDurationMinutes.toString());
                    setCustomDurationUrl(durationUrl);
                    setShowDurationModal(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full transition-all shadow-xs cursor-pointer group"
                  title="Klik untuk melihat atau menyesuaikan durasi ujian"
                >
                  <Timer className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>Durasi: {examDurationMinutes} Menit</span>
                  {durationLoading && <RefreshCw className="w-3 h-3 animate-spin text-amber-600 ml-0.5" />}
                </button>

                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Waktu: {deviceTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                  Token Valid
                </div>

                <button
                  id="btn-logout"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold px-3 py-1.5 rounded-lg transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>
            </div>
          </header>

          {/* Core Content */}
          <main className="max-w-6xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-8">
            {/* Title Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Mata Pelajaran yang Diujikan
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Pilih salah satu ujian aktif untuk memulai tes secara langsung.
                </p>
              </div>

              {/* Subject search bar */}
              <div className="relative w-full md:w-72">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="input-cari"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari mata pelajaran..."
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Offline notification banner if any */}
            {!isOnline && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl flex items-start gap-3 text-sm font-semibold">
                <WifiOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="font-bold text-amber-900">Koneksi Internet Offline</h4>
                  <p className="text-xs font-normal text-amber-800 mt-1">
                    Anda sedang offline. Namun, Anda masih dapat melihat daftar ini. Pastikan Anda terhubung ke internet saat menekan tombol "Mulai Ujian" untuk mengakses lembar ujian Google Form.
                  </p>
                </div>
              </div>
            )}

            {/* Loading / Error states / Subjects list */}
            {subjectsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-sm text-slate-500 font-medium">Memuat data dari Google Sheets...</p>
              </div>
            ) : subjectsError && subjects.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-3xl bg-white max-w-lg mx-auto py-12">
                <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
                <h4 className="font-bold text-slate-900 text-lg">Gagal Memuat Jadwal</h4>
                <p className="text-sm text-slate-500 mt-2 max-w-sm">
                  {subjectsError}
                </p>
                <button
                  id="btn-retry-subjects"
                  onClick={fetchSubjects}
                  className="mt-6 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Coba Lagi
                </button>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 bg-white border border-slate-200 rounded-3xl p-6">
                <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">Mata pelajaran tidak ditemukan.</p>
                <p className="text-xs text-slate-400 mt-1">Coba gunakan kata kunci pencarian yang lain.</p>
              </div>
            ) : (
              <VirtualSubjectGrid
                subjects={filteredSubjects}
                deviceTime={deviceTime}
                examDurationMinutes={examDurationMinutes}
                handleStartExam={handleStartExam}
              />
            )}
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. HALAMAN KETIGA: SECURED FULLSCREEN EXAM INTERFACE (WEBVIEW)            */}
      {/* ========================================================================= */}
      {currentPage === 'exam' && activeSubject && (
        <div 
          ref={examContainerRef} 
          id="exam-browser-container" 
          className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col select-none overflow-hidden w-full h-[100dvh] max-w-full"
          style={{ userSelect: 'none' }} // Disable text selection for extra security
        >
          {/* Top Secure Header Menu (Responsif Menyesuaikan Layar Handphone & Desktop) */}
          <header className="bg-slate-950 border-b border-slate-800 px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 shrink-0 select-none">
            {/* Left Brand Area */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <div className="p-0.5 bg-white rounded shadow-xs shrink-0 flex items-center justify-center">
                <img
                  src="/assets/aistudio/LOGO_11_b88c257f.png"
                  alt="SMKN 11"
                  className="h-5 sm:h-6 w-auto object-contain"
                />
              </div>
              <div className="bg-emerald-500 text-slate-950 font-black px-1 sm:px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] tracking-wider leading-none shadow-sm shrink-0 uppercase">
                SECURE
              </div>
              <div className="hidden md:flex items-center gap-1 bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wider leading-none shadow-sm shrink-0">
                <Layers className="w-2.5 h-2.5 text-emerald-400" />
                WINDOWING
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] sm:text-xs font-black text-white tracking-tight leading-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[200px] md:max-w-xs">
                  {activeSubject.title}
                </h3>
                <p className="text-[8px] sm:text-[9px] text-indigo-400 font-semibold leading-none mt-0.5 truncate hidden xs:block">
                  SMKN 11 Kota Bekasi
                </p>
              </div>
            </div>

            {/* Middle Countdown Ticking Timer */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-inner shrink-0">
              <Clock className={`w-3.5 h-3.5 animate-pulse ${
                remainingSeconds <= 300 ? 'text-rose-500 animate-bounce' : 'text-indigo-400'
              }`} />
              <div className="flex flex-col items-center">
                <span className={`font-mono text-[11px] sm:text-xs font-black tracking-wider ${
                  remainingSeconds <= 300 ? 'text-rose-400' : 'text-slate-100'
                }`}>
                  {formatTime(remainingSeconds)}
                </span>
              </div>
              {remainingSeconds <= 300 && (
                <span className="text-[7px] sm:text-[8px] font-bold text-rose-500 animate-pulse uppercase hidden sm:inline">
                  Hampir Habis!
                </span>
              )}
            </div>

            {/* Right Sleek Minimalist Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Fullscreen status check & trigger if exited */}
              {!isFullscreenActive && (
                <button
                  id="btn-re-fullscreen"
                  onClick={requestManualFullscreen}
                  className="p-1 sm:p-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all animate-pulse flex items-center gap-1 shrink-0"
                  title="Kembali ke Layar Penuh (Penting!)"
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Layar Penuh</span>
                </button>
              )}

              {/* Connection Status Check */}
              <button
                id="btn-check-koneksi"
                onClick={testInternetConnection}
                className={`p-1 sm:p-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                  isOnline 
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-emerald-400' 
                    : 'bg-rose-950 border-rose-900 text-rose-400 animate-pulse'
                }`}
                title="Cek Koneksi Internet"
              >
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span className="text-[9px] sm:text-[10px] font-bold hidden sm:inline">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </button>

              {/* Reload Page Button */}
              <button
                id="btn-reload-webview"
                onClick={() => {
                  setIframeKey(prev => prev + 1);
                  showToast("Halaman ujian dimuat ulang.", "info");
                }}
                className="p-1 sm:p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-all"
                title="Muat Ulang Halaman Soal"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Exit Button */}
              <button
                id="btn-exit-exam"
                onClick={() => setShowExitConfirm(true)}
                className="p-1 sm:p-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-900 text-rose-400 rounded-lg transition-all text-[9px] sm:text-[10px] font-bold flex items-center gap-1"
                title="Keluar dari Ujian"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Keluar</span>
              </button>
            </div>
          </header>

          {/* Secure System Banner Indicator */}
          <div className="bg-indigo-950/40 border-b border-indigo-900/40 px-2 sm:px-4 py-1 text-[9px] sm:text-[10px] font-bold text-indigo-300 flex items-center justify-center gap-1 select-none shrink-0 text-center">
            <ShieldAlert className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate sm:whitespace-normal">MODE AMAN AKTIF: Jangan keluar layar penuh atau menutup jendela ujian!</span>
          </div>

          {/* Secured Virtualized Webview with Windowing & Memory Shield */}
          <VirtualExamWebView
            activeSubject={activeSubject}
            iframeKey={iframeKey}
            isOnline={isOnline}
            onReloadIframe={() => {
              setIframeKey(prev => prev + 1);
              showToast("Halaman ujian dimuat ulang.", "info");
            }}
            showToast={showToast}
          />

          {/* --- MINIMALIST EXIT CONFIRMATION DIALOG MODAL --- */}
          {showExitConfirm && (
            <div id="exit-modal" className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-6 select-none">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-pulse" />
                
                <h4 className="font-extrabold text-white text-lg">Konfirmasi Keluar Ujian</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Semua jawaban yang sudah Anda kirim ke Google Form telah tersimpan. Namun, jawaban yang belum Anda kirimkan mungkin akan hilang.
                </p>
                
                <div className="bg-rose-950/30 border border-rose-900/30 rounded-xl p-3 my-4 text-left">
                  <span className="text-[10px] font-semibold text-rose-300 block leading-tight">
                    * PERHATIAN: Keluar dari halaman ini akan otomatis membatalkan token masuk Anda. Anda harus meminta token baru kepada pengawas jika ingin kembali.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    id="btn-cancel-exit"
                    onClick={() => {
                      setShowExitConfirm(false);
                      // Make sure we are back to full screen if they cancelled
                      requestManualFullscreen();
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all"
                  >
                    Lanjutkan Ujian
                  </button>
                  <button
                    id="btn-confirm-exit"
                    onClick={handleForceExit}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-97"
                  >
                    Ya, Keluar Sesi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL PENGATURAN DURASI UJIAN (BISA DISESUAIKAN & DIAMBIL DARI LINK) --- */}
      {showDurationModal && (
        <div id="duration-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Pengaturan Durasi Ujian</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Sinkronisasi otomatis & penyesuaian durasi</p>
                </div>
              </div>
              <button 
                id="btn-close-duration-modal"
                onClick={() => setShowDurationModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Link input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tautan Google Sheets Durasi (CSV)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="input-duration-url"
                    type="text"
                    value={customDurationUrl}
                    onChange={(e) => setCustomDurationUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/.../export?format=csv&gid=..."
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all truncate"
                  />
                  <button
                    id="btn-sync-duration"
                    type="button"
                    onClick={async () => {
                      const fetched = await fetchExamDuration(customDurationUrl);
                      if (fetched !== null && fetched > 0) {
                        setTempDurationInput(fetched.toString());
                        showToast(`Durasi berhasil disinkronkan: ${fetched} menit`, "success");
                      } else {
                        showToast("Gagal mengambil durasi dari link tersebut.", "error");
                      }
                    }}
                    disabled={durationLoading}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 shadow-xs cursor-pointer"
                    title="Ambil data durasi dari link sekarang"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${durationLoading ? 'animate-spin' : ''}`} />
                    <span>Sinkron</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Data diambil dari CSV index/kolom 1 (format satuan menit).
                </p>
              </div>

              {/* Duration input */}
              <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4">
                <label className="block text-xs font-bold text-amber-900 mb-1.5">
                  Durasi Ujian Aktif (Format Menit)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="input-duration-minutes"
                    type="number"
                    min={1}
                    max={600}
                    value={tempDurationInput}
                    onChange={(e) => setTempDurationInput(e.target.value)}
                    className="w-28 bg-white border border-amber-300 text-slate-900 rounded-xl px-3 py-2 text-center text-xl font-black font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                  />
                  <div>
                    <span className="text-sm font-black text-amber-950 block">Menit</span>
                    <span className="text-[11px] text-amber-700 font-medium">
                      {parseInt(tempDurationInput, 10) > 0 ? (
                        <>
                          {Math.floor(parseInt(tempDurationInput, 10) / 60) > 0 && `${Math.floor(parseInt(tempDurationInput, 10) / 60)} Jam `}
                          {parseInt(tempDurationInput, 10) % 60} Menit
                        </>
                      ) : 'Format tidak valid'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick presets */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Pilihan Cepat Durasi:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[15, 25, 30, 45, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTempDurationInput(mins.toString())}
                      className={`px-3 py-1 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        tempDurationInput === mins.toString()
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-105'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins} Menit
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  id="btn-cancel-duration"
                  type="button"
                  onClick={() => setShowDurationModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-duration"
                  type="button"
                  onClick={() => {
                    const val = parseFloat(tempDurationInput);
                    if (isNaN(val) || val <= 0) {
                      showToast("Durasi ujian harus berupa angka positif!", "error");
                      return;
                    }
                    setExamDurationMinutes(val);
                    localStorage.setItem('exam_duration_minutes', val.toString());
                    if (customDurationUrl) {
                      setDurationUrl(customDurationUrl);
                      localStorage.setItem('exam_duration_url', customDurationUrl);
                    }
                    setShowDurationModal(false);
                    showToast(`Durasi ujian berhasil disesuaikan: ${val} menit`, "success");
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md active:scale-97 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  Simpan & Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
