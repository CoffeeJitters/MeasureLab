'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Viewer from '@/components/Viewer';
import ToolRail from '@/components/ToolRail';
import TakeoffList from '@/components/TakeoffList';
import EstimatePanel from '@/components/EstimatePanel';
import GroupNameDialog from '@/components/GroupNameDialog';
import { UploadedFile, Measurement, MeasurementType, ScaleCalibration, Group } from '@/types';
import { storage } from '@/utils/storage';
import { getToolColor } from '@/utils/categories';

export default function MeasurePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [activeTool, setActiveTool] = useState<MeasurementType | 'calibrate' | 'select' | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [calibration, setCalibration] = useState<ScaleCalibration | null>(null);
  const [selectedMeasurementIds, setSelectedMeasurementIds] = useState<Set<string>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'takeoff' | 'estimate'>('takeoff');
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const [defaultColor, setDefaultColor] = useState<string>(getToolColor('area'));
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [defaultType, setDefaultType] = useState<MeasurementType | null>(null);

  // Load saved state from localStorage
  useEffect(() => {
    const savedFiles = storage.loadFiles();
    const savedMeasurements = storage.loadMeasurements();
    const savedGroups = storage.loadGroups();
    const savedCalibration = storage.loadCalibration();
    const savedActiveFile = storage.loadActiveFile();
    const savedActivePage = storage.loadActivePage();
    const savedActiveTool = storage.loadActiveTool();

    // Note: We can't restore File objects from localStorage, so files need to be re-uploaded
    // But we can restore the metadata
    // Migrate old measurements: convert undefined groupId to null
    const migratedMeasurements = savedMeasurements.map(m => ({
      ...m,
      groupId: m.groupId ?? null,
    }));
    setMeasurements(migratedMeasurements);
    setGroups(savedGroups);
    if (savedCalibration) {
      setCalibration(savedCalibration);
    }
    if (savedActiveFile) {
      setActiveFileId(savedActiveFile);
    }
    setActivePage(savedActivePage);
    if (savedActiveTool) {
      setActiveTool(savedActiveTool);
    }
  }, []);

  // Save state to localStorage - split into separate effects to avoid unnecessary saves
  useEffect(() => {
    storage.saveMeasurements(measurements);
  }, [measurements]);

  useEffect(() => {
    storage.saveGroups(groups);
  }, [groups]);

  useEffect(() => {
    storage.saveCalibration(calibration || { pixelDistance: 0, realDistance: 0, units: 'ft', isCalibrated: false });
  }, [calibration]);

  useEffect(() => {
    storage.saveActiveFile(activeFileId);
  }, [activeFileId]);

  useEffect(() => {
    storage.saveActivePage(activePage);
  }, [activePage]);

  useEffect(() => {
    storage.saveActiveTool(activeTool);
  }, [activeTool]);

  // Update defaultColor when activeTool changes
  useEffect(() => {
    if (activeTool && (activeTool === 'length' || activeTool === 'area' || activeTool === 'count')) {
      setDefaultColor(getToolColor(activeTool));
    }
  }, [activeTool]);

  const handleFileAdd = useCallback((file: UploadedFile) => {
    setFiles((prev) => [...prev, file]);
    setActiveFileId((prevId) => prevId || file.id);
  }, []);

  const handleFileSelect = useCallback((fileId: string) => {
    setActiveFileId(fileId);
    setActivePage(1);
  }, []);

  const handleFileRemove = useCallback((fileId: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== fileId);
      return newFiles;
    });
    setActiveFileId((prevId) => {
      if (prevId === fileId) {
        const remainingFiles = files.filter((f) => f.id !== fileId);
        return remainingFiles.length > 0 ? remainingFiles[0].id : null;
      }
      return prevId;
    });
    setActivePage(1);
  }, [files]);

  const handleMeasurementAdd = useCallback((measurement: Measurement) => {
    setMeasurements((prev) => [...prev, measurement]);
    // Keep length, area, and count tools active after adding a measurement
    // Only deactivate calibrate tool (which is handled in handleCalibrationUpdate)
    // Don't deactivate the tool here - let users continue measuring
  }, []);

  const handleMeasurementUpdate = useCallback((id: string, updates: Partial<Measurement>) => {
    setMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const handleMeasurementDelete = useCallback((id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    setSelectedMeasurementIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const handleMeasurementDeleteMultiple = useCallback((ids: Set<string>) => {
    setMeasurements((prev) => prev.filter((m) => !ids.has(m.id)));
    setSelectedMeasurementIds((prev) => {
      const newSet = new Set(prev);
      ids.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, []);

  const handleCreateGroup = useCallback((name: string): Group => {
    const newGroup: Group = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      createdAt: Date.now(),
    };
    setGroups((prev) => [...prev, newGroup]);
    return newGroup;
  }, []);

  const handleGroupSelected = useCallback((groupId: string | null) => {
    setMeasurements((prev) =>
      prev.map((m) =>
        selectedMeasurementIds.has(m.id) ? { ...m, groupId: groupId ?? null } : m
      )
    );
    // Keep selection after grouping
  }, [selectedMeasurementIds]);

  const handleUngroupSelected = useCallback(() => {
    setMeasurements((prev) =>
      prev.map((m) =>
        selectedMeasurementIds.has(m.id) ? { ...m, groupId: null } : m
      )
    );
  }, [selectedMeasurementIds]);

  const handleCalibrationUpdate = useCallback((newCalibration: ScaleCalibration) => {
    setCalibration(newCalibration);
    setActiveTool(null);
  }, []);

  const activeFile = useMemo(() => 
    files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        files={files}
        activeFileId={activeFileId}
        onFileAdd={handleFileAdd}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
      />
      <div className="flex-1 flex flex-col relative">
        <Viewer
          file={activeFile}
          activePage={activePage}
          onPageChange={setActivePage}
          activeTool={activeTool}
          measurements={measurements}
          calibration={calibration}
          onMeasurementAdd={handleMeasurementAdd}
          onMeasurementUpdate={handleMeasurementUpdate}
          onCalibrationUpdate={handleCalibrationUpdate}
          selectedMeasurementIds={selectedMeasurementIds}
          onMeasurementSelect={setSelectedMeasurementIds}
          onMeasurementDelete={handleMeasurementDeleteMultiple}
          onGroup={() => setShowGroupDialog(true)}
          onUngroup={handleUngroupSelected}
          defaultColor={defaultColor}
          defaultCategory={defaultCategory}
          defaultType={defaultType}
          isDialogOpen={showGroupDialog}
        />
        <ToolRail
          activeTool={activeTool}
          onToolSelect={setActiveTool}
          isCalibrated={calibration?.isCalibrated || false}
          defaultColor={defaultColor}
          defaultCategory={defaultCategory}
          defaultType={defaultType}
          onColorChange={setDefaultColor}
          onCategoryChange={setDefaultCategory}
          onTypeChange={setDefaultType}
          rightPanelMode={rightPanelMode}
          onRightPanelModeChange={setRightPanelMode}
          onEstimateClick={() => setIsEstimateOpen(true)}
        />
      </div>
      {/* Right Panel */}
      <TakeoffList
        measurements={measurements}
        groups={groups}
        onMeasurementUpdate={handleMeasurementUpdate}
        onMeasurementDelete={handleMeasurementDelete}
        onMeasurementSelect={useCallback((id) => {
          // Single-select behavior: replace selection, don't accumulate
          setSelectedMeasurementIds(id ? new Set([id]) : new Set());
        }, [])}
        selectedMeasurementId={useMemo(() => 
          selectedMeasurementIds.size === 1 ? Array.from(selectedMeasurementIds)[0] : null,
          [selectedMeasurementIds]
        )}
        selectedMeasurementIds={selectedMeasurementIds}
        onMeasurementSelectMultiple={setSelectedMeasurementIds}
      />
      
      {/* Estimate Modal */}
      <EstimatePanel 
        measurements={measurements} 
        isOpen={isEstimateOpen}
        onClose={() => setIsEstimateOpen(false)}
      />
      
      {/* Group Dialog */}
      <GroupNameDialog
        isOpen={showGroupDialog}
        onClose={() => setShowGroupDialog(false)}
        onConfirm={useCallback((groupId) => {
          handleGroupSelected(groupId);
          setShowGroupDialog(false);
        }, [handleGroupSelected])}
        measurements={measurements}
        groups={groups}
        onCreateGroup={handleCreateGroup}
        selectedIds={selectedMeasurementIds}
      />
    </div>
  );
}

