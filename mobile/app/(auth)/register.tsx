import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { extractApiError } from '@/src/lib/errors';
import { useAuth } from '@/src/store/auth';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('Mật khẩu cần tối thiểu 8 ký tự.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch (e) {
      setError(extractApiError(e, 'Đăng ký thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1 justify-center px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          <CardDescription>Đăng ký để nhận 1 tháng Pro miễn phí.</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          <View className="gap-1.5">
            <Label nativeID="name">Tên hiển thị</Label>
            <Input
              aria-labelledby="name"
              placeholder="Nguyễn Văn A"
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View className="gap-1.5">
            <Label nativeID="email">Email</Label>
            <Input
              aria-labelledby="email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View className="gap-1.5">
            <Label nativeID="password">Mật khẩu</Label>
            <Input
              aria-labelledby="password"
              placeholder="Tối thiểu 8 ký tự"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error && <Text className="text-destructive text-sm">{error}</Text>}

          <Button onPress={onSubmit} disabled={submitting} className="mt-2">
            {submitting ? <ActivityIndicator color="white" /> : <Text>Đăng ký</Text>}
          </Button>

          <View className="flex-row justify-center pt-2">
            <Text className="text-muted-foreground">Đã có tài khoản? </Text>
            <Link href="/(auth)/login">
              <Text className="font-semibold">Đăng nhập</Text>
            </Link>
          </View>
        </CardContent>
      </Card>
    </KeyboardAvoidingView>
  );
}
