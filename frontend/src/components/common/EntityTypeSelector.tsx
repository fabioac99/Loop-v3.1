'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface EntityValue {
  type: 'client' | 'supplier' | 'none' | '';
  id?: string;
  name?: string;
}

export default function EntityTypeSelector({
  value,
  onChange,
}: {
  value: EntityValue;
  onChange: (v: EntityValue) => void;
}) {
  const [clients, setClients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      Promise.all([api.getAllClients(), api.getAllSuppliers()])
        .then(([c, s]) => { setClients(c); setSuppliers(s); setLoaded(true); })
        .catch(() => setLoaded(true));
    }
  }, [loaded]);

  const type = value?.type || '';

  return (
    <div className="space-y-3">
      {/* Radio selection */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'client', label: 'Client' },
          { key: 'supplier', label: 'Supplier' },
          { key: 'none', label: 'Not specified' },
        ].map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="entity_type_radio"
              checked={type === opt.key}
              onChange={() => onChange({ type: opt.key as any, id: '', name: '' })}
              className="text-primary"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {/* Conditional select */}
      {type === 'client' && (
        <select
          className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
          value={value?.id || ''}
          onChange={(e) => {
            const c = clients.find((x) => x.id === e.target.value);
            onChange({ type: 'client', id: e.target.value, name: c?.name || '' });
          }}
        >
          <option value="">Select a client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}{c.code ? ` (${c.code})` : ''}
            </option>
          ))}
        </select>
      )}

      {type === 'supplier' && (
        <select
          className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-sm"
          value={value?.id || ''}
          onChange={(e) => {
            const s = suppliers.find((x) => x.id === e.target.value);
            onChange({ type: 'supplier', id: e.target.value, name: s?.name || '' });
          }}
        >
          <option value="">Select a supplier...</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}{s.code ? ` (${s.code})` : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
