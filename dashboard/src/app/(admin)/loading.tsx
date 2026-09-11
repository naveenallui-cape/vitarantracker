export default function AdminLoading() {
  return (
    <div>
      <div className="h-8 w-52 animate-pulse rounded bg-[#d9d4c8]" />
      <p className="mt-3 text-sm text-[#5d6b63]">Loading employee data…</p>
      <div className="mt-6 overflow-hidden rounded-2xl bg-[var(--panel)]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse border-t border-[#efeae0] bg-[#f7f4ee]"
            style={{ animationDelay: `${index * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
