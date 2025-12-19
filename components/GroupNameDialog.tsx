'use client';

import { useState, useEffect, useMemo } from 'react';
import { Measurement, Group } from '@/types';
import { X, Check, Plus } from 'lucide-react';

interface GroupNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (groupId: string | null) => void;
  measurements: Measurement[];
  groups: Group[];
  onCreateGroup: (name: string) => Group;
  selectedIds: Set<string>;
}

export default function GroupNameDialog({
  isOpen,
  onClose,
  onConfirm,
  measurements,
  groups,
  onCreateGroup,
  selectedIds,
}: GroupNameDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Memoize sorted groups - only recalculate when groups array changes
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);

  // Pre-calculate group measurement counts - only recalculate when measurements or groups change
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    measurements.forEach(m => {
      if (m.groupId) {
        counts.set(m.groupId, (counts.get(m.groupId) || 0) + 1);
      }
    });
    return counts;
  }, [measurements]);

  useEffect(() => {
    if (isOpen) {
      setGroupName('');
      setSelectedGroupId(null);
      setIsCreatingNew(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (isCreatingNew && groupName.trim()) {
      // Create new group
      const newGroup = onCreateGroup(groupName.trim());
      onConfirm(newGroup.id);
    } else if (selectedGroupId) {
      // Use existing group
      onConfirm(selectedGroupId);
    } else {
      // No selection - ungroup
      onConfirm(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-black/90 p-6 max-w-md w-full mx-4 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Add Selected to Group</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-white/70 mb-4">
          {selectedIds.size} measurement{selectedIds.size !== 1 ? 's' : ''} selected
        </p>

        <div className="space-y-4">
          {/* Ungroup option */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Group Assignment
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <button
                onClick={() => {
                  setIsCreatingNew(false);
                  setSelectedGroupId(null);
                }}
                className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                  !isCreatingNew && !selectedGroupId
                    ? 'bg-white/10 border border-white/20 text-white'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                None (Ungrouped)
              </button>
              {sortedGroups.map((group) => {
                const count = groupCounts.get(group.id) || 0;
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setIsCreatingNew(false);
                      setSelectedGroupId(group.id);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm rounded transition-colors flex items-center justify-between ${
                      !isCreatingNew && selectedGroupId === group.id
                        ? 'bg-white/10 border border-white/20 text-white'
                        : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    <span>{group.name}</span>
                    <span className="text-xs text-white/40">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create new group */}
          <div>
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setSelectedGroupId(null);
              }}
              className={`w-full px-3 py-2 text-left text-sm rounded transition-colors flex items-center gap-2 ${
                isCreatingNew
                  ? 'bg-white/10 border border-white/20 text-white'
                  : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              Create New Group
            </button>
            
            {isCreatingNew && (
              <div className="mt-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 rounded"
                  placeholder="Enter group name (e.g., Bedroom 1, Kitchen)"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && groupName.trim()) {
                      handleConfirm();
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleConfirm}
            disabled={isCreatingNew && !groupName.trim() && !selectedGroupId}
            className="flex-1 px-4 py-2 bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirm
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/5 text-white/70 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
