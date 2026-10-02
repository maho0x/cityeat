import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-baseline gap-1 text-[19px] font-black tracking-tight"
    >
      <span className="text-brand">City</span>
      <span>食咩好</span>
    </Link>
  );
}
