import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, ExternalLink, Loader2, ArrowRight, TrendingUp } from 'lucide-react';
import { SearchResult } from './types';

interface RankedResult extends SearchResult {
  links: number;
  score: number;
}

const App: React.FC = () => {
  const [data, setData] = useState<RankedResult[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('./index.json');
        if (!response.ok) {
          throw new Error('Failed to load search index.');
        }
        const jsonData = await response.json();
        setData(jsonData);
        setError(null);
      } catch (err) {
        console.error('Error loading index:', err);
        setError('Could not load search results. Indexing in progress.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredResults = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return [];
    
    return data
      .map(item => {
        let score = item.links || 0;
        const title = (item.title || "").toLowerCase();
        const description = (item.description || "").toLowerCase();
        const url = (item.url || "").toLowerCase();

        const inTitle = title.includes(trimmedQuery);
        const inDesc = description.includes(trimmedQuery);
        const inDomain = url.includes(trimmedQuery);

        if (inTitle) score += 10;
        if (inDesc) score += 5;
        if (inDomain) score += 3;

        // If no match in text fields, it's not a relevant result
        if (!inTitle && !inDesc && !inDomain) return null;

        return { ...item, score };
      })
      .filter((item): item is RankedResult => item !== null)
      .sort((a, b) => b.score - a.score);
  }, [query, data]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`transition-all duration-500 ease-in-out flex flex-col items-center justify-center bg-white border-b border-slate-200 px-4 ${query ? 'py-8' : 'flex-1'}`}>
        <div className="w-full max-w-2xl text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800">
              BLUOM<span className="text-blue-600"> Search</span>
            </h1>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by keyword or URL..."
              className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {!query && !loading && (
            <div className="mt-4 flex flex-col items-center">
              <p className="text-slate-500 text-sm mb-2">
                Real-time results ranked by relevance and link authority.
              </p>
              <div className="flex gap-4 text-xs font-medium text-slate-400">
                <span>{data.length} Domains Indexed</span>
                <span>•</span>
                <span>Incremental Growth Enabled</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-medium">Reading index...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
            <p>{error}</p>
          </div>
        ) : query ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between text-sm text-slate-500 pb-2 border-b border-slate-100">
              <p>Ranked {filteredResults.length} matches</p>
            </div>
            
            {filteredResults.length > 0 ? (
              <div className="space-y-6">
                {filteredResults.map((result, idx) => (
                  <article key={idx} className="group p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xl font-semibold text-blue-600 hover:underline group-hover:text-blue-700"
                          >
                            {result.title}
                          </a>
                          {result.links > 1 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                              <TrendingUp className="w-2.5 h-2.5" />
                              Auth: {result.links}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-emerald-700 mb-2 font-mono truncate max-w-md">
                          {result.url}
                        </p>
                        <p className="text-slate-600 leading-relaxed line-clamp-2">
                          {result.description}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center justify-center p-2 rounded-full bg-slate-50 group-hover:bg-blue-50 transition-colors self-center">
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-slate-800">No results found</h3>
                <p className="text-slate-500 mt-2">Try broader keywords.</p>
              </div>
            )}
          </div>
        ) : null}
      </main>

      <footer className="py-8 bg-white border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} BLUOM Web Search • Distributed System Build v2.0
        </p>
      </footer>
    </div>
  );
};

export default App;