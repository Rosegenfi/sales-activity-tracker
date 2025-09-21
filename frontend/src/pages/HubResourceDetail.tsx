import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teamUpdateApi } from '@/services/api';
import type { TeamUpdate } from '@/types';
import { HUB_CATEGORY_DEFS, formatCategoryLabel } from './hubCategories';
import { ArrowLeft, Star, Tag, Link as LinkIcon } from 'lucide-react';

const HubResourceDetail = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<TeamUpdate | null>(null);
  const [isFav, setIsFav] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await teamUpdateApi.getById(Number(id));
        setItem(res.data);
        // naive: query favorites list to determine state
        try {
          const favs = await teamUpdateApi.getFavorites();
          setIsFav(!!favs.data.find((f) => f.id === Number(id)));
        } catch {}
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const toggleFavorite = async () => {
    if (!item) return;
    try {
      if (isFav) {
        await teamUpdateApi.removeFavorite(item.id);
        setIsFav(false);
      } else {
        await teamUpdateApi.addFavorite(item.id);
        setIsFav(true);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Resource not found</p>
      </div>
    );
  }

  const def: any = (HUB_CATEGORY_DEFS as any)[item.category] || {};
  const Icon = def.Icon || Tag;
  const label = def.label || formatCategoryLabel(item.category);

  return (
    <div className="space-y-6">
      <div className="rounded-lg p-6 text-white bg-primary-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-3 text-primary-100 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold flex items-center">
              <Icon className="h-7 w-7 mr-3" />
              {item.title}
            </h1>
          </div>
          <button onClick={toggleFavorite} className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${isFav ? 'bg-yellow-100 text-yellow-700' : 'bg-white text-primary-700'}`}>
            <Star className={`h-4 w-4 mr-1 ${isFav ? 'text-yellow-500' : 'text-primary-600'}`} />
            {isFav ? 'Favorited' : 'Add to Favorites'}
          </button>
        </div>
      </div>

      <div className="card rounded-xl">
        <div className="flex items-center mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
            {label}{item.section ? ` • ${item.section}` : ''}
          </span>
        </div>
        {item.content && (
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-gray-800">{item.content}</p>
          </div>
        )}
        {item.externalLink && (
          <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium mt-4">
            <LinkIcon className="h-4 w-4 mr-1" />
            Open external link
          </a>
        )}
      </div>
    </div>
  );
};

export default HubResourceDetail;

