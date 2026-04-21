import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/pricing";
import type { Quote } from "@/lib/types";

function statusColor(status: string, c: ReturnType<typeof useColors>) {
  switch (status) {
    case "won":
      return c.success;
    case "sent":
      return c.primary;
    case "lost":
      return c.destructive;
    default:
      return c.mutedForeground;
  }
}

export default function QuotesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["quotes"],
    queryFn: api.quotes.list,
  });

  const renderItem = useCallback(
    ({ item }: { item: Quote }) => (
      <Pressable
        testID={`row-quote-${item.id}`}
        onPress={() => router.push(`/quote/${item.id}`)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.cardTitle, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {item.customerName}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
            Quote #{item.id} · {formatCurrency(item.totalAmount)}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: statusColor(item.status, colors) + "22" },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: statusColor(item.status, colors) },
            ]}
          >
            {item.status}
          </Text>
        </View>
        <Feather
          name="chevron-right"
          size={20}
          color={colors.mutedForeground}
        />
      </Pressable>
    ),
    [colors, router],
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={28} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>
          {(error as Error)?.message ?? "Could not load quotes"}
        </Text>
        <Pressable
          testID="button-retry"
          onPress={() => refetch()}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(q) => String(q.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather
              name="file-text"
              size={36}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No quotes yet
            </Text>
          </View>
        }
      />
      <Pressable
        testID="button-new-quote"
        onPress={() => router.push("/quote/new")}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 120 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  cardTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    marginBottom: 2,
  },
  cardMeta: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    textTransform: "capitalize",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontFamily: "DMSans_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "DMSans_500Medium", fontSize: 15 },
});
