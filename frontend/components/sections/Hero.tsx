import { Badge } from "@/components/site/Badge";
import { Button } from "@/components/site/Button";
import { Container } from "@/components/site/Container";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-400/10" />
        <div className="absolute -bottom-48 right-[-10%] h-[520px] w-[520px] rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-400/10" />
      </div>

      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge>Open-source • Stellar + Soroban • Instant USDC settlement</Badge>

          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
            Stripe for crypto payments — powered by Stellar.
          </h1>

          <p className="mt-6 text-pretty text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Accept BTC, ETH, USDC, and XLM. Automatically convert to USDC, settle instantly on
            Stellar, and withdraw to bank accounts.
          </p>

          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Button href="#how-it-works" variant="primary">
              See how it works
            </Button>
            <Button href="#features" variant="secondary">
              Explore features
            </Button>
          </div>

          <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            {["Multi-asset acceptance", "Auto conversion to USDC", "Smart contract escrow & splits"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm font-medium text-zinc-800 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                >
                  {label}
                </div>
              ),
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
