import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Resize + JPEG-compress before upload — keeps the stored (R2) object small and the
// capture path fast (DESIGN §7). Returns a new local file uri.
export async function compressForUpload(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: 1080 }).renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
  });
  return saved.uri;
}
