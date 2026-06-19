import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    // Permissions still loading.
    return <View style={styles.black} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.black, styles.center, { padding: 24 }]}>
        <Ionicons name="camera-outline" size={64} color="#fff" />
        <Text style={styles.permTitle}>Cần quyền truy cập camera</Text>
        <Text style={styles.permText}>
          Ứng dụng dùng camera để chụp ảnh món hàng khi ghi giá.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Cấp quyền</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top icons: Profile (left) + Stats (right) — placeholders until later phases. */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={comingSoon} hitSlop={12}>
          <Ionicons name="person-circle-outline" size={34} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={comingSoon} hitSlop={12}>
          <Ionicons name="stats-chart" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom: capture button + swipe-up hint. */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + 32 }]}>
        <Text style={styles.hint}>Vuốt lên để xem lịch ⬆️</Text>
        <TouchableOpacity
          style={[styles.shutterOuter, capturing && styles.shutterBusy]}
          onPress={onCapture}
          disabled={capturing}
          activeOpacity={0.7}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  permTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16 },
  permText: { color: '#bbb', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  permButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBar: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hint: { color: 'rgba(255,255,255,0.85)', marginBottom: 20, fontSize: 13 },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterBusy: { opacity: 0.5 },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
});
