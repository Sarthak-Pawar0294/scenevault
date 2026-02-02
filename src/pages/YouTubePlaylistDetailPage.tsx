import { Link, useParams } from 'react-router-dom';

export function YouTubePlaylistDetailPage() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/platforms/youtube"
            className="text-sm text-[var(--text-secondary)] hover:text-white transition"
          >
            Back to YouTube
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">Playlist</h1>
          <div className="text-sm text-[var(--text-secondary)] truncate">{id}</div>
        </div>
      </div>

      <div className="card p-6">
        <div className="text-white font-semibold">Next step</div>
        <div className="text-sm text-[var(--text-secondary)] mt-2">
          This page will be implemented with playlist header, filters, and videos grid in the next batch.
        </div>
      </div>
    </div>
  );
}
