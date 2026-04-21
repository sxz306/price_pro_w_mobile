import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import { formatCurrency } from "@/lib/pricing";
import type { Product } from "@/lib/types";

export default function ProductsScreen() {
  const colors = useColors();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["products"],
    queryFn: api.products.list,
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }: { item: Product }) => (
          <View
            testID={`row-product-${item.id}`}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatCurrency(item.basePrice)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          isError ? (
            <View style={styles.empty}>
              <Feather name="alert-circle" size={28} color={colors.destructive} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Could not load products
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Feather name="box" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No products yet
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  name: { fontFamily: "Outfit_600SemiBold", fontSize: 16 },
  meta: { fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2 },
  price: { fontFamily: "Outfit_700Bold", fontSize: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontFamily: "DMSans_500Medium", fontSize: 15 },
});
