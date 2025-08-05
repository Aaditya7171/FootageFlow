import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Tag, Clock, Eye, Sparkles } from 'lucide-react';
import axios from 'axios';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  uploadDate: string;
  tags: Array<{
    id: string;
    label: string;
    type: string;
    confidence?: number;
  }>;
  relevanceScore: number;
}

interface EnhancedSearchProps {
  onResultSelect?: (video: SearchResult) => void;
}

const EnhancedSearch: React.FC<EnhancedSearchProps> = ({ onResultSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tagTypes = [
    { value: 'all', label: 'All Types', icon: Search },
    { value: 'object', label: 'Objects', icon: Tag },
    { value: 'scene', label: 'Scenes', icon: Eye },
    { value: 'activity', label: 'Activities', icon: Sparkles },
    { value: 'emotion', label: 'Emotions', icon: Clock },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [query, selectedType]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/ai/search', {
        params: { query, type: selectedType }
      });
      setResults(response.data.results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = () => {
    setIsExpanded(true);
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result);
    setIsExpanded(false);
    setQuery('');
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-neutral-100 text-neutral-800';
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <motion.div
        className={`relative spotlight transition-all duration-300 ${
          isExpanded ? 'shadow-lg' : 'shadow-md'
        }`}
        animate={{ scale: isExpanded ? 1.02 : 1 }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-700" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search videos with AI... (e.g., 'happy moments', 'outdoor scenes')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleInputFocus}
            className="w-full pl-12 pr-20 py-4 bg-white border-2 border-neutral-300 rounded-full text-lg focus:outline-none focus:border-primary-500 transition-all duration-300"
          />
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {query && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={clearSearch}
                className="p-2 text-neutral-700 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
            
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-full transition-all duration-200 ${
                showFilters 
                  ? 'bg-primary-500 text-white' 
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Filter className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-24 top-1/2 transform -translate-y-1/2"
          >
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 p-4 bg-white rounded-lg shadow-lg border border-neutral-200"
          >
            <p className="text-sm font-medium text-neutral-900 mb-3">Filter by content type:</p>
            <div className="flex flex-wrap gap-2">
              {tagTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <motion.button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm transition-all duration-200 ${
                      selectedType === type.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{type.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      <AnimatePresence>
        {isExpanded && (query || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 max-h-96 overflow-y-auto z-50"
          >
            {results.length === 0 && !loading && query && (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-neutral-400" />
                </div>
                <p className="text-neutral-700">No videos found for "{query}"</p>
                <p className="text-sm text-neutral-500 mt-1">Try different keywords or check your filters</p>
              </div>
            )}

            {results.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleResultClick(result)}
                className="p-4 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0 transition-colors duration-200"
              >
                <div className="flex items-start space-x-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-12 bg-neutral-200 rounded overflow-hidden flex-shrink-0">
                    {result.thumbnailUrl ? (
                      <img
                        src={result.thumbnailUrl}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Search className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-neutral-900 truncate">{result.title}</h4>
                      <div className="flex items-center space-x-2 ml-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getRelevanceColor(result.relevanceScore)}`}>
                          {result.relevanceScore.toFixed(1)}
                        </span>
                        {result.duration && (
                          <span className="text-xs text-neutral-500">
                            {formatDuration(result.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {result.description && (
                      <p className="text-sm text-neutral-700 truncate mb-2">{result.description}</p>
                    )}

                    {/* Tags */}
                    {result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {result.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag.label}
                          </span>
                        ))}
                        {result.tags.length > 3 && (
                          <span className="text-xs text-neutral-500 px-2 py-1">
                            +{result.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedSearch;
