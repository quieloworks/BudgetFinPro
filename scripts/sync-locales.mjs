/**
 * Deep-merge en.json keys into each locale file with per-language overrides.
 * Run from repo root: node scripts/sync-locales.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../src/locales");

function deepMerge(base, patch) {
  if (!patch) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(patch)) {
    const pv = patch[k];
    const bv = out[k];
    if (
      pv &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      out[k] = deepMerge(bv, pv);
    } else {
      out[k] = pv;
    }
  }
  return out;
}

function deepMergeMissing(target, source) {
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (
      sv &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      !(sv instanceof String)
    ) {
      if (!tv || typeof tv !== "object" || Array.isArray(tv)) target[k] = {};
      deepMergeMissing(target[k], sv);
    } else if (target[k] === undefined) {
      target[k] = sv;
    }
  }
}

const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));

/** Per-language overrides (only keys that differ from English structure/meaning). */
const overrides = {
  es: {
    common: {
      monthly: "Mensual",
      annual: "Anual",
      amount: "Monto",
      description: "Descripción",
      startDate: "Fecha de inicio",
      frequency: "Frecuencia",
      severityWhen: "Gravedad si se cumple",
    },
    dashboard: {
      accountsTitle: "Cuentas",
      defaultAccountShort: "Predeterminada:",
      monthlyTrend: "Tendencia mensual",
      trendEmpty:
        "Aún no hay ingresos ni gastos en estos meses.",
      budgetVsActual: "Secciones",
      savingsGoals: "Metas de ahorro",
      moreRecurring: "+{{n}} más",
    },
    hero: { savings: "AHORRO" },
    tx: {
      deleteConfirm:
        "¿Eliminar esta transacción? Esta acción no se puede deshacer.",
    },
    txList: { goalFallback: "Meta" },
    ai: {
      imageAttachedSuffix: " [imagen adjunta]",
      systemPrompt:
        "Eres un asistente financiero. Balance: {{balance}} | Ingresos: {{income}} | Egresos: {{expense}}\nSecciones: {{sections}}\nCuentas: {{accounts}}\nHoy: {{today}}\n\nSi el usuario quiere REGISTRAR, responde con JSON:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nResponde en el idioma del usuario, breve.",
      registeredLine: "Registrado:",
    },
    goals: {
      deleteConfirmMsg:
        "¿Eliminar esta meta? El dinero ahorrado dejará de mostrarse aquí (las transacciones en el listado se conservan).",
      transferDesc: "Ahorro: {{name}}",
      withdrawDesc: "Retiro: {{name}}",
      savedLabel: "Ahorrado",
      targetLabel: "Objetivo",
      advanceLabel: "Avance",
      surplusLine: "Superávit: +{{amount}} sobre la meta",
      surplusShort: "Superávit +{{amount}}",
      linkedMovements: "Movimientos vinculados",
      linkedSub:
        "Transferencias a/desde la meta y coincidencias por nota o sección",
      emptyLinked: "No hay movimientos vinculados",
      daysLeftLine: "{{count}} días restantes",
      limitLine: "Límite: {{date}} · {{count}} días",
      tapDetail: "Toca para ver detalle ›",
      limitProgress: "{{pct}}% · Límite: {{date}}",
      ofTarget: "de {{amount}}",
      goalLine: "Meta:",
    },
    accounts: {
      deleteListMsg:
        "¿Eliminar esta cuenta del listado activo? Si tiene movimientos, permanecerán asociados al nombre.",
      addCta: "+ Agregar cuenta",
      archived: "Archivadas",
      restore: "Restaurar",
      defaultBadge: "Predeterminada",
    },
    recurring: {
      totalExpMonth: "Total egresos/mes",
      totalExpYear: "Total egresos/año",
      addExpense: "+ Agregar gasto recurrente",
      perMonth: "/mes",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} disponible)",
    },
    rules: {
      deleteConfirmMsg: "¿Eliminar esta regla?",
      descriptionBudget:
        "Presupuesto · {{section}}: avisar al llegar al {{percent}}% del mes (si no hay regla, se usa 80%)",
      descriptionAccount:
        "Cuenta · {{account}}: avisar si el saldo cae por debajo de {{amount}}",
      alertsIntro:
        "En Inicio verás avisos cuando ocurran. Sin reglas extras: gasto del mes vs presupuesto (80% advertencia, 100% superado) y cualquier saldo de cuenta negativo.",
      newRuleButton: "+ Nueva regla",
      noRulesEmpty:
        "No hay reglas adicionales. Pulsa arriba para umbrales de presupuesto o saldo mínimo en cuenta.",
      severityWarn: "Advertencia",
      severityError: "Atención",
      active: "Activa",
      gravityWhen: "Gravedad si se cumple",
      budgetMonth: "Presupuesto (mes)",
      accountBalance: "Saldo en cuenta",
      sectionBudgetHelp:
        "Sección (gasto del mes vs presupuesto de esa sección)",
      percentBudgetHelp:
        "Porcentaje del presupuesto (1-99). Avisa cuando el gasto del mes sea mayor o igual a este porcentaje.",
      accountWatch: "Cuenta a vigilar",
      minBalanceHelp:
        "Saldo mínimo. Avisa si el saldo está por debajo (y sigue siendo mayor o igual a cero). Los saldos negativos siempre generan alerta de atención.",
      saveRule: "Guardar regla",
    },
    filters: { allFem: "Todas" },
    reports: {
      monthly: "Mensual",
      annual: "Anual",
      subscriptions: "Suscripciones",
      top10Title: "Top 10 gastos",
      sectionPickHint:
        "Toca una sección para ver todos los movimientos y totales de esa categoría.",
      sectionListEmpty:
        "Aún no hay secciones. Añádelas desde la tarjeta Secciones en Inicio.",
      sectionEmpty: "No hay movimientos en esta sección.",
      sectionEmptyRecurring: "No hay gastos recurrentes en esta sección.",
      rangeDay: "Hoy",
      rangeWeek: "7 días",
      rangeMonth: "Este mes",
      range30: "30 días",
      range60: "60 días",
      range90: "90 días",
      range6m: "6 meses",
      range1y: "1 año",
      accountNetPeriod: "Flujo neto en el periodo por cuenta",
    },
    budget: {
      spent: "Gastado",
      budgetLabel: "Presupuesto",
      exceeded: "Excedido",
      available: "Disponible",
      exceededWith: "Excedido: {{amount}}",
      availableWith: "Disponible: {{amount}}",
      usedPct: "{{pct}}% utilizado",
      transactionsHeading: "Transacciones",
      emptyCategory: "Sin gastos en esta categoría",
      archiveSectionMsg:
        "¿Archivar sección \"{{name}}\"? Dejará de aparecer en el presupuesto activo.",
      deleteSectionMsg:
        "¿Eliminar \"{{name}}\"? Las transacciones de esta sección pasarán a \"{{target}}\".",
      renameSectionTitle: "Renombrar \"{{name}}\"",
      monthAll: "Todos",
    },
    drill: { tapForDetail: "Toca para ver detalle ›" },
    sections: { otherFallback: "Otros" },
  },
  de: {
    common: {
      monthly: "Monatlich",
      annual: "Jährlich",
      amount: "Betrag",
      description: "Beschreibung",
      startDate: "Startdatum",
      frequency: "Häufigkeit",
      severityWhen: "Schweregrad bei Auslösung",
    },
    dashboard: {
      accountsTitle: "Konten",
      defaultAccountShort: "Standard:",
      monthlyTrend: "Monatlicher Trend",
      budgetVsActual: "Bereiche",
      savingsGoals: "Sparziele",
      moreRecurring: "+{{n}} weitere",
    },
    hero: { savings: "SPAREN" },
    tx: {
      deleteConfirm:
        "Diese Transaktion löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    },
    txList: { goalFallback: "Ziel" },
    ai: {
      imageAttachedSuffix: " [Bild angehängt]",
      systemPrompt:
        "Du bist ein Finanzassistent. Saldo: {{balance}} | Einnahmen: {{income}} | Ausgaben: {{expense}}\nKategorien: {{sections}}\nKonten: {{accounts}}\nHeute: {{today}}\n\nWenn der Nutzer REGISTRIEREN möchte, antworte mit JSON:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nAntworte kurz in der Sprache des Nutzers.",
      registeredLine: "Erfasst:",
    },
    goals: {
      deleteConfirmMsg:
        "Dieses Ziel löschen? Gesparte Beträge erscheinen hier nicht mehr (Transaktionen in der Liste bleiben).",
      transferDesc: "Sparen: {{name}}",
      withdrawDesc: "Abhebung: {{name}}",
      savedLabel: "Gespart",
      targetLabel: "Zielbetrag",
      advanceLabel: "Fortschritt",
      surplusLine: "Überschuss: +{{amount}} über dem Ziel",
      surplusShort: "Überschuss +{{amount}}",
      linkedMovements: "Verknüpfte Bewegungen",
      linkedSub:
        "Überweisungen zum/vom Ziel und Treffer nach Notiz oder Kategorie",
      emptyLinked: "Keine verknüpften Bewegungen",
      daysLeftLine: "noch {{count}} Tage",
      limitLine: "Limit: {{date}} · {{count}} Tage",
      tapDetail: "Tippen für Details ›",
      limitProgress: "{{pct}}% · Limit: {{date}}",
      ofTarget: "von {{amount}}",
      goalLine: "Ziel:",
    },
    accounts: {
      deleteListMsg:
        "Dieses Konto aus der aktiven Liste entfernen? Bei vorhandenen Buchungen bleiben sie dem Namen zugeordnet.",
      addCta: "+ Konto hinzufügen",
      archived: "Archiviert",
      restore: "Wiederherstellen",
      defaultBadge: "Standard",
    },
    recurring: {
      totalExpMonth: "Ausgaben gesamt/Monat",
      totalExpYear: "Ausgaben gesamt/Jahr",
      addExpense: "+ Wiederkehrende Ausgabe",
      perMonth: "/Mon.",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} verfügbar)",
    },
    rules: {
      deleteConfirmMsg: "Diese Regel löschen?",
      descriptionBudget:
        "Budget · {{section}}: warnen bei {{percent}}% des Monats (ohne Regel: 80%)",
      descriptionAccount:
        "Konto · {{account}}: warnen, wenn Saldo unter {{amount}} fällt",
      alertsIntro:
        "Auf der Startseite siehst du Hinweise bei Auslösung. Ohne extra Regeln: Monatsausgaben vs. Budget (80% Warnung, 100% überschritten) und negative Kontostände.",
      newRuleButton: "+ Neue Regel",
      noRulesEmpty:
        "Keine zusätzlichen Regeln. Oben tippen für Budget-Schwellen oder Mindestkontostand.",
      severityWarn: "Warnung",
      severityError: "Achtung",
      active: "Aktiv",
      gravityWhen: "Schweregrad bei Auslösung",
      budgetMonth: "Budget (Monat)",
      accountBalance: "Kontostand",
      sectionBudgetHelp:
        "Kategorie (Monatsausgaben vs. Budget dieser Kategorie)",
      percentBudgetHelp:
        "Budget-Prozentsatz (1–99). Warnen, wenn die Monatsausgaben diesen Wert erreichen oder überschreiten.",
      accountWatch: "Zu überwachendes Konto",
      minBalanceHelp:
        "Mindestsaldo. Warnen, wenn der Saldo darunter liegt (und ≥ 0). Negative Salden lösen immer eine Achtungs-Warnung aus.",
      saveRule: "Regel speichern",
    },
    filters: { allFem: "Alle" },
    reports: {
      monthly: "Monatlich",
      annual: "Jährlich",
      subscriptions: "Abonnements",
      sectionPickHint:
        "Tippe auf eine Kategorie, um wiederkehrende Ausgaben in dieser Kategorie zu sehen.",
      sectionListEmpty:
        "Noch keine Bereiche. Füge sie auf der Startseite unter „Bereiche“ hinzu.",
      sectionEmptyRecurring:
        "Keine wiederkehrenden Ausgaben in diesem Bereich.",
    },
    budget: {
      spent: "Ausgegeben",
      budgetLabel: "Budget",
      exceeded: "Überschritten",
      available: "Verfügbar",
      exceededWith: "Überschritten: {{amount}}",
      availableWith: "Verfügbar: {{amount}}",
      usedPct: "{{pct}}% genutzt",
      transactionsHeading: "Transaktionen",
      emptyCategory: "Keine Ausgaben in dieser Kategorie",
      archiveSectionMsg:
        "Kategorie \"{{name}}\" archivieren? Sie erscheint nicht mehr im aktiven Budget.",
      deleteSectionMsg:
        "\"{{name}}\" löschen? Transaktionen dieser Kategorie werden nach \"{{target}}\" verschoben.",
      renameSectionTitle: "\"{{name}}\" umbenennen",
      monthAll: "Alle",
    },
    drill: { tapForDetail: "Tippen für Details ›" },
    sections: { otherFallback: "Otros" },
  },
  fr: {
    common: {
      monthly: "Mensuel",
      annual: "Annuel",
      amount: "Montant",
      description: "Description",
      startDate: "Date de début",
      frequency: "Fréquence",
      severityWhen: "Gravité si déclenché",
    },
    dashboard: {
      accountsTitle: "Comptes",
      defaultAccountShort: "Par défaut :",
      monthlyTrend: "Tendance mensuelle",
      budgetVsActual: "Sections",
      savingsGoals: "Objectifs d’épargne",
      moreRecurring: "+{{n}} de plus",
    },
    hero: { savings: "ÉPARGNE" },
    tx: {
      deleteConfirm:
        "Supprimer cette transaction ? Cette action est irréversible.",
    },
    txList: { goalFallback: "Objectif" },
    ai: {
      imageAttachedSuffix: " [image jointe]",
      systemPrompt:
        "Tu es un assistant financier. Solde : {{balance}} | Revenus : {{income}} | Dépenses : {{expense}}\nSections : {{sections}}\nComptes : {{accounts}}\nAujourd’hui : {{today}}\n\nSi l’utilisateur veut ENREGISTRER, réponds en JSON :\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nRéponds brièvement dans la langue de l’utilisateur.",
      registeredLine: "Enregistré :",
    },
    goals: {
      deleteConfirmMsg:
        "Supprimer cet objectif ? Les montants épargnés ne s’afficheront plus ici (les transactions restent dans la liste).",
      transferDesc: "Épargne : {{name}}",
      withdrawDesc: "Retrait : {{name}}",
      savedLabel: "Épargné",
      targetLabel: "Cible",
      advanceLabel: "Avancement",
      surplusLine: "Excédent : +{{amount}} au-dessus de l’objectif",
      surplusShort: "Excédent +{{amount}}",
      linkedMovements: "Mouvements liés",
      linkedSub:
        "Virements vers/depuis l’objectif et correspondances par note ou section",
      emptyLinked: "Aucun mouvement lié",
      daysLeftLine: "{{count}} jours restants",
      limitLine: "Limite : {{date}} · {{count}} jours",
      tapDetail: "Appuyer pour le détail ›",
      limitProgress: "{{pct}}% · Limite : {{date}}",
      ofTarget: "sur {{amount}}",
      goalLine: "Objectif :",
    },
    accounts: {
      deleteListMsg:
        "Retirer ce compte de la liste active ? Si des mouvements existent, ils restent liés au nom.",
      addCta: "+ Ajouter un compte",
      archived: "Archivés",
      restore: "Restaurer",
      defaultBadge: "Par défaut",
    },
    recurring: {
      totalExpMonth: "Total dépenses/mois",
      totalExpYear: "Total dépenses/an",
      addExpense: "+ Ajouter une dépense récurrente",
      perMonth: "/mois",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} disponible)",
    },
    rules: {
      deleteConfirmMsg: "Supprimer cette règle ?",
      descriptionBudget:
        "Budget · {{section}} : alerter à {{percent}}% du mois (sans règle : 80%)",
      descriptionAccount:
        "Compte · {{account}} : alerter si le solde passe sous {{amount}}",
      alertsIntro:
        "Sur l’accueil vous verrez les alertes déclenchées. Sans règles supplémentaires : dépense du mois vs budget (80% avertissement, 100% dépassé) et tout solde négatif.",
      newRuleButton: "+ Nouvelle règle",
      noRulesEmpty:
        "Aucune règle supplémentaire. Touchez ci-dessus pour des seuils de budget ou un solde minimum.",
      severityWarn: "Avertissement",
      severityError: "Attention",
      active: "Active",
      gravityWhen: "Gravité si déclenché",
      budgetMonth: "Budget (mois)",
      accountBalance: "Solde du compte",
      sectionBudgetHelp:
        "Section (dépense du mois vs budget de cette section)",
      percentBudgetHelp:
        "Pourcentage du budget (1–99). Alerter quand la dépense du mois atteint ou dépasse ce pourcentage.",
      accountWatch: "Compte à surveiller",
      minBalanceHelp:
        "Solde minimum. Alerter si le solde est en dessous (et toujours ≥ 0). Les soldes négatifs déclenchent toujours une alerte attention.",
      saveRule: "Enregistrer la règle",
    },
    filters: { allFem: "Toutes" },
    reports: {
      monthly: "Mensuel",
      annual: "Annuel",
      subscriptions: "Abonnements",
      sectionPickHint:
        "Appuyez sur une section pour voir les dépenses récurrentes de cette catégorie.",
      sectionListEmpty:
        "Pas encore de sections. Ajoutez-les depuis la carte Sections sur l’accueil.",
      sectionEmptyRecurring:
        "Aucune dépense récurrente dans cette section.",
    },
    budget: {
      spent: "Dépensé",
      budgetLabel: "Budget",
      exceeded: "Dépassé",
      available: "Disponible",
      exceededWith: "Dépassé : {{amount}}",
      availableWith: "Disponible : {{amount}}",
      usedPct: "{{pct}}% utilisé",
      transactionsHeading: "Transactions",
      emptyCategory: "Aucune dépense dans cette catégorie",
      archiveSectionMsg:
        "Archiver la section « {{name}} » ? Elle n’apparaîtra plus dans le budget actif.",
      deleteSectionMsg:
        "Supprimer « {{name}} » ? Les transactions iront vers « {{target}} ».",
      renameSectionTitle: "Renommer « {{name}} »",
      monthAll: "Tous",
    },
    drill: { tapForDetail: "Appuyer pour le détail ›" },
    sections: { otherFallback: "Otros" },
  },
  pt: {
    common: {
      monthly: "Mensal",
      annual: "Anual",
      amount: "Valor",
      description: "Descrição",
      startDate: "Data de início",
      frequency: "Frequência",
      severityWhen: "Gravidade ao disparar",
    },
    dashboard: {
      accountsTitle: "Contas",
      defaultAccountShort: "Padrão:",
      monthlyTrend: "Tendência mensal",
      budgetVsActual: "Secções",
      savingsGoals: "Metas de poupança",
      moreRecurring: "+{{n}} mais",
    },
    hero: { savings: "POUPANÇA" },
    tx: {
      deleteConfirm:
        "Eliminar esta transação? Esta ação não pode ser desfeita.",
    },
    txList: { goalFallback: "Meta" },
    ai: {
      imageAttachedSuffix: " [imagem anexada]",
      systemPrompt:
        "És um assistente financeiro. Saldo: {{balance}} | Receitas: {{income}} | Despesas: {{expense}}\nSecções: {{sections}}\nContas: {{accounts}}\nHoje: {{today}}\n\nSe o utilizador quiser REGISTAR, responde com JSON:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nResponde brevemente na língua do utilizador.",
      registeredLine: "Registado:",
    },
    goals: {
      deleteConfirmMsg:
        "Eliminar esta meta? Os valores poupados deixam de aparecer aqui (as transações na lista mantêm-se).",
      transferDesc: "Poupança: {{name}}",
      withdrawDesc: "Levantamento: {{name}}",
      savedLabel: "Poupado",
      targetLabel: "Objetivo",
      advanceLabel: "Progresso",
      surplusLine: "Excedente: +{{amount}} acima da meta",
      surplusShort: "Excedente +{{amount}}",
      linkedMovements: "Movimentos ligados",
      linkedSub:
        "Transferências de/para a meta e correspondências por nota ou secção",
      emptyLinked: "Sem movimentos ligados",
      daysLeftLine: "{{count}} dias restantes",
      limitLine: "Limite: {{date}} · {{count}} dias",
      tapDetail: "Toque para ver detalhe ›",
      limitProgress: "{{pct}}% · Limite: {{date}}",
      ofTarget: "de {{amount}}",
      goalLine: "Meta:",
    },
    accounts: {
      deleteListMsg:
        "Remover esta conta da lista ativa? Se tiver movimentos, ficam associados ao nome.",
      addCta: "+ Adicionar conta",
      archived: "Arquivadas",
      restore: "Restaurar",
      defaultBadge: "Padrão",
    },
    recurring: {
      totalExpMonth: "Total despesas/mês",
      totalExpYear: "Total despesas/ano",
      addExpense: "+ Adicionar despesa recorrente",
      perMonth: "/mês",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} disponível)",
    },
    rules: {
      deleteConfirmMsg: "Eliminar esta regra?",
      descriptionBudget:
        "Orçamento · {{section}}: avisar ao atingir {{percent}}% do mês (sem regra: 80%)",
      descriptionAccount:
        "Conta · {{account}}: avisar se o saldo cair abaixo de {{amount}}",
      alertsIntro:
        "No Início verás alertas quando dispararem. Sem regras extra: despesa do mês vs orçamento (80% aviso, 100% ultrapassado) e saldos negativos.",
      newRuleButton: "+ Nova regra",
      noRulesEmpty:
        "Sem regras adicionais. Toque acima para limiares de orçamento ou saldo mínimo.",
      severityWarn: "Aviso",
      severityError: "Atenção",
      active: "Ativa",
      gravityWhen: "Gravidade ao disparar",
      budgetMonth: "Orçamento (mês)",
      accountBalance: "Saldo da conta",
      sectionBudgetHelp:
        "Secção (despesa do mês vs orçamento dessa secção)",
      percentBudgetHelp:
        "Percentagem do orçamento (1–99). Avisar quando a despesa do mês atingir ou exceder este valor.",
      accountWatch: "Conta a vigiar",
      minBalanceHelp:
        "Saldo mínimo. Avisar se o saldo estiver abaixo (e ainda ≥ 0). Saldos negativos geram sempre alerta de atenção.",
      saveRule: "Guardar regra",
    },
    filters: { allFem: "Todas" },
    reports: {
      monthly: "Mensal",
      annual: "Anual",
      subscriptions: "Subscrições",
      sectionPickHint:
        "Toque numa secção para ver despesas recorrentes nessa categoria.",
      sectionListEmpty:
        "Ainda não há secções. Adicione-as no cartão Secções na página inicial.",
      sectionEmptyRecurring:
        "Sem despesas recorrentes nesta secção.",
    },
    budget: {
      spent: "Gasto",
      budgetLabel: "Orçamento",
      exceeded: "Excedido",
      available: "Disponível",
      exceededWith: "Excedido: {{amount}}",
      availableWith: "Disponível: {{amount}}",
      usedPct: "{{pct}}% usado",
      transactionsHeading: "Transações",
      emptyCategory: "Sem despesas nesta categoria",
      archiveSectionMsg:
        "Arquivar secção \"{{name}}\"? Deixa de aparecer no orçamento ativo.",
      deleteSectionMsg:
        "Eliminar \"{{name}}\"? As transações passam para \"{{target}}\".",
      renameSectionTitle: "Renomear \"{{name}}\"",
      monthAll: "Todos",
    },
    drill: { tapForDetail: "Toque para ver detalhe ›" },
    sections: { otherFallback: "Otros" },
  },
  it: {
    common: {
      monthly: "Mensile",
      annual: "Annuale",
      amount: "Importo",
      description: "Descrizione",
      startDate: "Data inizio",
      frequency: "Frequenza",
      severityWhen: "Gravità se attivata",
    },
    dashboard: {
      accountsTitle: "Conti",
      defaultAccountShort: "Predefinito:",
      monthlyTrend: "Andamento mensile",
      budgetVsActual: "Sezioni",
      savingsGoals: "Obiettivi di risparmio",
      moreRecurring: "+{{n}} in più",
    },
    hero: { savings: "RISPARMIO" },
    tx: {
      deleteConfirm:
        "Eliminare questa transazione? L’azione non può essere annullata.",
    },
    txList: { goalFallback: "Obiettivo" },
    ai: {
      imageAttachedSuffix: " [immagine allegata]",
      systemPrompt:
        "Sei un assistente finanziario. Saldo: {{balance}} | Entrate: {{income}} | Uscite: {{expense}}\nSezioni: {{sections}}\nConti: {{accounts}}\nOggi: {{today}}\n\nSe l’utente vuole REGISTRARE, rispondi con JSON:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nRispondi brevemente nella lingua dell’utente.",
      registeredLine: "Registrato:",
    },
    goals: {
      deleteConfirmMsg:
        "Eliminare questo obiettivo? Gli importi risparmiati non verranno più mostrati qui (le transazioni nella lista restano).",
      transferDesc: "Risparmio: {{name}}",
      withdrawDesc: "Prelievo: {{name}}",
      savedLabel: "Risparmiato",
      targetLabel: "Obiettivo",
      advanceLabel: "Avanzamento",
      surplusLine: "Surplus: +{{amount}} oltre l’obiettivo",
      surplusShort: "Surplus +{{amount}}",
      linkedMovements: "Movimenti collegati",
      linkedSub:
        "Trasferimenti verso/dall’obiettivo e corrispondenze per nota o sezione",
      emptyLinked: "Nessun movimento collegato",
      daysLeftLine: "{{count}} giorni rimanenti",
      limitLine: "Limite: {{date}} · {{count}} giorni",
      tapDetail: "Tocca per il dettaglio ›",
      limitProgress: "{{pct}}% · Limite: {{date}}",
      ofTarget: "di {{amount}}",
      goalLine: "Obiettivo:",
    },
    accounts: {
      deleteListMsg:
        "Rimuovere questo conto dall’elenco attivo? Se ha movimenti, restano collegati al nome.",
      addCta: "+ Aggiungi conto",
      archived: "Archiviati",
      restore: "Ripristina",
      defaultBadge: "Predefinito",
    },
    recurring: {
      totalExpMonth: "Totale uscite/mese",
      totalExpYear: "Totale uscite/anno",
      addExpense: "+ Aggiungi spesa ricorrente",
      perMonth: "/mese",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} disponibile)",
    },
    rules: {
      deleteConfirmMsg: "Eliminare questa regola?",
      descriptionBudget:
        "Budget · {{section}}: avvisa al {{percent}}% del mese (senza regola: 80%)",
      descriptionAccount:
        "Conto · {{account}}: avvisa se il saldo scende sotto {{amount}}",
      alertsIntro:
        "In Home vedrai gli avvisi quando scattano. Senza regole extra: spesa del mese vs budget (80% avviso, 100% superato) e saldi negativi.",
      newRuleButton: "+ Nuova regola",
      noRulesEmpty:
        "Nessuna regola aggiuntiva. Tocca sopra per soglie di budget o saldo minimo.",
      severityWarn: "Avviso",
      severityError: "Attenzione",
      active: "Attiva",
      gravityWhen: "Gravità se attivata",
      budgetMonth: "Budget (mese)",
      accountBalance: "Saldo conto",
      sectionBudgetHelp:
        "Sezione (spesa del mese vs budget di quella sezione)",
      percentBudgetHelp:
        "Percentuale del budget (1–99). Avvisa quando la spesa del mese raggiunge o supera questa percentuale.",
      accountWatch: "Conto da monitorare",
      minBalanceHelp:
        "Saldo minimo. Avvisa se il saldo è sotto questo valore (e ancora ≥ 0). I saldi negativi generano sempre un avviso di attenzione.",
      saveRule: "Salva regola",
    },
    filters: { allFem: "Tutte" },
    reports: {
      monthly: "Mensile",
      annual: "Annuale",
      subscriptions: "Abbonamenti",
      sectionPickHint:
        "Tocca una sezione per vedere le spese ricorrenti in quella categoria.",
      sectionListEmpty:
        "Nessuna sezione ancora. Aggiungile dalla scheda Sezioni nella Home.",
      sectionEmptyRecurring:
        "Nessuna spesa ricorrente in questa sezione.",
    },
    budget: {
      spent: "Speso",
      budgetLabel: "Budget",
      exceeded: "Superato",
      available: "Disponibile",
      exceededWith: "Superato: {{amount}}",
      availableWith: "Disponibile: {{amount}}",
      usedPct: "{{pct}}% usato",
      transactionsHeading: "Transazioni",
      emptyCategory: "Nessuna spesa in questa categoria",
      archiveSectionMsg:
        "Archiviare la sezione \"{{name}}\"? Non apparirà più nel budget attivo.",
      deleteSectionMsg:
        "Eliminare \"{{name}}\"? Le transazioni passeranno a \"{{target}}\".",
      renameSectionTitle: "Rinomina \"{{name}}\"",
      monthAll: "Tutti",
    },
    drill: { tapForDetail: "Tocca per il dettaglio ›" },
    sections: { otherFallback: "Otros" },
  },
  ru: {
    common: {
      monthly: "В месяц",
      annual: "В год",
      amount: "Сумма",
      description: "Описание",
      startDate: "Дата начала",
      frequency: "Периодичность",
      severityWhen: "Важность при срабатывании",
    },
    dashboard: {
      accountsTitle: "Счета",
      defaultAccountShort: "По умолчанию:",
      monthlyTrend: "Месячный тренд",
      budgetVsActual: "Разделы",
      savingsGoals: "Цели накоплений",
      moreRecurring: "+ещё {{n}}",
    },
    hero: { savings: "НАКОПЛЕНИЯ" },
    tx: {
      deleteConfirm:
        "Удалить эту операцию? Действие нельзя отменить.",
    },
    txList: { goalFallback: "Цель" },
    ai: {
      imageAttachedSuffix: " [изображение прикреплено]",
      systemPrompt:
        "Ты финансовый помощник. Баланс: {{balance}} | Доходы: {{income}} | Расходы: {{expense}}\nКатегории: {{sections}}\nСчета: {{accounts}}\nСегодня: {{today}}\n\nЕсли пользователь хочет ЗАПИСАТЬ операцию, ответь JSON:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nОтвечай кратко на языке пользователя.",
      registeredLine: "Записано:",
    },
    goals: {
      deleteConfirmMsg:
        "Удалить эту цель? Накопления здесь больше не отобразятся (транзакции в списке сохранятся).",
      transferDesc: "Накопление: {{name}}",
      withdrawDesc: "Снятие: {{name}}",
      savedLabel: "Накоплено",
      targetLabel: "Цель",
      advanceLabel: "Прогресс",
      surplusLine: "Профицит: +{{amount}} сверх цели",
      surplusShort: "Профицит +{{amount}}",
      linkedMovements: "Связанные операции",
      linkedSub:
        "Переводы к/от цели и совпадения по заметке или категории",
      emptyLinked: "Нет связанных операций",
      daysLeftLine: "осталось {{count}} дн.",
      limitLine: "Срок: {{date}} · {{count}} дн.",
      tapDetail: "Нажмите для деталей ›",
      limitProgress: "{{pct}}% · Срок: {{date}}",
      ofTarget: "из {{amount}}",
      goalLine: "Цель:",
    },
    accounts: {
      deleteListMsg:
        "Убрать счёт из активного списка? Если есть операции, они останутся привязаны к имени.",
      addCta: "+ Добавить счёт",
      archived: "В архиве",
      restore: "Восстановить",
      defaultBadge: "По умолчанию",
    },
    recurring: {
      totalExpMonth: "Расходы всего/мес",
      totalExpYear: "Расходы всего/год",
      addExpense: "+ Повторяющийся расход",
      perMonth: "/мес",
    },
    withdraw: {
      goalAvailableLine: "{{name}} (доступно {{amount}})",
    },
    rules: {
      deleteConfirmMsg: "Удалить это правило?",
      descriptionBudget:
        "Бюджет · {{section}}: предупредить при {{percent}}% месяца (без правила: 80%)",
      descriptionAccount:
        "Счёт · {{account}}: предупредить, если баланс ниже {{amount}}",
      alertsIntro:
        "На главном экране будут уведомления при срабатывании. Без доп. правил: расход месяца vs бюджет (80% предупреждение, 100% превышение) и отрицательные остатки.",
      newRuleButton: "+ Новое правило",
      noRulesEmpty:
        "Нет дополнительных правил. Нажмите выше для порогов бюджета или минимального остатка.",
      severityWarn: "Предупреждение",
      severityError: "Внимание",
      active: "Вкл.",
      gravityWhen: "Важность при срабатывании",
      budgetMonth: "Бюджет (месяц)",
      accountBalance: "Остаток на счёте",
      sectionBudgetHelp:
        "Категория (расход месяца vs бюджет этой категории)",
      percentBudgetHelp:
        "Процент бюджета (1–99). Предупредить, когда расход месяца достигает или превышает этот процент.",
      accountWatch: "Счёт для контроля",
      minBalanceHelp:
        "Минимальный остаток. Предупредить, если остаток ниже (и всё ещё ≥ 0). Отрицательные остатки всегда дают важное уведомление.",
      saveRule: "Сохранить правило",
    },
    filters: { allFem: "Все" },
    reports: {
      monthly: "В месяц",
      annual: "В год",
      subscriptions: "Подписки",
      sectionPickHint:
        "Нажмите на раздел, чтобы увидеть повторяющиеся расходы в этой категории.",
      sectionListEmpty:
        "Разделов пока нет. Добавьте их на вкладке «Разделы» на главном экране.",
      sectionEmptyRecurring:
        "В этом разделе нет повторяющихся расходов.",
    },
    budget: {
      spent: "Потрачено",
      budgetLabel: "Бюджет",
      exceeded: "Превышено",
      available: "Доступно",
      exceededWith: "Превышено: {{amount}}",
      availableWith: "Доступно: {{amount}}",
      usedPct: "{{pct}}% использовано",
      transactionsHeading: "Операции",
      emptyCategory: "Нет расходов в этой категории",
      archiveSectionMsg:
        "Архивировать категорию «{{name}}»? Она исчезнет из активного бюджета.",
      deleteSectionMsg:
        "Удалить «{{name}}»? Транзакции перейдут в «{{target}}».",
      renameSectionTitle: "Переименовать «{{name}}»",
      monthAll: "Все",
    },
    drill: { tapForDetail: "Нажмите для деталей ›" },
    sections: { otherFallback: "Otros" },
  },
  ja: {
    common: {
      monthly: "月次",
      annual: "年次",
      amount: "金額",
      description: "説明",
      startDate: "開始日",
      frequency: "頻度",
      severityWhen: "発動時の重要度",
    },
    dashboard: {
      accountsTitle: "口座",
      defaultAccountShort: "デフォルト:",
      monthlyTrend: "月次トレンド",
      budgetVsActual: "セクション",
      savingsGoals: "貯蓄目標",
      moreRecurring: "あと{{n}}件",
    },
    hero: { savings: "貯蓄" },
    tx: {
      deleteConfirm:
        "この取引を削除しますか？この操作は取り消せません。",
    },
    txList: { goalFallback: "目標" },
    ai: {
      imageAttachedSuffix: " [画像を添付]",
      systemPrompt:
        "あなたは財務アシスタントです。残高: {{balance}} | 収入: {{income}} | 支出: {{expense}}\n区分: {{sections}}\n口座: {{accounts}}\n今日: {{today}}\n\nユーザーが登録を希望する場合は JSON で返答:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nユーザーの言語で簡潔に。",
      registeredLine: "登録済み:",
    },
    goals: {
      deleteConfirmMsg:
        "この目標を削除しますか？貯めた金額はここに表示されなくなります（一覧の取引は残ります）。",
      transferDesc: "貯蓄: {{name}}",
      withdrawDesc: "引出: {{name}}",
      savedLabel: "貯蓄額",
      targetLabel: "目標額",
      advanceLabel: "進捗",
      surplusLine: "余剰: 目標を +{{amount}} 上回っています",
      surplusShort: "余剰 +{{amount}}",
      linkedMovements: "関連する取引",
      linkedSub:
        "目標への振替・メモや区分の一致",
      emptyLinked: "関連する取引はありません",
      daysLeftLine: "残り{{count}}日",
      limitLine: "期限: {{date}} · {{count}}日",
      tapDetail: "タップして詳細 ›",
      limitProgress: "{{pct}}% · 期限: {{date}}",
      ofTarget: "{{amount}} のうち",
      goalLine: "目標:",
    },
    accounts: {
      deleteListMsg:
        "この口座を一覧から外しますか？取引がある場合は名前に紐づいたままです。",
      addCta: "+ 口座を追加",
      archived: "アーカイブ",
      restore: "復元",
      defaultBadge: "デフォルト",
    },
    recurring: {
      totalExpMonth: "支出合計/月",
      totalExpYear: "支出合計/年",
      addExpense: "+ 定期支出を追加",
      perMonth: "/月",
    },
    withdraw: {
      goalAvailableLine: "{{name}}（利用可能 {{amount}}）",
    },
    rules: {
      deleteConfirmMsg: "このルールを削除しますか？",
      descriptionBudget:
        "予算 · {{section}}: 月の {{percent}}% で通知（ルールなしは80%）",
      descriptionAccount:
        "口座 · {{account}}: 残高が {{amount}} を下回ったら通知",
      alertsIntro:
        "ホームで条件に達すると通知します。追加ルールなしの場合: 月の支出と予算（80%で警告、100%で超過）およびマイナス残高。",
      newRuleButton: "+ 新しいルール",
      noRulesEmpty:
        "追加ルールはありません。上から予算しきい値や最低残高を設定してください。",
      severityWarn: "警告",
      severityError: "注意",
      active: "有効",
      gravityWhen: "発動時の重要度",
      budgetMonth: "予算（月）",
      accountBalance: "口座残高",
      sectionBudgetHelp:
        "区分（月の支出とその区分の予算）",
      percentBudgetHelp:
        "予算の割合（1〜99）。月の支出がこの割合に達したら通知。",
      accountWatch: "監視する口座",
      minBalanceHelp:
        "最低残高。これを下回ったら通知（0以上のとき）。マイナス残高は常に注意通知。",
      saveRule: "ルールを保存",
    },
    filters: { allFem: "すべて" },
    reports: {
      monthly: "月次",
      annual: "年次",
      subscriptions: "サブスク",
      sectionPickHint:
        "カテゴリをタップすると、そのカテゴリの定期支出が表示されます。",
      sectionListEmpty:
        "まだセクションがありません。ホームの「セクション」カードから追加できます。",
      sectionEmptyRecurring: "このセクションに定期支出はありません。",
    },
    budget: {
      spent: "支出",
      budgetLabel: "予算",
      exceeded: "超過",
      available: "残り",
      exceededWith: "超過: {{amount}}",
      availableWith: "残り: {{amount}}",
      usedPct: "{{pct}}% 使用",
      transactionsHeading: "取引",
      emptyCategory: "この区分に支出はありません",
      archiveSectionMsg:
        "区分「{{name}}」をアーカイブしますか？アクティブな予算に表示されなくなります。",
      deleteSectionMsg:
        "「{{name}}」を削除しますか？取引は「{{target}}」に移ります。",
      renameSectionTitle: "「{{name}}」の名前を変更",
      monthAll: "すべて",
    },
    drill: { tapForDetail: "タップして詳細 ›" },
    sections: { otherFallback: "Otros" },
  },
  zh: {
    common: {
      monthly: "每月",
      annual: "每年",
      amount: "金额",
      description: "说明",
      startDate: "开始日期",
      frequency: "频率",
      severityWhen: "触发时严重程度",
    },
    dashboard: {
      accountsTitle: "账户",
      defaultAccountShort: "默认：",
      monthlyTrend: "月度趋势",
      budgetVsActual: "分类",
      savingsGoals: "储蓄目标",
      moreRecurring: "另 {{n}} 条",
    },
    hero: { savings: "储蓄" },
    tx: {
      deleteConfirm:
        "删除此交易？此操作无法撤销。",
    },
    txList: { goalFallback: "目标" },
    ai: {
      imageAttachedSuffix: " [已附加图片]",
      systemPrompt:
        "你是财务助手。余额：{{balance}} | 收入：{{income}} | 支出：{{expense}}\n分类：{{sections}}\n账户：{{accounts}}\n今天：{{today}}\n\n若用户要登记，请用 JSON 回复：\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\n请用用户的语言简短回复。",
      registeredLine: "已登记：",
    },
    goals: {
      deleteConfirmMsg:
        "删除此目标？已存金额将不再显示（列表中的交易保留）。",
      transferDesc: "储蓄：{{name}}",
      withdrawDesc: "取出：{{name}}",
      savedLabel: "已存",
      targetLabel: "目标金额",
      advanceLabel: "进度",
      surplusLine: "结余：超出目标 +{{amount}}",
      surplusShort: "结余 +{{amount}}",
      linkedMovements: "关联流水",
      linkedSub:
        "与目标之间的转账及备注/分类匹配",
      emptyLinked: "无关联流水",
      daysLeftLine: "剩余 {{count}} 天",
      limitLine: "截止：{{date}} · {{count}} 天",
      tapDetail: "点按查看详情 ›",
      limitProgress: "{{pct}}% · 截止：{{date}}",
      ofTarget: "共 {{amount}}",
      goalLine: "目标：",
    },
    accounts: {
      deleteListMsg:
        "从当前列表移除此账户？若有交易，仍将关联该名称。",
      addCta: "+ 添加账户",
      archived: "已归档",
      restore: "恢复",
      defaultBadge: "默认",
    },
    recurring: {
      totalExpMonth: "支出合计/月",
      totalExpYear: "支出合计/年",
      addExpense: "+ 添加定期支出",
      perMonth: "/月",
    },
    withdraw: {
      goalAvailableLine: "{{name}}（可用 {{amount}}）",
    },
    rules: {
      deleteConfirmMsg: "删除此规则？",
      descriptionBudget:
        "预算 · {{section}}：达到当月 {{percent}}% 时提醒（无规则则用 80%）",
      descriptionAccount:
        "账户 · {{account}}：余额低于 {{amount}} 时提醒",
      alertsIntro:
        "在首页触发时会看到提醒。无额外规则时：月度支出与预算（80% 警告，100% 超支）以及任何负余额。",
      newRuleButton: "+ 新规则",
      noRulesEmpty:
        "暂无额外规则。点击上方设置预算阈值或最低余额。",
      severityWarn: "警告",
      severityError: "注意",
      active: "启用",
      gravityWhen: "触发时严重程度",
      budgetMonth: "预算（月）",
      accountBalance: "账户余额",
      sectionBudgetHelp:
        "分类（月度支出与该分类预算）",
      percentBudgetHelp:
        "预算百分比（1–99）。当月支出达到或超过该比例时提醒。",
      accountWatch: "要监控的账户",
      minBalanceHelp:
        "最低余额。低于此值且仍≥0时提醒。负余额始终触发注意提醒。",
      saveRule: "保存规则",
    },
    filters: { allFem: "全部" },
    reports: {
      monthly: "每月",
      annual: "每年",
      subscriptions: "订阅",
      sectionPickHint: "点按分类即可查看该分类的定期支出。",
      sectionListEmpty: "还没有分类。请在主页的「分类」卡片中添加。",
      sectionEmptyRecurring: "该分类下没有定期支出。",
    },
    budget: {
      spent: "已花",
      budgetLabel: "预算",
      exceeded: "超支",
      available: "可用",
      exceededWith: "超支：{{amount}}",
      availableWith: "可用：{{amount}}",
      usedPct: "已用 {{pct}}%",
      transactionsHeading: "交易",
      emptyCategory: "此分类无支出",
      archiveSectionMsg:
        "归档分类「{{name}}」？它将不再出现在活动预算中。",
      deleteSectionMsg:
        "删除「{{name}}」？该分类的交易将移至「{{target}}」。",
      renameSectionTitle: "重命名「{{name}}」",
      monthAll: "全部",
    },
    drill: { tapForDetail: "点按查看详情 ›" },
    sections: { otherFallback: "Otros" },
  },
  ko: {
    common: {
      monthly: "월간",
      annual: "연간",
      amount: "금액",
      description: "설명",
      startDate: "시작일",
      frequency: "빈도",
      severityWhen: "발동 시 심각도",
    },
    dashboard: {
      accountsTitle: "계좌",
      defaultAccountShort: "기본:",
      monthlyTrend: "월별 추세",
      budgetVsActual: "섹션",
      savingsGoals: "저축 목표",
      moreRecurring: "{{n}}개 더",
    },
    hero: { savings: "저축" },
    tx: {
      deleteConfirm:
        "이 거래를 삭제할까요? 실행 취소할 수 없습니다.",
    },
    txList: { goalFallback: "목표" },
    ai: {
      imageAttachedSuffix: " [이미지 첨부]",
      systemPrompt:
        "당신은 재무 도우미입니다. 잔액: {{balance}} | 수입: {{income}} | 지출: {{expense}}\n구분: {{sections}}\n계좌: {{accounts}}\n오늘: {{today}}\n\n사용자가 등록을 원하면 JSON으로 답하세요:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\n사용자 언어로 짧게 답하세요.",
      registeredLine: "등록됨:",
    },
    goals: {
      deleteConfirmMsg:
        "이 목표를 삭제할까요? 저축된 금액은 더 이상 표시되지 않습니다(목록의 거래는 유지).",
      transferDesc: "저축: {{name}}",
      withdrawDesc: "인출: {{name}}",
      savedLabel: "저축액",
      targetLabel: "목표액",
      advanceLabel: "진행",
      surplusLine: "잉여: 목표보다 +{{amount}}",
      surplusShort: "잉여 +{{amount}}",
      linkedMovements: "연결된 거래",
      linkedSub:
        "목표로의 이체 및 메모·구간 일치",
      emptyLinked: "연결된 거래 없음",
      daysLeftLine: "{{count}}일 남음",
      limitLine: "마감: {{date}} · {{count}}일",
      tapDetail: "탭하여 상세 ›",
      limitProgress: "{{pct}}% · 마감: {{date}}",
      ofTarget: "{{amount}} 중",
      goalLine: "목표:",
    },
    accounts: {
      deleteListMsg:
        "활성 목록에서 이 계좌를 제거할까요? 거래가 있으면 이름에 연결된 채입니다.",
      addCta: "+ 계좌 추가",
      archived: "보관됨",
      restore: "복원",
      defaultBadge: "기본",
    },
    recurring: {
      totalExpMonth: "지출 합계/월",
      totalExpYear: "지출 합계/년",
      addExpense: "+ 반복 지출 추가",
      perMonth: "/월",
    },
    withdraw: {
      goalAvailableLine: "{{name}} (사용 가능 {{amount}})",
    },
    rules: {
      deleteConfirmMsg: "이 규칙을 삭제할까요?",
      descriptionBudget:
        "예산 · {{section}}: 월 {{percent}}% 도달 시 알림(규칙 없으면 80%)",
      descriptionAccount:
        "계좌 · {{account}}: 잔액이 {{amount}} 아래로 떨어지면 알림",
      alertsIntro:
        "홈에서 조건이 맞으면 알림이 표시됩니다. 추가 규칙 없음: 월 지출 대 예산(80% 경고, 100% 초과) 및 음수 잔액.",
      newRuleButton: "+ 새 규칙",
      noRulesEmpty:
        "추가 규칙이 없습니다. 위에서 예산 임계값이나 최소 잔액을 설정하세요.",
      severityWarn: "경고",
      severityError: "주의",
      active: "켜짐",
      gravityWhen: "발동 시 심각도",
      budgetMonth: "예산(월)",
      accountBalance: "계좌 잔액",
      sectionBudgetHelp:
        "구간(월 지출 vs 해당 구간 예산)",
      percentBudgetHelp:
        "예산 비율(1–99). 월 지출이 이 비율에 도달하면 알림.",
      accountWatch: "감시할 계좌",
      minBalanceHelp:
        "최소 잔액. 이보다 낮아지면 알림(0 이상일 때). 음수 잔액은 항상 주의 알림.",
      saveRule: "규칙 저장",
    },
    filters: { allFem: "전체" },
    reports: {
      monthly: "월간",
      annual: "연간",
      subscriptions: "구독",
      sectionPickHint:
        "섹션을 탭하면 해당 카테고리의 정기 지출을 볼 수 있습니다.",
      sectionListEmpty:
        "아직 섹션이 없습니다. 홈에서 섹션 카드로 추가하세요.",
      sectionEmptyRecurring: "이 섹션에 정기 지출이 없습니다.",
    },
    budget: {
      spent: "지출",
      budgetLabel: "예산",
      exceeded: "초과",
      available: "가용",
      exceededWith: "초과: {{amount}}",
      availableWith: "가용: {{amount}}",
      usedPct: "{{pct}}% 사용",
      transactionsHeading: "거래",
      emptyCategory: "이 구간에 지출 없음",
      archiveSectionMsg:
        "구간 \"{{name}}\"을(를) 보관할까요? 활성 예산에 표시되지 않습니다.",
      deleteSectionMsg:
        "\"{{name}}\"을(를) 삭제할까요? 거래는 \"{{target}}\"(으)로 이동합니다.",
      renameSectionTitle: "\"{{name}}\" 이름 바꾸기",
      monthAll: "전체",
    },
    drill: { tapForDetail: "탭하여 상세 ›" },
    sections: { otherFallback: "Otros" },
  },
  ar: {
    common: {
      monthly: "شهري",
      annual: "سنوي",
      amount: "المبلغ",
      description: "الوصف",
      startDate: "تاريخ البدء",
      frequency: "التكرار",
      severityWhen: "الخطورة عند التفعيل",
    },
    dashboard: {
      accountsTitle: "الحسابات",
      defaultAccountShort: "الافتراضي:",
      monthlyTrend: "الاتجاه الشهري",
      budgetVsActual: "الأقسام",
      savingsGoals: "أهداف الادخار",
      moreRecurring: "+{{n}} أخرى",
    },
    hero: { savings: "ادخار" },
    tx: {
      deleteConfirm:
        "حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء.",
    },
    txList: { goalFallback: "هدف" },
    ai: {
      imageAttachedSuffix: " [صورة مرفقة]",
      systemPrompt:
        "أنت مساعد مالي. الرصيد: {{balance}} | الدخل: {{income}} | المصروف: {{expense}}\nالأقسام: {{sections}}\nالحسابات: {{accounts}}\nاليوم: {{today}}\n\nإذا أراد المستخدم التسجيل، أجب بـ JSON:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nأجب باختصار بلغة المستخدم.",
      registeredLine: "تم التسجيل:",
    },
    goals: {
      deleteConfirmMsg:
        "حذف هذا الهدف؟ لن تُعرض المبالغ المدخرة هنا (المعاملات في القائمة تبقى).",
      transferDesc: "ادخار: {{name}}",
      withdrawDesc: "سحب: {{name}}",
      savedLabel: "المدخر",
      targetLabel: "الهدف",
      advanceLabel: "التقدم",
      surplusLine: "فائض: +{{amount}} فوق الهدف",
      surplusShort: "فائض +{{amount}}",
      linkedMovements: "حركات مرتبطة",
      linkedSub:
        "تحويلات من/إلى الهدف وتطابقات بالملاحظة أو القسم",
      emptyLinked: "لا حركات مرتبطة",
      daysLeftLine: "{{count}} يوم متبقية",
      limitLine: "الحد: {{date}} · {{count}} يوم",
      tapDetail: "اضغط للتفاصيل ›",
      limitProgress: "{{pct}}% · الحد: {{date}}",
      ofTarget: "من {{amount}}",
      goalLine: "الهدف:",
    },
    accounts: {
      deleteListMsg:
        "إزالة هذا الحساب من القائمة النشطة؟ إن وُجدت معاملات تبقى مرتبطة بالاسم.",
      addCta: "+ إضافة حساب",
      archived: "مؤرشف",
      restore: "استعادة",
      defaultBadge: "افتراضي",
    },
    recurring: {
      totalExpMonth: "إجمالي المصروف/شهر",
      totalExpYear: "إجمالي المصروف/سنة",
      addExpense: "+ إضافة مصروف متكرر",
      perMonth: "/شهر",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} متاح)",
    },
    rules: {
      deleteConfirmMsg: "حذف هذه القاعدة؟",
      descriptionBudget:
        "الميزانية · {{section}}: تنبيه عند {{percent}}% من الشهر (بدون قاعدة: 80%)",
      descriptionAccount:
        "الحساب · {{account}}: تنبيه إذا انخفض الرصيد عن {{amount}}",
      alertsIntro:
        "في الرئيسية ستظهر التنبيهات عند التفعيل. بدون قواعد إضافية: مصروف الشهر مقابل الميزانية (تحذير 80%، تجاوز 100%) وأي رصيد سالب.",
      newRuleButton: "+ قاعدة جديدة",
      noRulesEmpty:
        "لا قواعد إضافية. اضغط أعلاه لعتبات الميزانية أو الحد الأدنى للرصيد.",
      severityWarn: "تحذير",
      severityError: "انتباه",
      active: "مفعّل",
      gravityWhen: "الخطورة عند التفعيل",
      budgetMonth: "الميزانية (شهر)",
      accountBalance: "رصيد الحساب",
      sectionBudgetHelp:
        "القسم (مصروف الشهر مقابل ميزانية ذلك القسم)",
      percentBudgetHelp:
        "نسبة الميزانية (1–99). تنبيه عند وصول مصروف الشهر لهذه النسبة أو تجاوزها.",
      accountWatch: "الحساب المراقب",
      minBalanceHelp:
        "الحد الأدنى للرصيد. تنبيه إذا انخفض الرصيد (ولا يزال ≥ 0). الأرصدة السالبة تولّد دائمًا تنبيه انتباه.",
      saveRule: "حفظ القاعدة",
    },
    filters: { allFem: "الكل" },
    reports: {
      monthly: "شهري",
      annual: "سنوي",
      subscriptions: "اشتراكات",
      sectionPickHint:
        "اضغط على قسم لعرض النفقات المتكررة في هذا التصنيف.",
      sectionListEmpty:
        "لا توجد أقسام بعد. أضفها من بطاقة الأقسام في الرئيسية.",
      sectionEmptyRecurring: "لا توجد نفقات متكررة في هذا القسم.",
    },
    budget: {
      spent: "المصروف",
      budgetLabel: "الميزانية",
      exceeded: "تجاوز",
      available: "متاح",
      exceededWith: "تجاوز: {{amount}}",
      availableWith: "متاح: {{amount}}",
      usedPct: "{{pct}}% مستخدم",
      transactionsHeading: "المعاملات",
      emptyCategory: "لا مصروفات في هذا القسم",
      archiveSectionMsg:
        "أرشفة القسم \"{{name}}\"؟ لن يظهر في الميزانية النشطة.",
      deleteSectionMsg:
        "حذف \"{{name}}\"؟ ستنتقل المعاملات إلى \"{{target}}\".",
      renameSectionTitle: "إعادة تسمية \"{{name}}\"",
      monthAll: "الكل",
    },
    drill: { tapForDetail: "اضغط للتفاصيل ›" },
    sections: { otherFallback: "Otros" },
  },
  hi: {
    common: {
      monthly: "मासिक",
      annual: "वार्षिक",
      amount: "राशि",
      description: "विवरण",
      startDate: "आरंभ तिथि",
      frequency: "आवृत्ति",
      severityWhen: "ट्रिगर पर गंभीरता",
    },
    dashboard: {
      accountsTitle: "खाते",
      defaultAccountShort: "डिफ़ॉल्ट:",
      monthlyTrend: "मासिक रुझान",
      budgetVsActual: "अनुभाग",
      savingsGoals: "बचत लक्ष्य",
      moreRecurring: "+{{n}} और",
    },
    hero: { savings: "बचत" },
    tx: {
      deleteConfirm:
        "यह लेनदेन हटाएँ? यह क्रिया पूर्ववत नहीं हो सकती।",
    },
    txList: { goalFallback: "लक्ष्य" },
    ai: {
      imageAttachedSuffix: " [छवि संलग्न]",
      systemPrompt:
        "आप एक वित्त सहायक हैं। शेष: {{balance}} | आय: {{income}} | व्यय: {{expense}}\nखंड: {{sections}}\nखाते: {{accounts}}\nआज: {{today}}\n\nयदि उपयोगकर्ता पंजीकरण चाहता है तो JSON में उत्तर दें:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nउपयोगकर्ता की भाषा में संक्षेप में उत्तर दें।",
      registeredLine: "पंजीकृत:",
    },
    goals: {
      deleteConfirmMsg:
        "यह लक्ष्य हटाएँ? बची राशि यहाँ नहीं दिखेगी (सूची में लेनदेन रहेंगे)।",
      transferDesc: "बचत: {{name}}",
      withdrawDesc: "निकासी: {{name}}",
      savedLabel: "बचत",
      targetLabel: "लक्ष्य राशि",
      advanceLabel: "प्रगति",
      surplusLine: "अधिशेष: लक्ष्य से +{{amount}} अधिक",
      surplusShort: "अधिशेष +{{amount}}",
      linkedMovements: "जुड़े लेनदेन",
      linkedSub:
        "लक्ष्य से/तक स्थानांतरण और नोट या खंड से मिलान",
      emptyLinked: "कोई जुड़ा लेनदेन नहीं",
      daysLeftLine: "{{count}} दिन शेष",
      limitLine: "सीमा: {{date}} · {{count}} दिन",
      tapDetail: "विवरण के लिए टैप करें ›",
      limitProgress: "{{pct}}% · सीमा: {{date}}",
      ofTarget: "{{amount}} में से",
      goalLine: "लक्ष्य:",
    },
    accounts: {
      deleteListMsg:
        "इस खाते को सक्रिय सूची से हटाएँ? यदि लेनदेन हैं तो नाम से जुड़े रहेंगे।",
      addCta: "+ खाता जोड़ें",
      archived: "संग्रहीत",
      restore: "पुनर्स्थापित करें",
      defaultBadge: "डिफ़ॉल्ट",
    },
    recurring: {
      totalExpMonth: "कुल व्यय/माह",
      totalExpYear: "कुल व्यय/वर्ष",
      addExpense: "+ आवर्ती व्यय जोड़ें",
      perMonth: "/माह",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} उपलब्ध)",
    },
    rules: {
      deleteConfirmMsg: "यह नियम हटाएँ?",
      descriptionBudget:
        "बजट · {{section}}: महीने के {{percent}}% पर चेतावनी (नियम न हो तो 80%)",
      descriptionAccount:
        "खाता · {{account}}: यदि शेष {{amount}} से नीचे जाए तो चेतावनी",
      alertsIntro:
        "होम पर ट्रिगर होने पर अलर्ट दिखेंगे। अतिरिक्त नियमों के बिना: मासिक व्यय बनाम बजट (80% चेतावनी, 100% पार) और कोई भी ऋणात्मक शेष।",
      newRuleButton: "+ नया नियम",
      noRulesEmpty:
        "कोई अतिरिक्त नियम नहीं। बजट सीमा या न्यूनतम शेष के लिए ऊपर टैप करें।",
      severityWarn: "चेतावनी",
      severityError: "ध्यान",
      active: "सक्रिय",
      gravityWhen: "ट्रिगर पर गंभीरता",
      budgetMonth: "बजट (माह)",
      accountBalance: "खाता शेष",
      sectionBudgetHelp:
        "खंड (मासिक व्यय बनाम उस खंड का बजट)",
      percentBudgetHelp:
        "बजट प्रतिशत (1–99)। जब मासिक व्यय इस प्रतिशत तक पहुँचे या उसे पार करे तो चेतावनी।",
      accountWatch: "निगरानी खाता",
      minBalanceHelp:
        "न्यूनतम शेष। यदि शेष इससे नीचे (और अभी भी ≥ 0)। ऋणात्मक शेष हमेशा ध्यान अलर्ट देते हैं।",
      saveRule: "नियम सहेजें",
    },
    filters: { allFem: "सभी" },
    reports: {
      monthly: "मासिक",
      annual: "वार्षिक",
      subscriptions: "सदस्यता",
      sectionPickHint:
        "इस श्रेणी में आवर्ती खर्च देखने के लिए एक अनुभाग टैप करें।",
      sectionListEmpty:
        "अभी कोई अनुभाग नहीं। होम पर अनुभाग कार्ड से जोड़ें।",
      sectionEmptyRecurring: "इस अनुभाग में कोई आवर्ती खर्च नहीं।",
    },
    budget: {
      spent: "खर्च",
      budgetLabel: "बजट",
      exceeded: "अधिक",
      available: "उपलब्ध",
      exceededWith: "अधिक: {{amount}}",
      availableWith: "उपलब्ध: {{amount}}",
      usedPct: "{{pct}}% उपयोग",
      transactionsHeading: "लेनदेन",
      emptyCategory: "इस श्रेणी में कोई व्यय नहीं",
      archiveSectionMsg:
        "खंड \"{{name}}\" संग्रहीत करें? यह सक्रिय बजट में नहीं दिखेगा।",
      deleteSectionMsg:
        "\"{{name}}\" हटाएँ? लेनदेन \"{{target}}\" में चले जाएँगे।",
      renameSectionTitle: "\"{{name}}\" का नाम बदलें",
      monthAll: "सभी",
    },
    drill: { tapForDetail: "विवरण के लिए टैप करें ›" },
    sections: { otherFallback: "Otros" },
  },
  bn: {
    common: {
      monthly: "মাসিক",
      annual: "বার্ষিক",
      amount: "পরিমাণ",
      description: "বিবরণ",
      startDate: "শুরুর তারিখ",
      frequency: "ফ্রিকোয়েন্সি",
      severityWhen: "ট্রিগার হলে গুরুত্ব",
    },
    dashboard: {
      accountsTitle: "অ্যাকাউন্ট",
      defaultAccountShort: "ডিফল্ট:",
      monthlyTrend: "মাসিক প্রবণতা",
      budgetVsActual: "বিভাগ",
      savingsGoals: "সঞ্চয় লক্ষ্য",
      moreRecurring: "+{{n}} আরও",
    },
    hero: { savings: "সঞ্চয়" },
    tx: {
      deleteConfirm:
        "এই লেনদেন মুছবেন? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।",
    },
    txList: { goalFallback: "লক্ষ্য" },
    ai: {
      imageAttachedSuffix: " [ছবি সংযুক্ত]",
      systemPrompt:
        "আপনি একজন আর্থিক সহায়ক। ব্যালেন্স: {{balance}} | আয়: {{income}} | ব্যয়: {{expense}}\nবিভাগ: {{sections}}\nঅ্যাকাউন্ট: {{accounts}}\nআজ: {{today}}\n\nব্যবহারকারী নিবন্ধন চাইলে JSON দিয়ে উত্তর দিন:\n{\"action\":\"add_tx\",\"type\":\"income|expense\",\"amount\":0,\"desc\":\"...\",\"section\":\"...\",\"account\":\"...\",\"date\":\"YYYY-MM-DD\",\"notes\":\"\"}\nব্যবহারকারীর ভাষায় সংক্ষেপে উত্তর দিন।",
      registeredLine: "নিবন্ধিত:",
    },
    goals: {
      deleteConfirmMsg:
        "এই লক্ষ্য মুছবেন? সঞ্চিত অর্থ এখানে আর দেখাবে না (তালিকার লেনদেন থাকবে)।",
      transferDesc: "সঞ্চয়: {{name}}",
      withdrawDesc: "উত্তোলন: {{name}}",
      savedLabel: "সঞ্চিত",
      targetLabel: "লক্ষ্য পরিমাণ",
      advanceLabel: "অগ্রগতি",
      surplusLine: "উদ্বৃত্ত: লক্ষ্যের চেয়ে +{{amount}} বেশি",
      surplusShort: "উদ্বৃত্ত +{{amount}}",
      linkedMovements: "সংযুক্ত লেনদেন",
      linkedSub:
        "লক্ষ্যে ট্রান্সফার ও নোট বা বিভাগ মিল",
      emptyLinked: "কোনো সংযুক্ত লেনদেন নেই",
      daysLeftLine: "{{count}} দিন বাকি",
      limitLine: "সীমা: {{date}} · {{count}} দিন",
      tapDetail: "বিস্তারিতর জন্য ট্যাপ করুন ›",
      limitProgress: "{{pct}}% · সীমা: {{date}}",
      ofTarget: "{{amount}} এর মধ্যে",
      goalLine: "লক্ষ্য:",
    },
    accounts: {
      deleteListMsg:
        "সক্রিয় তালিকা থেকে এই অ্যাকাউন্ট সরাবেন? লেনদেন থাকলে নামের সাথে থাকবে।",
      addCta: "+ অ্যাকাউন্ট যোগ করুন",
      archived: "আর্কাইভ",
      restore: "পুনরুদ্ধার",
      defaultBadge: "ডিফল্ট",
    },
    recurring: {
      totalExpMonth: "মোট ব্যয়/মাস",
      totalExpYear: "মোট ব্যয়/বছর",
      addExpense: "+ পুনরাবৃত্ত ব্যয় যোগ করুন",
      perMonth: "/মাস",
    },
    withdraw: {
      goalAvailableLine: "{{name}} ({{amount}} উপলব্ধ)",
    },
    rules: {
      deleteConfirmMsg: "এই নিয়ম মুছবেন?",
      descriptionBudget:
        "বাজেট · {{section}}: মাসের {{percent}}% এ সতর্কতা (নিয়ম না থাকলে ৮০%)",
      descriptionAccount:
        "অ্যাকাউন্ট · {{account}}: ব্যালেন্স {{amount}} এর নিচে গেলে সতর্কতা",
      alertsIntro:
        "হোমে ট্রিগার হলে সতর্কতা দেখাবে। অতিরিক্ত নিয়ম ছাড়া: মাসিক ব্যয় বনাম বাজেট (৮০% সতর্কতা, ১০০% অতিক্রম) এবং যেকোনো ঋণাত্মক ব্যালেন্স।",
      newRuleButton: "+ নতুন নিয়ম",
      noRulesEmpty:
        "কোনো অতিরিক্ত নিয়ম নেই। বাজেট থ্রেশহোল্ড বা ন্যূনতম ব্যালেন্সের জন্য উপরে ট্যাপ করুন।",
      severityWarn: "সতর্কতা",
      severityError: "মনোযোগ",
      active: "সক্রিয়",
      gravityWhen: "ট্রিগার হলে গুরুত্ব",
      budgetMonth: "বাজেট (মাস)",
      accountBalance: "অ্যাকাউন্ট ব্যালেন্স",
      sectionBudgetHelp:
        "বিভাগ (মাসিক ব্যয় বনাম সেই বিভাগের বাজেট)",
      percentBudgetHelp:
        "বাজেট শতাংশ (১–৯৯)। মাসিক ব্যয় এই শতাংশে পৌঁছালে বা অতিক্রম করলে সতর্কতা।",
      accountWatch: "পর্যবেক্ষণ অ্যাকাউন্ট",
      minBalanceHelp:
        "ন্যূনতম ব্যালেন্স। এর নিচে গেলে সতর্কতা (এখনও ≥ ০)। ঋণাত্মক ব্যালেন্স সবসময় মনোযোগ সতর্কতা দেয়।",
      saveRule: "নিয়ম সংরক্ষণ",
    },
    filters: { allFem: "সব" },
    reports: {
      monthly: "মাসিক",
      annual: "বার্ষিক",
      subscriptions: "সাবস্ক্রিপশন",
      sectionPickHint:
        "এই বিভাগের পুনরাবৃত্ত খরচ দেখতে একটি বিভাগে আলতো চাপুন।",
      sectionListEmpty:
        "এখনো কোনো বিভাগ নেই। হোম থেকে বিভাগ কার্ডে যোগ করুন।",
      sectionEmptyRecurring: "এই বিভাগে কোনো পুনরাবৃত্ত খরচ নেই।",
    },
    budget: {
      spent: "খরচ",
      budgetLabel: "বাজেট",
      exceeded: "অতিক্রম",
      available: "উপলব্ধ",
      exceededWith: "অতিক্রম: {{amount}}",
      availableWith: "উপলব্ধ: {{amount}}",
      usedPct: "{{pct}}% ব্যবহৃত",
      transactionsHeading: "লেনদেন",
      emptyCategory: "এই বিভাগে কোনো ব্যয় নেই",
      archiveSectionMsg:
        "বিভাগ \"{{name}}\" আর্কাইভ করবেন? সক্রিয় বাজেটে দেখাবে না।",
      deleteSectionMsg:
        "\"{{name}}\" মুছবেন? লেনদেন \"{{target}}\" এ চলে যাবে।",
      renameSectionTitle: "\"{{name}}\" নাম বদলান",
      monthAll: "সব",
    },
    drill: { tapForDetail: "বিস্তারিতর জন্য ট্যাপ করুন ›" },
    sections: { otherFallback: "Otros" },
  },
};

const codes = [
  "es",
  "de",
  "fr",
  "pt",
  "it",
  "ru",
  "ja",
  "zh",
  "ko",
  "ar",
  "hi",
  "bn",
];

for (const code of codes) {
  const p = path.join(localesDir, `${code}.json`);
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {}
  let merged = deepMerge(JSON.parse(JSON.stringify(en)), existing);
  merged = deepMerge(merged, overrides[code] || {});
  fs.writeFileSync(p, JSON.stringify(merged, null, 2) + "\n");
}

console.log("Synced", codes.length, "locales from en.json + overrides.");
