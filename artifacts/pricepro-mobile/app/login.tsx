import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthContext";
import { useColors } from "@/hooks/useColors";

const logo = require("@/assets/images/icon.png");

export default function LoginScreen() {
  const colors = useColors();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("rep@pricepro.com");
  const [password, setPassword] = useState("");

  const login = useMutation({
    mutationFn: () => api.auth.login({ email: email.trim(), password }),
    onSuccess: async (res) => {
      await setSession(res.email, res.token);
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.foreground }]}>Price Pro</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sign in to your sales workspace
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
        <TextInput
          testID="input-email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="you@company.com"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              color: colors.foreground,
            },
          ]}
        />

        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>
          Password
        </Text>
        <TextInput
          testID="input-password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              color: colors.foreground,
            },
          ]}
        />

        {login.isError ? (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {(login.error as Error).message}
          </Text>
        ) : null}

        <Pressable
          testID="button-sign-in"
          disabled={login.isPending || !email || !password}
          onPress={() => login.mutate()}
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              opacity: login.isPending || !email || !password ? 0.5 : 1,
            },
          ]}
        >
          {login.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Demo credentials: rep@pricepro.com / pricepro
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: { width: 64, height: 64, marginBottom: 12 },
  title: { fontFamily: "Outfit_700Bold", fontSize: 28 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 14, marginTop: 4 },
  form: { gap: 4 },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontFamily: "DMSans_600SemiBold", fontSize: 15 },
  hint: {
    marginTop: 16,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  error: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    marginTop: 12,
  },
});
