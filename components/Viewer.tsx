'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { UploadedFile, Measurement, MeasurementType, ScaleCalibration, Unit } from '@/types';
import { calculateLength, calculateArea, generateColor } from '@/utils/measurements';

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface ViewerProps {
  file: UploadedFile | null;
  activePage: number;
  onPageChange: (page: number) => void;
  activeTool: MeasurementType | 'calibrate' | null;
  measurements: Measurement[];
  calibration: ScaleCalibration | null;
  onMeasurementAdd: (measurement: Measurement) => void;
  onCalibrationUpdate: (calibration: ScaleCalibration) => void;
  selectedMeasurementId: string | null;
  onMeasurementSelect: (id: string | null) => void;
}

export default function Viewer({
  file,
  activePage,
  onPageChange,
  activeTool,
  measurements,
  calibration,
  onMeasurementAdd,
  onCalibrationUpdate,
  selectedMeasurementId,
  onMeasurementSelect,
}: ViewerProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfImageUrl, setPdfImageUrl] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeMeasurementType, setActiveMeasurementType] = useState<MeasurementType | null>(null);
  const [previewPoint, setPreviewPoint] = useState<{ x: number; y: number } | null>(null);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [calibrationDistance, setCalibrationDistance] = useState('');
  const [calibrationUnits, setCalibrationUnits] = useState<Unit>('ft');
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Load image or PDF page
  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      setPdfImageUrl(null);
      setBackgroundImage(null);
      return;
    }

    if (file.type === 'image') {
      setImageUrl(file.url || null);
      setPdfImageUrl(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = file.url || '';
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setBackgroundImage(img);
        // Calculate scale to fit image in container
        const container = containerRef.current;
        if (container) {
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          const initialScale = Math.min(containerWidth / img.width, containerHeight / img.height);
          setScale(initialScale);
          // Stage should be at (0,0) to fill container, image will be centered within Stage coordinates
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
      };
    } else {
      setImageUrl(null);
      setBackgroundImage(null);
      // PDF will be rendered via react-pdf component
    }
  }, [file, activePage]);

  // Convert PDF page canvas to image for Konva
  useEffect(() => {
    if (file?.type === 'pdf' && pdfContainerRef.current) {
      // Wait for PDF to render, then extract canvas
      const timer = setTimeout(() => {
        const canvas = pdfContainerRef.current?.querySelector('canvas');
        if (canvas) {
          const img = new Image();
          img.src = canvas.toDataURL();
          img.onload = () => {
            setImageSize({ width: canvas.width, height: canvas.height });
            setBackgroundImage(img);
            setPdfImageUrl(canvas.toDataURL());
            // Calculate scale to fit image in container, and position to center it
            const container = containerRef.current;
            if (container) {
              const containerWidth = container.clientWidth;
              const containerHeight = container.clientHeight;
              const initialScale = Math.min(containerWidth / canvas.width, containerHeight / canvas.height);
              setScale(initialScale);
              // Stage should be at (0,0) to fill container, image will be centered within Stage coordinates
              setPosition({ x: 0, y: 0 });
            } else {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }
          };
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [file, activePage]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    setScale(clampedScale);
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, []);

  // Finish active measurement
  const finishMeasurement = useCallback(() => {
    if (!activeMeasurementType || currentPoints.length === 0) return;

    if (activeMeasurementType === 'length' && currentPoints.length >= 2) {
      const value = calculateLength(currentPoints, calibration);
      const measurement: Measurement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: `Length ${measurements.filter(m => m.type === 'length').length + 1}`,
        type: 'length',
        value,
        units: calibration?.units || 'ft',
        color: generateColor(measurements.length),
        data: { points: currentPoints },
        pageNumber: activePage,
      };
      onMeasurementAdd(measurement);
      setCurrentPoints([]);
      setActiveMeasurementType(null);
      setIsDrawing(false);
      setPreviewPoint(null);
    } else if (activeMeasurementType === 'area' && currentPoints.length >= 3) {
      // calculateArea uses shoelace formula which automatically closes the polygon
      const value = calculateArea(currentPoints, calibration);
      const measurement: Measurement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: `Area ${measurements.filter(m => m.type === 'area').length + 1}`,
        type: 'area',
        value,
        units: calibration?.units || 'ft',
        color: generateColor(measurements.length),
        data: { points: currentPoints },
        pageNumber: activePage,
      };
      onMeasurementAdd(measurement);
      setCurrentPoints([]);
      setActiveMeasurementType(null);
      setIsDrawing(false);
      setPreviewPoint(null);
    }
  }, [activeMeasurementType, currentPoints, calibration, measurements, activePage, onMeasurementAdd]);

  // Cancel active measurement
  const cancelMeasurement = useCallback(() => {
    if (activeMeasurementType) {
      setCurrentPoints([]);
      setActiveMeasurementType(null);
      setIsDrawing(false);
      setPreviewPoint(null);
    }
  }, [activeMeasurementType]);

  // Check if click is near first point (for closing area polygon)
  const isNearFirstPoint = useCallback((point: { x: number; y: number }, firstPoint: { x: number; y: number }, threshold: number = 10): boolean => {
    const dx = point.x - firstPoint.x;
    const dy = point.y - firstPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= threshold / scale; // Adjust threshold by scale
  }, [scale]);

  // Handle click to add point (only if not dragging)
  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // This is now a fallback - main point addition happens in handleMouseUp
    // Only handle count and calibrate here since they don't need drag detection

    // Allow clicks on background image, stage, and layer, but not on measurement shapes
    // Check if target or any parent is a measurement Group
    let node: any = e.target;
    let isMeasurementShape = false;
    let targetType = '';
    const targetName = node?.name?.();
    const targetClassName = node?.className || '';
    while (node) {
      const nodeName = node.name?.();
      const nodeType = node.getType?.();
      if (nodeName === 'measurement') {
        isMeasurementShape = true;
        targetType = nodeType || 'unknown';
        break;
      }
      node = node.getParent?.();
    }
    
    // Block measurement shapes, allow everything else (Stage, Layer, background image)
    // BUT: Allow clicks on measurement endpoints when starting a new measurement
    if (isMeasurementShape) {
      // Check if we're trying to start a new measurement and clicked on an endpoint (Circle)
      // Note: getType() returns "Shape" for Circle, so we check className instead
      const clickedNode = e.target;
      const clickedNodeType = clickedNode?.getType?.();
      const isEndpointCircle = targetClassName === 'Circle';
      const canStartNewMeasurement = !activeMeasurementType && (activeTool === 'length' || activeTool === 'area');
      if (!canStartNewMeasurement || !isEndpointCircle) {
        return;
      }
      // If we get here, we're clicking on an endpoint circle and want to start a new measurement
      // Use the circle's position as the starting point
      const stage = e.target.getStage();
      if (stage && clickedNode && isEndpointCircle) {
        // Get circle position in stage coordinates
        const circleX = clickedNode.x();
        const circleY = clickedNode.y();
        // Convert to image coordinates
        const scaledWidth = imageSize.width * scale;
        const scaledHeight = imageSize.height * scale;
        const imageX = (stageSize.width - scaledWidth) / 2 / scale;
        const imageY = (stageSize.height - scaledHeight) / 2 / scale;
        const imagePos = {
          x: circleX - imageX,
          y: circleY - imageY,
        };
        if (activeTool === 'length') {
          setCurrentPoints([imagePos]);
          setActiveMeasurementType('length');
          setIsDrawing(true);
        } else if (activeTool === 'area') {
          setCurrentPoints([imagePos]);
          setActiveMeasurementType('area');
          setIsDrawing(true);
        }
        return;
      }
      // Fall through to allow the click to proceed with pointer position
    }

    if (!activeTool || !file) {
      return;
    }

    // Prevent starting a NEW measurement if one is already active for a DIFFERENT tool
    // But allow continuing the same measurement type
    if (activeMeasurementType && activeTool !== activeMeasurementType && activeTool !== 'count' && activeTool !== 'calibrate') {
      return;
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert to image coordinates
    // getPointerPosition() returns coordinates in Stage container (DOM pixels)
    // Stage has scale and position (pan) applied, so we need to convert to stage coordinates first
    // Then account for image offset within stage coordinates
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    const imageX = (stageSize.width - scaledWidth) / 2 / scale;
    const imageY = (stageSize.height - scaledHeight) / 2 / scale;
    // Convert pointer from DOM pixels to stage coordinates (accounting for pan and zoom)
    const stageX = (pointer.x - position.x) / scale;
    const stageY = (pointer.y - position.y) / scale;
    const imagePos = {
      x: stageX - imageX,
      y: stageY - imageY,
    };

    if (activeTool === 'calibrate') {
      setCalibrationPoints((prev) => {
        const newPoints = [...prev, imagePos];
        if (newPoints.length === 2) {
          const dx = newPoints[1].x - newPoints[0].x;
          const dy = newPoints[1].y - newPoints[0].y;
          const pixelDistance = Math.sqrt(dx * dx + dy * dy);
          setShowCalibrationDialog(true);
        }
        return newPoints.length <= 2 ? newPoints : [imagePos];
      });
    } else if (activeTool === 'length') {
      // If no active measurement, start a new one
      if (!activeMeasurementType) {
        setCurrentPoints([imagePos]);
        setActiveMeasurementType('length');
        setIsDrawing(true);
      }
      // Point addition for existing measurements now happens in handleMouseUp
    } else if (activeTool === 'area') {
      // If no active measurement, start a new one
      if (!activeMeasurementType) {
        setCurrentPoints([imagePos]);
        setActiveMeasurementType('area');
        setIsDrawing(true);
      }
      // Point addition for existing measurements now happens in handleMouseUp
    } else if (activeTool === 'count') {
      const measurement: Measurement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: `Count ${measurements.filter(m => m.type === 'count').length + 1}`,
        type: 'count',
        value: 1,
        units: 'ft',
        color: generateColor(measurements.length),
        data: { point: imagePos },
        pageNumber: activePage,
      };
      onMeasurementAdd(measurement);
    }
  }, [activeTool, file, position, scale, measurements, activePage, onMeasurementAdd, imageSize, stageSize, activeMeasurementType, currentPoints, isNearFirstPoint, finishMeasurement, isDragging]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // If mouse is down, check if we're dragging (moved more than threshold)
    // Don't start dragging if we have an active length or area measurement
    if (mouseDownPos && !isDragging && (!activeMeasurementType || activeMeasurementType === null)) {
      const dx = pointer.x - mouseDownPos.x;
      const dy = pointer.y - mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // If moved more than 10 pixels, consider it a drag (increased threshold to avoid interfering with clicks)
      if (distance > 10) {
        // Only start dragging if clicking on stage and no active measurement tool
        if (e.target === e.target.getStage() && (!activeTool || activeTool === 'count' || activeTool === 'calibrate')) {
          setIsDragging(true);
          setDragStart({
            x: pointer.x - position.x,
            y: pointer.y - position.y,
          });
        }
      }
    }

    if (isDragging) {
      setPosition({
        x: pointer.x - dragStart.x,
        y: pointer.y - dragStart.y,
      });
    } else if (activeMeasurementType && (activeMeasurementType === 'length' || activeMeasurementType === 'area')) {
      // Update preview point for active measurement
      const scaledWidth = imageSize.width * scale;
      const scaledHeight = imageSize.height * scale;
      const imageX = (stageSize.width - scaledWidth) / 2 / scale;
      const imageY = (stageSize.height - scaledHeight) / 2 / scale;
      // Convert pointer from DOM pixels to stage coordinates (accounting for pan and zoom)
      const stageX = (pointer.x - position.x) / scale;
      const stageY = (pointer.y - position.y) / scale;
      const imagePos = {
        x: stageX - imageX,
        y: stageY - imageY,
      };
      setPreviewPoint(imagePos);
    } else {
      setPreviewPoint(null);
    }
  }, [isDragging, activeMeasurementType, position, scale, dragStart, imageSize, stageSize, mouseDownPos, activeTool]);

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // For length and area tools, always allow adding points even if there was slight movement
    // Only prevent if we were actually dragging (panning the stage)
    const wasActuallyDragging = isDragging && (!activeMeasurementType || activeMeasurementType === null);
    
    if (wasActuallyDragging) {
      setIsDragging(false);
      setMouseDownPos(null);
      return;
    }
    
    // Reset dragging state if it was set
    if (isDragging) {
      setIsDragging(false);
    }

    // If we weren't dragging and have an active tool, handle clicks
    if (!activeTool || !file) {
      setMouseDownPos(null);
      return;
    }
    
    // If no active measurement exists, start a new one (first click)
    if (!activeMeasurementType && (activeTool === 'length' || activeTool === 'area')) {
      // Check if click was on a measurement shape
      let node: any = e.target;
      let isMeasurementShape = false;
      let clickedNodeType = '';
      const clickedNode = e.target;
      clickedNodeType = clickedNode?.getType?.();
      while (node) {
        const nodeName = node.name?.();
        if (nodeName === 'measurement') {
          isMeasurementShape = true;
          break;
        }
        node = node.getParent?.();
      }
      
      // Allow clicks on endpoint circles (Circles) when starting a new measurement
      // Note: getType() returns "Shape" for Circle, so we check className instead
      const clickedNodeClassName = clickedNode?.className || '';
      const isEndpointCircle = clickedNodeClassName === 'Circle';
      if (isMeasurementShape && !isEndpointCircle) {
        setMouseDownPos(null);
        return;
      }
      // If clicking on endpoint circle, use the circle's position
      if (isMeasurementShape && isEndpointCircle) {
        const stage = e.target.getStage();
        if (stage && clickedNode) {
          // Get circle position in stage coordinates
          const circleX = clickedNode.x();
          const circleY = clickedNode.y();
          // Convert to image coordinates
          const scaledWidth = imageSize.width * scale;
          const scaledHeight = imageSize.height * scale;
          const imageX = (stageSize.width - scaledWidth) / 2 / scale;
          const imageY = (stageSize.height - scaledHeight) / 2 / scale;
          const imagePos = {
            x: circleX - imageX,
            y: circleY - imageY,
          };
          
          if (activeTool === 'length') {
            setCurrentPoints([imagePos]);
            setActiveMeasurementType('length');
            setIsDrawing(true);
          } else if (activeTool === 'area') {
            setCurrentPoints([imagePos]);
            setActiveMeasurementType('area');
            setIsDrawing(true);
          }
          setMouseDownPos(null);
          return;
        }
      }

      const stage = e.target.getStage();
      if (!stage) {
        setMouseDownPos(null);
        return;
      }

      const pointer = stage.getPointerPosition();
      if (!pointer) {
        setMouseDownPos(null);
        return;
      }

      // Convert to image coordinates
      const scaledWidth = imageSize.width * scale;
      const scaledHeight = imageSize.height * scale;
      const imageX = (stageSize.width - scaledWidth) / 2 / scale;
      const imageY = (stageSize.height - scaledHeight) / 2 / scale;
      // Convert pointer from DOM pixels to stage coordinates (accounting for pan and zoom)
      const stageX = (pointer.x - position.x) / scale;
      const stageY = (pointer.y - position.y) / scale;
      const imagePos = {
        x: stageX - imageX,
        y: stageY - imageY,
      };

      if (activeTool === 'length') {
        setCurrentPoints([imagePos]);
        setActiveMeasurementType('length');
        setIsDrawing(true);
      } else if (activeTool === 'area') {
        setCurrentPoints([imagePos]);
        setActiveMeasurementType('area');
        setIsDrawing(true);
      }
      setMouseDownPos(null);
      return;
    }
    
    // If we have an active measurement, add points (subsequent clicks)
    if (!activeMeasurementType) {
      setMouseDownPos(null);
      return;
    }

    // Check if click was on a measurement shape
    let node: any = e.target;
    let isMeasurementShape = false;
    const clickedNode = e.target;
    const clickedNodeType = clickedNode?.getType?.();
    const clickedNodeClassName = clickedNode?.className || '';
    const isEndpointCircle = clickedNodeClassName === 'Circle';
    while (node) {
      const nodeName = node.name?.();
      if (nodeName === 'measurement') {
        isMeasurementShape = true;
        break;
      }
      node = node.getParent?.();
    }
    
    // When adding points to existing measurement, allow endpoint circles but block other measurement shapes
    if (isMeasurementShape && !isEndpointCircle) {
      setMouseDownPos(null);
      return;
    }

    // If clicking on endpoint circle, use the circle's position
    let imagePos: { x: number; y: number };
    if (isMeasurementShape && isEndpointCircle) {
      const stage = e.target.getStage();
      if (stage && clickedNode) {
        // Get circle position in stage coordinates
        const circleX = clickedNode.x();
        const circleY = clickedNode.y();
        // Convert to image coordinates
        const scaledWidth = imageSize.width * scale;
        const scaledHeight = imageSize.height * scale;
        const imageX = (stageSize.width - scaledWidth) / 2 / scale;
        const imageY = (stageSize.height - scaledHeight) / 2 / scale;
        imagePos = {
          x: circleX - imageX,
          y: circleY - imageY,
        };
      } else {
        setMouseDownPos(null);
        return;
      }
    } else {
      const stage = e.target.getStage();
      if (!stage) {
        setMouseDownPos(null);
        return;
      }

      const pointer = stage.getPointerPosition();
      if (!pointer) {
        setMouseDownPos(null);
        return;
      }

      // Convert to image coordinates
      const scaledWidth = imageSize.width * scale;
      const scaledHeight = imageSize.height * scale;
      const imageX = (stageSize.width - scaledWidth) / 2 / scale;
      const imageY = (stageSize.height - scaledHeight) / 2 / scale;
      // Convert pointer from DOM pixels to stage coordinates (accounting for pan and zoom)
      const stageX = (pointer.x - position.x) / scale;
      const stageY = (pointer.y - position.y) / scale;
      imagePos = {
        x: stageX - imageX,
        y: stageY - imageY,
      };
    }

    if (activeTool === 'length' && activeMeasurementType === 'length') {
      const newPoints = [...currentPoints, imagePos];
      setCurrentPoints(newPoints);
      // Length tool: finish automatically after 2 points (start and end)
      if (newPoints.length >= 2) {
        // Finish with the new points - use a callback to ensure we use the updated points
        const value = calculateLength(newPoints, calibration);
        const measurement: Measurement = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: `Length ${measurements.filter(m => m.type === 'length').length + 1}`,
          type: 'length',
          value,
          units: calibration?.units || 'ft',
          color: generateColor(measurements.length),
          data: { points: newPoints },
          pageNumber: activePage,
        };
        onMeasurementAdd(measurement);
        setCurrentPoints([]);
        setActiveMeasurementType(null);
        setIsDrawing(false);
        setPreviewPoint(null);
      }
    } else if (activeTool === 'area' && activeMeasurementType === 'area') {
      if (currentPoints.length >= 3 && isNearFirstPoint(imagePos, currentPoints[0])) {
        // Click near first point - close the polygon
        finishMeasurement();
      } else {
        setCurrentPoints((prev) => {
          const newPoints = [...prev, imagePos];
          return newPoints;
        });
      }
    }

    // Reset mouse down position
    setMouseDownPos(null);
  }, [isDragging, activeTool, file, activeMeasurementType, currentPoints, scale, position, imageSize, stageSize, isNearFirstPoint, finishMeasurement, calibration, measurements, activePage, onMeasurementAdd]);

  // Double-click handler removed - length finishes automatically after 2 points,
  // area closes when clicking near the first point

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && activeMeasurementType) {
        e.preventDefault();
        finishMeasurement();
      } else if (e.key === 'Escape' && activeMeasurementType) {
        e.preventDefault();
        cancelMeasurement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMeasurementType, finishMeasurement, cancelMeasurement]);

  // Reset active measurement when tool changes
  useEffect(() => {
    if (activeTool !== activeMeasurementType && activeTool !== 'calibrate' && activeTool !== 'count') {
      cancelMeasurement();
    }
  }, [activeTool, activeMeasurementType, cancelMeasurement]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Store mouse down position to detect drags
    setMouseDownPos(pointer);

    // Check if click was on a measurement shape
    let node: any = e.target;
    let isMeasurementShape = false;
    while (node) {
      const nodeName = node.name?.();
      if (nodeName === 'measurement') {
        isMeasurementShape = true;
        break;
      }
      node = node.getParent?.();
    }

    // If clicking on measurement shape or no active tool, allow dragging
    // BUT: Don't allow dragging if we have an active length/area measurement
    if ((isMeasurementShape || !activeTool || activeTool === 'count' || activeTool === 'calibrate') && !activeMeasurementType) {
      if (e.target === e.target.getStage() || isMeasurementShape) {
        setIsDragging(true);
        setDragStart({
          x: pointer.x - position.x,
          y: pointer.y - position.y,
        });
      }
      return;
    }
    
    // If we have an active measurement, don't allow dragging - clicks should add points
    // The first click and subsequent clicks are now handled in handleMouseUp
    // This ensures complete clicks (mouseDown + mouseUp) rather than starting on mouseDown
  }, [position, activeTool, activeMeasurementType, scale, imageSize, stageSize]);

  const handleCalibrationSubmit = () => {
    if (calibrationPoints.length === 2 && calibrationDistance) {
      const dx = calibrationPoints[1].x - calibrationPoints[0].x;
      const dy = calibrationPoints[1].y - calibrationPoints[0].y;
      const pixelDistance = Math.sqrt(dx * dx + dy * dy);
      const realDistance = parseFloat(calibrationDistance);

      if (!isNaN(realDistance) && realDistance > 0) {
        const newCalibration: ScaleCalibration = {
          pixelDistance,
          realDistance,
          units: calibrationUnits,
          isCalibrated: true,
        };
        onCalibrationUpdate(newCalibration);
        setCalibrationPoints([]);
        setShowCalibrationDialog(false);
        setCalibrationDistance('');
      }
    }
  };

  const renderMeasurements = () => {
    const pageMeasurements = measurements.filter(m => !m.pageNumber || m.pageNumber === activePage);
    // Calculate image offset for centering
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    const imageX = (stageSize.width - scaledWidth) / 2 / scale;
    const imageY = (stageSize.height - scaledHeight) / 2 / scale;
    
    return pageMeasurements.map((measurement) => {
      const isSelected = selectedMeasurementId === measurement.id;
      const baseStrokeWidth = isSelected ? 3 : 2;
      const strokeWidth = baseStrokeWidth / scale;

      if (measurement.type === 'length' && measurement.data.points) {
        const points = measurement.data.points.flatMap((p: { x: number; y: number }) => [p.x + imageX, p.y + imageY]);
        return (
          <Group key={measurement.id} name="measurement" onClick={() => onMeasurementSelect(measurement.id)}>
            <Line
              points={points}
              stroke={measurement.color}
              strokeWidth={strokeWidth}
              tension={0}
              lineCap="round"
              lineJoin="round"
            />
            {points.length >= 2 && (
              <>
                <Circle
                  x={points[0]}
                  y={points[1]}
                  radius={4 / scale}
                  fill={measurement.color}
                />
                <Circle
                  x={points[points.length - 2]}
                  y={points[points.length - 1]}
                  radius={4 / scale}
                  fill={measurement.color}
                />
              </>
            )}
          </Group>
        );
      } else if (measurement.type === 'area' && measurement.data.points) {
        const points = measurement.data.points.flatMap((p: { x: number; y: number }) => [p.x + imageX, p.y + imageY]);
        return (
          <Group key={measurement.id} name="measurement" onClick={() => onMeasurementSelect(measurement.id)}>
            <Line
              points={[...points, points[0], points[1]]}
              stroke={measurement.color}
              strokeWidth={strokeWidth}
              fill={measurement.color}
              fillOpacity={0.2}
              closed
            />
            {measurement.data.points.map((p: { x: number; y: number }, i: number) => (
              <Circle
                key={i}
                x={p.x + imageX}
                y={p.y + imageY}
                radius={4 / scale}
                fill={measurement.color}
              />
            ))}
          </Group>
        );
      } else if (measurement.type === 'count' && measurement.data.point) {
        const p = measurement.data.point;
        return (
          <Group key={measurement.id} name="measurement" onClick={() => onMeasurementSelect(measurement.id)}>
            <Circle
              x={p.x + imageX}
              y={p.y + imageY}
              radius={8 / scale}
              stroke={measurement.color}
              strokeWidth={strokeWidth}
              fill={measurement.color}
              fillOpacity={0.3}
            />
            <Text
              x={p.x + imageX + 12 / scale}
              y={p.y + imageY - 8 / scale}
              text={measurement.name}
              fontSize={12 / scale}
              fill={measurement.color}
              fontStyle="bold"
            />
          </Group>
        );
      }
      return null;
    });
  };

  // Update stage size when container resizes
  useEffect(() => {
    const updateStageSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        if (width > 0 && height > 0) {
          setStageSize({ width, height });
        }
      }
    };

    // Use multiple attempts to ensure container is rendered
    const attemptUpdate = () => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        updateStageSize();
      } else {
        // Retry if container not ready
        requestAnimationFrame(attemptUpdate);
      }
    };
    
    // Initial measurement - use requestAnimationFrame to ensure container is rendered
    requestAnimationFrame(attemptUpdate);
    
    const resizeObserver = new ResizeObserver(updateStageSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Also observe after a short delay to catch late mounts
    const timeoutId = setTimeout(() => {
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
        updateStageSize();
      }
    }, 100);
    
    window.addEventListener('resize', updateStageSize);
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateStageSize);
    };
  }, []);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-400">
          <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">No drawing selected</p>
          <p className="text-sm mt-2">Upload a PDF or image to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-gray-100 overflow-hidden" ref={containerRef}>
      {/* PDF/Image Viewer - Hidden rendering for PDF (extract canvas only, show in Konva) */}
      {file.type === 'pdf' && (
        <div ref={pdfContainerRef} className="absolute inset-0 flex items-center justify-center opacity-0" style={{ zIndex: 1, pointerEvents: 'none' }}>
          <Document
            file={file.file}
            onLoadSuccess={({ numPages }) => setPdfPageCount(numPages)}
            loading={<div className="text-gray-400">Loading PDF...</div>}
          >
            <Page
              pageNumber={activePage}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              scale={2}
            />
          </Document>
        </div>
      )}
      {file.type === 'image' && imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1, pointerEvents: 'none' }}>
          <img
            src={imageUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` }}
          />
        </div>
      )}

      {/* Canvas Overlay - Must be on top to receive all events */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'auto', width: '100%', height: '100%' }}>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          onWheel={handleWheel}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          style={{ cursor: activeTool ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}
        >
        <Layer listening={true} clipFunc={undefined}>
          {/* Background image - show for both PDF and images in Konva for coordinate matching */}
          {backgroundImage && imageSize.width > 0 && (() => {
            // Center the image within the Stage coordinate space
            // Calculate in stage coordinates (after scale transform)
            const scaledWidth = imageSize.width * scale;
            const scaledHeight = imageSize.height * scale;
            // Convert back to image coordinates (before scale transform)
            const imageX = (stageSize.width / scale - imageSize.width) / 2;
            const imageY = (stageSize.height / scale - imageSize.height) / 2;
            return (
              <KonvaImage
                image={backgroundImage}
                x={imageX}
                y={imageY}
                width={imageSize.width}
                height={imageSize.height}
                name="background"
                listening={false}
              />
            );
          })()}
          {/* Calibration line preview */}
          {calibrationPoints.length > 0 && (() => {
            const scaledWidth = imageSize.width * scale;
            const scaledHeight = imageSize.height * scale;
            const imageX = (stageSize.width - scaledWidth) / 2 / scale;
            const imageY = (stageSize.height - scaledHeight) / 2 / scale;
            return (
              <>
                {calibrationPoints.map((p, i) => (
                  <Circle
                    key={i}
                    x={p.x + imageX}
                    y={p.y + imageY}
                    radius={6 / scale}
                    fill="red"
                    stroke="white"
                    strokeWidth={2 / scale}
                  />
                ))}
                {calibrationPoints.length === 2 && (
                  <Line
                    points={[
                      calibrationPoints[0].x + imageX,
                      calibrationPoints[0].y + imageY,
                      calibrationPoints[1].x + imageX,
                      calibrationPoints[1].y + imageY,
                    ]}
                    stroke="red"
                    strokeWidth={2 / scale}
                    dash={[5 / scale, 5 / scale]}
                  />
                )}
              </>
            );
          })()}

          {/* Current drawing preview */}
          {currentPoints.length > 0 && (() => {
            const radius = scale > 0 ? 4 / scale : 4;
            const strokeWidth = scale > 0 ? 2 / scale : 2;
            const dashSize = scale > 0 ? 5 / scale : 5;
            const scaledWidth = imageSize.width * scale;
            const scaledHeight = imageSize.height * scale;
            const imageX = (stageSize.width - scaledWidth) / 2 / scale;
            const imageY = (stageSize.height - scaledHeight) / 2 / scale;
            const allPoints = previewPoint ? [...currentPoints, previewPoint] : currentPoints;
            
            return (
              <>
                {currentPoints.map((p, i) => {
                  return (
                    <Circle
                      key={i}
                      x={p.x + imageX}
                      y={p.y + imageY}
                      radius={radius}
                      fill="blue"
                      stroke="white"
                      strokeWidth={strokeWidth * 0.3}
                      listening={false}
                      opacity={1}
                    />
                  );
                })}
                {previewPoint && (
                  <Circle
                    x={previewPoint.x + imageX}
                    y={previewPoint.y + imageY}
                    radius={radius}
                    fill="blue"
                    stroke="white"
                    strokeWidth={strokeWidth * 0.3}
                    listening={false}
                    opacity={0.5}
                  />
                )}
                {allPoints.length > 1 && (
                  <Line
                    points={allPoints.flatMap(p => [p.x + imageX, p.y + imageY])}
                    stroke="blue"
                    strokeWidth={strokeWidth}
                    dash={[dashSize, dashSize]}
                    listening={false}
                    opacity={1}
                    lineCap="round"
                    lineJoin="round"
                    closed={activeMeasurementType === 'area' && currentPoints.length >= 3 && previewPoint ? isNearFirstPoint(previewPoint, currentPoints[0]) : false}
                  />
                )}
                {/* Show closing indicator for area tool */}
                {activeMeasurementType === 'area' && currentPoints.length >= 3 && previewPoint && isNearFirstPoint(previewPoint, currentPoints[0]) && (
                  <Circle
                    x={currentPoints[0].x + imageX}
                    y={currentPoints[0].y + imageY}
                    radius={radius * 1.5}
                    fill="green"
                    stroke="white"
                    strokeWidth={strokeWidth * 0.5}
                    listening={false}
                    opacity={0.7}
                  />
                )}
              </>
            );
          })()}

          {/* Saved measurements */}
          {renderMeasurements()}
        </Layer>
      </Stage>
      </div>

      {/* Page Navigation (for PDFs) */}
      {file.type === 'pdf' && pdfPageCount > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-3" style={{ zIndex: 20 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(Math.max(1, activePage - 1));
            }}
            disabled={activePage === 1}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="text-sm font-medium">
            Page {activePage} of {pdfPageCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(Math.min(pdfPageCount, activePage + 1));
            }}
            disabled={activePage === pdfPageCount}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}

      {/* Calibration Dialog */}
      {showCalibrationDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Calibrate Scale</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the real-world distance between the two points you selected.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance
                </label>
                <input
                  type="number"
                  value={calibrationDistance}
                  onChange={(e) => setCalibrationDistance(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter distance"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Units
                </label>
                <select
                  value={calibrationUnits}
                  onChange={(e) => setCalibrationUnits(e.target.value as Unit)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="ft">Feet</option>
                  <option value="in">Inches</option>
                  <option value="m">Meters</option>
                  <option value="cm">Centimeters</option>
                  <option value="mm">Millimeters</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCalibrationSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Calibrate
              </button>
              <button
                onClick={() => {
                  setShowCalibrationDialog(false);
                  setCalibrationPoints([]);
                  setCalibrationDistance('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scale indicator */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 text-sm">
        <div>Zoom: {(scale * 100).toFixed(0)}%</div>
        {calibration?.isCalibrated && (
          <div className="text-xs text-green-600 mt-1">✓ Calibrated</div>
        )}
      </div>
    </div>
  );
}

