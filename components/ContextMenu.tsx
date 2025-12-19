'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Tag, ChevronRight } from 'lucide-react';
import { getAllCategories, getCategoryColor } from '@/utils/categories';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onCategorySelect?: (category: string | null) => void;
  hasSelection: boolean;
}

export default function ContextMenu({ x, y, onClose, onGroup, onUngroup, onCategorySelect, hasSelection }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showCategorySubmenu, setShowCategorySubmenu] = useState(false);
  const categories = getAllCategories();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Add listeners after a short delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position if menu would overflow
    if (x + rect.width > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    // Adjust vertical position if menu would overflow
    if (y + rect.height > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    menuRef.current.style.left = `${adjustedX}px`;
    menuRef.current.style.top = `${adjustedY}px`;
  }, [x, y]);

  if (!hasSelection) {
    return null;
  }

  const handleCategoryClick = (category: string | null) => {
    if (onCategorySelect) {
      onCategorySelect(category);
    }
    onClose();
  };

  return (
    <>
      <div
        ref={menuRef}
        className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
        style={{ left: x, top: y }}
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={() => setShowCategorySubmenu(false)}
      >
        <button
          onClick={() => {
            onGroup();
            onClose();
          }}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Group</span>
        </button>
        <button
          onClick={() => {
            onUngroup();
            onClose();
          }}
          className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
        >
          <Minus className="h-4 w-4" />
          <span>Ungroup</span>
        </button>
        {onCategorySelect && (
          <div
            className="relative"
            onMouseEnter={() => setShowCategorySubmenu(true)}
            onMouseLeave={() => setShowCategorySubmenu(false)}
          >
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>Category</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
            {showCategorySubmenu && (
              <div
                className="absolute left-full top-0 ml-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-50"
                onMouseEnter={() => setShowCategorySubmenu(true)}
                onMouseLeave={() => setShowCategorySubmenu(false)}
              >
                <button
                  onClick={() => handleCategoryClick(null)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                >
                  None
                </button>
                {categories.map((category) => (
                  <button
                    key={category.name}
                    onClick={() => handleCategoryClick(category.name)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
