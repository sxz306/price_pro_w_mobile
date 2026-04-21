import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useColors } from "@/hooks/useColors";
import {
  calcWinRate,
  formatCurrency,
  optimalMultiplier,
  winRateColor,
  winRateLabel,
} from "@/lib/pricing";
import type { Product, QuoteItem } from "@/lib/types";

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const quoteId = Number(id);
  const colors = useColors();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: quote, isLoading: loadingQuote } = useQuery({
    queryKey: ["quote", quoteId],
    queryFn: () => api.quotes.get(quoteId),
  });
  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["quote-items", quoteId],
    queryFn: () => api.quoteItems.list(quoteId),
  });
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: api.products.list,
  });

  const [addOpen, setAddOpen] = useState(false);

  const updateItem = useMutation({
    mutationFn: ({ id: itemId, body }: { id: number; body: Partial<QuoteItem> }) =>
      api.quoteItems.update(quoteId, itemId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-items", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: number) => api.quoteItems.delete(quoteId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-items", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const createItem = useMutation({
    mutationFn: (body: { productId: number; quantity: number; unitPrice: string }) =>
      api.quoteItems.create(quoteId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-items", quoteId] });
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
      setAddOpen(false);
    },
  });

  const sendQuote = useMutation({
    mutationFn: () => api.quotes.send(quoteId),
    onSuccess: () => {
      Alert.alert("Sent", "Quote sent to customer.");
      qc.invalidateQueries({ queryKey: ["quote", quoteId] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (err: Error) => {
      Alert.alert("Could not send", err.message);
    },
  });

  const totals = useMemo(() => {
    if (!items) return { subtotal: 0, weightedWin: 0, marginPct: 0 };
    let subtotal = 0;
    let weightedWin = 0;
    let totalMarginAmt = 0;
    let totalCost = 0;
    items.forEach((item) => {
      const mult = parseFloat(item.priceMultiplier || "1");
      const unit = parseFloat(item.unitPrice);
      const linePrice = unit * mult * item.quantity;
      const lineCost = unit * item.quantity;
      const wr = calcWinRate(
        mult,
        quote?.customerId ?? 0,
        item.productId,
        item.quantity,
      );
      subtotal += linePrice;
      weightedWin += wr * linePrice;
      totalCost += lineCost;
      totalMarginAmt += linePrice - lineCost;
    });
    return {
      subtotal,
      weightedWin: subtotal > 0 ? weightedWin / subtotal : 0,
      marginPct: subtotal > 0 ? (totalMarginAmt / subtotal) * 100 : 0,
    };
  }, [items, quote]);

  if (loadingQuote || loadingItems) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Quote not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: `Quote #${quote.id}`,
          headerRight: () => (
            <Pressable
              testID="button-delete-quote"
              onPress={() =>
                Alert.alert("Delete quote?", "This cannot be undone.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      await api.quotes.delete(quoteId);
                      qc.invalidateQueries({ queryKey: ["quotes"] });
                      router.back();
                    },
                  },
                ])
              }
              style={{ paddingHorizontal: 8 }}
            >
              <Feather name="trash-2" size={20} color={colors.destructive} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={items ?? []}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <View
              style={[
                styles.headerCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.customerName, { color: colors.foreground }]}>
                {quote.customerName}
              </Text>
              {quote.customerEmail ? (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {quote.customerEmail}
                </Text>
              ) : null}
              <View style={styles.statRow}>
                <Stat
                  label="Total"
                  value={formatCurrency(totals.subtotal)}
                  color={colors.foreground}
                />
                <Stat
                  label="Win rate"
                  value={`${totals.weightedWin.toFixed(1)}%`}
                  color={winRateColor(totals.weightedWin)}
                />
                <Stat
                  label="Margin"
                  value={`${totals.marginPct.toFixed(1)}%`}
                  color={colors.primary}
                />
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            product={products?.find((p) => p.id === item.productId)}
            customerId={quote.customerId ?? 0}
            onChangeMultiplier={(mult) =>
              updateItem.mutate({
                id: item.id,
                body: { priceMultiplier: mult.toFixed(4) },
              })
            }
            onDelete={() =>
              Alert.alert("Remove item?", "", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => deleteItem.mutate(item.id),
                },
              ])
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
            <Feather name="package" size={32} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontFamily: "DMSans_500Medium" }}>
              No line items yet
            </Text>
          </View>
        }
      />

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          testID="button-add-item"
          onPress={() => setAddOpen(true)}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
        >
          <Feather name="plus" size={18} color={colors.foreground} />
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
            Add item
          </Text>
        </Pressable>
        <Pressable
          testID="button-send-quote"
          disabled={!quote.customerEmail || sendQuote.isPending}
          onPress={() => sendQuote.mutate()}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.primary,
              opacity: !quote.customerEmail || sendQuote.isPending ? 0.5 : 1,
            },
          ]}
        >
          {sendQuote.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
          <Text style={styles.primaryBtnText}>Send</Text>
        </Pressable>
      </View>

      <AddItemModal
        visible={addOpen}
        products={products ?? []}
        onClose={() => setAddOpen(false)}
        onSubmit={(productId, quantity) => {
          const p = products?.find((pr) => pr.id === productId);
          if (!p) return;
          createItem.mutate({
            productId,
            quantity,
            unitPrice: p.basePrice,
          });
        }}
        submitting={createItem.isPending}
      />
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function ItemRow({
  item,
  product,
  customerId,
  onChangeMultiplier,
  onDelete,
}: {
  item: QuoteItem;
  product: Product | undefined;
  customerId: number;
  onChangeMultiplier: (mult: number) => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const serverMult = parseFloat(item.priceMultiplier || "1");
  const [mult, setMult] = useState(serverMult);
  const draggingRef = useRef(false);
  useEffect(() => {
    if (!draggingRef.current) setMult(serverMult);
  }, [serverMult]);

  const winRate = calcWinRate(mult, customerId, item.productId, item.quantity);
  const marginPct = (mult - 1) * 100;
  const opt = optimalMultiplier(customerId, item.productId, item.quantity);
  const optWr = calcWinRate(opt, customerId, item.productId, item.quantity);
  const unit = parseFloat(item.unitPrice);
  const linePrice = unit * mult * item.quantity;

  return (
    <View
      style={[
        styles.itemCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.itemHead}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
            {product?.name ?? `Product #${item.productId}`}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
            {item.quantity} × {formatCurrency(unit)} base
          </Text>
        </View>
        <Pressable
          testID={`button-remove-item-${item.id}`}
          onPress={onDelete}
          style={{ padding: 6 }}
          hitSlop={10}
        >
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <View style={styles.priceRow}>
        <Text style={[styles.linePrice, { color: colors.foreground }]}>
          {formatCurrency(linePrice)}
        </Text>
        <View
          style={[
            styles.marginPill,
            { backgroundColor: colors.accent },
          ]}
        >
          <Text
            style={[
              styles.marginPillText,
              { color: colors.accentForeground },
            ]}
          >
            {marginPct >= 0 ? "+" : ""}
            {marginPct.toFixed(1)}% margin
          </Text>
        </View>
      </View>

      <Slider
        testID={`slider-price-${item.id}`}
        style={{ width: "100%", height: 36 }}
        minimumValue={1.0}
        maximumValue={2.0}
        step={0.01}
        value={mult}
        onSlidingStart={() => {
          draggingRef.current = true;
        }}
        onValueChange={setMult}
        onSlidingComplete={(v) => {
          draggingRef.current = false;
          onChangeMultiplier(v);
        }}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
      <View style={styles.sliderEnds}>
        <Text style={[styles.sliderEndText, { color: colors.mutedForeground }]}>
          0%
        </Text>
        <Text style={[styles.sliderEndText, { color: colors.mutedForeground }]}>
          +100%
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
            Win likelihood
          </Text>
          <Text style={[styles.metricValue, { color: winRateColor(winRate) }]}>
            {winRate.toFixed(1)}% · {winRateLabel(winRate)}
          </Text>
        </View>
        <Pressable
          testID={`button-optimal-${item.id}`}
          onPress={() => {
            setMult(opt);
            onChangeMultiplier(opt);
          }}
          style={[
            styles.optBtn,
            { borderColor: colors.border, backgroundColor: colors.accent },
          ]}
        >
          <Feather name="zap" size={14} color={colors.accentForeground} />
          <Text style={[styles.optBtnText, { color: colors.accentForeground }]}>
            Optimal {((opt - 1) * 100).toFixed(0)}% · {optWr.toFixed(0)}% win
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddItemModal({
  visible,
  products,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onSubmit: (productId: number, quantity: number) => void;
  submitting: boolean;
}) {
  const colors = useColors();
  const [productId, setProductId] = useState<number | null>(null);
  const [qty, setQty] = useState("1");

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} testID="button-close-add">
            <Text style={{ color: colors.primary, fontFamily: "DMSans_500Medium" }}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Add Item
          </Text>
          <Pressable
            testID="button-confirm-add"
            disabled={!productId || submitting}
            onPress={() => {
              if (productId) onSubmit(productId, Math.max(1, parseInt(qty) || 1));
            }}
          >
            <Text
              style={{
                color: !productId || submitting ? colors.mutedForeground : colors.primary,
                fontFamily: "DMSans_600SemiBold",
              }}
            >
              {submitting ? "..." : "Add"}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Quantity
            </Text>
            <TextInput
              testID="input-quantity"
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  color: colors.foreground,
                },
              ]}
            />
          </View>

          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Product
            </Text>
            <View style={{ gap: 8 }}>
              {products.map((p) => {
                const selected = productId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    testID={`option-product-${p.id}`}
                    onPress={() => setProductId(p.id)}
                    style={[
                      styles.productOption,
                      {
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.accent : colors.card,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.productOptName, { color: colors.foreground }]}>
                        {p.name}
                      </Text>
                      <Text style={[styles.productOptMeta, { color: colors.mutedForeground }]}>
                        {p.category}
                      </Text>
                    </View>
                    <Text style={[styles.productOptPrice, { color: colors.primary }]}>
                      {formatCurrency(p.basePrice)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  customerName: { fontFamily: "Outfit_700Bold", fontSize: 22 },
  meta: { fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2 },
  statRow: { flexDirection: "row", marginTop: 16, gap: 12 },
  statLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontFamily: "Outfit_700Bold", fontSize: 18, marginTop: 4 },

  itemCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemName: { fontFamily: "Outfit_600SemiBold", fontSize: 15 },
  itemMeta: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 8,
  },
  linePrice: { fontFamily: "Outfit_700Bold", fontSize: 22 },
  marginPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  marginPillText: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },
  sliderEnds: { flexDirection: "row", justifyContent: "space-between" },
  sliderEndText: { fontFamily: "DMSans_400Regular", fontSize: 11 },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  metricLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  metricValue: { fontFamily: "Outfit_600SemiBold", fontSize: 14, marginTop: 2 },
  optBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 12 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontFamily: "DMSans_600SemiBold", fontSize: 15 },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  modalTitle: { fontFamily: "Outfit_700Bold", fontSize: 17 },
  fieldLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
  },
  productOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  productOptName: { fontFamily: "Outfit_600SemiBold", fontSize: 15 },
  productOptMeta: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 2 },
  productOptPrice: { fontFamily: "Outfit_700Bold", fontSize: 15 },
});
