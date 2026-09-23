/**
 * Avatar — shows visitor/user photo if available, falls back to coloured initials.
 *
 * Handles both Cloudinary absolute URLs and local server-relative paths (/uploads/...).
 */
import { useState } from 'react';
import { SERVER_BASE } from '../services/api';

const COLORS = [
  '#1b22a6','#3b56f5','#0284c7','#16a34a','#7c3aed','#dc2626','#d97706','#0891b2',
];

function getColor(name) {
  const code = (name || 'U').charCodeAt(0);
  return COLORS[code % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const SIZE_MAP = {
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
  '2xl': 'avatar-2xl',
};

/**
 * Resolve a photo URL:
 * - If it starts with http(s):// — absolute URL (Cloudinary), use as-is.
 * - If it starts with /uploads/ — prepend the server base URL.
 * - If it's a data: URI (legacy base64) — use as-is.
 * - Otherwise — return null (fall back to initials).
 */
function resolvePhotoUrl(src) {
  if (!src) return null;
  if (src.startsWith('data:'))   return src;                     // legacy base64
  if (src.startsWith('http'))    return src;                     // Cloudinary / absolute
  if (src.startsWith('/'))       return `${SERVER_BASE}${src}`;  // local path
  return src;
}

export default function Avatar({ name, src, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_MAP[size] || 'avatar-md';
  const bg        = getColor(name);
  const photoUrl  = resolvePhotoUrl(src);

  if (photoUrl && !imgError) {
    return (
      <div className={`avatar ${sizeClass} ${className} flex-shrink-0`}>
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`avatar ${sizeClass} ${className} flex-shrink-0`}
      style={{ background: bg }}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
