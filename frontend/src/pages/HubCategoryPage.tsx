import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { teamUpdateApi } from '@/services/api';
import type { TeamUpdate } from '@/types';
import { HUB_CATEGORY_DEFS, formatCategoryLabel } from './hubCategories';
import { Tag, ArrowLeft } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const HubCategoryPage = () => {
  const { category = '' } = useParams();
  const query = useQuery();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<TeamUpdate[]>([]);
  const [section, setSection] = useState<string>(query.get('section') || '');
  const [q, setQ] = useState<string>(query.get('q') || '');

  useEffect(() => {
    setSection(query.get('section') || '');
  }, [query]);

  useEffect(() => {
    const load = async () => {
      try {
        const normalizedSection = section ? section.toLowerCase() : undefined;
        const res = await teamUpdateApi.getAll(category.toLowerCase(), normalizedSection, q || undefined);
        setUpdates(res.data);
      } catch (e) {
        // ignore for now
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category, section, q]);

  const def: any = (HUB_CATEGORY_DEFS as any)[category] || {};
  const Icon = def.Icon;
  const title = def.label || formatCategoryLabel(category);

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
      <div className="rounded-lg p-6 text-white bg-primary-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/team-updates')} className="mr-3 text-primary-100 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold flex items-center">
              {Icon && <Icon className="h-7 w-7 mr-3" />}
              {title}
            </h1>
          </div>
          {def.description && (
            <p className="mt-2 text-primary-100 hidden sm:block">{def.description}</p>
          )}
        </div>
      </div>

      {/* Filters and search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center text-sm text-gray-600">
          {section ? (
            <span>
              Section: <span className="font-medium">{section}</span>
              <button className="ml-2 text-primary-700 hover:underline" onClick={() => navigate(`/hub/${category}`)}>Clear</button>
            </span>
          ) : (
            <span>All sections</span>
          )}
        </div>
        <div className="md:col-span-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const params = new URLSearchParams(window.location.search);
              if (q) params.set('q', q); else params.delete('q');
              navigate(`/hub/${category}?${params.toString()}`);
            }}
          >
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search within this category..."
              className="input-field w-full"
            />
          </form>
        </div>
      </div>

      {/* Content tiles */}
      {updates.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No resources found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map((u) => {
            const defInner: any = (HUB_CATEGORY_DEFS as any)[u.category] || {};
            const IconInner = defInner.Icon || Tag;
            const label = defInner.label || formatCategoryLabel(u.category);
            return (
              <Link to={`/hub/resource/${u.id}?fromCategory=${encodeURIComponent(category)}`} key={u.id} className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition block">
                <div className="flex items-start">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center mr-3 bg-gray-100 text-gray-700">
                    <IconInner className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-primary-700 font-medium">
                      {label}{u.section ? ` • ${u.section}` : ''}
                    </div>
                    <div className="text-md font-semibold text-gray-900 mt-1">{u.title}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HubCategoryPage;

