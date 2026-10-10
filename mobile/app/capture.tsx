import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useCategories } from '@/src/api/categories';
import { createEntry } from '@/src/api/entries';
import { presignUpload, putImageToStorage } from '@/src/api/uploads';
import { useLocation } from '@/src/hooks/useLocation';
import { extractApiError } from '@/src/lib/errors';
import { compressForUpload } from '@/src/lib/image';
import { getLastCategoryId, setLastCategoryId } from '@/src/lib/lastCategory';

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

      // 1. compress → 2. presign → 3. PUT to storage → 4. create entry
      const compressed = await compressForUpload(photoUri);
      const { uploadUrl, photoKey } = await presignUpload('image/jpeg', 'jpg');
      await putImageToStorage(uploadUrl, compressed, 'image/jpeg');

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

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {photoUri && (
          <Image
            source={{ uri: photoUri }}
            style={{ width: '100%', height: 240 }}
            contentFit="cover"
          />
        )}

        <View className="gap-5 p-5">
          {/* PRICE — fastest path: auto-focused numeric input. */}
          <View className="gap-1.5">
            <Label nativeID="price">Giá</Label>
            <View className="flex-row items-center">
              <TextInput
                className="text-foreground flex-1 py-1 text-4xl font-bold"
                placeholder="0"
                placeholderTextColor="#bbb"
                keyboardType="number-pad"
                autoFocus
                value={price}
                onChangeText={setPrice}
              />
              <Text className="text-muted-foreground ml-2 text-3xl">₫</Text>
            </View>
          </View>

          <View className="gap-1.5">
            <Label nativeID="name">Tên sản phẩm (tùy chọn)</Label>
            <Input
              aria-labelledby="name"
              placeholder="vd. Rau muống"
              value={productName}
              onChangeText={setProductName}
            />
          </View>

          <View className="gap-1.5">
            <Label>Danh mục</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              {categories?.map((c) => {
                const selected = c.id === categoryId;
                return (
                  <Button
                    key={c.id}
                    size="sm"
                    variant={selected ? 'default' : 'outline'}
                    onPress={() => setCategoryId(selected ? null : c.id)}
                  >
                    <Text>
                      {c.icon ? `${c.icon} ` : ''}
                      {c.name}
                    </Text>
                  </Button>
                );
              })}
            </ScrollView>
          </View>

          <View className="gap-1.5">
            <Label>Vị trí</Label>
            <View className="border-input flex-row items-center gap-2 rounded-md border px-3 py-2.5">
              <Ionicons name="location-outline" size={18} color="#888" />
              {loc.loading ? (
                <Text className="text-muted-foreground">Đang lấy vị trí…</Text>
              ) : loc.denied ? (
                <Text className="text-muted-foreground">Không có quyền vị trí</Text>
              ) : (
                <TextInput
                  className="text-foreground flex-1 text-base"
                  placeholder={loc.location?.address ?? 'Tên cửa hàng'}
                  placeholderTextColor="#bbb"
                  value={storeName}
                  onChangeText={setStoreName}
                />
              )}
            </View>
          </View>

          {error && <Text className="text-destructive text-sm">{error}</Text>}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View
        className="border-border flex-row gap-3 border-t px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button variant="secondary" onPress={() => router.back()} disabled={save.isPending}>
          <Text>Hủy</Text>
        </Button>
        <Pressable
          className={`bg-primary h-10 flex-1 items-center justify-center rounded-md ${
            save.isPending ? 'opacity-60' : ''
          }`}
          onPress={() => {
            setError(null);
            save.mutate();
          }}
          disabled={save.isPending}
        >
          {save.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-primary-foreground font-semibold">Lưu</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
