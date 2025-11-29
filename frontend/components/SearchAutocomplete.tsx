'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface SearchSuggestion {
  id: string;
  title: string;
  artist: string;
  year?: number;
  imageUrl?: string;
  genre?: string;
  label?: string;
}

interface SearchAutocompleteProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<SearchSuggestion[]>;
  onSelect: (suggestion: SearchSuggestion) => void;
  onSearchChange?: (query: string) => void;
  debounceMs?: number;
  minChars?: number;
  maxSuggestions?: number;
  isLoading?: boolean;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  placeholder = 'Search...',
  onSearch,
  onSelect,
  onSearchChange,
  debounceMs = 300,
  minChars = 2,
  maxSuggestions = 8,
  isLoading: externalLoading = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState('');

  const debounceTimer = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minChars) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const results = await onSearch(searchQuery);
        setSuggestions(results.slice(0, maxSuggestions));
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch, minChars, maxSuggestions]
  );

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    onSearchChange?.(value);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    if (value.length === 0) {
      setSuggestions([]);
      setIsOpen(false);
    } else {
      debounceTimer.current = setTimeout(() => {
        performSearch(value);
      }, debounceMs);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = prev + 1;
          return next < suggestions.length ? next : -1;
        });
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = prev - 1;
          return next >= -1 ? next : suggestions.length - 1;
        });
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex]);
          setQuery('');
          setSuggestions([]);
          setIsOpen(false);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSuggestions([]);
        setSelectedIndex(-1);
        break;

      default:
        break;
    }
  };

  // Handle mouse selection
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    onSelect(suggestion);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const items = suggestionsRef.current.querySelectorAll('[data-suggestion]');
      const selected = items[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= minChars && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          autoComplete="off"
        />
        {(loading || externalLoading) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              data-suggestion
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`px-4 py-3 border-b border-gray-700 last:border-b-0 cursor-pointer transition ${
                index === selectedIndex
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'hover:bg-gray-700'
              }`}
            >
              <div className="flex items-start gap-3">
                {suggestion.imageUrl && (
                  <img
                    src={suggestion.imageUrl}
                    alt={suggestion.title}
                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {suggestion.artist}
                  </p>
                  <p className="text-sm text-gray-300 truncate">
                    {suggestion.title}
                  </p>
                  <div className="text-xs text-gray-400 flex gap-2 mt-1">
                    {suggestion.year && <span>{suggestion.year}</span>}
                    {suggestion.genre && <span>{suggestion.genre}</span>}
                    {suggestion.label && <span>{suggestion.label}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.length >= minChars && !loading && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg p-4 text-gray-400 text-sm">
          No results found
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
