import { useState, useEffect } from 'react';
import { teamUpdateApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, FileText, Link as LinkIcon, Calendar, Tag, Plus, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import type { TeamUpdate } from '@/types';

const categoryIcons = {
  presentations: FileText,
  tickets: LinkIcon,
  events: Calendar,
  qc_updates: Tag,
};

const categoryLabels = {
  presentations: 'Presentations & Guides',
  tickets: 'Ticket Links',
  events: 'Upcoming Events',
  qc_updates: 'QC Updates',
};

const TeamUpdates = () => {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<TeamUpdate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<TeamUpdate | null>(null);

  useEffect(() => {
    fetchUpdates();
  }, [selectedCategory]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updateData = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: formData.get('category') as 'presentations' | 'tickets' | 'events' | 'qc_updates',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <MessageSquare className="h-8 w-8 mr-3" />
              Team Updates
            </h1>
            <p className="mt-2 text-primary-100">
              Important announcements and resources
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
              New Update
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === ''
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            {editingUpdate ? 'Edit Update' : 'Create New Update'}
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
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
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
      <div className="space-y-4">
        {updates.length === 0 ? (
          <div className="card text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No updates found</p>
          </div>
        ) : (
          updates.map((update) => {
            const Icon = categoryIcons[update.category as keyof typeof categoryIcons];
            return (
              <div key={update.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Icon className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-sm font-medium text-primary-600">
                        {categoryLabels[update.category as keyof typeof categoryLabels]}
                      </span>
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
          })
        )}
      </div>
    </div>
  );
};

export default TeamUpdates;