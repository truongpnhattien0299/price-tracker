import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function CameraScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  const onCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        router.push({ pathname: '/capture', params: { photoUri: photo.uri } });
      }
    } catch {
      Alert.alert('Lỗi', 'Không chụp được ảnh. Thử lại.');
    } finally {
      setCapturing(false);
    }
  };

  const comingSoon = () =>
    Alert.alert('Sắp có', 'Tính năng này sẽ có ở phiên bản tiếp theo.');

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Ionicons name="camera-outline" size={64} color="#fff" />
        <Text className="mt-4 text-xl font-bold text-white">
          Cần quyền truy cập camera
        </Text>
        <Text className="mt-2 text-center text-base text-white/70">
          Ứng dụng dùng camera để chụp ảnh món hàng khi ghi giá.
        </Text>
        <Button onPress={requestPermission} variant="secondary" className="mt-6">
          <Text>Cấp quyền</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top icons: Profile (left) + Stats (right) — placeholders until later phases. */}
      <View
        className="absolute left-5 right-5 flex-row items-center justify-between"
        style={{ top: insets.top + 8 }}
      >
        <Pressable onPress={comingSoon} hitSlop={12}>
          <Ionicons name="person-circle-outline" size={34} color="#fff" />
        </Pressable>
        <Pressable onPress={comingSoon} hitSlop={12}>
          <Ionicons name="stats-chart" size={28} color="#fff" />
        </Pressable>
      </View>

      {/* Bottom: capture button + swipe-up hint. */}
      <View
        className="absolute left-0 right-0 items-center"
        style={{ bottom: insets.bottom + 32 }}
      >
        <Text className="mb-5 text-sm text-white/85">Vuốt lên để xem lịch ⬆️</Text>
        <Pressable
          onPress={onCapture}
          disabled={capturing}
          className={`h-20 w-20 items-center justify-center rounded-full border-[5px] border-white/70 ${
            capturing ? 'opacity-50' : ''
          }`}
        >
          <View className="h-[62px] w-[62px] rounded-full bg-white" />
        </Pressable>
      </View>
    </View>
  );
}
