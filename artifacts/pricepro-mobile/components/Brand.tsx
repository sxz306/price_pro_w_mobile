import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { useColors } from "@/hooks/useColors";

export function BrandMark({ size = 28 }: { size?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.markText, { fontSize: size * 0.55 }]}>$</Text>
    </View>
  );
}

export function BrandLogo({ size = 28 }: { size?: number }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <BrandMark size={size} />
      <Text
        style={[
          styles.wordmark,
          { color: colors.foreground, fontSize: size * 0.7 },
        ]}
      >
        Price Pro
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: { alignItems: "center", justifyContent: "center" },
  markText: {
    color: "#FFFFFF",
    fontFamily: "Outfit_700Bold",
    fontWeight: "800",
    lineHeight: undefined,
  },
  wordmark: {
    fontFamily: "Outfit_700Bold",
    fontWeight: "700",
    letterSpacing: -0.4,
  },
});
