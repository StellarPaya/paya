export function PageBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-zinc-50 dark:from-black dark:to-black" />
      <div className="absolute left-1/2 top-[-260px] h-[720px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-[-320px] right-[-180px] h-[720px] w-[720px] rounded-full bg-sky-500/10 blur-3xl" />
    </div>
  );
}
