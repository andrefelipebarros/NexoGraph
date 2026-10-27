import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`brand ${className}`} aria-label="NexoGraph, página inicial">
      <span className="brand-mark" aria-hidden="true">
        <span className="b1">{'{'}</span>
        <span className="b2">{'['}</span>
        <span className="n">N</span>
        <span className="b2">{']'}</span>
        <span className="b1">{'}'}</span>
      </span>
      <span className="brand-name">nexo<span>graph</span></span>
    </Link>
  );
}
