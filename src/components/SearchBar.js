import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const SearchBar = ({ placeholder, value, onChange, onSearch }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const fetchSuggestions = async (searchTerm) => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `http://localhost:8080/api/listings/suggestions?q=${encodeURIComponent(searchTerm)}`
      );
      
      // Format suggestions to display text
      const formattedSuggestions = response.data.map(item => {
        // If suggestion is an object, format it appropriately
        if (typeof item === 'object' && item !== null) {
          // Customize this based on your API response structure
          if (item.propertyName && item.address?.city) {
            return {
              displayText: `${item.propertyName} (${item.address.city})`,
              searchText: `${item.propertyName} ${item.address.city}`,
              original: item
            };
          }
          return {
            displayText: item.propertyName || item.address?.city || 'Property',
            searchText: item.propertyName || item.address?.city || '',
            original: item
          };
        }
        // If suggestion is already a string
        return {
          displayText: item,
          searchText: item,
          original: item
        };
      });
      
      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (value.trim().length > 2) {
        fetchSuggestions(value);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [value]);

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((prev) => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeSuggestion]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onChange({ target: { value: suggestion.searchText } });
    setSuggestions([]);
    searchRef.current.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
      setSuggestions([]);
      if (onSearch) onSearch(value);
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex">
        <input
          ref={searchRef}
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="p-2 w-full rounded-l border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search listings"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white p-2 rounded-r"
          disabled={isLoading}
        >
          {isLoading ? "..." : "Search"}
        </button>
      </form>

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-b shadow-lg mt-1 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`p-2 hover:bg-gray-100 cursor-pointer ${
                index === activeSuggestion ? "bg-gray-100" : ""
              }`}
            >
              {suggestion.displayText}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSearch: PropTypes.func,
};

export default SearchBar;