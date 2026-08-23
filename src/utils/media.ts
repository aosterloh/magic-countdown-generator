export function getMediaUrl(uri: string | null | undefined): string {
  if (!uri) return '';
  if (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('data:')) {
    return uri;
  }
  // When running on Vite dev server (port 5173), direct media requests to backend port 3001
  const isViteDev = window.location.port === '5173';
  const baseUrl = isViteDev ? 'http://localhost:3001' : '';
  const cleanUri = uri.startsWith('/') ? uri : `/${uri}`;
  return `${baseUrl}${cleanUri}`;
}
