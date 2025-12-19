'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { UploadedFile, Measurement, MeasurementType, ScaleCalibration, Unit } from '@/types';
import { calculateLength, calculateArea } from '@/utils/measurements';
import { getCategoryColor, getToolColor } from '@/utils/categories';
import { calculateImageOffset, pointerToImageCoordinates } from '@/utils/coordinates';
import { updateSelectionWithModifiers } from '@/utils/selection';
import { pointInRect, lineIntersectsRect, linesIntersect, getBoundingBox, rectsIntersect, isPointNear } from '@/utils/geometry';
import { CANVAS, PERFORMANCE, STORAGE, MEASUREMENT } from '@/utils/constants';
import { throttleRAF } from '@/utils/throttle';
import { ChevronLeft, ChevronRight, CheckCircle, FileText, X, Maximize2 } from 'lucide-react';
import ContextMenu from './ContextMenu';

// Convert hex color to RGBA with specified opacity
const hexToRgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

// Helper function to check if a Konva node is a measurement shape
const isMeasurementNode = (node: any): { isMeasurement: boolean; measurementId: string | null } => {
  let current: any = node;
  while (current) {
    const nodeName = current.name?.();
    if (nodeName === 'measurement') {
      return {
        isMeasurement: true,
        measurementId: current.id() || null,
      };
    }
    current = current.getParent?.();
  }
  return { isMeasurement: false, measurementId: null };
};

// Geometry helpers are now imported from utils/geometry.ts

interface ViewerProps {
  file: UploadedFile | null;
  activePage: number;
  onPageChange: (page: number) => void;
  activeTool: MeasurementType | 'calibrate' | 'select' | 'pan' | null;
  measurements: Measurement[];
  calibration: ScaleCalibration | null;
  onMeasurementAdd: (measurement: Measurement) => void;
  onMeasurementUpdate?: (id: string, updates: Partial<Measurement>) => void;
  onCalibrationUpdate: (calibration: ScaleCalibration) => void;
  selectedMeasurementIds: Set<string>;
  onMeasurementSelect: (ids: Set<string>) => void;
  onMeasurementDelete?: (ids: Set<string>) => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  defaultColor?: string;
  defaultCategory?: string;
  defaultType?: MeasurementType | null;
  isDialogOpen?: boolean; // Prevents deletion when dialog is open
}

export default function Viewer({
  file,
  activePage,
  onPageChange,
  activeTool,
  measurements,
  calibration,
  onMeasurementAdd,
  onMeasurementUpdate,
  onCalibrationUpdate,
  selectedMeasurementIds,
  onMeasurementSelect,
  onMeasurementDelete,
  onGroup,
  onUngroup,
  defaultColor,
  defaultCategory,
  defaultType,
  isDialogOpen = false,
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
  // Multi-select state
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingSelectionRect = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const justCompletedSelectionRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  // Ref for selection rectangle node to update directly during drag (avoids React re-renders)
  const selectionRectRef = useRef<Konva.Rect | null>(null);
  // Track if we're currently dragging selection to prevent measurement re-renders
  const isDraggingSelectionRef = useRef(false);
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  // Track right-click to prevent onClick from clearing selection
  const isRightClickRef = useRef(false);
  // Ref to track current selection count for context menu handler (avoids stale closure)
  const selectedCountRef = useRef(0);

  // Calculate image offset within stage coordinates (memoized for performance)
  const imageOffset = useMemo(() => {
    return calculateImageOffset(stageSize, imageSize, scale);
  }, [stageSize, imageSize, scale]);

  // Helper function to convert pointer to image coordinates
  const getImageCoordinatesFromPointer = useCallback((
    pointerX: number,
    pointerY: number
  ): { x: number; y: number } => {
    return pointerToImageCoordinates(
      pointerX,
      pointerY,
      position,
      scale,
      imageOffset
    );
  }, [position, scale, imageOffset]);

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
      }, STORAGE.PDF_CANVAS_EXTRACTION_DELAY);
      return () => clearTimeout(timer);
    }
  }, [file, activePage]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Cursor-anchored zoom: Calculate the point in IMAGE coordinates under the cursor
    // Step 1: Convert pointer to stage coordinates (accounting for pan and zoom)
    const stageX = (pointer.x - position.x) / oldScale;
    const stageY = (pointer.y - position.y) / oldScale;
    // Step 2: Convert stage coordinates to image coordinates (accounting for imageOffset)
    const mousePointTo = {
      x: stageX - imageOffset.x,
      y: stageY - imageOffset.y,
    };

    // Calculate new scale (zoom in/out)
    const newScale = e.evt.deltaY > 0 ? oldScale * CANVAS.ZOOM_FACTOR_OUT : oldScale * CANVAS.ZOOM_FACTOR_IN;
    const clampedScale = Math.max(CANVAS.MIN_SCALE, Math.min(CANVAS.MAX_SCALE, newScale));

    // Adjust position so the same point stays under the cursor
    // Calculate what imageOffset will be with the new scale (CRITICAL: use new scale, not old!)
    const newImageOffset = calculateImageOffset(stageSize, imageSize, clampedScale);
    // Step 1: Convert image coordinates back to stage coordinates with new scale
    const newStageX = mousePointTo.x + newImageOffset.x;
    const newStageY = mousePointTo.y + newImageOffset.y;
    // Step 2: Calculate new position to keep the point under cursor
    // newPosition = pointer - (stageCoords * newScale)
    const newPosition = {
      x: pointer.x - newStageX * clampedScale,
      y: pointer.y - newStageY * clampedScale,
    };

    setScale(clampedScale);
    setPosition(newPosition);
  }, [scale, position, imageOffset, imageSize, stageSize]);

  // Fit page to view
  const handleFitToView = useCallback(() => {
    if (!file || imageSize.width === 0 || imageSize.height === 0 || stageSize.width === 0 || stageSize.height === 0) return;
    
    // Calculate fit scale: min of width and height ratios to fit both dimensions
    // This ensures the page fits fully inside the viewport (both width and height)
    const scaleFit = Math.min(
      stageSize.width / imageSize.width,
      stageSize.height / imageSize.height
    );
    
    // Clamp to reasonable bounds (allow fit even if below current min zoom)
    const clampedScale = Math.max(CANVAS.MIN_SCALE, Math.min(CANVAS.MAX_SCALE, scaleFit));
    
    // Set scale and reset position to center the page
    setScale(clampedScale);
    setPosition({ x: 0, y: 0 });
  }, [file, imageSize, stageSize]);

  // Finish active measurement
  const finishMeasurement = useCallback(() => {
    if (!activeMeasurementType || currentPoints.length === 0) return;

    if (activeMeasurementType === 'length' && currentPoints.length >= 2) {
      const value = calculateLength(currentPoints, calibration);
      const measurement: Measurement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: `Linear ${measurements.filter(m => m.type === 'length').length + 1}`,
        type: 'length',
        value,
        units: calibration?.units || 'ft',
        color: getToolColor('length'),
        category: defaultCategory || undefined,
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
        name: `Surface ${measurements.filter(m => m.type === 'area').length + 1}`,
        type: 'area',
        value,
        units: calibration?.units || 'ft',
        color: getToolColor('area'),
        category: defaultCategory || undefined,
        data: { points: currentPoints },
        pageNumber: activePage,
      };
      onMeasurementAdd(measurement);
      setCurrentPoints([]);
      setActiveMeasurementType(null);
      setIsDrawing(false);
      setPreviewPoint(null);
    }
  }, [activeMeasurementType, currentPoints, calibration, measurements, activePage, onMeasurementAdd, defaultColor, defaultCategory]);

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
  const isNearFirstPoint = useCallback((point: { x: number; y: number }, firstPoint: { x: number; y: number }, threshold: number = CANVAS.CLOSE_POLYGON_THRESHOLD): boolean => {
    return isPointNear(point, firstPoint, threshold / scale); // Adjust threshold by scale
  }, [scale]);

  // Get measurements that intersect with selection rectangle
  const getMeasurementsInRect = useCallback((rect: { x: number; y: number; width: number; height: number }, imageX: number, imageY: number): string[] => {
    // Normalize rectangle (handle negative width/height)
    // NOTE: rect is in image coordinates (relative to image origin)
    // Measurements are also stored in image coordinates
    // We should compare them in the same coordinate system (image coordinates)
    const normalizedRect = {
      x: Math.min(rect.x, rect.x + rect.width),
      y: Math.min(rect.y, rect.y + rect.height),
      width: Math.abs(rect.width),
      height: Math.abs(rect.height),
    };
    
    const pageMeasurements = measurements.filter(m => !m.pageNumber || m.pageNumber === activePage);
    const selectedIds: string[] = [];
    
    for (const measurement of pageMeasurements) {
      let isSelected = false;
      
      if (measurement.type === 'length' && measurement.data.points) {
        // Measurements are stored in image coordinates, rect is also in image coordinates
        // Compare them in the same coordinate system (don't add imageX/imageY)
        const points = measurement.data.points.map((p: { x: number; y: number }) => ({
          x: p.x,  // Keep in image coordinates
          y: p.y,  // Keep in image coordinates
        }));
        // Check if any endpoint is inside or line intersects
        for (let i = 0; i < points.length - 1; i++) {
          if (pointInRect(points[i], normalizedRect) || pointInRect(points[i + 1], normalizedRect) || 
              lineIntersectsRect(points[i], points[i + 1], normalizedRect)) {
            isSelected = true;
            break;
          }
        }
      } else if (measurement.type === 'area' && measurement.data.points) {
        // Measurements are stored in image coordinates, rect is also in image coordinates
        // Compare them in the same coordinate system (don't add imageX/imageY)
        const points = measurement.data.points.map((p: { x: number; y: number }) => ({
          x: p.x,  // Keep in image coordinates
          y: p.y,  // Keep in image coordinates
        }));
        
        // Check if any vertex is inside
        for (const p of points) {
          if (pointInRect(p, normalizedRect)) {
            isSelected = true;
            break;
          }
        }
        
        // Check if bounding box intersects
        if (!isSelected) {
          const bbox = getBoundingBox(points);
          if (rectsIntersect(bbox, normalizedRect)) {
            isSelected = true;
          }
        }
      } else if (measurement.type === 'count' && measurement.data.point) {
        const p = measurement.data.point;
        // Measurements are stored in image coordinates, rect is also in image coordinates
        // Compare them in the same coordinate system (don't add imageX/imageY)
        const bbox = {
          x: p.x - CANVAS.COUNT_SIZE / 2 / scale,  // Keep in image coordinates
          y: p.y - CANVAS.COUNT_SIZE / 2 / scale,  // Keep in image coordinates
          width: CANVAS.COUNT_SIZE / scale,
          height: CANVAS.COUNT_SIZE / scale,
        };
        if (rectsIntersect(bbox, normalizedRect)) {
          isSelected = true;
        }
      }
      
      if (isSelected) {
        selectedIds.push(measurement.id);
      }
    }
    
    return selectedIds;
  }, [measurements, activePage, scale]);

  // Handle click to add point (only if not dragging)
  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Don't handle clicks if it was a right-click (context menu should handle it)
    if (isRightClickRef.current || e.evt.button === 2) {
      isRightClickRef.current = false;
      return;
    }
    
    // Handle select mode
    if (activeTool === 'select') {
      // If we're currently selecting AND the rectangle is visible (drag occurred), ignore click
      // The selection will be finalized in handleMouseUp
      // BUT: If rectangle is NOT visible (no drag occurred), allow click to proceed to clear selection
      const wasActuallyDragging = selectionRectRef.current?.visible() || false;
      if ((isSelecting || selectionRect) && wasActuallyDragging) {
        return;
      }
      // If we have stale state from a click without drag, clear it now
      if ((isSelecting || selectionRect) && !wasActuallyDragging) {
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionRect(null);
        if (selectionRectRef.current) {
          selectionRectRef.current.visible(false);
        }
      }
      
      // If we just completed a selection rectangle, don't clear it
      if (justCompletedSelectionRef.current) {
        return;
      }
      
      // Check if click was on a measurement shape
      const { isMeasurement: isMeasurementShape, measurementId } = isMeasurementNode(e.target);
      
      if (isMeasurementShape && measurementId) {
        // Update selection based on modifier keys
        const newSelection = updateSelectionWithModifiers(
          selectedMeasurementIds,
          measurementId,
          e.evt.shiftKey,
          e.evt.ctrlKey,
          e.evt.metaKey
        );
        onMeasurementSelect(newSelection);
      } else {
        // Click on empty space - clear selection unless Shift is held
        if (!e.evt.shiftKey) {
          onMeasurementSelect(new Set());
        }
      }
      return;
    }

    // This is now a fallback - main point addition happens in handleMouseUp
    // Only handle count and calibrate here since they don't need drag detection

    // Allow clicks on background image, stage, and layer, but not on measurement shapes
    // Check if target or any parent is a measurement Group
    const { isMeasurement: isMeasurementShape } = isMeasurementNode(e.target);
    const clickedNode = e.target;
    const targetClassName = clickedNode?.className || '';
    
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
        // Get circle position in stage coordinates, convert to image coordinates
        const circleX = clickedNode.x();
        const circleY = clickedNode.y();
        const imagePos = {
          x: circleX - imageOffset.x,
          y: circleY - imageOffset.y,
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

    // Prevent drawing in select mode
    if (activeTool === 'select') {
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
    const imagePos = getImageCoordinatesFromPointer(pointer.x, pointer.y);

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
      // Use defaultCategory if provided, otherwise no category (undefined)
      const category: string | undefined = defaultCategory || undefined;
      
      // Default name
      const existingCounts = measurements.filter(m => m.type === 'count');
      const countNumber = existingCounts.length + 1;
      const defaultName = `Count ${countNumber}`;
      
      const measurement: Measurement = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: defaultName,
        type: 'count',
        value: 1,
        units: 'ft',
        color: getToolColor('count'),
        category: category,
        data: { point: imagePos },
        pageNumber: activePage,
      };
      onMeasurementAdd(measurement);
    }
  }, [activeTool, file, imageOffset, getImageCoordinatesFromPointer, measurements, activePage, onMeasurementAdd, activeMeasurementType, currentPoints, isNearFirstPoint, finishMeasurement, isDragging, isSelecting, selectedMeasurementIds, onMeasurementSelect, justCompletedSelectionRef, selectionRect, defaultCategory]);

  // Handle right-click to show context menu
  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Only show context menu if measurements are selected
    if (selectedMeasurementIds.size === 0 || !onGroup || !onUngroup) {
      return;
    }

    e.evt.preventDefault();
    e.evt.stopPropagation();

    // Get the pointer position in viewport coordinates
    const pointer = e.target.getStage()?.getPointerPosition();
    if (!pointer) return;

    // Get the container's bounding rect to convert stage coordinates to viewport coordinates
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const viewportX = containerRect.left + pointer.x;
    const viewportY = containerRect.top + pointer.y;

    setContextMenu({ x: viewportX, y: viewportY });
  }, [selectedMeasurementIds, onGroup, onUngroup]);

  // Throttled preview point update to reduce re-renders
  const updatePreviewPointThrottled = useMemo(
    () => throttleRAF((imagePos: { x: number; y: number }) => {
      setPreviewPoint(imagePos);
    }),
    []
  );

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Handle pan tool - allow dragging when pan is active (no throttling needed for smooth pan)
    if (activeTool === 'pan' && isDragging) {
      setPosition({
        x: pointer.x - dragStart.x,
        y: pointer.y - dragStart.y,
      });
      // Prevent default to avoid text selection and other browser behaviors during pan
      e.evt.preventDefault();
      return;
    }

    // Handle selection rectangle update in select mode
    if (activeTool === 'select' && isSelecting && selectionStart) {
      const imagePos = getImageCoordinatesFromPointer(pointer.x, pointer.y);
      
      // Calculate distance from selection start to determine if drag threshold is exceeded
      const dx = imagePos.x - selectionStart.x;
      const dy = imagePos.y - selectionStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const rect = {
        x: Math.min(selectionStart.x, imagePos.x),
        y: Math.min(selectionStart.y, imagePos.y),
        width: Math.abs(imagePos.x - selectionStart.x),
        height: Math.abs(imagePos.y - selectionStart.y),
      };
      
      // Only show rectangle if drag threshold is exceeded
      const shouldShow = distance > CANVAS.DRAG_THRESHOLD;
      
      // Update selection rectangle directly via Konva ref to avoid React re-renders during drag
      // This prevents expensive measurement re-renders while dragging
      // The rect should already exist from handleStageMouseDown, but if ref isn't set yet,
      // we'll update state once (acceptable - only happens on very first mousemove)
      if (selectionRectRef.current) {
        // Direct Konva update - no React re-render!
        selectionRectRef.current.x(rect.x + imageOffset.x);
        selectionRectRef.current.y(rect.y + imageOffset.y);
        selectionRectRef.current.width(rect.width);
        selectionRectRef.current.height(rect.height);
        // CRITICAL: Only show rectangle if drag threshold is exceeded
        selectionRectRef.current.visible(shouldShow);
        // Force redraw of the layer without React re-render
        selectionRectRef.current.getLayer()?.batchDraw();
      } else {
        // Fallback: ref not set yet (shouldn't happen, but safe fallback)
        // This will cause one re-render, but only on the very first mousemove
        setSelectionRect(rect);
      }
      
      // Mark that we're dragging selection (used for potential future optimizations)
      isDraggingSelectionRef.current = true;
      
      // Store rect for use in mouseup (hit-testing happens only on mouseup)
      pendingSelectionRect.current = rect;
      return;
    }

    // ONLY allow dragging to start for pan tool - strict check
    // No other tool may trigger panning
    if (activeTool === 'pan' && mouseDownPos && !isDragging) {
      const dx = pointer.x - mouseDownPos.x;
      const dy = pointer.y - mouseDownPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // If moved more than threshold, consider it a drag (increased threshold to avoid interfering with clicks)
      if (distance > CANVAS.PAN_DRAG_THRESHOLD) {
        setIsDragging(true);
        setDragStart({
          x: pointer.x - position.x,
          y: pointer.y - position.y,
        });
      }
    }

    // Pan tool dragging is already handled above (line 716-722)
    // No other tools should trigger panning - removed legacy fallback panning
    if (activeMeasurementType && (activeMeasurementType === 'length' || activeMeasurementType === 'area')) {
      // Update preview point for active measurement (throttled to reduce re-renders)
      const imagePos = getImageCoordinatesFromPointer(pointer.x, pointer.y);
      updatePreviewPointThrottled(imagePos);
    } else {
      setPreviewPoint(null);
    }
  }, [isDragging, activeMeasurementType, position, dragStart, mouseDownPos, activeTool, isSelecting, selectionStart, getImageCoordinatesFromPointer, imageOffset, updatePreviewPointThrottled]);

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Don't handle mouseup if it was a right-click (context menu should handle it)
    if (isRightClickRef.current || e.evt.button === 2) {
      // Reset selection state if we were in the middle of a selection rectangle
      if (isSelecting) {
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionRect(null);
        isDraggingSelectionRef.current = false;
        // Cancel any pending RAF updates
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        pendingSelectionRect.current = null;
        // Hide selection rectangle - explicit ref control
        if (selectionRectRef.current) {
          selectionRectRef.current.visible(false);
          selectionRectRef.current.getLayer()?.batchDraw();
        }
      }
      isRightClickRef.current = false;
      setMouseDownPos(null);
      return;
    }
    
    // Handle selection rectangle completion in select mode
    if (activeTool === 'select' && isSelecting && selectionStart) {
      // Use pendingSelectionRect if available (from drag), otherwise use selectionRect state
      const finalRect = pendingSelectionRect.current || selectionRect;
      
      // Only process selection if rectangle was actually shown (drag threshold exceeded)
      // If user just clicked without dragging, clear everything and return
      const wasActuallyDragging = selectionRectRef.current?.visible() || false;
      
      if (finalRect && wasActuallyDragging) {
        // Get measurements in selection rectangle (ONLY compute intersections on mouseup)
        const selectedIds = getMeasurementsInRect(finalRect, imageOffset.x, imageOffset.y);
        
        // Update selection based on Shift key
        const newSelection = new Set(selectedMeasurementIds);
        if (e.evt.shiftKey) {
          // Add to existing selection
          selectedIds.forEach(id => newSelection.add(id));
        } else {
          // Replace selection
          newSelection.clear();
          selectedIds.forEach(id => newSelection.add(id));
        }
        onMeasurementSelect(newSelection);
        
        // Mark that we just completed a selection to prevent handleClick from clearing it
        justCompletedSelectionRef.current = true;
        // Reset the flag after a short delay to allow handleClick to check it
        setTimeout(() => {
          justCompletedSelectionRef.current = false;
        }, 100);
      } else {
        // User clicked without dragging (threshold not exceeded) - just clear everything
      }
      
      // Reset selection state (always, whether drag happened or not)
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionRect(null);
      setMouseDownPos(null);
      isDraggingSelectionRef.current = false;
      // Cancel any pending RAF updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingSelectionRect.current = null;
      // Hide selection rectangle
      // CRITICAL: This explicit ref update is the ONLY way visibility should be cleared
      if (selectionRectRef.current) {
        selectionRectRef.current.visible(false);
        selectionRectRef.current.getLayer()?.batchDraw();
      }
      // Prevent click event from firing
      e.evt.preventDefault();
      e.evt.stopPropagation();
      return;
    }
    
    // For length and area tools, always allow adding points even if there was slight movement
    // Only prevent if we were actually panning (dragging with pan tool active)
    const wasActuallyPanning = activeTool === 'pan' && isDragging && (!activeMeasurementType || activeMeasurementType === null);
    
    if (wasActuallyPanning) {
      setIsDragging(false);
      setMouseDownPos(null);
      return;
    }
    
    // Reset dragging state if it was set (only pan tool should set this)
    if (isDragging && activeTool === 'pan') {
      setIsDragging(false);
    }

    // If we weren't dragging and have an active tool, handle clicks
    if (!activeTool || !file) {
      setMouseDownPos(null);
      return;
    }
    
    // Prevent drawing in select mode
    // Also prevent clearing selections on empty space clicks in select mode
    if (activeTool === 'select') {
      setMouseDownPos(null);
      return;
    }
    
    // If no active measurement exists, start a new one (first click)
    if (!activeMeasurementType && (activeTool === 'length' || activeTool === 'area')) {
      // Check if click was on a measurement shape
      const { isMeasurement: isMeasurementShape } = isMeasurementNode(e.target);
      const clickedNode = e.target;
      
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
          // Get circle position in stage coordinates, convert to image coordinates
          const circleX = clickedNode.x();
          const circleY = clickedNode.y();
          const imagePos = {
            x: circleX - imageOffset.x,
            y: circleY - imageOffset.y,
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
      const imagePos = getImageCoordinatesFromPointer(pointer.x, pointer.y);

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
    const { isMeasurement: isMeasurementShape } = isMeasurementNode(e.target);
    const clickedNode = e.target;
    const clickedNodeClassName = clickedNode?.className || '';
    const isEndpointCircle = clickedNodeClassName === 'Circle';
    
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
        // Get circle position in stage coordinates, convert to image coordinates
        const circleX = clickedNode.x();
        const circleY = clickedNode.y();
        imagePos = {
          x: circleX - imageOffset.x,
          y: circleY - imageOffset.y,
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
      imagePos = getImageCoordinatesFromPointer(pointer.x, pointer.y);
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
          name: `Linear ${measurements.filter(m => m.type === 'length').length + 1}`,
          type: 'length',
          value,
          units: calibration?.units || 'ft',
          color: getToolColor('length'),
          category: defaultCategory || undefined,
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
  }, [isDragging, activeTool, file, activeMeasurementType, currentPoints, imageOffset, getImageCoordinatesFromPointer, isNearFirstPoint, finishMeasurement, calibration, measurements, activePage, onMeasurementAdd, isSelecting, selectionRect, selectionStart, getMeasurementsInRect, selectedMeasurementIds, onMeasurementSelect]);

  // Double-click handler removed - length finishes automatically after 2 points,
  // area closes when clicking near the first point

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: Clear selection or cancel measurement
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeMeasurementType) {
          cancelMeasurement();
        } else if (selectedMeasurementIds.size > 0) {
          onMeasurementSelect(new Set());
        }
      }
      // Ctrl/Cmd+A: Select all measurements on current page
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (activeTool === 'select') {
          const pageMeasurements = measurements.filter(m => !m.pageNumber || m.pageNumber === activePage);
          const allIds = new Set(pageMeasurements.map(m => m.id));
          onMeasurementSelect(allIds);
        }
      }
      // Enter: Finish active measurement
      else if (e.key === 'Enter' && activeMeasurementType) {
        e.preventDefault();
        finishMeasurement();
      }
      // Delete: Delete selected measurements (Backspace disabled to prevent accidental deletion)
      // Also disabled when dialog is open to prevent accidental deletion
      else if (e.key === 'Delete' && selectedMeasurementIds.size > 0 && onMeasurementDelete && !isDialogOpen) {
        e.preventDefault();
        // Only delete if not currently drawing a measurement
        if (!activeMeasurementType) {
          onMeasurementDelete(selectedMeasurementIds);
          // Clear selection after deletion
          onMeasurementSelect(new Set());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMeasurementType, finishMeasurement, cancelMeasurement, selectedMeasurementIds, onMeasurementSelect, activeTool, measurements, activePage, onMeasurementDelete, isDialogOpen]);

  // Reset active measurement when tool changes
  useEffect(() => {
    // Cancel measurement drafts when tool changes away from the measurement tool
    if (activeTool !== activeMeasurementType && activeTool !== 'calibrate' && activeTool !== 'count' && activeTool !== 'select' && activeTool !== 'pan') {
      cancelMeasurement();
    }
    
    // Clear calibration draft when tool changes away from calibrate
    if (activeTool !== 'calibrate' && calibrationPoints.length > 0) {
      setCalibrationPoints([]);
    }
    
    // Clear selection rectangle when leaving select mode
    if (activeTool !== 'select') {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionRect(null);
      isDraggingSelectionRef.current = false;
      // Cancel any pending RAF updates
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingSelectionRect.current = null;
      // Hide selection rectangle - explicit ref control
      if (selectionRectRef.current) {
        selectionRectRef.current.visible(false);
        selectionRectRef.current.getLayer()?.batchDraw();
      }
    }
    
    // Clear dragging state when pan tool is deactivated
    if (activeTool !== 'pan' && isDragging) {
      setIsDragging(false);
      setMouseDownPos(null);
    }
  }, [activeTool, activeMeasurementType, cancelMeasurement, isDragging, calibrationPoints.length]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Don't start selection rectangle or other actions on right-click
    if (e.evt.button === 2 || isRightClickRef.current) {
      return;
    }
    
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Handle select mode - start selection rectangle
    if (activeTool === 'select') {
      // Check if click was on a measurement shape
      const { isMeasurement: isMeasurementShape } = isMeasurementNode(e.target);
      
      // If clicking on empty space, start selection rectangle
      if (!isMeasurementShape && e.target === e.target.getStage()) {
        const imagePos = getImageCoordinatesFromPointer(pointer.x, pointer.y);
        
        setIsSelecting(true);
        setSelectionStart(imagePos);
        setSelectionRect({ x: imagePos.x, y: imagePos.y, width: 0, height: 0 });
        isDraggingSelectionRef.current = false; // Will be set to true on first mousemove after threshold
        pendingSelectionRect.current = null;
        // CRITICAL: Do NOT show rectangle on mousedown - only show after drag threshold is exceeded
        // This prevents ghost rectangles on simple clicks without dragging
        // Rectangle will be shown in handleMouseMove only after movement > threshold
        if (selectionRectRef.current) {
          // Initialize position but keep hidden until drag threshold is exceeded
          selectionRectRef.current.x(imagePos.x + imageOffset.x);
          selectionRectRef.current.y(imagePos.y + imageOffset.y);
          selectionRectRef.current.width(0);
          selectionRectRef.current.height(0);
          selectionRectRef.current.visible(false); // Start hidden - only show after drag threshold
          selectionRectRef.current.getLayer()?.batchDraw();
        }
      }
      // If clicking on measurement, selection is handled in handleClick
      return;
    }

    // Store mouse down position to detect drags
    setMouseDownPos(pointer);

    // Check if click was on a measurement shape
    const { isMeasurement: isMeasurementShape } = isMeasurementNode(e.target);

    // Pan tool: ONLY allow dragging when pan is active
    if (activeTool === 'pan') {
      setIsDragging(true);
      setDragStart({
        x: pointer.x - position.x,
        y: pointer.y - position.y,
      });
      // Prevent default to avoid text selection and other browser behaviors
      e.evt.preventDefault();
      e.evt.stopPropagation();
      return;
    }
    
    // For all other tools, do NOT allow panning
    // Tools like count, scale, length, area should handle their own drag behavior
    // If we have an active measurement, don't allow dragging - clicks should add points
    // The first click and subsequent clicks are now handled in handleMouseUp
    // This ensures complete clicks (mouseDown + mouseUp) rather than starting on mouseDown
  }, [position, activeTool, activeMeasurementType, getImageCoordinatesFromPointer]);

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

  // Create stable selection hash for memoization (only changes when selection actually changes)
  const selectionHash = useMemo(() => {
    // Use size + sorted IDs for stable comparison
    const sortedIds = Array.from(selectedMeasurementIds).sort();
    return `${selectedMeasurementIds.size}:${sortedIds.join(',')}`;
  }, [selectedMeasurementIds]);

  // Memoize individual measurement component to prevent unnecessary re-renders
  // Component only re-renders when measurement data or isSelected prop changes
  const MeasurementComponent = memo(({ 
    measurement, 
    isSelected,
    scale,
    imageOffset,
    onMeasurementSelect,
    selectedMeasurementIds,
    handleContextMenu
  }: { 
    measurement: Measurement; 
    isSelected: boolean;
    scale: number;
    imageOffset: { x: number; y: number };
    onMeasurementSelect: (ids: Set<string>) => void;
    selectedMeasurementIds: Set<string>;
    handleContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  }) => {
    const baseStrokeWidth = measurement.type === 'length' 
      ? (isSelected ? 7 : 5)
      : (isSelected ? 3.5 : 2.5);
    const strokeWidth = baseStrokeWidth / scale;
    // Use category color if category exists, otherwise use stored color
    const measurementColor = measurement.category ? getCategoryColor(measurement.category) : measurement.color;
    // Highlight selected measurements with simple color change (no expensive shadow/blur)
    const strokeColor = isSelected 
      ? hexToRgba(measurementColor, MEASUREMENT.SELECTED_OPACITY)
      : (measurement.type === 'length' ? hexToRgba(measurementColor, MEASUREMENT.LENGTH_OPACITY) : hexToRgba(measurementColor, MEASUREMENT.AREA_OPACITY));

    const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Don't handle if it was a right-click
      if (isRightClickRef.current || e.evt.button === 2) {
        isRightClickRef.current = false;
        return;
      }
      e.cancelBubble = true;
      const newSelection = updateSelectionWithModifiers(
        selectedMeasurementIds,
        measurement.id,
        e.evt.shiftKey,
        e.evt.ctrlKey,
        e.evt.metaKey
      );
      onMeasurementSelect(newSelection);
    };

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Track right-click on mousedown
      if (e.evt.button === 2) {
        isRightClickRef.current = true;
      }
    };

    const handleContextMenuEvent = (e: Konva.KonvaEventObject<MouseEvent>) => {
      isRightClickRef.current = false; // Reset flag
      e.evt.preventDefault();
      e.evt.stopPropagation();
      handleContextMenu(e);
    };

    if (measurement.type === 'length' && measurement.data.points) {
      const points = measurement.data.points.flatMap((p: { x: number; y: number }) => [p.x + imageOffset.x, p.y + imageOffset.y]);
      return (
        <Group id={measurement.id} name="measurement" onMouseDown={handleMouseDown} onClick={handleClick} onContextMenu={handleContextMenuEvent}>
          {/* Simple highlight for selected measurements - no expensive shadow/blur */}
          {isSelected && (
            <Line
              points={points}
              stroke={hexToRgba(measurementColor, 0.4)}
              strokeWidth={strokeWidth * 1.8}
              tension={0}
              lineCap="round"
              lineJoin="round"
            />
          )}
          <Line
            points={points}
            stroke={strokeColor}
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
                radius={CANVAS.ENDPOINT_RADIUS / scale}
                fill={hexToRgba(measurementColor, 0.6)}
              />
              <Circle
                x={points[points.length - 2]}
                y={points[points.length - 1]}
                radius={4 / scale}
                fill={hexToRgba(measurementColor, 0.6)}
              />
            </>
          )}
        </Group>
      );
    } else if (measurement.type === 'area' && measurement.data.points) {
      const points = measurement.data.points.flatMap((p: { x: number; y: number }) => [p.x + imageOffset.x, p.y + imageOffset.y]);
      const fillColor = hexToRgba(measurementColor, isSelected ? 0.15 : 0.08);
      return (
        <Group id={measurement.id} name="measurement" onMouseDown={handleMouseDown} onClick={handleClick} onContextMenu={handleContextMenuEvent}>
          {/* Simple highlight for selected measurements - no expensive shadow/blur */}
          {isSelected && (
            <Line
              points={[...points, points[0], points[1]]}
              stroke={hexToRgba(measurementColor, 0.4)}
              strokeWidth={strokeWidth * 1.8}
              fill={hexToRgba(measurementColor, 0.12)}
              closed
            />
          )}
          <Line
            points={[...points, points[0], points[1]]}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill={fillColor}
            closed
          />
          {measurement.data.points.map((p: { x: number; y: number }, i: number) => (
            <Circle
              key={i}
              x={p.x + imageOffset.x}
              y={p.y + imageOffset.y}
              radius={CANVAS.ENDPOINT_RADIUS / scale}
              fill={hexToRgba(measurementColor, 0.5)}
            />
          ))}
        </Group>
      );
    } else if (measurement.type === 'count' && measurement.data.point) {
      const p = measurement.data.point;
      return (
        <Group id={measurement.id} name="measurement" onMouseDown={handleMouseDown} onClick={handleClick} onContextMenu={handleContextMenuEvent}>
          {/* Simple highlight for selected measurements - no expensive shadow/blur */}
          {isSelected && (
            <Circle
              x={p.x + imageOffset.x}
              y={p.y + imageOffset.y}
              radius={10 / scale}
              stroke={hexToRgba(measurementColor, 0.5)}
              strokeWidth={strokeWidth * 1.5}
              fill={hexToRgba(measurementColor, 0.25)}
            />
          )}
          <Circle
            x={p.x + imageOffset.x}
            y={p.y + imageOffset.y}
            radius={8 / scale}
            stroke={hexToRgba(measurementColor, isSelected ? 0.7 : 0.5)}
            strokeWidth={strokeWidth}
            fill={hexToRgba(measurementColor, isSelected ? 0.25 : 0.15)}
          />
          <Text
            x={p.x + imageOffset.x + 12 / scale}
            y={p.y + imageOffset.y - 8 / scale}
            text={measurement.name}
            fontSize={12 / scale}
            fill={hexToRgba(measurementColor, 0.6)}
            fontStyle="bold"
          />
        </Group>
      );
    }
    return null;
  }, (prevProps, nextProps) => {
    // Custom comparison: return true if props are equal (skip re-render), false if different (re-render)
    return (
      prevProps.measurement.id === nextProps.measurement.id &&
      JSON.stringify(prevProps.measurement.data) === JSON.stringify(nextProps.measurement.data) &&
      prevProps.measurement.color === nextProps.measurement.color &&
      prevProps.measurement.category === nextProps.measurement.category &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.scale === nextProps.scale &&
      prevProps.imageOffset.x === nextProps.imageOffset.x &&
      prevProps.imageOffset.y === nextProps.imageOffset.y
    );
  });

  // Memoize measurement rendering - only recalculate when measurements or selection actually change
  const renderedMeasurements = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark('measurement-render-start');
    }
    
    const pageMeasurements = measurements.filter(m => !m.pageNumber || m.pageNumber === activePage);
    
    const result = pageMeasurements.map((measurement) => {
      const isSelected = selectedMeasurementIds.has(measurement.id);
      return (
        <MeasurementComponent 
          key={measurement.id} 
          measurement={measurement} 
          isSelected={isSelected}
          scale={scale}
          imageOffset={imageOffset}
          onMeasurementSelect={onMeasurementSelect}
          selectedMeasurementIds={selectedMeasurementIds}
          handleContextMenu={handleContextMenu}
        />
      );
    });
    
    if (process.env.NODE_ENV === 'development') {
      performance.mark('measurement-render-end');
      performance.measure('measurement-render', 'measurement-render-start', 'measurement-render-end');
      const measure = performance.getEntriesByName('measurement-render')[0];
      if (measure.duration > PERFORMANCE.FRAME_TIME_MS) { // Log if takes longer than one frame
        console.log(`[Performance] Measurement render took ${measure.duration.toFixed(2)}ms for ${pageMeasurements.length} measurements, ${selectedMeasurementIds.size} selected`);
      }
      performance.clearMarks();
      performance.clearMeasures();
    }
    
    return result;
  }, [
    measurements, 
    activePage, 
    selectionHash, // Use stable hash instead of creating new string every render
    scale,
    imageOffset.x,
    imageOffset.y,
    onMeasurementSelect,
    handleContextMenu
  ]);
  
  const renderMeasurements = () => renderedMeasurements;

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

  // Update ref when selections change and batch canvas updates
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark('selection-update-start');
    }
    
    selectedCountRef.current = selectedMeasurementIds.size;
    // Clear context menu when selections are cleared (user clicked away)
    if (selectedMeasurementIds.size === 0) {
      setContextMenu(null);
    }
    // Batch canvas update after selection changes (single render instead of per-node)
    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
    
    if (process.env.NODE_ENV === 'development') {
      performance.mark('selection-update-end');
      performance.measure('selection-update', 'selection-update-start', 'selection-update-end');
      const measure = performance.getEntriesByName('selection-update')[0];
      if (measure.duration > 16) { // Log if takes longer than one frame
        console.log(`[Performance] Selection update took ${measure.duration.toFixed(2)}ms for ${selectedMeasurementIds.size} selected items`);
      }
      performance.clearMarks();
      performance.clearMeasures();
    }
  }, [selectedMeasurementIds]);

  // Handle right-click context menu on container (catches all right-clicks including empty space)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleContextMenu = (e: MouseEvent) => {
      // Use ref to get current selection count (avoids stale closure)
      const currentSelectedCount = selectedCountRef.current;
      // Only handle if we have selections (use ref to avoid stale closure)
      if (currentSelectedCount > 0 && onGroup && onUngroup) {
        e.preventDefault();
        e.stopPropagation();
        
        // Get the exact click position
        const viewportX = e.clientX;
        const viewportY = e.clientY;
        
        // Set the context menu at the click position
        // This works for both empty space and measurements (measurement Group handlers also set it)
        setContextMenu({ x: viewportX, y: viewportY });
      }
    };
    
    container.addEventListener('contextmenu', handleContextMenu);
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onGroup, onUngroup]); // Removed selectedMeasurementIds from deps - use ref instead

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-400">
          <FileText className="mx-auto h-16 w-16 mb-4 text-gray-400" />
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
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: 'auto', width: '100%', height: '100%' }} className="canvas-overlay">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            // Track right-click on Stage
            if (e.evt.button === 2) {
              isRightClickRef.current = true;
            }
            handleStageMouseDown(e);
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={(e) => {
            // Don't handle click if it was a right-click
            if (isRightClickRef.current || e.evt.button === 2) {
              isRightClickRef.current = false;
              return;
            }
            handleClick(e);
          }}
          onContextMenu={(e) => {
            isRightClickRef.current = false; // Reset flag
            handleContextMenu(e);
          }}
          style={{ cursor: activeTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : activeTool ? 'crosshair' : 'default' }}
        >
        <Layer ref={layerRef} listening={true} clipFunc={undefined}>
          {/* Background image - show for both PDF and images in Konva for coordinate matching */}
          {backgroundImage && imageSize.width > 0 && (() => {
            // Background image uses stage coordinates (before scale), so calculate differently
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
          {/* Calibration line preview - only show when calibrate tool is active */}
          {activeTool === 'calibrate' && calibrationPoints.length > 0 && (
            <>
              {calibrationPoints.map((p, i) => (
                <Circle
                  key={i}
                  x={p.x + imageOffset.x}
                  y={p.y + imageOffset.y}
                  radius={6 / scale}
                  fill="red"
                  stroke="white"
                  strokeWidth={2 / scale}
                  opacity={0.7}
                />
              ))}
              {calibrationPoints.length === 2 && (
                <Line
                  points={[
                    calibrationPoints[0].x + imageOffset.x,
                    calibrationPoints[0].y + imageOffset.y,
                    calibrationPoints[1].x + imageOffset.x,
                    calibrationPoints[1].y + imageOffset.y,
                  ]}
                  stroke="red"
                  strokeWidth={2 / scale}
                  dash={[5 / scale, 5 / scale]}
                  opacity={0.7}
                />
              )}
            </>
          )}

          {/* Current drawing preview - only show when measurement tool is active */}
          {activeMeasurementType && currentPoints.length > 0 && (() => {
            const radius = scale > 0 ? CANVAS.ENDPOINT_RADIUS / scale : CANVAS.ENDPOINT_RADIUS;
            const strokeWidth = scale > 0 ? 2 / scale : 2;
            const dashSize = scale > 0 ? 5 / scale : 5;
            const allPoints = previewPoint ? [...currentPoints, previewPoint] : currentPoints;
            const previewColor = activeMeasurementType ? getToolColor(activeMeasurementType) : '#3B82F6';
            
            return (
              <>
                {currentPoints.map((p, i) => {
                  return (
                    <Circle
                      key={i}
                      x={p.x + imageOffset.x}
                      y={p.y + imageOffset.y}
                      radius={radius}
                      fill={previewColor}
                      stroke="white"
                      strokeWidth={strokeWidth * 0.3}
                      listening={false}
                      opacity={1}
                    />
                  );
                })}
                {previewPoint && (
                  <Circle
                    x={previewPoint.x + imageOffset.x}
                    y={previewPoint.y + imageOffset.y}
                    radius={radius}
                    fill={previewColor}
                    stroke="white"
                    strokeWidth={strokeWidth * 0.3}
                    listening={false}
                    opacity={0.5}
                  />
                )}
                {allPoints.length > 1 && (
                  <Line
                    points={allPoints.flatMap(p => [p.x + imageOffset.x, p.y + imageOffset.y])}
                    stroke={previewColor}
                    strokeWidth={strokeWidth}
                    dash={[dashSize, dashSize]}
                    listening={false}
                    opacity={activeMeasurementType === 'area' ? 0.6 : 0.7}
                    fill={activeMeasurementType === 'area' ? previewColor : undefined}
                    fillOpacity={activeMeasurementType === 'area' ? 0.1 : undefined}
                    lineCap="round"
                    lineJoin="round"
                    closed={activeMeasurementType === 'area' && currentPoints.length >= 3 && previewPoint ? isNearFirstPoint(previewPoint, currentPoints[0]) : false}
                  />
                )}
                {/* Show closing indicator for area tool */}
                {activeMeasurementType === 'area' && currentPoints.length >= 3 && previewPoint && isNearFirstPoint(previewPoint, currentPoints[0]) && (
                  <Circle
                    x={currentPoints[0].x + imageOffset.x}
                    y={currentPoints[0].y + imageOffset.y}
                    radius={radius * 1.5}
                    fill={previewColor}
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
          
          {/* Selection rectangle overlay - always render but control visibility via ref ONLY */}
          {/* CRITICAL: Do NOT use visible={!!selectionRect} prop - it causes React to override ref visibility on re-render */}
          {/* CRITICAL: Ref callback should ONLY set the ref, NOT control visibility - visibility is controlled explicitly via ref in handlers */}
          <Rect
            ref={(node) => {
              // Only set the ref - do NOT control visibility here
              // Visibility is controlled explicitly in handleStageMouseDown and handleMouseUp
              // This prevents the callback from overriding explicit visibility control on re-renders
              selectionRectRef.current = node;
              // DO NOT set visibility here - it will override explicit ref control on re-renders
              // Initial visibility is set to false, and handlers will show/hide explicitly
              if (node && !node.visible() && selectionRect) {
                // Only initialize if node is not visible and we have selectionRect (first mount case)
                // But this should be rare - handlers will control visibility
                node.visible(false); // Start hidden, handlers will show when needed
              }
            }}
            x={selectionRect ? selectionRect.x + imageOffset.x : 0}
            y={selectionRect ? selectionRect.y + imageOffset.y : 0}
            width={selectionRect?.width || 0}
            height={selectionRect?.height || 0}
            stroke="#3B82F6"
            strokeWidth={2 / scale}
            dash={[5 / scale, 5 / scale]}
            fill="rgba(59, 130, 246, 0.1)"
            listening={false}
            // REMOVED: visible={!!selectionRect} - this was causing React to override ref visibility on re-render
            // Visibility is now controlled entirely via ref to prevent ghost rectangles
          />
        </Layer>
      </Stage>
      </div>

      {/* Page Navigation (for PDFs) */}
      {file.type === 'pdf' && pdfPageCount > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md shadow-lg px-4 py-2 flex items-center gap-3 border border-white/10" style={{ zIndex: 20 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(Math.max(1, activePage - 1));
            }}
            disabled={activePage === 1}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white">
            Page {activePage} of {pdfPageCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(Math.min(pdfPageCount, activePage + 1));
            }}
            disabled={activePage === pdfPageCount}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Calibration Dialog */}
      {showCalibrationDialog && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md p-6 max-w-md w-full mx-4 border border-white/10 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-white">Calibrate Scale</h3>
            <p className="text-sm text-white/70 mb-4">
              Enter the real-world distance between the two points you selected.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Distance
                </label>
                <input
                  type="number"
                  value={calibrationDistance}
                  onChange={(e) => setCalibrationDistance(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  placeholder="Enter distance"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Units
                </label>
                <select
                  value={calibrationUnits}
                  onChange={(e) => setCalibrationUnits(e.target.value as Unit)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40"
                >
                  <option value="ft" className="bg-black">Feet</option>
                  <option value="in" className="bg-black">Inches</option>
                  <option value="m" className="bg-black">Meters</option>
                  <option value="cm" className="bg-black">Centimeters</option>
                  <option value="mm" className="bg-black">Millimeters</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCalibrationSubmit}
                className="flex-1 px-4 py-2 bg-white/20 text-white hover:bg-white/30 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Calibrate
              </button>
              <button
                onClick={() => {
                  setShowCalibrationDialog(false);
                  setCalibrationPoints([]);
                  setCalibrationDistance('');
                }}
                className="flex-1 px-4 py-2 bg-white/5 text-white/70 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scale indicator and Fit button */}
      <div className="absolute top-4 right-4 flex items-center gap-2" style={{ zIndex: 50, pointerEvents: 'auto' }}>
        {/* Fit to View button */}
        <button
          onClick={handleFitToView}
          className="bg-black/80 backdrop-blur-md shadow-lg px-3 py-2 text-sm border border-white/10 hover:bg-black/90 transition-colors flex items-center gap-2 group"
          title="Fit page"
          style={{ pointerEvents: 'auto' }}
        >
          <Maximize2 className="w-4 h-4 text-white/70 group-hover:text-white" strokeWidth={1.5} />
          <span className="text-white/70 group-hover:text-white text-sm">Fit</span>
        </button>
        
        {/* Zoom indicator */}
        <div className="bg-black/80 backdrop-blur-md shadow-lg px-3 py-2 text-sm border border-white/10" style={{ pointerEvents: 'auto' }}>
          <div className="text-white">Zoom: {(scale * 100).toFixed(0)}%</div>
          {calibration?.isCalibrated && (
            <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Calibrated
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onGroup={() => {
              if (onGroup) {
                onGroup();
              }
            }}
            onUngroup={() => {
              if (onUngroup) {
                onUngroup();
              }
            }}
            onCategorySelect={(category) => {
              if (onMeasurementUpdate) {
                selectedMeasurementIds.forEach(id => {
                  onMeasurementUpdate(id, {
                    category: category || undefined,
                    color: category ? getCategoryColor(category) : undefined,
                  });
                });
              }
            }}
            hasSelection={selectedMeasurementIds.size > 0}
          />
      )}
    </div>
  );
}

