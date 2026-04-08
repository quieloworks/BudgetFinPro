// @ts-nocheck
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { DrillScreen } from "../components/DrillScreen";
import { SheetModal as Modal } from "../components/SheetModal";
import { TxList } from "../components/TxList";
import { ThemedPicker } from "../components/ThemedPicker";
import { FREQ_KEYS } from "../constants/frequencies";
import { T_DARK } from "../theme/tokens";
import {
  creditProgressPct,
  creditRemaining,
  creditScheduleDiff,
  expectedPaidBySchedule,
  sumCreditPayments,
} from "../utils/creditMath";
import {
  buildPaymentTransaction,
  buildPrincipalTransaction,
} from "../utils/creditTransactions";
import {
  fmtMoneyDigits,
  stripMoneyToDigits,
  parseMoneyDigits,
  digitsFromNumber,
} from "../utils/money";
import { todayStr, parseLocalYmd } from "../utils/dates";
import { TxDateField } from "../components/TxModalForm";

const CREDIT_SWATCH = [
  T_DARK.blue,
  T_DARK.green,
  T_DARK.gold,
  T_DARK.purple,
  T_DARK.red,
];

export function DrillCreditsPanel({
  C,
  iS,
  cS,
  TY,
  fmt,
  accounts,
  defaultAccount,
  credits,
  creditCards,
  setCredits,
  txs,
  setTxs,
  drillSub,
  setDrillSub,
  closeDrill,
  setConfirmDialog,
  formKbPad,
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (drillSub != null && !credits.some((c) => c.id === drillSub)) {
      setDrillSub(null);
    }
  }, [drillSub, credits, setDrillSub]);

  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [editingCreditId, setEditingCreditId] = useState(null);
  const [pickEditOpen, setPickEditOpen] = useState(false);
  const [payModal, setPayModal] = useState(null);

  const [formDir, setFormDir] = useState("received");
  const [formKind, setFormKind] = useState("cash");
  const [formName, setFormName] = useState("");
  const [formPrincipalDigits, setFormPrincipalDigits] = useState("");
  const [formAccount, setFormAccount] = useState(defaultAccount || "");
  const [formStart, setFormStart] = useState(todayStr());
  const [formEnd, setFormEnd] = useState("");
  const [formUseInstallment, setFormUseInstallment] = useState(false);
  const [formFreq, setFormFreq] = useState("monthly");
  const [formInstallmentDigits, setFormInstallmentDigits] = useState("");
  const [formColor, setFormColor] = useState(T_DARK.blue);

  const resetCreditForm = () => {
    setEditingCreditId(null);
    setFormDir("received");
    setFormKind("cash");
    setFormName("");
    setFormPrincipalDigits("");
    setFormAccount(defaultAccount || accounts[0] || "");
    setFormStart(todayStr());
    setFormEnd("");
    setFormUseInstallment(false);
    setFormFreq("monthly");
    setFormInstallmentDigits("");
    setFormColor(T_DARK.blue);
  };

  const openEditCredit = (c) => {
    if (!c) return;
    setEditingCreditId(c.id);
    setFormDir(c.direction);
    setFormKind(c.kind);
    setFormName(c.name || "");
    setFormPrincipalDigits(digitsFromNumber(c.principal));
    setFormAccount(c.account || defaultAccount || accounts[0] || "");
    setFormStart((c.startDate || "").trim() || todayStr());
    setFormEnd((c.endDate || "").trim() || "");
    const inst = c.installmentAmount != null && c.installmentFreq;
    setFormUseInstallment(!!inst);
    setFormFreq(c.installmentFreq || "monthly");
    setFormInstallmentDigits(
      c.installmentAmount != null
        ? digitsFromNumber(c.installmentAmount)
        : "",
    );
    setFormColor(c.color || T_DARK.blue);
    setCreditModalOpen(true);
  };

  const openNewCredit = () => {
    resetCreditForm();
    setCreditModalOpen(true);
  };

  const saveNewCredit = () => {
    const name = (formName || "").trim();
    const principal = parseMoneyDigits(formPrincipalDigits);
    if (!name || Number.isNaN(principal) || principal <= 0) return;
    const kind = formDir === "given" ? "cash" : formKind;
    const needsAccount =
      kind === "cash" || (kind === "inkind" && formDir === "received");
    if (needsAccount && !(formAccount || "").trim()) return;
    const instAmt = parseMoneyDigits(formInstallmentDigits);
    const instOk =
      formUseInstallment && !Number.isNaN(instAmt) && instAmt > 0 && formFreq;

    if (editingCreditId != null) {
      const prev = credits.find((x) => x.id === editingCreditId);
      if (!prev) return;
      const paid = sumCreditPayments(txs, editingCreditId);
      if (principal < paid) return;
      const credit = {
        ...prev,
        name,
        principal,
        account: needsAccount ? formAccount.trim() : formAccount.trim() || "",
        startDate: (formStart || "").trim() || todayStr(),
        endDate: (formEnd || "").trim() || null,
        installmentFreq: instOk ? formFreq : "",
        installmentAmount: instOk ? instAmt : null,
        color: formColor,
      };
      setCredits((p) => p.map((x) => (x.id === editingCreditId ? credit : x)));
      setTxs((p) =>
        p.map((tx) => {
          if (
            tx.creditId !== editingCreditId ||
            tx.creditPart !== "principal"
          ) {
            return tx;
          }
          const built = buildPrincipalTransaction(credit, tx.id, t);
          if (!built) return tx;
          return { ...built, id: tx.id };
        }),
      );
      setCreditModalOpen(false);
      resetCreditForm();
      return;
    }

    const baseId = Date.now();
    const credit = {
      id: baseId,
      direction: formDir,
      kind,
      name,
      principal,
      account: needsAccount ? formAccount.trim() : formAccount.trim() || "",
      startDate: (formStart || "").trim() || todayStr(),
      endDate: (formEnd || "").trim() || null,
      installmentFreq: instOk ? formFreq : "",
      installmentAmount:
        instOk ? instAmt : null,
      color: formColor,
    };

    const tx = buildPrincipalTransaction(credit, baseId + 1, t);
    setCredits((p) => [...p, credit]);
    if (tx) setTxs((p) => [...p, tx]);
    setCreditModalOpen(false);
    resetCreditForm();
  };

  const savePayment = () => {
    if (!payModal?.credit) return;
    const credit = payModal.credit;
    const amt = parseMoneyDigits(payModal.amountDigits || "");
    if (Number.isNaN(amt) || amt <= 0) return;
    const dateStr = (payModal.dateStr || "").trim() || todayStr();
    const tid = Date.now();
    const payAcct = (payModal.payAccount || "").trim() || credit.account;
    if (!payAcct) return;
    const tx = buildPaymentTransaction(
      credit,
      amt,
      dateStr,
      tid,
      (payModal.desc || "").trim(),
      t,
      { account: payAcct },
    );
    if (!tx) return;
    setTxs((p) => [...p, tx]);
    setPayModal(null);
  };

  const deleteCredit = (c) => {
    setConfirmDialog({
      msg: t("credits.deleteConfirm", { name: c.name }),
      confirmLabel: t("confirm.delete"),
      onConfirm: () => {
        setCredits((p) => p.filter((x) => x.id !== c.id));
        setTxs((p) => p.filter((x) => x.creditId !== c.id));
        setDrillSub(null);
      },
    });
  };

  const given = useMemo(
    () => credits.filter((c) => c.direction === "given"),
    [credits],
  );
  const received = useMemo(
    () => credits.filter((c) => c.direction === "received"),
    [credits],
  );

  const creditBySub = useMemo(
    () => credits.find((c) => c.id === drillSub),
    [credits, drillSub],
  );

  const creditTxs = useMemo(() => {
    if (!creditBySub) return [];
    const txTime = (x) => {
      const d = String(x.date ?? "").trim();
      const p = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
      if (p) return new Date(+p[1], +p[2] - 1, +p[3], 12, 0, 0).getTime();
      return parseLocalYmd(d).getTime();
    };
    return [...txs]
      .filter((x) => x.creditId === creditBySub.id)
      .sort((a, b) => {
        const tb = txTime(b) - txTime(a);
        if (tb !== 0) return tb;
        return Number(b.id) - Number(a.id);
      });
  }, [txs, creditBySub]);

  if (drillSub != null && creditBySub) {
    const paid = sumCreditPayments(txs, creditBySub.id);
    const rem = creditRemaining(creditBySub, paid);
    const pct = creditProgressPct(creditBySub, paid);
    const exp = expectedPaidBySchedule(creditBySub, todayStr());
    const diff = creditScheduleDiff(creditBySub, paid, todayStr());
    const hasPlan =
      !!creditBySub.installmentFreq &&
      creditBySub.installmentAmount != null &&
      creditBySub.installmentAmount > 0;

    return (
      <>
        <DrillScreen
          title={creditBySub.name}
          onBack={() => setDrillSub(null)}
          action={
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Pressable
                onPress={() => openEditCredit(creditBySub)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: C.blue,
                  backgroundColor: C.blueBg,
                }}
              >
                <Text style={{ fontSize: 11, color: C.blue }}>
                  {t("common.edit")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => deleteCredit(creditBySub)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: C.redBorder,
                  backgroundColor: C.redBg,
                }}
              >
                <Text style={{ fontSize: 11, color: C.red }}>
                  {t("common.delete")}
                </Text>
              </Pressable>
            </View>
          }
        >
          <View style={{ ...cS, marginBottom: 14 }}>
            <View
              style={{
                height: 8,
                backgroundColor: C.bg3,
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: pct + "%",
                  height: "100%",
                  backgroundColor: creditBySub.color || C.blue,
                  borderRadius: 4,
                }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <View style={{ minWidth: 100 }}>
                <Text style={{ fontSize: 10, color: C.muted }}>
                  {t("credits.principal")}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: C.text }}>
                  {fmt(creditBySub.principal)}
                </Text>
              </View>
              <View style={{ minWidth: 100 }}>
                <Text style={{ fontSize: 10, color: C.muted }}>
                  {t("credits.paid")}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: C.green }}>
                  {fmt(paid)}
                </Text>
              </View>
              <View style={{ minWidth: 100 }}>
                <Text style={{ fontSize: 10, color: C.muted }}>
                  {t("credits.remaining")}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "600", color: C.text }}>
                  {fmt(rem)}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              {creditBySub.direction === "given"
                ? t("credits.expectReceiveTotal")
                : t("credits.expectPayTotal")}{" "}
              {fmt(creditBySub.principal)}
            </Text>
            {hasPlan ? (
              <>
                <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  {t("credits.expectedByPlan", { amount: fmt(exp) })}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    marginTop: 4,
                    color:
                      diff > 0 ? C.green : diff < 0 ? C.red : C.muted,
                  }}
                >
                  {diff > 0
                    ? t("credits.aheadOfPlan", { amount: fmt(diff) })
                    : diff < 0
                      ? t("credits.behindPlan", { amount: fmt(-diff) })
                      : t("credits.onPlan")}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 11, color: C.hint, marginTop: 6 }}>
                {t("credits.noInstallmentPlan")}
              </Text>
            )}
            {creditBySub.endDate ? (
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                {t("credits.termEnd")}: {creditBySub.endDate}
              </Text>
            ) : null}
            <Pressable
              onPress={() =>
                setPayModal({
                  credit: creditBySub,
                  amountDigits: "",
                  dateStr: todayStr(),
                  desc: "",
                  payAccount:
                    (creditBySub.account ||
                      defaultAccount ||
                      accounts[0] ||
                      "").trim(),
                })
              }
              style={{
                marginTop: 14,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: C.blue,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: C.onPrimary,
                  fontWeight: "600",
                  fontSize: TY.body,
                }}
              >
                {t("credits.registerPayment")}
              </Text>
            </Pressable>
          </View>
          <View style={cS}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                marginBottom: 10,
                color: C.text,
              }}
            >
              {t("common.movements")}
            </Text>
            <TxList
              txs={creditTxs}
              goals={[]}
              credits={credits}
              creditCards={creditCards || []}
              emptyMsg={t("credits.noMovements")}
            />
          </View>
        </DrillScreen>

        {payModal && (
          <Modal
            onClose={() => setPayModal(null)}
            title={t("credits.registerPayment")}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingTop: formKbPad.paddingTop,
                paddingBottom: formKbPad.paddingBottom,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.65,
                }}
              >
                {t("tx.amount")}
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={fmtMoneyDigits(payModal.amountDigits)}
                onChangeText={(v) =>
                  setPayModal((p) => ({
                    ...p,
                    amountDigits: stripMoneyToDigits(v),
                  }))
                }
                style={{ ...iS, marginBottom: 14 }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.65,
                }}
              >
                {payModal.credit.direction === "given"
                  ? t("credits.collectToAccount")
                  : t("credits.payFromAccount")}
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 14,
                  overflow: "hidden",
                  marginBottom: 14,
                  backgroundColor: C.bg3,
                }}
              >
                <ThemedPicker C={C}
                  selectedValue={payModal.payAccount || accounts[0]}
                  onValueChange={(v) =>
                    setPayModal((p) => ({ ...p, payAccount: String(v) }))
                  }
                >
                  {accounts.map((a) => (
                    <Picker.Item key={a} label={a} value={a} color={C.text} />
                  ))}
                </ThemedPicker>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.65,
                }}
              >
                {t("tx.date")}
              </Text>
              <View style={{ marginBottom: 14 }}>
                <TxDateField
                  readOnly={false}
                  dateStr={payModal.dateStr}
                  onChangeYmd={(ymd) =>
                    setPayModal((p) => ({ ...p, dateStr: ymd }))
                  }
                  C={C}
                  iS={iS}
                />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.65,
                }}
              >
                {t("tx.desc")}
              </Text>
              <TextInput
                value={payModal.desc}
                onChangeText={(v) =>
                  setPayModal((p) => ({ ...p, desc: v }))
                }
                style={{ ...iS, marginBottom: 18 }}
              />
              <Pressable
                onPress={savePayment}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: C.green,
                }}
              >
                <Text
                  style={{
                    color: C.onPrimary,
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: TY.body,
                  }}
                >
                  {t("common.save")}
                </Text>
              </Pressable>
            </ScrollView>
          </Modal>
        )}
      </>
    );
  }

  const renderCard = (c) => {
    const paid = sumCreditPayments(txs, c.id);
    const pctNum = Math.round(creditProgressPct(c, paid));
    const barW = Math.min(100, creditProgressPct(c, paid));
    const rowColor = c.color || C.blue;
    const daysLeft =
      c.endDate != null && String(c.endDate).trim()
        ? Math.max(
            0,
            Math.round(
              (parseLocalYmd(String(c.endDate)).getTime() - Date.now()) /
                86400000,
            ),
          )
        : null;
    const subtitle =
      daysLeft != null
        ? t("goals.daysLeftLine", { count: daysLeft })
        : `${t("common.startDate")}: ${c.startDate || "—"}`;
    return (
      <Pressable
        key={c.id}
        onPress={() => setDrillSub(c.id)}
        style={{
          ...cS,
          marginBottom: 12,
          borderColor: rowColor + "44",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontSize: 14, fontWeight: "500", color: C.text }}
              numberOfLines={2}
            >
              {c.name}
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {subtitle}
            </Text>
            <Text style={{ fontSize: 10, color: C.hint, marginTop: 4 }}>
              {c.kind === "inkind"
                ? t("credits.kindInKind")
                : t("credits.kindCash")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
            <Text
              style={{ fontSize: 16, fontWeight: "500", color: rowColor }}
            >
              {pctNum}%
            </Text>
            <Text style={{ fontSize: 11, color: C.muted }}>
              {fmt(paid)} / {fmt(c.principal)}
            </Text>
          </View>
        </View>
        <View
          style={{
            height: 6,
            backgroundColor: C.bg3,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: barW + "%",
              height: "100%",
              backgroundColor: rowColor,
              borderRadius: 4,
            }}
          />
        </View>
        <Text style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          {t("credits.remaining")} {fmt(creditRemaining(c, paid))}
        </Text>
        <Text
          style={{
            textAlign: "right",
            marginTop: 6,
            fontSize: 11,
            color: C.hint,
          }}
        >
          {t("drill.tapForDetail")}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <DrillScreen
        title={t("credits.title")}
        onBack={closeDrill}
        action={
          <Pressable
            disabled={credits.length === 0}
            onPress={() => setPickEditOpen(true)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: C.blue,
              backgroundColor: C.blueBg,
              opacity: credits.length === 0 ? 0.45 : 1,
            }}
          >
            <Text style={{ fontSize: 12, color: C.blue, fontWeight: "500" }}>
              {t("common.edit")}
            </Text>
          </Pressable>
        }
      >
        <Pressable
          onPress={openNewCredit}
          style={{
            width: "100%",
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.green,
            backgroundColor: C.greenBg,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              color: C.green,
              fontWeight: "600",
              fontSize: TY.body,
            }}
          >
            {t("credits.add")}
          </Text>
        </Pressable>

        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: C.muted,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {t("credits.sectionGranted")}
        </Text>
        {given.length === 0 ? (
          <Text style={{ fontSize: 13, color: C.hint, marginBottom: 16 }}>
            {t("credits.emptyGranted")}
          </Text>
        ) : (
          given.map(renderCard)
        )}

        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: C.muted,
            marginBottom: 8,
            marginTop: 8,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {t("credits.sectionRequested")}
        </Text>
        {received.length === 0 ? (
          <Text style={{ fontSize: 13, color: C.hint }}>{t("credits.emptyRequested")}</Text>
        ) : (
          received.map(renderCard)
        )}
      </DrillScreen>

      {pickEditOpen && (
        <Modal
          onClose={() => setPickEditOpen(false)}
          title={t("credits.pickToEdit")}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: formKbPad.paddingTop,
              paddingBottom: formKbPad.paddingBottom,
            }}
          >
            {credits.length === 0 ? (
              <Text style={{ color: C.muted, fontSize: 14 }}>
                {t("credits.emptyBoth")}
              </Text>
            ) : (
              credits.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setPickEditOpen(false);
                    openEditCredit(c);
                  }}
                  style={{
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: C.bg3,
                    borderWidth: 1,
                    borderColor: C.border,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: "600", color: C.text }}
                  >
                    {c.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                    {c.direction === "given"
                      ? t("credits.directionGiven")
                      : t("credits.directionReceived")}{" "}
                    · {fmt(c.principal)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Modal>
      )}

      {creditModalOpen && (
        <Modal
          onClose={() => {
            setCreditModalOpen(false);
            resetCreditForm();
          }}
          height="92vh"
          title={
            editingCreditId != null ? t("credits.editTitle") : t("credits.add")
          }
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingTop: formKbPad.paddingTop,
              paddingBottom: formKbPad.paddingBottom,
            }}
          >
            {editingCreditId == null ? (
              <>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  {t("credits.direction")}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {["received", "given"].map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => {
                        setFormDir(d);
                        if (d === "given") setFormKind("cash");
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: formDir === d ? C.blue : C.border,
                        backgroundColor:
                          formDir === d ? C.blueBg : C.bg3,
                      }}
                    >
                      <Text
                        style={{
                          textAlign: "center",
                          fontSize: 13,
                          color: formDir === d ? C.blue : C.muted,
                          fontWeight: formDir === d ? "600" : "400",
                        }}
                      >
                        {d === "given"
                          ? t("credits.directionGiven")
                          : t("credits.directionReceived")}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {formDir === "received" ? (
                  <>
                    <Text
                      style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}
                    >
                      {t("credits.moneyOrKind")}
                    </Text>
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}
                    >
                      {["cash", "inkind"].map((k) => (
                        <Pressable
                          key={k}
                          onPress={() => setFormKind(k)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: formKind === k ? C.gold : C.border,
                            backgroundColor:
                              formKind === k ? C.goldBg : C.bg3,
                          }}
                        >
                          <Text
                            style={{
                              textAlign: "center",
                              fontSize: 13,
                              color: formKind === k ? C.gold : C.muted,
                              fontWeight: formKind === k ? "600" : "400",
                            }}
                          >
                            {k === "cash"
                              ? t("credits.kindCash")
                              : t("credits.kindInKind")}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  color: C.hint,
                  marginBottom: 14,
                }}
              >
                {t("credits.editLockedType")}
              </Text>
            )}

            <Text
              style={{
                fontSize: 11,
                color: C.muted,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.65,
              }}
            >
              {t("tx.desc")}
            </Text>
            <TextInput
              value={formName}
              onChangeText={setFormName}
              style={{ ...iS, marginBottom: 14 }}
              placeholder={t("credits.namePlaceholder")}
              placeholderTextColor={C.inputPlaceholder}
            />

            <Text
              style={{
                fontSize: 11,
                color: C.muted,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.65,
              }}
            >
              {t("credits.principal")}
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={fmtMoneyDigits(formPrincipalDigits)}
              onChangeText={(v) =>
                setFormPrincipalDigits(stripMoneyToDigits(v))
              }
              style={{ ...iS, marginBottom: 14 }}
            />

            {(formDir === "given" ||
              (formDir === "received" && formKind === "cash")) && (
              <>
                <Text
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.65,
                  }}
                >
                  {formDir === "given"
                    ? t("credits.accountOut")
                    : t("credits.accountIn")}
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 14,
                    overflow: "hidden",
                    marginBottom: 14,
                    backgroundColor: C.bg3,
                  }}
                >
                  <ThemedPicker C={C}
                    selectedValue={formAccount}
                    onValueChange={setFormAccount}
                  >
                    {accounts.map((a) => (
                      <Picker.Item key={a} label={a} value={a} color={C.text} />
                    ))}
                  </ThemedPicker>
                </View>
              </>
            )}

            {formDir === "received" && formKind === "inkind" ? (
              <>
                <Text
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: 0.65,
                  }}
                >
                  {t("credits.accountPayFrom")}
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 14,
                    overflow: "hidden",
                    marginBottom: 14,
                    backgroundColor: C.bg3,
                  }}
                >
                  <ThemedPicker C={C}
                    selectedValue={formAccount}
                    onValueChange={setFormAccount}
                  >
                    {accounts.map((a) => (
                      <Picker.Item key={a} label={a} value={a} color={C.text} />
                    ))}
                  </ThemedPicker>
                </View>
                <Text style={{ fontSize: 12, color: C.hint, marginBottom: 14 }}>
                  {t("credits.inkindHint")}
                </Text>
              </>
            ) : null}

            <Text
              style={{
                fontSize: 11,
                color: C.muted,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.65,
              }}
            >
              {t("credits.startDate")}
            </Text>
            <View style={{ marginBottom: 14 }}>
              <TxDateField
                readOnly={false}
                dateStr={formStart}
                onChangeYmd={setFormStart}
                C={C}
                iS={iS}
              />
            </View>

            <Text
              style={{
                fontSize: 11,
                color: C.muted,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 0.65,
              }}
            >
              {t("credits.endDateOptional")}
            </Text>
            <View style={{ marginBottom: 14 }}>
              <TxDateField
                readOnly={false}
                dateStr={formEnd}
                onChangeYmd={setFormEnd}
                C={C}
                iS={iS}
                allowEmpty
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 13, color: C.text, flex: 1 }}>
                {t("credits.installmentToggle")}
              </Text>
              <Switch
                value={formUseInstallment}
                onValueChange={setFormUseInstallment}
                trackColor={{ false: C.bg4, true: C.green }}
              />
            </View>

            {formUseInstallment ? (
              <>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  {t("common.frequency")}
                </Text>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 14,
                    overflow: "hidden",
                    marginBottom: 14,
                    backgroundColor: C.bg3,
                  }}
                >
                  <ThemedPicker C={C}
                    selectedValue={formFreq}
                    onValueChange={setFormFreq}
                  >
                    {FREQ_KEYS.map((fk) => (
                      <Picker.Item
                        key={fk}
                        label={t("freq." + fk)}
                        value={fk}
                        color={C.text}
                      />
                    ))}
                  </ThemedPicker>
                </View>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  {t("credits.installmentAmount")}
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  value={fmtMoneyDigits(formInstallmentDigits)}
                  onChangeText={(v) =>
                    setFormInstallmentDigits(stripMoneyToDigits(v))
                  }
                  style={{ ...iS, marginBottom: 14 }}
                />
              </>
            ) : null}

            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              {t("credits.color")}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
              {CREDIT_SWATCH.map((col) => (
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

            <Pressable
              onPress={saveNewCredit}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: C.green,
              }}
            >
              <Text
                style={{
                  color: C.onPrimary,
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: TY.body,
                }}
              >
                {editingCreditId != null
                  ? t("credits.saveEdit")
                  : t("credits.saveCredit")}
              </Text>
            </Pressable>
          </ScrollView>
        </Modal>
      )}
    </>
  );
}
