import { useState, useEffect } from 'react';
import { teamUpdateApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, FileText, Link as LinkIcon, Tag, Plus, Edit2, Trash2, BookOpen, Phone, Search, ShieldCheck, BarChart2, Box, GraduationCap, Users } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { TeamUpdate } from '@/types';

const HUB_CATEGORY_DEFS = {
  start_here: {
    label: 'Start Here, New Joiners Guides',
    description: 'Setup, expectations, week one checklist, core playbooks.',
    Icon: BookOpen,
  },
  cold_calling: {
    label: 'Cold Calling',
    description: 'Open strong, qualify fast, handle objections, stay compliant.',
    Icon: Phone,
  },
  prospecting: {
    label: 'Prospecting',
    description: 'ICP, triggers, research, personalization, cadences, data sources.',
    Icon: Search,
  },
  cos_qc_onboarding: {
    label: 'COS, QC, and Onboarding',
    description: 'COS process, QC standards, ticket instructions, reference docs, onboarding escalations.',
    Icon: ShieldCheck,
  },
  performance_accountability: {
    label: 'Performance and Accountability',
    description: 'Targets, pipeline hygiene, CRM analytics, Looker guides.',
    Icon: BarChart2,
  },
  product_market: {
    label: 'Product and Market',
    description: 'Product basics, pricing, use cases, competitors, value proof.',
    Icon: Box,
  },
  training_development: {
    label: 'Extra Training and Development',
    description: 'Upselling, discovery, best practices.',
    Icon: GraduationCap,
  },
  client_templates_proposals: {
    label: 'Client Templates and Proposals',
    description: 'Emails, proposals, calculators, decks, case studies.',
    Icon: FileText,
  },
  meetings_internal_comms: { label: 'Meetings and Internal Comms', Icon: Users },
} as const;

function formatCategoryLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TeamUpdates = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<TeamUpdate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<TeamUpdate | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchUpdates();
  }, [selectedCategory]);

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  const fetchUpdates = async () => {
    try {
      const response = await teamUpdateApi.getAll(selectedCategory);
      setUpdates(response.data);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
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
      // Non-blocking: ignore count load errors
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
      fetchUpdates();
      fetchCategoryCounts();
    } catch (error) {
      toast.error('Failed to save update');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this update?')) return;

    try {
      await teamUpdateApi.delete(id);
      toast.success('Update deleted successfully');
      fetchUpdates();
      fetchCategoryCounts();
    } catch (error) {
      toast.error('Failed to delete update');
    }
  };

  const handleEdit = (update: TeamUpdate) => {
    setEditingUpdate(update);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Group updates by section within the selected category view
  const updatesBySection = updates.reduce((acc: Record<string, TeamUpdate[]>, item) => {
    const key = item.section?.trim() || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedSectionEntries = Object.entries(updatesBySection).sort(([a], [b]) => a.localeCompare(b));

  const selectedDef = selectedCategory
    ? (HUB_CATEGORY_DEFS as Record<string, any>)[selectedCategory]
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <MessageSquare className="h-8 w-8 mr-3" />
              AE Hub
            </h1>
            <p className="mt-2 text-primary-100">
              Documents, templates, and resources for Account Executives
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

      {/* Category Filter - redesigned as tile grid */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Categories</h2>
          <button
            onClick={() => setSelectedCategory('')}
            className={`text-sm font-medium ${selectedCategory === '' ? 'text-primary-700' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Clear filter
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(HUB_CATEGORY_DEFS).map(([key, def]) => {
            const Icon = (def as any).Icon;
            const isActive = selectedCategory === key;
            const count = categoryCounts[key] ?? 0;
            return (
              <div
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`tile ${isActive ? 'tile-active' : ''}`}
              >
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center mr-4 ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{(def as any).label}</div>
                    {(def as any).description && (
                      <div className="text-xs text-gray-500 truncate max-w-[16rem]">{(def as any).description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="tile-badge">{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDef && (
        <div className="card">
          <div className="flex items-start">
            <div className="h-12 w-12 rounded-lg flex items-center justify-center mr-4 bg-primary-50 text-primary-700">
              {(() => {
                const Icon = selectedDef.Icon || Tag;
                return <Icon className="h-6 w-6" />;
              })()}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{selectedDef.label}</h2>
              {selectedDef.description && (
                <p className="text-sm text-gray-600 mt-1">{selectedDef.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Updates List */}
      <div className="space-y-6">
        {updates.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No resources found</p>
          </div>
        ) : (
          sortedSectionEntries.map(([sectionName, sectionUpdates]) => (
            <div key={sectionName} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold text-gray-800">
                  {sectionName}
                </h3>
                <span className="text-xs text-gray-500">{sectionUpdates.length} item{sectionUpdates.length !== 1 ? 's' : ''}</span>
              </div>
              {sectionUpdates.map((update) => {
                const def = HUB_CATEGORY_DEFS[update.category as keyof typeof HUB_CATEGORY_DEFS] as any;
                const Icon = def?.Icon || Tag;
                const label = def?.label || formatCategoryLabel(update.category);
                return (
                  <div key={update.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Icon className="h-5 w-5 text-primary-600 mr-2" />
                          <span className="text-sm font-medium text-primary-600">
                            {label}
                          </span>
                          {update.section && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                              {update.section}
                            </span>
                          )}
                          <span className="text-sm text-gray-500 ml-2">
                            • {format(new Date(update.createdAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-2">{update.title}</h3>
                        
                        {update.content && (
                          <p className="text-gray-600 mb-3 whitespace-pre-wrap">{update.content}</p>
                        )}
                        
                        {update.externalLink && (
                          <a
                            href={update.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
                          >
                            <LinkIcon className="h-4 w-4 mr-1" />
                            View Link
                          </a>
                        )}
                        
                        {update.createdBy && (
                          <p className="text-xs text-gray-500 mt-3">
                            Posted by {update.createdBy.name}
                          </p>
                        )}
                      </div>
                      
                      {user?.role === 'admin' && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleEdit(update)}
                            className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(update.id)}
                            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamUpdates;