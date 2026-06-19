import axios from 'axios';

// NestJS errors look like { statusCode, message, error } where message is a
// string or an array of validation strings. Pull out something user-facing.
export function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Không kết nối được máy chủ. Kiểm tra mạng và địa chỉ API.';
    }
    const message = err.response.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
  }
  return fallback;
}
