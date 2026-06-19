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

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(extractApiError(e, 'Đăng nhập thất bại'));
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
          <CardTitle className="text-2xl">Đăng nhập</CardTitle>
          <CardDescription>Nhập email và mật khẩu để tiếp tục.</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
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
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {error && <Text className="text-destructive text-sm">{error}</Text>}

          <Button onPress={onSubmit} disabled={submitting} className="mt-2">
            {submitting ? <ActivityIndicator color="white" /> : <Text>Đăng nhập</Text>}
          </Button>

          <View className="flex-row justify-center pt-2">
            <Text className="text-muted-foreground">Chưa có tài khoản? </Text>
            <Link href="/(auth)/register">
              <Text className="font-semibold">Đăng ký</Text>
            </Link>
          </View>
        </CardContent>
      </Card>
    </KeyboardAvoidingView>
  );
}
