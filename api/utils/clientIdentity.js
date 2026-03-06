const MAX_CLIENT_ID_LENGTH = 128;

function sanitizeClientId(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, MAX_CLIENT_ID_LENGTH)
    .replace(/[^a-zA-Z0-9._:-]/g, '');
}

export function getRequestClientId(req) {
  const headerValue = req?.headers?.['x-tracktabs-client-id'];
  const rawClientId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  return sanitizeClientId(rawClientId);
}
