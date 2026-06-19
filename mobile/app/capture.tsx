import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategories } from '../src/api/categories';
import { createEntry } from '../src/api/entries';
import { presignUpload, putImageToS3 } from '../src/api/uploads';
import { useLocation } from '../src/hooks/useLocation';
import { compressForUpload } from '../src/lib/image';
import { extractApiError } from '../src/lib/errors';
import { getLastCategoryId, setLastCategoryId } from '../src/lib/lastCategory';

export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  const [price, setPrice] = useState('');
  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useCategories();
  // GPS fires here, right after capture, so coords are ready by the time price is typed.
  const loc = useLocation(true);

  // Pre-select the last-used category once the list loads.
  useEffect(() => {
    if (!categories?.length || categoryId) return;
    getLastCategoryId().then((last) => {
      if (last && categories.some((c) => c.id === last)) setCategoryId(last);
    });
  }, [categories, categoryId]);

  // Prefill store name from reverse geocoding (user can edit).
  useEffect(() => {
    if (loc.location?.storeName && !storeName) {
      setStoreName(loc.location.storeName);
    }
  }, [loc.location]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async () => {
      const value = Number(price.replace(/[^0-9.]/g, ''));
      if (!value || value <= 0) throw new Error('Nhập giá hợp lệ.');
      if (!photoUri) throw new Error('Thiếu ảnh.');

      // 1. compress → 2. presign → 3. PUT to S3 → 4. create entry
      const compressed = await compressForUpload(photoUri);
      const { uploadUrl, photoKey } = await presignUpload('image/jpeg', 'jpg');
      await putImageToS3(uploadUrl, compressed, 'image/jpeg');

      return createEntry({
        price: value,
        productName: productName.trim() || undefined,
        categoryId: categoryId ?? undefined,
        photoKey,
        latitude: loc.location?.latitude,
        longitude: loc.location?.longitude,
        address: loc.location?.address,
        storeName: storeName.trim() || undefined,
        purchasedAt: new Date().toISOString(),
      });
    },
    onSuccess: async () => {
      if (categoryId) await setLastCategoryId(categoryId);
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      router.back();
    },
    onError: (e) => setError(extractApiError(e, 'Lưu thất bại')),
  });

  const onSave = () => {
    setError(null);
    save.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {photoUri && (
          <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
        )}

        <View style={styles.body}>
          {/* PRICE — fastest path: auto-focused numeric input. */}
          <Text style={styles.label}>Giá</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.priceInput}
              placeholder="0"
              placeholderTextColor="#bbb"
              keyboardType="number-pad"
              autoFocus
              value={price}
              onChangeText={setPrice}
            />
            <Text style={styles.currency}>₫</Text>
          </View>

          <Text style={styles.label}>Tên sản phẩm (tùy chọn)</Text>
          <TextInput
            style={styles.input}
            placeholder="vd. Rau muống"
            placeholderTextColor="#bbb"
            value={productName}
            onChangeText={setProductName}
          />

          <Text style={styles.label}>Danh mục</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {categories?.map((c) => {
              const selected = c.id === categoryId;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCategoryId(selected ? null : c.id)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {c.icon ? `${c.icon} ` : ''}
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Vị trí</Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={18} color="#555" />
            {loc.loading ? (
              <Text style={styles.locText}>Đang lấy vị trí…</Text>
            ) : loc.denied ? (
              <Text style={styles.locText}>Không có quyền vị trí</Text>
            ) : (
              <TextInput
                style={styles.locInput}
                placeholder={loc.location?.address ?? 'Tên cửa hàng'}
                placeholderTextColor="#bbb"
                value={storeName}
                onChangeText={setStoreName}
              />
            )}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.cancel}
          onPress={() => router.back()}
          disabled={save.isPending}
        >
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.save, save.isPending && styles.saveBusy]}
          onPress={onSave}
          disabled={save.isPending}
        >
          {save.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  photo: { width: '100%', height: 240, backgroundColor: '#eee' },
  body: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 16, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '700',
    paddingVertical: 4,
    color: '#111',
  },
  currency: { fontSize: 28, color: '#888', marginLeft: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  chipSelected: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#333', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  locText: { color: '#888' },
  locInput: { flex: 1, fontSize: 16 },
  error: { color: '#d00', marginTop: 16 },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancel: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#333', fontWeight: '600', fontSize: 16 },
  save: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBusy: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
