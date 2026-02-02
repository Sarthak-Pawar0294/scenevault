import { Scene } from '../types';

export function downloadJSON(scenes: Scene[], filename: string) {
  const dataStr = JSON.stringify(scenes, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', filename);
  linkElement.click();
}

export function downloadCSV(scenes: Scene[], filename: string) {
  const headers = [
    'Title',
    'Platform',
    'Category',
    'Status',
    'URL',
    'Channel',
    'Date',
    'Timestamp',
    'Notes',
    'Thumbnail',
    'Video ID',
  ];

  const rows = scenes.map((scene) => [
    `"${(scene.title || '').replace(/"/g, '""')}"`,
    scene.platform || '',
    scene.category || '',
    (() => {
      const s = scene.status === 'available' ? 'available' : (scene.status === 'private' ? 'private' : 'unavailable');
      return s;
    })(),
    scene.url || '',
    scene.channel_name || '',
    scene.upload_date || scene.created_at || '',
    scene.timestamp || '',
    `"${(scene.notes || '').replace(/"/g, '""')}"`,
    scene.thumbnail || '',
    scene.video_id || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', filename);
  linkElement.click();
}

export function downloadHTML(scenes: Scene[], filename: string) {
  const title = 'SceneVault Export';
  const timestamp = new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      color: #fff;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    .header p {
      color: #9ca3af;
      font-size: 0.95rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #3b82f6;
    }
    .stat-label {
      color: #9ca3af;
      font-size: 0.85rem;
      margin-top: 5px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .card:hover {
      border-color: rgba(59, 130, 246, 0.5);
      background: rgba(59, 130, 246, 0.05);
    }
    .card-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      background: #1f2937;
    }
    .card-content {
      padding: 16px;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .badge-platform {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }
    .badge-category {
      background: rgba(168, 85, 247, 0.2);
      color: #d8b4fe;
    }
    .status-available {
      color: #10b981;
    }
    .status-private {
      color: #f59e0b;
    }
    .status-unavailable {
      color: #ef4444;
    }
    .card-notes {
      font-size: 0.85rem;
      color: #d1d5db;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .card-details {
      font-size: 0.8rem;
      color: #9ca3af;
      line-height: 1.5;
    }
    .footer {
      text-align: center;
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #6b7280;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SceneVault Export</h1>
      <p>Exported on ${timestamp}</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${scenes.length}</div>
        <div class="stat-label">Total Scenes</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${new Set(scenes.map((s) => s.category)).size}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${new Set(scenes.map((s) => s.platform)).size}</div>
        <div class="stat-label">Platforms</div>
      </div>
    </div>

    <div class="grid">
      ${scenes
        .map(
          (scene) => {
            const status = scene.status === 'available' ? 'available' : (scene.status === 'private' ? 'private' : 'unavailable');
            const dateIso = scene.upload_date || scene.created_at || '';
            const dateLabel = dateIso ? new Date(dateIso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            return `
        <div class="card">
          ${scene.thumbnail ? `<img src="${scene.thumbnail}" alt="${scene.title}" class="card-image">` : '<div class="card-image"></div>'}
          <div class="card-content">
            <div class="card-title">${scene.title || 'Untitled'}</div>
            <div class="card-meta">
              ${scene.platform ? `<span class="badge badge-platform">${scene.platform}</span>` : ''}
              ${scene.category ? `<span class="badge badge-category">${scene.category}</span>` : ''}
              <span class="badge" style="color: var(--status-color)">
                <span class="status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </span>
            </div>
            ${scene.notes ? `<div class="card-notes">${scene.notes}</div>` : ''}
            <div class="card-details">
              ${scene.channel_name ? `<div>Channel: ${scene.channel_name}</div>` : ''}
              ${dateLabel ? `<div>Date: ${dateLabel}</div>` : ''}
              ${scene.timestamp ? `<div>Timestamp: ${scene.timestamp}</div>` : ''}
              ${scene.url ? `<div><a href="${scene.url}" target="_blank" style="color: #3b82f6; text-decoration: none;">View on ${scene.platform || 'web'}</a></div>` : ''}
            </div>
          </div>
        </div>
      `
          }
        )
        .join('')}
    </div>

    <div class="footer">
      <p>SceneVault | Your personal scene collection manager</p>
    </div>
  </div>
</body>
</html>`;

  const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', filename);
  linkElement.click();
}

export function generateFilename(format: 'json' | 'csv' | 'html'): string {
  const date = new Date().toISOString().split('T')[0];
  const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'html';
  return `SceneVault_Backup_${date}.${ext}`;
}

export function parseJSONExport(content: string): Scene[] {
  try {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    throw new Error('Invalid JSON format');
  }
}
