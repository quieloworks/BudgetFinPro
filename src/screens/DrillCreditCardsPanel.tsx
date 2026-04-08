// @ts-nocheck
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { DrillScreen } from "../components/DrillScreen";
import { SheetModal as CardFormModal } from "../components/SheetModal";
import { TxList } from "../components/TxList";
import { TY } from "../theme/typography";
import { T_DARK } from "../theme/tokens";
import {
  type CreditCardRow,
  creditCardBalanceAsOf,
  creditCardUtilizationPct,
} from "../utils/creditCardMath";
import {
  fmtMoneyDigits,
  stripMoneyToDigits,
  parseMoneyDigits,
  digitsFromNumber,
} from "../utils/money";
import { todayStr } from "../utils/dates";

const SWATCH = [
  T_DARK.purple,
  T_DARK.blue,
  T_DARK.red,
  T_DARK.green,
  T_DARK.gold,
];

export function DrillCreditCardsPanel({
  C,
  iS,
  cS,
  fmt,
  creditCards,
  setCreditCards,
  txs,
  drillSub,
  setDrillSub,
  closeDrill,
  setConfirmDialog,
  formKbPad,
  credits,
  openNewTxWithCard,
}) {
  const { t } = useTranslation();
  const asOf = todayStr();

  useEffect(() => {
    if (drillSub != null && !creditCards.some((c) => c.id === drillSub)) {
      setDrillSub(null);
    }
  }, [drillSub, creditCards, setDrillSub]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pickEditOpen, setPickEditOpen] = useState(false);

  const [formKind, setFormKind] = useState("bank");
  const [formName, setFormName] = useState("");
  const [formLimitDigits, setFormLimitDigits] = useState("");
  const [formCutoff, setFormCutoff] = useState("15");
  const [formPayDay, setFormPayDay] = useState("20");
  const [formColor, setFormColor] = useState(T_DARK.purple);

  const resetForm = () => {
    setEditingId(null);
    setFormKind("bank");
    setFormName("");
    setFormLimitDigits("");
    setFormCutoff("15");
    setFormPayDay("20");
    setFormColor(T_DARK.purple);
  };

  const openEdit = (c) => {
    if (!c) return;
    setEditingId(c.id);
    setFormKind(c.kind || "bank");
    setFormName(c.name || "");
    setFormLimitDigits(digitsFromNumber(c.creditLimit ?? 0));
    setFormCutoff(String(c.cutoffDay ?? 15));
    setFormPayDay(String(c.paymentDay ?? 20));
    setFormColor(c.color || T_DARK.purple);
    setModalOpen(true);
  };

  const openNew = () => {
    resetForm();
    setModalOpen(true);
  };

  const saveCard = () => {
    const name = (formName || "").trim();
    if (!name) return;
    const lim = parseMoneyDigits(formLimitDigits);
    if (Number.isNaN(lim) || lim <= 0) return;
    const co = Math.min(31, Math.max(1, parseInt(formCutoff, 10) || 15));
    const pd = Math.min(31, Math.max(1, parseInt(formPayDay, 10) || 20));
    const row: CreditCardRow = {
      id: editingId ?? Date.now(),
      kind: formKind === "store" ? "store" : "bank",
      name,
      creditLimit: lim,
      cutoffDay: co,
      paymentDay: pd,
      color: formColor,
    };
    if (editingId != null) {
      setCreditCards((p) => p.map((x) => (x.id === editingId ? row : x)));
    } else {
      setCreditCards((p) => [...p, row]);
    }
    setModalOpen(false);
    resetForm();
  };

  const tryDelete = (c) => {
    const linked = txs.some((x) => x.creditCardId === c.id);
    if (linked) {
      setConfirmDialog({
        msg: t("creditCards.deleteBlocked"),
        confirmLabel: t("common.ok"),
        onConfirm: () => {},
      });
      return;
    }
    setConfirmDialog({
      msg: t("creditCards.deleteConfirm", { name: c.name }),
      onConfirm: () => {
        setCreditCards((p) => p.filter((x) => x.id !== c.id));
        setDrillSub(null);
        setConfirmDialog(null);
      },
    });
  };

  const cardBySub = useMemo(
    () => creditCards.find((c) => c.id === drillSub),
    [creditCards, drillSub],
  );

  const subTxs = useMemo(() => {
    if (!cardBySub) return [];
    return txs.filter((x) => x.creditCardId === cardBySub.id);
  }, [txs, cardBySub]);

  if (drillSub != null && cardBySub) {
    const bal = creditCardBalanceAsOf(txs, cardBySub.id, asOf);
    const pct = Math.round(creditCardUtilizationPct(bal, cardBySub.creditLimit));
    const kindLabel =
      cardBySub.kind === "store"
        ? t("creditCards.kindStore")
        : t("creditCards.kindBank");

    return (
      <DrillScreen
        title={cardBySub.name}
        onBack={() => setDrillSub(null)}
        action={
          <Pressable
            onPress={() => openEdit(cardBySub)}
            hitSlop={10}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: C.bg3,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: TY.caption, color: C.blue, fontWeight: "600" }}>
              {t("common.edit")}
            </Text>
          </Pressable>
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom: 24 + (formKbPad?.paddingBottom ?? 0),
          }}
        >
          <View style={cS}>
            <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
              {kindLabel} · {t("creditCards.cutoff")}: {cardBySub.cutoffDay} ·{" "}
              {t("creditCards.paymentDay")}: {cardBySub.paymentDay}
            </Text>
            <Text style={{ fontSize: 14, color: C.text, marginBottom: 4 }}>
              {t("creditCards.balance")} {fmt(bal)}
            </Text>
            <Text style={{ fontSize: 13, color: C.muted }}>
              {t("creditCards.limit")} {fmt(cardBySub.creditLimit)} ·{" "}
              {pct}% {t("creditCards.used")}
            </Text>
            <View
              style={{
                height: 6,
                backgroundColor: C.bg3,
                borderRadius: 4,
                marginTop: 10,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.min(100, pct)}%`,
                  height: "100%",
                  backgroundColor: cardBySub.color,
                }}
              />
            </View>
          </View>
          <Pressable
            onPress={() => openNewTxWithCard?.(cardBySub.id, "charge")}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: C.redBg,
              borderWidth: 1,
              borderColor: C.redBorder,
            }}
          >
            <Text style={{ textAlign: "center", color: C.red, fontWeight: "600" }}>
              {t("creditCards.registerCharge")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => openNewTxWithCard?.(cardBySub.id, "payment")}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: C.blueBg,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ textAlign: "center", color: C.blue, fontWeight: "600" }}>
              {t("creditCards.registerPayment")}
            </Text>
          </Pressable>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: C.text,
              marginTop: 20,
              marginBottom: 8,
            }}
          >
            {t("common.movements")}
          </Text>
          <TxList txs={subTxs} goals={[]} credits={credits} creditCards={creditCards} />
        </ScrollView>
      </DrillScreen>
    );
  }

  return (
    <DrillScreen
      title={t("creditCards.title")}
      onBack={closeDrill}
      action={
        creditCards.length === 0 ? null : (
          <Pressable
            onPress={() => setPickEditOpen(true)}
            hitSlop={10}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: C.bg3,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Text style={{ fontSize: TY.caption, color: C.blue, fontWeight: "600" }}>
              {t("common.edit")}
            </Text>
          </Pressable>
        )
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 24 + (formKbPad?.paddingBottom ?? 0),
        }}
      >
        <Pressable
          onPress={openNew}
          style={{
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: C.blue,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: C.onPrimary,
              fontWeight: "600",
            }}
          >
            {t("creditCards.add")}
          </Text>
        </Pressable>

        {creditCards.length === 0 ? (
          <Text style={{ fontSize: 13, color: C.muted }}>{t("creditCards.empty")}</Text>
        ) : (
          creditCards.map((c) => {
            const bal = creditCardBalanceAsOf(txs, c.id, asOf);
            const pct = Math.round(creditCardUtilizationPct(bal, c.creditLimit));
            return (
              <Pressable
                key={c.id}
                onPress={() => setDrillSub(c.id)}
                style={{
                  ...cS,
                  marginBottom: 10,
                  borderLeftWidth: 4,
                  borderLeftColor: c.color,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: C.text }}>
                    {c.name}
                  </Text>
                  <Text style={{ color: C.hint }}>›</Text>
                </View>
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
                  {fmt(bal)} / {fmt(c.creditLimit)} · {pct}%{" "}
                  {t("creditCards.used")} · {t("creditCards.payBy")}{" "}
                  {c.paymentDay}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {pickEditOpen ? (
        <CardFormModal
          onClose={() => setPickEditOpen(false)}
          title={t("creditCards.pickToEdit")}
          height="55vh"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 360 }}
          >
            {creditCards.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setPickEditOpen(false);
                  openEdit(c);
                }}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: C.border,
                }}
              >
                <Text style={{ color: C.text, fontSize: 15 }}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </CardFormModal>
      ) : null}

      {modalOpen ? (
        <CardFormModal
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={editingId != null ? t("creditCards.editTitle") : t("creditCards.add")}
          height="88vh"
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
              {t("creditCards.kind")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {[
                { k: "bank", l: t("creditCards.kindBank") },
                { k: "store", l: t("creditCards.kindStore") },
              ].map((o) => (
                <Pressable
                  key={o.k}
                  onPress={() => setFormKind(o.k)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: formKind === o.k ? C.blue : C.border,
                    backgroundColor: formKind === o.k ? C.blueBg : C.bg3,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: formKind === o.k ? C.blue : C.muted,
                    }}
                  >
                    {o.l}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              {t("creditCards.name")}
            </Text>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              placeholder={t("creditCards.namePh")}
              placeholderTextColor={C.inputPlaceholder}
              style={iS}
            />
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 10, marginBottom: 4 }}>
              {t("creditCards.limit")}
            </Text>
            <TextInput
              value={fmtMoneyDigits(formLimitDigits)}
              onChangeText={(v) => setFormLimitDigits(stripMoneyToDigits(v))}
              keyboardType="number-pad"
              placeholderTextColor={C.inputPlaceholder}
              style={iS}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                  {t("creditCards.cutoff")}
                </Text>
                <TextInput
                  value={formCutoff}
                  onChangeText={setFormCutoff}
                  keyboardType="number-pad"
                  placeholderTextColor={C.inputPlaceholder}
                  style={iS}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                  {t("creditCards.paymentDay")}
                </Text>
                <TextInput
                  value={formPayDay}
                  onChangeText={setFormPayDay}
                  keyboardType="number-pad"
                  placeholderTextColor={C.inputPlaceholder}
                  style={iS}
                />
              </View>
            </View>
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 10, marginBottom: 4 }}>
              {t("credits.color")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SWATCH.map((col) => (
                <Pressable
                  key={col}
                  onPress={() => setFormColor(col)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: col,
                    borderWidth: formColor === col ? 3 : 0,
                    borderColor: C.text,
                  }}
                />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              {editingId != null ? (
                <Pressable
                  onPress={() => {
                    const c = creditCards.find((x) => x.id === editingId);
                    if (c) tryDelete(c);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: C.redBg,
                    borderWidth: 1,
                    borderColor: C.redBorder,
                  }}
                >
                  <Text style={{ textAlign: "center", color: C.red }}>{t("common.delete")}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: C.bg3,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text style={{ textAlign: "center", color: C.muted }}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={saveCard}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: C.blue,
                }}
              >
                <Text style={{ textAlign: "center", color: C.onPrimary, fontWeight: "600" }}>
                  {t("common.save")}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </CardFormModal>
      ) : null}
    </DrillScreen>
  );
}
