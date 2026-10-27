'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Item = { family: string; title: string; description: string };

export function ModelsList({ items }: { items: Item[] }) {
  const [family, setFamily] = useState('Todos');
  const families = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((item) => counts.set(item.family, (counts.get(item.family) ?? 0) + 1));
    return [{ name: 'Todos', count: items.length }, ...Array.from(counts, ([name, count]) => ({ name, count }))];
  }, [items]);
  const visible = family === 'Todos' ? items : items.filter((item) => item.family === family);

  return (
    <>
      <div className="models-bar" role="group" aria-label="Filtrar modelos por família">
        {families.map((item) => (
          <button key={item.name} type="button" className="chip" aria-pressed={family === item.name} onClick={() => setFamily(item.name)}>
            {item.name} <span>{item.count}</span>
          </button>
        ))}
      </div>
      <ul className="model-grid" aria-label={`${visible.length} modelos`}>
        {visible.map((item) => (
          <li key={`${item.family}-${item.title}`}>
            <Link className="model-item" href={`/studio?modelo=${encodeURIComponent(item.title)}`}>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
