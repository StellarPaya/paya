import { Section } from "@/components/site/Section";

export function About() {
  return (
    <Section
      id="about"
      eyebrow="About"
      title="Global crypto payments that feel like a modern day payment"
      description="Paya is an open-source payment infrastructure for businesses and developers. Collect payments in multiple cryptocurrencies, settle as USDC on Stellar via Soroban smart contracts, and plug into dashboards, webhooks, and SDKs."
    >
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            title: "For businesses",
            body: "Increase conversion with a fast checkout and global payment methods — without holding volatile assets.",
          },
          {
            title: "For developers",
            body: "Integrate a clean REST API, subscribe to webhooks, and ship crypto-native billing with familiar workflows.",
          },
          {
            title: "For platforms",
            body: "Use escrow, subscriptions, and payment splits to support marketplaces, SaaS, and creator payouts.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{card.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
