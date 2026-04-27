import { useState } from "react";
import { Check } from "lucide-react";
import PropDashboardLayout from "@/components/prop/PropDashboardLayout";
import CheckoutModal from "@/components/prop/CheckoutModal";

const programs = [
  { id: "1-step", label: "1 Step" },
  { id: "2-step", label: "2 Step" },
  { id: "halfway", label: "Halfway There" },
];

const accountSizes = [
  "$5,000",
  "$10,000",
  "$25,000",
  "$50,000",
  "$100,000",
  "$200,000",
];

interface ProgramDetails {
  step1Label: string;
  step1Title: string;
  step2Label?: string;
  step2Title?: string;
  qualifiedLabel: string;
  qualifiedTitle: string;
  features: string[];
}

const programDetails: Record<string, ProgramDetails> = {
  "1-step": {
    step1Label: "1 Step",
    step1Title: "Analyst Assessment",
    qualifiedLabel: "Qualified",
    qualifiedTitle: "Funded Account",
    features: ["Single-step evaluation", "Fast onboarding", "Clear rules & targets"],
  },
  "2-step": {
    step1Label: "Phase 1",
    step1Title: "Trader Evaluation",
    step2Label: "Phase 2",
    step2Title: "Verification",
    qualifiedLabel: "Qualified",
    qualifiedTitle: "Funded Account",
    features: ["Two-phase evaluation", "Lower phase targets", "Most common format"],
  },
  "halfway-1-step": {
    step1Label: "1 Step",
    step1Title: "Halfway Assessment",
    qualifiedLabel: "Qualified",
    qualifiedTitle: "Funded Account",
    features: ["50% upfront pricing", "Remaining fee from first payout", "Single-step evaluation"],
  },
  "halfway-2-step": {
    step1Label: "Phase 1",
    step1Title: "Halfway Evaluation",
    step2Label: "Phase 2",
    step2Title: "Verification",
    qualifiedLabel: "Qualified",
    qualifiedTitle: "Funded Account",
    features: ["50% upfront pricing", "Remaining fee from first payout", "Two-phase evaluation"],
  },
};

const parseMoney = (value: string) => Number(value.replace(/[^0-9.]/g, "")) || 0;
const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Math.max(0, amount));

type Price = { total: number; promo: number; upfront?: number; deferred?: number };

// Correct prices with promo pricing (show higher crossed out, real lower price)
const pricingByProgram: Record<string, Record<string, Price>> = {
  "1-step": {
    "$5,000": { promo: 19, total: 14.99 },
    "$10,000": { promo: 37, total: 29.99 },
    "$25,000": { promo: 68, total: 54.99 },
    "$50,000": { promo: 170, total: 139.99 },
    "$100,000": { promo: 380, total: 299.99 },
    "$200,000": { promo: 999, total: 649.99 },
  },
  "2-step": {
    "$5,000": { promo: 22, total: 17.99 },
    "$10,000": { promo: 44, total: 34.99 },
    "$25,000": { promo: 88, total: 69.99 },
    "$50,000": { promo: 220, total: 179.99 },
    "$100,000": { promo: 440, total: 349.99 },
    "$200,000": { promo: 999, total: 749.99 },
  },
  // Halfway: same price as respective program, just split 50/50
  "halfway-1-step": {
    "$5,000": { promo: 19, total: 14.99, upfront: 7.50, deferred: 7.49 },
    "$10,000": { promo: 37, total: 29.99, upfront: 15.00, deferred: 14.99 },
    "$25,000": { promo: 68, total: 54.99, upfront: 27.50, deferred: 27.49 },
    "$50,000": { promo: 170, total: 139.99, upfront: 70.00, deferred: 69.99 },
    "$100,000": { promo: 380, total: 299.99, upfront: 150.00, deferred: 149.99 },
    "$200,000": { promo: 999, total: 649.99, upfront: 325.00, deferred: 324.99 },
  },
  "halfway-2-step": {
    "$5,000": { promo: 22, total: 17.99, upfront: 9.00, deferred: 8.99 },
    "$10,000": { promo: 44, total: 34.99, upfront: 17.50, deferred: 17.49 },
    "$25,000": { promo: 88, total: 69.99, upfront: 35.00, deferred: 34.99 },
    "$50,000": { promo: 220, total: 179.99, upfront: 90.00, deferred: 89.99 },
    "$100,000": { promo: 440, total: 349.99, upfront: 175.00, deferred: 174.99 },
    "$200,000": { promo: 999, total: 749.99, upfront: 375.00, deferred: 374.99 },
  },
};

const moneyWithPercent = (balance: number, percent: number) => {
  const amount = (balance * percent) / 100;
  return `${percent}% (${formatMoney(amount)})`;
};

const PropChooseChallenge = () => {
  const [selectedProgram, setSelectedProgram] = useState("1-step");
  const [selectedSize, setSelectedSize] = useState("$5,000");
  const [halfwayType, setHalfwayType] = useState<"1-step" | "2-step">("1-step");
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Determine actual program key for pricing/details lookup
  const actualProgramKey = selectedProgram === "halfway" 
    ? `halfway-${halfwayType}` 
    : selectedProgram;

  const details = programDetails[actualProgramKey];
  const balance = parseMoney(selectedSize);
  const price = pricingByProgram[actualProgramKey]?.[selectedSize];
  const profitSplit = "80%";

  const isHalfway = selectedProgram === "halfway";
  const isTwoStep = actualProgramKey === "2-step" || actualProgramKey === "halfway-2-step";
  
  const profitTargetPhase1 = isTwoStep ? 8 : 8;
  const profitTargetPhase2 = 5;
  const maxDrawdownPct = 4;
  const dailyDrawdownPct = 2;

  const columns = isTwoStep ? 4 : 3;

  return (
    <PropDashboardLayout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl lg:text-4xl font-heading font-bold mb-2">
            <span className="text-foreground">Choose Your</span>{" "}
            <span className="text-primary">Challenge</span>
          </h1>
          <p className="text-muted-foreground">
            Select an evaluation program and account size to get started.
          </p>
        </div>

        {/* Program Type Selector */}
        <div className="flex flex-wrap justify-center gap-4">
          {programs.map((program) => (
            <button
              key={program.id}
              onClick={() => setSelectedProgram(program.id)}
              className={`px-8 py-4 rounded-xl border-2 font-heading font-semibold text-lg transition-all ${
                selectedProgram === program.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
            >
              {program.label}
            </button>
          ))}
        </div>

        {/* Halfway There Type Selector */}
        {isHalfway && (
          <div className="flex justify-center gap-3">
            <span className="text-muted-foreground self-center mr-2">Evaluation Type:</span>
            <button
              onClick={() => setHalfwayType("1-step")}
              className={`px-5 py-2 rounded-lg border font-semibold transition-all ${
                halfwayType === "1-step"
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-card text-foreground hover:border-accent/50"
              }`}
            >
              1 Step
            </button>
            <button
              onClick={() => setHalfwayType("2-step")}
              className={`px-5 py-2 rounded-lg border font-semibold transition-all ${
                halfwayType === "2-step"
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-card text-foreground hover:border-accent/50"
              }`}
            >
              2 Step
            </button>
          </div>
        )}

        {/* Account Size Selector */}
        <div className="flex flex-wrap justify-center gap-3">
          {accountSizes.map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`px-6 py-3 rounded-xl border font-semibold transition-all ${
                selectedSize === size
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50"
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Program Details Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border-2 border-primary/30 rounded-3xl p-8 relative overflow-hidden">
            {/* Decorative wave pattern */}
            <div className="absolute inset-0 opacity-5">
              <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                <path
                  d="M0,100 C100,150 200,50 400,100 L400,200 L0,200 Z"
                  fill="currentColor"
                  className="text-primary"
                />
              </svg>
            </div>

            <div className="relative z-10">
              {/* Headers */}
              <div
                className={`grid ${isTwoStep ? "grid-cols-3" : "grid-cols-2"} gap-8 mb-6 text-center`}
              >
                <div>
                  <span className="text-primary font-semibold text-sm uppercase tracking-wide">
                    {details.step1Label}
                  </span>
                  <h3 className="text-2xl font-heading font-bold text-foreground mt-1">
                    {details.step1Title}
                  </h3>
                </div>
                {isTwoStep && (
                  <div>
                    <span className="text-primary font-semibold text-sm uppercase tracking-wide">
                      {details.step2Label}
                    </span>
                    <h3 className="text-2xl font-heading font-bold text-foreground mt-1">
                      {details.step2Title}
                    </h3>
                  </div>
                )}
                <div>
                  <span className="text-primary font-semibold text-sm uppercase tracking-wide">
                    {details.qualifiedLabel}
                  </span>
                  <h3 className="text-2xl font-heading font-bold text-foreground mt-1">
                    {details.qualifiedTitle}
                  </h3>
                </div>
              </div>

              {/* Pricing line with promo display */}
              <div className="text-center mb-8">
                <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 bg-muted/20 border border-border rounded-2xl px-6 py-4">
                  <div className="text-foreground font-heading font-semibold">
                    Account Size: <span className="text-primary">{selectedSize}</span>
                  </div>
                  <div className="text-foreground font-heading font-semibold flex items-center gap-2">
                    {isHalfway && price?.upfront != null && price?.deferred != null ? (
                      <>
                        Price:{" "}
                        <span className="text-muted-foreground line-through text-sm">${(price.promo ?? 0).toFixed(2)}</span>
                        <span className="text-primary font-bold">{formatMoney(price.upfront)}</span> today +{" "}
                        <span className="text-primary font-bold">{formatMoney(price.deferred)}</span> from first payout
                      </>
                    ) : (
                      <>
                        Price:{" "}
                        <span className="text-muted-foreground line-through text-sm">${(price?.promo ?? 0).toFixed(2)}</span>
                        <span className="text-primary font-bold text-xl">{formatMoney(price?.total ?? 0)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {details.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Buy Button with promo pricing */}
              <div className="text-center">
                <div className="mb-3">
                  <span className="text-muted-foreground line-through text-lg">${(price?.promo ?? 0).toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setCheckoutOpen(true)}
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all hover:scale-105 text-lg"
                >
                  Get Started - {isHalfway && price?.upfront != null ? formatMoney(price.upfront) : formatMoney(price?.total ?? 0)}
                </button>
                {isHalfway && (
                  <p className="text-sm text-muted-foreground mt-2">
                    + {formatMoney(price?.deferred ?? 0)} from first payout
                  </p>
                )}
              </div>

              {/* Checkout Modal */}
              <CheckoutModal
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                programType={actualProgramKey}
                accountSize={balance}
                price={price?.total ?? 0}
                isHalfway={isHalfway}
                upfrontPrice={price?.upfront}
                deferredPrice={price?.deferred}
              />
            </div>
          </div>
        </div>

        {/* Rules Table */}
        <div className="max-w-4xl mx-auto">
          <div
            className={`grid ${columns === 4 ? "grid-cols-4" : "grid-cols-3"} gap-4 mb-4 text-center`}
          >
            <div></div>
            <div className="text-primary font-semibold">{details.step1Label}</div>
            {columns === 4 && <div className="text-primary font-semibold">{details.step2Label}</div>}
            <div className="text-primary font-semibold">{details.qualifiedLabel}</div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {(
              [
                {
                  label: "Leverage",
                  c1: "1:30",
                  c2: "1:30",
                  c3: "1:30",
                },
                {
                  label: "Profit Target",
                  c1: moneyWithPercent(balance, profitTargetPhase1),
                  c2: moneyWithPercent(balance, profitTargetPhase2),
                  c3: "N/A (Funded)",
                },
                {
                  label: "Max Drawdown",
                  c1: moneyWithPercent(balance, maxDrawdownPct),
                  c2: moneyWithPercent(balance, maxDrawdownPct),
                  c3: moneyWithPercent(balance, maxDrawdownPct),
                },
                {
                  label: "Daily Drawdown",
                  c1: moneyWithPercent(balance, dailyDrawdownPct),
                  c2: moneyWithPercent(balance, dailyDrawdownPct),
                  c3: moneyWithPercent(balance, dailyDrawdownPct),
                },
                {
                  label: "Min Trading Days",
                  c1: "2 days",
                  c2: "2 days",
                  c3: "2 days",
                },
                {
                  label: "Time Limit",
                  c1: "30 Days",
                  c2: "30 Days",
                  c3: "N/A",
                },
                {
                  label: "Profit Split",
                  c1: "-",
                  c2: "-",
                  c3: profitSplit,
                },
                {
                  label: "Payouts",
                  c1: "-",
                  c2: "-",
                  c3: "Bi-weekly",
                },
              ]
            ).map((rule, index) => {
              const rowClass = index % 2 === 0 ? "bg-muted/20" : "bg-muted/10";
              return (
                <div
                  key={index}
                  className={`grid ${columns === 4 ? "grid-cols-4" : "grid-cols-3"} gap-4 py-4 px-6 text-center ${rowClass}`}
                >
                  <div className="text-left text-muted-foreground">{rule.label}</div>
                  <div className="text-foreground">{rule.c1}</div>
                  {columns === 4 && <div className="text-foreground">{rule.c2}</div>}
                  <div className="text-foreground">{columns === 4 ? rule.c3 : rule.c3}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PropDashboardLayout>
  );
};

export default PropChooseChallenge;
