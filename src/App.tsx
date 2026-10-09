import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import './App.css'
import { HistoryManager, type Sized } from './lib/history'
import { floodMask, applyFill } from './lib/fill'
import {
  combineSelections, maskToRuns, runsToSvgPath, selectionPath,
  selectionNeedsMask, selectionMargin, buildSelectionMask,
  type Selection, type SelMode,
} from './lib/selection'

// ===================== Icons =====================
const Icon = ({ children, size = 16 }: { children: any; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    {children}
  </svg>
)

const Icons = {
  brush: (<Icon><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></Icon>),
  eraser: (<Icon><path d="M20 20H7L3 16c-1.1-1.1-1.1-3 0-4.1l9.9-9.9c1.1-1.1 3-1.1 4.1 0L20 5.9c1.1 1.1 1.1 3 0 4.1L11 19" /><path d="M6 11l8 8" /></Icon>),
  undo: (<Icon><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" /></Icon>),
  redo: (<Icon><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 13" /></Icon>),
  zoomIn: (<Icon><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6M8 11h6" /></Icon>),
  zoomOut: (<Icon><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" /></Icon>),
  download: (<Icon><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><path d="M12 15V3" /></Icon>),
  file: (<Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Icon>),
  trash: (<Icon><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Icon>),
  sun: (<Icon><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></Icon>),
  moon: (<Icon><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></Icon>),
  close: (<Icon><path d="M18 6L6 18M6 6l12 12" /></Icon>),
  palette: (<Icon size={18}><circle cx="13.5" cy="6.5" r="2" fill="currentColor" stroke="none" /><circle cx="17.5" cy="10.5" r="2" fill="currentColor" stroke="none" /><circle cx="8.5" cy="7.5" r="2" fill="currentColor" stroke="none" /><circle cx="6.5" cy="12.5" r="2" fill="currentColor" stroke="none" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.1 2.5-.3.5-.1.7-.7.4-1.1-.3-.4-.2-.9.2-1.2.5-.4 1.1-.7 1.7-.7H16c3.3 0 6-2.7 6-6 0-5.5-4.5-10-10-10z" /></Icon>),
  portrait: (<Icon><rect x="6" y="3" width="12" height="18" rx="2" /></Icon>),
  landscape: (<Icon><rect x="3" y="6" width="18" height="12" rx="2" /></Icon>),
  swap: (<Icon><path d="M16 3l4 4-4 4" /><path d="M20 7H8a4 4 0 0 0-4 4v0" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h12a4 4 0 0 0 4-4v0" /></Icon>),
  panel: (<Icon><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></Icon>),
  eye: (<Icon><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Icon>),
  eyeOff: (<Icon><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></Icon>),
  plus: (<Icon><path d="M12 5v14M5 12h14" /></Icon>),
  layers: (<Icon><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></Icon>),
  chevronUp: (<Icon size={14}><path d="M18 15l-6-6-6 6" /></Icon>),
  chevronDown: (<Icon size={14}><path d="M6 9l6 6 6-6" /></Icon>),
  lock: (<Icon size={14}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>),
  move: (<Icon size={18}><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" /></Icon>),
  marquee: (<Icon size={18}><rect x="3" y="3" width="18" height="18" rx="1" strokeDasharray="3 2" /></Icon>),
  lasso: (<Icon size={18}><path d="M7 22a5 5 0 0 1-2-4c0-2 1.5-3.5 3-5l6-7a3 3 0 0 1 5 3c0 1.5-1 3-2.5 4.5L12 18" /></Icon>),
  crop: (<Icon size={18}><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></Icon>),
  eyedropper: (<Icon size={18}><path d="M2 22l1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="M15 6l3 3 3-3-3-3-3 3z" /></Icon>),
  fill: (<Icon size={18}><path d="M19 11H5l7-7 7 7z" /><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" /><path d="M10 16h4" /></Icon>),
  gradient: (<Icon size={18}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18" opacity="0.3" /><path d="M3 8h18" opacity="0.15" /><path d="M3 16h18" opacity="0.5" /></Icon>),
  shape: (<Icon size={18}><rect x="3" y="3" width="18" height="18" rx="2" /></Icon>),
  text: (<Icon size={18}><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></Icon>),
  pen: (<Icon size={18}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /></Icon>),
  clone: (<Icon size={18}><circle cx="12" cy="8" r="5" /><path d="M3 21v-2a7 7 0 0 1 7-7" /><path d="M21 21v-2a7 7 0 0 0-4-6.3" /></Icon>),
  smudge: (<Icon size={18}><path d="M4 14c2-2 4-5 4-8a4 4 0 0 1 8 0c0 3 2 6 4 8" /><path d="M12 6v14" /></Icon>),
  dodge: (<Icon size={18}><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2" /></Icon>),
  hand: (<Icon size={18}><path d="M18 11V6a2 2 0 0 0-4 0v1" /><path d="M14 10V4a2 2 0 0 0-4 0v6" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.5 0-4.5-1.5-5.5-3.5" /></Icon>),
  zoom: (<Icon size={18}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6M8 11h6" /></Icon>),
  pencil: (<Icon size={18}><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /></Icon>),
  ellipse: (<Icon size={18}><ellipse cx="12" cy="12" rx="9" ry="6" /></Icon>),
  magicWand: (<Icon size={18}><path d="M15 4V2M15 16v-2M8.2 7.2L6.8 5.8M19.2 18.2l-1.4-1.4M4 11H2M22 11h-2M8.2 14.8l-1.4 1.4M19.2 3.8l-1.4 1.4" /><circle cx="15" cy="9" r="3" /><path d="M9 15l-6 6" /></Icon>),
  chevronRight: (<Icon size={12}><path d="M9 18l6-6-6-6" /></Icon>),
}

// ===================== Types =====================
type Tool = 'brush' | 'eraser' | 'hand' | 'zoom' | 'move' | 'marquee' | 'lasso' | 'wand' | 'crop' | 'eyedropper' | 'fill' | 'gradient' | 'shape' | 'text' | 'pen' | 'clone' | 'smudge' | 'dodge'
type BgType = 'white' | 'dark' | 'transparent' | 'custom'
type PanelTab = 'brush' | 'layers'

interface Point { x: number; y: number; pressure: number; time: number }

interface DocSettings {
  width: number
  height: number
  bg: BgType
  bgColor: string
  name: string
}

interface Layer {
  id: string
  name: string
  visible: boolean
  opacity: number // 0-1
  locked: boolean
  offsetX: number // canvas buffer px
  offsetY: number
  canvas: HTMLCanvasElement
}

const PRESETS = [
  { name: 'A4', w: 2480, h: 3508, label: '210 × 297 mm @ 300 ppi' },
  { name: 'A5', w: 1748, h: 2480, label: '148 × 210 mm @ 300 ppi' },
  { name: 'Square', w: 2048, h: 2048, label: '2048 × 2048 px' },
  { name: 'HD', w: 1920, h: 1080, label: '1920 × 1080 px' },
  { name: 'Instagram', w: 1080, h: 1080, label: '1080 × 1080 px' },
  { name: 'Story', w: 1080, h: 1920, label: '1080 × 1920 px' },
  { name: 'Web', w: 1280, h: 720, label: '1280 × 720 px' },
  { name: 'Tablet', w: 2048, h: 1536, label: '2048 × 1536 px' },
]

// Left toolbar — Photoshop-style groups (flyout on hold/click)
interface ToolItem {
  id: string
  label: string
  shortcut?: string
  icon: any
  tool?: Tool // maps to active tool when implemented
  comingSoon?: boolean
}

interface ToolGroup {
  id: string
  items: ToolItem[]
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'move',
    items: [
      { id: 'move', label: 'Move Tool', shortcut: 'V', icon: Icons.move, tool: 'move' },
    ],
  },
  {
    id: 'select',
    items: [
      { id: 'marquee-rect', label: 'Rectangular Marquee', shortcut: 'M', icon: Icons.marquee, tool: 'marquee' },
      { id: 'marquee-ellipse', label: 'Elliptical Marquee', shortcut: 'M', icon: Icons.ellipse, tool: 'marquee' },
      { id: 'lasso', label: 'Lasso Tool', shortcut: 'L', icon: Icons.lasso, tool: 'lasso' },
      { id: 'magic-wand', label: 'Magic Wand', shortcut: 'W', icon: Icons.magicWand, tool: 'wand' },
    ],
  },
  {
    id: 'crop',
    items: [
      { id: 'crop', label: 'Crop Tool', shortcut: 'C', icon: Icons.crop, tool: 'crop' },
    ],
  },
  {
    id: 'eyedropper',
    items: [
      { id: 'eyedropper', label: 'Eyedropper', shortcut: 'I', icon: Icons.eyedropper, tool: 'eyedropper' },
    ],
  },
  {
    id: 'brush',
    items: [
      { id: 'brush', label: 'Brush Tool', shortcut: 'B', icon: Icons.brush, tool: 'brush' },
      { id: 'pencil', label: 'Pencil Tool', shortcut: 'B', icon: Icons.pencil, tool: 'brush' },
    ],
  },
  {
    id: 'clone',
    items: [
      { id: 'clone', label: 'Clone Stamp', shortcut: 'S', icon: Icons.clone, tool: 'clone' },
    ],
  },
  {
    id: 'eraser',
    items: [
      { id: 'eraser', label: 'Eraser Tool', shortcut: 'E', icon: Icons.eraser, tool: 'eraser' },
    ],
  },
  {
    id: 'fill',
    items: [
      { id: 'gradient', label: 'Gradient Tool', shortcut: 'G', icon: Icons.gradient, tool: 'gradient' },
      { id: 'bucket', label: 'Paint Bucket', shortcut: 'G', icon: Icons.fill, tool: 'fill' },
    ],
  },
  {
    id: 'retouch',
    items: [
      { id: 'smudge', label: 'Smudge Tool', shortcut: 'R', icon: Icons.smudge, tool: 'smudge' },
      { id: 'dodge', label: 'Dodge Tool', shortcut: 'O', icon: Icons.dodge, tool: 'dodge' },
    ],
  },
  {
    id: 'pen',
    items: [
      { id: 'pen', label: 'Pen Tool', shortcut: 'P', icon: Icons.pen, tool: 'pen' },
    ],
  },
  {
    id: 'type',
    items: [
      { id: 'type', label: 'Type Tool', shortcut: 'T', icon: Icons.text, tool: 'text' },
    ],
  },
  {
    id: 'shape',
    items: [
      { id: 'rect', label: 'Rectangle', shortcut: 'U', icon: Icons.shape, tool: 'shape' },
      { id: 'ellipse', label: 'Ellipse', shortcut: 'U', icon: Icons.ellipse, tool: 'shape' },
    ],
  },
  {
    id: 'nav',
    items: [
      { id: 'hand', label: 'Hand Tool', shortcut: 'H', icon: Icons.hand, tool: 'hand' },
      { id: 'zoom', label: 'Zoom Tool', shortcut: 'Z', icon: Icons.zoom, tool: 'zoom' },
    ],
  },
]


let layerCounter = 1

function createLayerCanvas(w: number, h: number, dpr: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.floor(w * dpr)
  c.height = Math.floor(h * dpr)
  return c
}

function createLayer(w: number, h: number, dpr: number, name?: string): Layer {
  return {
    id: `layer-${Date.now()}-${layerCounter++}`,
    name: name || `لایه ${layerCounter - 1}`,
    visible: true,
    opacity: 1,
    locked: false,
    offsetX: 0,
    offsetY: 0,
    canvas: createLayerCanvas(w, h, dpr),
  }
}


// Limits keep canvases inside what browsers can actually allocate
const MAX_SIDE = 8000
const MAX_AREA = 36_000_000 // document px

function chooseDpr(w: number, h: number): number {
  let d = Math.min(window.devicePixelRatio || 1, 2)
  while (d > 1 && w * h * d * d > MAX_AREA) d = Math.max(1, d - 0.25)
  return d
}

let scratchCanvas: HTMLCanvasElement | null = null
function getScratch(w: number, h: number): HTMLCanvasElement {
  if (!scratchCanvas) scratchCanvas = document.createElement('canvas')
  if (scratchCanvas.width !== w || scratchCanvas.height !== h) {
    scratchCanvas.width = w
    scratchCanvas.height = h
  } else {
    scratchCanvas.getContext('2d')?.clearRect(0, 0, w, h)
  }
  return scratchCanvas
}

interface HistEntry {
  layers: Layer[] // shallow metadata copies (canvas elements are shared)
  scales: Record<string, { sx: number; sy: number }>
  rotations: Record<string, number>
  activeId: string
  pixels?: { layerId: string; imageData: ImageData }
}

export default function App() {
  const displayRef = useRef<HTMLCanvasElement>(null) // composited view
  const previewRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawing = useRef(false)
  const isPanning = useRef(false)
  const isMoving = useRef(false)
  const isTransforming = useRef(false)
  const transformHandle = useRef<string | null>(null)
  const moveStart = useRef<{ x: number; y: number } | null>(null)
  const moveOriginOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const transformOrigin = useRef<{ x: number; y: number; w: number; h: number; ox: number; oy: number } | null>(null)
  // Layer scale (1 = 100%)
  const [layerScales, setLayerScales] = useState<Record<string, { sx: number; sy: number }>>({})
  const layerScalesRef = useRef(layerScales)
  useEffect(() => { layerScalesRef.current = layerScales }, [layerScales])
  const [layerRotations, setLayerRotations] = useState<Record<string, number>>({})
  const layerRotationsRef = useRef(layerRotations)
  useEffect(() => { layerRotationsRef.current = layerRotations }, [layerRotations])
  const rotateStartAngle = useRef(0)
  const rotateOriginAngle = useRef(0)

  // Selection
  const [selection, setSelectionRaw] = useState<Selection | null>(null)
  // Feather / anti-alias are baked into a selection when it is made (like Photoshop)
  const selOptsRef = useRef({ feather: 0, antiAlias: true })
  const setSelection = useCallback((v: Selection | null) => {
    setSelectionRaw(v && v.feather === undefined
      ? { ...v, feather: selOptsRef.current.feather, antiAlias: selOptsRef.current.antiAlias }
      : v)
  }, [])
  const selectionRef = useRef(selection)
  useEffect(() => { selectionRef.current = selection }, [selection])
  const isSelecting = useRef(false)
  const selectStart = useRef<{ x: number; y: number } | null>(null)
  const lassoPoints = useRef<{ x: number; y: number }[]>([])
  const marqueeShape = useRef<'rect' | 'ellipse'>('rect')
  const [wandTolerance, setWandTolerance] = useState(32)

  // Crop
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const cropRectRef = useRef(cropRect)
  useEffect(() => { cropRectRef.current = cropRect }, [cropRect])
  const isCropping = useRef(false)
  const cropStart = useRef<{ x: number; y: number } | null>(null)

  // Clone stamp
  const cloneSource = useRef<{ x: number; y: number } | null>(null)
  const cloneOrigin = useRef<{ x: number; y: number } | null>(null)
  const isCloning = useRef(false)
  const [cloneHasSource, setCloneHasSource] = useState(false)

  // Gradient drag
  const isGradient = useRef(false)
  const gradientStart = useRef<{ x: number; y: number } | null>(null)
  const gradientEnd = useRef<{ x: number; y: number } | null>(null)
  const [gradientPreview, setGradientPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  // Shape tool
  const isShaping = useRef(false)
  const shapeStart = useRef<{ x: number; y: number } | null>(null)
  const shapeEndRef = useRef<{ x: number; y: number; w: number; h: number; kind: 'rect' | 'ellipse' } | null>(null)
  const [shapePreview, setShapePreview] = useState<{ x: number; y: number; w: number; h: number; kind: 'rect' | 'ellipse' } | null>(null)
  const shapeKind = useRef<'rect' | 'ellipse'>('rect')

  // Text tool
  const [textEditor, setTextEditor] = useState<{ x: number; y: number; screenX: number; screenY: number; value: string } | null>(null)
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState('Tahoma')
  const [textColor, setTextColor] = useState('#ffffff')
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [lineHeight, setLineHeight] = useState(1.2)

  // Pen path
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([])
  const penPointsRef = useRef(penPoints)
  useEffect(() => { penPointsRef.current = penPoints }, [penPoints])
  const [penMode, setPenMode] = useState<'pixels' | 'shape' | 'path'>('pixels')
  const [penStrokeWidth, setPenStrokeWidth] = useState(3)
  const [penColor, setPenColor] = useState('#ffffff')
  const [penFill, setPenFill] = useState(false)
  const [penFillColor, setPenFillColor] = useState('#4ea1ff')
  const [penAutoClose, setPenAutoClose] = useState(false)
  const [penRubberBand, setPenRubberBand] = useState(true)
  const [penCursorDoc, setPenCursorDoc] = useState<{ x: number; y: number } | null>(null)
  const [penOpacity, setPenOpacity] = useState(1)

  // Smudge / dodge painting
  const isRetouching = useRef(false)
  const lastRetouchPos = useRef<{ x: number; y: number } | null>(null)
  const [smudgeSize, setSmudgeSize] = useState(40)
  const [smudgeStrength, setSmudgeStrength] = useState(50)
  const [smudgeFingerPaint, setSmudgeFingerPaint] = useState(false)
  const [smudgeSampleAll, setSmudgeSampleAll] = useState(false)


  const lastPoint = useRef<Point | null>(null)
  const lastDabPos = useRef<{ x: number; y: number } | null>(null)
  const lastPanPos = useRef<{ x: number; y: number } | null>(null)
  const historyMgr = useRef(new HistoryManager<HistEntry>(40, 300 * 1024 * 1024))
  const lastRawPos = useRef<{ x: number; y: number } | null>(null)
  const cloneMarkerPos = useRef<{ x: number; y: number } | null>(null)
  const cloneMarkerRaf = useRef(0)
  const longPressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)
  const dprRef = useRef(1)
  const spacePressed = useRef(false)
  const layersRef = useRef<Layer[]>([])
  const activeLayerIdRef = useRef<string>('')

  // Document
  const [showNewDoc, setShowNewDoc] = useState(true)
  const [doc, setDoc] = useState<DocSettings>({ width: 1920, height: 1080, bg: 'dark', bgColor: '#1a1d24', name: 'Untitled' })
  const docRef = useRef(doc)
  useEffect(() => { docRef.current = doc }, [doc])
  const [docCreated, setDocCreated] = useState(false)

  // New Doc form
  const [formW, setFormW] = useState(1920)
  const [formH, setFormH] = useState(1080)
  const [formBg, setFormBg] = useState<BgType>('dark')
  const [formBgColor, setFormBgColor] = useState('#ffffff')
  const [formName, setFormName] = useState('Untitled')
  const [selectedPreset, setSelectedPreset] = useState<string | null>('HD')

  // Viewport
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { offsetRef.current = offset }, [offset])

  // Layers
  const [layers, setLayers] = useState<Layer[]>([])
  const [activeLayerId, setActiveLayerId] = useState('')
  useEffect(() => { layersRef.current = layers }, [layers])
  useEffect(() => { activeLayerIdRef.current = activeLayerId }, [activeLayerId])

  // Tools & settings (separate for brush / eraser)
  const [tool, setTool] = useState<Tool>('brush')
  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null)
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [groupActiveId, setGroupActiveId] = useState<Record<string, string>>({
    move: 'move', select: 'marquee-rect', crop: 'crop', eyedropper: 'eyedropper',
    brush: 'brush', clone: 'clone', eraser: 'eraser', fill: 'gradient',
    retouch: 'smudge', pen: 'pen', type: 'type', shape: 'rect', nav: 'hand',
  })
  useEffect(() => { groupActiveIdRef.current = groupActiveId }, [groupActiveId])

  // Keep marquee shape in sync with selected sub-tool
  useEffect(() => {
    if (tool === 'marquee') {
      const id = groupActiveId['select'] || 'marquee-rect'
      marqueeShape.current = id === 'marquee-ellipse' ? 'ellipse' : 'rect'
    }
    if (tool === 'shape') {
      const id = groupActiveId['shape'] || 'rect'
      shapeKind.current = id === 'ellipse' ? 'ellipse' : 'rect'
    }
  }, [tool, groupActiveId])

  const [color, setColor] = useState('#ffffff')
  const [brushSettings, setBrushSettings] = useState({
    size: 40, opacity: 1, hardness: 100, spacing: 5, flow: 100, blendMode: 'source-over',
  })
  const [eraserSettings, setEraserSettings] = useState({
    size: 50, opacity: 1, hardness: 100, spacing: 5, flow: 100, blendMode: 'destination-out',
    eraserMode: 'brush' as 'brush' | 'pencil' | 'block',
  })
  const isEraserTool = tool === 'eraser'
  const settings = isEraserTool ? eraserSettings : brushSettings
  const setSettings = isEraserTool ? setEraserSettings : setBrushSettings
  const size = settings.size
  const opacity = settings.opacity
  const hardness = settings.hardness
  const spacing = settings.spacing
  const flow = (settings as any).flow ?? 100
  const blendMode = (settings as any).blendMode ?? 'source-over'
  const eraserMode = (eraserSettings as any).eraserMode ?? 'brush'
  const groupActiveIdRef = useRef<Record<string, string>>({})
  const [minSizeRatio, setMinSizeRatio] = useState(0.2)
  const [velocityPressure, setVelocityPressure] = useState(true)
  const [stabilizer, setStabilizer] = useState(0.35)
  const [velocitySensitivity, setVelocitySensitivity] = useState(0.7)

  // Tool-specific options
  const [fillContiguous, setFillContiguous] = useState(true)
  const [fillTolerance, setFillTolerance] = useState(32)
  const [fillSampleAll, setFillSampleAll] = useState(false)
  const [wandContiguous, setWandContiguous] = useState(true)
  const [fillAntiAlias, setFillAntiAlias] = useState(true)
  const [fillBlendMode, setFillBlendMode] = useState('source-over')
  const [gradientType, setGradientType] = useState<'linear' | 'radial' | 'angle'>('linear')
  const [gradientReverse, setGradientReverse] = useState(false)
  const [gradientColorA, setGradientColorA] = useState('#ffffff')
  const [gradientColorB, setGradientColorB] = useState('#000000')
  const [gradientTransparentB, setGradientTransparentB] = useState(false)
  const [gradientDither, setGradientDither] = useState(false)
  const [gradientOpacity, setGradientOpacity] = useState(1)
  const [cloneAligned, setCloneAligned] = useState(true)
  const [cloneSample, setCloneSample] = useState<'current' | 'all'>('current')
  const cloneAlignedOffset = useRef<{ dx: number; dy: number } | null>(null)
  const [cloneSourceScreen, setCloneSourceScreen] = useState<{ x: number; y: number } | null>(null)
  const [shapeFill, setShapeFill] = useState(true)
  const [shapeStroke, setShapeStroke] = useState(false)
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(2)
  const [shapeFillColor, setShapeFillColor] = useState('#4ea1ff')
  const [shapeStrokeColor, setShapeStrokeColor] = useState('#ffffff')
  const [shapeCornerRadius, setShapeCornerRadius] = useState(0)
  const [shapeOpacity, setShapeOpacity] = useState(1)
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left'>('right')
  const [textBold, setTextBold] = useState(false)
  const [dodgeRange, setDodgeRange] = useState<'shadows' | 'midtones' | 'highlights'>('midtones')
  const [dodgeSize, setDodgeSize] = useState(50)
  const [dodgeHardness, setDodgeHardness] = useState(50)
  const [dodgeExposure, setDodgeExposure] = useState(50)
  const [dodgeProtectTones, setDodgeProtectTones] = useState(true)
  const [cropRatio, setCropRatio] = useState<'free' | '1:1' | '4:3' | '16:9' | 'custom'>('free')
  const [cropFixedSize, setCropFixedSize] = useState({ w: 800, h: 600 })
  const [cropStraighten, setCropStraighten] = useState(0)
  const [cropDeletePixels, setCropDeletePixels] = useState(true)
  const [softCrop, setSoftCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [selFeather, setSelFeather] = useState(0)
  const [selMode, setSelMode] = useState<SelMode>('new')
  const [selAntiAlias, setSelAntiAlias] = useState(true)
  selOptsRef.current = { feather: selFeather, antiAlias: selAntiAlias }
  const [marqueeStyle, setMarqueeStyle] = useState<'normal' | 'fixed-ratio' | 'fixed-size'>('normal')
  const [marqueeRatio, setMarqueeRatio] = useState({ w: 1, h: 1 })
  const [marqueeFixedSize, setMarqueeFixedSize] = useState({ w: 200, h: 200 })
  const pendingSelection = useRef<Selection | null>(null)
  const selectionBeforeDrag = useRef<Selection | null>(null)
  const [eyedropperSample, setEyedropperSample] = useState<1 | 3 | 5>(1)
  const [eyedropperSource, setEyedropperSource] = useState<'current' | 'all'>('all')
  const [lastSampledColor, setLastSampledColor] = useState<string | null>(null)
  const [showTransformControls, setShowTransformControls] = useState(true)
  const [lockTransformAspect, setLockTransformAspect] = useState(false)
  const [autoSelectLayer, setAutoSelectLayer] = useState(true)
  const lockAspectRef = useRef(false)
  useEffect(() => { lockAspectRef.current = lockTransformAspect }, [lockTransformAspect])

  // Cursor ring
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [cursorOverCanvas, setCursorOverCanvas] = useState(false)

  // UI
  const [showSettings, setShowSettings] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>('brush')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])

  const selectionMaskD = useMemo(
    () => (selection?.runs ? runsToSvgPath(selection.runs) : ''),
    [selection],
  )

  const getBgColor = (bg: BgType, custom: string) => {
    if (bg === 'white') return '#ffffff'
    if (bg === 'dark') return '#1a1d24'
    if (bg === 'transparent') return 'transparent'
    return custom
  }

  // ========== Composite all layers onto display canvas ==========
  const composite = useCallback(() => {
    const display = displayRef.current
    if (!display) return
    const ctx = display.getContext('2d')
    if (!ctx) return

    const w = display.width
    const h = display.height
    const currentDoc = docRef.current

    // Background — always from latest docRef (avoids stale state)
    const bg = getBgColor(currentDoc.bg, currentDoc.bgColor)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    if (bg === 'transparent') {
      ctx.clearRect(0, 0, w, h) // checkerboard comes from CSS so sampling tools see real alpha
    } else {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
    }

    const list = layersRef.current
    const scales = layerScalesRef.current
    const rotations = layerRotationsRef.current
    for (let i = list.length - 1; i >= 0; i--) {
      const layer = list[i]
      if (!layer.visible) continue
      ctx.globalAlpha = layer.opacity
      const sc = scales[layer.id] || { sx: 1, sy: 1 }
      const rot = rotations[layer.id] || 0
      const w = layer.canvas.width * sc.sx
      const h = layer.canvas.height * sc.sy
      if (rot === 0) {
        ctx.drawImage(layer.canvas, layer.offsetX, layer.offsetY, w, h)
      } else {
        ctx.save()
        ctx.translate(layer.offsetX + w / 2, layer.offsetY + h / 2)
        ctx.rotate((rot * Math.PI) / 180)
        ctx.drawImage(layer.canvas, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
  }, [])

  // ========== Fit to view ==========
  const fitToView = useCallback((docW?: number, docH?: number) => {
    const container = containerRef.current
    if (!container) return
    const w = docW ?? doc.width
    const h = docH ?? doc.height
    if (!w || !h) return
    const pad = 48
    const availW = Math.max(100, container.clientWidth - pad * 2)
    const availH = Math.max(100, container.clientHeight - pad * 2)
    const s = Math.min(availW / w, availH / h)
    setScale(s)
    setOffset({
      x: (container.clientWidth - w * s) / 2,
      y: (container.clientHeight - h * s) / 2
    })
  }, [doc.width, doc.height])

  // ========== Create Document ==========
  const createDocument = () => {
    const w = Math.max(1, Math.min(MAX_SIDE, formW))
    const h = Math.max(1, Math.min(MAX_SIDE, formH))
    if (w * h > MAX_AREA) return
    const newDoc: DocSettings = { width: w, height: h, bg: formBg, bgColor: formBgColor, name: formName || 'Untitled' }
    setDoc(newDoc)
    docRef.current = newDoc  // immediate — so composite sees correct bg
    setDocCreated(true)
    setShowNewDoc(false)

    if (newDoc.bg === 'white') setColor('#000000')
    else if (newDoc.bg === 'dark') setColor('#ffffff')
    else if (newDoc.bg === 'custom') {
      const hex = newDoc.bgColor.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16) || 0
      const g = parseInt(hex.substring(2, 4), 16) || 0
      const b = parseInt(hex.substring(4, 6), 16) || 0
      setColor(((r * 299 + g * 587 + b * 114) / 1000) > 150 ? '#000000' : '#ffffff')
    }

    requestAnimationFrame(() => {
      const dpr = chooseDpr(w, h)
      dprRef.current = dpr

      const display = displayRef.current
      if (display) {
        display.width = Math.floor(w * dpr)
        display.height = Math.floor(h * dpr)
        display.style.width = w + 'px'
        display.style.height = h + 'px'
      }

      layerCounter = 1
      const layer = createLayer(w, h, dpr, 'لایه 1')
      layersRef.current = [layer]
      setLayers([layer])
      setActiveLayerId(layer.id)
      activeLayerIdRef.current = layer.id
      historyMgr.current.clear()
      // a new document starts from a clean slate
      layerScalesRef.current = {}; setLayerScales({})
      layerRotationsRef.current = {}; setLayerRotations({})
      setSelection(null); setCropRect(null); setSoftCrop(null); setPenPoints([])
      setTextEditor(null); setGradientPreview(null); setShapePreview(null)
      cloneSource.current = null; cloneAlignedOffset.current = null
      setCloneHasSource(false); setCloneSourceScreen(null)

      composite()
      requestAnimationFrame(() => fitToView(w, h))
    })
  }

  // ========== Layer operations ==========
  const commitLayerList = (next: Layer[]) => {
    layersRef.current = next
    setLayers(next)
    composite()
  }

  const selectLayer = (id: string) => {
    activeLayerIdRef.current = id // keep the ref in sync immediately (tools read it synchronously)
    setActiveLayerId(id)
  }

  const addLayer = () => {
    if (!docCreated) return
    saveHistory(false)
    const layer = createLayer(doc.width, doc.height, dprRef.current)
    commitLayerList([layer, ...layersRef.current])
    selectLayer(layer.id)
  }

  const deleteLayer = (id: string) => {
    const prev = layersRef.current
    if (prev.length <= 1) return
    saveHistory(false)
    const next = prev.filter(l => l.id !== id)
    const { [id]: _s, ...scales } = layerScalesRef.current
    const { [id]: _r, ...rots } = layerRotationsRef.current
    layerScalesRef.current = scales; setLayerScales(scales)
    layerRotationsRef.current = rots; setLayerRotations(rots)
    commitLayerList(next)
    if (activeLayerIdRef.current === id) selectLayer(next[0].id)
  }

  const toggleVisibility = (id: string) => {
    saveHistory(false)
    commitLayerList(layersRef.current.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }

  const toggleLock = (id: string) => {
    commitLayerList(layersRef.current.map(l => l.id === id ? { ...l, locked: !l.locked } : l))
  }

  const setLayerOpacity = (id: string, opacity: number) => {
    commitLayerList(layersRef.current.map(l => l.id === id ? { ...l, opacity } : l))
  }

  const renameLayer = (id: string, name: string) => {
    const next = layersRef.current.map(l => l.id === id ? { ...l, name } : l)
    layersRef.current = next
    setLayers(next)
  }

  const moveLayer = (id: string, dir: -1 | 1) => {
    const prev = layersRef.current
    const idx = prev.findIndex(l => l.id === id)
    const newIdx = idx + dir
    if (idx < 0 || newIdx < 0 || newIdx >= prev.length) return
    saveHistory(false)
    const next = [...prev]
    const [item] = next.splice(idx, 1)
    next.splice(newIdx, 0, item)
    commitLayerList(next)
  }

  const getActiveLayer = () => layersRef.current.find(l => l.id === activeLayerIdRef.current)

  // ========== Layer transform helpers ==========
  /** Map a point in document-buffer px to the layer's own canvas px (inverse of scale+rotate+offset). */
  const toLayerLocal = (layer: Layer, bx: number, by: number) => {
    const sc = layerScalesRef.current[layer.id] || { sx: 1, sy: 1 }
    const rot = ((layerRotationsRef.current[layer.id] || 0) * Math.PI) / 180
    const w = layer.canvas.width * sc.sx
    const h = layer.canvas.height * sc.sy
    let dx = bx - (layer.offsetX + w / 2)
    let dy = by - (layer.offsetY + h / 2)
    if (rot) {
      const c = Math.cos(-rot), s = Math.sin(-rot)
      ;[dx, dy] = [dx * c - dy * s, dx * s + dy * c]
    }
    return { u: (dx + w / 2) / sc.sx, v: (dy + h / 2) / sc.sy }
  }

  /** True when the layer has visible (non-transparent) pixel under the point. */
  const layerHitTest = (layer: Layer, bx: number, by: number) => {
    const { u, v } = toLayerLocal(layer, bx, by)
    const x = Math.floor(u), y = Math.floor(v)
    if (x < 0 || y < 0 || x >= layer.canvas.width || y >= layer.canvas.height) return false
    try {
      const ctx = layer.canvas.getContext('2d', { willReadFrequently: true })
      return !!ctx && ctx.getImageData(x, y, 1, 1).data[3] > 0
    } catch { return false }
  }

  /**
   * Bake scale/rotation/offset into the layer's pixels (in place, same canvas and layer
   * object) so painting tools work in plain layer coordinates.
   */
  const bakeLayerTransform = (layer: Layer) => {
    const sc = layerScalesRef.current[layer.id]
    const rot = layerRotationsRef.current[layer.id] || 0
    const scaled = !!sc && (sc.sx !== 1 || sc.sy !== 1)
    if (!scaled && rot === 0) return
    const W = layer.canvas.width, H = layer.canvas.height
    const src = document.createElement('canvas')
    src.width = W; src.height = H
    src.getContext('2d')!.drawImage(layer.canvas, 0, 0)
    const ctx = layer.canvas.getContext('2d')!
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, W, H)
    const w = W * (sc?.sx ?? 1), h = H * (sc?.sy ?? 1)
    if (rot === 0) {
      ctx.drawImage(src, layer.offsetX, layer.offsetY, w, h)
    } else {
      ctx.translate(layer.offsetX + w / 2, layer.offsetY + h / 2)
      ctx.rotate((rot * Math.PI) / 180)
      ctx.drawImage(src, -w / 2, -h / 2, w, h)
    }
    ctx.restore()
    layer.offsetX = 0
    layer.offsetY = 0
    const { [layer.id]: _s, ...scales } = layerScalesRef.current
    const { [layer.id]: _r, ...rots } = layerRotationsRef.current
    layerScalesRef.current = scales; setLayerScales(scales)
    layerRotationsRef.current = rots; setLayerRotations(rots)
    setLayers(layersRef.current.map(l => ({ ...l })))
  }

  // ========== History (full undo/redo: pixels + layer structure + transforms) ==========
  const captureEntry = (pixelLayerId?: string): Sized<HistEntry> => {
    const entry: HistEntry = {
      layers: layersRef.current.map(l => ({ ...l })),
      scales: { ...layerScalesRef.current },
      rotations: { ...layerRotationsRef.current },
      activeId: activeLayerIdRef.current,
    }
    let bytes = 1024
    if (pixelLayerId) {
      const layer = layersRef.current.find(l => l.id === pixelLayerId)
      const ctx = layer?.canvas.getContext('2d', { willReadFrequently: true })
      if (layer && ctx) {
        try {
          const imageData = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)
          entry.pixels = { layerId: layer.id, imageData }
          bytes += imageData.data.byteLength
        } catch { /* canvas too large to read */ }
      }
    }
    return { entry, bytes }
  }

  const restoreEntry = (e: HistEntry) => {
    const list = e.layers.map(l => ({ ...l }))
    layersRef.current = list
    setLayers(list.map(l => ({ ...l })))
    layerScalesRef.current = { ...e.scales }; setLayerScales({ ...e.scales })
    layerRotationsRef.current = { ...e.rotations }; setLayerRotations({ ...e.rotations })
    if (e.pixels) {
      const layer = list.find(l => l.id === e.pixels!.layerId)
      layer?.canvas.getContext('2d')?.putImageData(e.pixels.imageData, 0, 0)
    }
    const active = list.find(l => l.id === e.activeId) ?? list[0]
    if (active) selectLayer(active.id)
    composite()
  }

  /**
   * Call BEFORE a change. `withPixels` (default) snapshots the active layer's pixels and
   * then bakes any pending scale/rotation so the tool can paint in plain layer coordinates.
   */
  const saveHistory = useCallback((withPixels = true) => {
    flushFeather() // finish a pending soft-selection edit before this one starts
    const layer = getActiveLayer()
    const { entry, bytes } = captureEntry(withPixels && layer ? layer.id : undefined)
    historyMgr.current.push(entry, bytes)
    if (withPixels && layer) bakeLayerTransform(layer)
  }, [])

  const undo = () => {
    flushFeather()
    const e = historyMgr.current.undo(t => captureEntry(t.pixels?.layerId))
    if (e) restoreEntry(e)
  }

  const redo = () => {
    flushFeather()
    const e = historyMgr.current.redo(t => captureEntry(t.pixels?.layerId))
    if (e) restoreEntry(e)
  }

  const clearCanvas = () => {
    const layer = getActiveLayer()
    if (!layer || layer.locked) return
    saveHistory()
    const ctx = layer.canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    }
    composite()
  }

  // ---- selection helpers (clip any drawing to the current selection) ----
  // A selection with feather > 0 or anti-alias off can't be a plain clip. While an edit is in
  // progress we clip to its (padded) bounding box and remember the untouched pixels; when the edit
  // ends, flushFeather() blends  old * (1 - mask) + new * mask  using the real soft mask.
  const featherSnap = useRef<{
    canvas: HTMLCanvasElement; snap: HTMLCanvasElement
    region: { x: number; y: number; w: number; h: number }
    sel: Selection; offsetX: number; offsetY: number; dpr: number
  } | null>(null)

  const featherBegin = (layer: Layer, sel: Selection) => {
    const cur = featherSnap.current
    if (cur && cur.canvas === layer.canvas && cur.sel === sel) return
    flushFeather()
    const dpr = dprRef.current
    const m = selectionMargin(sel, dpr)
    const x0 = Math.max(0, Math.floor(sel.x * dpr - layer.offsetX) - m)
    const y0 = Math.max(0, Math.floor(sel.y * dpr - layer.offsetY) - m)
    const x1 = Math.min(layer.canvas.width, Math.ceil((sel.x + sel.w) * dpr - layer.offsetX) + m)
    const y1 = Math.min(layer.canvas.height, Math.ceil((sel.y + sel.h) * dpr - layer.offsetY) + m)
    if (x1 <= x0 || y1 <= y0) return
    const region = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
    const snap = document.createElement('canvas')
    snap.width = region.w; snap.height = region.h
    snap.getContext('2d')!.drawImage(layer.canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h)
    featherSnap.current = { canvas: layer.canvas, snap, region, sel, offsetX: layer.offsetX, offsetY: layer.offsetY, dpr }
  }

  /** Apply the soft selection mask to whatever was painted since featherBegin(). */
  const flushFeather = () => {
    const f = featherSnap.current
    if (!f) return
    featherSnap.current = null
    const ctx = f.canvas.getContext('2d')
    if (!ctx) return
    const { region: r } = f
    const alpha = buildSelectionMask(f.sel, r, f.offsetX, f.offsetY, f.dpr)
    const rgba = new Uint8ClampedArray(r.w * r.h * 4)
    for (let i = 0; i < alpha.length; i++) rgba[i * 4 + 3] = alpha[i]
    const mask = document.createElement('canvas')
    mask.width = r.w; mask.height = r.h
    mask.getContext('2d')!.putImageData(new ImageData(rgba, r.w, r.h), 0, 0)
    // old * (1 - mask)
    const keep = document.createElement('canvas')
    keep.width = r.w; keep.height = r.h
    const kc = keep.getContext('2d')!
    kc.drawImage(f.snap, 0, 0)
    kc.globalCompositeOperation = 'destination-out'
    kc.drawImage(mask, 0, 0)
    // new * mask
    const paint = document.createElement('canvas')
    paint.width = r.w; paint.height = r.h
    const pc = paint.getContext('2d')!
    pc.drawImage(f.canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
    pc.globalCompositeOperation = 'destination-in'
    pc.drawImage(mask, 0, 0)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(r.x, r.y, r.w, r.h)
    ctx.drawImage(keep, r.x, r.y)
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(paint, r.x, r.y)
    ctx.restore()
    composite()
  }

  /** Caller must have called ctx.save(); applies the selection as clip in layer coordinates. */
  const applySelClip = (ctx: CanvasRenderingContext2D, layer: Layer) => {
    const sel = selectionRef.current
    if (!sel) return
    const dpr = dprRef.current
    ctx.translate(-layer.offsetX, -layer.offsetY)
    ctx.scale(dpr, dpr)
    if (selectionNeedsMask(sel)) {
      featherBegin(layer, sel)
      const m = selectionMargin(sel, dpr) / dpr
      const box = new Path2D()
      box.rect(sel.x - m, sel.y - m, sel.w + m * 2, sel.h + m * 2)
      ctx.clip(box)
    } else {
      ctx.clip(selectionPath(sel))
    }
    ctx.scale(1 / dpr, 1 / dpr)
    ctx.translate(layer.offsetX, layer.offsetY)
  }

  /** putImageData that respects the selection (putImageData itself ignores clip). */
  const putImageDataSel = (ctx: CanvasRenderingContext2D, img: ImageData, dx: number, dy: number, layer: Layer) => {
    if (!selectionRef.current) { ctx.putImageData(img, dx, dy); return }
    const tmp = document.createElement('canvas')
    tmp.width = img.width; tmp.height = img.height
    tmp.getContext('2d')!.putImageData(img, 0, 0)
    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    applySelClip(ctx, layer)
    ctx.clearRect(dx, dy, img.width, img.height)
    ctx.drawImage(tmp, dx, dy)
    ctx.restore()
  }

  const deleteSelection = () => {
    const layer = getActiveLayer()
    if (!selectionRef.current || !layer || layer.locked) return
    saveHistory()
    const ctx = layer.canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    applySelClip(ctx, layer)
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
    ctx.restore()
    flushFeather()
    composite()
  }

  const download = () => {
    flushFeather()
    const d = docRef.current
    const dpr = dprRef.current
    const full = document.createElement('canvas')
    full.width = Math.floor(d.width * dpr)
    full.height = Math.floor(d.height * dpr)
    const ctx = full.getContext('2d')!
    const bg = getBgColor(d.bg, d.bgColor)
    if (bg !== 'transparent') {
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, full.width, full.height)
    }
    for (let i = layersRef.current.length - 1; i >= 0; i--) {
      const layer = layersRef.current[i]
      if (!layer.visible) continue
      ctx.globalAlpha = layer.opacity
      const sc = layerScalesRef.current[layer.id] || { sx: 1, sy: 1 }
      const rot = layerRotationsRef.current[layer.id] || 0
      const w = layer.canvas.width * sc.sx
      const h = layer.canvas.height * sc.sy
      if (rot === 0) {
        ctx.drawImage(layer.canvas, layer.offsetX, layer.offsetY, w, h)
      } else {
        ctx.save()
        ctx.translate(layer.offsetX + w / 2, layer.offsetY + h / 2)
        ctx.rotate((rot * Math.PI) / 180)
        ctx.drawImage(layer.canvas, -w / 2, -h / 2, w, h)
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
    // export at the real document size (not devicePixelRatio-multiplied)
    let out = full
    if (full.width !== d.width || full.height !== d.height) {
      out = document.createElement('canvas')
      out.width = d.width
      out.height = d.height
      const octx = out.getContext('2d')!
      octx.imageSmoothingQuality = 'high'
      octx.drawImage(full, 0, 0, d.width, d.height)
    }
    const safeName = (d.name || 'artwork').replace(/[\\/:*?"<>|]+/g, '_')
    out.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `${safeName}-${Date.now()}.png`
      link.href = url
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    }, 'image/png')
  }

  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return '255,255,255'
    return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
  }

  // Draw on active layer
  const smudgeAt = useCallback((x: number, y: number, prevX: number, prevY: number, radius: number) => {
    const layer = getActiveLayer()
    if (!layer || layer.locked) return
    const ctx = layer.canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const lx = x - layer.offsetX
    const ly = y - layer.offsetY
    const plx = prevX - layer.offsetX
    const ply = prevY - layer.offsetY
    const r = Math.max(2, Math.floor(radius))
    const sz = r * 2
    const strength = Math.max(0.05, Math.min(1, smudgeStrength / 100))

    try {
      // Sample source: current layer or flattened display
      let sample: ImageData
      if (smudgeSampleAll && displayRef.current) {
        const dctx = displayRef.current.getContext('2d', { willReadFrequently: true })
        if (!dctx) return
        sample = dctx.getImageData(Math.floor(prevX - r), Math.floor(prevY - r), sz, sz)
      } else {
        sample = ctx.getImageData(Math.floor(plx - r), Math.floor(ply - r), sz, sz)
      }

      // Finger Painting: mix foreground color into sample
      if (smudgeFingerPaint) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color)
        const fr = result ? parseInt(result[1], 16) : 255
        const fg = result ? parseInt(result[2], 16) : 255
        const fb = result ? parseInt(result[3], 16) : 255
        const mix = 0.25 + strength * 0.35
        const data = sample.data
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) {
            data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = Math.round(mix * 255)
          } else {
            data[i] = Math.round(data[i] * (1 - mix) + fr * mix)
            data[i + 1] = Math.round(data[i + 1] * (1 - mix) + fg * mix)
            data[i + 2] = Math.round(data[i + 2] * (1 - mix) + fb * mix)
          }
        }
      }

      ctx.save()
      applySelClip(ctx, layer)
      ctx.globalAlpha = strength
      ctx.beginPath()
      ctx.arc(lx, ly, r, 0, Math.PI * 2)
      ctx.clip()
      const tmp = getScratch(sz, sz)
      const tctx = tmp.getContext('2d')
      if (tctx) {
        tctx.putImageData(sample, 0, 0)
        // soft edge
        tctx.globalCompositeOperation = 'destination-in'
        const g = tctx.createRadialGradient(r, r, r * 0.3, r, r, r)
        g.addColorStop(0, 'rgba(0,0,0,1)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        tctx.fillStyle = g
        tctx.fillRect(0, 0, sz, sz)
        ctx.drawImage(tmp, lx - r, ly - r)
      }
      ctx.restore()
    } catch {
      // OOB
    }
  }, [smudgeStrength, smudgeFingerPaint, smudgeSampleAll, color])

  const dodgeAt = useCallback((x: number, y: number, radius: number, burn: boolean) => {
    const layer = getActiveLayer()
    if (!layer || layer.locked) return
    const ctx = layer.canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    const lx = Math.floor(x - layer.offsetX)
    const ly = Math.floor(y - layer.offsetY)
    const r = Math.max(2, Math.floor(radius))
    const sz = r * 2
    const hard = dodgeHardness / 100
    const exposure = Math.max(0.02, Math.min(1, dodgeExposure / 100))
    const range = dodgeRange
    const protect = dodgeProtectTones
    try {
      const img = ctx.getImageData(lx - r, ly - r, sz, sz)
      const data = img.data
      for (let py = 0; py < sz; py++) {
        for (let px = 0; px < sz; px++) {
          const dist = Math.hypot(px - r, py - r)
          if (dist > r) continue
          // hardness: soft falloff outside hard core
          const t = dist / r
          const falloff = hard >= 0.97 ? 1 : Math.max(0, 1 - Math.pow(t, 1 + hard * 3))
          if (falloff <= 0) continue
          const i = (py * sz + px) * 4
          if (data[i + 3] === 0) continue
          const R = data[i], G = data[i + 1], B = data[i + 2]
          // luminosity 0–1
          const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255
          // Range mask
          let mask = 1
          if (range === 'shadows') mask = Math.max(0, 1 - lum * 1.5)
          else if (range === 'highlights') mask = Math.max(0, (lum - 0.35) / 0.65)
          else mask = 1 - Math.abs(lum - 0.5) * 2 // midtones peak at 0.5
          mask = Math.max(0, Math.min(1, mask))
          if (mask <= 0.01) continue
          let f = exposure * falloff * mask * 0.35
          let nr = R, ng = G, nb = B
          if (burn) {
            nr = R * (1 - f)
            ng = G * (1 - f)
            nb = B * (1 - f)
          } else {
            nr = R + (255 - R) * f
            ng = G + (255 - G) * f
            nb = B + (255 - B) * f
          }
          if (protect) {
            // keep hue/sat roughly: blend toward luminance-scaled original chroma
            const oldL = lum * 255
            const newL = 0.299 * nr + 0.587 * ng + 0.114 * nb
            if (oldL > 1) {
              const scale = newL / oldL
              // mix protected chroma with pure luminance change
              const pr = R * scale
              const pg = G * scale
              const pb = B * scale
              nr = nr * 0.35 + pr * 0.65
              ng = ng * 0.35 + pg * 0.65
              nb = nb * 0.35 + pb * 0.65
            }
          }
          data[i] = Math.max(0, Math.min(255, Math.round(nr)))
          data[i + 1] = Math.max(0, Math.min(255, Math.round(ng)))
          data[i + 2] = Math.max(0, Math.min(255, Math.round(nb)))
        }
      }
      putImageDataSel(ctx, img, lx - r, ly - r, layer)
    } catch {
      // OOB
    }
  }, [dodgeHardness, dodgeExposure, dodgeRange, dodgeProtectTones])

  const stampClone = useCallback((x: number, y: number, radius: number) => {
    const layer = getActiveLayer()
    if (!layer || layer.locked || !cloneSource.current || !cloneOrigin.current) return
    const ctx = layer.canvas.getContext('2d')
    if (!ctx) return
    const src = cloneSource.current
    const origin = cloneOrigin.current

    // Aligned: fixed offset from first paint after setting source
    // Non-aligned: offset relative to start of current stroke
    let sampleX: number
    let sampleY: number
    if (cloneAligned) {
      if (!cloneAlignedOffset.current) {
        cloneAlignedOffset.current = { dx: src.x - origin.x, dy: src.y - origin.y }
      }
      const off = cloneAlignedOffset.current
      sampleX = x + off.dx
      sampleY = y + off.dy
    } else {
      sampleX = src.x + (x - origin.x)
      sampleY = src.y + (y - origin.y)
    }

    const lx = x - layer.offsetX
    const ly = y - layer.offsetY
    // source coords relative to destination layer buffer when sampling current layer
    const sxLayer = sampleX - layer.offsetX
    const syLayer = sampleY - layer.offsetY

    const hard = hardness / 100
    const sizePx = Math.max(2, radius * 2)

    // Build source image (current layer or flattened)
    let sourceCanvas: HTMLCanvasElement | HTMLCanvasElement = layer.canvas
    let srcDrawX = sxLayer - radius
    let srcDrawY = syLayer - radius

    if (cloneSample === 'all') {
      const display = displayRef.current
      if (display) {
        sourceCanvas = display
        // display is full document buffer (no layer offset)
        srcDrawX = sampleX - radius
        srcDrawY = sampleY - radius
      }
    }

    ctx.save()
    applySelClip(ctx, layer)
    ctx.globalAlpha = opacity

    // Soft edge via intermediate canvas when hardness < 100
    if (hard < 0.97) {
      const tmp = document.createElement('canvas')
      tmp.width = Math.ceil(sizePx)
      tmp.height = Math.ceil(sizePx)
      const tctx = tmp.getContext('2d')
      if (tctx) {
        try {
          tctx.drawImage(sourceCanvas, srcDrawX, srcDrawY, sizePx, sizePx, 0, 0, sizePx, sizePx)
        } catch { /* OOB */ }
        // soft mask
        tctx.globalCompositeOperation = 'destination-in'
        const softEdge = Math.max(0.05, 1 - hard)
        const g = tctx.createRadialGradient(radius, radius, radius * (1 - softEdge), radius, radius, radius)
        g.addColorStop(0, 'rgba(0,0,0,1)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        tctx.fillStyle = g
        tctx.fillRect(0, 0, sizePx, sizePx)
        ctx.drawImage(tmp, lx - radius, ly - radius)
      }
    } else {
      ctx.beginPath()
      ctx.arc(lx, ly, radius, 0, Math.PI * 2)
      ctx.clip()
      try {
        ctx.drawImage(sourceCanvas, srcDrawX, srcDrawY, sizePx, sizePx, lx - radius, ly - radius, sizePx, sizePx)
      } catch { /* OOB */ }
    }

    ctx.restore()
    ctx.globalAlpha = 1

    // Update source indicator position when aligned (follows sampling point)
    if (cloneAligned) {
      cloneMarkerPos.current = { x: sampleX, y: sampleY }
      if (!cloneMarkerRaf.current) {
        cloneMarkerRaf.current = requestAnimationFrame(() => {
          cloneMarkerRaf.current = 0
          setCloneSourceScreen(cloneMarkerPos.current)
        })
      }
    }
  }, [opacity, hardness, cloneAligned, cloneSample])

  const drawDab = useCallback((x: number, y: number, radius: number) => {
    const layer = getActiveLayer()
    if (!layer || layer.locked) return
    const ctx = layer.canvas.getContext('2d')
    if (!ctx) return

    const lx = x - layer.offsetX
    const ly = y - layer.offsetY
    ctx.save()
    applySelClip(ctx, layer)

    const isPencilBrush = tool === 'brush' && groupActiveIdRef.current['brush'] === 'pencil'
    const isEraser = tool === 'eraser'
    const mode = isEraser ? ((eraserSettings as any).eraserMode || 'brush') : 'brush'
    // Block eraser = square hard; pencil eraser = hard round; brush = soft/hard by hardness
    let hard = hardness / 100
    if (isPencilBrush || (isEraser && mode === 'pencil')) hard = 1
    if (isEraser && mode === 'block') hard = 1
    const dabAlpha = Math.max(0.01, Math.min(1, opacity * (flow / 100)))

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.globalAlpha = dabAlpha
    } else {
      ctx.globalCompositeOperation = (blendMode as GlobalCompositeOperation) || 'source-over'
      ctx.globalAlpha = dabAlpha
    }

    const fillColor = isEraser ? '#000000' : color

    if (isEraser && mode === 'block') {
      const s = radius * 2
      ctx.fillStyle = fillColor
      ctx.fillRect(lx - radius, ly - radius, s, s)
    } else if (hard >= 0.97) {
      ctx.beginPath()
      ctx.arc(lx, ly, radius, 0, Math.PI * 2)
      ctx.fillStyle = fillColor
      ctx.fill()
    } else {
      const softEdge = Math.max(0.05, 1 - hard)
      const gradient = ctx.createRadialGradient(lx, ly, radius * (1 - softEdge), lx, ly, radius)
      const col = isEraser ? '0,0,0' : hexToRgb(fillColor)
      gradient.addColorStop(0, `rgba(${col}, 1)`)
      gradient.addColorStop(1, `rgba(${col}, 0)`)
      ctx.beginPath()
      ctx.arc(lx, ly, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
    }
    ctx.restore()
  }, [tool, color, opacity, hardness, flow, blendMode, eraserSettings])

  // Preview — matches real brush (color, hardness, spacing, opacity, size)
  const updatePreview = useCallback(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width, h = canvas.height

    // Background similar to canvas area
    ctx.fillStyle = theme === 'dark' ? '#2a2f3a' : '#d0d5dd'
    ctx.fillRect(0, 0, w, h)

    const previewSize = Math.min(Math.max(size, 1), 50)
    const hard = hardness / 100
    const brushColor = color

    // Build a smooth stroke path (constant pressure 1 for clear preview of tip shape)
    const points: { x: number; y: number }[] = []
    for (let i = 0; i <= 80; i++) {
      const t = i / 80
      points.push({
        x: 24 + t * (w - 48),
        y: h / 2 + Math.sin(t * Math.PI * 2) * (h * 0.2)
      })
    }

    let lastX = points[0].x, lastY = points[0].y
    // Place first dab
    const placeDab = (x: number, y: number, r: number) => {
      ctx.globalAlpha = opacity
      if (hard >= 0.97) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = brushColor
        ctx.fill()
      } else {
        const softEdge = Math.max(0.05, 1 - hard)
        const g = ctx.createRadialGradient(x, y, r * (1 - softEdge), x, y, r)
        const rgb = (() => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(brushColor)
          if (!result) return '255,255,255'
          return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`
        })()
        g.addColorStop(0, `rgba(${rgb}, 1)`)
        g.addColorStop(1, `rgba(${rgb}, 0)`)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    const r = previewSize / 2
    const minDist = Math.max(0.5, previewSize * (spacing / 100))
    placeDab(lastX, lastY, r)

    for (let i = 1; i < points.length; i++) {
      const pt = points[i]
      const dx = pt.x - lastX
      const dy = pt.y - lastY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist >= minDist) {
        const steps = Math.floor(dist / minDist)
        for (let s = 1; s <= steps; s++) {
          const ratio = (s * minDist) / dist
          placeDab(lastX + dx * ratio, lastY + dy * ratio, r)
        }
        const lastRatio = (steps * minDist) / dist
        lastX = lastX + dx * lastRatio
        lastY = lastY + dy * lastRatio
      }
    }
  }, [size, hardness, spacing, opacity, color, theme])

  // Run preview when settings change OR when brush panel becomes visible
  useEffect(() => {
    if (panelTab === 'brush' && showSettings && docCreated) {
      // small delay so canvas is mounted
      const t = requestAnimationFrame(() => updatePreview())
      return () => cancelAnimationFrame(t)
    }
  }, [updatePreview, panelTab, showSettings, docCreated])

  const getPressureFromVelocity = useCallback((speed: number): number => {
    const maxSpeed = 1.6
    const normalized = Math.min(speed / maxSpeed, 1)
    let pressure = 1 - normalized
    pressure = Math.pow(pressure, 1 / Math.max(velocitySensitivity, 0.25))
    return Math.max(0.12, Math.min(1, pressure))
  }, [velocitySensitivity])

  const getPos = (e: React.PointerEvent | PointerEvent) => {
    const canvas = displayRef.current!
    const rect = canvas.getBoundingClientRect()
    const dpr = dprRef.current
    // rect already reflects CSS transform scale — map visual → buffer pixels
    const docW = canvas.width / dpr
    const docH = canvas.height / dpr
    return {
      x: ((e.clientX - rect.left) / Math.max(rect.width, 1)) * docW * dpr,
      y: ((e.clientY - rect.top) / Math.max(rect.height, 1)) * docH * dpr,
    }
  }

  // Zoom
  const zoomBy = useCallback((clientX: number, clientY: number, factor: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const mouseX = clientX - rect.left
    const mouseY = clientY - rect.top
    const oldScale = scaleRef.current
    const newScale = Math.min(10, Math.max(0.05, oldScale * factor))
    const off = offsetRef.current
    setScale(newScale)
    setOffset({
      x: mouseX - (mouseX - off.x) * (newScale / oldScale),
      y: mouseY - (mouseY - off.y) * (newScale / oldScale)
    })
  }, [])

  // delta > 0 zooms out, delta < 0 zooms in (fixed step)
  const zoomAt = useCallback((clientX: number, clientY: number, delta: number) => {
    zoomBy(clientX, clientY, delta > 0 ? 0.9 : 1.11)
  }, [zoomBy])

  const zoomIn = () => {
    const c = containerRef.current; if (!c) return
    const r = c.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, -1)
  }
  const zoomOut = () => {
    const c = containerRef.current; if (!c) return
    const r = c.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1)
  }
  const resetView = () => fitToView()

  const setZoomPercent = (percent: number) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const target = Math.min(10, Math.max(0.05, percent / 100))
    const oldScale = scaleRef.current
    if (Math.abs(target - oldScale) < 0.001) return
    const off = offsetRef.current
    const mouseX = cx - rect.left
    const mouseY = cy - rect.top
    setScale(target)
    setOffset({
      x: mouseX - (mouseX - off.x) * (target / oldScale),
      y: mouseY - (mouseY - off.y) * (target / oldScale),
    })
  }

  const zoomToActual = () => setZoomPercent(100)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 0.05 : e.deltaMode === 2 ? 0.5 : 0.0015 // lines / pages / px
      const factor = Math.min(2, Math.max(0.5, Math.exp(-e.deltaY * unit)))
      zoomBy(e.clientX, e.clientY, factor)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  // Photoshop-style label scrub: drag label left/right to change nearby number/range
  useEffect(() => {
    let active = false
    let startX = 0
    let startVal = 0
    let min = 0
    let max = 100
    let step = 1
    let isFloat = false
    let inputEl: HTMLInputElement | null = null
    let sensitivity = 1

    const findInput = (label: Element): HTMLInputElement | null => {
      const parent = label.closest('.control, .opt, .input-row') || label.parentElement
      if (!parent) return null
      // Prefer number in same control, then range
      const num = parent.querySelector('input[type="number"]') as HTMLInputElement | null
      if (num) return num
      const range = parent.querySelector('input[type="range"]') as HTMLInputElement | null
      if (range) return range
      // sibling after label
      let sib = label.nextElementSibling
      while (sib) {
        if (sib instanceof HTMLInputElement && (sib.type === 'number' || sib.type === 'range')) return sib
        const inner = sib.querySelector('input[type="number"], input[type="range"]') as HTMLInputElement | null
        if (inner) return inner
        sib = sib.nextElementSibling
      }
      return null
    }

    const isScrubLabel = (el: Element | null): el is Element => {
      if (!el) return false
      // Panel control labels (not checkbox wrappers)
      if (el.matches('.control > label') && !el.querySelector('input[type="checkbox"]') && !el.querySelector('select')) return true
      // Options bar spans (first child text labels)
      if (el.matches('.opt > span:first-child') && !el.parentElement?.classList.contains('check') && !el.parentElement?.classList.contains('color')) return true
      return false
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const t = e.target as Element
      const label = t.closest('.control > label, .opt > span:first-child') as Element | null
      if (!label || !isScrubLabel(label)) return
      // Don't start scrub if clicking inside an input
      if ((e.target as Element).closest('input, select, button, textarea')) return
      const input = findInput(label)
      if (!input) return
      e.preventDefault()
      e.stopPropagation()
      inputEl = input
      startX = e.clientX
      startVal = parseFloat(input.value) || 0
      min = input.min !== '' ? parseFloat(input.min) : -Infinity
      max = input.max !== '' ? parseFloat(input.max) : Infinity
      step = input.step !== '' && input.step !== 'any' ? parseFloat(input.step) : 1
      isFloat = step < 1 || String(input.value).includes('.')
      // sensitivity: for large ranges move faster relative to pixel
      const span = (isFinite(max) && isFinite(min)) ? (max - min) : 100
      sensitivity = Math.max(step, span / 200)
      active = true
      document.body.classList.add('scrubbing')
      try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId) } catch {}
    }

    const onMove = (e: PointerEvent) => {
      if (!active || !inputEl) return
      const dx = e.clientX - startX
      // RTL: still increase to the right visually for consistency with Photoshop
      let next = startVal + dx * sensitivity
      if (e.shiftKey) next = startVal + dx * sensitivity * 0.1 // fine control
      if (e.altKey) next = startVal + dx * sensitivity * 5 // coarse
      // snap to step
      if (step > 0 && isFinite(step)) {
        next = Math.round(next / step) * step
      }
      next = Math.min(max, Math.max(min, next))
      if (!isFloat) next = Math.round(next)
      else next = Math.round(next * 1000) / 1000
      const str = String(next)
      if (str === inputEl.value) return
      // React controlled-input sync
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
      const last = inputEl.value
      proto?.set?.call(inputEl, str)
      const tracker = (inputEl as any)._valueTracker
      if (tracker) tracker.setValue(last)
      inputEl.dispatchEvent(new Event('input', { bubbles: true }))
      inputEl.dispatchEvent(new Event('change', { bubbles: true }))
    }

    const onUp = () => {
      if (!active) return
      active = false
      inputEl = null
      document.body.classList.remove('scrubbing')
    }

    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      document.body.classList.remove('scrubbing')
    }
  }, [])

  // Pointer

  // Layer bounds in document pixels
  const getLayerBounds = (layer: Layer) => {
    const dpr = dprRef.current
    const sc = layerScalesRef.current[layer.id] || { sx: 1, sy: 1 }
    return {
      x: layer.offsetX / dpr,
      y: layer.offsetY / dpr,
      w: (layer.canvas.width * sc.sx) / dpr,
      h: (layer.canvas.height * sc.sy) / dpr,
    }
  }

  // Convert document px to container screen px
  const docToScreen = (dx: number, dy: number) => {
    const canvas = displayRef.current
    if (!canvas) return { x: 0, y: 0 }
    // canvas is inside transform div
    // use render-time state (refs are only synced after render, which made overlays lag one frame)
    return { x: offset.x + dx * scale, y: offset.y + dy * scale }
  }


  const applyCrop = useCallback(() => {
    const rect = cropRectRef.current
    if (!rect || rect.w < 2 || rect.h < 2) return
    const dpr = dprRef.current
    const angle = cropStraighten
    const newDocW = Math.max(1, Math.round(rect.w))
    const newDocH = Math.max(1, Math.round(rect.h))
    const cw = Math.round(rect.w * dpr)
    const ch = Math.round(rect.h * dpr)
    const cx = rect.x * dpr
    const cy = rect.y * dpr

    // Soft crop: keep all pixels, only set viewport
    if (!cropDeletePixels) {
      setSoftCrop({ x: rect.x, y: rect.y, w: rect.w, h: rect.h })
      setCropRect(null)
      setCropStraighten(0)
      return
    }

    // bake pending scale/rotation so the crop sees the real pixels
    layersRef.current.forEach(bakeLayerTransform)

    const newLayers = layersRef.current.map(layer => {
      const newCanvas = document.createElement('canvas')
      newCanvas.width = cw
      newCanvas.height = ch
      const nctx = newCanvas.getContext('2d')
      if (nctx) {
        if (angle !== 0) {
          // straighten: rotate around crop center then sample crop region
          const full = document.createElement('canvas')
          full.width = layer.canvas.width
          full.height = layer.canvas.height
          const fctx = full.getContext('2d')
          if (fctx) {
            fctx.translate(full.width / 2, full.height / 2)
            fctx.rotate((-angle * Math.PI) / 180)
            fctx.translate(-full.width / 2, -full.height / 2)
            fctx.drawImage(layer.canvas, 0, 0)
            nctx.drawImage(
              full,
              cx - layer.offsetX,
              cy - layer.offsetY,
              cw,
              ch,
              0, 0, cw, ch
            )
          }
        } else {
          nctx.drawImage(
            layer.canvas,
            cx - layer.offsetX,
            cy - layer.offsetY,
            cw,
            ch,
            0, 0, cw, ch
          )
        }
      }
      return { ...layer, canvas: newCanvas, offsetX: 0, offsetY: 0 }
    })

    layersRef.current = newLayers
    setLayers(newLayers)
    setLayerScales({})
    layerScalesRef.current = {}
    setLayerRotations({})
    layerRotationsRef.current = {}
    setSelection(null)
    setCropRect(null)
    setSoftCrop(null)
    setCropStraighten(0)

    const newDoc = { ...docRef.current, width: newDocW, height: newDocH }
    docRef.current = newDoc
    setDoc(newDoc)

    const display = displayRef.current
    if (display) {
      display.width = cw
      display.height = ch
      display.style.width = newDocW + 'px'
      display.style.height = newDocH + 'px'
    }

    historyMgr.current.clear() // canvas size changed: older snapshots no longer fit
    requestAnimationFrame(() => {
      composite()
      fitToView(newDocW, newDocH)
    })
  }, [composite, fitToView, cropStraighten, cropDeletePixels])


  const alignActiveLayer = (dir: string) => {
    const layer = getActiveLayer()
    if (!layer || layer.locked) return
    const canvasW = docRef.current.width * dprRef.current
    const canvasH = docRef.current.height * dprRef.current
    const sc = layerScalesRef.current[layer.id] || { sx: 1, sy: 1 }
    const w = layer.canvas.width * sc.sx
    const h = layer.canvas.height * sc.sy
    let ox = layer.offsetX
    let oy = layer.offsetY
    if (dir === 'left') ox = 0
    if (dir === 'right') ox = canvasW - w
    if (dir === 'center-h') ox = (canvasW - w) / 2
    if (dir === 'top') oy = 0
    if (dir === 'bottom') oy = canvasH - h
    if (dir === 'center-v') oy = (canvasH - h) / 2
    saveHistory(false)
    const next = layersRef.current.map(l =>
      l.id === layer.id ? { ...l, offsetX: ox, offsetY: oy } : l
    )
    layersRef.current = next
    setLayers(next)
    composite()
  }


  const paintTextOnLayer = (
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    dpr: number,
  ) => {
    const size = fontSize * dpr
    const weight = textBold ? 'bold' : 'normal'
    ctx.font = `${weight} ${size}px ${fontFamily}, Vazirmatn, "Segoe UI", Tahoma, sans-serif`
    ctx.fillStyle = textColor
    ctx.globalAlpha = 1
    ctx.textBaseline = 'top'
    ctx.textAlign = textAlign
    ctx.direction = textAlign === 'left' ? 'ltr' : 'rtl'
    const spacing = letterSpacing * dpr
    // Native letter-spacing keeps Persian/Arabic letter joining intact (per-glyph drawing would break it)
    if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${spacing}px`
    const lh = size * lineHeight
    str.split('\n').forEach((line, li) => ctx.fillText(line, x, y + li * lh))
  }

  const textEditorRef = useRef(textEditor)
  textEditorRef.current = textEditor

  const commitText = () => {
    const te = textEditorRef.current
    textEditorRef.current = null // guards against a second commit from blur
    setTextEditor(null)
    if (!te || !te.value.trim()) return
    const layer = getActiveLayer()
    if (!layer || layer.locked) return
    saveHistory()
    const ctx = layer.canvas.getContext('2d')
    if (!ctx) return
    const dpr = dprRef.current
    ctx.save()
    applySelClip(ctx, layer)
    paintTextOnLayer(ctx, te.value, te.x * dpr - layer.offsetX, te.y * dpr - layer.offsetY, dpr)
    ctx.restore()
    flushFeather()
    composite()
  }


  const commitPenPath = useCallback(() => {
    const pts = [...penPointsRef.current]
    if (pts.length < 2) return
    const layer = getActiveLayer()
    if (!layer || layer.locked) return
    if (penMode === 'path') {
      // Path mode: convert to selection polygon (lasso-like)
      const xs = pts.map(p => p.x)
      const ys = pts.map(p => p.y)
      setSelection({
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
        shape: 'lasso',
        points: [...pts],
      })
      setPenPoints([])
      setPenCursorDoc(null)
      return
    }
    saveHistory()
    const ctx = layer.canvas.getContext('2d')
    if (!ctx) return
    const dpr = dprRef.current
    ctx.save()
    applySelClip(ctx, layer)
    ctx.globalAlpha = penOpacity
    ctx.strokeStyle = penColor
    ctx.fillStyle = penFillColor
    ctx.lineWidth = Math.max(1, penStrokeWidth * dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0].x * dpr - layer.offsetX, pts[0].y * dpr - layer.offsetY)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x * dpr - layer.offsetX, pts[i].y * dpr - layer.offsetY)
    }
    const close = penAutoClose || penMode === 'shape' || penFill
    if (close) ctx.closePath()
    if (penMode === 'shape' || penFill) ctx.fill()
    ctx.stroke()
    ctx.restore()
    flushFeather()
    composite()
    setPenPoints([])
    setPenCursorDoc(null)
  }, [penMode, penColor, penFillColor, penStrokeWidth, penAutoClose, penFill, penOpacity, composite, saveHistory])

  // One stroke segment (called per coalesced pointer event). Returns true if dabs were drawn.
  const strokeStep = (ev: PointerEvent): boolean => {
    const prev = lastPoint.current
    const lastDab = lastDabPos.current
    if (!prev || !lastDab) return false
    const pos = getPos(ev)
    lastRawPos.current = pos
    const now = ev.timeStamp || performance.now()
    const dx = pos.x - prev.x, dy = pos.y - prev.y
    const dist = Math.hypot(dx, dy)
    if (dist < 0.2) return false
    const dt = Math.max(now - prev.time, 1)
    const dpr = dprRef.current
    // speed in *screen* px/ms so velocity-pressure does not depend on zoom level or devicePixelRatio
    const speed = ((dist / dpr) * scaleRef.current) / dt

    let pressure: number
    if (ev.pointerType === 'pen' && ev.pressure > 0) pressure = ev.pressure
    else if (velocityPressure) pressure = getPressureFromVelocity(speed)
    else pressure = 0.8

    const t = 1 - Math.min(Math.max(stabilizer, 0), 0.9)
    const smoothedX = prev.x + (pos.x - prev.x) * t
    const smoothedY = prev.y + (pos.y - prev.y) * t
    const smoothedPressure = prev.pressure * 0.3 + pressure * 0.7
    const point: Point = { x: smoothedX, y: smoothedY, pressure: smoothedPressure, time: now }

    const currentSize = size * dpr * (minSizeRatio + (1 - minSizeRatio) * smoothedPressure)
    const minDistance = Math.max(0.5, currentSize * (spacing / 100))
    const dxDab = point.x - lastDab.x, dyDab = point.y - lastDab.y
    const distFromLastDab = Math.hypot(dxDab, dyDab)
    let drew = false
    if (distFromLastDab >= minDistance) {
      const steps = Math.floor(distFromLastDab / minDistance)
      for (let i = 1; i <= steps; i++) {
        const ratio = (i * minDistance) / distFromLastDab
        const p = prev.pressure + (smoothedPressure - prev.pressure) * ratio
        const r = (size * dpr * (minSizeRatio + (1 - minSizeRatio) * p)) / 2
        drawDab(lastDab.x + dxDab * ratio, lastDab.y + dyDab * ratio, r)
      }
      const lastRatio = (steps * minDistance) / distFromLastDab
      lastDabPos.current = { x: lastDab.x + dxDab * lastRatio, y: lastDab.y + dyDab * lastRatio }
      drew = true
    }
    lastPoint.current = point
    return drew
  }

  // The stabilizer lags behind the cursor; on release, finish the stroke up to the real pointer position.
  const flushStroke = () => {
    const last = lastDabPos.current, raw = lastRawPos.current, lp = lastPoint.current
    if (!last || !raw || !lp) return
    const dpr = dprRef.current
    const r = (size * dpr * (minSizeRatio + (1 - minSizeRatio) * lp.pressure)) / 2
    const minDistance = Math.max(0.5, r * 2 * (spacing / 100))
    const dx = raw.x - last.x, dy = raw.y - last.y
    const dist = Math.hypot(dx, dy)
    const steps = Math.floor(dist / minDistance)
    for (let i = 1; i <= steps; i++) {
      const k = (i * minDistance) / dist
      drawDab(last.x + dx * k, last.y + dy * k, r)
    }
    if (steps > 0) composite()
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const canvas = displayRef.current
    if (!canvas || !docCreated) return

    // Hand tool or middle mouse or Space = pan viewport
    if (tool === 'hand' || e.button === 1 || spacePressed.current || e.buttons === 4) {
      isPanning.current = true
      lastPanPos.current = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
      return
    }
    // Zoom tool
    if (tool === 'zoom') {
      if (e.altKey) zoomAt(e.clientX, e.clientY, 1)
      else zoomAt(e.clientX, e.clientY, -1)
      return
    }
    if (e.button !== 0) return

    // Eyedropper — sample color from display
    if (tool === 'eyedropper') {
      const pos = getPos(e)
      const sampleN = eyedropperSample
      const half = Math.floor(sampleN / 2)
      let srcCanvas: HTMLCanvasElement | null = null
      let ox = 0, oy = 0
      if (eyedropperSource === 'current') {
        const layer = getActiveLayer()
        if (!layer) return
        srcCanvas = layer.canvas
        const loc = toLayerLocal(layer, pos.x, pos.y)
        ox = pos.x - loc.u
        oy = pos.y - loc.v
      } else {
        srcCanvas = displayRef.current
      }
      if (!srcCanvas) return
      const ctx = srcCanvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      const cx = Math.floor(pos.x - ox)
      const cy = Math.floor(pos.y - oy)
      let rSum = 0, gSum = 0, bSum = 0, count = 0
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const sx = cx + dx
          const sy = cy + dy
          if (sx < 0 || sy < 0 || sx >= srcCanvas.width || sy >= srcCanvas.height) continue
          try {
            const px = ctx.getImageData(sx, sy, 1, 1).data
            if (px[3] === 0) continue
            rSum += px[0]; gSum += px[1]; bSum += px[2]
            count++
          } catch { /* skip */ }
        }
      }
      if (count > 0) {
        const r = Math.round(rSum / count)
        const g = Math.round(gSum / count)
        const b = Math.round(bSum / count)
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
        setColor(hex)
        setTextColor(hex)
        setShapeFillColor(hex)
        setLastSampledColor(hex)
      }
      return
    }

    // Magic Wand — flood select by color (real pixel mask, not a bounding box)
    if (tool === 'wand') {
      const pos = getPos(e)
      const display = displayRef.current
      if (!display) return
      const ctx = display.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      const dpr = dprRef.current
      const sx = Math.floor(pos.x)
      const sy = Math.floor(pos.y)
      if (sx < 0 || sy < 0 || sx >= display.width || sy >= display.height) return
      const img = ctx.getImageData(0, 0, display.width, display.height)
      const res = floodMask(img, sx, sy, wandTolerance, wandContiguous)
      if (res) {
        const runs = maskToRuns(res.mask, display.width, display.height)
          .map(r => ({ x: r.x / dpr, y: r.y / dpr, w: r.w / dpr, h: r.h / dpr }))
        const next: Selection = {
          x: res.bounds.x / dpr, y: res.bounds.y / dpr, w: res.bounds.w / dpr, h: res.bounds.h / dpr,
          shape: 'wand', runs,
        }
        setSelection(combineSelections(selMode, selectionRef.current, next, docRef.current.width, docRef.current.height))
      } else if (selMode === 'new') {
        setSelection(null)
      }
      return
    }

    // Lasso selection
    if (tool === 'lasso') {
      canvas.setPointerCapture(e.pointerId)
      isSelecting.current = true
      selectionBeforeDrag.current = selectionRef.current
      const pos = getPos(e)
      const dpr = dprRef.current
      const pt = { x: pos.x / dpr, y: pos.y / dpr }
      lassoPoints.current = [pt]
      selectStart.current = pt
      setSelection({ x: pt.x, y: pt.y, w: 0, h: 0, shape: 'lasso', points: [pt] })
      return
    }

    // Marquee selection
    if (tool === 'marquee') {
      canvas.setPointerCapture(e.pointerId)
      isSelecting.current = true
      selectionBeforeDrag.current = selectionRef.current
      const pos = getPos(e)
      const dpr = dprRef.current
      selectStart.current = { x: pos.x / dpr, y: pos.y / dpr }
      const shape = marqueeShape.current
      if (marqueeStyle === 'fixed-size') {
        const sel = {
          x: pos.x / dpr,
          y: pos.y / dpr,
          w: marqueeFixedSize.w,
          h: marqueeFixedSize.h,
          shape,
        }
        pendingSelection.current = sel
        setSelection(sel)
      } else {
        setSelection({ x: pos.x / dpr, y: pos.y / dpr, w: 0, h: 0, shape })
      }
      return
    }

    // Paint Bucket
    if (tool === 'fill') {
      const layer = getActiveLayer()
      if (!layer || layer.locked) return
      const pos = getPos(e)
      const loc = toLayerLocal(layer, pos.x, pos.y)
      if (loc.u < 0 || loc.v < 0 || loc.u >= layer.canvas.width || loc.v >= layer.canvas.height) return
      saveHistory() // snapshots the layer and bakes any pending transform
      const lx = Math.floor(pos.x - layer.offsetX)
      const ly = Math.floor(pos.y - layer.offsetY)
      const W = layer.canvas.width, H = layer.canvas.height
      const ctx = layer.canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      const img = ctx.getImageData(0, 0, W, H)
      let sample: ImageData = img
      if (fillSampleAll && displayRef.current) {
        // match against what you see (all layers), paint into the active layer
        const tctx = getScratch(W, H).getContext('2d', { willReadFrequently: true })!
        tctx.drawImage(displayRef.current, -layer.offsetX, -layer.offsetY)
        sample = tctx.getImageData(0, 0, W, H)
      }
      const res = floodMask(sample, lx, ly, fillTolerance, fillContiguous)
      if (res) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color)
        const rgb: [number, number, number] = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
        applyFill(img, res.mask, [rgb[0], rgb[1], rgb[2], Math.round(opacity * 255)], fillBlendMode, fillAntiAlias)
        putImageDataSel(ctx, img, 0, 0, layer)
        flushFeather()
        composite()
      }
      return
    }

    // Gradient tool — start drag
    if (tool === 'gradient') {
      const layer = getActiveLayer()
      if (!layer || layer.locked) return
      canvas.setPointerCapture(e.pointerId)
      isGradient.current = true
      const pos = getPos(e)
      const dpr = dprRef.current
      gradientStart.current = { x: pos.x / dpr, y: pos.y / dpr }
      setGradientPreview({ x1: pos.x / dpr, y1: pos.y / dpr, x2: pos.x / dpr, y2: pos.y / dpr })
      return
    }

    // Clone Stamp
    if (tool === 'clone') {
      const pos = getPos(e)
      // Alt+click = set source
      if (e.altKey) {
        cloneSource.current = { x: pos.x, y: pos.y }
        cloneAlignedOffset.current = null // reset alignment offset
        setCloneHasSource(true)
        setCloneSourceScreen({ x: pos.x, y: pos.y })
        return
      }
      if (!cloneSource.current) return
      const layer = getActiveLayer()
      if (!layer || layer.locked) return
      canvas.setPointerCapture(e.pointerId)
      isCloning.current = true
      cloneOrigin.current = { x: pos.x, y: pos.y }
      saveHistory()
      // first dab
      const dpr = dprRef.current
      const r = (size * dpr) / 2
      stampClone(pos.x, pos.y, r)
      composite()
      return
    }

    // Smudge / Dodge
    if (tool === 'smudge' || tool === 'dodge') {
      const layer = getActiveLayer()
      if (!layer || layer.locked) return
      canvas.setPointerCapture(e.pointerId)
      isRetouching.current = true
      const pos = getPos(e)
      lastRetouchPos.current = { x: pos.x, y: pos.y }
      saveHistory()
      const dpr = dprRef.current
      const r = ((tool === 'smudge' ? smudgeSize : tool === 'dodge' ? dodgeSize : size) * dpr) / 2
      if (tool === 'dodge') dodgeAt(pos.x, pos.y, r, e.altKey)
      else if (tool === 'smudge') smudgeAt(pos.x, pos.y, pos.x, pos.y, r)
      composite()
      return
    }

    // Pen tool — click to add points
    if (tool === 'pen') {
      const pos = getPos(e)
      const dpr = dprRef.current
      const pt = { x: pos.x / dpr, y: pos.y / dpr }
      // click near first point = auto close
      if (penAutoClose && penPointsRef.current.length >= 2) {
        const first = penPointsRef.current[0]
        if (Math.hypot(pt.x - first.x, pt.y - first.y) < 8 / Math.max(scale, 0.1)) {
          commitPenPath()
          return
        }
      }
      if (e.detail >= 2 && penPointsRef.current.length >= 2) {
        commitPenPath()
        return
      }
      setPenPoints(prev => [...prev, pt])
      return
    }

    // Shape tool
    if (tool === 'shape') {
      const layer = getActiveLayer()
      if (!layer || layer.locked) return
      canvas.setPointerCapture(e.pointerId)
      isShaping.current = true
      const pos = getPos(e)
      const dpr = dprRef.current
      shapeStart.current = { x: pos.x / dpr, y: pos.y / dpr }
      setShapePreview({ x: pos.x / dpr, y: pos.y / dpr, w: 0, h: 0, kind: shapeKind.current })
      return
    }

    // Text tool — open editor at click
    if (tool === 'text') {
      const pos = getPos(e)
      const dpr = dprRef.current
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setTextEditor({
        x: pos.x / dpr,
        y: pos.y / dpr,
        screenX: e.clientX - rect.left,
        screenY: e.clientY - rect.top,
        value: '',
      })
      return
    }

    // Crop tool
    if (tool === 'crop') {
      canvas.setPointerCapture(e.pointerId)
      isCropping.current = true
      const pos = getPos(e)
      const dpr = dprRef.current
      cropStart.current = { x: pos.x / dpr, y: pos.y / dpr }
      setCropRect({ x: pos.x / dpr, y: pos.y / dpr, w: 0, h: 0 })
      return
    }

    // Move tool — drag active layer
    if (tool === 'move') {
      const pos = getPos(e)
      // Auto-Select: pick the topmost visible layer that has a painted pixel under the cursor
      if (autoSelectLayer) {
        for (const L of layersRef.current) {
          if (!L.visible || L.locked) continue
          if (layerHitTest(L, pos.x, pos.y)) {
            selectLayer(L.id)
            break
          }
        }
      }
      const layer = getActiveLayer()
      if (!layer || layer.locked) return
      canvas.setPointerCapture(e.pointerId)
      isMoving.current = true
      moveStart.current = { x: pos.x, y: pos.y }
      moveOriginOffset.current = { x: layer.offsetX, y: layer.offsetY }
      saveHistory(false)
      return
    }

    if (tool !== 'brush' && tool !== 'eraser') return

    const layer = getActiveLayer()
    if (!layer || layer.locked) return

    canvas.setPointerCapture(e.pointerId)
    isDrawing.current = true
    const pos = getPos(e)
    const now = performance.now()
    const pressure = (e.pointerType === 'pen' && e.pressure > 0) ? e.pressure : 0.8
    lastPoint.current = { x: pos.x, y: pos.y, pressure, time: now }
    lastDabPos.current = { x: pos.x, y: pos.y }
    lastRawPos.current = { x: pos.x, y: pos.y }
    saveHistory()
    const dpr = dprRef.current
    const r = (size * dpr * (minSizeRatio + (1 - minSizeRatio) * pressure)) / 2
    drawDab(pos.x, pos.y, r)
    composite()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    // Update cursor ring position (relative to container)
    const container = containerRef.current
    if (container) {
      const rect = container.getBoundingClientRect()
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setCursorOverCanvas(true)
    }

    if (isPanning.current && lastPanPos.current) {
      const dx = e.clientX - lastPanPos.current.x
      const dy = e.clientY - lastPanPos.current.y
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastPanPos.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Pen rubber-band cursor
    if (tool === 'pen' && penRubberBand) {
      const pos = getPos(e)
      const dpr = dprRef.current
      setPenCursorDoc({ x: pos.x / dpr, y: pos.y / dpr })
    }

    // Lasso / Marquee drag
    if (isSelecting.current && selectStart.current) {
      const pos = getPos(e)
      const dpr = dprRef.current
      const x2 = pos.x / dpr
      const y2 = pos.y / dpr

      if (tool === 'lasso') {
        const pts = lassoPoints.current
        const last = pts[pts.length - 1]
        const dist = Math.hypot(x2 - last.x, y2 - last.y)
        if (dist >= 2) {
          pts.push({ x: x2, y: y2 })
          const xs = pts.map(p => p.x)
          const ys = pts.map(p => p.y)
          const sel = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            w: Math.max(...xs) - Math.min(...xs),
            h: Math.max(...ys) - Math.min(...ys),
            shape: 'lasso' as const,
            points: [...pts],
          }
          pendingSelection.current = sel
          setSelection(sel)
        }
        return
      }

      const x1 = selectStart.current.x
      const y1 = selectStart.current.y
      let x = Math.min(x1, x2)
      let y = Math.min(y1, y2)
      let w = Math.abs(x2 - x1)
      let h = Math.abs(y2 - y1)
      if (marqueeStyle === 'fixed-size') {
        w = marqueeFixedSize.w
        h = marqueeFixedSize.h
        x = x2 < x1 ? x1 - w : x1
        y = y2 < y1 ? y1 - h : y1
      } else if (marqueeStyle === 'fixed-ratio') {
        const ratio = marqueeRatio.w / Math.max(0.001, marqueeRatio.h)
        if (w / Math.max(0.001, h) > ratio) {
          w = h * ratio
        } else {
          h = w / ratio
        }
        if (x2 < x1) x = x1 - w
        if (y2 < y1) y = y1 - h
      } else if (e.shiftKey) {
        const s = Math.max(w, h)
        w = s
        h = s
        if (x2 < x1) x = x1 - s
        if (y2 < y1) y = y1 - s
      }
      const sel = { x, y, w, h, shape: marqueeShape.current }
      pendingSelection.current = sel
      setSelection(sel)
      return
    }

    // Smudge / Dodge drag
    if (isRetouching.current && lastRetouchPos.current) {
      const pos = getPos(e)
      const prev = lastRetouchPos.current
      const dist = Math.hypot(pos.x - prev.x, pos.y - prev.y)
      if (dist < 2) return
      const dpr = dprRef.current
      const r = ((tool === 'smudge' ? smudgeSize : tool === 'dodge' ? dodgeSize : size) * dpr) / 2
      const steps = Math.max(1, Math.floor(dist / Math.max(2, r * 0.3)))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const x = prev.x + (pos.x - prev.x) * t
        const y = prev.y + (pos.y - prev.y) * t
        const px = prev.x + (pos.x - prev.x) * ((i - 1) / steps)
        const py = prev.y + (pos.y - prev.y) * ((i - 1) / steps)
        if (tool === 'smudge') smudgeAt(x, y, px, py, r)
        else if (tool === 'dodge') dodgeAt(x, y, r, e.altKey)
      }
      lastRetouchPos.current = { x: pos.x, y: pos.y }
      composite()
      return
    }

    // Shape drag preview
    if (isShaping.current && shapeStart.current) {
      const pos = getPos(e)
      const dpr = dprRef.current
      const x1 = shapeStart.current.x
      const y1 = shapeStart.current.y
      const x2 = pos.x / dpr
      const y2 = pos.y / dpr
      let x = Math.min(x1, x2)
      let y = Math.min(y1, y2)
      let w = Math.abs(x2 - x1)
      let h = Math.abs(y2 - y1)
      if (e.shiftKey) {
        const s = Math.max(w, h)
        w = s
        h = s
        if (x2 < x1) x = x1 - s
        if (y2 < y1) y = y1 - s
      }
      const sp = { x, y, w, h, kind: shapeKind.current as 'rect' | 'ellipse' }
      shapeEndRef.current = sp
      setShapePreview(sp)
      return
    }

    // Gradient drag preview
    if (isGradient.current && gradientStart.current) {
      const pos = getPos(e)
      const dpr = dprRef.current
      const end = { x: pos.x / dpr, y: pos.y / dpr }
      gradientEnd.current = end
      setGradientPreview({
        x1: gradientStart.current.x,
        y1: gradientStart.current.y,
        x2: end.x,
        y2: end.y,
      })
      return
    }

    // Clone stamp paint
    if (isCloning.current) {
      const pos = getPos(e)
      const dpr = dprRef.current
      const r = (size * dpr) / 2
      stampClone(pos.x, pos.y, r)
      composite()
      return
    }

    // Crop drag
    if (isCropping.current && cropStart.current) {
      const pos = getPos(e)
      const dpr = dprRef.current
      const x1 = cropStart.current.x
      const y1 = cropStart.current.y
      const x2 = pos.x / dpr
      const y2 = pos.y / dpr
      let x = Math.min(x1, x2)
      let y = Math.min(y1, y2)
      let w = Math.abs(x2 - x1)
      let h = Math.abs(y2 - y1)
      if (cropRatio === 'custom') {
        w = cropFixedSize.w
        h = cropFixedSize.h
        x = x2 < x1 ? x1 - w : x1
        y = y2 < y1 ? y1 - h : y1
      } else if (e.shiftKey || cropRatio === '1:1') {
        const s = Math.max(w, h)
        w = s; h = s
        if (x2 < x1) x = x1 - s
        if (y2 < y1) y = y1 - s
      } else if (cropRatio === '4:3') {
        if (w / Math.max(0.001, h) > 4 / 3) w = h * 4 / 3
        else h = w * 3 / 4
        if (x2 < x1) x = x1 - w
        if (y2 < y1) y = y1 - h
      } else if (cropRatio === '16:9') {
        if (w / Math.max(0.001, h) > 16 / 9) w = h * 16 / 9
        else h = w * 9 / 16
        if (x2 < x1) x = x1 - w
        if (y2 < y1) y = y1 - h
      }
      // clamp to document
      const dw = docRef.current.width
      const dh = docRef.current.height
      x = Math.max(0, Math.min(x, dw))
      y = Math.max(0, Math.min(y, dh))
      w = Math.min(w, dw - x)
      h = Math.min(h, dh - y)
      setCropRect({ x, y, w, h })
      return
    }

    // Move tool drag (canvas-level, outside transform box)
    if (isMoving.current && moveStart.current) {
      const pos = getPos(e)
      const dx = pos.x - moveStart.current.x
      const dy = pos.y - moveStart.current.y
      const layer = getActiveLayer()
      if (layer) {
        layer.offsetX = moveOriginOffset.current.x + dx
        layer.offsetY = moveOriginOffset.current.y + dy
        layersRef.current = layersRef.current.map(l =>
          l.id === layer.id ? { ...l, offsetX: layer.offsetX, offsetY: layer.offsetY, canvas: layer.canvas } : l
        )
        composite()
        // keep blue box in sync
        setLayers(layersRef.current.map(l => ({ ...l })))
      }
      return
    }

    if (!isDrawing.current || !lastPoint.current || !lastDabPos.current) return
    e.preventDefault()
    const native = e.nativeEvent
    const coalesced = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : []
    const list = coalesced.length ? coalesced : [native]
    let drew = false
    for (const ev of list) if (strokeStep(ev)) drew = true
    if (drew) composite()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    onPointerUpInner(e)
    flushFeather()
  }

  const onPointerUpInner = (e: React.PointerEvent) => {
    isPanning.current = false
    lastPanPos.current = null
    if (isSelecting.current) {
      isSelecting.current = false
      selectStart.current = null
      const pending = pendingSelection.current
      pendingSelection.current = null
      if (pending && (pending.w >= 2 && pending.h >= 2)) {
        // For 'new' mode the selection is already set during drag.
        // For add/subtract/intersect combine with previous (stored before drag started).
        if (selMode !== 'new' && selectionBeforeDrag.current) {
          const combined = combineSelections(selMode, selectionBeforeDrag.current, pending, docRef.current.width, docRef.current.height)
          setSelection(combined)
        } else if (selMode === 'new') {
          setSelection(pending)
        }
      } else if (pending && (pending.w < 2 || pending.h < 2)) {
        if (selMode === 'new') setSelection(null)
        else if (selectionBeforeDrag.current) setSelection(selectionBeforeDrag.current)
      }
      selectionBeforeDrag.current = null
      try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
      return
    }
    if (isRetouching.current) {
      isRetouching.current = false
      lastRetouchPos.current = null
      try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
      return
    }
    if (isShaping.current) {
      isShaping.current = false
      shapeStart.current = null
      const preview = shapeEndRef.current
      shapeEndRef.current = null
      setShapePreview(null)
      try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
      if (preview && preview.w >= 1 && preview.h >= 1) {
        const layer = getActiveLayer()
        if (layer && !layer.locked) {
          saveHistory()
          const ctx = layer.canvas.getContext('2d')
          if (ctx) {
            const dpr = dprRef.current
            const x = preview.x * dpr - layer.offsetX
            const y = preview.y * dpr - layer.offsetY
            const w = preview.w * dpr
            const h = preview.h * dpr
            ctx.save()
            applySelClip(ctx, layer)
            ctx.globalAlpha = shapeOpacity
            ctx.fillStyle = shapeFillColor
            ctx.strokeStyle = shapeStrokeColor
            ctx.lineWidth = Math.max(1, shapeStrokeWidth * dpr)
            ctx.lineJoin = 'round'
            ctx.beginPath()
            if (preview.kind === 'ellipse') {
              ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2)
            } else {
              const r = Math.min(shapeCornerRadius * dpr, Math.abs(w) / 2, Math.abs(h) / 2)
              if (r > 0 && typeof (ctx as any).roundRect === 'function') {
                (ctx as any).roundRect(x, y, w, h, r)
              } else if (r > 0) {
                // manual rounded rect
                const rr = r
                ctx.moveTo(x + rr, y)
                ctx.lineTo(x + w - rr, y)
                ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
                ctx.lineTo(x + w, y + h - rr)
                ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
                ctx.lineTo(x + rr, y + h)
                ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
                ctx.lineTo(x, y + rr)
                ctx.quadraticCurveTo(x, y, x + rr, y)
                ctx.closePath()
              } else {
                ctx.rect(x, y, w, h)
              }
            }
            if (shapeFill) ctx.fill()
            if (shapeStroke) ctx.stroke()
            if (!shapeFill && !shapeStroke) {
              ctx.fillStyle = shapeFillColor
              ctx.fill()
            }
            ctx.restore()
            composite()
          }
        }
      }
      return
    }
    if (isGradient.current) {
      isGradient.current = false
      const start = gradientStart.current
      const end = gradientEnd.current
      gradientStart.current = null
      gradientEnd.current = null
      setGradientPreview(null)
      try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
      if (start && end) {
        const layer = getActiveLayer()
        if (layer && !layer.locked) {
          saveHistory()
          const ctx = layer.canvas.getContext('2d')
          if (ctx) {
            const dpr = dprRef.current
            const x1 = start.x * dpr - layer.offsetX
            const y1 = start.y * dpr - layer.offsetY
            const x2 = end.x * dpr - layer.offsetX
            const y2 = end.y * dpr - layer.offsetY
            const dist = Math.hypot(x2 - x1, y2 - y1) || 1
            const hexToRgba = (hex: string, a: number) => {
              const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
              if (!result) return `rgba(255,255,255,${a})`
              return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${a})`
            }
            const op = gradientOpacity
            let c0 = hexToRgba(gradientColorA, op)
            let c1 = gradientTransparentB ? hexToRgba(gradientColorB, 0) : hexToRgba(gradientColorB, op)
            if (gradientReverse) { const t = c0; c0 = c1; c1 = t }

            let grad: CanvasGradient
            if (gradientType === 'radial') {
              grad = ctx.createRadialGradient(x1, y1, 0, x1, y1, dist)
            } else if (gradientType === 'angle') {
              // Conic-like approximation: sample many linear wedges — use createConicGradient if available
              if (typeof (ctx as any).createConicGradient === 'function') {
                const ang = Math.atan2(y2 - y1, x2 - x1)
                grad = (ctx as any).createConicGradient(ang, x1, y1)
              } else {
                grad = ctx.createLinearGradient(x1, y1, x2, y2)
              }
            } else {
              grad = ctx.createLinearGradient(x1, y1, x2, y2)
            }
            grad.addColorStop(0, c0)
            grad.addColorStop(1, c1)

            ctx.save()
            applySelClip(ctx, layer)
            ctx.globalAlpha = 1
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height)

            // Simple dither: subtle noise on alpha edges
            if (gradientDither) {
              const img = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height)
              const d = img.data
              for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] > 0 && d[i + 3] < 255) {
                  const n = (Math.random() - 0.5) * 12
                  d[i] = Math.max(0, Math.min(255, d[i] + n))
                  d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
                  d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
                }
              }
              putImageDataSel(ctx, img, 0, 0, layer)
            }
            ctx.restore()
            composite()
          }
        }
      }
      return
    }
    if (isCloning.current) {
      isCloning.current = false
      cloneOrigin.current = null
      try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
      return
    }
    if (isCropping.current) {
      isCropping.current = false
      cropStart.current = null
      if (cropRectRef.current && (cropRectRef.current.w < 2 || cropRectRef.current.h < 2)) {
        setCropRect(null)
      }
      try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
      return
    }
    if (isMoving.current || isTransforming.current) {
      isMoving.current = false
      isTransforming.current = false
      transformHandle.current = null
      moveStart.current = null
      transformOrigin.current = null
      // commit offsets to React state
      setLayers([...layersRef.current])
      try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
      return
    }
    if (!isDrawing.current) return
    flushStroke()
    isDrawing.current = false
    lastRawPos.current = null
    lastPoint.current = null
    lastDabPos.current = null
    try { displayRef.current?.releasePointerCapture(e.pointerId) } catch {}
  }

  // Keyboard — handlers always call the latest functions through a ref (no stale closures)
  const adjustBrushSize = (dir: 1 | -1) =>
    setSettings(s => ({ ...s, size: Math.min(5000, Math.max(1, Math.round(s.size * (dir > 0 ? 1.15 : 0.87)) + (dir > 0 ? 1 : -1))) }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestRef = useRef<any>({})
  latestRef.current = { undo, redo, download, zoomIn, zoomOut, resetView, deleteSelection, adjustBrushSize }

  useEffect(() => {
    // Typing in a field must never trigger shortcuts (and must keep Space/Backspace working)
    const isTyping = (t: EventTarget | null) => {
      const el = t as HTMLElement | null
      if (!el || !el.tagName) return false
      if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
      if (el.tagName === 'INPUT') {
        return !['range', 'checkbox', 'radio', 'button', 'color'].includes((el as HTMLInputElement).type)
      }
      return el.isContentEditable
    }
    // keyed by physical key (e.code) so shortcuts work on any keyboard layout, incl. Persian
    const TOOL_KEYS: Record<string, [Tool, Record<string, string>?]> = {
      KeyB: ['brush'], KeyE: ['eraser'], KeyV: ['move'], KeyH: ['hand'],
      KeyM: ['marquee', { select: 'marquee-rect' }], KeyL: ['lasso', { select: 'lasso' }],
      KeyW: ['wand', { select: 'magic-wand' }], KeyI: ['eyedropper'], KeyC: ['crop'],
      KeyG: ['fill', { fill: 'bucket' }], KeyS: ['clone'], KeyT: ['text'], KeyP: ['pen'],
      KeyO: ['dodge'], KeyR: ['smudge'], KeyU: ['shape', { shape: 'rect' }], KeyZ: ['zoom'],
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector('.modal-overlay')) return
      const L = latestRef.current
      const mod = e.ctrlKey || e.metaKey

      if (e.code === 'Space') { e.preventDefault(); spacePressed.current = true; return }

      if (mod) {
        switch (e.code) {
          case 'KeyZ': e.preventDefault(); if (e.shiftKey) L.redo(); else L.undo(); break
          case 'KeyY': e.preventDefault(); L.redo(); break
          case 'KeyS': e.preventDefault(); L.download(); break
          case 'KeyN': e.preventDefault(); setShowNewDoc(true); break
          case 'KeyD': e.preventDefault(); setSelection(null); break
          case 'Equal': case 'NumpadAdd': e.preventDefault(); L.zoomIn(); break
          case 'Minus': case 'NumpadSubtract': e.preventDefault(); L.zoomOut(); break
          case 'Digit0': case 'Numpad0': e.preventDefault(); L.resetView(); break
        }
        return // never treat Ctrl/Cmd combos as tool shortcuts
      }
      if (e.altKey) return

      const entry = TOOL_KEYS[e.code]
      if (entry) {
        setTool(entry[0])
        if (entry[1]) setGroupActiveId(prev => ({ ...prev, ...entry[1] }))
        return
      }
      switch (e.code) {
        case 'BracketLeft': L.adjustBrushSize(-1); return
        case 'BracketRight': L.adjustBrushSize(1); return
        case 'Equal': case 'NumpadAdd': L.zoomIn(); return
        case 'Minus': case 'NumpadSubtract': L.zoomOut(); return
        case 'Digit0': case 'Numpad0': L.resetView(); return
      }
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        if (penPointsRef.current.length >= 2) {
          e.preventDefault()
          ;(document.querySelector('[data-pen-commit]') as HTMLButtonElement | null)?.click()
        } else if (cropRectRef.current) {
          e.preventDefault()
          ;(document.querySelector('.crop-actions .btn-primary') as HTMLButtonElement | null)?.click()
        }
        return
      }
      if (e.code === 'Escape') {
        e.preventDefault()
        setSelection(null)
        setCropRect(null)
        setPenPoints([])
        return
      }
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectionRef.current) {
        e.preventDefault()
        L.deleteSelection()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') spacePressed.current = false }
    const onBlur = () => { spacePressed.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val))
  const selectPreset = (p: typeof PRESETS[0]) => { setSelectedPreset(p.name); setFormW(p.w); setFormH(p.h) }
  const swapOrientation = () => { setFormW(formH); setFormH(formW); setSelectedPreset(null) }

  return (
    <div className="app">
      {/* New Document Modal */}
      {showNewDoc && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>سند جدید / New Document</h2>
              {docCreated && <button className="modal-close" onClick={() => setShowNewDoc(false)}>{Icons.close}</button>}
            </div>
            <div className="modal-body">
              <div className="presets">
                <h3>پیش‌فرض‌ها</h3>
                <div className="preset-grid">
                  {PRESETS.map(p => (
                    <button key={p.name} className={`preset-card ${selectedPreset === p.name ? 'active' : ''}`} onClick={() => selectPreset(p)}>
                      <div className="preset-icon"><div className="preset-shape" style={{ aspectRatio: `${p.w}/${p.h}`, maxWidth: 40, maxHeight: 40 }} /></div>
                      <div className="preset-name">{p.name}</div>
                      <div className="preset-label">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="doc-details">
                <h3>جزئیات</h3>
                <div className="form-group">
                  <label>نام سند</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Untitled" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>عرض</label>
                    <div className="input-with-unit">
                      <input type="number" min={1} max={MAX_SIDE} value={formW} onChange={e => { setFormW(clamp(Number(e.target.value) || 1, 1, MAX_SIDE)); setSelectedPreset(null) }} />
                      <span>px</span>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>ارتفاع</label>
                    <div className="input-with-unit">
                      <input type="number" min={1} max={MAX_SIDE} value={formH} onChange={e => { setFormH(clamp(Number(e.target.value) || 1, 1, MAX_SIDE)); setSelectedPreset(null) }} />
                      <span>px</span>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>جهت</label>
                  <div className="orient-btns">
                    <button className={formW <= formH ? 'active' : ''} onClick={() => { if (formW > formH) swapOrientation() }}>{Icons.portrait} <span>عمودی</span></button>
                    <button className={formW > formH ? 'active' : ''} onClick={() => { if (formW <= formH) swapOrientation() }}>{Icons.landscape} <span>افقی</span></button>
                    <button onClick={swapOrientation}>{Icons.swap} <span>تعویض</span></button>
                  </div>
                </div>
                <div className="form-group">
                  <label>پس‌زمینه</label>
                  <div className="bg-options">
                    <button className={formBg === 'white' ? 'active' : ''} onClick={() => setFormBg('white')}><span className="bg-swatch" style={{ background: '#fff' }} />سفید</button>
                    <button className={formBg === 'dark' ? 'active' : ''} onClick={() => setFormBg('dark')}><span className="bg-swatch" style={{ background: '#1a1d24' }} />تیره</button>
                    <button className={formBg === 'transparent' ? 'active' : ''} onClick={() => setFormBg('transparent')}><span className="bg-swatch checker" />شفاف</button>
                    <button className={formBg === 'custom' ? 'active' : ''} onClick={() => setFormBg('custom')}>
                      <input type="color" value={formBgColor} onChange={e => { setFormBgColor(e.target.value); setFormBg('custom') }} onClick={e => e.stopPropagation()} />سفارشی
                    </button>
                  </div>
                </div>
                <div className="doc-summary">
                  {formW} × {formH} px
                  {formW * formH > MAX_AREA
                    ? <span className="warning" style={{ color: 'var(--danger)' }}> — بیش از حد مجاز ({Math.round(MAX_AREA / 1e6)} مگاپیکسل)</span>
                    : formW * formH > 4000000 && <span className="warning"> — سند بزرگ</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {docCreated && <button className="btn-secondary" onClick={() => setShowNewDoc(false)}>انصراف</button>}
              <button className="btn-primary" onClick={createDocument} disabled={formW * formH > MAX_AREA}>ایجاد سند</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <header className="toolbar">
        <div className="brand">
          <span className="logo">{Icons.palette}</span>
          <span>{doc.name}</span>
          {docCreated && <span className="doc-size">{doc.width}×{doc.height}</span>}
        </div>
        <div className="tools">
          <button className={tool === 'brush' ? 'active' : ''} onClick={() => setTool('brush')}>{Icons.brush} <span>قلم‌مو</span></button>
          <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}>{Icons.eraser} <span>پاک‌کن</span></button>
        </div>
        <div className="actions">
          <button onClick={() => setShowNewDoc(true)} title="سند جدید">{Icons.file} <span>جدید</span></button>
          <button onClick={undo} title="بازگشت">{Icons.undo}</button>
          <button onClick={redo} title="جلو">{Icons.redo}</button>
          <button onClick={zoomOut} title="کوچک‌نمایی">{Icons.zoomOut}</button>
          <button onClick={resetView}>{Math.round(scale * 100)}%</button>
          <button onClick={zoomIn} title="بزرگ‌نمایی">{Icons.zoomIn}</button>
          <button onClick={clearCanvas} className="danger" title="پاک کردن لایه">{Icons.trash}</button>
          <button onClick={download} className="success" title="دانلود">{Icons.download}</button>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="تم">
            {theme === 'dark' ? Icons.sun : Icons.moon}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} title="پنل">
            {Icons.panel} <span>{showSettings ? 'بستن' : 'پنل'}</span>
          </button>
        </div>
      </header>

      {/* ===== Options Bar (quick tool settings) ===== */}
      {docCreated && (
        <div className="options-bar">
          <div className="options-tool-name">
            {tool === 'brush' && 'قلم‌مو'}
            {tool === 'eraser' && 'پاک‌کن'}
            {tool === 'clone' && 'Clone Stamp'}
            {tool === 'smudge' && 'Smudge'}
            {tool === 'dodge' && 'Dodge / Burn'}
            {tool === 'fill' && 'سطل رنگ'}
            {tool === 'gradient' && 'گرادیان'}
            {tool === 'marquee' && 'Marquee'}
            {tool === 'lasso' && 'Lasso'}
            {tool === 'wand' && 'Magic Wand'}
            {tool === 'crop' && 'Crop'}
            {tool === 'move' && 'Move'}
            {tool === 'eyedropper' && 'Eyedropper'}
            {tool === 'shape' && 'Shape'}
            {tool === 'text' && 'متن'}
            {tool === 'pen' && 'Pen'}
            {tool === 'hand' && 'Hand'}
            {tool === 'zoom' && 'Zoom'}
          </div>

          <div className="options-controls">
            {/* Brush / Pencil / Eraser quick options */}
            {(tool === 'brush' || tool === 'eraser') && (
              <>
                <label className="opt">
                  <span>Size</span>
                  <input type="number" min={1} max={5000} value={size}
                    onChange={e => setSettings(s => ({ ...s, size: Math.max(1, Math.min(5000, Number(e.target.value) || 1)) }))} />
                </label>
                <label className="opt">
                  <span>Opacity</span>
                  <input type="number" min={1} max={100} value={Math.round(opacity * 100)}
                    onChange={e => setSettings(s => ({ ...s, opacity: Math.max(0.01, Math.min(1, (Number(e.target.value) || 1) / 100)) }))} />
                  <span className="opt-unit">%</span>
                </label>
                <label className="opt">
                  <span>Flow</span>
                  <input type="number" min={1} max={100} value={flow}
                    onChange={e => setSettings(s => ({ ...s, flow: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))} />
                  <span className="opt-unit">%</span>
                </label>
                {tool === 'brush' && groupActiveId['brush'] !== 'pencil' && (
                  <label className="opt">
                    <span>Hardness</span>
                    <input type="number" min={1} max={100} value={hardness}
                      onChange={e => setSettings(s => ({ ...s, hardness: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))} />
                    <span className="opt-unit">%</span>
                  </label>
                )}
                {tool === 'eraser' && (
                  <>
                    <label className="opt">
                      <span>Mode</span>
                      <select
                        value={eraserMode}
                        onChange={e => setEraserSettings(s => ({ ...s, eraserMode: e.target.value as any }))}
                      >
                        <option value="brush">Brush</option>
                        <option value="pencil">Pencil</option>
                        <option value="block">Block</option>
                      </select>
                    </label>
                    {eraserMode === 'brush' && (
                      <label className="opt">
                        <span>Hardness</span>
                        <input type="number" min={1} max={100} value={hardness}
                          onChange={e => setSettings(s => ({ ...s, hardness: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))} />
                        <span className="opt-unit">%</span>
                      </label>
                    )}
                  </>
                )}
                {tool === 'brush' && (
                  <label className="opt">
                    <span>Mode</span>
                    <select value={blendMode} onChange={e => setSettings(s => ({ ...s, blendMode: e.target.value }))}>
                      <option value="source-over">Normal</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                      <option value="darken">Darken</option>
                      <option value="lighten">Lighten</option>
                      <option value="color-dodge">Color Dodge</option>
                      <option value="color-burn">Color Burn</option>
                    </select>
                  </label>
                )}
              </>
            )}
            {tool === 'clone' && (
              <>
                <label className="opt">
                  <span>Size</span>
                  <input type="number" min={1} max={5000} value={size}
                    onChange={e => setSettings(s => ({ ...s, size: Math.max(1, Math.min(5000, Number(e.target.value) || 1)) }))} />
                </label>
                <label className="opt">
                  <span>Opacity</span>
                  <input type="number" min={1} max={100} value={Math.round(opacity * 100)}
                    onChange={e => setSettings(s => ({ ...s, opacity: Math.max(0.01, Math.min(1, (Number(e.target.value) || 1) / 100)) }))} />
                  <span className="opt-unit">%</span>
                </label>
                <label className="opt">
                  <span>Hardness</span>
                  <input type="number" min={1} max={100} value={hardness}
                    onChange={e => setSettings(s => ({ ...s, hardness: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))} />
                  <span className="opt-unit">%</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={cloneAligned} onChange={e => setCloneAligned(e.target.checked)} />
                  <span>Aligned</span>
                </label>
                <label className="opt">
                  <span>Sample</span>
                  <select value={cloneSample} onChange={e => setCloneSample(e.target.value as any)}>
                    <option value="current">Current Layer</option>
                    <option value="all">All Layers</option>
                  </select>
                </label>
                {!cloneHasSource && (
                  <span className="opt-hint">Alt+کلیک = منبع</span>
                )}
              </>
            )}
            {tool === 'dodge' && (
              <>
                <label className="opt">
                  <span>Size</span>
                  <input type="number" min={1} max={5000} value={dodgeSize}
                    onChange={e => setDodgeSize(Math.max(1, Number(e.target.value) || 1))} />
                </label>
                <label className="opt">
                  <span>Hardness</span>
                  <input type="number" min={1} max={100} value={dodgeHardness}
                    onChange={e => setDodgeHardness(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
                </label>
                <label className="opt">
                  <span>Exposure</span>
                  <input type="number" min={1} max={100} value={dodgeExposure}
                    onChange={e => setDodgeExposure(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
                  <span className="opt-unit">%</span>
                </label>
                <label className="opt">
                  <span>Range</span>
                  <select value={dodgeRange} onChange={e => setDodgeRange(e.target.value as any)}>
                    <option value="shadows">Shadows</option>
                    <option value="midtones">Midtones</option>
                    <option value="highlights">Highlights</option>
                  </select>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={dodgeProtectTones} onChange={e => setDodgeProtectTones(e.target.checked)} />
                  <span>Protect Tones</span>
                </label>
              </>
            )}
            {tool === 'fill' && (
              <>
                <label className="opt">
                  <span>Tolerance</span>
                  <input type="number" min={0} max={255} value={fillTolerance}
                    onChange={e => setFillTolerance(Math.max(0, Math.min(255, Number(e.target.value) || 0)))} />
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={fillSampleAll} onChange={e => setFillSampleAll(e.target.checked)} />
                  <span>All Layers</span>
                </label>
                <label className="opt">
                  <span>Opacity</span>
                  <input type="number" min={1} max={100} value={Math.round(opacity * 100)}
                    onChange={e => setSettings(s => ({ ...s, opacity: Math.max(0.01, Math.min(1, (Number(e.target.value) || 1) / 100)) }))} />
                  <span className="opt-unit">%</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={fillContiguous} onChange={e => setFillContiguous(e.target.checked)} />
                  <span>Contiguous</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={fillAntiAlias} onChange={e => setFillAntiAlias(e.target.checked)} />
                  <span>Anti-alias</span>
                </label>
                <label className="opt">
                  <span>Mode</span>
                  <select value={fillBlendMode} onChange={e => setFillBlendMode(e.target.value)}>
                    <option value="source-over">Normal</option>
                    <option value="multiply">Multiply</option>
                    <option value="screen">Screen</option>
                    <option value="overlay">Overlay</option>
                  </select>
                </label>
                <label className="opt color">
                  <span>Fill</span>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                </label>
              </>
            )}
            {tool === 'wand' && (
              <>
                <label className="opt">
                  <span>Tolerance</span>
                  <input type="number" min={0} max={255} value={wandTolerance}
                    onChange={e => setWandTolerance(Math.max(0, Math.min(255, Number(e.target.value) || 0)))} />
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={wandContiguous} onChange={e => setWandContiguous(e.target.checked)} />
                  <span>Contiguous</span>
                </label>
              </>
            )}
            {tool === 'gradient' && (
              <>
                <label className="opt">
                  <span>Type</span>
                  <select value={gradientType} onChange={e => setGradientType(e.target.value as any)}>
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                    <option value="angle">Angle</option>
                  </select>
                </label>
                <label className="opt color">
                  <span>از</span>
                  <input type="color" value={gradientColorA} onChange={e => setGradientColorA(e.target.value)} />
                </label>
                <label className="opt color">
                  <span>تا</span>
                  <input type="color" value={gradientColorB} onChange={e => setGradientColorB(e.target.value)}
                    disabled={gradientTransparentB} />
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={gradientTransparentB} onChange={e => setGradientTransparentB(e.target.checked)} />
                  <span>شفاف</span>
                </label>
                <label className="opt">
                  <span>Opacity</span>
                  <input type="number" min={1} max={100} value={Math.round(gradientOpacity * 100)}
                    onChange={e => setGradientOpacity(Math.max(0.01, Math.min(1, (Number(e.target.value) || 1) / 100)))} />
                  <span className="opt-unit">%</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={gradientReverse} onChange={e => setGradientReverse(e.target.checked)} />
                  <span>Reverse</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={gradientDither} onChange={e => setGradientDither(e.target.checked)} />
                  <span>Dither</span>
                </label>
              </>
            )}
            {tool === 'crop' && (
              <>
                <label className="opt">
                  <span>Ratio</span>
                  <select value={cropRatio} onChange={e => setCropRatio(e.target.value as any)}>
                    <option value="free">آزاد</option>
                    <option value="1:1">۱:۱</option>
                    <option value="4:3">۴:۳</option>
                    <option value="16:9">۱۶:۹</option>
                    <option value="custom">ثابت W×H</option>
                  </select>
                </label>
                {cropRatio === 'custom' && (
                  <>
                    <label className="opt">
                      <span>W</span>
                      <input type="number" min={1} max={10000} value={cropFixedSize.w}
                        onChange={e => setCropFixedSize(s => ({ ...s, w: Math.max(1, Number(e.target.value) || 1) }))} />
                    </label>
                    <label className="opt">
                      <span>H</span>
                      <input type="number" min={1} max={10000} value={cropFixedSize.h}
                        onChange={e => setCropFixedSize(s => ({ ...s, h: Math.max(1, Number(e.target.value) || 1) }))} />
                    </label>
                  </>
                )}
                {cropRect && cropRect.w > 0 && (
                  <span className="opt-hint" style={{ color: 'var(--text-muted)' }}>
                    {Math.round(cropRect.w)} × {Math.round(cropRect.h)} px
                  </span>
                )}
                <label className="opt">
                  <span>Straighten</span>
                  <input type="number" min={-45} max={45} step={0.1} value={cropStraighten}
                    onChange={e => setCropStraighten(Number(e.target.value) || 0)} />
                  <span className="opt-unit">°</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={cropDeletePixels} onChange={e => setCropDeletePixels(e.target.checked)} />
                  <span>Delete pixels</span>
                </label>
              </>
            )}
            {(tool === 'marquee' || tool === 'lasso' || tool === 'wand') && (
              <>
                <label className="opt">
                  <span>Mode</span>
                  <select value={selMode} onChange={e => setSelMode(e.target.value as any)}>
                    <option value="new">New</option>
                    <option value="add">Add</option>
                    <option value="subtract">Subtract</option>
                    <option value="intersect">Intersect</option>
                  </select>
                </label>
                <label className="opt">
                  <span>Feather</span>
                  <input type="number" min={0} max={250} value={selFeather}
                    onChange={e => setSelFeather(Math.max(0, Math.min(250, Number(e.target.value) || 0)))} />
                  <span className="opt-unit">px</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={selAntiAlias} onChange={e => setSelAntiAlias(e.target.checked)} />
                  <span>Anti-alias</span>
                </label>
              </>
            )}
            {tool === 'marquee' && (
              <>
                <label className="opt">
                  <span>Style</span>
                  <select value={marqueeStyle} onChange={e => setMarqueeStyle(e.target.value as any)}>
                    <option value="normal">Normal</option>
                    <option value="fixed-ratio">Fixed Ratio</option>
                    <option value="fixed-size">Fixed Size</option>
                  </select>
                </label>
                {marqueeStyle === 'fixed-ratio' && (
                  <>
                    <label className="opt">
                      <span>W</span>
                      <input type="number" min={1} max={20} value={marqueeRatio.w}
                        onChange={e => setMarqueeRatio(r => ({ ...r, w: Math.max(1, Number(e.target.value) || 1) }))} />
                    </label>
                    <label className="opt">
                      <span>H</span>
                      <input type="number" min={1} max={20} value={marqueeRatio.h}
                        onChange={e => setMarqueeRatio(r => ({ ...r, h: Math.max(1, Number(e.target.value) || 1) }))} />
                    </label>
                  </>
                )}
                {marqueeStyle === 'fixed-size' && (
                  <>
                    <label className="opt">
                      <span>W</span>
                      <input type="number" min={1} max={10000} value={marqueeFixedSize.w}
                        onChange={e => setMarqueeFixedSize(s => ({ ...s, w: Math.max(1, Number(e.target.value) || 1) }))} />
                    </label>
                    <label className="opt">
                      <span>H</span>
                      <input type="number" min={1} max={10000} value={marqueeFixedSize.h}
                        onChange={e => setMarqueeFixedSize(s => ({ ...s, h: Math.max(1, Number(e.target.value) || 1) }))} />
                    </label>
                  </>
                )}
              </>
            )}
            {tool === 'shape' && (
              <>
                <label className="opt check">
                  <input type="checkbox" checked={shapeFill} onChange={e => setShapeFill(e.target.checked)} />
                  <span>Fill</span>
                </label>
                {shapeFill && (
                  <label className="opt color">
                    <span>رنگ Fill</span>
                    <input type="color" value={shapeFillColor} onChange={e => setShapeFillColor(e.target.value)} />
                  </label>
                )}
                <label className="opt check">
                  <input type="checkbox" checked={shapeStroke} onChange={e => setShapeStroke(e.target.checked)} />
                  <span>Stroke</span>
                </label>
                {shapeStroke && (
                  <>
                    <label className="opt color">
                      <span>رنگ</span>
                      <input type="color" value={shapeStrokeColor} onChange={e => setShapeStrokeColor(e.target.value)} />
                    </label>
                    <label className="opt">
                      <span>ضخامت</span>
                      <input type="number" min={1} max={200} value={shapeStrokeWidth}
                        onChange={e => setShapeStrokeWidth(Math.max(1, Number(e.target.value) || 1))} />
                    </label>
                  </>
                )}
                {shapeKind.current === 'rect' || groupActiveId['shape'] === 'rect' ? (
                  <label className="opt">
                    <span>Radius</span>
                    <input type="number" min={0} max={500} value={shapeCornerRadius}
                      onChange={e => setShapeCornerRadius(Math.max(0, Number(e.target.value) || 0))} />
                  </label>
                ) : null}
                <label className="opt">
                  <span>Opacity</span>
                  <input type="number" min={1} max={100} value={Math.round(shapeOpacity * 100)}
                    onChange={e => setShapeOpacity(Math.max(0.01, Math.min(1, (Number(e.target.value) || 1) / 100)))} />
                </label>
              </>
            )}
            {tool === 'text' && (
              <>
                <label className="opt">
                  <span>Font</span>
                  <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                    <option value="Tahoma">Tahoma</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Vazirmatn">Vazirmatn</option>
                    <option value="Segoe UI">Segoe UI</option>
                  </select>
                </label>
                <label className="opt">
                  <span>Size</span>
                  <input type="number" min={8} max={300} value={fontSize}
                    onChange={e => setFontSize(Math.max(8, Math.min(300, Number(e.target.value) || 8)))} />
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={textBold} onChange={e => setTextBold(e.target.checked)} />
                  <span>Bold</span>
                </label>
                <label className="opt color">
                  <span>رنگ</span>
                  <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                </label>
                <label className="opt">
                  <span>تراز</span>
                  <select value={textAlign} onChange={e => setTextAlign(e.target.value as any)}>
                    <option value="right">راست</option>
                    <option value="center">وسط</option>
                    <option value="left">چپ</option>
                  </select>
                </label>
                <label className="opt">
                  <span>Spacing</span>
                  <input type="number" min={-20} max={100} value={letterSpacing}
                    onChange={e => setLetterSpacing(Number(e.target.value) || 0)} />
                </label>
              </>
            )}
            {tool === 'smudge' && (
              <>
                <label className="opt">
                  <span>Size</span>
                  <input type="number" min={1} max={5000} value={smudgeSize}
                    onChange={e => setSmudgeSize(Math.max(1, Number(e.target.value) || 1))} />
                </label>
                <label className="opt">
                  <span>Strength</span>
                  <input type="number" min={1} max={100} value={smudgeStrength}
                    onChange={e => setSmudgeStrength(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
                  <span className="opt-unit">%</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={smudgeFingerPaint} onChange={e => setSmudgeFingerPaint(e.target.checked)} />
                  <span>Finger Paint</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={smudgeSampleAll} onChange={e => setSmudgeSampleAll(e.target.checked)} />
                  <span>All Layers</span>
                </label>
              </>
            )}
            {tool === 'pen' && (
              <>
                <label className="opt">
                  <span>Mode</span>
                  <select value={penMode} onChange={e => setPenMode(e.target.value as any)}>
                    <option value="pixels">Pixels</option>
                    <option value="shape">Shape</option>
                    <option value="path">Path</option>
                  </select>
                </label>
                {penMode !== 'path' && (
                  <>
                    <label className="opt">
                      <span>ضخامت</span>
                      <input type="number" min={1} max={100} value={penStrokeWidth}
                        onChange={e => setPenStrokeWidth(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
                    </label>
                    <label className="opt color">
                      <span>رنگ خط</span>
                      <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} />
                    </label>
                    {penMode === 'pixels' && (
                      <label className="opt check">
                        <input type="checkbox" checked={penFill} onChange={e => setPenFill(e.target.checked)} />
                        <span>Fill</span>
                      </label>
                    )}
                    {(penFill || penMode === 'shape') && (
                      <label className="opt color">
                        <span>رنگ Fill</span>
                        <input type="color" value={penFillColor} onChange={e => setPenFillColor(e.target.value)} />
                      </label>
                    )}
                    <label className="opt">
                      <span>Opacity</span>
                      <input type="number" min={1} max={100} value={Math.round(penOpacity * 100)}
                        onChange={e => setPenOpacity(Math.max(0.01, Math.min(1, (Number(e.target.value) || 1) / 100)))} />
                      <span className="opt-unit">%</span>
                    </label>
                  </>
                )}
                <label className="opt check">
                  <input type="checkbox" checked={penAutoClose} onChange={e => setPenAutoClose(e.target.checked)} />
                  <span>Auto-Close</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={penRubberBand} onChange={e => setPenRubberBand(e.target.checked)} />
                  <span>Rubber Band</span>
                </label>
                <button type="button" className="opt-btn" data-pen-commit onClick={commitPenPath}>اعمال</button>
              </>
            )}
            {tool === 'eyedropper' && (
              <>
                <label className="opt">
                  <span>Sample Size</span>
                  <select value={eyedropperSample} onChange={e => setEyedropperSample(Number(e.target.value) as any)}>
                    <option value={1}>Point</option>
                    <option value={3}>3×3 Average</option>
                    <option value={5}>5×5 Average</option>
                  </select>
                </label>
                <label className="opt">
                  <span>From</span>
                  <select value={eyedropperSource} onChange={e => setEyedropperSource(e.target.value as any)}>
                    <option value="current">Current Layer</option>
                    <option value="all">All Layers</option>
                  </select>
                </label>
                {lastSampledColor && (
                  <label className="opt color">
                    <span>نمونه</span>
                    <input type="color" value={lastSampledColor} readOnly />
                    <span className="opt-hint" style={{ color: 'var(--text-muted)' }}>{lastSampledColor}</span>
                  </label>
                )}
              </>
            )}
            {tool === 'hand' && (
              <>
                <span className="opt-hint">درگ = جابه‌جایی نما · Space موقت Hand</span>
                <button type="button" className="opt-btn" onClick={() => fitToView()}>Fit to Screen</button>
                <button type="button" className="opt-btn" onClick={zoomToActual}>۱۰۰٪</button>
              </>
            )}
            {tool === 'zoom' && (
              <>
                <button type="button" className="opt-btn" onClick={zoomIn} title="+">Zoom In</button>
                <button type="button" className="opt-btn" onClick={zoomOut} title="-">Zoom Out</button>
                <button type="button" className="opt-btn" onClick={() => fitToView()}>Fit to Screen</button>
                <button type="button" className="opt-btn" onClick={zoomToActual}>۱۰۰٪</button>
                <button type="button" className="opt-btn" onClick={() => setZoomPercent(50)}>۵۰٪</button>
                <button type="button" className="opt-btn" onClick={() => setZoomPercent(200)}>۲۰۰٪</button>
                <label className="opt">
                  <span>Zoom</span>
                  <input type="number" min={5} max={1000} value={Math.round(scale * 100)}
                    onChange={e => setZoomPercent(Number(e.target.value) || 100)} />
                  <span className="opt-unit">%</span>
                </label>
              </>
            )}
            {tool === 'move' && (
              <>
                <label className="opt check">
                  <input type="checkbox" checked={showTransformControls} onChange={e => setShowTransformControls(e.target.checked)} />
                  <span>Transform Controls</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={lockTransformAspect} onChange={e => setLockTransformAspect(e.target.checked)} />
                  <span>قفل نسبت</span>
                </label>
                <label className="opt check">
                  <input type="checkbox" checked={autoSelectLayer} onChange={e => setAutoSelectLayer(e.target.checked)} />
                  <span>Auto-Select</span>
                </label>
                <button type="button" className="opt-btn" onClick={() => alignActiveLayer('left')} title="تراز چپ">⫷</button>
                <button type="button" className="opt-btn" onClick={() => alignActiveLayer('center-h')} title="وسط افقی">☰</button>
                <button type="button" className="opt-btn" onClick={() => alignActiveLayer('right')} title="تراز راست">⫸</button>
                <button type="button" className="opt-btn" onClick={() => alignActiveLayer('top')} title="تراز بالا">⬆</button>
                <button type="button" className="opt-btn" onClick={() => alignActiveLayer('center-v')} title="وسط عمودی">⬍</button>
                <button type="button" className="opt-btn" onClick={() => alignActiveLayer('bottom')} title="تراز پایین">⬇</button>
              </>
            )}
            {/* Color for tools that use it */}
            {(tool === 'brush' || (tool === 'smudge' && smudgeFingerPaint)) && (
              <label className="opt color">
                <span>رنگ</span>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="main">
        {/* ===== Left Toolbar (Photoshop-style) ===== */}
        {docCreated && (
          <div className="left-toolbar">
            {TOOL_GROUPS.map(group => {
              const activeItemId = groupActiveId[group.id] || group.items[0].id
              const activeItem = group.items.find(i => i.id === activeItemId) || group.items[0]
              const isActive = activeItem.tool === tool
              const hasFlyout = group.items.length > 1

              const applyTool = (item: ToolItem) => {
                setGroupActiveId(prev => ({ ...prev, [group.id]: item.id }))
                setFlyoutGroup(null)
                if (item.tool) {
                  setTool(item.tool)
                  if (item.tool === 'brush' || item.tool === 'eraser') {
                    setPanelTab('brush')
                    setShowSettings(true)
                  }
                }
              }

              return (
                <div key={group.id} className="tool-slot">
                  <button
                    className={`tool-btn ${isActive ? 'active' : ''}`}
                    title={`${activeItem.label}${activeItem.shortcut ? ' (' + activeItem.shortcut + ')' : ''}${hasFlyout ? ' — راست‌کلیک / نگه‌داشتن برای زیر‌ابزارها' : ''}`}
                    onPointerDown={(e) => {
                      if (e.pointerType !== 'touch' || !hasFlyout) return
                      const el = e.currentTarget as HTMLElement
                      longPressFired.current = false
                      longPressTimer.current = window.setTimeout(() => {
                        const rect = el.getBoundingClientRect()
                        setFlyoutPos({ top: rect.top, left: rect.right + 6 })
                        setFlyoutGroup(group.id)
                        longPressFired.current = true
                      }, 450)
                    }}
                    onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
                    onPointerCancel={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
                    onPointerLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
                    onClick={() => {
                      if (longPressFired.current) { longPressFired.current = false; return } // long-press already opened the flyout
                      // Left click: select current group tool
                      applyTool(activeItem)
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!hasFlyout) return
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setFlyoutPos({
                        top: rect.top,
                        left: rect.right + 6,
                      })
                      setFlyoutGroup(group.id)
                    }}
                  >
                    {activeItem.icon}
                    {hasFlyout && <span className="flyout-dot" />}
                  </button>
                </div>
              )
            })}

            <div className="tool-separator" />

            <div className="color-swatches">
              <input
                type="color"
                className="swatch fg"
                value={color}
                onChange={e => setColor(e.target.value)}
                title="رنگ قلم"
              />
              <button
                className="swatch-reset"
                title="مشکی / سفید"
                onClick={() => setColor(c => c === '#000000' ? '#ffffff' : '#000000')}
              >
                ↺
              </button>
            </div>
          </div>
        )}

        {/* Tool flyout popup — fixed position, aligned to icon */}
        {flyoutGroup && (() => {
          const group = TOOL_GROUPS.find(g => g.id === flyoutGroup)
          if (!group) return null
          const activeItemId = groupActiveId[group.id] || group.items[0].id
          return (
            <>
              <div
                className="flyout-backdrop"
                onClick={() => setFlyoutGroup(null)}
                onContextMenu={(e) => { e.preventDefault(); setFlyoutGroup(null) }}
              />
              <div
                className="tool-flyout-popup"
                style={{ top: flyoutPos.top, left: flyoutPos.left }}
              >
                {group.items.map(item => (
                  <button
                    key={item.id}
                    className={`flyout-item ${activeItemId === item.id ? 'active' : ''}`}
                    onClick={() => {
                      setGroupActiveId(prev => ({ ...prev, [group.id]: item.id }))
                      setFlyoutGroup(null)
                      if (item.tool) {
                        setTool(item.tool)
                        if (item.tool === 'brush' || item.tool === 'eraser') {
                          setPanelTab('brush')
                          setShowSettings(true)
                        }
                      }
                    }}
                  >
                    <span className="flyout-icon">{item.icon}</span>
                    <span className="flyout-label">{item.label}</span>
                    {item.shortcut && <span className="flyout-shortcut">{item.shortcut}</span>}
                    {item.comingSoon && <span className="flyout-soon">به‌زودی</span>}
                  </button>
                ))}
              </div>
            </>
          )
        })()}

        {/* Settings Panel with Tabs */}
        {showSettings && docCreated && (
          <aside className="panel">
            <div className="panel-tabs">
              <button className={panelTab === 'brush' ? 'active' : ''} onClick={() => setPanelTab('brush')}>
                {Icons.brush} <span>ابزار</span>
              </button>
              <button className={panelTab === 'layers' ? 'active' : ''} onClick={() => setPanelTab('layers')}>
                {Icons.layers} <span>لایه‌ها</span>
              </button>
            </div>

            {panelTab === 'brush' && (
              <div className="panel-content">
                <h3>تنظیمات ابزار</h3>
                <p className="panel-hint">فقط تنظیمات مخصوص ابزار فعال — سریع‌ها در نوار بالا</p>

                {/* ===== Brush / Pencil / Eraser only ===== */}
                {(tool === 'brush' || tool === 'eraser') && (
                  <>
                    <div className="preview-box">
                      <canvas ref={previewRef} width={260} height={120} />
                    </div>

                    <div className="control">
                      <label>Size</label>
                      <div className="input-row">
                        <input type="range" min="1" max="5000" value={size} onChange={e => setSettings(s => ({ ...s, size: Number(e.target.value) }))} />
                        <input type="number" min="1" max="5000" value={size} onChange={e => setSettings(s => ({ ...s, size: clamp(Number(e.target.value) || 1, 1, 5000) }))} className="num-input" />
                        <span className="unit">px</span>
                      </div>
                    </div>
                    {(tool === 'eraser' ? eraserMode === 'brush' : groupActiveId['brush'] !== 'pencil') && (
                      <div className="control">
                        <label>Hardness</label>
                        <div className="input-row">
                          <input type="range" min="1" max="100" value={hardness} onChange={e => setSettings(s => ({ ...s, hardness: Number(e.target.value) }))} />
                          <input type="number" min="1" max="100" value={hardness} onChange={e => setSettings(s => ({ ...s, hardness: clamp(Number(e.target.value) || 1, 1, 100) }))} className="num-input" />
                          <span className="unit">%</span>
                        </div>
                      </div>
                    )}
                    <div className="control">
                      <label>Spacing</label>
                      <div className="input-row">
                        <input type="range" min="1" max="1000" value={spacing} onChange={e => setSettings(s => ({ ...s, spacing: Number(e.target.value) }))} />
                        <input type="number" min="1" max="1000" value={spacing} onChange={e => setSettings(s => ({ ...s, spacing: clamp(Number(e.target.value) || 1, 1, 1000) }))} className="num-input" />
                        <span className="unit">%</span>
                      </div>
                    </div>
                    <div className="control">
                      <label>Opacity</label>
                      <div className="input-row">
                        <input type="range" min="1" max="100" value={Math.round(opacity * 100)} onChange={e => setSettings(s => ({ ...s, opacity: Number(e.target.value) / 100 }))} />
                        <input type="number" min="1" max="100" value={Math.round(opacity * 100)} onChange={e => setSettings(s => ({ ...s, opacity: clamp(Number(e.target.value) || 1, 1, 100) / 100 }))} className="num-input" />
                        <span className="unit">%</span>
                      </div>
                    </div>
                    {tool === 'brush' && (
                      <div className="control">
                        <label>رنگ</label>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                      </div>
                    )}

                    <hr />
                    <h3>{tool === 'brush' ? (groupActiveId['brush'] === 'pencil' ? 'Pencil' : 'Brush') : 'Eraser'} — تنظیمات کامل</h3>

                    {tool === 'eraser' && (
                      <>
                        <div className="control">
                          <label>Eraser Mode</label>
                          <select
                            value={eraserMode}
                            onChange={e => setEraserSettings(s => ({ ...s, eraserMode: e.target.value as any }))}
                          >
                            <option value="brush">Brush — نرم / قابل Hardness</option>
                            <option value="pencil">Pencil — لبه تیز دایره‌ای</option>
                            <option value="block">Block — مربع سخت</option>
                          </select>
                          <p className="panel-hint">
                            {eraserMode === 'brush' && 'مثل براش پاک می‌کند؛ Hardness و Flow اثر دارند.'}
                            {eraserMode === 'pencil' && 'لبه کاملاً تیز؛ Hardness نادیده گرفته می‌شود.'}
                            {eraserMode === 'block' && 'پاک‌کن مربعی سخت؛ مناسب جزئیات پیکسلی.'}
                          </p>
                        </div>
                      </>
                    )}

                    <div className="control">
                      <label>Flow: {flow}%</label>
                      <div className="input-row">
                        <input type="range" min="1" max="100" value={flow}
                          onChange={e => setSettings(s => ({ ...s, flow: Number(e.target.value) }))} />
                        <input type="number" min="1" max="100" value={flow}
                          onChange={e => setSettings(s => ({ ...s, flow: clamp(Number(e.target.value) || 1, 1, 100) }))}
                          className="num-input" />
                        <span className="unit">%</span>
                      </div>
                      <p className="panel-hint">تراکم رنگ در هر نقطه از مسیر (جدا از Opacity)</p>
                    </div>

                    {tool === 'brush' && groupActiveId['brush'] !== 'pencil' && (
                      <div className="control">
                        <label>Hardness در پنل بالا و اینجا همگام است</label>
                      </div>
                    )}
                    {tool === 'brush' && groupActiveId['brush'] === 'pencil' && (
                      <p className="panel-hint">Pencil همیشه Hardness ۱۰۰٪ دارد (لبه تیز)</p>
                    )}

                    {tool === 'brush' && (
                      <div className="control">
                        <label>Blend Mode</label>
                        <select value={blendMode} onChange={e => setSettings(s => ({ ...s, blendMode: e.target.value }))}>
                          <option value="source-over">Normal</option>
                          <option value="multiply">Multiply</option>
                          <option value="screen">Screen</option>
                          <option value="overlay">Overlay</option>
                          <option value="darken">Darken</option>
                          <option value="lighten">Lighten</option>
                          <option value="color-dodge">Color Dodge</option>
                          <option value="color-burn">Color Burn</option>
                          <option value="hard-light">Hard Light</option>
                          <option value="soft-light">Soft Light</option>
                          <option value="difference">Difference</option>
                          <option value="exclusion">Exclusion</option>
                        </select>
                      </div>
                    )}

                    <hr />
                    <h3>Shape Dynamics</h3>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={velocityPressure} onChange={e => setVelocityPressure(e.target.checked)} />
                        Velocity Pressure (شبیه‌سازی فشار با سرعت موس)
                      </label>
                    </div>
                    <div className="control">
                      <label>حساسیت سرعت: {velocitySensitivity.toFixed(2)}</label>
                      <input type="range" min="0.3" max="1.2" step="0.05" value={velocitySensitivity}
                        onChange={e => setVelocitySensitivity(Number(e.target.value))} disabled={!velocityPressure} />
                    </div>
                    <div className="control">
                      <label>حداقل اندازه تحت فشار: {Math.round(minSizeRatio * 100)}%</label>
                      <input type="range" min="0.05" max="0.6" step="0.05" value={minSizeRatio}
                        onChange={e => setMinSizeRatio(Number(e.target.value))} disabled={!velocityPressure} />
                    </div>

                    <hr />
                    <h3>Smoothing / Stabilizer</h3>
                    <div className="control">
                      <label>Stabilizer: {stabilizer.toFixed(2)}</label>
                      <input type="range" min="0" max="0.85" step="0.05" value={stabilizer}
                        onChange={e => setStabilizer(Number(e.target.value))} />
                      <p className="panel-hint">هرچه بیشتر، خط نرم‌تر و با تأخیر بیشتر</p>
                    </div>

                    <div className="control">
                      <label>Spacing (فاصله نقاط): {spacing}%</label>
                      <div className="input-row">
                        <input type="range" min="1" max="1000" value={spacing}
                          onChange={e => setSettings(s => ({ ...s, spacing: Number(e.target.value) }))} />
                        <input type="number" min="1" max="1000" value={spacing}
                          onChange={e => setSettings(s => ({ ...s, spacing: clamp(Number(e.target.value) || 1, 1, 1000) }))}
                          className="num-input" />
                      </div>
                    </div>
                  </>
                )}

                {tool === 'fill' && (
                  <>
                    <h3>Paint Bucket — تنظیمات کامل</h3>
                    <div className="control">
                      <label>Tolerance: {fillTolerance}</label>
                      <input type="range" min="0" max="255" value={fillTolerance} onChange={e => setFillTolerance(Number(e.target.value))} />
                      <p className="panel-hint">۰ = فقط رنگ دقیقاً یکسان · ۲۵۵ = تقریباً همه چیز</p>
                    </div>
                    <div className="control">
                      <label>Opacity: {Math.round(opacity * 100)}%</label>
                      <input type="range" min="1" max="100" value={Math.round(opacity * 100)}
                        onChange={e => setSettings(s => ({ ...s, opacity: Number(e.target.value) / 100 }))} />
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={fillContiguous} onChange={e => setFillContiguous(e.target.checked)} />
                        Contiguous — فقط ناحیه متصل به نقطه کلیک
                      </label>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={fillAntiAlias} onChange={e => setFillAntiAlias(e.target.checked)} />
                        Anti-alias — نرم‌کردن لبه ناحیه پر شده
                      </label>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={fillSampleAll} onChange={e => setFillSampleAll(e.target.checked)} />
                        All Layers — تشخیص ناحیه از روی همه لایه‌ها
                      </label>
                    </div>
                    <div className="control">
                      <label>Blend Mode</label>
                      <select value={fillBlendMode} onChange={e => setFillBlendMode(e.target.value)}>
                        <option value="source-over">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>Fill Color (Foreground)</label>
                      <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                      <p className="panel-hint">پر کردن با رنگ فعلی قلم (Foreground)</p>
                    </div>
                  </>
                )}



                {tool === 'gradient' && (
                  <>
                    <h3>Gradient — تنظیمات کامل</h3>
                    <div className="control">
                      <label>Type</label>
                      <select value={gradientType} onChange={e => setGradientType(e.target.value as any)}>
                        <option value="linear">Linear — خطی</option>
                        <option value="radial">Radial — شعاعی</option>
                        <option value="angle">Angle — زاویه‌ای</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>رنگ شروع (از)</label>
                      <input type="color" value={gradientColorA} onChange={e => setGradientColorA(e.target.value)} />
                    </div>
                    <div className="control">
                      <label>رنگ پایان (تا)</label>
                      <input type="color" value={gradientColorB} onChange={e => setGradientColorB(e.target.value)}
                        disabled={gradientTransparentB} />
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={gradientTransparentB} onChange={e => setGradientTransparentB(e.target.checked)} />
                        پایان شفاف (Transparent)
                      </label>
                    </div>
                    <div className="control">
                      <label>Opacity: {Math.round(gradientOpacity * 100)}%</label>
                      <input type="range" min="1" max="100" value={Math.round(gradientOpacity * 100)}
                        onChange={e => setGradientOpacity(Number(e.target.value) / 100)} />
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={gradientReverse} onChange={e => setGradientReverse(e.target.checked)} />
                        Reverse — معکوس کردن رنگ‌ها
                      </label>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={gradientDither} onChange={e => setGradientDither(e.target.checked)} />
                        Dither — کاهش باندینگ رنگی
                      </label>
                    </div>
                    <p className="panel-hint">درگ روی بوم از نقطه شروع تا پایان گرادیان</p>
                  </>
                )}

                {tool === 'clone' && (
                  <>
                    <h3>Clone Stamp</h3>
                    <div className="control">
                      <label>Size</label>
                      <div className="input-row">
                        <input type="range" min="1" max="5000" value={size} onChange={e => setSettings(s => ({ ...s, size: Number(e.target.value) }))} />
                        <input type="number" min="1" max="5000" value={size} onChange={e => setSettings(s => ({ ...s, size: clamp(Number(e.target.value) || 1, 1, 5000) }))} className="num-input" />
                        <span className="unit">px</span>
                      </div>
                    </div>
                    <div className="control">
                      <label>Hardness</label>
                      <div className="input-row">
                        <input type="range" min="1" max="100" value={hardness} onChange={e => setSettings(s => ({ ...s, hardness: Number(e.target.value) }))} />
                        <input type="number" min="1" max="100" value={hardness} onChange={e => setSettings(s => ({ ...s, hardness: clamp(Number(e.target.value) || 1, 1, 100) }))} className="num-input" />
                        <span className="unit">%</span>
                      </div>
                    </div>
                    <div className="control">
                      <label>Opacity</label>
                      <div className="input-row">
                        <input type="range" min="1" max="100" value={Math.round(opacity * 100)} onChange={e => setSettings(s => ({ ...s, opacity: Number(e.target.value) / 100 }))} />
                        <input type="number" min="1" max="100" value={Math.round(opacity * 100)} onChange={e => setSettings(s => ({ ...s, opacity: clamp(Number(e.target.value) || 1, 1, 100) / 100 }))} className="num-input" />
                        <span className="unit">%</span>
                      </div>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={cloneAligned} onChange={e => setCloneAligned(e.target.checked)} />
                        Aligned
                      </label>
                      <p className="panel-hint">
                        روشن: منبع با حرکت قلم جابه‌جا می‌شود.
                        خاموش: هر خط جدید از همان نقطه منبع شروع می‌کند.
                      </p>
                    </div>
                    <div className="control">
                      <label>Sample</label>
                      <select value={cloneSample} onChange={e => setCloneSample(e.target.value as any)}>
                        <option value="current">Current Layer — فقط لایه فعال</option>
                        <option value="all">All Layers — از تصویر نهایی</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>Source indicator</label>
                      <p className="panel-hint">
                        {cloneHasSource
                          ? 'دایره قرمز = نقطه منبع. Alt+کلیک برای تغییر.'
                          : 'منبع انتخاب نشده — Alt+کلیک روی بوم.'}
                      </p>
                    </div>
                  </>
                )}

                {tool === 'smudge' && (
                  <>
                    <h3>Smudge — تنظیمات کامل</h3>
                    <div className="control">
                      <label>Size: {smudgeSize}px</label>
                      <div className="input-row">
                        <input type="range" min="1" max="500" value={smudgeSize} onChange={e => setSmudgeSize(Number(e.target.value))} />
                        <input type="number" min="1" max="5000" value={smudgeSize}
                          onChange={e => setSmudgeSize(clamp(Number(e.target.value) || 1, 1, 5000))} className="num-input" />
                      </div>
                    </div>
                    <div className="control">
                      <label>Strength: {smudgeStrength}%</label>
                      <input type="range" min="1" max="100" value={smudgeStrength}
                        onChange={e => setSmudgeStrength(Number(e.target.value))} />
                      <p className="panel-hint">قدرت پخش رنگ (مثل Strength فتوشاپ)</p>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={smudgeFingerPaint} onChange={e => setSmudgeFingerPaint(e.target.checked)} />
                        Finger Painting — مخلوط با رنگ قلم
                      </label>
                    </div>
                    {smudgeFingerPaint && (
                      <div className="control">
                        <label>رنگ قلم</label>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
                      </div>
                    )}
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={smudgeSampleAll} onChange={e => setSmudgeSampleAll(e.target.checked)} />
                        Sample All Layers
                      </label>
                      <p className="panel-hint">نمونه‌گیری از تصویر نهایی به‌جای فقط لایه فعال</p>
                    </div>
                  </>
                )}

                {tool === 'dodge' && (
                  <>
                    <h3>Dodge / Burn — تنظیمات کامل</h3>
                    <div className="control">
                      <label>Size: {dodgeSize}px</label>
                      <div className="input-row">
                        <input type="range" min="1" max="500" value={dodgeSize} onChange={e => setDodgeSize(Number(e.target.value))} />
                        <input type="number" min="1" max="5000" value={dodgeSize}
                          onChange={e => setDodgeSize(clamp(Number(e.target.value) || 1, 1, 5000))} className="num-input" />
                      </div>
                    </div>
                    <div className="control">
                      <label>Hardness: {dodgeHardness}%</label>
                      <input type="range" min="1" max="100" value={dodgeHardness}
                        onChange={e => setDodgeHardness(Number(e.target.value))} />
                    </div>
                    <div className="control">
                      <label>Exposure: {dodgeExposure}%</label>
                      <input type="range" min="1" max="100" value={dodgeExposure}
                        onChange={e => setDodgeExposure(Number(e.target.value))} />
                      <p className="panel-hint">شدت روشن/تیره کردن</p>
                    </div>
                    <div className="control">
                      <label>Range</label>
                      <select value={dodgeRange} onChange={e => setDodgeRange(e.target.value as any)}>
                        <option value="shadows">Shadows — سایه‌ها</option>
                        <option value="midtones">Midtones — میانی</option>
                        <option value="highlights">Highlights — هایلایت</option>
                      </select>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={dodgeProtectTones} onChange={e => setDodgeProtectTones(e.target.checked)} />
                        Protect Tones — حفظ رنگ (کمتر خاکستری شدن)
                      </label>
                    </div>
                    <p className="panel-hint">درگ = Dodge (روشن) · Alt+درگ = Burn (تیره)</p>
                  </>
                )}

                {tool === 'pen' && (
                  <>
                    <h3>Pen — تنظیمات کامل</h3>
                    <div className="control">
                      <label>Tool Mode</label>
                      <select value={penMode} onChange={e => setPenMode(e.target.value as any)}>
                        <option value="pixels">Pixels — رسم خط روی لایه</option>
                        <option value="shape">Shape — پر + خط (بسته)</option>
                        <option value="path">Path — تبدیل به Selection</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>ضخامت Stroke: {penStrokeWidth}px</label>
                      <input type="range" min="1" max="100" value={penStrokeWidth}
                        onChange={e => setPenStrokeWidth(Number(e.target.value))} />
                    </div>
                    <div className="control">
                      <label>رنگ Stroke</label>
                      <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} />
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={penFill} onChange={e => setPenFill(e.target.checked)} />
                        Fill مسیر
                      </label>
                    </div>
                    {(penFill || penMode === 'shape') && (
                      <div className="control">
                        <label>رنگ Fill</label>
                        <input type="color" value={penFillColor} onChange={e => setPenFillColor(e.target.value)} />
                      </div>
                    )}
                    <div className="control">
                      <label>Opacity: {Math.round(penOpacity * 100)}%</label>
                      <input type="range" min="1" max="100" value={Math.round(penOpacity * 100)}
                        onChange={e => setPenOpacity(Number(e.target.value) / 100)} />
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={penAutoClose} onChange={e => setPenAutoClose(e.target.checked)} />
                        بستن مسیر خودکار (کلیک نزدیک نقطه اول)
                      </label>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={penRubberBand} onChange={e => setPenRubberBand(e.target.checked)} />
                        Rubber Band — پیش‌نمایش خط تا موس
                      </label>
                    </div>
                    <button type="button" className="opt-btn" data-pen-commit onClick={commitPenPath}>
                      اعمال مسیر (Enter)
                    </button>
                    <p className="panel-hint">کلیک = نقطه · دوبارکلیک / Enter = اعمال · Esc = لغو</p>
                  </>
                )}

                {tool === 'shape' && (
                  <>
                    <h3>Shape — {groupActiveId['shape'] === 'ellipse' ? 'Ellipse' : 'Rectangle'}</h3>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={shapeFill} onChange={e => setShapeFill(e.target.checked)} />
                        Fill
                      </label>
                    </div>
                    {shapeFill && (
                      <div className="control">
                        <label>رنگ Fill</label>
                        <input type="color" value={shapeFillColor} onChange={e => setShapeFillColor(e.target.value)} />
                      </div>
                    )}
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={shapeStroke} onChange={e => setShapeStroke(e.target.checked)} />
                        Stroke
                      </label>
                    </div>
                    {shapeStroke && (
                      <>
                        <div className="control">
                          <label>رنگ Stroke</label>
                          <input type="color" value={shapeStrokeColor} onChange={e => setShapeStrokeColor(e.target.value)} />
                        </div>
                        <div className="control">
                          <label>ضخامت Stroke: {shapeStrokeWidth}px</label>
                          <input type="range" min="1" max="100" value={shapeStrokeWidth}
                            onChange={e => setShapeStrokeWidth(Number(e.target.value))} />
                        </div>
                      </>
                    )}
                    {groupActiveId['shape'] !== 'ellipse' && (
                      <div className="control">
                        <label>Corner Radius: {shapeCornerRadius}px</label>
                        <input type="range" min="0" max="200" value={shapeCornerRadius}
                          onChange={e => setShapeCornerRadius(Number(e.target.value))} />
                        <p className="panel-hint">فقط برای مستطیل — گوشه گرد</p>
                      </div>
                    )}
                    <div className="control">
                      <label>Opacity: {Math.round(shapeOpacity * 100)}%</label>
                      <input type="range" min="1" max="100" value={Math.round(shapeOpacity * 100)}
                        onChange={e => setShapeOpacity(Number(e.target.value) / 100)} />
                    </div>
                    <p className="panel-hint">خروجی روی لایه به صورت Pixels · Shift = مربع/دایره</p>
                  </>
                )}

                {tool === 'text' && (
                  <>
                    <h3>متن — Character</h3>
                    <div className="control">
                      <label>Font Family</label>
                      <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                        <option value="Tahoma">Tahoma</option>
                        <option value="Arial">Arial</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Vazirmatn">Vazirmatn</option>
                        <option value="Segoe UI">Segoe UI</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>اندازه: {fontSize}px</label>
                      <input type="range" min="8" max="300" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={textBold} onChange={e => setTextBold(e.target.checked)} />
                        Bold (Weight)
                      </label>
                    </div>
                    <div className="control">
                      <label>رنگ متن</label>
                      <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                    </div>
                    <div className="control">
                      <label>تراز</label>
                      <select value={textAlign} onChange={e => setTextAlign(e.target.value as any)}>
                        <option value="right">راست</option>
                        <option value="center">وسط</option>
                        <option value="left">چپ</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>Letter Spacing: {letterSpacing}px</label>
                      <input type="range" min={-20} max={50} value={letterSpacing}
                        onChange={e => setLetterSpacing(Number(e.target.value))} />
                    </div>
                    <div className="control">
                      <label>Line Height: {lineHeight.toFixed(2)}</label>
                      <input type="range" min={0.8} max={3} step={0.05} value={lineHeight}
                        onChange={e => setLineHeight(Number(e.target.value))} />
                      <p className="panel-hint">Shift+Enter در ادیتور برای خط جدید</p>
                    </div>
                  </>
                )}

                {tool === 'crop' && (
                  <>
                    <h3>Crop — تنظیمات کامل</h3>
                    <div className="control">
                      <label>Ratio</label>
                      <select value={cropRatio} onChange={e => setCropRatio(e.target.value as any)}>
                        <option value="free">آزاد</option>
                        <option value="1:1">۱:۱ مربع</option>
                        <option value="4:3">۴:۳</option>
                        <option value="16:9">۱۶:۹</option>
                        <option value="custom">Width × Height ثابت</option>
                      </select>
                    </div>
                    {cropRatio === 'custom' && (
                      <div className="control">
                        <label>Width × Height (px)</label>
                        <div className="input-row">
                          <input type="number" min={1} max={10000} value={cropFixedSize.w}
                            onChange={e => setCropFixedSize(s => ({ ...s, w: Number(e.target.value) || 1 }))} className="num-input" />
                          <span>×</span>
                          <input type="number" min={1} max={10000} value={cropFixedSize.h}
                            onChange={e => setCropFixedSize(s => ({ ...s, h: Number(e.target.value) || 1 }))} className="num-input" />
                        </div>
                      </div>
                    )}
                    <div className="control">
                      <label>اندازه فعلی برش</label>
                      <p className="panel-hint">
                        {cropRect && cropRect.w > 1
                          ? `${Math.round(cropRect.w)} × ${Math.round(cropRect.h)} px`
                          : 'هنوز ناحیه‌ای انتخاب نشده'}
                      </p>
                    </div>
                    <div className="control">
                      <label>Straighten: {cropStraighten.toFixed(1)}°</label>
                      <input type="range" min={-45} max={45} step={0.1} value={cropStraighten}
                        onChange={e => setCropStraighten(Number(e.target.value))} />
                      <p className="panel-hint">چرخش برای راست‌کردن افق قبل از برش</p>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={cropDeletePixels} onChange={e => setCropDeletePixels(e.target.checked)} />
                        Delete cropped pixels
                      </label>
                      <p className="panel-hint">
                        روشن: پیکسل‌های بیرون حذف و سند کوچک می‌شود.
                        خاموش: فقط نمای برش نرم (پیکسل‌ها حفظ می‌شوند).
                      </p>
                    </div>
                    {softCrop && (
                      <button type="button" className="opt-btn" onClick={() => setSoftCrop(null)}>
                        حذف برش نرم
                      </button>
                    )}
                  </>
                )}

                {(tool === 'marquee' || tool === 'lasso' || tool === 'wand') && (
                  <>
                    <h3>
                      {tool === 'marquee' ? 'Marquee' : tool === 'lasso' ? 'Lasso' : 'Magic Wand'} — Selection
                    </h3>
                    <div className="control">
                      <label>Mode</label>
                      <select value={selMode} onChange={e => setSelMode(e.target.value as any)}>
                        <option value="new">New — جایگزینی</option>
                        <option value="add">Add — اضافه به انتخاب</option>
                        <option value="subtract">Subtract — کم کردن</option>
                        <option value="intersect">Intersect — اشتراک</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>Feather: {selFeather}px</label>
                      <input type="range" min="0" max="250" value={selFeather} onChange={e => setSelFeather(Number(e.target.value))} />
                      <p className="panel-hint">نرم‌کردن لبه هنگام حذف محتوای انتخاب‌شده</p>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={selAntiAlias} onChange={e => setSelAntiAlias(e.target.checked)} />
                        Anti-alias
                      </label>
                    </div>
                    {tool === 'marquee' && (
                      <>
                        <div className="control">
                          <label>Style</label>
                          <select value={marqueeStyle} onChange={e => setMarqueeStyle(e.target.value as any)}>
                            <option value="normal">Normal</option>
                            <option value="fixed-ratio">Fixed Ratio</option>
                            <option value="fixed-size">Fixed Size</option>
                          </select>
                        </div>
                        {marqueeStyle === 'fixed-ratio' && (
                          <div className="control">
                            <label>نسبت W : H</label>
                            <div className="input-row">
                              <input type="number" min={1} max={20} value={marqueeRatio.w}
                                onChange={e => setMarqueeRatio(r => ({ ...r, w: Number(e.target.value) || 1 }))} className="num-input" />
                              <span>:</span>
                              <input type="number" min={1} max={20} value={marqueeRatio.h}
                                onChange={e => setMarqueeRatio(r => ({ ...r, h: Number(e.target.value) || 1 }))} className="num-input" />
                            </div>
                          </div>
                        )}
                        {marqueeStyle === 'fixed-size' && (
                          <div className="control">
                            <label>اندازه ثابت (px)</label>
                            <div className="input-row">
                              <input type="number" min={1} max={10000} value={marqueeFixedSize.w}
                                onChange={e => setMarqueeFixedSize(s => ({ ...s, w: Number(e.target.value) || 1 }))} className="num-input" />
                              <span>×</span>
                              <input type="number" min={1} max={10000} value={marqueeFixedSize.h}
                                onChange={e => setMarqueeFixedSize(s => ({ ...s, h: Number(e.target.value) || 1 }))} className="num-input" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {tool === 'wand' && (
                      <>
                        <div className="control">
                          <label>Tolerance: {wandTolerance}</label>
                          <input type="range" min="0" max="255" value={wandTolerance} onChange={e => setWandTolerance(Number(e.target.value))} />
                        </div>
                        <div className="control checkbox">
                          <label>
                            <input type="checkbox" checked={wandContiguous} onChange={e => setWandContiguous(e.target.checked)} />
                            Contiguous
                          </label>
                        </div>
                      </>
                    )}
                  </>
                )}

                {tool === 'eyedropper' && (
                  <>
                    <h3>Eyedropper — تنظیمات کامل</h3>
                    <div className="control">
                      <label>Sample Size</label>
                      <select value={eyedropperSample} onChange={e => setEyedropperSample(Number(e.target.value) as any)}>
                        <option value={1}>Point Sample — یک پیکسل</option>
                        <option value={3}>3 × 3 Average</option>
                        <option value={5}>5 × 5 Average</option>
                      </select>
                    </div>
                    <div className="control">
                      <label>Sample From</label>
                      <select value={eyedropperSource} onChange={e => setEyedropperSource(e.target.value as any)}>
                        <option value="current">Current Layer — لایه فعال</option>
                        <option value="all">All Layers — تصویر نهایی</option>
                      </select>
                    </div>
                    {lastSampledColor && (
                      <div className="control">
                        <label>آخرین رنگ نمونه‌گیری‌شده</label>
                        <div className="input-row" style={{ gap: 10, alignItems: 'center' }}>
                          <input type="color" value={lastSampledColor} readOnly />
                          <code>{lastSampledColor}</code>
                        </div>
                      </div>
                    )}
                    <p className="panel-hint">کلیک روی بوم = برداشتن رنگ و تنظیم رنگ قلم / متن / Shape</p>
                  </>
                )}

                {tool === 'move' && (
                  <>
                    <h3>Move / Transform</h3>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={showTransformControls} onChange={e => setShowTransformControls(e.target.checked)} />
                        Show Transform Controls — کادر دستگیره
                      </label>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={lockTransformAspect} onChange={e => setLockTransformAspect(e.target.checked)} />
                        قفل نسبت هنگام Scale
                      </label>
                      <p className="panel-hint">Shift هنگام درگ هم نسبت را قفل می‌کند</p>
                    </div>
                    <div className="control checkbox">
                      <label>
                        <input type="checkbox" checked={autoSelectLayer} onChange={e => setAutoSelectLayer(e.target.checked)} />
                        Auto-Select Layer — لایه زیر کلیک
                      </label>
                    </div>
                    <div className="control">
                      <label>Align</label>
                      <div className="input-row" style={{ flexWrap: 'wrap', gap: 6 }}>
                        <button type="button" className="opt-btn" onClick={() => alignActiveLayer('left')}>چپ</button>
                        <button type="button" className="opt-btn" onClick={() => alignActiveLayer('center-h')}>وسط H</button>
                        <button type="button" className="opt-btn" onClick={() => alignActiveLayer('right')}>راست</button>
                        <button type="button" className="opt-btn" onClick={() => alignActiveLayer('top')}>بالا</button>
                        <button type="button" className="opt-btn" onClick={() => alignActiveLayer('center-v')}>وسط V</button>
                        <button type="button" className="opt-btn" onClick={() => alignActiveLayer('bottom')}>پایین</button>
                      </div>
                    </div>
                    <p className="panel-hint">درگ = جابه‌جایی · دستگیره = Scale · چرخش از نقطه چرخش</p>
                  </>
                )}

                {tool === 'hand' && (
                  <>
                    <h3>Hand Tool</h3>
                    <p className="panel-hint">تنظیم خاصی ندارد — فقط برای جابه‌جایی نمای بوم.</p>
                    <ul className="panel-hint" style={{ margin: '8px 0', paddingRight: 18 }}>
                      <li>درگ با Hand = جابه‌جایی</li>
                      <li>نگه‌داشتن Space = Hand موقت</li>
                      <li>کلیک وسط ماوس = Pan</li>
                    </ul>
                    <div className="input-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="opt-btn" onClick={() => fitToView()}>Fit to Screen</button>
                      <button type="button" className="opt-btn" onClick={zoomToActual}>۱۰۰٪</button>
                    </div>
                  </>
                )}

                {tool === 'zoom' && (
                  <>
                    <h3>Zoom Tool</h3>
                    <p className="panel-hint">کلیک = بزرگ‌نمایی · Alt+کلیک = کوچک‌نمایی · چرخ ماوس هم کار می‌کند</p>
                    <div className="control">
                      <label>زوم فعلی: {Math.round(scale * 100)}%</label>
                      <input type="range" min={5} max={1000} value={Math.round(scale * 100)}
                        onChange={e => setZoomPercent(Number(e.target.value))} />
                    </div>
                    <div className="control">
                      <label>مقدار دقیق</label>
                      <div className="input-row">
                        <input type="number" min={5} max={1000} value={Math.round(scale * 100)}
                          onChange={e => setZoomPercent(Number(e.target.value) || 100)} className="num-input" />
                        <span className="unit">%</span>
                      </div>
                    </div>
                    <div className="input-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <button type="button" className="opt-btn" onClick={zoomIn}>Zoom In (+)</button>
                      <button type="button" className="opt-btn" onClick={zoomOut}>Zoom Out (−)</button>
                      <button type="button" className="opt-btn" onClick={() => fitToView()}>Fit to Screen</button>
                      <button type="button" className="opt-btn" onClick={zoomToActual}>۱۰۰٪</button>
                      <button type="button" className="opt-btn" onClick={() => setZoomPercent(50)}>۵۰٪</button>
                      <button type="button" className="opt-btn" onClick={() => setZoomPercent(200)}>۲۰۰٪</button>
                      <button type="button" className="opt-btn" onClick={() => setZoomPercent(400)}>۴۰۰٪</button>
                    </div>
                    <p className="panel-hint" style={{ marginTop: 10 }}>
                      میانبر: + / − · 0 = Fit · چرخ ماوس روی بوم
                    </p>
                  </>
                )}
              </div>
            )}

            {panelTab === 'layers' && (
              <div className="panel-content">
                <div className="layers-header">
                  <h3>لایه‌ها</h3>
                  <button className="icon-btn" onClick={addLayer} title="لایه جدید">{Icons.plus}</button>
                </div>

                <div className="layers-list">
                  {layers.map((layer, idx) => (
                    <div
                      key={layer.id}
                      className={`layer-item ${activeLayerId === layer.id ? 'active' : ''} ${!layer.visible ? 'hidden-layer' : ''}`}
                      onClick={() => selectLayer(layer.id)}
                    >
                      <button
                        className="icon-btn sm"
                        onClick={e => { e.stopPropagation(); toggleVisibility(layer.id) }}
                        title={layer.visible ? 'مخفی' : 'نمایش'}
                      >
                        {layer.visible ? Icons.eye : Icons.eyeOff}
                      </button>

                      <div className="layer-info">
                        <input
                          className="layer-name"
                          value={layer.name}
                          onChange={e => renameLayer(layer.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={layer.opacity}
                          onChange={e => setLayerOpacity(layer.id, Number(e.target.value))}
                          onClick={e => e.stopPropagation()}
                          title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
                        />
                      </div>

                      <div className="layer-actions">
                        <button className="icon-btn sm" onClick={e => { e.stopPropagation(); moveLayer(layer.id, -1) }} disabled={idx === 0} title="بالا">
                          {Icons.chevronUp}
                        </button>
                        <button className="icon-btn sm" onClick={e => { e.stopPropagation(); moveLayer(layer.id, 1) }} disabled={idx === layers.length - 1} title="پایین">
                          {Icons.chevronDown}
                        </button>
                        <button className="icon-btn sm" onClick={e => { e.stopPropagation(); toggleLock(layer.id) }} title={layer.locked ? 'باز کردن' : 'قفل'}>
                          {layer.locked ? Icons.lock : <Icon size={14}><rect x="3" y="11" width="18" height="11" rx="2" opacity="0.3" /><path d="M7 11V7a5 5 0 0 1 10 0v4" opacity="0.3" /></Icon>}
                        </button>
                        <button className="icon-btn sm danger" onClick={e => { e.stopPropagation(); deleteLayer(layer.id) }} disabled={layers.length <= 1} title="حذف">
                          {Icons.trash}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="hint">
                  روی لایه کلیک کنید تا فعال شود.
                  نقاشی فقط روی لایه فعال انجام می‌شود.
                </p>
              </div>
            )}
          </aside>
        )}

        <div
          className={`canvas-wrapper cursor-${tool}`}
          ref={containerRef}
        >
          {docCreated ? (
            <>
            {/* Brush size cursor ring */}
            {/* Pen path preview */}
            {tool === 'pen' && penPoints.length > 0 && (() => {
              const pts = penPoints.map(p => docToScreen(p.x, p.y))
              const pointsAttr = pts.map(p => `${p.x},${p.y}`).join(' ')
              const rubber = penRubberBand && penCursorDoc
                ? docToScreen(penCursorDoc.x, penCursorDoc.y)
                : null
              const last = pts[pts.length - 1]
              return (
                <svg className="selection-svg" width="100%" height="100%">
                  {pts.length > 1 && (
                    <polyline points={pointsAttr} className="pen-path" fill="none" />
                  )}
                  {rubber && last && (
                    <line
                      x1={last.x} y1={last.y}
                      x2={rubber.x} y2={rubber.y}
                      className="pen-rubber"
                    />
                  )}
                  {penAutoClose && pts.length >= 2 && (
                    <circle cx={pts[0].x} cy={pts[0].y} r="8" className="pen-close-hint" />
                  )}
                  {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" className="pen-anchor" />
                  ))}
                </svg>
              )
            })()}

            {/* Shape preview */}
            {shapePreview && shapePreview.w > 0 && (() => {
              const tl = docToScreen(shapePreview.x, shapePreview.y)
              const br = docToScreen(shapePreview.x + shapePreview.w, shapePreview.y + shapePreview.h)
              const left = Math.min(tl.x, br.x)
              const top = Math.min(tl.y, br.y)
              const width = Math.abs(br.x - tl.x)
              const height = Math.abs(br.y - tl.y)
              return (
                <div
                  className={`shape-preview ${shapePreview.kind}`}
                  style={{
                    left, top, width, height,
                    borderColor: shapeStroke ? shapeStrokeColor : shapeFillColor,
                    background: shapeFill ? shapeFillColor + '44' : 'transparent',
                    borderRadius: shapePreview.kind === 'ellipse' ? '50%' : Math.min(shapeCornerRadius * scale, width / 2, height / 2),
                  }}
                />
              )
            })()}

            {/* Text editor overlay */}
            {textEditor && (
              <div
                className="text-editor"
                style={{
                  left: textEditor.screenX,
                  top: textEditor.screenY,
                  transform: textAlign === 'right' ? 'translateX(-100%)' : textAlign === 'center' ? 'translateX(-50%)' : undefined,
                }}
              >
                <textarea
                  autoFocus
                  rows={2}
                  value={textEditor.value}
                  placeholder="متن را بنویسید..."
                  style={{
                    fontSize: Math.max(12, fontSize * scale * 0.5),
                    color: textColor,
                    fontFamily: fontFamily,
                    fontWeight: textBold ? 'bold' : 'normal',
                    letterSpacing: letterSpacing + 'px',
                    lineHeight: lineHeight,
                    textAlign: textAlign,
                    resize: 'both',
                    minWidth: 180,
                  }}
                  onChange={e => setTextEditor(te => te ? { ...te, value: e.target.value } : null)}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      commitText()
                    }
                    if (e.key === 'Escape') { textEditorRef.current = null; setTextEditor(null) }
                  }}
                  onBlur={() => commitText()}
                />
                <div className="text-editor-hint">Enter = ثبت · Shift+Enter = خط جدید · Esc = لغو</div>
              </div>
            )}

            {/* Gradient preview line */}
            {gradientPreview && (() => {
              const a = docToScreen(gradientPreview.x1, gradientPreview.y1)
              const b = docToScreen(gradientPreview.x2, gradientPreview.y2)
              return (
                <svg className="selection-svg" width="100%" height="100%">
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="gradient-line" />
                  <circle cx={a.x} cy={a.y} r="4" className="gradient-dot" />
                  <circle cx={b.x} cy={b.y} r="4" className="gradient-dot" />
                </svg>
              )
            })()}

            {/* Clone source marker */}
            {tool === 'clone' && cloneHasSource && (cloneSourceScreen || cloneSource.current) && (() => {
              const dpr = dprRef.current || 1
              const src = cloneSourceScreen || cloneSource.current!
              const p = docToScreen(src.x / dpr, src.y / dpr)
              return (
                <div className="clone-marker" style={{ left: p.x, top: p.y }} title="نقطه منبع Clone" />
              )
            })()}

            {/* Crop overlay */}
            {tool === 'crop' && cropRect && cropRect.w > 1 && cropRect.h > 1 && (() => {
              const tl = docToScreen(cropRect.x, cropRect.y)
              const br = docToScreen(cropRect.x + cropRect.w, cropRect.y + cropRect.h)
              const left = Math.min(tl.x, br.x)
              const top = Math.min(tl.y, br.y)
              const width = Math.abs(br.x - tl.x)
              const height = Math.abs(br.y - tl.y)
              return (
                <>
                  <div className="crop-shade crop-shade-t" style={{ left: 0, top: 0, right: 0, height: top }} />
                  <div className="crop-shade crop-shade-b" style={{ left: 0, top: top + height, right: 0, bottom: 0 }} />
                  <div className="crop-shade crop-shade-l" style={{ left: 0, top, width: left, height }} />
                  <div className="crop-shade crop-shade-r" style={{ left: left + width, top, right: 0, height }} />
                  <div className="crop-box" style={{ left, top, width, height }}>
                    <div className="crop-rule crop-rule-v" style={{ left: '33.33%' }} />
                    <div className="crop-rule crop-rule-v" style={{ left: '66.66%' }} />
                    <div className="crop-rule crop-rule-h" style={{ top: '33.33%' }} />
                    <div className="crop-rule crop-rule-h" style={{ top: '66.66%' }} />
                  </div>
                  <div className="crop-size-badge" style={{ left: left + width / 2, top: top - 28 }}>
                    {Math.round(cropRect.w)} × {Math.round(cropRect.h)} px
                    {cropStraighten !== 0 ? ` · ${cropStraighten.toFixed(1)}°` : ''}
                  </div>
                  <div className="crop-actions" style={{ left: left + width / 2, top: top + height + 12 }}>
                    <button className="btn-primary" onClick={applyCrop}>اعمال برش (Enter)</button>
                    <button className="btn-secondary" onClick={() => setCropRect(null)}>لغو</button>
                  </div>
                </>
              )
            })()}

            {/* Selection overlay */}
            {selection && selection.runs && selectionMaskD && (
              <svg className="selection-svg" width="100%" height="100%">
                <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
                  <path d={selectionMaskD} className="selection-mask" />
                </g>
              </svg>
            )}
            {selection && !selection.runs && (selection.w > 0 || (selection.points && selection.points.length > 1)) && (() => {
              if (selection.shape === 'lasso' && selection.points && selection.points.length > 1) {
                const pts = selection.points.map(p => docToScreen(p.x, p.y))
                const pointsAttr = pts.map(p => `${p.x},${p.y}`).join(' ')
                return (
                  <svg className="selection-svg" width="100%" height="100%">
                    <polygon points={pointsAttr} className="selection-lasso" />
                  </svg>
                )
              }
              const tl = docToScreen(selection.x, selection.y)
              const br = docToScreen(selection.x + selection.w, selection.y + selection.h)
              const left = Math.min(tl.x, br.x)
              const top = Math.min(tl.y, br.y)
              const width = Math.abs(br.x - tl.x)
              const height = Math.abs(br.y - tl.y)
              return (
                <div
                  className={`selection-box ${selection.shape === 'ellipse' ? 'ellipse' : 'rect'}`}
                  style={{ left, top, width, height }}
                />
              )
            })()}

            {/* Transform box for Move tool — updates live with layer transform */}
            {tool === 'move' && showTransformControls && activeLayerId && (() => {
              const layer = layers.find(l => l.id === activeLayerId)
              if (!layer || !layer.visible) return null
              const b = getLayerBounds(layer)
              const tl = docToScreen(b.x, b.y)
              const br = docToScreen(b.x + b.w, b.y + b.h)
              const left = Math.min(tl.x, br.x)
              const top = Math.min(tl.y, br.y)
              const width = Math.max(1, Math.abs(br.x - tl.x))
              const height = Math.max(1, Math.abs(br.y - tl.y))
              const rot = layerRotations[layer.id] || 0
              const handles = [
                { id: 'nw', x: 0, y: 0, cursor: 'nwse-resize', corner: true },
                { id: 'n', x: 0.5, y: 0, cursor: 'ns-resize', corner: false },
                { id: 'ne', x: 1, y: 0, cursor: 'nesw-resize', corner: true },
                { id: 'e', x: 1, y: 0.5, cursor: 'ew-resize', corner: false },
                { id: 'se', x: 1, y: 1, cursor: 'nwse-resize', corner: true },
                { id: 's', x: 0.5, y: 1, cursor: 'ns-resize', corner: false },
                { id: 'sw', x: 0, y: 1, cursor: 'nesw-resize', corner: true },
                { id: 'w', x: 0, y: 0.5, cursor: 'ew-resize', corner: false },
              ]

              const commitLayers = () => {
                setLayers(layersRef.current.map(l => ({ ...l })))
                setLayerScales({ ...layerScalesRef.current })
                setLayerRotations({ ...layerRotationsRef.current })
              }

              const startDocDrag = (
                e: React.PointerEvent,
                mode: 'move' | 'scale' | 'rotate',
                handleId?: string,
              ) => {
                e.preventDefault()
                e.stopPropagation()
                if (layer.locked) return

                const pos = getPos(e as any)
                moveStart.current = { x: pos.x, y: pos.y }
                const sc = layerScalesRef.current[layer.id] || { sx: 1, sy: 1 }
                const w = layer.canvas.width * sc.sx
                const h = layer.canvas.height * sc.sy
                const L0 = layersRef.current.find(l => l.id === layer.id)
                if (!L0) return

                if (mode === 'move') {
                  isMoving.current = true
                  isTransforming.current = false
                  transformHandle.current = null
                  moveOriginOffset.current = { x: L0.offsetX, y: L0.offsetY }
                } else if (mode === 'rotate') {
                  isTransforming.current = true
                  isMoving.current = false
                  transformHandle.current = 'rotate'
                  const cx = L0.offsetX + w / 2
                  const cy = L0.offsetY + h / 2
                  rotateStartAngle.current = Math.atan2(pos.y - cy, pos.x - cx)
                  rotateOriginAngle.current = layerRotationsRef.current[layer.id] || 0
                  transformOrigin.current = { x: cx, y: cy, w, h, ox: L0.offsetX, oy: L0.offsetY }
                } else {
                  isTransforming.current = true
                  isMoving.current = false
                  transformHandle.current = handleId || 'se'
                  transformOrigin.current = {
                    x: pos.x, y: pos.y, w, h, ox: L0.offsetX, oy: L0.offsetY,
                  }
                }
                saveHistory(false) // transform is non-destructive until you paint

                let raf = 0
                const onMove = (ev: PointerEvent) => {
                  const p = getPos(ev)
                  const L = layersRef.current.find(l => l.id === layer.id)
                  if (!L || !moveStart.current) return

                  if (isMoving.current) {
                    L.offsetX = moveOriginOffset.current.x + (p.x - moveStart.current.x)
                    L.offsetY = moveOriginOffset.current.y + (p.y - moveStart.current.y)
                    layersRef.current = layersRef.current.map(l =>
                      l.id === L.id ? { ...l, offsetX: L.offsetX, offsetY: L.offsetY, canvas: l.canvas } : l
                    )
                  } else if (isTransforming.current && transformOrigin.current && transformHandle.current) {
                    const orig = transformOrigin.current
                    const handle = transformHandle.current
                    if (handle === 'rotate') {
                      const angle = Math.atan2(p.y - orig.y, p.x - orig.x)
                      let deg = rotateOriginAngle.current + ((angle - rotateStartAngle.current) * 180) / Math.PI
                      if (ev.shiftKey) deg = Math.round(deg / 15) * 15
                      layerRotationsRef.current = { ...layerRotationsRef.current, [L.id]: deg }
                    } else {
                      // resize in the layer's own (rotated) frame
                      const rawDx = p.x - moveStart.current.x
                      const rawDy = p.y - moveStart.current.y
                      const rotRad = ((layerRotationsRef.current[L.id] || 0) * Math.PI) / 180
                      const cosR = Math.cos(rotRad), sinR = Math.sin(rotRad)
                      const dx = rawDx * cosR + rawDy * sinR
                      const dy = -rawDx * sinR + rawDy * cosR
                      let newW = orig.w, newH = orig.h, newOx = orig.ox, newOy = orig.oy
                      if (handle === 'e') newW = Math.max(8, orig.w + dx)
                      else if (handle === 'w') { newW = Math.max(8, orig.w - dx); newOx = orig.ox + (orig.w - newW) }
                      else if (handle === 's') newH = Math.max(8, orig.h + dy)
                      else if (handle === 'n') { newH = Math.max(8, orig.h - dy); newOy = orig.oy + (orig.h - newH) }
                      else if (handle === 'ne') { newW = Math.max(8, orig.w + dx); newH = Math.max(8, orig.h - dy); newOy = orig.oy + (orig.h - newH) }
                      else if (handle === 'nw') { newW = Math.max(8, orig.w - dx); newH = Math.max(8, orig.h - dy); newOx = orig.ox + (orig.w - newW); newOy = orig.oy + (orig.h - newH) }
                      else if (handle === 'se') { newW = Math.max(8, orig.w + dx); newH = Math.max(8, orig.h + dy) }
                      else if (handle === 'sw') { newW = Math.max(8, orig.w - dx); newH = Math.max(8, orig.h + dy); newOx = orig.ox + (orig.w - newW) }
                      // Lock aspect ratio (also with Shift)
                      if ((lockAspectRef.current || ev.shiftKey) && orig.w > 0 && orig.h > 0) {
                        const ratio = orig.w / orig.h
                        if (handle === 'e' || handle === 'w') {
                          newH = Math.max(8, newW / ratio)
                          if (handle === 'w') newOy = orig.oy + (orig.h - newH) / 2
                          else newOy = orig.oy + (orig.h - newH) / 2
                        } else if (handle === 'n' || handle === 's') {
                          newW = Math.max(8, newH * ratio)
                          newOx = orig.ox + (orig.w - newW) / 2
                        } else {
                          // corners: use the dominant delta
                          if (Math.abs(dx) * orig.h > Math.abs(dy) * orig.w) {
                            newH = Math.max(8, newW / ratio)
                          } else {
                            newW = Math.max(8, newH * ratio)
                          }
                          if (handle.includes('w')) newOx = orig.ox + (orig.w - newW)
                          if (handle.includes('n')) newOy = orig.oy + (orig.h - newH)
                        }
                      }
                      if (rotRad !== 0) {
                        // keep the opposite edge fixed: rotate the local centre shift into the document frame
                        const lcx = newOx + newW / 2 - (orig.ox + orig.w / 2)
                        const lcy = newOy + newH / 2 - (orig.oy + orig.h / 2)
                        newOx = orig.ox + orig.w / 2 + lcx * cosR - lcy * sinR - newW / 2
                        newOy = orig.oy + orig.h / 2 + lcx * sinR + lcy * cosR - newH / 2
                      }
                      L.offsetX = newOx
                      L.offsetY = newOy
                      layersRef.current = layersRef.current.map(l =>
                        l.id === L.id ? { ...l, offsetX: newOx, offsetY: newOy, canvas: l.canvas } : l
                      )
                      layerScalesRef.current = {
                        ...layerScalesRef.current,
                        [L.id]: { sx: newW / L.canvas.width, sy: newH / L.canvas.height },
                      }
                    }
                  }

                  composite()
                  // Live-update React state (box) via rAF so box tracks transform
                  if (!raf) {
                    raf = requestAnimationFrame(() => {
                      raf = 0
                      commitLayers()
                    })
                  }
                }

                const onUp = () => {
                  window.removeEventListener('pointermove', onMove)
                  window.removeEventListener('pointerup', onUp)
                  window.removeEventListener('pointercancel', onUp)
                  if (raf) cancelAnimationFrame(raf)
                  isMoving.current = false
                  isTransforming.current = false
                  transformHandle.current = null
                  moveStart.current = null
                  transformOrigin.current = null
                  commitLayers()
                  composite()
                }

                window.addEventListener('pointermove', onMove)
                window.addEventListener('pointerup', onUp)
                window.addEventListener('pointercancel', onUp)
              }

              return (
                <div
                  className="transform-box"
                  style={{
                    left: left + width / 2,
                    top: top + height / 2,
                    width,
                    height,
                    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
                  }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).classList.contains('transform-handle')) return
                    startDocDrag(e, 'move')
                  }}
                >
                  {handles.map(h => (
                    <div
                      key={h.id}
                      className={`transform-handle handle-${h.id}`}
                      style={{
                        left: `${h.x * 100}%`,
                        top: `${h.y * 100}%`,
                        cursor: h.cursor,
                      }}
                      title={h.corner ? 'درگ = اندازه | Alt+درگ = چرخش' : 'تغییر اندازه'}
                      onPointerDown={(e) => {
                        const mode = (e.altKey && h.corner) ? 'rotate' : 'scale'
                        startDocDrag(e, mode, h.id)
                      }}
                    />
                  ))}
                </div>
              )
            })()}

            {cursorOverCanvas && cursorPos && (tool === 'brush' || tool === 'eraser') && (() => {
              // Exact screen size: document-pixel size mapped through current canvas display scale
              const canvas = displayRef.current
              let screenSize = size * scale
              if (canvas && doc.width > 0) {
                const rect = canvas.getBoundingClientRect()
                screenSize = size * (rect.width / doc.width)
              }
              return (
                <div
                  className="brush-cursor"
                  style={{
                    left: cursorPos.x,
                    top: cursorPos.y,
                    width: Math.max(2, screenSize),
                    height: Math.max(2, screenSize),
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )
            })()}
            <div
              className="canvas-transform"
              style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0' }}
            >
              <canvas
                ref={displayRef}
                className="drawing-canvas"
                style={{
                  imageRendering: scale >= 3 ? 'pixelated' : 'auto',
                  ...(doc.bg === 'transparent'
                    ? { background: 'repeating-conic-gradient(#cfcfcf 0% 25%, #ffffff 0% 50%) 50% / 16px 16px' }
                    : {}),
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={(e) => { onPointerUp(e); setCursorOverCanvas(false); setCursorPos(null) }}
                onPointerCancel={onPointerUp}
                onPointerEnter={() => setCursorOverCanvas(true)}
              />
            </div>
            </>
          ) : (
            <div className="empty-state">
              <p>برای شروع یک سند جدید بسازید</p>
              <button className="btn-primary" onClick={() => setShowNewDoc(true)}>سند جدید</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
