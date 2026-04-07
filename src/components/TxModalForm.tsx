import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { ThemedPicker } from "./ThemedPicker";
import { FREQ } from "../constants/frequencies";
import { TY } from "../theme/typography";
import type { ThemeTokens } from "../theme/tokens";
import { parseLocalYmd, formatLocalYmd } from "../utils/dates";
import { fmtMoneyDigits, stripMoneyToDigits } from "../utils/money";

type Goal = { id: number; name: string };

export type TxFormState = {
  type: string;
  amountDigits: string;
  desc: string;
  section: string;
  account: string;
  transferToAccount: string;
  transferToGoalId: number | null;
  transferFromGoalId: number | null;
  transferLeg: string;
  date: string;
  recurring: boolean;
  freq: string;
  notes: string;
};

type TxTypeBarProps = {
  readOnly: boolean;
  fv: TxFormState;
  setFv: (fn: (p: TxFormState) => TxFormState) => void;
  C: ThemeTokens;
};

type SetTxForm = (fn: (p: TxFormState) => TxFormState) => void;

/** Definido a nivel de módulo para que React no desmonte el árbol en cada tecla (evita que el teclado se cierre). */
export function TxTypeBar({ readOnly, fv, setFv, C }: TxTypeBarProps) {
  const F = fv;
  const setF = setFv;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 4,
        flexShrink: 0,
      }}
    >
      {(["expense", "income", "transfer"] as const).map((tp) => (
        <Pressable
          key={tp}
          onPress={() =>
            !readOnly &&
            setF((p) => ({
              ...p,
              type: tp,
              recurring: tp === "transfer" ? false : p.recurring,
            }))
          }
          style={{
            flex: 1,
            minWidth: 100,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor:
              F.type === tp
                ? tp === "income"
                  ? C.green
                  : tp === "expense"
                    ? C.red
                    : C.blue
                : C.border,
            backgroundColor:
              F.type === tp
                ? tp === "income"
                  ? C.greenBg
                  : tp === "expense"
                    ? C.redBg
                    : C.blueBg
                : C.bg3,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color:
                tp === "income"
                  ? C.green
                  : tp === "expense"
                    ? C.red
                    : C.blue,
              fontWeight: F.type === tp ? "500" : "400",
            }}
          >
            {tp === "income"
              ? "↑ Ingreso"
              : tp === "expense"
                ? "↓ Egreso"
                : "⇄ Transferencia"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const DN_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function WebCalendarModal({
  visible,
  valueYmd,
  onSelect,
  onClose,
  C,
}: {
  visible: boolean;
  valueYmd: string;
  onSelect: (ymd: string) => void;
  onClose: () => void;
  C: ThemeTokens;
}) {
  const base = parseLocalYmd(valueYmd);
  const [vy, setVy] = useState(base.getFullYear());
  const [vm, setVm] = useState(base.getMonth());

  useEffect(() => {
    if (!visible) return;
    const b = parseLocalYmd(valueYmd);
    setVy(b.getFullYear());
    setVm(b.getMonth());
  }, [visible, valueYmd]);

  const grid = useMemo(() => {
    const first = new Date(vy, vm, 1);
    const startPad = first.getDay();
    const daysIn = new Date(vy, vm + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysIn; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [vy, vm]);

  const monthLabel = useMemo(() => {
    const d = new Date(vy, vm, 1);
    return d.toLocaleString("es", { month: "long", year: "numeric" });
  }, [vy, vm]);

  const shiftMonth = (delta: number) => {
    const d = new Date(vy, vm + delta, 1);
    setVy(d.getFullYear());
    setVm(d.getMonth());
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "center",
          padding: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: C.bg2,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.border,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Pressable onPress={() => shiftMonth(-1)}>
              <Text style={{ color: C.blue, fontSize: 18 }}>‹</Text>
            </Pressable>
            <Text
              style={{
                color: C.text,
                fontSize: 15,
                fontWeight: "500",
                textTransform: "capitalize",
              }}
            >
              {monthLabel}
            </Text>
            <Pressable onPress={() => shiftMonth(1)}>
              <Text style={{ color: C.blue, fontSize: 18 }}>›</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", marginBottom: 6 }}>
            {DN_SHORT.map((x) => (
              <Text
                key={x}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 10,
                  color: C.hint,
                }}
              >
                {x}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {grid.map((cell, idx) => (
              <View
                key={idx}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}
              >
                {cell != null ? (
                  <Pressable
                    onPress={() => {
                      onSelect(formatLocalYmd(new Date(vy, vm, cell)));
                      onClose();
                    }}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 8,
                      backgroundColor:
                        formatLocalYmd(new Date(vy, vm, cell)) === valueYmd
                          ? C.blueBg
                          : "transparent",
                    }}
                  >
                    <Text style={{ color: C.text, fontSize: 14 }}>{cell}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={{ marginTop: 12, paddingVertical: 10 }}
          >
            <Text style={{ color: C.muted, textAlign: "center" }}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TxDateField({
  readOnly,
  dateStr,
  onChangeYmd,
  C,
  iS,
}: {
  readOnly: boolean;
  dateStr: string;
  onChangeYmd: (ymd: string) => void;
  C: ThemeTokens;
  iS: object;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [webOpen, setWebOpen] = useState(false);

  const dt = parseLocalYmd(dateStr);

  const onPick = useCallback(
    (ev: DateTimePickerEvent, d?: Date) => {
      if (Platform.OS === "android") setAndroidOpen(false);
      if (ev.type === "set" && d) onChangeYmd(formatLocalYmd(d));
    },
    [onChangeYmd],
  );

  return (
    <>
      <Pressable
        disabled={readOnly}
        onPress={() => {
          if (readOnly) return;
          if (Platform.OS === "web") setWebOpen(true);
          else if (Platform.OS === "android") setAndroidOpen(true);
          else setIosOpen(true);
        }}
        style={[
          iS,
          {
            justifyContent: "center",
            opacity: readOnly ? 0.75 : 1,
          },
        ]}
      >
        <Text style={{ color: C.text, fontSize: TY.body }}>
          {dateStr || formatLocalYmd(new Date())}
        </Text>
      </Pressable>
      {Platform.OS === "web" ? (
        <WebCalendarModal
          visible={webOpen}
          valueYmd={dateStr || formatLocalYmd(new Date())}
          onSelect={onChangeYmd}
          onClose={() => setWebOpen(false)}
          C={C}
        />
      ) : null}
      {Platform.OS === "ios" ? (
        <Modal visible={iosOpen} transparent animationType="slide">
          <Pressable
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
            onPress={() => setIosOpen(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: C.bg2,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: 16,
                borderTopWidth: 1,
                borderColor: C.border,
              }}
            >
              <DateTimePicker
                value={dt}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) onChangeYmd(formatLocalYmd(d));
                }}
              />
              <Pressable
                onPress={() => setIosOpen(false)}
                style={{
                  marginTop: 8,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: C.blue,
                }}
              >
                <Text
                  style={{
                    color: C.onPrimary,
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  Listo
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
      {Platform.OS === "android" && androidOpen ? (
        <DateTimePicker
          value={dt}
          mode="date"
          display="default"
          onChange={onPick}
        />
      ) : null}
    </>
  );
}

type TxFormProps = {
  readOnly: boolean;
  fv: TxFormState;
  setFv: SetTxForm;
  C: ThemeTokens;
  iS: object;
  cS: object;
  goals: Goal[];
  accounts: string[];
  expenseSections: string[];
};

export function TxForm({
  readOnly,
  fv,
  setFv,
  C,
  iS,
  cS,
  goals,
  accounts,
  expenseSections,
}: TxFormProps) {
  const F = fv;
  const setF = setFv;
  const amtBorder =
    F.type === "income" ? C.green : F.type === "expense" ? C.red : C.blue;
  const amtBg =
    F.type === "income"
      ? C.greenBg
      : F.type === "expense"
        ? C.redBg
        : C.blueBg;

  return (
    <View style={{ paddingRight: 4 }}>
      <View style={{ marginBottom: 16, alignItems: "center" }}>
        <Text
          style={{
            fontSize: 11,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          Monto
        </Text>
        <TextInput
          editable={!readOnly}
          keyboardType="number-pad"
          value={fmtMoneyDigits(String(F.amountDigits ?? ""))}
          onChangeText={(v) =>
            !readOnly &&
            setF((p) => ({ ...p, amountDigits: stripMoneyToDigits(v) }))
          }
          style={{
            ...(iS as object),
            fontSize: TY.inputMoney,
            textAlign: "center",
            paddingVertical: 18,
            borderColor: amtBorder,
            backgroundColor: amtBg,
            width: "100%",
          }}
        />
      </View>
      {F.type === "transfer" && readOnly && (
        <View
          style={{
            marginBottom: 14,
            padding: 12,
            backgroundColor: C.bg3,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.border,
          }}
        >
          <Text style={{ fontSize: 13, color: C.text, lineHeight: 20 }}>
            {F.transferLeg === "to_account"
              ? F.account + " → " + (F.transferToAccount || "")
              : F.transferLeg === "to_goal"
                ? F.account +
                  " → " +
                  (goals.find((g) => g.id === F.transferToGoalId)?.name ||
                    "Meta")
                : (goals.find((g) => g.id === F.transferFromGoalId)?.name ||
                    "Meta") +
                  " → " +
                  F.account}
          </Text>
        </View>
      )}
      {F.type === "transfer" && !readOnly && (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
            Tipo de transferencia
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[
              { k: "to_account", l: "Entre cuentas" },
              { k: "to_goal", l: "A una meta" },
              { k: "from_goal", l: "Desde meta" },
            ].map((o) => (
              <Pressable
                key={o.k}
                onPress={() => setF((p) => ({ ...p, transferLeg: o.k }))}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: F.transferLeg === o.k ? C.blue : C.border,
                  backgroundColor: F.transferLeg === o.k ? C.blueBg : C.bg3,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: F.transferLeg === o.k ? C.blue : C.muted,
                  }}
                >
                  {o.l}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {F.type === "transfer" && (
        <View style={{ flexDirection: "column", gap: 12, marginBottom: 12 }}>
          {F.transferLeg === "from_goal" && (
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 5,
                }}
              >
                Meta (origen)
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: C.bg3,
                }}
              >
                <ThemedPicker
                  C={C}
                  enabled={!readOnly}
                  selectedValue={F.transferFromGoalId}
                  onValueChange={(v) =>
                    !readOnly &&
                    setF((p) => ({
                      ...p,
                      transferFromGoalId: Number(v),
                    }))
                  }
                >
                  {goals.map((g) => (
                    <Picker.Item
                      key={g.id}
                      label={g.name}
                      value={g.id}
                      color={C.text}
                    />
                  ))}
                </ThemedPicker>
              </View>
            </View>
          )}
          {F.transferLeg !== "from_goal" && (
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 5,
                }}
              >
                Cuenta origen
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: C.bg3,
                }}
              >
                <ThemedPicker
                  C={C}
                  enabled={!readOnly}
                  selectedValue={F.account}
                  onValueChange={(v) =>
                    !readOnly &&
                    setF((p) => ({ ...p, account: String(v) }))
                  }
                >
                  {accounts.map((o) => (
                    <Picker.Item key={o} label={o} value={o} color={C.text} />
                  ))}
                </ThemedPicker>
              </View>
            </View>
          )}
          {F.transferLeg === "to_account" && (
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 5,
                }}
              >
                Cuenta destino
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: C.bg3,
                }}
              >
                <ThemedPicker
                  C={C}
                  enabled={!readOnly}
                  selectedValue={F.transferToAccount || accounts[0]}
                  onValueChange={(v) =>
                    !readOnly &&
                    setF((p) => ({ ...p, transferToAccount: String(v) }))
                  }
                >
                  {accounts
                    .filter((a) => a !== F.account)
                    .map((o) => (
                      <Picker.Item key={o} label={o} value={o} color={C.text} />
                    ))}
                </ThemedPicker>
              </View>
            </View>
          )}
          {F.transferLeg === "to_goal" && (
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 5,
                }}
              >
                Meta destino
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: C.bg3,
                }}
              >
                <ThemedPicker
                  C={C}
                  enabled={!readOnly}
                  selectedValue={F.transferToGoalId || goals[0]?.id}
                  onValueChange={(v) =>
                    !readOnly &&
                    setF((p) => ({ ...p, transferToGoalId: Number(v) }))
                  }
                >
                  {goals.map((g) => (
                    <Picker.Item
                      key={g.id}
                      label={g.name}
                      value={g.id}
                      color={C.text}
                    />
                  ))}
                </ThemedPicker>
              </View>
            </View>
          )}
          {F.transferLeg === "from_goal" && (
            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 5,
                }}
              >
                Cuenta destino
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: C.bg3,
                }}
              >
                <ThemedPicker
                  C={C}
                  enabled={!readOnly}
                  selectedValue={F.account}
                  onValueChange={(v) =>
                    !readOnly &&
                    setF((p) => ({ ...p, account: String(v) }))
                  }
                >
                  {accounts.map((o) => (
                    <Picker.Item key={o} label={o} value={o} color={C.text} />
                  ))}
                </ThemedPicker>
              </View>
            </View>
          )}
        </View>
      )}
      <View style={{ marginBottom: 12 }}>
        <Text
          style={{
            fontSize: 11,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 5,
          }}
        >
          Descripcion
        </Text>
        <TextInput
          editable={!readOnly}
          value={String(F.desc || "")}
          onChangeText={(v) => !readOnly && setF((p) => ({ ...p, desc: v }))}
          style={iS}
        />
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text
          style={{
            fontSize: 11,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 5,
          }}
        >
          Fecha
        </Text>
        <TxDateField
          readOnly={readOnly}
          dateStr={String(F.date || "")}
          onChangeYmd={(ymd) => !readOnly && setF((p) => ({ ...p, date: ymd }))}
          C={C}
          iS={iS}
        />
      </View>
      {F.type !== "transfer" && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}
        >
          {[
            {
              l: "Seccion",
              k: "section" as const,
              opts: expenseSections,
            },
            { l: "Cuenta", k: "account" as const, opts: accounts },
          ].map((f) => (
            <View key={f.k} style={{ flex: 1, minWidth: 140 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 5,
                }}
              >
                {f.l}
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: C.bg3,
                }}
              >
                <ThemedPicker
                  C={C}
                  enabled={!readOnly}
                  selectedValue={F[f.k]}
                  onValueChange={(v) =>
                    !readOnly &&
                    setF((p) =>
                      f.k === "section"
                        ? { ...p, section: String(v) }
                        : { ...p, account: String(v) },
                    )
                  }
                >
                  {f.opts.map((o) => (
                    <Picker.Item key={o} label={o} value={o} color={C.text} />
                  ))}
                </ThemedPicker>
              </View>
            </View>
          ))}
        </View>
      )}
      <View style={{ marginBottom: 14 }}>
        <Text
          style={{
            fontSize: 11,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 5,
          }}
        >
          Notas
        </Text>
        <TextInput
          editable={!readOnly}
          value={String(F.notes || "")}
          onChangeText={(v) => !readOnly && setF((p) => ({ ...p, notes: v }))}
          style={iS}
        />
      </View>
      {!readOnly && F.type !== "transfer" && (
        <View
          style={{
            ...(cS as object),
            marginBottom: 14,
            paddingVertical: 14,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: F.recurring ? 12 : 0,
            }}
          >
            <View>
              <Text
                style={{ fontSize: 13, fontWeight: "500", color: C.text }}
              >
                Recurrente
              </Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Se repite automaticamente
              </Text>
            </View>
            <Pressable
              onPress={() =>
                setF((p) => ({ ...p, recurring: !p.recurring }))
              }
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                backgroundColor: F.recurring ? C.green : C.bg4,
                justifyContent: "center",
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  alignSelf: F.recurring ? "flex-end" : "flex-start",
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#fff",
                }}
              />
            </Pressable>
          </View>
          {F.recurring && (
            <View>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Frecuencia
              </Text>
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
              >
                {Object.entries(FREQ).map(([k, v]) => (
                  <Pressable
                    key={k}
                    onPress={() => setF((p) => ({ ...p, freq: k }))}
                    style={{
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: F.freq === k ? C.green : C.border,
                      backgroundColor: F.freq === k ? C.greenBg : C.bg3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: F.freq === k ? C.green : C.muted,
                      }}
                    >
                      {v}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
      {readOnly && F.recurring && F.type !== "transfer" && (
        <View
          style={{
            ...(cS as object),
            marginBottom: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderColor: C.gold + "55",
          }}
        >
          <Text style={{ fontSize: 12, color: C.gold }}>
            Recurrente · {FREQ[(F.freq as keyof typeof FREQ) || "monthly"] || F.freq}
          </Text>
        </View>
      )}
    </View>
  );
}
