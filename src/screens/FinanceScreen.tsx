// @ts-nocheck
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Switch,
  Animated,
  StyleSheet,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { ThemedPicker } from "../components/ThemedPicker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";

import { T_DARK } from "../theme/tokens";
import { TY, TAB_CONTENT_H } from "../theme/typography";
import { useAppTheme } from "../theme/ThemeContext";
import { MN, DN } from "../constants/calendar";
import { FREQ } from "../constants/frequencies";
import { SECS } from "../constants/sections";
import { FINPRO_STORAGE_KEY } from "../constants/storage";
import { todayStr, rollingChartMonthBuckets } from "../utils/dates";
import {
  totalGoalSavedAsOfDate,
  chartMonthEndDate,
  reportAsOfEndDate,
} from "../utils/goalBalances";
import { fmt } from "../utils/format";
import {
  fmtMoneyDigits,
  stripMoneyToDigits,
  digitsFromNumber,
  parseMoneyDigits,
} from "../utils/money";
import { applyTxToAccounts } from "../utils/accounts";
import { sectionDotColor } from "../utils/sectionDotColor";
import { computeAlerts, monthKey } from "../utils/alerts";
import { SheetModal as Modal } from "../components/SheetModal";
import { DrillScreen } from "../components/DrillScreen";
import { Confirm } from "../components/Confirm";
import { PieChart } from "../components/charts/PieChart";
import { BarChart } from "../components/charts/BarChart";
import { LineChart } from "../components/charts/LineChart";
import { SwipeRow } from "../components/SwipeRow";
import { TxList } from "../components/TxList";
import { TxForm, TxTypeBar } from "../components/TxModalForm";

export function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const { C, themeMode, setThemeMode } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const cS = useMemo(
    () => ({
      backgroundColor: C.bg2,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: C.cardRadius,
      paddingVertical: 20,
      paddingHorizontal: 22,
    }),
    [C],
  );
  const mS = useMemo(
    () => ({
      backgroundColor: C.bg3,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingVertical: 18,
      paddingHorizontal: 18,
    }),
    [C],
  );
  const mSf = useMemo(() => ({ ...mS, flex: 1, minWidth: 0 }), [mS]);
  const iS = useMemo(
    () => ({
      width: "100%",
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.bg3,
      color: C.text,
      fontSize: TY.body,
    }),
    [C],
  );
  const pl = useCallback(
    (a, col) => ({
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 22,
      fontSize: TY.caption,
      borderWidth: 0,
      backgroundColor: a ? col || C.text : C.bg3,
      color: a ? (col ? C.onPrimary : C.isDark ? C.bg : C.onPrimary) : C.muted,
    }),
    [C],
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  /** Falso mientras el backdrop anima el cierre: deja pasar toques al tab bar (evita capa invisible bloqueando). */
  const [drawerBackdropBlocking, setDrawerBackdropBlocking] = useState(true);
  const drawerProgress = useRef(new Animated.Value(0)).current;
  const drawerWidth = 320;
  const openSettingsDrawer = useCallback(() => {
    setDrawerBackdropBlocking(true);
    setSettingsOpen(true);
    drawerProgress.setValue(0);
    Animated.spring(drawerProgress, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
    }).start();
  }, [drawerProgress]);
  const closeSettingsDrawer = useCallback(() => {
    setDrawerBackdropBlocking(false);
    Animated.timing(drawerProgress, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSettingsOpen(false);
      setDrawerBackdropBlocking(true);
      drawerProgress.setValue(0);
    });
  }, [drawerProgress]);
  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });
  const overlayOpacity = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const [tab, setTab] = useState("dashboard");
  const [txs, setTxs] = useState([]);
  const [budget, setBudget] = useState({});
  const [sections, setSections] = useState(SECS);
  const [accounts, setAccounts] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [defaultAccount, setDefaultAccount] = useState("");
  const [goals, setGoals] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [goalInputs, setGoalInputs] = useState({});
  const [alertRules, setAlertRules] = useState([]);
  const [archivedSections, setArchivedSections] = useState([]);
  const [budgetDetailMonth, setBudgetDetailMonth] = useState(null);
  /* Cuentas drill: estado elevado para back coherente (header + Android) */
  const [accountsDetail, setAccountsDetail] = useState(null);
  const [accountsEditMode, setAccountsEditMode] = useState(false);
  /* Presupuesto drill: modo editar / renombrar elevados por la misma razón */
  const [budgetManageSections, setBudgetManageSections] = useState(false);
  const [budgetRenSec, setBudgetRenSec] = useState(null);
  const [budgetRenSecText, setBudgetRenSecText] = useState("");
  const [budgetNewSecName, setBudgetNewSecName] = useState("");
  const [goalModal, setGoalModal] = useState(null);
  const [goalForm, setGoalForm] = useState({
    name: "",
    targetDigits: "",
    deadline: todayStr(),
    color: T_DARK.blue,
  });
  const [goalWithdrawModal, setGoalWithdrawModal] = useState(null);
  const [goalWithdrawForm, setGoalWithdrawForm] = useState({
    amountDigits: "",
    account: "",
  });
  const [goalAddAcc, setGoalAddAcc] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [ruleEditor, setRuleEditor] = useState(null);

  /* Drilldown */
  const [drilldown, setDrilldown] = useState(null);
  const [drillSub, setDrillSub] = useState(null); // sub-detail within a drilldown
  const openDrill = useCallback(
    (key) => {
      setDrillSub(null);
      setBudgetDetailMonth(null);
      setAccountsDetail(null);
      setAccountsEditMode(false);
      setBudgetManageSections(false);
      setBudgetRenSec(null);
      setBudgetRenSecText("");
      setBudgetNewSecName("");
      setSettingsOpen(false);
      drawerProgress.setValue(0);
      setDrawerBackdropBlocking(true);
      setDrilldown(key);
    },
    [drawerProgress],
  );
  const closeDrill = useCallback(() => {
    setDrilldown(null);
    setDrillSub(null);
    setBudgetDetailMonth(null);
    setAccountsDetail(null);
    setAccountsEditMode(false);
    setBudgetManageSections(false);
    setBudgetRenSec(null);
    setBudgetRenSecText("");
    setBudgetNewSecName("");
  }, []);

  /* TX modal */
  const [txModal, setTxModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const blankForm = () => {
    const sec = sections.find((s) => s !== "Transferencias") || sections[0];
    const other = accounts.find((a) => a !== defaultAccount) || accounts[0];
    return {
      type: "expense",
      amountDigits: "",
      desc: "",
      section: sec,
      account: defaultAccount,
      transferToAccount: other || "",
      transferToGoalId: goals[0]?.id ?? null,
      transferFromGoalId: goals[0]?.id ?? null,
      transferLeg: "to_account",
      date: todayStr(),
      recurring: false,
      freq: "monthly",
      notes: "",
    };
  };
  const [form, setForm] = useState(blankForm());
  const txFormScrollRef = useRef(null);
  /** Props vivas para DrillBalance (componente estable vía useMemo; evita remount del ScrollView horizontal del time frame). */
  const balanceDrillPropsRef = useRef(null);

  /* Balance report state */
  const [balTf, setBalTf] = useState("month");
  const [balChart, setBalChart] = useState("bar");
  const [balFilters, setBalFilters] = useState({
    inc: true,
    exp: true,
    sav: true,
  });
  const [balCustom, setBalCustom] = useState(() => {
    const y = new Date().getFullYear();
    return { from: `${y}-01-01`, to: todayStr() };
  });

  /* Account edit modal */
  const [accModal, setAccModal] = useState(null); // null|{mode:"add"|"edit"|"archive",acc:string}
  const [accForm, setAccForm] = useState("");

  /* Recurring edit modal */
  const [recModal, setRecModal] = useState(null);
  const [recForm, setRecForm] = useState({
    type: "expense",
    amountDigits: "",
    desc: "",
    section: "General",
    account: "",
    freq: "monthly",
    date: todayStr(),
    notes: "",
  });

  /* Filters (transactions tab) */
  const [filterType, setFilterType] = useState("all");
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterSec, setFilterSec] = useState("all");
  const [search, setSearch] = useState("");
  const [reportView, setReportView] = useState("balance");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [calSel, setCalSel] = useState(null);

  /* AI */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMsgs, setAiMsgs] = useState([
    {
      role: "assistant",
      text: "¿En qué te puedo ayudar? Puedes escribir o adjuntar una imagen de un ticket.",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImage, setAiImage] = useState(null);
  const aiRef = useRef(null);

  /** Android: atrás físico sigue la misma pila que los botones ‹ y modales. */
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (confirmDialog) {
        setConfirmDialog(null);
        return true;
      }
      if (confirmDelete) {
        setConfirmDelete(null);
        return true;
      }
      if (ruleEditor) {
        setRuleEditor(null);
        return true;
      }
      if (goalWithdrawModal != null) {
        setGoalWithdrawModal(null);
        return true;
      }
      if (goalModal) {
        setGoalModal(null);
        return true;
      }
      if (recModal) {
        setRecModal(null);
        return true;
      }
      if (accModal) {
        setAccModal(null);
        return true;
      }
      if (txModal) {
        setTxModal(null);
        return true;
      }
      if (aiOpen) {
        setAiOpen(false);
        return true;
      }
      if (settingsOpen) {
        closeSettingsDrawer();
        return true;
      }
      if (!drilldown) return false;

      if (drilldown === "accounts") {
        if (accountsDetail) {
          setAccountsDetail(null);
          return true;
        }
        if (accountsEditMode) {
          setAccountsEditMode(false);
          return true;
        }
        closeDrill();
        return true;
      }

      if (drilldown === "budget") {
        if (drillSub) {
          setDrillSub(null);
          setBudgetDetailMonth(null);
          return true;
        }
        if (budgetRenSec) {
          setBudgetRenSec(null);
          return true;
        }
        if (budgetManageSections) {
          setBudgetManageSections(false);
          return true;
        }
        closeDrill();
        return true;
      }

      if (drilldown === "trend" || drilldown === "goals") {
        if (drillSub) {
          setDrillSub(null);
          return true;
        }
        closeDrill();
        return true;
      }

      closeDrill();
      return true;
    });
    return () => sub.remove();
  }, [
    confirmDialog,
    confirmDelete,
    ruleEditor,
    goalWithdrawModal,
    goalModal,
    recModal,
    accModal,
    txModal,
    aiOpen,
    settingsOpen,
    drilldown,
    drillSub,
    accountsDetail,
    accountsEditMode,
    budgetRenSec,
    budgetManageSections,
    closeDrill,
    closeSettingsDrawer,
  ]);

  useEffect(() => {}, [aiMsgs, aiOpen]);

  /** Evita escribir AsyncStorage con el estado inicial antes de terminar la hidratación (borraba secciones y datos guardados). */
  const [storageHydrated, setStorageHydrated] = useState(false);

  /* Persist — cargar primero; solo guardar cuando storageHydrated es true */
  useEffect(() => {
    (async () => {
      try {
        const d =
          (await AsyncStorage.getItem(FINPRO_STORAGE_KEY)) ||
          (await AsyncStorage.getItem("finpro_v5"));
        if (d) {
          const p = JSON.parse(d);
          if (p.txs) setTxs(p.txs);
          if (p.budget) setBudget(p.budget);
          if (p.sections) setSections(p.sections);
          if (p.accounts) setAccounts(p.accounts);
          if (p.goals) setGoals(p.goals);
          if (p.defaultAccount) setDefaultAccount(p.defaultAccount);
          if (p.archivedAccounts) setArchivedAccounts(p.archivedAccounts);
          if (Array.isArray(p.alertRules)) setAlertRules(p.alertRules);
          if (Array.isArray(p.dismissedAlerts))
            setDismissedAlerts(p.dismissedAlerts);
          if (p.archivedSections) setArchivedSections(p.archivedSections);
        }
      } catch (e) {}
      setStorageHydrated(true);
    })();
  }, []);
  useEffect(() => {
    if (!storageHydrated) return;
    (async () => {
      try {
        await AsyncStorage.setItem(
          FINPRO_STORAGE_KEY,
          JSON.stringify({
            txs,
            budget,
            sections,
            accounts,
            goals,
            defaultAccount,
            archivedAccounts,
            alertRules,
            dismissedAlerts,
            archivedSections,
          }),
        );
      } catch (e) {}
    })();
  }, [
    storageHydrated,
    txs,
    budget,
    sections,
    accounts,
    goals,
    defaultAccount,
    archivedAccounts,
    alertRules,
    dismissedAlerts,
    archivedSections,
  ]);

  /** Secciones para clasificar gasto/ingreso (nunca "Transferencias"). */
  const expenseSections = useMemo(
    () => sections.filter((s) => s !== "Transferencias"),
    [sections],
  );

  /* ── Computed ── */
  const tInc = txs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const tExp = txs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const bal = tInc - tExp;
  const savRate = tInc > 0 ? Math.round((bal / tInc) * 100) : 0;
  const bySection = useMemo(
    () =>
      sections.map((s) => ({
        s,
        spent: txs
          .filter((t) => t.type === "expense" && t.section === s)
          .reduce((a, t) => a + t.amount, 0),
        b: budget[s] || 0,
      })),
    [sections, txs, budget],
  );

  /** Filas de presupuesto en inicio / drill: actividad o sección que no es plantilla SECS (p. ej. nueva). */
  const dashboardBudgetRows = useMemo(
    () =>
      bySection.filter(
        (b) =>
          b.s !== "Transferencias" &&
          (b.b > 0 || b.spent > 0 || !SECS.includes(b.s)),
      ),
    [bySection],
  );
  const accountBalMap = {};
  accounts.forEach((a) => {
    accountBalMap[a] = 0;
  });
  txs.forEach((t) => applyTxToAccounts(accountBalMap, t));
  const byAccount = accounts.map((a) => ({ a, bal: accountBalMap[a] || 0 }));

  /* ── Alerts (presupuesto mensual, saldo cuentas, reglas guardadas) ── */
  const alerts = useMemo(() => {
    const balances = {};
    accounts.forEach((a) => {
      balances[a] = 0;
    });
    txs.forEach((t) => applyTxToAccounts(balances, t));
    return computeAlerts({
      monthPrefix: monthKey(),
      sections,
      budget,
      txs,
      accounts,
      balances,
      rules: alertRules,
    }).filter((a) => !dismissedAlerts.includes(a.id));
  }, [txs, accounts, sections, budget, alertRules, dismissedAlerts]);

  /* ── Balance report helpers ── */
  const tfLabel = {
    day: "Hoy",
    week: "Esta semana",
    month: "Este mes",
    quarter: "Trimestre",
    semester: "Semestre",
    year: "Este año",
    all: "Vitalicio",
    custom: "Personalizado",
  };
  const txsForTf = (tf, custom) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (tf === "day") return txs.filter((t) => t.date === today);
    if (tf === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return txs.filter((t) => t.date >= d.toISOString().slice(0, 10));
    }
    if (tf === "month")
      return txs.filter((t) => t.date.startsWith(monthPrefix));
    if (tf === "quarter") {
      const qStart = Math.floor(m / 3) * 3;
      const qMonths = [qStart + 1, qStart + 2, qStart + 3].map((mo) =>
        `${y}-${String(mo).padStart(2, "0")}`,
      );
      return txs.filter((t) => {
        const pref = t.date.slice(0, 7);
        return qMonths.some((qm) => pref === qm);
      });
    }
    if (tf === "semester") {
      const moLow = m < 6 ? 1 : 7;
      const moHigh = m < 6 ? 6 : 12;
      return txs.filter((t) => {
        if (!t.date.startsWith(String(y))) return false;
        const mo = parseInt(t.date.slice(5, 7), 10);
        return mo >= moLow && mo <= moHigh;
      });
    }
    if (tf === "year") return txs.filter((t) => t.date.startsWith(String(y)));
    if (tf === "custom" && custom)
      return txs.filter((t) => t.date >= custom.from && t.date <= custom.to);
    return txs;
  };
  const balTxs = txsForTf(balTf, balCustom);
  const balInc = balTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const balExp = balTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  /** Total acumulado en metas al cierre del periodo del reporte (transferencias meta ↔ cuenta). */
  const balMetasTotal = totalGoalSavedAsOfDate(
    goals,
    txs,
    reportAsOfEndDate(balTf, balCustom),
  );

  /**
   * Últimos 4 meses: ingresos/egresos por transacciones.
   * sav = suma del ahorrado en **todas las metas** al último día de ese mes (o hoy si es el mes actual).
   */
  const chartMonthData = useMemo(() => {
    return rollingChartMonthBuckets(4).map(({ key: mk, label }) => {
      const inc = txs
        .filter((t) => t.type === "income" && t.date.startsWith(mk))
        .reduce((s, t) => s + t.amount, 0);
      const exp = txs
        .filter((t) => t.type === "expense" && t.date.startsWith(mk))
        .reduce((s, t) => s + t.amount, 0);
      const asOf = chartMonthEndDate(mk);
      const sav = totalGoalSavedAsOfDate(goals, txs, asOf);
      return { label, inc, exp, sav };
    });
  }, [txs, goals]);
  const pieData = [
    balFilters.inc && balInc > 0
      ? { label: "Ingresos", value: balInc, color: C.green }
      : null,
    balFilters.exp && balExp > 0
      ? { label: "Egresos", value: balExp, color: C.red }
      : null,
    balFilters.sav && balMetasTotal > 0
      ? {
          label: "Total en metas (al cierre)",
          value: balMetasTotal,
          color: C.gold,
          legendAmount: balMetasTotal,
        }
      : null,
  ].filter(Boolean);

  /* ── TX actions ── */
  const revertTxGoalEffects = (t) => {
    if (!t || t.type !== "transfer") return;
    if (t.transferToGoalId)
      setGoals((g) =>
        g.map((x) =>
          x.id === t.transferToGoalId
            ? { ...x, saved: Math.max(0, x.saved - t.amount) }
            : x,
        ),
      );
    if (t.transferFromGoalId)
      setGoals((g) =>
        g.map((x) =>
          x.id === t.transferFromGoalId
            ? { ...x, saved: x.saved + t.amount }
            : x,
        ),
      );
  };
  const openTx = (t, mode) => {
    if (mode === "delete") {
      setConfirmDelete(t.id);
      return;
    }
    const leg =
      t.type === "transfer"
        ? t.transferFromGoalId != null
          ? "from_goal"
          : t.transferToGoalId != null
            ? "to_goal"
            : "to_account"
        : "to_account";
    const base = {
      ...t,
      type: t.type || "expense",
      amountDigits: digitsFromNumber(t.amount),
      transferLeg: leg,
      transferToAccount: t.transferToAccount || "",
      transferToGoalId: t.transferToGoalId ?? null,
      transferFromGoalId: t.transferFromGoalId ?? null,
      section: t.section || sections[0],
      recurring: !!t.recurring,
      freq: t.freq || "monthly",
    };
    setForm(base);
    setTxModal({ tx: t, mode });
  };
  const openNew = () => {
    setForm(blankForm());
    setTxModal({ tx: null, mode: "new" });
  };
  const saveTx = () => {
    const amt = parseMoneyDigits(form.amountDigits);
    if (Number.isNaN(amt) || amt <= 0) return;
    if (form.type === "transfer") {
      const d = (form.desc || "").trim() || "Transferencia";
      if (form.transferLeg === "to_account") {
        if (!form.transferToAccount || form.transferToAccount === form.account)
          return;
        const patch = {
          type: "transfer",
          amount: amt,
          desc: d,
          section: "Transferencias",
          account: form.account,
          transferToAccount: form.transferToAccount,
          transferToGoalId: null,
          transferFromGoalId: null,
          date: form.date,
          recurring: false,
          freq: "",
          notes: form.notes || "",
        };
        if (txModal?.mode === "edit") {
          revertTxGoalEffects(txModal.tx);
          setTxs((p) =>
            p.map((x) => (x.id === txModal.tx.id ? { ...patch, id: x.id } : x)),
          );
        } else setTxs((p) => [...p, { ...patch, id: Date.now() }]);
      } else if (form.transferLeg === "to_goal") {
        if (!form.transferToGoalId) return;
        const patch = {
          type: "transfer",
          amount: amt,
          desc: d,
          section: "Transferencias",
          account: form.account,
          transferToAccount: null,
          transferToGoalId: form.transferToGoalId,
          transferFromGoalId: null,
          date: form.date,
          recurring: false,
          freq: "",
          notes: form.notes || "",
        };
        if (txModal?.mode === "edit") {
          revertTxGoalEffects(txModal.tx);
          setTxs((p) =>
            p.map((x) => (x.id === txModal.tx.id ? { ...patch, id: x.id } : x)),
          );
        } else {
          setTxs((p) => [...p, { ...patch, id: Date.now() }]);
          setGoals((g) =>
            g.map((x) =>
              x.id === form.transferToGoalId
                ? { ...x, saved: x.saved + amt }
                : x,
            ),
          );
        }
        if (txModal?.mode === "edit")
          setGoals((g) =>
            g.map((x) =>
              x.id === form.transferToGoalId
                ? { ...x, saved: x.saved + amt }
                : x,
            ),
          );
      } else if (form.transferLeg === "from_goal") {
        if (!form.transferFromGoalId) return;
        const oldTx = txModal?.mode === "edit" ? txModal.tx : null;
        const gRow = goals.find((x) => x.id === form.transferFromGoalId);
        let avail = gRow ? gRow.saved : 0;
        if (
          oldTx?.type === "transfer" &&
          oldTx.transferFromGoalId === form.transferFromGoalId
        )
          avail += oldTx.amount;
        if (avail < amt) return;
        const patch = {
          type: "transfer",
          amount: amt,
          desc: d,
          section: "Transferencias",
          account: form.account,
          transferToAccount: null,
          transferToGoalId: null,
          transferFromGoalId: form.transferFromGoalId,
          date: form.date,
          recurring: false,
          freq: "",
          notes: form.notes || "",
        };
        if (txModal?.mode === "edit") {
          revertTxGoalEffects(txModal.tx);
          setTxs((p) =>
            p.map((x) => (x.id === txModal.tx.id ? { ...patch, id: x.id } : x)),
          );
          setGoals((g) =>
            g.map((x) =>
              x.id === form.transferFromGoalId
                ? { ...x, saved: x.saved - amt }
                : x,
            ),
          );
        } else {
          setTxs((p) => [...p, { ...patch, id: Date.now() }]);
          setGoals((g) =>
            g.map((x) =>
              x.id === form.transferFromGoalId
                ? { ...x, saved: x.saved - amt }
                : x,
            ),
          );
        }
      }
      setTxModal(null);
      return;
    }
    const trimmed = (form.desc || "").trim();
    if (!trimmed) return;
    const t = {
      type: form.type,
      amount: amt,
      desc: trimmed,
      section: form.section,
      account: form.account,
      date: form.date,
      recurring: !!form.recurring,
      freq: form.recurring ? form.freq : "",
      notes: form.notes || "",
      transferToAccount: null,
      transferToGoalId: null,
      transferFromGoalId: null,
    };
    if (txModal?.mode === "edit")
      setTxs((p) =>
        p.map((x) => (x.id === txModal.tx.id ? { ...t, id: x.id } : x)),
      );
    else setTxs((p) => [...p, { ...t, id: Date.now() }]);
    setTxModal(null);
  };
  const doDelete = (id) => {
    const t = txs.find((x) => x.id === id);
    revertTxGoalEffects(t);
    setTxs((p) => p.filter((x) => x.id !== id));
    setConfirmDelete(null);
    setTxModal(null);
  };

  /* ── Account actions ── */
  const saveAcc = () => {
    if (!accForm.trim()) return;
    if (accModal?.mode === "add") {
      if (!accounts.includes(accForm.trim()))
        setAccounts((p) => [...p, accForm.trim()]);
    } else if (accModal?.mode === "edit") {
      setAccounts((p) =>
        p.map((a) => (a === accModal.acc ? accForm.trim() : a)),
      );
      if (defaultAccount === accModal.acc) setDefaultAccount(accForm.trim());
    }
    setAccModal(null);
    setAccForm("");
  };
  const archiveAcc = (acc) => {
    setConfirmDialog({
      msg: "Archivar esta cuenta? Los movimientos se conservan.",
      confirmLabel: "Archivar",
      onConfirm: () => {
        setAccounts((p) => p.filter((a) => a !== acc));
        setArchivedAccounts((p) => [...p, acc]);
        if (defaultAccount === acc)
          setDefaultAccount(accounts.find((a) => a !== acc) || "");
        setAccModal(null);
      },
    });
  };
  const deleteAcc = (acc) => {
    setConfirmDialog({
      msg: "Eliminar cuenta del listado activo? Si tiene movimientos, permaneceran asociados al nombre.",
      confirmLabel: "Eliminar",
      onConfirm: () => {
        setAccounts((p) => p.filter((a) => a !== acc));
        if (defaultAccount === acc)
          setDefaultAccount(accounts.find((a) => a !== acc) || "");
        setAccModal(null);
      },
    });
  };
  const restoreAcc = (acc) => {
    setArchivedAccounts((p) => p.filter((a) => a !== acc));
    setAccounts((p) => [...p, acc]);
  };

  /* ── Recurring actions ── */
  const recTxs = txs.filter((t) => t.recurring);
  const saveRec = () => {
    const amt = parseMoneyDigits(recForm.amountDigits);
    if (Number.isNaN(amt) || amt <= 0 || !(recForm.desc || "").trim()) return;
    const { amountDigits: _ad, ...rf } = recForm;
    const t = { ...rf, amount: amt, recurring: true };
    if (recModal?.mode === "edit")
      setTxs((p) =>
        p.map((x) => (x.id === recModal.tx.id ? { ...t, id: x.id } : x)),
      );
    else setTxs((p) => [...p, { ...t, id: Date.now() }]);
    setRecModal(null);
  };
  const deleteRec = (id) =>
    setConfirmDialog({
      msg: "Eliminar este gasto recurrente?",
      onConfirm: () => {
        setTxs((p) => p.filter((t) => t.id !== id));
      },
    });
  const saveGoalFromModal = () => {
    const t = parseMoneyDigits(goalForm.targetDigits);
    if (!(goalForm.name || "").trim() || Number.isNaN(t) || t <= 0) return;
    if (goalModal?.mode === "edit" && goalModal.goal)
      setGoals((p) =>
        p.map((x) =>
          x.id === goalModal.goal.id
            ? {
                ...x,
                name: goalForm.name.trim(),
                target: t,
                deadline: goalForm.deadline,
                color: goalForm.color,
              }
            : x,
        ),
      );
    else
      setGoals((p) => [
        ...p,
        {
          id: Date.now(),
          name: goalForm.name.trim(),
          target: t,
          saved: 0,
          deadline: goalForm.deadline,
          color: goalForm.color,
        },
      ]);
    setGoalModal(null);
  };
  const removeGoalConfirmed = (id) =>
    setConfirmDialog({
      msg: "Eliminar esta meta? El dinero ahorrado dejara de mostrarse aqui (las transacciones en el listado se conservan).",
      onConfirm: () => setGoals((p) => p.filter((x) => x.id !== id)),
    });
  const applyGoalDeposit = (g) => {
    const v = parseMoneyDigits(goalInputs[g.id]);
    if (Number.isNaN(v) || v <= 0) return;
    const acc = goalAddAcc[g.id] || defaultAccount;
    const tid = Date.now();
    setTxs((p) => [
      ...p,
      {
        id: tid,
        type: "transfer",
        amount: v,
        desc: "Ahorro: " + g.name,
        section: "Transferencias",
        account: acc,
        transferToAccount: null,
        transferToGoalId: g.id,
        transferFromGoalId: null,
        date: todayStr(),
        recurring: false,
        freq: "",
        notes: "",
      },
    ]);
    setGoals((p) =>
      p.map((x) => (x.id === g.id ? { ...x, saved: x.saved + v } : x)),
    );
    setGoalInputs((p) => ({ ...p, [g.id]: "" }));
  };
  const saveGoalWithdraw = () => {
    if (goalWithdrawModal == null) return;
    const amt = parseMoneyDigits(goalWithdrawForm.amountDigits);
    const g = goals.find((x) => x.id === goalWithdrawModal);
    if (Number.isNaN(amt) || amt <= 0 || !g || g.saved < amt) return;
    setTxs((p) => [
      ...p,
      {
        id: Date.now(),
        type: "transfer",
        amount: amt,
        desc: "Retiro: " + g.name,
        section: "Transferencias",
        account: goalWithdrawForm.account,
        transferToAccount: null,
        transferToGoalId: null,
        transferFromGoalId: g.id,
        date: todayStr(),
        recurring: false,
        freq: "",
        notes: "",
      },
    ]);
    setGoals((p) =>
      p.map((x) => (x.id === g.id ? { ...x, saved: x.saved - amt } : x)),
    );
    setGoalWithdrawModal(null);
    setGoalWithdrawForm({ amountDigits: "", account: defaultAccount });
  };

  /* ── Calendar ── */
  const calFirst = () => {
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay();
    return d === 0 ? 6 : d - 1;
  };
  const calDays = () =>
    new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
  const txOnDay = (d) => {
    const ds =
      calMonth.getFullYear() +
      "-" +
      String(calMonth.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d).padStart(2, "0");
    return txs.filter((t) => t.date === ds);
  };

  /* ── Filters ── */
  const filteredTxs = txs
    .filter((t) => {
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterAcc !== "all" && t.account !== filterAcc) return false;
      if (filterSec !== "all" && t.section !== filterSec) return false;
      if (
        search &&
        !t.desc.toLowerCase().includes(search.toLowerCase()) &&
        !t.section.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  /* ── AI ── */

  const sendAi = async () => {
    if ((!aiInput.trim() && !aiImage) || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput("");
    setAiMsgs((p) => [
      ...p,
      { role: "user", text: msg + (aiImage ? "  [imagen adjunta]" : "") },
    ]);
    setAiLoading(true);
    const sys =
      "Eres un asistente financiero. Balance: " +
      fmt(bal) +
      " | Ingresos: " +
      fmt(tInc) +
      " | Egresos: " +
      fmt(tExp) +
      "\nSecciones: " +
      sections.join(", ") +
      "\nCuentas: " +
      accounts.join(", ") +
      "\nHoy: " +
      todayStr() +
      '\n\nSi el usuario quiere REGISTRAR responde con JSON:\n{"action":"add_tx","type":"income|expense","amount":0,"desc":"...","section":"...","account":"...","date":"YYYY-MM-DD","notes":""}\nResponde en espanol, breve.';
    try {
      const uc = aiImage
        ? [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: aiImage.type,
                data: aiImage.data,
              },
            },
            {
              type: "text",
              text: msg || "Analiza este ticket y registra el gasto",
            },
          ]
        : msg;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          system: sys,
          messages: [{ role: "user", content: uc }],
        }),
      });
      const data = await res.json();
      const raw =
        (data.content && data.content[0] && data.content[0].text) ||
        "No pude procesar.";
      const jm = raw.match(/\{[\s\S]*?"action"\s*:\s*"add_tx"[\s\S]*?\}/);
      if (jm) {
        try {
          const tx = JSON.parse(jm[0]);
          const nT = {
            id: Date.now(),
            type: tx.type,
            amount: parseFloat(tx.amount),
            desc: tx.desc,
            section: tx.section,
            account: tx.account || defaultAccount,
            date: tx.date || todayStr(),
            recurring: false,
            freq: "",
            notes: tx.notes || "",
          };
          setTxs((p) => [...p, nT]);
          const clean = raw
            .replace(jm[0], "")
            .replace(/```json|```/g, "")
            .trim();
          setAiMsgs((p) => [
            ...p,
            { role: "assistant", text: clean || "Registrado.", highlight: nT },
          ]);
        } catch (e) {
          setAiMsgs((p) => [...p, { role: "assistant", text: raw }]);
        }
      } else setAiMsgs((p) => [...p, { role: "assistant", text: raw }]);
    } catch (e) {
      setAiMsgs((p) => [
        ...p,
        { role: "assistant", text: "Error conectando." },
      ]);
    }
    setAiImage(null);
    setAiLoading(false);
  };
  const handleImagePick = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });
    if (!r.canceled && r.assets[0]?.base64) {
      const a = r.assets[0];
      setAiImage({ data: a.base64 || "", type: a.mimeType || "image/jpeg" });
    }
  };

  const trendData = [
    { inc: 20000, exp: 15600, label: "Feb" },
    { inc: 21000, exp: 14350, label: "Mar" },
    { inc: tInc, exp: tExp, label: "Abr" },
  ];
  const maxTrend = Math.max(...trendData.map((m) => Math.max(m.inc, m.exp)), 1);
  const TABS = [
    { id: "dashboard", sym: "⊞", label: "Inicio" },
    { id: "transactions", sym: "↕", label: "Gastos" },
    { id: "goals", sym: "◎", label: "Metas" },
    { id: "reports", sym: "∷", label: "Reportes" },
    { id: "calendar", sym: "▦", label: "Calendario" },
  ];

  /* ─────────── DRILLDOWN PANELS ─────────── */

  /* BALANCE REPORT — tipo de componente estable (useMemo) para no reiniciar scroll horizontal al cambiar balTf */
  const DrillBalance = useMemo(() => {
    function DrillBalanceInner() {
      const p = balanceDrillPropsRef.current;
      if (!p) return null;
      const {
        closeDrill,
        tfLabel,
        balTf,
        setBalTf,
        pl,
        C,
        iS,
        mSf,
        cS,
        balCustom,
        setBalCustom,
        balInc,
        balExp,
        balMetasTotal,
        fmt,
        balChart,
        setBalChart,
        balFilters,
        setBalFilters,
        pieData,
        chartMonthData,
        balTxs,
        goals,
      } = p;
      return (
        <DrillScreen title="Reporte de balance" onBack={closeDrill}>
      <GHScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 4 }}
        contentContainerStyle={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingBottom: 10,
        }}
      >
        {Object.entries(tfLabel).map(([k, l]) => (
          <Pressable
            key={k}
            style={pl(balTf === k)}
            onPress={() => setBalTf(k)}
          >
            <Text style={{ fontSize: 12, color: pl(balTf === k).color }}>
              {l}
            </Text>
          </Pressable>
        ))}
      </GHScrollView>
      {balTf === "custom" && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <View style={{ flex: 1, minWidth: 120 }}>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Desde
            </Text>
            <TextInput
              value={balCustom.from}
              onChangeText={(v) => setBalCustom((p) => ({ ...p, from: v }))}
              style={iS}
            />
          </View>
          <View style={{ flex: 1, minWidth: 120 }}>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
              Hasta
            </Text>
            <TextInput
              value={balCustom.to}
              onChangeText={(v) => setBalCustom((p) => ({ ...p, to: v }))}
              style={iS}
            />
          </View>
        </View>
      )}
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
            Ingresos
          </Text>
          <Text style={{ fontSize: 16, fontWeight: 500, color: C.green }}>
            {fmt(balInc)}
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
            Egresos
          </Text>
          <Text style={{ fontSize: 16, fontWeight: 500, color: C.red }}>
            {fmt(balExp)}
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
            En metas
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: C.gold,
            }}
          >
            {fmt(balMetasTotal)}
          </Text>
        </View>
      </View>
      {/* Chart type */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {[
          ["pie", "Pastel"],
          ["bar", "Barras"],
          ["line", "Lineas"],
        ].map(([k, l]) => (
          <Pressable
            key={k}
            style={{
              flexGrow: 1,
              flexBasis: "26%",
              minWidth: 88,
              paddingVertical: 9,
              paddingHorizontal: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: balChart === k ? C.blue : C.border,
              backgroundColor: balChart === k ? C.blueBg : C.bg3,
            }}
            onPress={() => setBalChart(k)}
          >
            <Text
              style={{
                color: balChart === k ? C.blue : C.muted,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {l}
            </Text>
          </Pressable>
        ))}
      </View>
      {/* Filters */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {[
          ["inc", "Ingresos", C.green],
          ["exp", "Egresos", C.red],
          ["sav", "En metas", C.gold],
        ].map(([k, l, col]) => (
          <Pressable
            key={k}
            style={{
              flexGrow: 1,
              flexBasis: "28%",
              minWidth: 96,
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: balFilters[k] ? col : C.border,
              backgroundColor: balFilters[k] ? col + "22" : C.bg3,
            }}
            onPress={() => setBalFilters((p) => ({ ...p, [k]: !p[k] }))}
          >
            <Text
              style={{
                color: balFilters[k] ? col : C.muted,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {l}
            </Text>
          </Pressable>
        ))}
      </View>
      {/* Chart */}
      <View
        style={{
          ...cS,
          justifyContent: "center",
          alignItems: "stretch",
          alignSelf: "stretch",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          minHeight: 180,
          marginBottom: 14,
        }}
      >
        {balChart === "pie" && (
          <View
            style={{
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              width: "100%",
            }}
          >
            <PieChart data={pieData} size={Math.min(160, 150)} />
            <View
              style={{ flexDirection: "column", gap: 8, alignSelf: "stretch" }}
            >
              {pieData.map((d) => (
                <View
                  key={d.label}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      backgroundColor: d.color,
                    }}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.text, fontSize: 12 }}>
                      {d.label}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      {fmt(d.legendAmount !== undefined ? d.legendAmount : d.value)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        {balChart === "bar" && (
          <View style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
            <BarChart
              height={160}
              data={chartMonthData.map((d) => ({
                label: d.label,
                inc: balFilters.inc ? d.inc : undefined,
                exp: balFilters.exp ? d.exp : undefined,
                sav: balFilters.sav ? d.sav : undefined,
              }))}
            />
          </View>
        )}
        {balChart === "line" && (
          <View style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
            <LineChart
              height={160}
              labels={chartMonthData.map((d) => d.label)}
              series={[
                balFilters.inc
                  ? {
                      label: "Ingresos",
                      color: C.green,
                      data: chartMonthData.map((d) => d.inc),
                    }
                  : null,
                balFilters.exp
                  ? {
                      label: "Egresos",
                      color: C.red,
                      data: chartMonthData.map((d) => d.exp),
                    }
                  : null,
                balFilters.sav
                  ? {
                      label: "En metas",
                      color: C.gold,
                      data: chartMonthData.map((d) => d.sav),
                    }
                  : null,
              ].filter(Boolean)}
            />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
                marginTop: 8,
              }}
            >
              {[
                ["inc", "Ingresos", C.green],
                ["exp", "Egresos", C.red],
                ["sav", "En metas", C.gold],
              ]
                .filter(([k]) => balFilters[k])
                .map(([k, l, col]) => (
                  <View
                    key={k}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <View
                      style={{
                        width: 16,
                        height: 2,
                        backgroundColor: col,
                        borderRadius: 2,
                      }}
                    />
                    <Text style={{ fontSize: 11, color: C.muted }}>{l}</Text>
                  </View>
                ))}
            </View>
          </View>
        )}
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
          Transacciones del periodo
        </Text>
        <TxList
          txs={[...balTxs].sort((a, b) => b.date.localeCompare(a.date))}
          goals={goals}
          emptyMsg="Sin transacciones en este periodo"
        />
      </View>
    </DrillScreen>
      );
    }
    return DrillBalanceInner;
  }, []);

  /* ACCOUNTS */
  const DrillAccounts = () => {
    if (accountsDetail) {
      const accTxs = [...txs]
        .filter((t) => {
          if (t.type === "transfer") {
            if (t.transferFromGoalId != null)
              return t.account === accountsDetail;
            return (
              t.account === accountsDetail ||
              t.transferToAccount === accountsDetail
            );
          }
          return t.account === accountsDetail;
        })
        .sort((a, b) => b.date.localeCompare(a.date));
      const aInc = accTxs
        .filter((t) => t.type === "income" && t.account === accountsDetail)
        .reduce((s, t) => s + t.amount, 0);
      const aExp = accTxs
        .filter((t) => t.type === "expense" && t.account === accountsDetail)
        .reduce((s, t) => s + t.amount, 0);
      const aBal = byAccount.find((x) => x.a === accountsDetail)?.bal ?? 0;
      return (
        <DrillScreen
          title={accountsDetail}
          onBack={() => setAccountsDetail(null)}
        >
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
                Ingresos
              </Text>
              <Text style={{ fontWeight: 500, color: C.green }}>
                {fmt(aInc)}
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
                Egresos
              </Text>
              <Text style={{ fontWeight: 500, color: C.red }}>{fmt(aExp)}</Text>
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
                Balance
              </Text>
              <Text
                style={{ fontWeight: 500, color: aBal >= 0 ? C.green : C.red }}
              >
                {fmt(aBal)}
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
              Movimientos
            </Text>
            <TxList txs={accTxs} goals={goals} />
          </View>
        </DrillScreen>
      );
    }
    return (
      <DrillScreen
        title="Cuentas"
        onBack={() => {
          if (accountsEditMode) {
            setAccountsEditMode(false);
            return;
          }
          closeDrill();
        }}
        action={
          <Pressable
            onPress={() => setAccountsEditMode((p) => !p)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: accountsEditMode ? C.blue : C.border,
              backgroundColor: accountsEditMode ? C.blueBg : C.bg3,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: accountsEditMode ? C.blue : C.muted,
              }}
            >
              {accountsEditMode ? "Listo" : "Editar"}
            </Text>
          </Pressable>
        }
      >
        <View style={{ flexDirection: "column", gap: 10 }}>
          {accountsEditMode && (
            <Pressable
              onPress={() => {
                setAccForm("");
                setAccModal({ mode: "add" });
              }}
              style={{
                width: "100%",
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.green,
                backgroundColor: C.greenBg,
              }}
            >
              <Text
                style={{ fontSize: 13, color: C.green, textAlign: "center" }}
              >
                + Agregar cuenta
              </Text>
            </Pressable>
          )}
          {accounts.map((a) => {
            const ab = byAccount.find((x) => x.a === a)?.bal ?? 0;
            const isDef = defaultAccount === a;
            return (
              <Pressable
                key={a}
                style={{ ...cS, borderColor: isDef ? C.green : C.border }}
                onPress={() => !accountsEditMode && setAccountsDetail(a)}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                      minWidth: 0,
                      flexWrap: "wrap",
                    }}
                  >
                    <Text
                      style={{ fontSize: 14, fontWeight: 500, color: C.text }}
                      numberOfLines={1}
                    >
                      {a}
                    </Text>
                    {isDef && (
                      <Text
                        style={{
                          fontSize: 10,
                          paddingVertical: 2,
                          paddingHorizontal: 8,
                          borderRadius: 10,
                          backgroundColor: C.greenBg,
                          color: C.green,
                          borderWidth: 1,
                          borderColor: C.greenBorder,
                        }}
                      >
                        Default
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      flexShrink: 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: 500,
                        color: ab >= 0 ? C.green : C.red,
                      }}
                    >
                      {ab < 0 ? "-" : ""}
                      {fmt(ab)}
                    </Text>
                    {!accountsEditMode && (
                      <Text style={{ color: C.hint, fontSize: 14 }}>›</Text>
                    )}
                  </View>
                </View>
                {accountsEditMode && (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {!isDef && (
                      <Pressable
                        onPress={() => setDefaultAccount(a)}
                        style={{
                          flex: 1,
                          paddingVertical: 6,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: C.green,
                          backgroundColor: C.greenBg,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: C.green,
                            textAlign: "center",
                          }}
                        >
                          Default
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => {
                        setAccForm(a);
                        setAccModal({ mode: "edit", acc: a });
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: C.border,
                        backgroundColor: C.bg3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          textAlign: "center",
                        }}
                      >
                        Editar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => archiveAcc(a)}
                      style={{
                        flex: 1,
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: C.gold,
                        backgroundColor: C.goldBg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.gold,
                          textAlign: "center",
                        }}
                      >
                        Archivar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => deleteAcc(a)}
                      style={{
                        flex: 1,
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: C.redBorder,
                        backgroundColor: C.redBg,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.red,
                          textAlign: "center",
                        }}
                      >
                        Eliminar
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          })}
          {archivedAccounts.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.85,
                  marginBottom: 8,
                }}
              >
                Archivadas
              </Text>
              {archivedAccounts.map((a) => (
                <View
                  key={a}
                  style={{
                    ...cS,
                    opacity: 0.5,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                    gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 14, color: C.muted }}>{a}</Text>
                  <Pressable
                    onPress={() => restoreAcc(a)}
                    style={{
                      paddingVertical: 5,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.border,
                      backgroundColor: C.bg3,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: C.muted }}>
                      Restaurar
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </DrillScreen>
    );
  };

  /* TREND */
  const DrillTrend = () => {
    const months = [
      { key: "2025-02", label: "Febrero 2025" },
      { key: "2025-03", label: "Marzo 2025" },
      { key: "2025-04", label: "Abril 2025" },
    ];
    if (drillSub) {
      const mTxs = [...txs]
        .filter((t) => t.date.startsWith(drillSub.key))
        .sort((a, b) => b.date.localeCompare(a.date));
      const mI = mTxs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const mE = mTxs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
      return (
        <DrillScreen title={drillSub.label} onBack={() => setDrillSub(null)}>
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
                Ingresos
              </Text>
              <Text style={{ fontWeight: 500, color: C.green }}>{fmt(mI)}</Text>
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
                Egresos
              </Text>
              <Text style={{ fontWeight: 500, color: C.red }}>{fmt(mE)}</Text>
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
                Balance
              </Text>
              <Text
                style={{
                  fontWeight: 500,
                  color: mI - mE >= 0 ? C.green : C.red,
                }}
              >
                {fmt(mI - mE)}
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
              Transacciones
            </Text>
            <TxList txs={mTxs} goals={goals} />
          </View>
        </DrillScreen>
      );
    }
    return (
      <DrillScreen title="Tendencia mensual" onBack={closeDrill}>
        {months.map((m) => {
          const mI = txs
            .filter((t) => t.date.startsWith(m.key) && t.type === "income")
            .reduce((s, t) => s + t.amount, 0);
          const mE = txs
            .filter((t) => t.date.startsWith(m.key) && t.type === "expense")
            .reduce((s, t) => s + t.amount, 0);
          const mB = mI - mE;
          return (
            <Pressable
              key={m.key}
              style={{ ...cS, marginBottom: 10 }}
              onPress={() => setDrillSub(m)}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    flex: 1,
                    minWidth: 0,
                    color: C.text,
                  }}
                  numberOfLines={2}
                >
                  {m.label}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: mB >= 0 ? C.green : C.red,
                    flexShrink: 0,
                  }}
                >
                  {mB >= 0 ? "+" : "-"}
                  {fmt(mB)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View
                  style={{
                    flex: 1,
                    minWidth: 120,
                    backgroundColor: C.bg3,
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, color: C.muted }}>Ingresos</Text>
                  <Text
                    style={{ fontSize: 13, color: C.green, fontWeight: 500 }}
                  >
                    {fmt(mI)}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    minWidth: 120,
                    backgroundColor: C.bg3,
                    borderRadius: 8,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, color: C.muted }}>Egresos</Text>
                  <Text style={{ fontSize: 13, color: C.red, fontWeight: 500 }}>
                    {fmt(mE)}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  textAlign: "right",
                  marginTop: 8,
                  fontSize: 11,
                  color: C.hint,
                }}
              >
                Toca para ver detalle ›
              </Text>
            </Pressable>
          );
        })}
      </DrillScreen>
    );
  };

  /* BUDGET */
  const DrillBudget = () => {
    const budgetMonthOpts = [
      { key: null, label: "Todos" },
      { key: "2025-02", label: "Feb 25" },
      { key: "2025-03", label: "Mar 25" },
      { key: "2025-04", label: "Abr 25" },
    ];
    const addBudgetSection = () => {
      const n = (budgetNewSecName || "").trim();
      if (!n || sections.includes(n)) return;
      setSections((p) => [...p, n]);
      setBudget((b) => ({ ...b, [n]: 0 }));
      setBudgetNewSecName("");
    };
    const archiveBudgetSection = (s) => {
      if (s === "Transferencias" || s === "Otros") return;
      setConfirmDialog({
        msg:
          'Archivar seccion "' +
          s +
          '"? Dejara de aparecer en presupuesto activo.',
        confirmLabel: "Archivar",
        onConfirm: () => {
          setSections((p) => p.filter((x) => x !== s));
          setArchivedSections((p) => [...p, s]);
          setBudget((b) => {
            const o = { ...b };
            delete o[s];
            return o;
          });
        },
      });
    };
    const deleteBudgetSection = (s) => {
      if (s === "Transferencias" || sections.length < 2) return;
      setConfirmDialog({
        msg:
          'Eliminar "' +
          s +
          '"? Las transacciones de esta seccion pasaran a Otros.',
        confirmLabel: "Eliminar",
        onConfirm: () => {
          setTxs((p) =>
            p.map((t) => (t.section === s ? { ...t, section: "Otros" } : t)),
          );
          setSections((p) => p.filter((x) => x !== s));
          setBudget((b) => {
            const o = { ...b };
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
        p.map((t) => (t.section === oldName ? { ...t, section: nn } : t)),
      );
      setGoals((p) =>
        p.map((g) => (g.name === oldName ? { ...g, name: nn } : g)),
      );
      setBudgetRenSec(null);
    };
    if (drillSub) {
      const secTxs = [...txs]
        .filter(
          (t) =>
            t.type === "expense" &&
            t.section === drillSub &&
            (!budgetDetailMonth || t.date.startsWith(budgetDetailMonth)),
        )
        .sort((a, b) => b.date.localeCompare(a.date));
      const total = secTxs.reduce((s, t) => s + t.amount, 0);
      const bgt = budget[drillSub] || 0;
      return (
        <DrillScreen
          title={drillSub}
          onBack={() => {
            setDrillSub(null);
            setBudgetDetailMonth(null);
          }}
        >
          <GHScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
            contentContainerStyle={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingBottom: 4,
            }}
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
          </GHScrollView>
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
                Gastado
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
                Presupuesto
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
                {total > bgt ? "Excedido" : "Disponible"}
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
              Transacciones
            </Text>
            <TxList
              txs={secTxs}
              goals={goals}
              emptyMsg="Sin gastos en esta categoria"
            />
          </View>
        </DrillScreen>
      );
    }
    return (
      <DrillScreen
        title="Presupuesto vs. real"
        onBack={() => {
          if (budgetRenSec) {
            setBudgetRenSec(null);
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
              {budgetManageSections ? "Listo" : "Editar secciones"}
            </Text>
          </Pressable>
        }
      >
        {budgetManageSections && (
          <View style={{ marginBottom: 16 }}>
            {budgetRenSec && (
              <View style={{ ...cS, marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                  Renombrar "{budgetRenSec}"
                </Text>
                <TextInput
                  value={budgetRenSecText}
                  onChangeText={setBudgetRenSecText}
                  style={{ ...iS, marginBottom: 10 }}
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
                      Guardar
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
                      Cancelar
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <TextInput
                value={budgetNewSecName}
                onChangeText={setBudgetNewSecName}
                style={{ flex: 1, ...iS }}
              />
              <Pressable
                onPress={addBudgetSection}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: C.green,
                }}
              >
                <Text style={{ color: C.onPrimary, fontWeight: "500" }}>+</Text>
              </Pressable>
            </View>
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
                        Renombrar
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
                        Archivar
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
                        Eliminar
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            {archivedSections.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  Archivadas
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
                        Restaurar
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
                      {Math.round(pct)}% utilizado
                    </Text>
                    <Text
                      style={{ fontSize: 11, color: over ? C.red : C.green }}
                    >
                      {over
                        ? "Excedido: " + fmt(b.spent - b.b)
                        : "Disponible: " + fmt(b.b - b.spent)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
      </DrillScreen>
    );
  };

  /* GOALS */
  const DrillGoals = () => {
    if (drillSub) {
      const g = goals.find((x) => x.id === drillSub);
      if (!g) return null;
      const gTxs = [...txs]
        .filter(
          (t) =>
            (t.type === "transfer" &&
              (t.transferToGoalId === g.id || t.transferFromGoalId === g.id)) ||
            t.section === g.name ||
            t.notes?.includes(g.name),
        )
        .sort((a, b) => b.date.localeCompare(a.date));
      const pctNum = Math.round((g.saved / g.target) * 100);
      const barW = Math.min(100, (g.saved / g.target) * 100);
      const surplus = g.saved > g.target ? g.saved - g.target : 0;
      return (
        <DrillScreen title={g.name} onBack={() => setDrillSub(null)}>
          <View
            style={{
              height: 8,
              backgroundColor: C.bg3,
              borderRadius: 6,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: barW + "%",
                height: "100%",
                backgroundColor: g.color,
                borderRadius: 6,
              }}
            />
          </View>
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
                Ahorrado
              </Text>
              <Text style={{ fontWeight: 500, color: g.color }}>
                {fmt(g.saved)}
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
                Objetivo
              </Text>
              <Text style={{ fontWeight: 500, color: C.text }}>
                {fmt(g.target)}
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
                Avance
              </Text>
              <Text style={{ fontWeight: 500, color: g.color }}>{pctNum}%</Text>
            </View>
          </View>
          {surplus > 0 && (
            <View
              style={{
                padding: 12,
                backgroundColor: C.greenBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.greenBorder,
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 13, color: C.green, fontWeight: 500 }}>
                Superavit: +{fmt(surplus)} sobre la meta
              </Text>
            </View>
          )}
          <View style={cS}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: 500,
                marginBottom: 4,
                color: C.text,
              }}
            >
              Movimientos vinculados
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
              Transferencias a/desde la meta y coincidencias por nota o seccion
            </Text>
            <TxList
              txs={gTxs}
              goals={goals}
              emptyMsg="No hay movimientos vinculados"
            />
          </View>
        </DrillScreen>
      );
    }
    return (
      <DrillScreen
        title="Metas de ahorro"
        onBack={closeDrill}
        action={
          <Pressable
            onPress={() => {
              closeDrill();
              setTab("goals");
            }}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: C.purple,
              backgroundColor: C.purpleBg,
            }}
          >
            <Text style={{ fontSize: 12, color: C.purple, fontWeight: 500 }}>
              Ir a Metas
            </Text>
          </Pressable>
        }
      >
        {goals.map((g) => {
          const pctNum = Math.round((g.saved / g.target) * 100);
          const barW = Math.min(100, (g.saved / g.target) * 100);
          const surplus = g.saved > g.target ? g.saved - g.target : 0;
          const daysLeft = Math.max(
            0,
            Math.round((new Date(g.deadline) - new Date()) / 86400000),
          );
          return (
            <Pressable
              key={g.id}
              style={{ ...cS, borderColor: g.color + "44", marginBottom: 12 }}
              onPress={() => setDrillSub(g.id)}
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
                    style={{ fontSize: 14, fontWeight: 500, color: C.text }}
                    numberOfLines={2}
                  >
                    {g.name}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {daysLeft} dias restantes
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: 500, color: g.color }}
                  >
                    {pctNum}%
                  </Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>
                    {fmt(g.saved)} / {fmt(g.target)}
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
                    backgroundColor: g.color,
                    borderRadius: 4,
                  }}
                />
              </View>
              {surplus > 0 && (
                <Text style={{ fontSize: 11, color: C.green, marginTop: 6 }}>
                  Superavit +{fmt(surplus)}
                </Text>
              )}
              <Text
                style={{
                  textAlign: "right",
                  marginTop: 6,
                  fontSize: 11,
                  color: C.hint,
                }}
              >
                Toca para ver detalle ›
              </Text>
            </Pressable>
          );
        })}
      </DrillScreen>
    );
  };

  const describeAlertRule = (a) => {
    if (a.rule.kind === "budget_threshold")
      return `Presupuesto · ${a.rule.section}: avisar al llegar al ${a.rule.percent}% del mes (si no hay regla, se usa 80%)`;
    return `Cuenta · ${a.rule.account}: avisar si el saldo cae por debajo de ${fmt(a.rule.minBalance)}`;
  };

  const DrillAlerts = () => {
    const firstBudgetSec =
      sections.find(
        (s) => (budget[s] || 0) > 0 && s !== "Transferencias",
      ) || sections.find((s) => s !== "Transferencias") || sections[0];
    return (
      <DrillScreen title="Alertas" onBack={closeDrill}>
        <Text style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
          En Inicio veras avisos cuando ocurran. Sin reglas extras: gasto del mes
          vs presupuesto (80% advertencia, 100% superado) y cualquier saldo de
          cuenta negativo.
        </Text>
        <Pressable
          onPress={() =>
            setRuleEditor({
              id: Date.now(),
              enabled: true,
              severity: "warn",
              rule: {
                kind: "budget_threshold",
                section: firstBudgetSec,
                percent: 85,
              },
            })
          }
          style={{
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.blue,
            backgroundColor: C.blueBg,
            marginBottom: 14,
          }}
        >
          <Text style={{ textAlign: "center", color: C.blue, fontWeight: 500 }}>
            + Nueva regla
          </Text>
        </Pressable>
        {alertRules.length === 0 && (
          <Text
            style={{
              fontSize: 13,
              color: C.muted,
              textAlign: "center",
              paddingVertical: 20,
            }}
          >
            No hay reglas adicionales. Pulsa arriba para umbrales de presupuesto
            o saldo minimo en cuenta.
          </Text>
        )}
        {alertRules.map((a) => (
          <View key={a.id} style={{ ...cS, marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: a.severity === "warn" ? C.gold : C.red,
                }}
              >
                {a.severity === "warn" ? "Advertencia" : "Atencion"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 11, color: C.muted }}>Activa</Text>
                <Switch
                  value={a.enabled}
                  onValueChange={(v) =>
                    setAlertRules((p) =>
                      p.map((x) => (x.id === a.id ? { ...x, enabled: v } : x)),
                    )
                  }
                  trackColor={{ false: C.bg4, true: C.green }}
                />
              </View>
            </View>
            <Text style={{ fontSize: 14, color: C.text, marginBottom: 12 }}>
              {describeAlertRule(a)}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setRuleEditor({ ...a })}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: C.bg3,
                }}
              >
                <Text
                  style={{ textAlign: "center", fontSize: 12, color: C.muted }}
                >
                  Editar
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setConfirmDialog({
                    msg: "Eliminar esta regla?",
                    confirmLabel: "Eliminar",
                    onConfirm: () =>
                      setAlertRules((p) => p.filter((x) => x.id !== a.id)),
                  })
                }
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: C.redBorder,
                  backgroundColor: C.redBg,
                }}
              >
                <Text style={{ textAlign: "center", fontSize: 12, color: C.red }}>
                  Eliminar
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </DrillScreen>
    );
  };

  /* RECURRING */
  const DrillRecurring = () => (
    <DrillScreen title="Gastos recurrentes" onBack={closeDrill}>
      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 140,
              backgroundColor: C.bg3,
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: 10, color: C.muted }}>
              Total egresos/mes
            </Text>
            <Text style={{ fontWeight: 500, color: C.red }}>
              {fmt(
                recTxs
                  .filter((t) => t.type === "expense")
                  .reduce((s, t) => s + t.amount, 0),
              )}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 140,
              backgroundColor: C.bg3,
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: 10, color: C.muted }}>
              Total egresos/año
            </Text>
            <Text style={{ fontWeight: 500, color: C.gold }}>
              {fmt(
                recTxs
                  .filter((t) => t.type === "expense")
                  .reduce((s, t) => s + t.amount, 0) * 12,
              )}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            setRecForm({
              type: "expense",
              amountDigits: "",
              desc: "",
              section:
                sections.find((s) => s !== "Transferencias") ||
                sections[0] ||
                "General",
              account: defaultAccount || accounts[0] || "",
              freq: "monthly",
              date: todayStr(),
              notes: "",
            });
            setRecModal({ mode: "add" });
          }}
          style={{
            width: "100%",
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: C.green,
            backgroundColor: C.greenBg,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: C.green,
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            + Agregar gasto recurrente
          </Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "column", gap: 8 }}>
        {recTxs.map((t) => (
          <View
            key={t.id}
            style={{
              ...cS,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 16,
              gap: 10,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontSize: 13, fontWeight: 500, color: C.text }}
                numberOfLines={2}
              >
                {t.desc}
              </Text>
              <Text
                style={{ fontSize: 11, color: C.muted, marginTop: 2 }}
                numberOfLines={2}
              >
                {t.section} · {FREQ[t.freq] || "Mensual"} · {t.account}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontWeight: 500,
                    color: t.type === "income" ? C.green : C.red,
                  }}
                >
                  {t.type === "income" ? "+" : "-"}
                  {fmt(t.amount)}
                </Text>
                <Text style={{ fontSize: 10, color: C.hint }}>
                  {fmt(t.amount * 12)}/año
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  onPress={() => {
                    setRecForm({
                      ...t,
                      amountDigits: digitsFromNumber(t.amount),
                    });
                    setRecModal({ mode: "edit", tx: t });
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.bg3,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: TY.title2, color: C.muted }}>✎</Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteRec(t.id)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.redBorder,
                    backgroundColor: C.redBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: TY.title2, color: C.red }}>✕</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </DrillScreen>
  );

  /* ──────────── RENDER ──────────── */
  balanceDrillPropsRef.current = {
    closeDrill,
    tfLabel,
    balTf,
    setBalTf,
    pl,
    C,
    iS,
    mSf,
    cS,
    balCustom,
    setBalCustom,
    balInc,
    balExp,
    balMetasTotal,
    fmt,
    balChart,
    setBalChart,
    balFilters,
    setBalFilters,
    pieData,
    chartMonthData,
    balTxs,
    goals,
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.bg }}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={C.isDark ? "light" : "dark"} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* Columna principal (sin superponer la barra inferior: los drills no capturan toques del tab) */}
        <View
          style={{ flex: 1, position: "relative", overflow: "hidden" }}
        >
        {/* Drilldown overlays */}
        {drilldown === "balance" && <DrillBalance />}
        {drilldown === "accounts" && <DrillAccounts />}
        {drilldown === "trend" && <DrillTrend />}
        {drilldown === "budget" && <DrillBudget />}
        {drilldown === "goals" && <DrillGoals />}
        {drilldown === "recurring" && <DrillRecurring />}
        {drilldown === "alerts" && <DrillAlerts />}

        {/* Header */}
        <View
          style={{
            paddingTop: 20,
            paddingHorizontal: 20,
            paddingBottom: 14,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Pressable
            onPress={openSettingsDrawer}
            hitSlop={10}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              backgroundColor: C.bg3,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Ajustes"
            accessibilityRole="button"
          >
            <View style={{ gap: 5, width: 22, alignItems: "stretch" }}>
              <View
                style={{ height: 3, borderRadius: 2, backgroundColor: C.text }}
              />
              <View
                style={{ height: 3, borderRadius: 2, backgroundColor: C.text }}
              />
              <View
                style={{ height: 3, borderRadius: 2, backgroundColor: C.text }}
              />
            </View>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{
                fontSize: 13,
                color: C.muted,
                letterSpacing: 1.1,
                textTransform: "uppercase",
              }}
            >
              abril 2025
            </Text>
            <Text
              style={{
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: -0.02,
                color: C.text,
              }}
            >
              Mis finanzas
            </Text>
          </View>
          <Pressable
            onPress={() => setAiOpen(true)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.blue,
              backgroundColor: C.blueBg,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Asistente IA"
          >
            <Text style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>
              AI
            </Text>
          </Pressable>
        </View>

        <GHScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {/* ═══ DASHBOARD ═══ */}
          {tab === "dashboard" && (
            <View style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.map((a) => (
                <View
                  key={a.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: a.type === "warn" ? C.goldBg : C.redBg,
                    borderWidth: 1,
                    borderColor: a.type === "warn" ? C.gold : C.red,
                  }}
                >
                  <Text style={{ fontSize: 15, color: C.text }}>
                    {a.type === "warn" ? "⚠" : "🔴"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: a.type === "warn" ? C.gold : C.red,
                      flex: 1,
                    }}
                  >
                    {a.msg}
                  </Text>
                  <Pressable
                    onPress={() => setDismissedAlerts((p) => [...p, a.id])}
                    hitSlop={8}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        color: C.muted,
                        lineHeight: 20,
                        paddingHorizontal: 6,
                      }}
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>
              ))}

              {/* Hero — clickable */}
              <Pressable
                onPress={() => openDrill("balance")}
                style={{
                  borderRadius: 18,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: C.greenBorder,
                }}
              >
                <LinearGradient
                  colors={C.gradHero}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ padding: 24, position: "relative" }}
                >
                  <Text
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 16,
                      color: "rgba(34,201,122,0.4)",
                      fontSize: 16,
                    }}
                  >
                    ›
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: "rgba(34,201,122,0.6)",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Balance total · Toca para reporte
                  </Text>
                  <Text
                    style={{
                      fontSize: TY.hero,
                      fontWeight: "500",
                      color: C.heroGreen,
                      letterSpacing: -0.5,
                    }}
                  >
                    {fmt(bal)}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 16,
                      borderTopWidth: 1,
                      borderTopColor: "rgba(255,255,255,0.06)",
                      paddingTop: 14,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.35)",
                          marginBottom: 3,
                        }}
                      >
                        INGRESOS
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "500",
                          color: C.heroGreen,
                        }}
                      >
                        {fmt(tInc)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.35)",
                          marginBottom: 3,
                        }}
                      >
                        EGRESOS
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "500",
                          color: C.red,
                        }}
                      >
                        {fmt(tExp)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "rgba(255,255,255,0.35)",
                          marginBottom: 3,
                        }}
                      >
                        AHORRO
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "500",
                          color: C.gold,
                        }}
                      >
                        {savRate}%
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Accounts */}
              <Pressable
                onPress={() => openDrill("accounts")}
                style={{ ...cS, padding: 0, overflow: "hidden" }}
              >
                <View
                  style={{
                    paddingTop: 14,
                    paddingHorizontal: 20,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: "500", color: C.text }}
                  >
                    Cuentas{" "}
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.muted,
                        fontWeight: "400",
                      }}
                    >
                      · Default:{" "}
                      <Text style={{ color: C.green }}>{defaultAccount}</Text>
                    </Text>
                  </Text>
                  <Text style={{ color: C.hint, fontSize: 14 }}>›</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {byAccount.map((a, i) => (
                    <View
                      key={a.a}
                      style={{
                        width: "50%",
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderRightWidth: i % 2 === 0 ? 1 : 0,
                        borderRightColor: C.border,
                        borderBottomWidth: i < byAccount.length - 2 ? 1 : 0,
                        borderBottomColor: C.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          letterSpacing: 0.85,
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        {a.a}
                        {defaultAccount === a.a ? (
                          <Text style={{ marginLeft: 5, color: C.green }}>
                            ✓
                          </Text>
                        ) : null}
                      </Text>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: 500,
                          color: a.bal >= 0 ? C.green : C.red,
                        }}
                      >
                        {a.bal < 0 ? "-" : ""}
                        {fmt(a.bal)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>

              {/* Trend */}
              <Pressable
                onPress={() => openDrill("trend")}
                style={{ ...cS, position: "relative" }}
              >
                <Text
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    color: C.hint,
                    fontSize: 14,
                  }}
                >
                  ›
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    marginBottom: 14,
                    color: C.text,
                  }}
                >
                  Tendencia mensual
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "flex-end",
                    height: 72,
                  }}
                >
                  {trendData.map((m, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <View
                        style={{
                          width: "100%",
                          flexDirection: "row",
                          gap: 3,
                          alignItems: "flex-end",
                          height: 56,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                            height: Math.max(0, (m.inc / maxTrend) * 56),
                            backgroundColor: C.green,
                            opacity: 0.85,
                          }}
                        />
                        <View
                          style={{
                            flex: 1,
                            borderTopLeftRadius: 4,
                            borderTopRightRadius: 4,
                            height: Math.max(0, (m.exp / maxTrend) * 56),
                            backgroundColor: C.red,
                            opacity: 0.85,
                          }}
                        />
                      </View>
                      <Text style={{ fontSize: 10, color: C.muted }}>
                        {m.label}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: C.green,
                      }}
                    />
                    <Text style={{ fontSize: 11, color: C.muted }}>
                      Ingresos
                    </Text>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: C.red,
                      }}
                    />
                    <Text style={{ fontSize: 11, color: C.muted }}>
                      Egresos
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Budget */}
              <Pressable
                onPress={() => openDrill("budget")}
                style={{ ...cS, position: "relative" }}
              >
                <Text
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    color: C.hint,
                    fontSize: 14,
                  }}
                >
                  ›
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    marginBottom: 14,
                    color: C.text,
                  }}
                >
                  Presupuesto vs. real
                </Text>
                {dashboardBudgetRows.map((b) => {
                    const pct =
                      b.b > 0 ? Math.min(100, (b.spent / b.b) * 100) : 100;
                    const over = b.spent > b.b && b.b > 0;
                    return (
                      <View key={b.s} style={{ marginBottom: 12 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 5,
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
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: sectionDotColor(b.s, C),
                              }}
                            />
                            <Text style={{ fontSize: 14, color: C.text }}>
                              {b.s}
                            </Text>
                          </View>
                          <Text style={{ color: over ? C.red : C.muted }}>
                            {fmt(b.spent)}{" "}
                            <Text style={{ color: C.hint }}>/ {fmt(b.b)}</Text>
                          </Text>
                        </View>
                        <View
                          style={{
                            height: 5,
                            backgroundColor: C.bg3,
                            borderRadius: 4,
                            overflow: "hidden",
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
                      </View>
                    );
                  })}
              </Pressable>

              {/* Goals */}
              <Pressable
                onPress={() => openDrill("goals")}
                style={{ ...cS, position: "relative" }}
              >
                <Text
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    color: C.hint,
                    fontSize: 14,
                  }}
                >
                  ›
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    marginBottom: 12,
                    color: C.text,
                  }}
                >
                  Metas de ahorro
                </Text>
                {goals.slice(0, 2).map((g) => {
                  const pct = Math.min(
                    100,
                    Math.round((g.saved / g.target) * 100),
                  );
                  return (
                    <View key={g.id} style={{ marginBottom: 12 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 5,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: C.text }}>
                          {g.name}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 12 }}>
                          {fmt(g.saved)}{" "}
                          <Text style={{ color: C.hint }}>
                            / {fmt(g.target)}
                          </Text>
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 5,
                          backgroundColor: C.bg3,
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            width: pct + "%",
                            height: "100%",
                            backgroundColor: g.color,
                            borderRadius: 4,
                          }}
                        />
                      </View>
                      <Text
                        style={{ fontSize: 10, color: C.muted, marginTop: 3 }}
                      >
                        {pct}% · Limite: {g.deadline}
                      </Text>
                    </View>
                  );
                })}
              </Pressable>

              {/* Recurring */}
              <Pressable
                onPress={() => openDrill("recurring")}
                style={{ ...cS, position: "relative" }}
              >
                <Text
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    color: C.hint,
                    fontSize: 14,
                  }}
                >
                  ›
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    marginBottom: 12,
                    color: C.text,
                  }}
                >
                  Gastos recurrentes
                </Text>
                {recTxs.slice(0, 4).map((t) => (
                  <View
                    key={t.id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: C.border,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 13, color: C.text }}>
                        {t.desc}
                      </Text>
                      <Text
                        style={{ fontSize: 11, color: C.muted, marginTop: 2 }}
                      >
                        {t.section} · {FREQ[t.freq] || "Mensual"}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontWeight: "500",
                        color: t.type === "income" ? C.green : C.red,
                      }}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {fmt(t.amount)}
                    </Text>
                  </View>
                ))}
                {recTxs.length > 4 && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: C.muted,
                      paddingTop: 8,
                      textAlign: "center",
                    }}
                  >
                    +{recTxs.length - 4} mas
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* ═══ TRANSACTIONS ═══ */}
          {tab === "transactions" && (
            <View style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <View style={{ position: "relative" }}>
                <Text
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 14,
                    zIndex: 1,
                    color: C.muted,
                    fontSize: 14,
                  }}
                >
                  ⌕
                </Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  style={{ ...iS, paddingLeft: 34 }}
                />
              </View>
              <Pressable
                onPress={openNew}
                style={{
                  width: "100%",
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.green,
                  backgroundColor: C.greenBg,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 14,
                    color: C.green,
                    fontWeight: "500",
                  }}
                >
                  + Agregar transaccion
                </Text>
              </Pressable>
              <GHScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingBottom: 4,
                }}
              >
                {[
                  ["all", "Todos"],
                  ["income", "Ingresos"],
                  ["expense", "Egresos"],
                  ["transfer", "Transferencias"],
                ].map(([v, l]) => {
                  const st = pl(
                    filterType === v,
                    v === "income"
                      ? C.green
                      : v === "expense"
                        ? C.red
                        : v === "transfer"
                          ? C.blue
                          : null,
                  );
                  return (
                    <Pressable
                      key={v}
                      style={st}
                      onPress={() => setFilterType(v)}
                    >
                      <Text style={{ fontSize: 12, color: st.color }}>{l}</Text>
                    </Pressable>
                  );
                })}
                {accounts.map((a) => {
                  const st = pl(filterAcc === a, C.blue);
                  return (
                    <Pressable
                      key={a}
                      style={st}
                      onPress={() => setFilterAcc(filterAcc === a ? "all" : a)}
                    >
                      <Text style={{ fontSize: 12, color: st.color }}>{a}</Text>
                    </Pressable>
                  );
                })}
              </GHScrollView>
              <GHScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingBottom: 4,
                }}
              >
                {(() => {
                  const st = pl(filterSec === "all");
                  return (
                    <Pressable style={st} onPress={() => setFilterSec("all")}>
                      <Text style={{ fontSize: 12, color: st.color }}>
                        Todas
                      </Text>
                    </Pressable>
                  );
                })()}
                {sections.map((s) => {
                  const st = pl(filterSec === s, sectionDotColor(s, C));
                  return (
                    <Pressable
                      key={s}
                      style={st}
                      onPress={() => setFilterSec(filterSec === s ? "all" : s)}
                    >
                      <Text style={{ fontSize: 14, color: st.color }}>{s}</Text>
                    </Pressable>
                  );
                })}
              </GHScrollView>
              <Text style={{ fontSize: 12, color: C.muted }}>
                {filteredTxs.length} transacciones
              </Text>
              {filteredTxs.map((t) => (
                <SwipeRow key={t.id} t={t} goals={goals} onView={openTx} />
              ))}
            </View>
          )}

          {/* ═══ GOALS ═══ */}
          {tab === "goals" && (
            <View style={{ flexDirection: "column", gap: 14 }}>
              <Pressable
                onPress={() => {
                  setGoalForm({
                    name: "",
                    targetDigits: "",
                    deadline: todayStr().slice(0, 7) + "-28",
                    color: C.blue,
                  });
                  setGoalModal({ mode: "new" });
                }}
                style={{
                  width: "100%",
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.purple,
                  backgroundColor: C.purpleBg,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: C.purple,
                    fontWeight: 500,
                    textAlign: "center",
                  }}
                >
                  + Nueva meta
                </Text>
              </Pressable>
              {goals.map((g) => {
                const pctNum = Math.round((g.saved / g.target) * 100);
                const barW = Math.min(100, (g.saved / g.target) * 100);
                const surplus = g.saved > g.target ? g.saved - g.target : 0;
                const remaining = Math.max(0, g.target - g.saved);
                const daysLeft = Math.max(
                  0,
                  Math.round((new Date(g.deadline) - new Date()) / 86400000),
                );
                const dailyNeeded = daysLeft > 0 ? remaining / daysLeft : 0;
                return (
                  <View
                    key={g.id}
                    style={{ ...cS, borderColor: g.color + "44" }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 14,
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ fontSize: 15, fontWeight: 500, color: C.text }}
                        >
                          {g.name}
                        </Text>
                        <Text
                          style={{ fontSize: 11, color: C.muted, marginTop: 3 }}
                        >
                          Limite: {g.deadline} · {daysLeft} dias
                        </Text>
                        <Pressable
                          onPress={() => {
                            setGoalForm({
                              name: g.name,
                              targetDigits: digitsFromNumber(g.target),
                              deadline: g.deadline,
                              color: g.color,
                            });
                            setGoalModal({ mode: "edit", goal: g });
                          }}
                          style={{ marginTop: 8, alignSelf: "flex-start" }}
                        >
                          <Text style={{ fontSize: 12, color: C.blue }}>
                            Editar meta
                          </Text>
                        </Pressable>
                      </View>
                      <Pressable
                        onPress={() => removeGoalConfirmed(g.id)}
                        hitSlop={8}
                      >
                        <Text style={{ color: C.hint, fontSize: 18 }}>×</Text>
                      </Pressable>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: g.color,
                          fontWeight: 500,
                          fontSize: 22,
                        }}
                      >
                        {fmt(g.saved)}
                      </Text>
                      <Text style={{ color: C.muted, alignSelf: "flex-end" }}>
                        de {fmt(g.target)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        backgroundColor: C.bg3,
                        borderRadius: 6,
                        overflow: "hidden",
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          width: barW + "%",
                          height: "100%",
                          backgroundColor: g.color,
                          borderRadius: 6,
                        }}
                      />
                    </View>
                    {surplus > 0 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.green,
                          marginBottom: 8,
                        }}
                      >
                        Superavit: +{fmt(surplus)}
                      </Text>
                    )}
                    <View
                      style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}
                    >
                      <View
                        style={{
                          ...mSf,
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: C.muted }}>
                          Avance
                        </Text>
                        <Text style={{ fontWeight: 500, color: g.color }}>
                          {pctNum}%
                        </Text>
                      </View>
                      <View
                        style={{
                          ...mSf,
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: C.muted }}>
                          Pendiente
                        </Text>
                        <Text style={{ fontWeight: 500, color: C.text }}>
                          {fmt(remaining)}
                        </Text>
                      </View>
                      <View
                        style={{
                          ...mSf,
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: C.muted }}>
                          Diario
                        </Text>
                        <Text
                          style={{
                            fontWeight: 500,
                            color: dailyNeeded > 500 ? C.red : C.text,
                          }}
                        >
                          {g.saved >= g.target ? "—" : fmt(dailyNeeded)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}
                    >
                      Agregar ahorro (transfiere desde cuenta)
                    </Text>
                    <View
                      style={{
                        borderWidth: 1,
                        borderColor: C.border,
                        borderRadius: 10,
                        overflow: "hidden",
                        backgroundColor: C.bg3,
                        marginBottom: 8,
                      }}
                    >
                      <ThemedPicker C={C}
                        selectedValue={goalAddAcc[g.id] || defaultAccount}
                        onValueChange={(v) =>
                          setGoalAddAcc((p) => ({ ...p, [g.id]: v }))
                        }
                      >
                        {accounts.map((o) => (
                          <Picker.Item
                            key={o}
                            label={o}
                            value={o}
                            color={C.text}
                          />
                        ))}
                      </ThemedPicker>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        keyboardType="number-pad"
                        value={fmtMoneyDigits(goalInputs[g.id])}
                        onChangeText={(v) =>
                          setGoalInputs((p) => ({
                            ...p,
                            [g.id]: stripMoneyToDigits(v),
                          }))
                        }
                        style={{ ...iS, flex: 1 }}
                      />
                      <Pressable
                        onPress={() => applyGoalDeposit(g)}
                        style={{
                          paddingVertical: 10,
                          paddingHorizontal: 14,
                          borderRadius: 10,
                          backgroundColor: g.color,
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: "500",
                          }}
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => {
                        setGoalWithdrawModal(g.id);
                        setGoalWithdrawForm({
                          amountDigits: "",
                          account: defaultAccount,
                        });
                      }}
                      style={{
                        marginTop: 12,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: C.blue,
                        backgroundColor: C.blueBg,
                      }}
                    >
                      <Text
                        style={{
                          textAlign: "center",
                          fontSize: 13,
                          color: C.blue,
                          fontWeight: 500,
                        }}
                      >
                        Retirar a cuenta (transferencia)
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* ═══ REPORTS ═══ */}
          {tab === "reports" && (
            <View style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <GHScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingBottom: 4,
                }}
              >
                {[
                  ["balance", "Balance"],
                  ["sections", "Secciones"],
                  ["top", "Top Gastos"],
                  ["subs", "Suscripciones"],
                  ["txlist", "Listado"],
                ].map(([v, l]) => {
                  const st = pl(reportView === v);
                  return (
                    <Pressable
                      key={v}
                      style={st}
                      onPress={() => setReportView(v)}
                    >
                      <Text style={{ fontSize: 12, color: st.color }}>{l}</Text>
                    </Pressable>
                  );
                })}
              </GHScrollView>
              {reportView === "balance" && (
                <>
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={mSf}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            textTransform: "uppercase",
                            letterSpacing: 0.85,
                            marginBottom: 6,
                          }}
                        >
                          Ingresos
                        </Text>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: 500,
                            color: C.green,
                          }}
                        >
                          {fmt(tInc)}
                        </Text>
                      </View>
                      <View style={mSf}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            textTransform: "uppercase",
                            letterSpacing: 0.85,
                            marginBottom: 6,
                          }}
                        >
                          Egresos
                        </Text>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: 500,
                            color: C.red,
                          }}
                        >
                          {fmt(tExp)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={mSf}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            textTransform: "uppercase",
                            letterSpacing: 0.85,
                            marginBottom: 6,
                          }}
                        >
                          Balance
                        </Text>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: 500,
                            color: bal >= 0 ? C.green : C.red,
                          }}
                        >
                          {fmt(bal)}
                        </Text>
                      </View>
                      <View style={mSf}>
                        <Text
                          style={{
                            fontSize: 10,
                            color: C.muted,
                            textTransform: "uppercase",
                            letterSpacing: 0.85,
                            marginBottom: 6,
                          }}
                        >
                          Tasa ahorro
                        </Text>
                        <Text
                          style={{
                            fontSize: 20,
                            fontWeight: 500,
                            color: C.gold,
                          }}
                        >
                          {savRate}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={cS}>
                    {byAccount.map((a) => (
                      <View
                        key={a.a}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 9,
                          borderBottomWidth: 1,
                          borderBottomColor: C.border,
                        }}
                      >
                        <Text style={{ fontSize: 13, color: C.muted }}>
                          {a.a}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: a.bal >= 0 ? C.green : C.red,
                          }}
                        >
                          {a.bal < 0 ? "-" : ""}
                          {fmt(a.bal)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {reportView === "sections" && (
                <View style={cS}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 14,
                      color: C.text,
                    }}
                  >
                    Gastos por seccion
                  </Text>
                  {bySection
                    .filter((b) => b.spent > 0)
                    .sort((a, b) => b.spent - a.spent)
                    .map((b) => (
                      <View key={b.s} style={{ marginBottom: 14 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 5,
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
                            <Text style={{ fontSize: 12, color: C.text }}>
                              {b.s}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: C.muted }}>
                            {fmt(b.spent)} ·{" "}
                            {tExp > 0 ? Math.round((b.spent / tExp) * 100) : 0}%
                          </Text>
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
                              width:
                                (tExp > 0 ? (b.spent / tExp) * 100 : 0) + "%",
                              height: "100%",
                              backgroundColor: sectionDotColor(b.s, C),
                              opacity: 0.85,
                              borderRadius: 4,
                            }}
                          />
                        </View>
                      </View>
                    ))}
                </View>
              )}
              {reportView === "top" && (
                <View style={cS}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 14,
                      color: C.text,
                    }}
                  >
                    Top 5 gastos
                  </Text>
                  {[...txs]
                    .filter((t) => t.type === "expense")
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5)
                    .map((t, i) => (
                      <View
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          paddingVertical: 10,
                          paddingHorizontal: 0,
                          borderBottomWidth: 1,
                          borderBottomColor: C.border,
                        }}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            backgroundColor: C.bg3,
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              fontWeight: 500,
                            }}
                          >
                            #{i + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: C.text,
                            }}
                          >
                            {t.desc}
                          </Text>
                          <Text
                            style={{
                              fontSize: 11,
                              color: C.muted,
                              marginTop: 2,
                            }}
                          >
                            {t.section} · {t.date}
                          </Text>
                        </View>
                        <Text style={{ fontWeight: 500, color: C.red }}>
                          {fmt(t.amount)}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
              {reportView === "subs" &&
                (() => {
                  const subs = txs.filter(
                    (t) => t.recurring && t.type === "expense",
                  );
                  const monthly = subs.reduce((s, t) => s + t.amount, 0);
                  return (
                    <View
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={mSf}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: C.muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.85,
                              marginBottom: 6,
                            }}
                          >
                            Mensual
                          </Text>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: 500,
                              color: C.red,
                            }}
                          >
                            {fmt(monthly)}
                          </Text>
                        </View>
                        <View style={mSf}>
                          <Text
                            style={{
                              fontSize: 10,
                              color: C.muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.85,
                              marginBottom: 6,
                            }}
                          >
                            Anual
                          </Text>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: 500,
                              color: C.gold,
                            }}
                          >
                            {fmt(monthly * 12)}
                          </Text>
                        </View>
                      </View>
                      <View style={cS}>
                        {subs.map((t) => (
                          <View
                            key={t.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              paddingVertical: 9,
                              borderBottomWidth: 1,
                              borderBottomColor: C.border,
                            }}
                          >
                            <View>
                              <Text style={{ fontSize: 13, color: C.text }}>
                                {t.desc}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: C.muted,
                                  marginTop: 2,
                                }}
                              >
                                {t.section} · {FREQ[t.freq] || "Mensual"}
                              </Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ fontWeight: 500, color: C.red }}>
                                {fmt(t.amount)}/mes
                              </Text>
                              <Text style={{ fontSize: 10, color: C.hint }}>
                                {fmt(t.amount * 12)}/año
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              {reportView === "txlist" && (
                <View
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {[...txs]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((t) => (
                      <View
                        key={t.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingVertical: 9,
                          borderBottomWidth: 1,
                          borderBottomColor: C.border,
                        }}
                      >
                        <Text
                          style={{ fontSize: 13, color: C.muted, minWidth: 80 }}
                        >
                          {t.date}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            marginHorizontal: 8,
                            fontSize: 13,
                            color: C.text,
                          }}
                        >
                          {t.desc}{" "}
                          <Text style={{ color: C.hint }}>· {t.section}</Text>
                        </Text>
                        <Text
                          style={{
                            fontWeight: 500,
                            color:
                              t.type === "income"
                                ? C.green
                                : t.type === "expense"
                                  ? C.red
                                  : C.blue,
                          }}
                        >
                          {t.type === "transfer"
                            ? fmt(t.amount)
                            : (t.type === "income" ? "+" : "-") + fmt(t.amount)}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          {/* ═══ CALENDAR ═══ */}
          {tab === "calendar" && (
            <View style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <View style={cS}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <Pressable
                    onPress={() =>
                      setCalMonth(
                        new Date(
                          calMonth.getFullYear(),
                          calMonth.getMonth() - 1,
                        ),
                      )
                    }
                    hitSlop={8}
                  >
                    <Text
                      style={{
                        fontSize: 22,
                        color: C.text,
                        paddingHorizontal: 4,
                      }}
                    >
                      &#8249;
                    </Text>
                  </Pressable>
                  <Text
                    style={{ fontWeight: "600", fontSize: 17, color: C.text }}
                  >
                    {MN[calMonth.getMonth()]} {calMonth.getFullYear()}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setCalMonth(
                        new Date(
                          calMonth.getFullYear(),
                          calMonth.getMonth() + 1,
                        ),
                      )
                    }
                    hitSlop={8}
                  >
                    <Text
                      style={{
                        fontSize: 22,
                        color: C.text,
                        paddingHorizontal: 4,
                      }}
                    >
                      &#8250;
                    </Text>
                  </Pressable>
                </View>
                <View style={{ marginTop: 4 }}>
                  <View style={{ flexDirection: "row" }}>
                    {DN.map((d) => (
                      <View
                        key={d}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: TY.overline, color: C.hint }}>
                          {d}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {(() => {
                    const first = calFirst();
                    const n = calDays();
                    const cells = [
                      ...Array(first).fill(null),
                      ...Array.from({ length: n }, (_, i) => i + 1),
                    ];
                    const rows = [];
                    for (let i = 0; i < cells.length; i += 7) {
                      const row = cells.slice(i, i + 7);
                      while (row.length < 7) row.push(null);
                      rows.push(row);
                    }
                    return rows.map((row, ri) => (
                      <View
                        key={"calw" + ri}
                        style={{ flexDirection: "row", marginTop: 3 }}
                      >
                        {row.map((d, ci) => {
                          if (d === null)
                            return (
                              <View
                                key={"cale" + ri + "-" + ci}
                                style={{ flex: 1, minHeight: 48 }}
                              />
                            );
                          const dTxs = txOnDay(d);
                          const hasE = dTxs.some((t) => t.type === "expense");
                          const hasI = dTxs.some((t) => t.type === "income");
                          const sel = calSel === d;
                          const dayTotal = dTxs.reduce(
                            (s, t) =>
                              t.type === "income" ? s + t.amount : s - t.amount,
                            0,
                          );
                          return (
                            <Pressable
                              key={d}
                              onPress={() => setCalSel(sel ? null : d)}
                              style={{
                                flex: 1,
                                paddingVertical: 6,
                                paddingHorizontal: 2,
                                borderRadius: 8,
                                backgroundColor: sel
                                  ? C.blue
                                  : dTxs.length
                                    ? C.bg3
                                    : "transparent",
                                minHeight: 48,
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: TY.caption,
                                  color: sel ? C.onPrimary : C.text,
                                }}
                              >
                                {d}
                              </Text>
                              <View
                                style={{
                                  flexDirection: "row",
                                  gap: 2,
                                  marginTop: 2,
                                }}
                              >
                                {hasE && (
                                  <View
                                    style={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: 2,
                                      backgroundColor: sel
                                        ? "rgba(255,255,255,0.6)"
                                        : C.red,
                                    }}
                                  />
                                )}
                                {hasI && (
                                  <View
                                    style={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: 2,
                                      backgroundColor: sel
                                        ? "rgba(255,255,255,0.6)"
                                        : C.green,
                                    }}
                                  />
                                )}
                              </View>
                              {dTxs.length > 0 && (
                                <Text
                                  style={{
                                    fontSize: TY.micro,
                                    color: sel
                                      ? "rgba(255,255,255,0.7)"
                                      : dayTotal >= 0
                                        ? C.green
                                        : C.red,
                                    marginTop: 2,
                                  }}
                                >
                                  {dayTotal >= 0 ? "+" : "-"}
                                  {Math.abs(Math.round(dayTotal / 1000))}k
                                </Text>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </View>
              </View>
              {calSel && txOnDay(calSel).length > 0 && (
                <View style={cS}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 10,
                      color: C.text,
                    }}
                  >
                    Dia {calSel}
                  </Text>
                  <TxList txs={txOnDay(calSel)} goals={goals} />
                </View>
              )}
              {(() => {
                const prefix =
                  calMonth.getFullYear() +
                  "-" +
                  String(calMonth.getMonth() + 1).padStart(2, "0");
                const mTxs = txs.filter((t) => t.date.startsWith(prefix));
                const mI = mTxs
                  .filter((t) => t.type === "income")
                  .reduce((s, t) => s + t.amount, 0);
                const mE = mTxs
                  .filter((t) => t.type === "expense")
                  .reduce((s, t) => s + t.amount, 0);
                return (
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1, ...mS }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: 0.85,
                          marginBottom: 4,
                        }}
                      >
                        Ingresos
                      </Text>
                      <Text style={{ fontWeight: 500, color: C.green }}>
                        {fmt(mI)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, ...mS }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: 0.85,
                          marginBottom: 4,
                        }}
                      >
                        Egresos
                      </Text>
                      <Text style={{ fontWeight: 500, color: C.red }}>
                        {fmt(mE)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, ...mS }}>
                      <Text
                        style={{
                          fontSize: 10,
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: 0.85,
                          marginBottom: 4,
                        }}
                      >
                        Balance
                      </Text>
                      <Text
                        style={{
                          fontWeight: 500,
                          color: mI - mE >= 0 ? C.green : C.red,
                        }}
                      >
                        {fmt(mI - mE)}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          )}
        </GHScrollView>
        </View>

        {/* Bottom Nav — hermana del área principal (no absolute → siempre recibe toques) */}
        <View
          style={{
            flexShrink: 0,
            backgroundColor: C.tabBarBg,
            borderTopWidth: 1,
            borderTopColor: C.border,
            flexDirection: "row",
            paddingBottom: insets.bottom,
            minHeight: TAB_CONTENT_H + insets.bottom,
            alignItems: "flex-end",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: C.isDark ? 0.35 : 0.12,
            shadowRadius: 6,
            elevation: 12,
          }}
        >
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => {
                setSettingsOpen(false);
                drawerProgress.setValue(0);
                setDrawerBackdropBlocking(true);
                closeDrill();
                setTab(t.id);
              }}
              style={{
                flex: 1,
                paddingTop: 14,
                paddingBottom: 12,
                minHeight: 52,
                backgroundColor: "transparent",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <Text
                style={{
                  fontSize: TY.tabIcon,
                  lineHeight: 28,
                  color: tab === t.id ? C.green : C.hint,
                }}
              >
                {t.sym}
              </Text>
              <Text
                style={{
                  fontSize: TY.tabLabel,
                  letterSpacing: 0.2,
                  fontWeight: tab === t.id ? "600" : "400",
                  color: tab === t.id ? C.green : C.hint,
                }}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Settings drawer */}
        {settingsOpen ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 500,
            }}
            pointerEvents="box-none"
          >
            <Animated.View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "#000",
                opacity: overlayOpacity,
              }}
              pointerEvents="box-none"
            >
              <Pressable
                pointerEvents={drawerBackdropBlocking ? "auto" : "none"}
                style={StyleSheet.absoluteFillObject}
                onPress={closeSettingsDrawer}
                accessibilityLabel="Cerrar ajustes"
              />
            </Animated.View>
            <Animated.View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: drawerWidth,
                backgroundColor: C.bg2,
                borderRightWidth: 1,
                borderRightColor: C.border,
                paddingTop: insets.top + 12,
                paddingHorizontal: 20,
                paddingBottom: insets.bottom + 16,
                transform: [{ translateX: drawerTranslateX }],
                shadowColor: "#000",
                shadowOffset: { width: 4, height: 0 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    fontSize: TY.largeTitle,
                    fontWeight: "700",
                    color: C.text,
                  }}
                >
                  Ajustes
                </Text>
                <Pressable
                  onPress={closeSettingsDrawer}
                  hitSlop={12}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: TY.title2,
                      color: C.muted,
                      fontWeight: "300",
                    }}
                  >
                    ×
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
              >
                <View
                  style={{
                    ...cS,
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: TY.bodyEm,
                        fontWeight: "600",
                        color: C.text,
                      }}
                    >
                      Modo oscuro
                    </Text>
                    <Text
                      style={{
                        fontSize: TY.caption,
                        color: C.muted,
                        marginTop: 4,
                      }}
                    >
                      Interfaz clara u oscura
                    </Text>
                  </View>
                  <Switch
                    value={themeMode === "dark"}
                    onValueChange={(v) => setThemeMode(v ? "dark" : "light")}
                    trackColor={{ false: C.bg4, true: C.green }}
                    thumbColor={
                      Platform.OS === "ios"
                        ? undefined
                        : themeMode === "dark"
                          ? C.bg3
                          : C.text
                    }
                  />
                </View>
                <Pressable
                  onPress={() => openDrill("alerts")}
                  style={{
                    ...cS,
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: TY.body, color: C.text }}>
                    Alertas
                  </Text>
                  <Text style={{ color: C.hint, fontSize: TY.bodyEm }}>›</Text>
                </Pressable>
                <Pressable
                  onPress={() => openDrill("recurring")}
                  style={{
                    ...cS,
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: TY.body, color: C.text }}>
                    Gastos recurrentes
                  </Text>
                  <Text style={{ color: C.hint, fontSize: TY.bodyEm }}>›</Text>
                </Pressable>
                <Text
                  style={{
                    fontSize: TY.caption,
                    color: C.hint,
                    marginTop: 12,
                    paddingHorizontal: 4,
                  }}
                >
                  Los datos se guardan en este dispositivo.
                </Text>
              </ScrollView>
            </Animated.View>
          </View>
        ) : null}

        {/* TX MODAL */}
        {txModal && (
          <Modal
            onClose={() => setTxModal(null)}
            height="88vh"
            title={
              txModal.mode === "view"
                ? "Detalle"
                : txModal.mode === "edit"
                  ? "Editar transaccion"
                  : "Nueva transaccion"
            }
          >
            <View
              style={{
                flex: 1,
                minHeight: 0,
                flexDirection: "column",
                width: "100%",
              }}
            >
              <View style={{ flexShrink: 0 }}>
                <TxTypeBar
                  readOnly={txModal.mode === "view"}
                  fv={form}
                  setFv={setForm}
                  C={C}
                />
              </View>
              <ScrollView
                ref={txFormScrollRef}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                showsVerticalScrollIndicator
                style={{ flex: 1, minHeight: 120 }}
                contentContainerStyle={{
                  paddingTop: 4,
                  paddingBottom: 28,
                  flexGrow: 1,
                  justifyContent: "flex-start",
                }}
              >
                <TxForm
                  readOnly={txModal.mode === "view"}
                  fv={form}
                  setFv={setForm}
                  C={C}
                  iS={iS}
                  cS={cS}
                  goals={goals}
                  accounts={accounts}
                  expenseSections={expenseSections}
                />
              </ScrollView>
              <View
                style={{
                  flexShrink: 0,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                  paddingTop: 12,
                  gap: 10,
                  backgroundColor: C.bg2,
                }}
              >
                {txModal.mode === "view" && (
                  <>
                    <Pressable
                      onPress={() => setConfirmDelete(txModal.tx.id)}
                      style={{
                        width: "100%",
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: C.redBorder,
                        backgroundColor: C.redBg,
                      }}
                    >
                      <Text
                        style={{
                          color: C.red,
                          fontSize: TY.body,
                          fontWeight: 500,
                          textAlign: "center",
                        }}
                      >
                        Eliminar
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openTx(txModal.tx, "edit")}
                      style={{
                        width: "100%",
                        paddingVertical: 14,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        backgroundColor: C.blue,
                      }}
                    >
                      <Text
                        style={{
                          color: C.onPrimary,
                          fontSize: TY.body,
                          fontWeight: 500,
                          textAlign: "center",
                        }}
                      >
                        Editar
                      </Text>
                    </Pressable>
                  </>
                )}
                {(txModal.mode === "edit" || txModal.mode === "new") && (
                  <Pressable
                    onPress={saveTx}
                    style={{
                      width: "100%",
                      paddingVertical: 13,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: C.green,
                    }}
                  >
                    <Text
                      style={{
                        color: C.onPrimary,
                        fontSize: 15,
                        fontWeight: 500,
                        textAlign: "center",
                      }}
                    >
                      Guardar cambios
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* ACC MODAL */}
        {accModal && (
          <Modal
            onClose={() => setAccModal(null)}
            title={accModal.mode === "add" ? "Agregar cuenta" : "Editar cuenta"}
          >
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: C.muted,
                  textTransform: "uppercase",
                  letterSpacing: 0.65,
                  marginBottom: 8,
                }}
              >
                Nombre de la cuenta
              </Text>
              <TextInput
                value={accForm}
                onChangeText={setAccForm}
                style={iS}
              />
            </View>
            <Pressable
              onPress={saveAcc}
              style={{
                width: "100%",
                paddingVertical: 13,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: C.green,
              }}
            >
              <Text
                style={{
                  color: C.onPrimary,
                  fontSize: 15,
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                Guardar
              </Text>
            </Pressable>
          </Modal>
        )}

        {/* RECURRING MODAL */}
        {recModal && (
          <Modal
            onClose={() => setRecModal(null)}
            height="80vh"
            title={
              recModal.mode === "add" ? "Nuevo recurrente" : "Editar recurrente"
            }
          >
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {["expense", "income"].map((tp) => (
                  <Pressable
                    key={tp}
                    onPress={() => setRecForm((p) => ({ ...p, type: tp }))}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor:
                        recForm.type === tp
                          ? tp === "income"
                            ? C.green
                            : C.red
                          : C.border,
                      backgroundColor:
                        recForm.type === tp
                          ? tp === "income"
                            ? C.greenBg
                            : C.redBg
                          : C.bg3,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        fontSize: 13,
                        color: tp === "income" ? C.green : C.red,
                        fontWeight: recForm.type === tp ? "500" : "400",
                      }}
                    >
                      {tp === "income" ? "↑ Ingreso" : "↓ Egreso"}
                    </Text>
                  </Pressable>
                ))}
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
                  Monto
                </Text>
                <TextInput
                  keyboardType="number-pad"
                  value={fmtMoneyDigits(recForm.amountDigits)}
                  onChangeText={(v) =>
                    setRecForm((p) => ({
                      ...p,
                      amountDigits: stripMoneyToDigits(v),
                    }))
                  }
                  style={iS}
                />
              </View>
              {[
                { l: "Descripcion", k: "desc" },
                { l: "Fecha inicio", k: "date" },
              ].map((f) => (
                <View key={f.k} style={{ marginBottom: 12 }}>
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
                  <TextInput
                    value={String(recForm[f.k] || "")}
                    onChangeText={(v) =>
                      setRecForm((p) => ({ ...p, [f.k]: v }))
                    }
                    style={iS}
                  />
                </View>
              ))}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {[
                  { l: "Seccion", k: "section", opts: expenseSections },
                  { l: "Cuenta", k: "account", opts: accounts },
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
                      <ThemedPicker C={C}
                        selectedValue={recForm[f.k]}
                        onValueChange={(v) =>
                          setRecForm((p) => ({ ...p, [f.k]: v }))
                        }
                      >
                        {f.opts.map((o) => (
                          <Picker.Item
                            key={o}
                            label={o}
                            value={o}
                            color={C.text}
                          />
                        ))}
                      </ThemedPicker>
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  Frecuencia
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {Object.entries(FREQ).map(([k, v]) => (
                    <Pressable
                      key={k}
                      onPress={() => setRecForm((p) => ({ ...p, freq: k }))}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: recForm.freq === k ? C.green : C.border,
                        backgroundColor: recForm.freq === k ? C.greenBg : C.bg3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: recForm.freq === k ? C.green : C.muted,
                        }}
                      >
                        {v}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Pressable
                onPress={saveRec}
                style={{
                  width: "100%",
                  paddingVertical: 13,
                  borderRadius: 12,
                  borderWidth: 0,
                  backgroundColor: C.green,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: C.onPrimary,
                    fontSize: 15,
                    fontWeight: "500",
                  }}
                >
                  Guardar
                </Text>
              </Pressable>
            </ScrollView>
          </Modal>
        )}

        {/* AI CHAT */}
        {aiOpen && (
          <Modal onClose={() => setAiOpen(false)} height="78vh">
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 15, fontWeight: "500", color: C.text }}
                >
                  Asistente IA Pro
                </Text>
                <Text style={{ fontSize: 11, color: C.blue, marginTop: 2 }}>
                  Analisis · Registro · Tickets
                </Text>
              </View>
              <Pressable onPress={() => setAiOpen(false)}>
                <Text style={{ fontSize: 22, color: C.muted }}>×</Text>
              </Pressable>
            </View>
            <ScrollView
              ref={aiRef}
              style={{ flex: 1, maxHeight: 280 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
              onContentSizeChange={() =>
                aiRef.current?.scrollToEnd({ animated: true })
              }
            >
              {aiMsgs.map((m, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    justifyContent:
                      m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <View
                    style={{
                      maxWidth: "84%",
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: m.role === "user" ? C.blue : C.border,
                      backgroundColor: m.role === "user" ? C.blue : C.bg3,
                    }}
                  >
                    <Text
                      style={{
                        color: m.role === "user" ? C.onPrimary : C.text,
                        fontSize: 13,
                        lineHeight: 20,
                      }}
                    >
                      {m.text}
                    </Text>
                    {m.highlight && (
                      <Text
                        style={{
                          marginTop: 8,
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: "rgba(34,201,122,0.1)",
                          borderWidth: 1,
                          borderColor: "rgba(34,201,122,0.2)",
                          fontSize: 11,
                          color: C.green,
                        }}
                      >
                        Registrado:{" "}
                        {m.highlight.type === "transfer"
                          ? fmt(m.highlight.amount)
                          : (m.highlight.type === "income" ? "+" : "-") +
                            fmt(m.highlight.amount)}{" "}
                        · {m.highlight.section} · {m.highlight.account} ·{" "}
                        {m.highlight.date}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {aiLoading && (
                <Text
                  style={{
                    padding: 10,
                    backgroundColor: C.bg3,
                    fontSize: 13,
                    color: C.muted,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 14,
                  }}
                >
                  Pensando...
                </Text>
              )}
            </ScrollView>
            {aiImage && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: C.blueBg,
                  borderWidth: 1,
                  borderColor: C.blue,
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 12, color: C.blue, flex: 1 }}>
                  Imagen adjunta
                </Text>
                <Pressable onPress={() => setAiImage(null)}>
                  <Text style={{ color: C.muted }}>×</Text>
                </Pressable>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: C.border,
                alignItems: "center",
              }}
            >
              <Pressable
                onPress={handleImagePick}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: C.bg3,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 16, color: C.text }}>📷</Text>
              </Pressable>
              <TextInput
                value={aiInput}
                onChangeText={setAiInput}
                onSubmitEditing={sendAi}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: C.bg3,
                  color: C.text,
                  fontSize: 13,
                }}
              />
              <Pressable
                onPress={sendAi}
                disabled={aiLoading}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 22,
                  backgroundColor: aiLoading ? C.bg3 : C.blue,
                }}
              >
                <Text style={{ color: C.onPrimary, fontSize: 14 }}>↑</Text>
              </Pressable>
            </View>
          </Modal>
        )}

        {goalModal && (
          <Modal
            onClose={() => setGoalModal(null)}
            title={goalModal.mode === "edit" ? "Editar meta" : "Nueva meta"}
            height="85vh"
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 420 }}
            >
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Nombre
              </Text>
              <TextInput
                value={goalForm.name}
                onChangeText={(v) => setGoalForm((p) => ({ ...p, name: v }))}
                style={{ ...iS, marginBottom: 14 }}
              />
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Monto objetivo
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={fmtMoneyDigits(goalForm.targetDigits)}
                onChangeText={(v) =>
                  setGoalForm((p) => ({
                    ...p,
                    targetDigits: stripMoneyToDigits(v),
                  }))
                }
                style={{ ...iS, marginBottom: 14 }}
              />
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                Fecha limite (YYYY-MM-DD)
              </Text>
              <TextInput
                value={goalForm.deadline}
                onChangeText={(v) =>
                  setGoalForm((p) => ({ ...p, deadline: v }))
                }
                style={{ ...iS, marginBottom: 14 }}
              />
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                Color
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {[C.blue, C.gold, C.green, C.purple, C.red].map((col) => (
                  <Pressable
                    key={col}
                    onPress={() => setGoalForm((p) => ({ ...p, color: col }))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: col,
                      borderWidth: goalForm.color === col ? 3 : 0,
                      borderColor: C.text,
                    }}
                  />
                ))}
              </View>
              <Pressable
                onPress={saveGoalFromModal}
                style={{
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: C.green,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: C.onPrimary,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  Guardar meta
                </Text>
              </Pressable>
            </ScrollView>
          </Modal>
        )}
        {goalWithdrawModal != null && (
          <Modal
            onClose={() => setGoalWithdrawModal(null)}
            title="Retiro desde meta"
          >
            <Text style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
              Meta: {goals.find((x) => x.id === goalWithdrawModal)?.name}{" "}
              (disponible{" "}
              {fmt(goals.find((x) => x.id === goalWithdrawModal)?.saved || 0)})
            </Text>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
              Monto
            </Text>
            <TextInput
              keyboardType="number-pad"
              value={fmtMoneyDigits(goalWithdrawForm.amountDigits)}
              onChangeText={(v) =>
                setGoalWithdrawForm((p) => ({
                  ...p,
                  amountDigits: stripMoneyToDigits(v),
                }))
              }
              style={{ ...iS, marginBottom: 14 }}
            />
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
              Cuenta destino
            </Text>
            <View
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: C.bg3,
                marginBottom: 16,
              }}
            >
              <ThemedPicker C={C}
                selectedValue={goalWithdrawForm.account}
                onValueChange={(v) =>
                  setGoalWithdrawForm((p) => ({ ...p, account: v }))
                }
              >
                {accounts.map((o) => (
                  <Picker.Item key={o} label={o} value={o} color={C.text} />
                ))}
              </ThemedPicker>
            </View>
            <Pressable
              onPress={saveGoalWithdraw}
              style={{
                paddingVertical: 13,
                borderRadius: 12,
                backgroundColor: C.green,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: C.onPrimary,
                  fontSize: 15,
                  fontWeight: 500,
                }}
              >
                Transferir a cuenta
              </Text>
            </Pressable>
          </Modal>
        )}
        {ruleEditor && (
          <Modal
            onClose={() => setRuleEditor(null)}
            height="78vh"
            title={
              alertRules.some((a) => a.id === ruleEditor.id)
                ? "Editar regla"
                : "Nueva regla"
            }
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
        Criterio
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <Pressable
                  onPress={() =>
                    setRuleEditor((p) => ({
                      ...p,
                      rule:
                        p.rule.kind === "budget_threshold"
                          ? p.rule
                          : {
                              kind: "budget_threshold",
                              section:
                                sections.find(
                                  (s) =>
                                    (budget[s] || 0) > 0 &&
                                    s !== "Transferencias",
                                ) ||
                                sections.find(
                                  (s) => s !== "Transferencias",
                                ) ||
                                sections[0],
                              percent: 85,
                            },
                    }))
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor:
                      ruleEditor.rule.kind === "budget_threshold"
                        ? C.blue
                        : C.border,
                    backgroundColor:
                      ruleEditor.rule.kind === "budget_threshold"
                        ? C.blueBg
                        : C.bg3,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color:
                        ruleEditor.rule.kind === "budget_threshold"
                          ? C.blue
                          : C.muted,
                    }}
                  >
                    Presupuesto (mes)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setRuleEditor((p) => ({
                      ...p,
                      rule:
                        p.rule.kind === "account_low"
                          ? p.rule
                          : {
                              kind: "account_low",
                              account: defaultAccount,
                              minBalance: 1000,
                            },
                    }))
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor:
                      ruleEditor.rule.kind === "account_low"
                        ? C.blue
                        : C.border,
                    backgroundColor:
                      ruleEditor.rule.kind === "account_low"
                        ? C.blueBg
                        : C.bg3,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color:
                        ruleEditor.rule.kind === "account_low"
                          ? C.blue
                          : C.muted,
                    }}
                  >
                    Saldo en cuenta
                  </Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
        Gravedad si se cumple
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                <Pressable
                  onPress={() =>
                    setRuleEditor((p) => ({ ...p, severity: "warn" }))
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor:
                      ruleEditor.severity === "warn" ? C.gold : C.border,
                    backgroundColor:
                      ruleEditor.severity === "warn" ? C.goldBg : C.bg3,
                 }}
                >
                  <Text
                    style={{ textAlign: "center", fontSize: 13, color: C.gold }}
                  >
                    Advertencia
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setRuleEditor((p) => ({ ...p, severity: "error" }))
                  }
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor:
                      ruleEditor.severity === "error" ? C.red : C.border,
                    backgroundColor:
                      ruleEditor.severity === "error" ? C.redBg : C.bg3,
                 }}
                >
                  <Text
                    style={{ textAlign: "center", fontSize: 13, color: C.red }}
                  >
                    Atencion
                  </Text>
                </Pressable>
              </View>
              {ruleEditor.rule.kind === "budget_threshold" ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    Seccion (gasto del mes vs presupuesto de esa seccion)
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 10,
                      overflow: "hidden",
                      backgroundColor: C.bg3,
                      marginBottom: 12,
                    }}
                  >
                    <ThemedPicker C={C}
                      selectedValue={ruleEditor.rule.section}
                      onValueChange={(v) =>
                        setRuleEditor((p) =>
                          p.rule.kind === "budget_threshold"
                            ? {
                                ...p,
                                rule: { ...p.rule, section: v },
                              }
                            : p,
                        )
                      }
                    >
                      {sections
                        .filter((s) => s !== "Transferencias")
                        .map((s) => (
                          <Picker.Item key={s} label={s} value={s} />
                        ))}
                    </ThemedPicker>
                  </View>
                  <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    Porcentaje del presupuesto (1-99). Avisa cuando el gasto del
                    mes sea mayor o igual a este porcentaje.
                  </Text>
                  <TextInput
                    value={String(ruleEditor.rule.percent)}
                    onChangeText={(t) => {
                      const n = parseInt(
                        String(t).replace(/\D/g, "") || "0",
                        10,
                      );
                      setRuleEditor((p) =>
                        p.rule.kind === "budget_threshold"
                          ? {
                              ...p,
                              rule: {
                                ...p.rule,
                                percent: Number.isNaN(n)
                                  ? 1
                                  : Math.min(99, Math.max(1, n)),
                              },
                            }
                          : p,
                      );
                    }}
                    keyboardType="number-pad"
                    style={{ ...iS, marginBottom: 4 }}
                  />
                </View>
              ) : (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    Cuenta a vigilar
                  </Text>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: C.border,
                      borderRadius: 10,
                      overflow: "hidden",
                      backgroundColor: C.bg3,
                      marginBottom: 12,
                    }}
                  >
                    <ThemedPicker C={C}
                      selectedValue={ruleEditor.rule.account}
                      onValueChange={(v) =>
                        setRuleEditor((p) =>
                          p.rule.kind === "account_low"
                            ? {
                                ...p,
                                rule: { ...p.rule, account: v },
                              }
                            : p,
                        )
                      }
                    >
                      {accounts.map((o) => (
                        <Picker.Item key={o} label={o} value={o} />
                      ))}
                    </ThemedPicker>
                  </View>
                  <Text style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    Saldo minimo. Avisa si el saldo esta por debajo (y sigue siendo
                    mayor o igual a cero). Los saldos negativos siempre generan
                    alerta de atencion.
                  </Text>
                  <TextInput
                    value={String(ruleEditor.rule.minBalance)}
                    onChangeText={(t) => {
                      const n = parseInt(
                        String(t).replace(/\D/g, "") || "0",
                        10,
                      );
                      setRuleEditor((p) =>
                        p.rule.kind === "account_low"
                          ? {
                              ...p,
                              rule: {
                                ...p.rule,
                                minBalance: Number.isNaN(n)
                                  ? 0
                                  : Math.max(0, n),
                              },
                            }
                          : p,
                      );
                    }}
                    keyboardType="number-pad"
                    style={{ ...iS }}
                  />
                </View>
              )}
              <Pressable
                onPress={() => {
                  let next = ruleEditor;
                  if (ruleEditor.rule.kind === "budget_threshold") {
                    const pct = Math.min(
                      99,
                      Math.max(1, ruleEditor.rule.percent | 0),
                    );
                    next = {
                      ...ruleEditor,
                      rule: { ...ruleEditor.rule, percent: pct },
                    };
                  } else {
                    const m = Math.max(0, ruleEditor.rule.minBalance | 0);
                    next = {
                      ...ruleEditor,
                      rule: { ...ruleEditor.rule, minBalance: m },
                    };
                  }
                  if (
                    next.rule.kind === "account_low" &&
                    next.rule.minBalance <= 0
                  )
                    return;
                  if (alertRules.some((a) => a.id === next.id))
                    setAlertRules((p) =>
                      p.map((x) => (x.id === next.id ? next : x)),
                    );
                  else setAlertRules((p) => [...p, next]);
                  setRuleEditor(null);
                }}
                style={{
                  paddingVertical: 13,
                  borderRadius: 12,
                  backgroundColor: C.blue,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: C.onPrimary,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  Guardar regla
                </Text>
              </Pressable>
            </ScrollView>
          </Modal>
        )}
        {confirmDialog && (
          <Confirm
            msg={confirmDialog.msg}
            confirmLabel={confirmDialog.confirmLabel}
            onYes={() => {
              confirmDialog.onConfirm();
              setConfirmDialog(null);
            }}
            onNo={() => setConfirmDialog(null)}
          />
        )}
        {confirmDelete && (
          <Confirm
            msg="Eliminar esta transaccion? Esta accion no se puede deshacer."
            onYes={() => doDelete(confirmDelete)}
            onNo={() => setConfirmDelete(null)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
