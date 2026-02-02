import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Not Found</h1>
        <div className="text-sm text-[var(--text-secondary)]">The page you are looking for doesn’t exist.</div>
      </div>

      <div className="card p-6">
        <Link to="/all-scenes" className="btn-primary inline-flex items-center justify-center">
          Go to All Scenes
        </Link>
      </div>
    </div>
  );
}
