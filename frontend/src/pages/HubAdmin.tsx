import { useEffect, useMemo, useState } from 'react';
import { teamUpdateApi } from '@/services/api';
import type { TeamUpdate } from '@/types';
import { HUB_CATEGORY_DEFS, formatCategoryLabel } from './hubCategories';

const HubAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TeamUpdate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterQ, setFilterQ] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSection, setBulkSection] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await teamUpdateApi.getAll();
        setItems(res.data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const q = filterQ.trim().toLowerCase();
    const cat = filterCategory.trim();
    return items.filter((it) => {
      const matchesQ = q
        ? (it.title?.toLowerCase().includes(q) || it.content?.toLowerCase().includes(q) || it.section?.toLowerCase().includes(q))
        : true;
      const matchesCat = cat ? it.category === cat : true;
      return matchesQ && matchesCat;
    });
  }, [items, filterQ, filterCategory]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((f) => f.id)));
  };
  const clearAll = () => setSelectedIds(new Set());

  const applyBulk = async () => {
    if (!bulkCategory && !bulkSection) return;
    if (selectedIds.size === 0) return;
    setApplying(true);
    try {
      const updates = Array.from(selectedIds).map((id) => teamUpdateApi.update(id, {
        ...(bulkCategory ? { category: bulkCategory as any } : {}),
        ...(bulkSection ? { section: bulkSection } : {}),
      }));
      await Promise.all(updates);
      const res = await teamUpdateApi.getAll();
      setItems(res.data);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6 text-white bg-primary-600">
        <h1 className="text-2xl font-bold">AE Hub Admin Tools</h1>
        <p className="mt-2 text-primary-100">Bulk assign categories/sections to resources</p>
      </div>

      <div className="card rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="input-field"
            placeholder="Search title/content/section"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
          />
          <select className="input-field" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {Object.keys(HUB_CATEGORY_DEFS).map((k) => (
              <option key={k} value={k}>{(HUB_CATEGORY_DEFS as any)[k].label || formatCategoryLabel(k)}</option>
            ))}
          </select>
          <div className="flex items-center space-x-3">
            <button className="btn-secondary" onClick={selectAll}>Select all</button>
            <button className="btn-secondary" onClick={clearAll}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select className="input-field" value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
            <option value="">Set category…</option>
            {Object.keys(HUB_CATEGORY_DEFS).map((k) => (
              <option key={k} value={k}>{(HUB_CATEGORY_DEFS as any)[k].label || formatCategoryLabel(k)}</option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder="Set section… (e.g., welcome_setup)"
            value={bulkSection}
            onChange={(e) => setBulkSection(e.target.value)}
          />
          <div className="flex items-center">
            <button className="btn-primary" disabled={applying || (selectedIds.size === 0) || (!bulkCategory && !bulkSection)} onClick={applyBulk}>
              {applying ? 'Applying…' : `Apply to ${selectedIds.size} selected`}
            </button>
          </div>
        </div>
      </div>

      <div className="card rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 text-left"><input type="checkbox" onChange={(e) => (e.target.checked ? selectAll() : clearAll())} /></th>
              <th className="py-3 px-4 text-left">Title</th>
              <th className="py-3 px-4 text-left">Category</th>
              <th className="py-3 px-4 text-left">Section</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4"><input type="checkbox" checked={selectedIds.has(it.id)} onChange={() => toggleSelect(it.id)} /></td>
                <td className="py-3 px-4">
                  <div className="font-medium">{it.title}</div>
                </td>
                <td className="py-3 px-4 text-sm">{(HUB_CATEGORY_DEFS as any)[it.category]?.label || formatCategoryLabel(it.category)}</td>
                <td className="py-3 px-4 text-sm">{it.section || <span className="text-gray-400">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HubAdmin;

