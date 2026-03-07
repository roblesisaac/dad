function normalizePath(path = []) {
  return (Array.isArray(path) ? path : [])
    .map((segment) => String(segment || '').trim())
    .filter(Boolean);
}

function encodeBase64Unicode(value) {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(value)));
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64');
  }

  return '';
}

function decodeBase64Unicode(value) {
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(value)));
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf-8');
  }

  return '';
}

export function encodeDrillPath(path = []) {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath.length) {
    return '';
  }

  try {
    return encodeBase64Unicode(JSON.stringify(normalizedPath));
  } catch (error) {
    return '';
  }
}

export function decodeDrillPath(value) {
  if (!value) {
    return [];
  }

  try {
    const decoded = decodeBase64Unicode(String(value));
    if (!decoded) {
      return [];
    }

    const parsed = JSON.parse(decoded);
    return normalizePath(parsed);
  } catch (error) {
    return [];
  }
}

export function sameDrillPath(pathA = [], pathB = []) {
  const normalizedA = normalizePath(pathA);
  const normalizedB = normalizePath(pathB);

  if (normalizedA.length !== normalizedB.length) {
    return false;
  }

  return normalizedA.every((segment, index) => segment === normalizedB[index]);
}
