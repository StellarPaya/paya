import { Section } from "@/components/site/Section";

const steps: Array<{ title: string; body: string }> = [
  {
    title: "Create a payment",
    body: "Your app calls the Payments API to create an invoice and returns a hosted checkout link to the customer.",
  },
  {
    title: "Customer pays in their preferred asset",
    body: "Users pay with BTC, ETH, USDC, or XLM. Paya tracks status via webhooks and realtime updates.",
  },
  {
    title: "Automatic conversion + instant settlement",
    body: "Funds are converted to USDC and settled on the Stellar network using Soroban smart contracts.",
  },
  {
    title: "Withdraw or keep on-chain",
    body: "Merchants can withdraw to a bank account (off-ramp) or keep balances available for payouts, splits, or escrow flows.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="From checkout to settlement in minutes"
      description="A simple flow that hides blockchain complexity while keeping settlement fast, transparent, and programmable."
    >
      <div className="mx-auto max-w-4xl">
        <ol className="grid grid-cols-1 gap-4 sm:gap-6">
          {steps.map((s, idx) => (
            <li
              key={s.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{s.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
