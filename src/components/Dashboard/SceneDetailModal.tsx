import { useState } from 'react';
import { Scene, Category, Status } from '../../types';
import { X, ExternalLink, Edit, Trash2, CheckCircle, XCircle, Loader2, Save, Play, Youtube, Lock, Clock, Calendar } from 'lucide-react';

interface SceneDetailModalProps {
  scene: Scene;
  onClose: () => void;
  onEdit: (scene: Scene) => void;
  onDelete: (id: string) => void;
  onCheckStatus?: (sceneId: string) => Promise<void>;
  onUpdate?: (scene: Scene, data: Partial<Scene>) => Promise<void>;
}

const categories: Category[] = ['F/M', 'F/F', 'M/F', 'M/M'];
const statuses: Status[] = ['available', 'private', 'unavailable'];

export function SceneDetailModal({
  scene,
  onClose,
  onDelete,
  onCheckStatus,
  onUpdate,
}: SceneDetailModalProps) {
  const normalizedStatus: Status = scene.status === 'available' ? 'available' : (scene.status === 'private' ? 'private' : 'unavailable');
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    category: scene.category,
    timestamp: scene.timestamp || '',
    notes: scene.notes || '',
    status: normalizedStatus,
  });

  const statusIcons = {
    available: <CheckCircle className="w-5 h-5 text-green-500" />,
    unavailable: <XCircle className="w-5 h-5 text-red-500" />,
    private: <Lock className="w-5 h-5 text-amber-400" />,
  };

  const statusColors = {
    available: 'bg-green-500/10 text-green-400 border border-green-500/20',
    unavailable: 'bg-red-500/10 text-red-400 border border-red-500/20',
    private: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  };

  const handleCheckStatus = async () => {
    if (!onCheckStatus || scene.platform !== 'YouTube') return;
    setIsChecking(true);
    try {
      await onCheckStatus(scene.id);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(scene, {
        category: editData.category,
        timestamp: editData.timestamp,
        notes: editData.notes,
        status: editData.status,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleThumbnailClick = () => {
    if (scene.url) {
      window.open(scene.url, '_blank');
    }
  };

  const formattedDate = scene.created_at
    ? new Date(scene.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  const publishedAt = scene.upload_date ? new Date(scene.upload_date) : null;
  const publishedLabel = publishedAt
    ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(publishedAt)
    : null;
  const uploadYear = publishedAt ? publishedAt.getFullYear() : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#27272a]/80 backdrop-blur border-b border-zinc-700 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-zinc-100 pr-4 line-clamp-2">{scene.title}</h2>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                {scene.platform === 'YouTube' && (
                  <span className="inline-flex items-center gap-1 font-semibold text-red-500">
                    <Youtube className="w-4 h-4" />
                    <span>YouTube</span>
                  </span>
                )}

                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-white/10 text-zinc-100 border border-white/10">
                  {scene.category}
                </span>

                {uploadYear && <span className="text-zinc-400">{uploadYear}</span>}

                {scene.channel_name && (
                  <span className="inline-flex items-center gap-2 text-zinc-400">
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-100 font-medium">{scene.channel_name}</span>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-700 rounded transition flex-shrink-0"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div
                className="relative w-full aspect-video bg-zinc-800 rounded-lg overflow-hidden cursor-pointer group"
                onClick={handleThumbnailClick}
              >
                {scene.thumbnail ? (
                  <img
                    src={scene.thumbnail}
                    alt={scene.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-hover:brightness-110"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800" />
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="bg-red-600 rounded-full p-4 shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
              </div>

              {scene.platform === 'YouTube' && scene.url && (
                <a
                  href={scene.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition transform active:scale-95"
                >
                  <Youtube className="w-5 h-5" />
                  <span>Watch on YouTube</span>
                </a>
              )}
            </div>

            <div className="space-y-4">
              {scene.timestamp && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-zinc-800/40 border border-zinc-700">
                  <Clock className="w-5 h-5 text-zinc-400" />
                  <div>
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Timestamp</div>
                    <div className="text-xl font-semibold text-zinc-100">{scene.timestamp}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">Status</div>
                  <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${statusColors[normalizedStatus]}`}>
                    {isChecking ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      statusIcons[normalizedStatus]
                    )}
                    <span className="font-medium capitalize">{normalizedStatus}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1">Published</div>
                  <div className="flex items-center gap-2 text-zinc-100 font-semibold">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>{publishedLabel ? `Published on ${publishedLabel}` : 'Published date unknown'}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">Added {formattedDate}</div>
                </div>
              </div>
            </div>
          </div>

          {scene.notes && !isEditing && (
            <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Personal Notes</p>
              <p className="text-white whitespace-pre-wrap">{scene.notes}</p>
            </div>
          )}

          {isEditing && (
            <div className="space-y-4 bg-zinc-800/30 rounded-lg p-4 border border-zinc-700">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <select
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value as Category })}
                  className="input"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Timestamp</label>
                <input
                  type="text"
                  value={editData.timestamp}
                  onChange={(e) => setEditData({ ...editData, timestamp: e.target.value })}
                  className="input"
                  placeholder="e.g., 5:30 or 5:30-6:45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as Status })}
                  className="input"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Personal Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  className="input resize-none"
                  placeholder="Add any notes about this scene..."
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4 border-t border-zinc-700">
            <div className="flex gap-2 flex-wrap">
              {scene.platform !== 'YouTube' && scene.url && (
                <a
                  href={scene.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Link</span>
                </a>
              )}

              {scene.platform === 'YouTube' && scene.video_id && onCheckStatus && (
                <button
                  onClick={handleCheckStatus}
                  disabled={isChecking}
                  className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Check Status</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 btn-secondary flex items-center justify-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    onDelete(scene.id);
                    onClose();
                  }}
                  className="flex-1 btn-danger flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      category: scene.category,
                      timestamp: scene.timestamp || '',
                      notes: scene.notes || '',
                      status: normalizedStatus,
                    });
                  }}
                  className="flex-1 btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 btn-primary flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
