import { useEffect, useRef, useState } from 'react';
import { Scene } from '../../types';
import { MoreVertical, CheckCircle, XCircle, Loader2, Check, ExternalLink, Pencil, Trash2, Lock } from 'lucide-react';

interface SceneCardProps {
  scene: Scene;
  onEdit: (scene: Scene) => void;
  onDelete: (id: string) => void;
  onCheckStatus?: (sceneId: string) => Promise<void>;
  onViewDetails?: (scene: Scene) => void;
  isSelected?: boolean;
  onSelect?: (id: string, shiftKey: boolean) => void;
}

export function SceneCard({ scene, onEdit, onDelete, onCheckStatus, onViewDetails, isSelected, onSelect }: SceneCardProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHoveringThumb, setIsHoveringThumb] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const normalizedStatus = scene.status === 'available' ? 'available' : (scene.status === 'private' ? 'private' : 'unavailable');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const statusIcons = {
    available: <CheckCircle className="w-4 h-4 text-green-500" />,
    unavailable: <XCircle className="w-4 h-4 text-red-500" />,
    private: <Lock className="w-4 h-4 text-amber-400" />,
  };

  const handleCheckStatus = async () => {
    if (!onCheckStatus) return;
    setIsChecking(true);
    try {
      await onCheckStatus(scene.id);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked; fallback to static image
        setShowVideo(false);
      });
    }
  }, [showVideo]);

  const handleThumbMouseEnter = () => {
    setIsHoveringThumb(true);
    hoverTimeoutRef.current = setTimeout(() => {
      if (scene.url && scene.url.includes('youtube.com')) {
        setVideoLoading(true);
        setShowVideo(true);
        setVideoLoading(false);
      }
    }, 500);
  };

  const handleThumbMouseLeave = () => {
    setIsHoveringThumb(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowVideo(false);
    setVideoLoading(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect && e.currentTarget === e.target) {
      e.stopPropagation();
      onSelect(scene.id, e.shiftKey);
    } else if (!onSelect) {
      onViewDetails?.(scene);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(scene.id, e.shiftKey);
  };

  const getDurationLabel = () => {
    const raw = (scene.timestamp || '').trim();
    if (!raw) return '';
    const match = raw.match(/(\d{1,2}:\d{2})(?!.*\d{1,2}:\d{2})/);
    return match ? match[1] : '';
  };

  const durationLabel = getDurationLabel();

  const tagBadges = Array.isArray(scene.tags) ? scene.tags.slice(0, 4) : [];
  const overflowCount = Array.isArray(scene.tags) && scene.tags.length > 4 ? scene.tags.length - 4 : 0;

  const handleViewOnPlatform = () => {
    if (!scene.url) return;
    window.open(scene.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`relative overflow-hidden cursor-pointer group rounded-[12px] bg-[var(--bg-secondary)] transition-transform duration-200 ${
        isSelected ? 'outline outline-2 outline-[var(--accent-red)] outline-offset-2' : ''
      } hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)]`}
      onClick={handleCardClick}
    >
      {onSelect && (
        <div className="absolute top-3 left-3 z-20">
          <button
            onClick={handleCheckboxClick}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
              isSelected
                ? 'bg-[var(--accent-red)] border-[var(--accent-red)]'
                : 'border-[var(--text-tertiary)] hover:border-[var(--accent-red)]'
            }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
        </div>
      )}

      <div className="relative">
        <div
          className="relative w-full aspect-video overflow-hidden rounded-t-[12px] bg-[var(--bg-tertiary)]"
          onMouseEnter={handleThumbMouseEnter}
          onMouseLeave={handleThumbMouseLeave}
        >
          {showVideo && scene.url && scene.url.includes('youtube.com') ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              loop
              src={scene.url.replace('watch?v=', 'embed/')}
              onLoadStart={() => setVideoLoading(false)}
            />
          ) : (
            <>
              {scene.thumbnail ? (
                <img
                  src={scene.thumbnail}
                  alt={scene.title}
                  className="w-full h-full object-cover transition-opacity duration-300"
                  loading="lazy"
                  style={{ opacity: videoLoading ? 0.5 : 1 }}
                />
              ) : (
                <div className="w-full h-full bg-[var(--bg-tertiary)]" />
              )}
              {isHoveringThumb && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="text-white text-xs font-medium">Preview</div>
                </div>
              )}
            </>
          )}

          {durationLabel && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs font-semibold">
              {durationLabel}
            </div>
          )}

          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Open actions"
                className="p-2 rounded-full bg-black/80 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-[12px] overflow-hidden bg-[var(--bg-secondary)] shadow-[0_18px_40px_rgba(0,0,0,0.55)] border border-[var(--bg-tertiary)]">
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      handleViewOnPlatform();
                    }}
                    disabled={!scene.url}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View on Platform</span>
                  </button>

                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit(scene);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Details</span>
                  </button>

                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)] flex items-center gap-2 disabled:opacity-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      handleCheckStatus();
                    }}
                    disabled={!onCheckStatus || isChecking || scene.platform !== 'YouTube' || !scene.video_id}
                  >
                    {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : statusIcons[normalizedStatus]}
                    <span>Check Status</span>
                  </button>

                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-[var(--accent-red)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete(scene.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <h3
          className="text-[16px] font-bold text-white leading-snug mt-3 mb-2 line-clamp-2"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {scene.title}
        </h3>

        <div className="mb-2">
          <span className="inline-block text-xs px-3 py-1 rounded-full" style={{ background: 'var(--accent-red-subtle)', color: 'var(--accent-red)' }}>
            {scene.category}
          </span>
        </div>

        {tagBadges.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {tagBadges.map((t) => (
              <span
                key={t.id}
                className="inline-block text-[11px] px-2 py-1 rounded-full border"
                style={{
                  background: `${(t.color || '#64748b')}22`,
                  borderColor: `${(t.color || '#64748b')}44`,
                  color: t.color || '#cbd5e1',
                }}
              >
                {t.name}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="inline-block text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                +{overflowCount}
              </span>
            )}
          </div>
        )}

        <div className="text-[13px] text-[var(--text-secondary)]">
          <span>{scene.platform}</span>
          <span className="mx-2">•</span>
          <span
            style={{
              color:
                normalizedStatus === 'available'
                  ? 'var(--status-available)'
                  : (normalizedStatus === 'private' ? '#fbbf24' : 'var(--status-unavailable)'),
            }}
          >
            {normalizedStatus}
          </span>
        </div>

        {scene.timestamp && (
          <div className="text-[13px] text-[var(--text-secondary)] mt-1">{scene.timestamp}</div>
        )}
      </div>
    </div>
  );
}
