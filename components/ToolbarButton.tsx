'use client';

import { LucideIcon } from 'lucide-react';

interface ToolbarButtonProps {
  label: string;
  icon?: LucideIcon;
  unitText?: string;
  hasMenu?: boolean;
  isActive: boolean;
  onClick: () => void;
  activeColor?: string;
  activeIndicatorColor?: string;
  className?: string;
  title?: string;
}

export default function ToolbarButton({
  label,
  icon: Icon,
  unitText,
  hasMenu = false,
  isActive,
  onClick,
  activeColor,
  activeIndicatorColor,
  className = '',
  title,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[88px] h-9 px-3 py-2 rounded transition-all duration-75 flex items-center gap-2 group relative ${
        isActive ? 'bg-white/5' : 'bg-transparent'
      } hover:bg-white/3 ${className}`}
    >
      {/* Active indicator bar - always rendered, opacity controlled by isActive */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-t transition-opacity duration-75 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundColor: activeIndicatorColor || 'rgba(255, 255, 255, 0.4)' }}
      />
      
      {/* Icon - always rendered if provided */}
      {Icon && (
        <Icon 
          className={`w-4 h-4 transition-colors ${
            isActive 
              ? 'text-white' 
              : 'text-white/50 group-hover:text-white/70'
          }`}
          style={isActive && activeColor ? { color: activeColor } : undefined}
          strokeWidth={1.5}
        />
      )}
      
      {/* Label - always rendered */}
      <span className={`text-sm transition-colors flex-1 text-left ${
        isActive
          ? 'text-white font-medium'
          : 'text-white/60 group-hover:text-white/80'
      }`}>
        {label}
      </span>
      
      {/* Unit text - always rendered if provided */}
      {unitText && (
        <span className={`text-[10px] font-medium transition-opacity duration-75 ${
          isActive ? 'text-white/40 opacity-100' : 'text-white/40 opacity-60'
        }`}>
          {unitText}
        </span>
      )}
      
      {/* Menu caret - always rendered if hasMenu is true */}
      {hasMenu && (
        <span className={`text-[10px] transition-opacity duration-75 ${
          isActive ? 'text-white/40 opacity-100' : 'text-white/40 opacity-60'
        }`}>
          ▼
        </span>
      )}
    </button>
  );
}
