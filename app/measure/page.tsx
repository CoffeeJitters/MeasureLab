'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Viewer from '@/components/Viewer';
import ToolRail from '@/components/ToolRail';
import TakeoffList from '@/components/TakeoffList';
import EstimatePanel from '@/components/EstimatePanel';
import { UploadedFile, Measurement, MeasurementType, ScaleCalibration } from '@/types';
import { storage } from '@/utils/storage';
import { getToolColor } from '@/utils/categories';

export default function MeasurePage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [activeTool, setActiveTool] = useState<MeasurementType | 'calibrate' | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [calibration, setCalibration] = useState<ScaleCalibration | null>(null);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<'takeoff' | 'estimate'>('takeoff');
  const [defaultColor, setDefaultColor] = useState<string>(getToolColor('area'));
  const [defaultCategory, setDefaultCategory] = useState<string>('');
  const [defaultType, setDefaultType] = useState<MeasurementType | null>(null);

  // Load saved state from localStorage
  useEffect(() => {
    const savedFiles = storage.loadFiles();
    const savedMeasurements = storage.loadMeasurements();
    const savedCalibration = storage.loadCalibration();
    const savedActiveFile = storage.loadActiveFile();
    const savedActivePage = storage.loadActivePage();
    const savedActiveTool = storage.loadActiveTool();

    // Note: We can't restore File objects from localStorage, so files need to be re-uploaded
    // But we can restore the metadata
    setMeasurements(savedMeasurements);
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

  // Save state to localStorage
  useEffect(() => {
    storage.saveMeasurements(measurements);
  }, [measurements]);

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

  const handleFileAdd = (file: UploadedFile) => {
    setFiles((prev) => [...prev, file]);
    if (!activeFileId) {
      setActiveFileId(file.id);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId);
    setActivePage(1);
  };

  const handleFileRemove = (fileId: string) => {
    setFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== fileId);
      // Remove measurements for this file
      setMeasurements((prevMeas) => prevMeas.filter((m) => {
        const file = prev.find((f) => f.id === fileId);
        // We'll keep measurements even if file is removed, but could filter by page if needed
        return true;
      }));
      return newFiles;
    });
    if (activeFileId === fileId) {
      const remainingFiles = files.filter((f) => f.id !== fileId);
      setActiveFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null);
      setActivePage(1);
    }
  };

  const handleMeasurementAdd = (measurement: Measurement) => {
    setMeasurements((prev) => [...prev, measurement]);
    // Keep length, area, and count tools active after adding a measurement
    // Only deactivate calibrate tool (which is handled in handleCalibrationUpdate)
    // Don't deactivate the tool here - let users continue measuring
  };

  const handleMeasurementUpdate = (id: string, updates: Partial<Measurement>) => {
    setMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const handleMeasurementDelete = (id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    if (selectedMeasurementId === id) {
      setSelectedMeasurementId(null);
    }
  };

  const handleCalibrationUpdate = (newCalibration: ScaleCalibration) => {
    setCalibration(newCalibration);
    setActiveTool(null);
  };

  const activeFile = files.find((f) => f.id === activeFileId) || null;

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
          onCalibrationUpdate={handleCalibrationUpdate}
          selectedMeasurementId={selectedMeasurementId}
          onMeasurementSelect={setSelectedMeasurementId}
          defaultColor={defaultColor}
          defaultCategory={defaultCategory}
          defaultType={defaultType}
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
        />
      </div>
      {/* Right Panel */}
      {rightPanelMode === 'takeoff' ? (
        <TakeoffList
          measurements={measurements}
          onMeasurementUpdate={handleMeasurementUpdate}
          onMeasurementDelete={handleMeasurementDelete}
          onMeasurementSelect={setSelectedMeasurementId}
          selectedMeasurementId={selectedMeasurementId}
        />
      ) : (
        <EstimatePanel measurements={measurements} />
      )}
    </div>
  );
}

