import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, ExternalLink, Loader2, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
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
        let score = Math.log10((item.links || 1) + 1); // Logarithmic scale for authority to prevent total takeover
        const title = (item.title || "").toLowerCase();
        const description = (item.description || "").toLowerCase();
        const url = (item.url || "").toLowerCase();

        const inTitle = title.includes(trimmedQuery);
        const inDesc = description.includes(trimmedQuery);
        const inDomain = url.includes(trimmedQuery);

        if (inTitle) score += 10;
        if (inDesc) score += 5;
        if (inDomain) score += 3;

        // Exact matches get a massive boost
        if (title === trimmedQuery) score += 50;
        if (url === trimmedQuery || url === `https://${trimmedQuery}/`) score += 100;

        if (!inTitle && !inDesc && !inDomain) return null;

        return { ...item, score };
      })
      .filter((item): item is RankedResult => item !== null)
      .sort((a, b) => b.score - a.score);
  }, [query, data]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`transition-all duration-700 ease-in-out flex flex-col items-center justify-center px-4 sticky top-0 z-50 ${query ? 'py-6 glass-header border-b border-slate-200' : 'flex-1 bg-transparent'}`}>
        <div className="w-full max-w-2xl text-center">
          <div className={`flex items-center justify-center gap-3 transition-all duration-500 ${query ? 'mb-4 scale-90' : 'mb-8'}`}>
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200/50">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
              BLUOM<span className="text-blue-600">Search</span>
            </h1>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 transition-colors ${query ? 'text-blue-500' : 'text-slate-400'} group-focus-within:text-blue-600`} />
            </div>
            <input
              type="text"
              placeholder="Search by keyword, domain, or authority..."
              className="search-input block w-full pl-14 pr-6 py-4.5 bg-white border border-slate-200 rounded-full text-lg shadow-sm focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {!query && !loading && (
            <div className="mt-8 flex flex-col items-center animate-pulse">
              <div className="flex items-center gap-2 text-blue-600 font-medium text-sm mb-3">
                <Sparkles className="w-4 h-4" />
                <span>Next-Gen Discovery Engine</span>
              </div>
              <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                Aggregating the web's most authoritative domains through automated crawling and link analysis.
              </p>
              <div className="mt-6 flex gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {data.length} Domains</span>
                <span>•</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> v3.0 Crawler</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="relative">
               <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
               <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 animate-pulse"></div>
            </div>
            <p className="text-slate-500 font-semibold tracking-wide">Syncing Global Index...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 text-red-800 p-8 rounded-3xl text-center shadow-sm">
            <p className="font-medium">{error}</p>
          </div>
        ) : query ? (
          <div className="space-y-10">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-200/60">
              <p>Search Results</p>
              <p>{filteredResults.length} matches optimized</p>
            </div>
            
            {filteredResults.length > 0 ? (
              <div className="grid gap-6">
                {filteredResults.map((result, idx) => (
                  <article 
                    key={idx} 
                    className="result-card group p-7 bg-white rounded-3xl border border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors leading-tight"
                          >
                            {result.title}
                          </a>
                          {result.links > 5 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-tight border border-emerald-100">
                              <TrendingUp className="w-3 h-3" />
                              Authority: {result.links}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-emerald-600/80 mb-3 truncate font-mono">
                          {result.url}
                        </p>
                        <p className="text-slate-500 leading-relaxed text-[15px] line-clamp-3">
                          {result.description || "No preview available for this high-authority domain."}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-blue-600 transition-all duration-300 shadow-sm group-hover:shadow-blue-200">
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                       <a 
                          href={result.url} 
                          className="text-xs font-bold text-blue-600/70 hover:text-blue-600 flex items-center gap-1.5 uppercase tracking-wider"
                        >
                          Visit Site <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-[10px] text-slate-300 font-bold uppercase">Result #{idx + 1}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-32">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-full mb-6">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">No signals found</h3>
                <p className="text-slate-500 mt-3 max-w-sm mx-auto">Our index didn't find any direct matches. Try exploring broad domain names or common keywords.</p>
              </div>
            )}
          </div>
        ) : null}
      </main>

      <footer className="py-12 bg-white border-t border-slate-100 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-40 grayscale">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">BLUOM SEARCH ENGINE</span>
          </div>
          <p className="text-slate-400 text-[13px] leading-relaxed">
            &copy; {new Date().getFullYear()} BLUOM Web Search. Built for the distributed web. <br/>
            Optimized for performance, authority, and discovery.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
