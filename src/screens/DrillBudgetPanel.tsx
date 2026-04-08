// @ts-nocheck
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { DrillScreen, useDrillScrollToInput } from "../components/DrillScreen";
import { TxList } from "../components/TxList";
import {
  rollingChartMonthBucketsNewestFirst,
  yearMonthKeyFromTxDate,
} from "../utils/dates";
import {
  fmtMoneyDigits,
  stripMoneyToDigits,
  digitsFromNumber,
  parseMoneyDigits,
} from "../utils/money";
import { sectionDotColor } from "../utils/sectionDotColor";

/**
 * Debe estar definido fuera de FinanceScreen: si se declara dentro del render del padre,
 * React ve un tipo de componente distinto en cada render, desmonta/remonta el árbol y
 * el teclado se abre y cierra al instante.
 */
export function DrillBudgetPanel({
  localeTag,
  C,
  iS,
  cS,
  mSf,
  pl,
  fmt,
  txs,
  goals,
  credits,
  creditCards,
  sections,
  archivedSections,
  budget,
  dashboardBudgetRows,
  drillSub,
  budgetDetailMonth,
  budgetManageSections,
  budgetRenSec,
  budgetRenSecText,
  budgetNewSecName,
  budgetNewSecBudgetDigits,
  budgetShowNewSectionForm,
  sectionBudgetDigits,
  setBudgetDetailMonth,
  setDrillSub,
  setBudgetManageSections,
  setBudgetRenSec,
  setBudgetRenSecText,
  setBudgetNewSecName,
  setBudgetNewSecBudgetDigits,
  setBudgetShowNewSectionForm,
  setSectionBudgetDigits,
  setSections,
  setBudget,
  setTxs,
  setGoals,
  setArchivedSections,
  setConfirmDialog,
  closeDrill,
}) {
  const { t } = useTranslation();
  const scrollDrillInputIntoView = useDrillScrollToInput();
  const renameInputRef = useRef(null);
  const newSecNameRef = useRef(null);
  const newSecBudgetRef = useRef(null);
  const sectionBudgetInputRefs = useRef({});

  const budgetMonthOpts = useMemo(() => {
    const rows = rollingChartMonthBucketsNewestFirst(12).map(({ key }) => {
      const parts = key.split("-");
      const y = Number(parts[0]);
      const mo = Number(parts[1]);
      const label = new Date(y, mo - 1, 1).toLocaleDateString(localeTag, {
        month: "short",
        year: "2-digit",
      });
      return { key, label };
    });
    return [{ key: null, label: t("budget.monthAll") }, ...rows];
  }, [localeTag, t]);

  const commitSectionBudget = (s) => {
    const v = parseMoneyDigits(sectionBudgetDigits[s]);
    const amt = Number.isNaN(v) ? 0 : v;
    setBudget((b) => ({ ...b, [s]: amt }));
  };

  const addBudgetSection = () => {
    const n = (budgetNewSecName || "").trim();
    if (!n || sections.includes(n)) return;
    const v = parseMoneyDigits(budgetNewSecBudgetDigits);
    const amt = Number.isNaN(v) ? 0 : v;
    setSections((p) => [...p, n]);
    setBudget((b) => ({ ...b, [n]: amt }));
    setSectionBudgetDigits((p) => ({
      ...p,
      [n]: digitsFromNumber(amt),
    }));
    setBudgetNewSecName("");
    setBudgetNewSecBudgetDigits("");
    setBudgetShowNewSectionForm(false);
  };

  const archiveBudgetSection = (s) => {
    if (s === "Transferencias" || s === "Otros") return;
    setConfirmDialog({
      msg: t("budget.archiveSectionMsg", { name: s }),
      confirmLabel: t("accounts.archive"),
      onConfirm: () => {
        setSections((p) => p.filter((x) => x !== s));
        setArchivedSections((p) => [...p, s]);
        setBudget((b) => {
          const o = { ...b };
          delete o[s];
          return o;
        });
        setSectionBudgetDigits((p) => {
          const o = { ...p };
          delete o[s];
          return o;
        });
      },
    });
  };

  const deleteBudgetSection = (s) => {
    if (s === "Transferencias" || sections.length < 2) return;
    setConfirmDialog({
      msg: t("budget.deleteSectionMsg", {
        name: s,
        target: t("sections.otherFallback"),
      }),
      confirmLabel: t("confirm.delete"),
      onConfirm: () => {
        setTxs((p) =>
          p.map((tx) => (tx.section === s ? { ...tx, section: "Otros" } : tx)),
        );
        setSections((p) => p.filter((x) => x !== s));
        setBudget((b) => {
          const o = { ...b };
          delete o[s];
          return o;
        });
        setSectionBudgetDigits((p) => {
          const o = { ...p };
          delete o[s];
          return o;
        });
      },
    });
  };

  const applyBudgetRename = (oldName, newName) => {
    const nn = (newName || "").trim();
    if (!nn || nn === oldName || sections.includes(nn)) return;
    setSections((p) => p.map((x) => (x === oldName ? nn : x)));
    setBudget((b) => {
      const o = { ...b };
      o[nn] = o[oldName] ?? 0;
      delete o[oldName];
      return o;
    });
    setTxs((p) =>
      p.map((tx) => (tx.section === oldName ? { ...tx, section: nn } : tx)),
    );
    setGoals((p) =>
      p.map((g) => (g.name === oldName ? { ...g, name: nn } : g)),
    );
    setSectionBudgetDigits((p) => {
      const o = { ...p };
      const dig = o[oldName] ?? digitsFromNumber(budget[oldName] ?? 0);
      o[nn] = dig;
      delete o[oldName];
      return o;
    });
    setBudgetRenSec(null);
  };

  if (drillSub) {
    const secTxs = [...txs]
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.section === drillSub &&
          (!budgetDetailMonth ||
            yearMonthKeyFromTxDate(tx.date) === budgetDetailMonth),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    const total = secTxs.reduce(
      (s, tx) => s + (Number(tx.amount) || 0),
      0,
    );
    const bgt = budget[drillSub] || 0;
    return (
      <DrillScreen
        title={drillSub}
        onBack={() => {
          setDrillSub(null);
          setBudgetDetailMonth(null);
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingBottom: 4,
          }}
          keyboardShouldPersistTaps="always"
        >
          {budgetMonthOpts.map((m) => (
            <Pressable
              key={String(m.key)}
              style={pl(
                budgetDetailMonth === m.key ||
                  (m.key === null && !budgetDetailMonth),
              )}
              onPress={() => setBudgetDetailMonth(m.key)}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: pl(
                    budgetDetailMonth === m.key ||
                      (m.key === null && !budgetDetailMonth),
                  ).color,
                }}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          <View style={mSf}>
            <Text
              style={{
                fontSize: 10,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.65,
                marginBottom: 4,
              }}
            >
              {t("budget.spent")}
            </Text>
            <Text
              style={{
                fontWeight: 500,
                color: total > bgt && bgt > 0 ? C.red : C.text,
              }}
            >
              {fmt(total)}
            </Text>
          </View>
          <View style={mSf}>
            <Text
              style={{
                fontSize: 10,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.65,
                marginBottom: 4,
              }}
            >
              {t("budget.budgetLabel")}
            </Text>
            <Text style={{ fontWeight: 500, color: C.text }}>{fmt(bgt)}</Text>
          </View>
          <View style={mSf}>
            <Text
              style={{
                fontSize: 10,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: 0.65,
                marginBottom: 4,
              }}
            >
              {total > bgt ? t("budget.exceeded") : t("budget.available")}
            </Text>
            <Text
              style={{
                fontWeight: 500,
                color: total > bgt ? C.red : C.green,
              }}
            >
              {fmt(Math.abs(bgt - total))}
            </Text>
          </View>
        </View>
        <View style={cS}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 10,
              color: C.text,
            }}
          >
            {t("budget.transactionsHeading")}
          </Text>
          <TxList
            txs={secTxs}
            goals={goals}
            credits={credits}
            creditCards={creditCards || []}
            emptyMsg={t("budget.emptyCategory")}
          />
        </View>
      </DrillScreen>
    );
  }

  return (
    <DrillScreen
      title={t("budget.bySectionTitle")}
      onBack={() => {
        if (budgetRenSec) {
          setBudgetRenSec(null);
          return;
        }
        if (budgetShowNewSectionForm) {
          setBudgetShowNewSectionForm(false);
          setBudgetNewSecName("");
          setBudgetNewSecBudgetDigits("");
          return;
        }
        if (budgetManageSections) {
          setBudgetManageSections(false);
          return;
        }
        closeDrill();
      }}
      action={
        <Pressable
          onPress={() => setBudgetManageSections((m) => !m)}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: budgetManageSections ? C.blue : C.border,
            backgroundColor: budgetManageSections ? C.blueBg : C.bg3,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: budgetManageSections ? C.blue : C.muted,
            }}
          >
            {budgetManageSections ? t("budget.done") : t("common.edit")}
          </Text>
        </Pressable>
      }
    >
      {budgetManageSections && (
        <View style={{ marginBottom: 16 }}>
          {budgetRenSec && (
            <View style={{ ...cS, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                {t("budget.renameSectionTitle", { name: budgetRenSec })}
              </Text>
              <TextInput
                ref={renameInputRef}
                value={budgetRenSecText}
                onChangeText={setBudgetRenSecText}
                style={{ ...iS, marginBottom: 10 }}
                autoFocus
                onFocus={() => scrollDrillInputIntoView(renameInputRef)}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() =>
                    applyBudgetRename(budgetRenSec, budgetRenSecText)
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: C.blue,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: C.onPrimary,
                      fontSize: 13,
                    }}
                  >
                    {t("common.save")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setBudgetRenSec(null)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.bg3,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: C.muted,
                      fontSize: 13,
                    }}
                  >
                    {t("common.cancel")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          {!budgetRenSec &&
            (!budgetShowNewSectionForm ? (
              <Pressable
                onPress={() => {
                  setBudgetShowNewSectionForm(true);
                  setBudgetNewSecName("");
                  setBudgetNewSecBudgetDigits("");
                }}
                style={{
                  width: "100%",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.green,
                  backgroundColor: C.greenBg,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: C.green,
                    textAlign: "center",
                  }}
                >
                  {t("budget.addSection")}
                </Text>
              </Pressable>
            ) : (
              <View style={{ ...cS, marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    marginBottom: 12,
                  }}
                >
                  {t("budget.newSectionSubtitle")}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.65,
                    marginBottom: 8,
                  }}
                >
                  {t("accounts.name")}
                </Text>
                <TextInput
                  ref={newSecNameRef}
                  value={budgetNewSecName}
                  onChangeText={setBudgetNewSecName}
                  style={{ ...iS, marginBottom: 12 }}
                  autoFocus
                  onFocus={() => scrollDrillInputIntoView(newSecNameRef)}
                />
                <Text
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.65,
                    marginBottom: 8,
                  }}
                >
                  {t("budget.budgetForNewSection")}
                </Text>
                <TextInput
                  ref={newSecBudgetRef}
                  keyboardType="number-pad"
                  value={fmtMoneyDigits(budgetNewSecBudgetDigits)}
                  onChangeText={(v) =>
                    setBudgetNewSecBudgetDigits(stripMoneyToDigits(v))
                  }
                  style={{ ...iS, marginBottom: 12 }}
                  onFocus={() => scrollDrillInputIntoView(newSecBudgetRef)}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={addBudgetSection}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: C.green,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: C.onPrimary,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      {t("common.save")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setBudgetShowNewSectionForm(false);
                      setBudgetNewSecName("");
                      setBudgetNewSecBudgetDigits("");
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: C.border,
                      backgroundColor: C.bg3,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: C.muted,
                        fontSize: 13,
                      }}
                    >
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          {sections
            .filter((s) => s !== "Transferencias")
            .map((s) => (
              <View
                key={s}
                style={{ ...cS, marginBottom: 8, paddingVertical: 12 }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 10,
                    color: C.text,
                  }}
                >
                  {s}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.65,
                    marginBottom: 8,
                  }}
                >
                  {t("budget.budgetLabel")}
                </Text>
                <TextInput
                  ref={(el) => {
                    sectionBudgetInputRefs.current[s] = el;
                  }}
                  keyboardType="number-pad"
                  value={fmtMoneyDigits(sectionBudgetDigits[s])}
                  onChangeText={(v) =>
                    setSectionBudgetDigits((p) => ({
                      ...p,
                      [s]: stripMoneyToDigits(v),
                    }))
                  }
                  onEndEditing={() => commitSectionBudget(s)}
                  style={{ ...iS, marginBottom: 12 }}
                  onFocus={() =>
                    scrollDrillInputIntoView({
                      current: sectionBudgetInputRefs.current[s],
                    })
                  }
                />
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  <Pressable
                    onPress={() => {
                      setBudgetRenSec(s);
                      setBudgetRenSecText(s);
                    }}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.border,
                      backgroundColor: C.bg3,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: C.muted }}>
                      {t("budget.rename")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => archiveBudgetSection(s)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.gold,
                      backgroundColor: C.goldBg,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: C.gold }}>
                      {t("accounts.archive")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteBudgetSection(s)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.redBorder,
                      backgroundColor: C.redBg,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: C.red }}>
                      {t("confirm.delete")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          {archivedSections.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                {t("accounts.archived")}
              </Text>
              {archivedSections.map((s) => (
                <View
                  key={s}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: C.bg3,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 13, color: C.muted }}>{s}</Text>
                  <Pressable
                    onPress={() => {
                      setArchivedSections((p) => p.filter((x) => x !== s));
                      setSections((p) => [...p, s]);
                      setBudget((b) => ({ ...b, [s]: b[s] ?? 0 }));
                    }}
                    style={{
                      paddingVertical: 5,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.green,
                      backgroundColor: C.greenBg,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: C.green }}>
                      {t("accounts.restore")}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      {!budgetManageSections &&
        dashboardBudgetRows.map((b) => {
          const pct = b.b > 0 ? Math.min(100, (b.spent / b.b) * 100) : 100;
          const over = b.spent > b.b && b.b > 0;
          return (
            <Pressable
              key={b.s}
              style={{ ...cS, marginBottom: 10 }}
              onPress={() => {
                setDrillSub(b.s);
                setBudgetDetailMonth(null);
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: sectionDotColor(b.s, C),
                    }}
                  />
                  <Text style={{ fontSize: 13, color: C.text }}>{b.s}</Text>
                </View>
                <Text style={{ color: over ? C.red : C.muted }}>
                  {fmt(b.spent)}{" "}
                  <Text style={{ color: C.hint }}>/ {fmt(b.b)}</Text>
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: C.bg3,
                  borderRadius: 4,
                  overflow: "hidden",
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    width: pct + "%",
                    height: "100%",
                    backgroundColor: over ? C.red : C.green,
                    borderRadius: 4,
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 11, color: C.muted }}>
                  {t("budget.usedPct", { pct: Math.round(pct) })}
                </Text>
                <Text
                  style={{ fontSize: 11, color: over ? C.red : C.green }}
                >
                  {over
                    ? t("budget.exceededWith", {
                        amount: fmt(b.spent - b.b),
                      })
                    : t("budget.availableWith", {
                        amount: fmt(b.b - b.spent),
                      })}
                </Text>
              </View>
            </Pressable>
          );
        })}
    </DrillScreen>
  );
}
