import { useState, useEffect } from 'react';
import { teamUpdateApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Tag, Plus, ChevronRight, Star, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TeamUpdate } from '@/types';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import { HUB_CATEGORY_DEFS, formatCategoryLabel, ALPHABETICAL_CATEGORY_KEYS } from './hubCategories';

const TeamUpdates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // No bottom list; we focus on favorites, recents, and journeys
  const [favorites, setFavorites] = useState<TeamUpdate[]>([]);
  const [recents, setRecents] = useState<TeamUpdate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<TeamUpdate | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const getErrorMessage = (error: any) => {
    const resp = error?.response;
    const msg = resp?.data?.message
      || (Array.isArray(resp?.data?.errors) ? resp.data.errors.map((e: any) => e.msg).join(', ') : null)
      || error?.message;
    return msg || 'An unexpected error occurred';
  };

  useEffect(() => {
    const run = async () => {
      try {
        await Promise.all([
          fetchCategoryCounts(),
          fetchFavorites(),
          fetchRecents(),
        ]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Refresh counts and lists when returning to this page via navigation
  useEffect(() => {
    if (location.pathname === '/team-updates') {
      fetchCategoryCounts();
      fetchFavorites();
      fetchRecents();
    }
  }, [location.pathname]);

  useEffect(() => {
    // when category changes, could refresh counts later
  }, [selectedCategory]);

  const fetchFavorites = async () => {
    try {
      const res = await teamUpdateApi.getFavorites();
      setFavorites(res.data);
    } catch (e) {
      // non-blocking
    }
  };

  const fetchRecents = async () => {
    try {
      const res = await teamUpdateApi.getRecents();
      setRecents(res.data);
    } catch (e) {
      // non-blocking
    }
  };

  const fetchCategoryCounts = async () => {
    try {
      const response = await teamUpdateApi.getCategories();
      const counts: Record<string, number> = {};
      for (const item of response.data) {
        counts[item.name] = item.count;
      }
      setCategoryCounts(counts);
    } catch (error) {
      // Non-blocking: surface message but do not interrupt
      console.warn('Failed to load category counts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updateData = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as TeamUpdate['category'],
      section: (formData.get('section') as string) || undefined,
      externalLink: formData.get('externalLink') as string,
    };

    try {
      if (editingUpdate) {
        await teamUpdateApi.update(editingUpdate.id, updateData);
        toast.success('Update modified successfully');
      } else {
        await teamUpdateApi.create(updateData);
        toast.success('Update created successfully');
      }
      
      setShowForm(false);
      setEditingUpdate(null);
      // refresh lists after create/update
      fetchFavorites();
      fetchRecents();
      fetchCategoryCounts();
    } catch (error: any) {
      const msg = getErrorMessage(error);
      toast.error(`Failed to save update: ${msg}`);
    }
  };

  // Admin edit/delete actions are available from detail or dedicated admin screens

  function HubCard({ update }: { update: TeamUpdate }) {
    const def = (HUB_CATEGORY_DEFS as any)[update.category] || {};
    const Icon = def.Icon || Tag;
    const label = def.label || formatCategoryLabel(update.category);
    return (
      <div className="p-4 rounded-xl border border-gray-200 hover:shadow-sm transition bg-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center mr-3 bg-gray-100 text-gray-700">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-primary-700 font-medium">{label}{update.section ? ` • ${update.section}` : ''}</div>
              <div className="text-md font-semibold text-gray-900">{update.title}</div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Link to={`/team-updates?category=${encodeURIComponent(update.category)}${update.section ? `&section=${encodeURIComponent(update.section)}` : ''}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Open
          </Link>
          {update.externalLink && (
            <a href={update.externalLink} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-800">External</a>
          )}
        </div>
      </div>
    );
  }

  function HubRow({ update }: { update: TeamUpdate }) {
    const def = (HUB_CATEGORY_DEFS as any)[update.category] || {};
    const Icon = def.Icon || Tag;
    const label = def.label || formatCategoryLabel(update.category);
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center mr-3 bg-gray-100 text-gray-700">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs text-primary-700 font-medium">{label}{update.section ? ` • ${update.section}` : ''}</div>
            <div className="text-sm font-medium text-gray-900">{update.title}</div>
          </div>
        </div>
        <Link to={`/team-updates?category=${encodeURIComponent(update.category)}${update.section ? `&section=${encodeURIComponent(update.section)}` : ''}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Open
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // const categoryKeys = Object.keys(HUB_CATEGORY_DEFS);

  // Guided steps per category (simple static mapping)
  function journeyStepsForCategory(categoryKey: string): Array<{ key: string; title: string; caption?: string; section?: string }> {
    switch (categoryKey) {
      case 'start_here':
        return [
          { key: 'welcome', title: 'Welcome and Setup', caption: 'Access, tools, and week-one checklist', section: 'welcome_setup' },
          { key: 'playbook', title: 'Core Playbooks', caption: 'What good looks like', section: 'core_playbooks' },
        ];
      case 'cold_calling':
        return [
          { key: 'open', title: 'Open strong', caption: 'Hooks and pattern interrupts', section: 'Openers' },
          { key: 'qualify', title: 'Qualify fast', caption: 'Frameworks and questions', section: 'Qualification' },
          { key: 'objections', title: 'Handle objections', caption: 'Top 10 and frameworks', section: 'Objections' },
        ];
      case 'prospecting':
        return [
          { key: 'icp', title: 'ICP and Triggers', caption: 'Signals and research', section: 'ICP' },
          { key: 'personalize', title: 'Personalization', caption: 'Messaging and examples', section: 'Personalization' },
        ];
      default:
        return [
          { key: 'learn', title: 'Learn the basics', caption: 'Start here' },
          { key: 'extra', title: 'Extra documents', caption: 'Use cases and examples' },
        ];
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg p-6 text-white bg-primary-600">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              AE Hub
            </h1>
            <p className="mt-2 text-primary-100">
              Playbooks, documents, and resources
            </p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                setEditingUpdate(null);
                setShowForm(true);
              }}
              className="btn-primary bg-white text-primary-600 hover:bg-gray-100"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Resource
            </button>
          )}
        </div>
      </div>

      {/* Favorites and Recently Viewed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card rounded-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center"><Star className="h-5 w-5 text-yellow-500 mr-2" /> Favorites</h2>
          </div>
          {favorites.length === 0 ? (
            <p className="text-gray-500">No favorites yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favorites.slice(0, 6).map((u) => (
                <HubCard key={`fav-${u.id}`} update={u} />
              ))}
            </div>
          )}
        </div>
        <div className="card rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center"><Clock className="h-5 w-5 text-primary-600 mr-2" /> Recently Viewed</h2>
          </div>
          {recents.length === 0 ? (
            <p className="text-gray-500">No recent views</p>
          ) : (
            <div className="space-y-3">
              {recents.slice(0, 6).map((u) => (
                <HubRow key={`rec-${u.id}`} update={u} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Journeys */}
      <div className="card rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Explore Journeys</h2>
          <button
            onClick={() => setSelectedCategory('')}
            className={`text-sm font-medium ${selectedCategory === '' ? 'text-primary-700' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Clear selection
          </button>
        </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALPHABETICAL_CATEGORY_KEYS.map((key) => {
            const def = (HUB_CATEGORY_DEFS as any)[key];
            const Icon = def.Icon;
            const count = categoryCounts[key?.toLowerCase?.() ? key.toLowerCase() : key] ?? 0;
            const isActive = false;
            return (
              <div key={key} className={`p-5 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition cursor-pointer`} onClick={() => navigate(`/hub/${key}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className={`h-12 w-12 rounded-lg flex items-center justify-center mr-4 ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-md font-semibold text-gray-900">{def.label}</div>
                      {def.description && <div className="text-sm text-gray-600 mt-1">{def.description}</div>}
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{count}</span>
                </div>

                {/* Guided steps */}
                <div className="mt-4 space-y-2">
                  {journeyStepsForCategory(key).map((step) => (
                    <Link key={step.key} to={`/hub/${encodeURIComponent(key)}?section=${encodeURIComponent(step.section || '')}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 group">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{step.title}</div>
                        {step.caption && <div className="text-xs text-gray-600">{step.caption}</div>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            {editingUpdate ? 'Edit Resource' : 'Create New Resource'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                name="title"
                required
                defaultValue={editingUpdate?.title}
                className="input-field mt-1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                name="category"
                required
                defaultValue={editingUpdate?.category || ''}
                className="input-field mt-1"
              >
                <option value="">Select category</option>
                {Object.entries(HUB_CATEGORY_DEFS).map(([key, def]) => (
                  <option key={key} value={key}>{(def as any).label || formatCategoryLabel(key)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Section (optional)</label>
              <input
                type="text"
                name="section"
                defaultValue={editingUpdate?.section || ''}
                className="input-field mt-1"
                placeholder="e.g., Scripts, Objection Handling, Templates"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <textarea
                name="content"
                rows={4}
                defaultValue={editingUpdate?.content}
                className="input-field mt-1"
                placeholder="Add any additional details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">External Link</label>
              <input
                type="url"
                name="externalLink"
                defaultValue={editingUpdate?.externalLink}
                className="input-field mt-1"
                placeholder="https://example.com"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingUpdate(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingUpdate ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* No bottom list - encourage navigation via journeys */}
    </div>
  );
};

export default TeamUpdates;