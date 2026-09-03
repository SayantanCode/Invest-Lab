// The actual PDF document tree, built with @react-pdf/renderer. Deliberately
// uses only the built-in Helvetica family (no custom @font-face) — this app
// works fully offline, and react-pdf would otherwise fetch font files over
// the network the first time a PDF is generated.

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

import type { Profile } from "@/lib/stores/use-profile-store";
import type { Goal } from "@/lib/stores/use-goal-store";
import type { SavedPlan } from "@/lib/stores/use-plans-store";
import type { ActivityEntry } from "@/lib/stores/use-activity-log-store";
import { computePlanResults } from "@/lib/goals/compute-plan-results";
import { SCENARIO_LABEL, SCENARIOS } from "@/lib/engine";
import { inflatedTarget, requiredMonthlySip } from "@/lib/calculators/goal-calc";
import { scheduleGoals } from "@/lib/goals/goal-schedule";
import { suggestGoalAdjustments } from "@/lib/goals/goal-suggestions";
import { buildRecommendations, emergencyFundTarget, monthlySurplus, recommendedEmergencyMonths, totalMonthlyEMI } from "@/lib/goals/prioritization";
import { formatINR, formatPercent, formatDate } from "@/lib/format";

/**
 * PDF-safe ₹ formatting — react-pdf's built-in Helvetica (the only family
 * available without fetching a font file over the network, which this app's
 * offline-first design avoids) has no glyph for U+20B9, so the ₹ symbol
 * silently renders as a broken superscript. "Rs." reads the same to a human
 * or an AI and never breaks.
 */
function money(value: number): string {
  return formatINR(value).replace("₹", "Rs. ");
}

/** Same fix, applied to prose that already has ₹ baked in (buildRecommendations' detail sentences pull formatINR internally). */
function sanitizeMoney(text: string): string {
  return text.replace(/₹/g, "Rs. ");
}

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1f2430" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#2f4bff" },
  meta: { fontSize: 9, color: "#6b7280", marginTop: 3 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 8, color: "#111827" },
  card: { backgroundColor: "#f7f8fb", borderRadius: 4, padding: 10, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#6b7280" },
  value: { fontFamily: "Helvetica-Bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statTile: { width: "48%", backgroundColor: "#f7f8fb", borderRadius: 4, padding: 10, marginBottom: 8 },
  statLabel: { fontSize: 8.5, color: "#6b7280", marginBottom: 3 },
  statValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  recItem: { marginBottom: 8, paddingLeft: 10, borderLeftWidth: 2 },
  recCritical: { borderLeftColor: "#dc2626" },
  recWarning: { borderLeftColor: "#d97706" },
  recOk: { borderLeftColor: "#16a34a" },
  recTitle: { fontFamily: "Helvetica-Bold", marginBottom: 2 },
  recDetail: { color: "#374151", lineHeight: 1.4 },
  goalBlock: { marginBottom: 12 },
  goalName: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 3 },
  goalStats: { flexDirection: "row", gap: 16, marginBottom: 3 },
  suggestion: { fontSize: 9, color: "#374151", fontStyle: "italic", marginTop: 2 },
  planBlock: { marginBottom: 14 },
  planName: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 2 },
  planSub: { fontSize: 8.5, color: "#6b7280", marginBottom: 6 },
  table: { marginTop: 2 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 3, marginBottom: 3 },
  tableRow: { flexDirection: "row", paddingVertical: 2 },
  th: { flex: 1, fontSize: 8.5, color: "#6b7280", fontFamily: "Helvetica-Bold" },
  td: { flex: 1, fontSize: 9 },
  activityRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  activityMsg: { color: "#374151" },
  activityDate: { color: "#9ca3af", fontSize: 8.5 },
  disclaimer: { marginTop: 24, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e5e7eb", fontSize: 8, color: "#9ca3af", lineHeight: 1.4 },
  closing: { marginTop: 16, backgroundColor: "#eef1ff", borderRadius: 4, padding: 12, fontSize: 9.5, lineHeight: 1.5, color: "#2f3a8f" },
});

const STATUS_STYLE = { critical: styles.recCritical, warning: styles.recWarning, ok: styles.recOk };
const STATUS_LABEL = { critical: "Needs attention", warning: "Worth reviewing", ok: "On track" };

export interface ReportDocumentProps {
  profile: Profile | null;
  goals: Goal[];
  plans: SavedPlan[];
  activity: ActivityEntry[];
  generatedAt: string;
}

export function ReportDocument({ profile, goals, plans, activity, generatedAt }: ReportDocumentProps) {
  const surplus = profile ? monthlySurplus(profile) : 0;
  const goalsMonthlyTotal = goals.reduce(
    (sum, g) => sum + requiredMonthlySip(inflatedTarget(g.targetAmountToday, g.inflationPct, g.years), g.expectedReturnPct, g.years, g.existingSavings),
    0
  );
  const recommendations = profile ? buildRecommendations(profile, goalsMonthlyTotal) : [];
  const scheduled = goals.length > 0 ? scheduleGoals(goals, surplus) : [];
  const suggestions = profile && goals.length > 0 ? suggestGoalAdjustments(goals, surplus) : [];
  const suggestionsByGoalId = new Map(suggestions.map((s) => [s.goal.id, s]));

  return (
    <Document title="InvestLab — Financial Snapshot">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>InvestLab — Financial Snapshot</Text>
        <Text style={styles.meta}>Generated {formatDate(generatedAt)} · A plain-language summary of your saved numbers</Text>

        {profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your financial profile</Text>
            <View style={styles.grid}>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Monthly income</Text>
                <Text style={styles.statValue}>{money(profile.monthlyIncome)}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Monthly expenses</Text>
                <Text style={styles.statValue}>{money(profile.monthlyExpenses)}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Monthly EMI outgo</Text>
                <Text style={styles.statValue}>{money(totalMonthlyEMI(profile))}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Monthly surplus</Text>
                <Text style={styles.statValue}>{money(surplus)}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Emergency fund</Text>
                <Text style={styles.statValue}>
                  {money(profile.emergencyFundSaved)} / {money(emergencyFundTarget(profile))}
                </Text>
                <Text style={styles.statLabel}>{recommendedEmergencyMonths(profile)} months of expenses is the target</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statLabel}>Dependents</Text>
                <Text style={styles.statValue}>{profile.dependents.length}</Text>
              </View>
            </View>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Health insurance</Text>
                <Text style={styles.value}>
                  {profile.hasHealthInsurance
                    ? profile.healthInsuranceCoverAmount
                      ? `${money(profile.healthInsuranceCoverAmount)} cover`
                      : "Covered (amount not on file)"
                    : "None on file"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Term life insurance</Text>
                <Text style={styles.value}>
                  {profile.hasTermLifeInsurance
                    ? profile.termInsuranceCoverAmount
                      ? `${money(profile.termInsuranceCoverAmount)} cover`
                      : "Covered (amount not on file)"
                    : "None on file"}
                </Text>
              </View>
              <View style={[styles.row, { marginBottom: 0 }]}>
                <Text style={styles.label}>Risk tolerance</Text>
                <Text style={styles.value}>{profile.riskTolerance}</Text>
              </View>
            </View>
          </View>
        )}

        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to prioritize</Text>
            {recommendations.map((rec) => (
              <View key={rec.key} style={[styles.recItem, STATUS_STYLE[rec.status]]}>
                <Text style={styles.recTitle}>
                  {rec.title} — {STATUS_LABEL[rec.status]}
                </Text>
                <Text style={styles.recDetail}>{sanitizeMoney(rec.detail)}</Text>
              </View>
            ))}
          </View>
        )}

        {goals.length > 0 && (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Your goals</Text>
            {goals.map((goal) => {
              const target = inflatedTarget(goal.targetAmountToday, goal.inflationPct, goal.years);
              const sip = requiredMonthlySip(target, goal.expectedReturnPct, goal.years, goal.existingSavings);
              const sched = scheduled.find((s) => s.goal.id === goal.id);
              const suggestion = suggestionsByGoalId.get(goal.id);
              return (
                <View key={goal.id} style={styles.goalBlock} wrap={false}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <View style={styles.goalStats}>
                    <Text style={styles.label}>
                      Target: <Text style={styles.value}>{money(target)}</Text> in {goal.years} yrs
                    </Text>
                    <Text style={styles.label}>
                      Needs: <Text style={styles.value}>{money(sip)}/mo</Text>
                    </Text>
                  </View>
                  {sched && !sched.feasible && (
                    <Text style={styles.suggestion}>This doesn&apos;t fit within your current surplus even with delays.</Text>
                  )}
                  {sched && sched.feasible && sched.delayedMonths > 0 && (
                    <Text style={styles.suggestion}>
                      Starts in {sched.delayedMonths} month{sched.delayedMonths === 1 ? "" : "s"} once earlier goals free up room.
                    </Text>
                  )}
                  {suggestion?.options.map((opt, i) => (
                    <Text key={i} style={styles.suggestion}>
                      Option: {opt.description}
                    </Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {plans.length > 0 && (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Your plans</Text>
            {plans.map((saved) => {
              const results = computePlanResults(saved.plan);
              return (
                <View key={saved.id} style={styles.planBlock} wrap={false}>
                  <Text style={styles.planName}>{saved.name}</Text>
                  <Text style={styles.planSub}>
                    {saved.planType === "wealth" ? "Wealth creation" : saved.planType === "goal" ? "Goal-based" : "Retirement"} · through{" "}
                    {formatDate(saved.plan.endDate)}
                  </Text>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={styles.th}>Scenario</Text>
                      <Text style={styles.th}>Invested</Text>
                      <Text style={styles.th}>Projected</Text>
                      <Text style={styles.th}>Real value</Text>
                      <Text style={styles.th}>XIRR</Text>
                    </View>
                    {SCENARIOS.map((key) => {
                      const r = results[key];
                      return (
                        <View key={key} style={styles.tableRow}>
                          <Text style={styles.td}>{SCENARIO_LABEL[key]}</Text>
                          <Text style={styles.td}>{money(r.totalInvested)}</Text>
                          <Text style={styles.td}>{money(r.finalValue)}</Text>
                          <Text style={styles.td}>{money(r.realFinalValue)}</Text>
                          <Text style={styles.td}>{formatPercent(r.xirrPct)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activity.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            {activity.slice(0, 10).map((entry) => (
              <View key={entry.id} style={styles.activityRow}>
                <Text style={styles.activityMsg}>{sanitizeMoney(entry.message)}</Text>
                <Text style={styles.activityDate}>{formatDate(entry.at)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.closing} wrap={false}>
          <Text>
            You can upload or paste this report into any AI assistant and ask it questions about your own numbers —
            everything above is written in plain language for exactly that.
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          InvestLab is a free, educational simulation tool. Forecast figures are based on the return and inflation
          assumptions set in the app — they are not guarantees and not investment advice. Nothing in this report is a
          recommendation to buy or sell any fund.
        </Text>
      </Page>
    </Document>
  );
}
