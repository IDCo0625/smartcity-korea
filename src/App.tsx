/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Coins, 
  Users, 
  Palette, 
  Cpu, 
  Utensils, 
  Zap, 
  Plus, 
  Trash2,
  Info,
  MessageSquare,
  Play,
  MapPin,
  RefreshCcw,
  Trophy,
  ExternalLink,
  Lock,
  User,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { ResourceType, BuildingType, BUILDINGS, GameState, Building, Region, REGION_BONUS, LANDMARKS } from './types';
import { GoogleGenAI } from "@google/genai";

const GRID_ROWS = 7;
const GRID_COLS = 6;

const INITIAL_RESOURCES: Record<ResourceType, number> = {
  [ResourceType.POPULATION]: 5,
  [ResourceType.CULTURE]: 5,
  [ResourceType.TECH]: 5,
  [ResourceType.FOOD]: 5,
  [ResourceType.MONEY]: 5,
  [ResourceType.ENERGY]: 5,
  [ResourceType.MASTER]: 5,
};

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  [ResourceType.POPULATION]: <Users className="w-5 h-5 text-blue-500" />,
  [ResourceType.CULTURE]: <Palette className="w-5 h-5 text-purple-500" />,
  [ResourceType.TECH]: <Cpu className="w-5 h-5 text-yellow-500" />,
  [ResourceType.FOOD]: <Utensils className="w-5 h-5 text-green-500" />,
  [ResourceType.MONEY]: <Coins className="w-5 h-5 text-amber-500" />,
  [ResourceType.ENERGY]: <Zap className="w-5 h-5 text-red-500" />,
  [ResourceType.MASTER]: <TrendingUp className="w-5 h-5 text-indigo-500" />,
};

const ALLOWED_CREDENTIALS: Record<string, string> = {
  'futurecanvas1': 'fcfc1231',
  'futurecanvas2': 'fcfc1232',
  'futurecanvas3': 'fcfc1233',
  'futurecanvas4': 'fcfc1234',
  'futurecanvas5': 'fcfc1235',
  'futurecanvas6': 'fcfc1236',
  'futurecanvas': 'themasterfc',
};

// ==========================================
// 3D Isometric / Orthogonal Custom Engine
// ==========================================

interface Cube3DProps {
  w: number;
  h: number;
  d: number;
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  topClass?: string;
  frontClass?: string;
  leftClass?: string;
  children?: React.ReactNode;
  animation?: string;
  className?: string;
}

const Cube3D: React.FC<Cube3DProps> = ({
  w, h, d,
  x = 0, y = 0, z = 0,
  rx = 0, ry = 0, rz = 0,
  topClass = 'bg-slate-500',
  frontClass = 'bg-slate-600',
  leftClass = 'bg-slate-700',
  children,
  animation = '',
  className = ''
}) => {
  return (
    <div 
      className={`absolute transition-all duration-300 ${animation} ${className}`}
      style={{
        width: `${w}px`,
        height: `${d}px`,
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Top face (ground surface / roof surface) */}
      <div 
        className={`absolute inset-0 ${topClass} border border-white/5 face-top-light`} 
        style={{ transform: `translate3d(0, 0, ${h}px)`, transformStyle: 'preserve-3d' }}
      >
        {children}
      </div>
      {/* Front face (extruding down) */}
      <div 
        className={`absolute ${frontClass} border border-black/10 origin-top face-side-medium`}
        style={{
          width: `${w}px`,
          height: `${h}px`,
          transform: `rotateX(-90deg) translate3d(0, 0, ${-d}px)`,
          top: `${d}px`,
        }}
      />
      {/* Left face (extruding side-left) */}
      <div 
        className={`absolute ${leftClass} border border-black/15 origin-left face-side-dark`}
        style={{
          width: `${d}px`,
          height: `${h}px`,
          transform: `rotateY(90deg) rotateZ(-90deg) translate3d(0, 0, 0)`,
        }}
      />
    </div>
  );
};

const Building3DRenderer: React.FC<{ building: Building }> = ({ building }) => {
  const type = building.type;

  // Obstacles / Natural features (Mountain, Halla Mountain, Jeju Airport)
  if (building.isObstacle) {
    if (building.name === '한라산') {
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          {/* Layered mountain peaks */}
          <Cube3D w={50} h={18} d={50} x={4} y={4} z={0} topClass="bg-amber-900" frontClass="bg-amber-955" leftClass="bg-stone-900" />
          <Cube3D w={36} h={18} d={36} x={11} y={11} z={18} topClass="bg-emerald-800" frontClass="bg-emerald-900" leftClass="bg-emerald-950" />
          <Cube3D w={22} h={16} d={22} x={18} y={18} z={36} topClass="bg-white" frontClass="bg-slate-200" leftClass="bg-slate-300" />
        </div>
      );
    }
    
    if (building.name === '산' || building.type === BuildingType.MOUNTAIN) {
      if (building.displayText && building.displayText !== '한라산') {
        // 제주국제공항 텍스트 블록
        return (
          <div className="absolute inset-0 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
            <Cube3D w={52} h={16} d={52} x={3} y={3} z={0} topClass="bg-slate-200" frontClass="bg-slate-350" leftClass="bg-slate-400">
              <div className="absolute inset-0 flex items-center justify-center font-black text-[9px] text-slate-800 font-sans tracking-widest">{building.displayText}</div>
            </Cube3D>
          </div>
        );
      }
      // 일반 산
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={44} h={26} d={44} x={7} y={7} z={0} topClass="bg-amber-955" frontClass="bg-amber-900" leftClass="bg-stone-800" />
          <Cube3D w={24} h={18} d={24} x={17} y={17} z={26} topClass="bg-emerald-800" frontClass="bg-emerald-900" leftClass="bg-emerald-950" />
        </div>
      );
    }
  }

  // Landmarks
  if (building.isLandmark) {
    const id = building.id;
    // 수도권 시그니쳐타워
    if (id === 'landmark_capital') {
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={46} h={35} d={46} x={6} y={6} z={0} topClass="bg-indigo-700" frontClass="bg-indigo-800" leftClass="bg-indigo-900" />
          <Cube3D w={30} h={35} d={30} x={14} y={14} z={35} topClass="bg-cyan-600" frontClass="bg-cyan-700" leftClass="bg-cyan-800" />
          <Cube3D w={16} h={30} d={16} x={21} y={21} z={70} topClass="bg-slate-50" frontClass="bg-slate-200" leftClass="bg-slate-300">
            <div className="absolute w-2 h-2 rounded-full bg-cyan-400 animate-pulse top-2 left-2" />
          </Cube3D>
          <Cube3D w={2} h={35} d={2} x={28} y={28} z={100} topClass="bg-amber-400" frontClass="bg-yellow-500" leftClass="bg-yellow-600" />
        </div>
      );
    }
    // 강원 올림픽경기장
    if (id === 'landmark_gangwon') {
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={50} h={20} d={50} x={4} y={4} z={0} topClass="bg-purple-900" frontClass="bg-purple-950" leftClass="bg-purple-950" />
          <Cube3D w={38} h={12} d={38} x={10} y={10} z={20} topClass="bg-emerald-600" frontClass="bg-purple-800" leftClass="bg-purple-900">
            <div className="absolute inset-0 flex items-center justify-center text-[7px] text-emerald-200 font-sans tracking-wide">ARENA</div>
          </Cube3D>
          <Cube3D w={10} h={10} d={10} x={24} y={24} z={32} topClass="bg-amber-400" frontClass="bg-rose-500" leftClass="bg-rose-600" className="animate-bounce" />
        </div>
      );
    }
    // 충청 과학통합센터
    if (id === 'landmark_chungcheong') {
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={34} h={26} d={34} x={12} y={12} z={0} topClass="bg-zinc-800" frontClass="bg-zinc-900" leftClass="bg-black" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] border-2 border-yellow-400/80 rounded-full orbital-ring-1" style={{ transformStyle: 'preserve-3d', zIndex: 50 }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[46px] h-[46px] border border-cyan-400/70 rounded-full orbital-ring-2" style={{ transformStyle: 'preserve-3d', zIndex: 50 }} />
          <Cube3D w={14} h={14} d={14} x={22} y={22} z={34} topClass="bg-yellow-300" frontClass="bg-amber-500" leftClass="bg-amber-600" className="animate-pulse" />
        </div>
      );
    }
    // 전라 AI스마트팜
    if (id === 'landmark_jeolla') {
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={44} h={18} d={44} x={7} y={7} z={0} topClass="bg-emerald-900" frontClass="bg-emerald-950" leftClass="bg-stone-900" />
          <Cube3D w={34} h={18} d={34} x={12} y={12} z={18} topClass="bg-green-700" frontClass="bg-green-800" leftClass="bg-green-950" />
          <Cube3D w={22} h={16} d={22} x={18} y={18} z={36} topClass="bg-white" frontClass="bg-slate-200" leftClass="bg-slate-350" />
          <div className="absolute bio-hologram" style={{ transformStyle: 'preserve-3d' }}>
            <Cube3D w={8} h={8} d={8} x={25} y={25} z={58} topClass="bg-green-400" frontClass="bg-green-500" leftClass="bg-green-650" />
          </div>
        </div>
      );
    }
    // 경상 스마트항만
    if (id === 'landmark_gyeongsang') {
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={52} h={10} d={52} x={3} y={3} z={0} topClass="bg-blue-900" frontClass="bg-blue-950" leftClass="bg-cyan-950" />
          <Cube3D w={36} h={10} d={36} x={3} y={3} z={10} topClass="bg-slate-700" frontClass="bg-slate-800" leftClass="bg-slate-900" />
          <Cube3D w={12} h={10} d={22} x={8} y={8} z={20} topClass="bg-amber-500" frontClass="bg-amber-600" leftClass="bg-amber-700" />
          <Cube3D w={10} h={8} d={18} x={23} y={10} z={20} topClass="bg-rose-500" frontClass="bg-rose-600" leftClass="bg-rose-700" />
          <Cube3D w={6} h={40} d={6} x={35} y={18} z={10} topClass="bg-yellow-400" frontClass="bg-yellow-500" leftClass="bg-yellow-600" />
          <Cube3D w={28} h={5} d={5} x={10} y={18} z={50} topClass="bg-yellow-400" frontClass="bg-yellow-500" leftClass="bg-yellow-600" />
        </div>
      );
    }
    // 제주 해상풍력단지
    if (id === 'landmark_jeju') {
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={52} h={8} d={52} x={3} y={3} z={0} topClass="bg-sky-700" frontClass="bg-sky-850" leftClass="bg-sky-900" />
          <Cube3D w={6} h={48} d={6} x={26} y={26} z={8} topClass="bg-slate-100" frontClass="bg-slate-200" leftClass="bg-slate-350" />
          <Cube3D w={10} h={8} d={14} x={24} y={22} z={56} topClass="bg-white" frontClass="bg-slate-100" leftClass="bg-slate-200" />
          <div 
            className="absolute turbine-blades" 
            style={{ 
              width: '54px', 
              height: '54px', 
              left: '2px', 
              top: '2px', 
              transform: 'translate3d(0px, 0px, 60px) rotateY(90deg)', 
              transformStyle: 'preserve-3d' 
            }}
          >
            <div className="absolute top-[23px] left-[23px] w-2 h-2 rounded-full bg-amber-400" style={{ transform: 'translate3d(0, 0, 3px)' }} />
            <div className="absolute top-[27px] left-[25px] w-1 h-[24px] bg-slate-50 origin-top rounded-b" />
            <div className="absolute top-[27px] left-[25px] w-1 h-[24px] bg-slate-55 origin-top rounded-b rotate-120" />
            <div className="absolute top-[27px] left-[25px] w-1 h-[24px] bg-slate-100 origin-top rounded-b rotate-240" />
          </div>
        </div>
      );
    }
  }

  // Base Buildings
  switch (type) {
    case BuildingType.FACTORY:
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={44} h={24} d={36} x={7} y={11} z={0} topClass="bg-zinc-700" frontClass="bg-zinc-850" leftClass="bg-zinc-900" />
          <Cube3D w={14} h={8} d={36} x={9} y={11} z={24} rx={35} topClass="bg-zinc-650" frontClass="bg-zinc-750" leftClass="bg-zinc-800" />
          <Cube3D w={14} h={8} d={36} x={23} y={11} z={24} rx={35} topClass="bg-zinc-650" frontClass="bg-zinc-750" leftClass="bg-zinc-800" />
          <Cube3D w={6} h={38} d={6} x={41} y={14} z={0} topClass="bg-slate-500" frontClass="bg-slate-600" leftClass="bg-slate-700">
            <div className="absolute top-0.5 left-0.5 w-1 h-1 smoke-particle" style={{ animationDelay: '0s' }} />
            <div className="absolute top-0.5 left-0.5 w-1 h-1 smoke-particle" style={{ animationDelay: '1.2s' }} />
          </Cube3D>
          <Cube3D w={6} h={30} d={6} x={41} y={26} z={0} topClass="bg-slate-550" frontClass="bg-slate-650" leftClass="bg-slate-750">
            <div className="absolute top-0.5 left-0.5 w-1 h-1 smoke-particle" style={{ animationDelay: '0.6s' }} />
            <div className="absolute top-0.5 left-0.5 w-1 h-1 smoke-particle" style={{ animationDelay: '2.0s' }} />
          </Cube3D>
        </div>
      );

    case BuildingType.POWER_PLANT:
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={32} h={28} d={32} x={13} y={13} z={0} topClass="bg-rose-700" frontClass="bg-rose-800" leftClass="bg-rose-900" />
          <Cube3D w={16} h={38} d={16} x={6} y={8} z={0} topClass="bg-slate-600" frontClass="bg-slate-700" leftClass="bg-slate-755" />
          <Cube3D w={10} h={10} d={10} x={24} y={24} z={28} topClass="bg-rose-500" frontClass="bg-rose-600" leftClass="bg-rose-700">
            <div className="absolute top-1 left-1 w-2 h-2 plasma-reactor shadow-md" />
          </Cube3D>
        </div>
      );

    case BuildingType.HOUSING:
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={20} h={48} d={20} x={6} y={8} z={0} topClass="bg-slate-100" frontClass="bg-slate-200" leftClass="bg-slate-300">
            <div className="absolute inset-x-1 top-2 bottom-1.5 grid grid-cols-2 gap-x-1 gap-y-1 opacity-80" style={{ transform: 'translate3d(0,0,1px)' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`w-1 h-1 rounded-sm ${i % 2 === 0 ? 'bg-amber-300 shadow-[0_0_2px_#fbbf24]' : 'bg-slate-800'}`} />
              ))}
            </div>
          </Cube3D>
          <Cube3D w={18} h={36} d={18} x={32} y={30} z={0} topClass="bg-green-600" frontClass="bg-slate-150" leftClass="bg-slate-205">
            <div className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-rose-500 font-sans opacity-95">H</div>
            <div className="absolute inset-x-1 top-1.5 bottom-1 grid grid-cols-2 gap-x-1 gap-y-1 opacity-75" style={{ transform: 'translate3d(0,0,1px)' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-1 h-1 rounded-sm ${i % 3 === 0 ? 'bg-amber-300 shadow-[0_0_2px_#fbbf24]' : 'bg-slate-800'}`} />
              ))}
            </div>
          </Cube3D>
        </div>
      );

    case BuildingType.FOOD:
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={40} h={22} d={40} x={8} y={8} z={0} topClass="bg-emerald-400/20 border border-emerald-400/50" frontClass="bg-emerald-500/20" leftClass="bg-emerald-600/15">
            <div className="absolute inset-2 bg-emerald-600 border border-emerald-400/30 rounded" style={{ transform: 'translate3d(0,0,1px)', transformStyle: 'preserve-3d' }}>
              <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse top-1.5 left-1.5" />
              <div className="absolute w-1 h-1 rounded-full bg-emerald-400 animate-pulse bottom-1.5 right-1.5" />
            </div>
          </Cube3D>
          <div className="absolute bio-hologram" style={{ transformStyle: 'preserve-3d' }}>
            <Cube3D w={6} h={6} d={6} x={25} y={25} z={38} topClass="bg-emerald-400" frontClass="bg-emerald-500" leftClass="bg-emerald-650" />
          </div>
        </div>
      );

    case BuildingType.TECH:
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={20} h={42} d={32} x={7} y={12} z={0} topClass="bg-zinc-800" frontClass="bg-zinc-850" leftClass="bg-zinc-900">
            <div className="absolute inset-x-1 top-2 bottom-2 bg-slate-950 rounded flex flex-col justify-around items-center p-0.5">
              <div className="w-2 h-2 rounded-full bg-cyan-405 animate-pulse" />
              <div className="w-1.5 h-1 bg-yellow-400 shadow-[0_0_2px_#facc15]" />
              <div className="w-1.5 h-1 bg-cyan-400 shadow-[0_0_2px_#22d3ee]" />
            </div>
          </Cube3D>
          <Cube3D w={12} h={26} d={12} x={34} y={18} z={0} topClass="bg-zinc-700" frontClass="bg-zinc-750" leftClass="bg-zinc-800" />
          <Cube3D w={2} h={20} d={2} x={39} y={23} z={26} topClass="bg-yellow-400" frontClass="bg-yellow-500" leftClass="bg-yellow-600" />
        </div>
      );

    case BuildingType.CULTURE:
      return (
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
          <Cube3D w={40} h={22} d={40} x={8} y={8} z={0} topClass="bg-violet-600" frontClass="bg-violet-700" leftClass="bg-violet-800" />
          <Cube3D w={26} h={12} d={26} x={15} y={15} z={22} topClass="bg-indigo-400" frontClass="bg-indigo-500" leftClass="bg-indigo-600">
            <div className="absolute w-1.5 h-1.5 rounded-full bg-violet-300 shadow-[0_0_6px_#c084fc] animate-ping top-1 left-1" />
          </Cube3D>
        </div>
      );

    default:
      return null;
  }
};

interface Tile3DProps {
  r: number;
  c: number;
  cell: Building | null;
  selectedBuilding: BuildingType | null;
  getSynergyClass: (r: number, c: number) => string;
  handlePlaceBuilding: (r: number, c: number) => void;
  handleRemoveBuilding: (r: number, c: number) => void;
}

const Tile3D: React.FC<Tile3DProps> = ({
  r, c, cell,
  selectedBuilding,
  getSynergyClass,
  handlePlaceBuilding,
  handleRemoveBuilding
}) => {
  const isObstacle = cell?.isObstacle ?? false;
  const synergyClass = cell ? getSynergyClass(r, c) : '';
  const isSynergized = synergyClass !== '';

  let topGround = 'bg-slate-900/90 hover:bg-slate-850';
  let frontGround = 'bg-slate-950';
  if (cell) {
    topGround = 'bg-slate-805';
    frontGround = 'bg-slate-905';
  } else if (selectedBuilding) {
    topGround = 'bg-cyan-950/40 border border-cyan-500/20 hover:bg-cyan-950/60';
    frontGround = 'bg-cyan-950/80';
  }

  const handleTileClick = () => {
    if (cell) {
      if (!isObstacle) handleRemoveBuilding(r, c);
    } else {
      handlePlaceBuilding(r, c);
    }
  };

  return (
    <div 
      className="w-[58px] h-[58px] relative tile-3d-container tile-hover-lift cursor-pointer rounded-xl transition-all duration-300"
      onClick={handleTileClick}
      title={cell ? `${cell.name || cell.type} (클릭하여 철거)` : (selectedBuilding ? '클릭하여 건설' : '빈 공간')}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Dirt/Slate land block base of 12px height */}
      <Cube3D 
        w={56} h={12} d={56} 
        x={1} y={1} z={0} 
        topClass={`${topGround} border border-slate-700/30 ${isSynergized ? 'ring-2 ring-emerald-500/50' : ''}`} 
        frontClass={frontGround} 
        leftClass="bg-slate-950"
      />

      {/* Synergy Aura surrounding ring */}
      {isSynergized && (
        <div 
          className="absolute inset-[1px] rounded-lg border-2 animate-pulse" 
          style={{ 
            transform: 'translate3d(0, 0, 14px)',
            borderColor: 
              synergyClass.includes('factory') ? '#f97316' :
              synergyClass.includes('culture') ? '#8b5cf6' :
              synergyClass.includes('power') ? '#ef4444' :
              synergyClass.includes('housing') ? '#0ea5e9' :
              synergyClass.includes('food') ? '#10b981' : '#eab308',
            boxShadow: '0 0 10px currentColor'
          }} 
        />
      )}

      {/* Render 3D modeled buildings */}
      {cell && (
        <div className="absolute inset-0" style={{ transform: 'translate3d(0, 0, 13px)', transformStyle: 'preserve-3d' }}>
          <Building3DRenderer building={cell} />
        </div>
      )}

      {/* Construction Assist Target Plus */}
      {!cell && selectedBuilding && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none" 
          style={{ transform: 'translate3d(0, 0, 15px)', transformStyle: 'preserve-3d' }}
        >
          <div className="w-5 h-5 rounded-full bg-cyan-950/70 border border-cyan-400 flex items-center justify-center animate-ping">
            <Plus className="w-3 h-3 text-cyan-400" />
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [cameraRotation, setCameraRotation] = useState<number>(-45);
  const [cameraTilt, setCameraTilt] = useState<number>(60);
  const [cameraZoom, setCameraZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode !== '3d') return;
    setCameraZoom(prev => Math.max(0.5, Math.min(1.5, prev - e.deltaY * 0.001)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== '3d') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== '3d') return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setCameraRotation(prev => prev + dx * 0.6);
    setCameraTilt(prev => Math.max(25, Math.min(80, prev + dy * 0.5)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode !== '3d' || e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || viewMode !== '3d' || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setCameraRotation(prev => prev + dx * 0.6);
    setCameraTilt(prev => Math.max(25, Math.min(80, prev + dy * 0.5)));
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('sck_logged_in_user'));
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [gameState, setGameState] = useState<GameState>({
    region: null,
    resources: { ...INITIAL_RESOURCES },
    grid: Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null)),
    turn: 1,
    messages: [
      { id: 'init-1', sender: '똑띠', text: '안녕! 나는 분석 대장 똑띠야. 우리 함께 멋진 스마트 시티를 만들어보자!', timestamp: Date.now() },
      { id: 'init-2', sender: '단디', text: '내 이름은 단디다! 자원 관리 단디 안 하면 큰일 난다이? 알긋나!', timestamp: Date.now() + 100 }
    ],
    hasLandmark: false,
  });

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);

  const addMessage = useCallback((sender: '똑띠' | '단디' | '시스템', text: string) => {
    setGameState(prev => ({
      ...prev,
      messages: [...prev.messages, { 
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender, 
        text, 
        timestamp: Date.now() 
      }].slice(-10)
    }));
  }, []);

  const selectRegion = (region: Region) => {
    setGameState(prev => {
      const rows = region === Region.JEJU ? 7 : 6;
      const cols = 6;
      const newGrid = Array(rows).fill(null).map(() => Array(cols).fill(null));
      
      if (region === Region.JEJU) {
        // Add Jeju International Airport (Row 0)
        const airportText = ['제', '주', '국', '제', '공', '항'];
        for (let c = 0; c < cols; c++) {
          newGrid[0][c] = {
            id: `airport_${c}`,
            type: BuildingType.MOUNTAIN,
            displayText: airportText[c],
            color: 'bg-slate-300',
            production: ResourceType.MASTER,
            consumption: ResourceType.MASTER,
            synergyWith: '',
            synergyBonus: ResourceType.MASTER,
            isObstacle: true
          };
        }

        // Add Halla Mountain (Center of playable area Rows 1-6)
        // Rows 1-6 center: Row 3, 4. Cols 2, 3.
        const hallaTiles = [[3, 2], [3, 3], [4, 2], [4, 3]];
        const parentId = 'halla_mountain';
        for (const [r, c] of hallaTiles) {
          newGrid[r][c] = {
            id: `halla_${r}_${c}`,
            type: BuildingType.MOUNTAIN,
            name: '한라산',
            displayText: '한라산',
            color: 'bg-emerald-800',
            production: ResourceType.MASTER,
            consumption: ResourceType.MASTER,
            synergyWith: '',
            synergyBonus: ResourceType.MASTER,
            isObstacle: true,
            parentId
          };
        }
      }

      const newState = {
        ...prev,
        region,
        grid: newGrid,
        resources: {
          ...prev.resources,
          [REGION_BONUS[region]]: prev.resources[REGION_BONUS[region]] + 5
        }
      };
      return {
        ...newState,
        turnSnapshot: {
          resources: { ...newState.resources },
          grid: newState.grid.map(row => [...row]),
          hasLandmark: newState.hasLandmark
        }
      };
    });
    addMessage('시스템', `${region} 지역을 선택하셨습니다. ${REGION_BONUS[region]} 자원 보너스를 받았습니다!`);
  };

  const getSynergyPairs = (grid: (Building | null)[][]) => {
    const rows = grid.length;
    if (rows === 0) return new Set<string>();
    const cols = grid[0].length;
    const synergized = new Set<string>();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const building = grid[r][c];
        if (!building || building.isObstacle || building.isLandmark) continue;

        const neighbors = [
          [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
          [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1]
        ];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const neighbor = grid[nr][nc];
            if (neighbor && !neighbor.isLandmark && neighbor.type === building.synergyWith) {
              synergized.add(`${r},${c}`);
              break;
            }
          }
        }
      }
    }
    return synergized;
  };

  const calculateTurn = useCallback(() => {
    setGameState(prev => {
      const newResources = { ...prev.resources };
      const grid = prev.grid;
      let totalProduction: Record<ResourceType, number> = {
        [ResourceType.POPULATION]: 0,
        [ResourceType.CULTURE]: 0,
        [ResourceType.TECH]: 0,
        [ResourceType.FOOD]: 0,
        [ResourceType.MONEY]: 0,
        [ResourceType.ENERGY]: 0,
        [ResourceType.MASTER]: 0,
      };

      // Calculate production and consumption
      const processedParents = new Set<string>();
      const rows = prev.grid.length;
      const cols = prev.grid[0].length;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const building = grid[r][c];
          if (!building || building.isObstacle) continue;
          
          if (building.parentId) {
            if (processedParents.has(building.parentId)) continue;
            processedParents.add(building.parentId);
          }

          // Base production
          const prodAmount = building.isLandmark ? 5 : 1;
          const consAmount = building.isLandmark ? 1 : 1;

          totalProduction[building.production] += prodAmount;
          totalProduction[building.consumption] -= consAmount;
        }
      }

      // Synergy check (Greedy Pairing)
      const synergized = getSynergyPairs(grid);
      synergized.forEach(coord => {
        const [r, c] = coord.split(',').map(Number);
        const building = grid[r][c];
        if (building) {
          totalProduction[building.synergyBonus] += 2;
        }
      });

      // Apply changes
      Object.entries(totalProduction).forEach(([res, amount]) => {
        const resource = res as ResourceType;
        if (resource !== ResourceType.MASTER) {
          newResources[resource] = Math.max(0, newResources[resource] + amount);
        }
      });

      const newState = {
        ...prev,
        resources: newResources,
        turn: prev.turn + 1,
      };

      return {
        ...newState,
        turnSnapshot: {
          resources: { ...newState.resources },
          grid: newState.grid.map(row => [...row]),
          hasLandmark: newState.hasLandmark
        }
      };
    });
  }, []);

  const resetTurn = () => {
    if (!gameState.turnSnapshot) return;
    setGameState(prev => ({
      ...prev,
      resources: { ...prev.turnSnapshot!.resources },
      grid: prev.turnSnapshot!.grid.map(row => [...row]),
      hasLandmark: prev.turnSnapshot!.hasLandmark
    }));
    addMessage('시스템', '현재 턴의 모든 행동이 초기화되었습니다.');
  };

  const handlePlaceBuilding = (r: number, c: number) => {
    if (!selectedBuilding) return;
    
    const building = selectedBuilding === BuildingType.LANDMARK 
      ? LANDMARKS[gameState.region!] 
      : BUILDINGS[selectedBuilding];

    // Resource Check (Next turn consumption)
    const expectedChange = calculateExpectedChangeWithBuilding(r, c, building);
    const resources = gameState.resources;
    const insufficient = (Object.entries(expectedChange) as [ResourceType, number][]).some(([res, val]) => {
      return res !== ResourceType.MASTER && val < 0 && (resources[res] + val < 0);
    });

    if (insufficient) {
      alert('자원이 부족해서 지을 수 없습니다');
      return;
    }

    setGameState(prev => {
      const newGrid = [...prev.grid.map(row => [...row])];
      const rows = prev.grid.length;
      const cols = prev.grid[0].length;

      // Landmark specific checks
      if (building.isLandmark) {
        if (prev.hasLandmark) {
          addMessage('시스템', '랜드마크는 지역당 하나만 건설할 수 있습니다!');
          return prev;
        }

        // Check 2x2 space
        if (r + 1 >= rows || c + 1 >= cols) {
          addMessage('시스템', '랜드마크를 건설할 공간이 부족합니다 (2x2 공간 필요)');
          return prev;
        }

        const tiles = [[r, c], [r + 1, c], [r, c + 1], [r + 1, c + 1]];
        for (const [tr, tc] of tiles) {
          if (newGrid[tr][tc]) {
            addMessage('시스템', '다른 건물이 있거나 건설 불가능한 자리입니다.');
            return prev;
          }
        }

        // Check cost
        const primaryRes = REGION_BONUS[prev.region!];
        const canPayWithPrimary = prev.resources[primaryRes] >= 14;
        const canPayWithMaster = prev.resources[ResourceType.MASTER] >= 7;

        if (!canPayWithPrimary && !canPayWithMaster) {
          addMessage('시스템', '자원이 부족하여 건물을 지을 수 없습니다 (마스터 코인 7개 또는 지역 자원 14개 필요)');
          return prev;
        }

        // Deduct cost (prefer primary resource if available)
        const newResources = { ...prev.resources };
        let costInfo;
        if (canPayWithPrimary) {
          newResources[primaryRes] -= 14;
          costInfo = { resource: primaryRes, amount: 14 };
        } else {
          newResources[ResourceType.MASTER] -= 7;
          costInfo = { resource: ResourceType.MASTER, amount: 7 };
        }

        // Place 2x2
        const parentId = `landmark_${Date.now()}`;
        for (const [tr, tc] of tiles) {
          newGrid[tr][tc] = { ...building, parentId, placedTurn: prev.turn, cost: costInfo };
        }

        addMessage('시스템', `${building.name} 건설 완료!`);
        return {
          ...prev,
          grid: newGrid,
          resources: newResources,
          hasLandmark: true
        };
      }

      // Normal building placement
      if (newGrid[r][c]) {
        if (newGrid[r][c]?.isObstacle) {
          addMessage('시스템', '이곳에는 건물을 건설할 수 없습니다.');
        }
        return prev;
      }
      newGrid[r][c] = { ...building, placedTurn: prev.turn };
      return {
        ...prev,
        grid: newGrid
      };
    });
    setSelectedBuilding(null);
  };

  const handleRemoveBuilding = (r: number, c: number) => {
    setGameState(prev => {
      const building = prev.grid[r][c];
      if (!building || building.isObstacle) return prev;

      const newGrid = [...prev.grid.map(row => [...row])];
      const newResources = { ...prev.resources };
      const rows = prev.grid.length;
      const cols = prev.grid[0].length;
      let hasLandmark = prev.hasLandmark;

      // Refund cost if placed in current turn
      if (building.placedTurn === prev.turn && building.cost) {
        newResources[building.cost.resource] += building.cost.amount;
        addMessage('시스템', `${building.name || building.type} 철거 완료. 비용이 반환되었습니다.`);
      }

      if (building.parentId) {
        // Remove all tiles with same parentId
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            if (newGrid[i][j]?.parentId === building.parentId) {
              newGrid[i][j] = null;
            }
          }
        }
        if (building.isLandmark) hasLandmark = false;
      } else {
        newGrid[r][c] = null;
      }

      return {
        ...prev,
        grid: newGrid,
        resources: newResources,
        hasLandmark
      };
    });
  };

  const getAIAdvice = async () => {
    if (isGeneratingAdvice) return;
    setIsGeneratingAdvice(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        게임 상황:
        지역: ${gameState.region}
        현재 턴: ${gameState.turn}
        자원 상태: ${JSON.stringify(gameState.resources)}
        건물 배치 수: ${gameState.grid.flat().filter(b => b !== null).length}

        역할:
        1. 똑띠(분석형): 데이터 기반의 논리적 조언. 초등학생 눈높이.
        2. 단디(행동형): 위기 관리, 사투리 섞인 열정적 경고. "단디 해라!" 포함.

        위 상황에 대해 똑띠와 단디가 각각 한 마디씩 해줘. JSON 형식으로 답변해줘.
        { "toktti": "...", "dandi": "..." }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const advice = JSON.parse(response.text || '{}');
      if (advice.toktti) addMessage('똑띠', advice.toktti);
      if (advice.dandi) addMessage('단디', advice.dandi);
    } catch (error) {
      console.error("AI Advice Error:", error);
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const adjustResource = (res: ResourceType, amount: number) => {
    setGameState(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        [res]: Math.max(0, prev.resources[res] + amount)
      }
    }));
  };

  const resetGame = () => {
    setGameState({
      region: null,
      resources: { ...INITIAL_RESOURCES },
      grid: Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null)),
      turn: 1,
      messages: [
        { id: `reset-1-${Date.now()}`, sender: '똑띠', text: '안녕! 나는 분석 대장 똑띠야. 우리 함께 멋진 스마트 시티를 만들어보자!', timestamp: Date.now() },
        { id: `reset-2-${Date.now()}`, sender: '단디', text: '내 이름은 단디다! 자원 관리 단디 안 하면 큰일 난다이? 알긋나!', timestamp: Date.now() + 100 }
      ],
      hasLandmark: false,
      turnSnapshot: undefined,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginId.trim();
    const cleanPw = loginPassword;

    if (!cleanId || !cleanPw) {
      setLoginError('아이디와 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (ALLOWED_CREDENTIALS[cleanId] === cleanPw) {
      localStorage.setItem('sck_logged_in_user', cleanId);
      setCurrentUser(cleanId);
      setLoginError('');
      setLoginId('');
      setLoginPassword('');
    } else {
      setLoginError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sck_logged_in_user');
    setCurrentUser(null);
    resetGame();
  };

  const getScoreBreakdown = () => {
    let coinScore = 0;
    let buildingScore = 0;
    let synergyScore = 0;
    let balanceScore = 0;

    // 1. Coin Score
    (Object.entries(gameState.resources) as [ResourceType, number][]).forEach(([res, val]) => {
      if (res === ResourceType.MASTER) {
        coinScore += val * 2;
      } else {
        coinScore += val;
      }
    });

    // 2. Building Score
    const presentTypes = new Set<BuildingType>();
    const processedParents = new Set<string>();
    const rows = gameState.grid.length;
    const cols = gameState.grid[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const building = gameState.grid[r][c];
        if (!building || building.isObstacle) continue;

        if (building.parentId) {
          if (processedParents.has(building.parentId)) continue;
          processedParents.add(building.parentId);
        }

        // Building points
        if (building.isLandmark) {
          buildingScore += 10;
        } else {
          buildingScore += 3;
          presentTypes.add(building.type);
        }
      }
    }

    // 3. Synergy Score
    const synergized = getSynergyPairs(gameState.grid);
    synergyScore = synergized.size * 3;

    // 4. Balance Score
    const coreTypes = [
      BuildingType.FACTORY,
      BuildingType.CULTURE,
      BuildingType.POWER_PLANT,
      BuildingType.HOUSING,
      BuildingType.FOOD,
      BuildingType.TECH
    ];
    const hasAll = coreTypes.every(t => presentTypes.has(t));
    if (hasAll) {
      balanceScore = 10;
    }

    return {
      coinScore,
      buildingScore,
      synergyScore,
      balanceScore,
      total: coinScore + buildingScore + synergyScore + balanceScore
    };
  };

  const calculateExpectedChangeWithBuilding = (r: number, c: number, newBuilding: Building) => {
    const tempGrid = gameState.grid.map(row => [...row]);
    
    if (newBuilding.isLandmark) {
      const parentId = `landmark_${Date.now()}`;
      // Check if space is available before simulating
      if (r + 1 < tempGrid.length && c + 1 < tempGrid[0].length) {
        tempGrid[r][c] = { ...newBuilding, parentId };
        tempGrid[r+1][c] = { ...newBuilding, parentId };
        tempGrid[r][c+1] = { ...newBuilding, parentId };
        tempGrid[r+1][c+1] = { ...newBuilding, parentId };
      }
    } else {
      tempGrid[r][c] = newBuilding;
    }

    return calculateExpectedChange(tempGrid);
  };

  const calculateExpectedChange = (gridToUse = gameState.grid) => {
    const change: Record<ResourceType, number> = {
      [ResourceType.POPULATION]: 0,
      [ResourceType.CULTURE]: 0,
      [ResourceType.TECH]: 0,
      [ResourceType.FOOD]: 0,
      [ResourceType.MONEY]: 0,
      [ResourceType.ENERGY]: 0,
      [ResourceType.MASTER]: 0,
    };

    const processedParents = new Set<string>();
    const rows = gridToUse.length;
    if (rows === 0) return change;
    const cols = gridToUse[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const building = gridToUse[r][c];
        if (!building || building.isObstacle) continue;

        if (building.parentId) {
          if (processedParents.has(building.parentId)) continue;
          processedParents.add(building.parentId);
        }

        // Base production
        const prodAmount = building.isLandmark ? 5 : 1;
        const consAmount = building.isLandmark ? 1 : 1;

        change[building.production] += prodAmount;
        change[building.consumption] -= consAmount;
      }
    }

    // Synergy check (Greedy Pairing)
    const synergized = getSynergyPairs(gridToUse);
    synergized.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      const building = gridToUse[r][c];
      if (building) {
        change[building.synergyBonus] += 2;
      }
    });

    return change;
  };

  const checkSynergy = (r: number, c: number) => {
    const synergized = getSynergyPairs(gameState.grid);
    return synergized.has(`${r},${c}`);
  };

  const getSynergyClass = (r: number, c: number) => {
    const building = gameState.grid[r][c];
    if (!building || !checkSynergy(r, c)) return '';

    switch (building.type) {
      case BuildingType.FACTORY: return 'synergy-factory';
      case BuildingType.CULTURE: return 'synergy-culture';
      case BuildingType.POWER_PLANT: return 'synergy-power';
      case BuildingType.HOUSING: return 'synergy-housing';
      case BuildingType.FOOD: return 'synergy-food';
      case BuildingType.TECH: return 'synergy-tech';
      default: return '';
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative dream-sky-bg overflow-y-auto">
        {/* JRPG Sunbeams and floating glowing clouds */}
        <div className="sky-shafts" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-505/10 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-505/10 rounded-full blur-3xl pointer-events-none z-0" />

        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="jrpg-card gold-bracket gold-corners p-6 sm:p-8 md:p-10 max-w-md w-full relative z-10 my-auto text-slate-100 border-amber-500/20 shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
        >
          {/* Decorative medieval-tech lines */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center text-[8px] font-mono font-extrabold text-amber-500/60 uppercase tracking-widest whitespace-nowrap">
            ✦ Future City Console v2.0 ✦
          </div>

          <div className="flex flex-col items-center mb-8 mt-2">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 via-indigo-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-4 border-2 border-amber-400/40 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20 animate-pulse" />
              <TrendingUp className="w-8 h-8 text-amber-250 z-10" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-320 to-cyan-300 tracking-tight text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              스마트 시티 코리아
            </h1>
            <p className="text-[10px] text-amber-400/80 mt-1 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 justify-center">
              <span className="text-amber-500">◆</span> OPERATIONS CONTROL SYSTEM <span className="text-amber-500">◆</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">도시 관리자용 에코 가이드 콘솔 계정 로그인</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 px-1 relative z-10">
            <div>
              <div className="flex justify-between items-center mb-1 outline-none">
                <label className="block text-[10px] font-extrabold text-amber-400/80 uppercase tracking-widest px-0.5 font-mono">
                  [ ADMIN ID ]
                </label>
                <span className="text-[9px] text-slate-500 font-mono">Allowed Accounts Exist</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-cyan-400/80" />
                </div>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="아이디를 입력하세요"
                  className="block w-full pl-11 pr-3 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm placeholder-slate-650 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-semibold tracking-wide"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 outline-none">
                <label className="block text-[10px] font-extrabold text-amber-400/80 uppercase tracking-widest px-0.5 font-mono">
                  [ ACCESS KEY ]
                </label>
                <span className="text-[9px] text-slate-500 font-mono select-none">Secure Vault Active</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-cyan-400/80" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="비밀번호를 입력하세요"
                  className="block w-full pl-11 pr-11 py-3 bg-slate-950/90 border border-slate-800 rounded-xl text-sm placeholder-slate-650 text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-sans font-semibold tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-3.5 bg-rose-950/50 border border-rose-900/60 rounded-xl text-xs font-semibold text-rose-350 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full h-12 rounded-xl text-sm anime-btn anime-btn-gold text-amber-200 hover:text-white font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 mt-4"
            >
              <LogIn className="w-4.5 h-4.5" />
              시스템 통제 센터 접속
            </button>
          </form>
        </motion.div>

        {/* Footer actions with matching dreamy style */}
        <div className="w-full max-w-md flex flex-col items-center gap-3 mt-6 z-10 relative px-4 text-center">
          <a 
            href="https://blog.naver.com/futurecanvas_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-amber-400/80 hover:text-amber-300 hover:underline text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-slate-900/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-800/60"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            퓨쳐캔버스 공식 블로그 방문하기
          </a>

          <div className="text-slate-600 text-[11px] font-semibold tracking-wider">
            Copyright &copy; Future Canvas & IDCo All Rights Reserved
          </div>
        </div>
      </div>
    );
  }

  if (!gameState.region) {
    // Elegant JRPG / illustration regional definitions
    const REGION_INFOS: Record<Region, { desc: string; icon: string; bgGlow: string; borderGlow: string }> = {
      [Region.CAPITAL]: {
        desc: "디지털 초고밀도 그리드와 행정 허브가 융합된 한국의 중심 메가시티",
        icon: "🏙️",
        bgGlow: "group-hover:bg-indigo-950/40",
        borderGlow: "group-hover:border-indigo-400"
      },
      [Region.GANGWON]: {
        desc: "태백산맥 줄기의 친환경 탄소 제로 테크와 친수 문화 특화 지구",
        icon: "⛰️",
        bgGlow: "group-hover:bg-purple-950/40",
        borderGlow: "group-hover:border-purple-400"
      },
      [Region.CHUNGCHEONG]: {
        desc: "대덕 R&D 연구망 기반 특수 나노 테크 개발과 첨단 통제단 집결소",
        icon: "🔬",
        bgGlow: "group-hover:bg-amber-950/30",
        borderGlow: "group-hover:border-amber-400"
      },
      [Region.JEOLLA]: {
        desc: "끝없는 지평선 위 AI 사물인터넷(IoT)이 결합된 저소모 그린 스마트팜 단지",
        icon: "🌾",
        bgGlow: "group-hover:bg-emerald-950/40",
        borderGlow: "group-hover:border-emerald-400"
      },
      [Region.GYEONGSANG]: {
        desc: "디지털 선박 로보틱스와 메가-루프 고속 물류망을 거느린 스마트 무역항",
        icon: "⚓",
        bgGlow: "group-hover:bg-yellow-950/30",
        borderGlow: "group-hover:border-yellow-400"
      },
      [Region.JEJU]: {
        desc: "한라산 청정 바람과 다방향 서남해 해상풍력 발전을 두른 가상 보존도",
        icon: "🌴",
        bgGlow: "group-hover:bg-rose-950/30",
        borderGlow: "group-hover:border-rose-400"
      },
    };

    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative dream-sky-bg overflow-y-auto">
        <div className="sky-shafts" />
        <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-505/5 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-505/5 rounded-full blur-3xl pointer-events-none z-0" />

        {/* User bar (Console Top Badge) */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 shadow-xl">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0" />
          <span className="text-slate-300 text-xs font-bold font-sans">
            접속 세션: <span className="text-cyan-400 font-extrabold">{currentUser}</span>
          </span>
          <button
            onClick={handleLogout}
            className="ml-3 hover:bg-rose-950/40 px-2 py-0.5 rounded-md text-rose-400 hover:text-rose-350 transition-all flex items-center justify-center gap-1 text-xs font-bold cursor-pointer border border-transparent hover:border-rose-900"
            title="로그아웃"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>로그아웃</span>
          </button>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="jrpg-card gold-bracket gold-corners p-5 sm:p-8 md:p-10 max-w-5xl w-full text-center relative z-10 my-auto text-slate-100 border-amber-500/10 shadow-[0_15px_35px_rgba(0,0,0,0.5)]"
        >
          {/* Subtle Decorative Bracket Lines */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center text-[8px] font-mono font-extrabold text-amber-500/60 uppercase tracking-widest whitespace-nowrap">
            ✦ REGIONAL SELECTION DECK ✦
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-250 to-cyan-300 mb-1 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            스마트 시티 코리아
          </h1>
          <p className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase mb-8 sm:mb-10">
            ◆ SELECT URBAN DEPLOYMENT REGION ◆
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {Object.values(Region).map(region => {
              const info = REGION_INFOS[region];
              return (
                <button
                  key={region}
                  onClick={() => selectRegion(region)}
                  className={`relative p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950/70 transition-all duration-300 flex flex-col items-center text-center group cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] overflow-hidden gold-corners ${info.bgGlow} ${info.borderGlow} hover:scale-[1.01]`}
                >
                  {/* Decorative faint inner glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="w-14 h-14 bg-slate-900 border border-slate-800 group-hover:border-amber-450/40 rounded-full flex items-center justify-center transition-all group-hover:scale-110 shadow-inner block mb-3 relative overflow-hidden">
                    <span className="text-2xl z-10">{info.icon}</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>

                  <span className="font-bold font-display text-lg sm:text-xl text-slate-200 group-hover:text-amber-300 transition-colors mt-1">
                    {region}
                  </span>

                  <span className="text-[9px] text-cyan-350 bg-cyan-950/60 border border-cyan-800/40 px-2.5 py-0.5 rounded-full font-mono font-extrabold mt-2 tracking-wide uppercase">
                    ◆ {REGION_BONUS[region]} 보너스 특화 ◆
                  </span>

                  <p className="text-[11px] text-slate-400 mt-3.5 leading-relaxed group-hover:text-slate-300 transition-colors font-medium">
                    {info.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>
 
        {/* Footer actions in regular document flow below the selector card to prevent overlaying */}
        <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 z-10 relative px-4">
          <a 
            href="https://blog.naver.com/futurecanvas_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-slate-900/60 backdrop-blur-sm hover:bg-slate-800/80 border border-slate-800 px-6 py-2.5 rounded-full text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:text-white"
          >
            <ExternalLink className="w-4 h-4 shrink-0 text-amber-500" />
            퓨쳐캔버스 공식 홈페이지 방문하기
          </a>
 
          <div className="text-slate-600 text-xs font-bold text-center sm:text-right tracking-wider">
            Copyright &copy; Future Canvas & IDCo All Rights Reserved
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col dream-sky-bg text-slate-200 font-sans p-2 sm:p-4 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden overflow-x-hidden relative">
      {/* JRPG Sunbeams and floating glowing clouds background ambience */}
      <div className="sky-shafts" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-505/5 rounded-full blur-3xl pointer-events-none z-0 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-cyan-505/5 rounded-full blur-3xl pointer-events-none z-0 animate-pulse" />

      {/* Header - Styled as a JRPG status banner window with gold brackets */}
      <header className="flex flex-col lg:flex-row justify-between items-center jrpg-card gold-bracket p-3 md:p-4 gap-3 md:gap-4 w-full z-10 shadow-lg relative border-amber-500/15">
        <div className="flex items-center gap-3 w-full lg:w-auto relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-905 border-2 border-amber-450/40 rounded-xl flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10" />
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-amber-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-250 to-cyan-300 truncate">스마트 시티 코리아</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] bg-amber-500/20 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-md font-mono font-bold leading-none tracking-wide">◆ {gameState.region} ◆</span>
              <p className="text-[10px] text-slate-400 font-bold whitespace-nowrap leading-none font-mono">STATION CONSOLE [TURN {gameState.turn}]</p>
            </div>
          </div>
        </div>
        
        {/* Resource HUD styled as cozy cards */}
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-hide relative z-10">
          {Object.entries(gameState.resources).map(([res, val]) => (
            <div key={res} className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl border min-w-[64px] md:min-w-[74px] transition-all relative group shadow-md ${val === 0 ? 'bg-rose-955/40 border-rose-900/65 text-rose-350' : 'bg-slate-950/70 border-slate-800 text-slate-350 hover:border-amber-500/30'}`}>
              <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">[ {res} ]</span>
              <div className="flex items-center gap-1 mt-1">
                <div className="scale-75 md:scale-95 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{RESOURCE_ICONS[res as ResourceType]}</div>
                <span className={`font-mono font-extrabold text-xs md:text-sm ${val === 0 ? 'text-rose-455' : 'text-slate-100'}`}>{val}</span>
              </div>
              
              <div className="absolute -bottom-2.5 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-155 z-25">
                <button 
                  onClick={() => adjustResource(res as ResourceType, -1)}
                  className="w-4.5 h-4.5 bg-slate-950 border border-slate-750 hover:border-rose-500 rounded-full flex items-center justify-center text-[10px] font-black text-rose-400 shadow-xl cursor-pointer"
                >
                  -
                </button>
                <button 
                  onClick={() => adjustResource(res as ResourceType, 1)}
                  className="w-4.5 h-4.5 bg-slate-950 border border-slate-750 hover:border-emerald-500 rounded-full flex items-center justify-center text-[10px] font-black text-emerald-455 shadow-xl cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 sm:gap-2 w-full lg:w-auto justify-between lg:justify-end items-center flex-wrap sm:flex-nowrap relative z-10">
          <button 
            onClick={resetTurn}
            className="flex items-center gap-1.5 md:gap-2 bg-rose-955/20 border border-rose-900/40 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-rose-955/40 hover:border-rose-500 transition-colors group cursor-pointer"
            title="현재 턴 초기화"
          >
            <RefreshCcw className="w-3.5 h-3.5 text-rose-400 group-hover:rotate-180 transition-transform duration-500 shrink-0" />
            <div className="flex flex-col items-start text-left font-sans">
              <span className="text-[8px] font-bold text-rose-405 uppercase tracking-widest leading-none hidden md:inline font-mono">RESET</span>
              <span className="text-[9px] md:text-[10px] font-bold text-rose-300 leading-none mt-0.5 md:mt-0 font-sans">턴 리셋</span>
            </div>
          </button>

          {/* Score Badge */}
          <div className="flex items-center gap-2 bg-amber-955/20 border border-amber-900/45 px-3 md:px-4 py-1.5 md:py-2 rounded-xl relative group cursor-help">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-400 shrink-0 select-none animate-bounce" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest leading-none font-mono">SCORE</span>
              <span className="text-sm md:text-base font-black text-amber-300 font-mono leading-none mt-0.5">{getScoreBreakdown().total}</span>
            </div>

            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-950 border border-amber-500/20 rounded-xl shadow-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
              <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1 font-mono">✦ SCORE BREAKDOWN ✦</h4>
              <div className="space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span>코인 점수</span>
                  <span className="font-bold text-white font-mono">{getScoreBreakdown().coinScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>건물 점수</span>
                  <span className="font-bold text-white font-mono">{getScoreBreakdown().buildingScore}</span>
                </div>
                <div className="flex justify-between">
                  <span>시너지 점수</span>
                  <span className="font-bold text-white font-mono">{getScoreBreakdown().synergyScore}</span>
                </div>
                {getScoreBreakdown().balanceScore > 0 && (
                  <div className="flex justify-between">
                    <span>균형 보너스</span>
                    <span className="font-mono font-bold text-emerald-400">+{getScoreBreakdown().balanceScore}</span>
                  </div>
                )}
                <div className="pt-1.5 mt-1.5 border-t border-slate-800 flex justify-between text-xs font-bold">
                  <span>합계</span>
                  <span className="text-amber-400 font-mono">{getScoreBreakdown().total}</span>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={resetGame}
            className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-705 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="게임 초기화"
          >
            <RefreshCcw className="w-4 h-4 md:w-5 md:h-5 text-slate-350" />
          </button>
          
          {/* User Badge & Logout Section */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 pl-2.5 pr-1.5 py-1 rounded-xl h-[34px] sm:h-[40px] md:h-[42px]" title={`접속 계정: ${currentUser}`}>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-305 font-sans max-w-[85px] sm:max-w-[none] truncate">
              {currentUser}
            </span>
            <button 
              onClick={handleLogout}
              className="p-1 text-slate-500 hover:text-rose-455 rounded-lg hover:bg-rose-955/35 transition-colors cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <button 
            onClick={calculateTurn}
            className="anime-btn anime-btn-gold h-[34px] sm:h-[40px] md:h-[42px] px-4 md:px-5 rounded-xl text-xs md:text-sm tracking-wide font-black"
          >
            <Play className="w-4 h-4 inline-block mr-1" />
            <span>다음 턴 실행</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 lg:overflow-hidden lg:min-h-0 max-w-[1600px] mx-auto w-full">
        {/* Left: Building Palette */}
        <aside className="flex w-full lg:w-72 flex-col gap-3 lg:gap-4 shrink-0 order-2 lg:order-none lg:overflow-y-auto pr-0 lg:pr-2 z-10">
          <div className="bg-slate-900/60 backdrop-blur-md p-3 lg:p-4 rounded-2xl border border-slate-800/80 shrink-0 shadow-lg">
            <h2 className="font-bold text-slate-100 mb-2.5 lg:mb-4 flex items-center gap-2 text-xs sm:text-sm lg:text-base font-display">
              <Plus className="w-4 h-4 lg:w-5 lg:h-5 text-cyan-400" />
              건물 건설하기
            </h2>
            <div className="flex lg:grid lg:grid-cols-1 gap-2 overflow-x-auto lg:overflow-x-visible pb-1.5 lg:pb-0 scrollbar-hide">
              {/* Landmark Section */}
              {!gameState.hasLandmark && (
                <button
                  onClick={() => setSelectedBuilding(BuildingType.LANDMARK)}
                  className={`flex items-center gap-2.5 lg:gap-3 p-2 lg:p-2.5 rounded-xl border transition-all shrink-0 min-w-[135px] lg:min-w-0 cursor-pointer ${
                    selectedBuilding === BuildingType.LANDMARK 
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/50' 
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-705 text-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 lg:w-9 lg:h-9 ${LANDMARKS[gameState.region!].color} rounded-lg flex items-center justify-center text-white shadow-md shrink-0`}>
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div className="text-left font-sans">
                    <p className={`font-bold text-[11px] lg:text-xs leading-tight ${selectedBuilding === BuildingType.LANDMARK ? 'text-white' : 'text-slate-200'}`}>{LANDMARKS[gameState.region!].name} (2x2)</p>
                    <p className="text-[9px] text-cyan-400 font-bold leading-none mt-0.5">지역 랜드마크</p>
                    <p className="text-[8px] text-slate-400 font-bold leading-none mt-1">비용: 지역 14 / 마스터 7</p>
                  </div>
                </button>
              )}

              {Object.values(BUILDINGS).map(building => (
                <button
                  key={building.type}
                  onClick={() => setSelectedBuilding(building.type)}
                  className={`flex items-center gap-2.5 lg:gap-3 p-2 lg:p-2.5 rounded-xl border transition-all shrink-0 min-w-[135px] lg:min-w-0 cursor-pointer ${
                    selectedBuilding === building.type 
                      ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200 ring-1 ring-indigo-500/50 shadow-lg' 
                      : 'border-slate-800 bg-slate-955/40 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 lg:w-9 lg:h-9 ${building.color} rounded-lg flex items-center justify-center text-white shadow-md shrink-0`}>
                    {RESOURCE_ICONS[building.production]}
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-[11px] lg:text-xs leading-tight ${selectedBuilding === building.type ? 'text-white' : 'text-slate-200'}`}>{building.type}</p>
                    <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                      {building.production}+1 / {building.consumption}-1
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden lg:block bg-gradient-to-b from-indigo-950/50 to-slate-950/50 p-4 rounded-2xl shadow-lg border border-indigo-900/40 text-slate-200 flex-1 relative overflow-hidden shrink-0">
            <div className="relative z-10">
              <h2 className="font-bold mb-2 flex items-center gap-2 text-sm text-indigo-305 font-display">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                긴급 운영 수칙
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                자원이 0이 되면 도시 운영이 마비됩니다! 단디와 똑띠의 실시간 브리핑을 모니터링하여 지속 가능한 스마트 생태계를 구축하세요.
              </p>
              <div className="mt-4 p-3 bg-indigo-950/40 rounded-xl border border-indigo-900/60">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Universal Coin</p>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">현재 {gameState.resources[ResourceType.MASTER]}개 보유 중. 모든 기본 자원을 일시 대체해주는 유니버설 마스터 토큰입니다.</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
          </div>
        </aside>

        {/* Center: Game Grid */}
        <section className={`flex-1 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80 p-3 sm:p-5 flex flex-col items-center justify-center relative overflow-hidden min-h-[450px] lg:min-h-[550px] order-1 lg:order-none w-full shadow-2xl`}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          {/* Top Control Bar for View Switching & Instructions */}
          <div className="absolute top-3 left-4 right-4 flex justify-between items-center z-30 flex-wrap gap-2">
            <div className="flex gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${viewMode === '2d' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                2D 평면
              </button>
              <button 
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${viewMode === '3d' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <span>3D 입체</span>
                <span className="text-[8px] bg-cyan-400 text-slate-950 px-1 py-0.5 rounded font-black scale-90 animate-pulse">HOT</span>
              </button>
            </div>

            {viewMode === '3d' && (
              <div className="hidden md:flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-300">
                <span className="font-extrabold text-cyan-400 font-mono">DRAG</span>
                <span>마우스 드래그 / 화면 터치로 판을 회전하세요!</span>
              </div>
            )}
          </div>

          {viewMode === '3d' ? (
            <div 
              className="scene-3d flex items-center justify-center relative w-full h-[380px] sm:h-[420px] md:h-[460px] lg:h-[490px] select-none"
              onWheel={handleWheel}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Interactive Isometric 3D Board Canvas */}
              <div
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="board-3d p-6 relative select-none cursor-grab active:cursor-grabbing flex flex-col gap-2"
                style={{
                  transform: `rotateX(${cameraTilt}deg) rotateZ(${cameraRotation}deg) scale(${cameraZoom})`,
                  backgroundColor: 'rgba(2, 6, 23, 0.45)',
                  borderRadius: '24px',
                  border: '1.5px solid rgba(129, 140, 248, 0.25)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {gameState.grid.map((row, r) => (
                  <div key={r} className="flex gap-2" style={{ transformStyle: 'preserve-3d' }}>
                    {row.map((cell, c) => (
                      <Tile3D 
                        key={`${r}-${c}`}
                        r={r}
                        c={c}
                        cell={cell}
                        selectedBuilding={selectedBuilding}
                        getSynergyClass={getSynergyClass}
                        handlePlaceBuilding={handlePlaceBuilding}
                        handleRemoveBuilding={handleRemoveBuilding}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* 3D Camera Floating Slider Overlays */}
              <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center z-30 flex-wrap gap-2 pointer-events-auto">
                <div className="flex gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
                  <button 
                    onClick={() => { setCameraRotation(-45); setCameraTilt(60); setCameraZoom(1.0); }}
                    className="p-1.5 hover:bg-slate-900 border border-slate-800/80 text-[10px] text-slate-300 hover:text-white rounded-lg flex items-center gap-1 cursor-pointer font-bold"
                    title="카메라 각도 초기화"
                  >
                    <RefreshCcw className="w-3 h-3 shrink-0" />
                    <span>정렬</span>
                  </button>
                  <button 
                    onClick={() => setCameraRotation(prev => prev - 45)}
                    className="px-2.5 py-1 hover:bg-slate-900 border border-slate-800/80 text-[10px] text-slate-300 hover:text-white rounded-lg flex items-center justify-center cursor-pointer font-bold"
                    title="반 시계방향 회전"
                  >
                    ↺
                  </button>
                  <button 
                    onClick={() => setCameraRotation(prev => prev + 45)}
                    className="px-2.5 py-1 hover:bg-slate-900 border border-slate-800/80 text-[10px] text-slate-300 hover:text-white rounded-lg flex items-center justify-center cursor-pointer font-bold"
                    title="시계방향 회전"
                  >
                    ↻
                  </button>
                </div>

                <div className="flex items-center gap-3 bg-slate-950/80 py-1.5 px-3 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 font-extrabold font-mono">TILT</span>
                    <input 
                      type="range" min="20" max="80" 
                      value={cameraTilt} 
                      onChange={(e) => setCameraTilt(Number(e.target.value))}
                      className="w-14 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-slate-500 font-extrabold font-mono">ZOOM</span>
                    <input 
                      type="range" min="0.6" max="1.5" step="0.1"
                      value={cameraZoom} 
                      onChange={(e) => setCameraZoom(Number(e.target.value))}
                      className="w-14 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Original JRPG Classic 2D Grid */
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5 md:gap-2 relative z-10 max-h-full overflow-auto p-2 sm:p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              {gameState.grid.map((row, r) => (
                row.map((cell, c) => (
                  <motion.div
                    key={`${r}-${c}`}
                    whileHover={cell?.isObstacle ? {} : { scale: 1.05 }}
                    onClick={() => cell ? handleRemoveBuilding(r, c) : handlePlaceBuilding(r, c)}
                    className={`grid-cell rounded-xl md:rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all relative ${
                      cell 
                        ? `${cell.color} border-slate-800 shadow-md ${cell.color === 'bg-white' || cell.color.includes('white') ? 'text-slate-900' : 'text-white'} ${getSynergyClass(r, c)}` 
                        : selectedBuilding 
                          ? 'border-cyan-500/40 border-dashed bg-cyan-950/20 text-cyan-400 hover:border-cyan-455 hover:bg-cyan-950/30' 
                          : 'border-slate-850 border-dashed bg-slate-955/20 text-slate-500 hover:border-slate-705 hover:bg-slate-900/40'
                    } ${cell?.isObstacle ? 'cursor-not-allowed opacity-90 border-slate-800 hover:scale-100 shadow-none' : ''}`}
                  >
                    {cell ? (
                      <>
                        {!cell.isObstacle && (
                          <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity z-10">
                            <Trash2 className={`w-3.5 h-3.5 ${cell.color === 'bg-white' || cell.color.includes('white') ? 'text-slate-600' : 'text-white/90'}`} />
                          </div>
                        )}
                        {cell.displayText ? (
                          <span className="text-[9px] md:text-sm font-bold text-center px-1 leading-tight whitespace-nowrap">
                            {cell.displayText}
                          </span>
                        ) : (
                          <>
                            <div className="scale-75 md:scale-95">{RESOURCE_ICONS[cell.production]}</div>
                            <span className="text-[7px] md:text-[9.5px] font-black mt-0.5 md:mt-1 text-center px-1 line-clamp-2 leading-none">
                              {cell.isLandmark ? cell.name : cell.type}
                            </span>
                          </>
                        )}
                      </>
                    ) : (
                      selectedBuilding && <Plus className="w-4 h-4 md:w-5 md:h-5 text-cyan-400/80 animate-pulse" />
                    )}
                  </motion.div>
                ))
              ))}
            </div>
          )}
        </section>

        {/* Right: Info & Rules */}
        <aside className="flex w-full xl:w-64 flex-col md:flex-row xl:flex-col gap-3 xl:gap-4 shrink-0 order-3 xl:order-none z-10">
          <div className="bg-slate-900/60 backdrop-blur-md p-3 lg:p-4 rounded-2xl border border-slate-800/80 flex-1 xl:flex-none shadow-lg">
            <h2 className="font-bold text-slate-100 mb-2.5 flex items-center gap-2 text-xs sm:text-sm lg:text-base font-display">
              <Info className="w-4 h-4 lg:w-5 lg:h-5 text-cyan-400" />
              시너지 가이드
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-1 gap-1.5 text-[9px] sm:text-[10px]">
              {[
                { color: 'bg-zinc-800 border border-zinc-700/65', text: '공장 + 발전소 = 머니+2' },
                { color: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]', text: '문화 + 주거 = 문화+2' },
                { color: 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.3)]', text: '발전소 + 식량 = 에너지+2' },
                { color: 'bg-slate-100 text-slate-950', text: '주거 + 기술 = 인구+2' },
                { color: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]', text: '식량 + 공장 = 식량+2' },
                { color: 'bg-amber-400 text-slate-950 font-bold', text: '기술 + 문화 = 기술+2' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-slate-950/50 rounded-lg border border-slate-850 shadow-sm leading-none">
                  <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${item.color} rounded-full`}></div>
                  <span className="text-slate-300 font-semibold truncate">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md p-3 lg:p-4 rounded-2xl border border-slate-800/80 shadow-lg flex-1 flex flex-col min-h-[160px] sm:min-h-[220px] xl:min-h-0 xl:flex-1">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-slate-100 flex items-center gap-2 text-xs sm:text-sm lg:text-base font-display">
                <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-cyan-400" />
                AI 실시간 조언
              </h2>
              <button 
                onClick={getAIAdvice}
                disabled={isGeneratingAdvice}
                className="text-[9px] sm:text-[10px] bg-cyan-950/60 border border-cyan-800/40 hover:bg-cyan-900 text-cyan-300 px-2 py-1 rounded-md font-bold disabled:opacity-50 cursor-pointer transition-all"
              >
                {isGeneratingAdvice ? '분석 중...' : '조언 듣기'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 lg:space-y-3 pr-1 max-h-[250px] xl:max-h-none">
              <AnimatePresence initial={false}>
                {gameState.messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, x: -25 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-2.5 rounded-xl border text-xs ${
                      msg.sender === '똑띠' ? 'bg-cyan-955/30 border-cyan-900/50 text-cyan-150 border-l-4 border-l-cyan-500' :
                      msg.sender === '단디' ? 'bg-indigo-955/30 border-indigo-900/50 text-indigo-150 border-l-4 border-l-indigo-500' :
                      'bg-slate-950/40 border-slate-850 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold text-[9px] sm:text-[10px] ${
                        msg.sender === '똑띠' ? 'text-cyan-400 font-semibold' :
                        msg.sender === '단디' ? 'text-indigo-400 font-semibold' :
                        'text-slate-400'
                      }`}>{msg.sender} (Advisor)</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed text-[11px] font-semibold">{msg.text}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer copyright for mobile/tablet flow */}
      <footer className="block lg:hidden text-center text-[11px] sm:text-xs text-slate-500 font-medium py-2.5 mt-2 border-t border-slate-800/60 w-full shrink-0">
        Copyright &copy; Future Canvas & IDCo All Rights Reserved
      </footer>

      {/* Copyright Notice for main game screen (desktop absolute, hidden on mobile in favor of footer flow) */}
      <div className="hidden lg:block absolute bottom-2 right-4 text-slate-600 text-[10px] md:text-[12px] font-semibold pointer-events-none z-0">
        Copyright &copy; Future Canvas & IDCo All Rights Reserved
      </div>
    </div>
  );
}
