# MeasureLab

A professional measurement and takeoff tool built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **File Upload**: Upload PDF drawings or images (PNG, JPG)
- **Canvas Viewer**: Pan, zoom, and navigate through drawings
- **Scale Calibration**: Calibrate measurements by setting a known distance
- **Measurement Tools**:
  - **Length Tool**: Measure distances with polyline segments
  - **Area Tool**: Measure polygon areas
  - **Count Tool**: Place markers and count items
- **Takeoff List**: Manage all measurements with grouping and editing
- **Export**: Export measurements to CSV
- **Persistence**: All work is saved to localStorage automatically

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser
4. Navigate to `/measure` to start using the tool

## Usage

1. **Upload a Drawing**: Click the upload area in the sidebar or drag and drop a PDF or image file
2. **Calibrate Scale** (recommended): Click the "Calibrate Scale" tool, then click two points on your drawing that represent a known distance. Enter the real-world distance and units.
3. **Take Measurements**: Select a measurement tool (Length, Area, or Count) and click on your drawing to create measurements
4. **Manage Measurements**: View, edit, and delete measurements in the takeoff list panel on the right
5. **Export**: Click "Export CSV" to download your measurements

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- react-pdf (PDF rendering)
- Konva/react-konva (Canvas overlay for measurements)

## Browser Support

Works best in modern browsers. PDF rendering requires a browser with PDF.js support.

