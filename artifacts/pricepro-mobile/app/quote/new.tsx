import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import type { Customer } from "@/lib/types";

export default function NewQuoteScreen() {
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: api.customers.list,
  });

  const createQuote = useMutation({
    mutationFn: (c: Customer) =>
      api.quotes.create({
        customerId: c.id,
        customerName: c.name,
        customerEmail: c.email ?? null,
        status: "draft",
      }),
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      router.replace(`/quote/${q.id}`);
    },
  });

  const filtered = (customers ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "New Quote" }} />
      <View style={{ padding: 16 }}>
        <Text style={[styles.heading, { color: colors.foreground }]}>
          Pick a customer
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          A draft quote will be created for them.
        </Text>
        <View
          style={[
            styles.searchBox,
            { borderColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            testID="input-search-customer"
            placeholder="Search customers"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <Pressable
              testID={`option-customer-${item.id}`}
              disabled={createQuote.isPending}
              onPress={() => createQuote.mutate(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text
                  style={[styles.avatarText, { color: colors.accentForeground }]}
                >
                  {item.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {item.size} · {item.region}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 24 }}>
              No matching customers.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontFamily: "Outfit_700Bold", fontSize: 22 },
  sub: { fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2, marginBottom: 14 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Outfit_700Bold", fontSize: 14 },
  name: { fontFamily: "Outfit_600SemiBold", fontSize: 15 },
  meta: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
});
