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
  ExternalLink
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

export default function App() {
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

  if (!gameState.region) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative bg-slate-950 overflow-y-auto">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 pointer-events-none"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&q=80&w=1920")',
          }}
        />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-md p-5 sm:p-8 md:p-10 rounded-3xl shadow-2xl max-w-4xl w-full text-center relative z-10 my-auto"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-indigo-900 mb-1 sm:mb-2">스마트 시티 코리아</h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 mb-4 sm:mb-6 md:mb-8 font-medium">운영할 지역을 선택해주세요!</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
            {Object.values(Region).map(region => (
              <button
                key={region}
                onClick={() => selectRegion(region)}
                className="p-3 sm:p-4 md:p-6 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 bg-white/50 transition-all flex flex-col items-center gap-1.5 sm:gap-2 group cursor-pointer"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-slate-100 group-hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <span className="font-bold text-xs sm:text-sm md:text-base text-slate-700">{region}</span>
                <span className="text-[8px] sm:text-[9px] md:text-[10px] text-slate-400 font-bold uppercase">{REGION_BONUS[region]} 보너스</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Footer actions in regular document flow below the selector card to prevent overlaying */}
        <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 z-10 relative px-4">
          {/* Blog Button */}
          <a 
            href="https://blog.naver.com/futurecanvas_" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 px-6 sm:px-8 py-3 rounded-full text-white text-base md:text-lg font-bold transition-all flex items-center justify-center gap-2.5 shadow-lg hover:scale-105 active:scale-95"
          >
            <ExternalLink className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            퓨쳐캔버스 둘러보기
          </a>

          {/* Copyright Notice */}
          <div className="text-white/60 text-xs sm:text-[14px] md:text-[15px] font-medium text-center sm:text-right">
            Copyright : Future Canvas & IDCo All Rights Reserved
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col bg-slate-100 font-sans p-2 sm:p-4 gap-3 sm:gap-4 overflow-y-auto lg:overflow-hidden overflow-x-hidden relative">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-center bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 gap-3 md:gap-4 w-full">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold font-display text-indigo-900 truncate">스마트 시티 코리아</h1>
            <div className="flex items-center gap-2">
              <span className="text-[9px] md:text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{gameState.region}</span>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-medium whitespace-nowrap">제 {gameState.turn}차 운영 위원회</p>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto scrollbar-hide">
          {Object.entries(gameState.resources).map(([res, val]) => (
            <div key={res} className={`flex flex-col items-center px-2 py-1 rounded-lg border min-w-[60px] md:min-w-[70px] transition-colors relative group ${val === 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-wider">{res}</span>
              <div className="flex items-center gap-1">
                <div className="scale-75 md:scale-100">{RESOURCE_ICONS[res as ResourceType]}</div>
                <span className={`font-bold text-xs md:text-sm ${val === 0 ? 'text-red-600' : 'text-slate-700'}`}>{val}</span>
              </div>
              
              <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button 
                  onClick={() => adjustResource(res as ResourceType, -1)}
                  className="w-4 h-4 bg-white border border-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-100 shadow-sm shadow-indigo-100"
                >
                  -
                </button>
                <button 
                  onClick={() => adjustResource(res as ResourceType, 1)}
                  className="w-4 h-4 bg-white border border-slate-300 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 hover:bg-slate-100 shadow-sm shadow-indigo-100"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-1.5 sm:gap-2 w-full lg:w-auto justify-between lg:justify-end items-center flex-wrap sm:flex-nowrap">
          <div className="hidden sm:flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[7px] font-bold text-indigo-600 uppercase leading-none">Next Turn Change</span>
              <div className="flex gap-2 mt-1">
                {(Object.entries(calculateExpectedChange()) as [ResourceType, number][])
                  .filter(([res, val]) => res !== ResourceType.MASTER && val !== 0)
                  .map(([res, val]) => (
                    <div key={res} className="flex items-center gap-0.5" title={`${res} 변화량`}>
                      <span className="scale-75">{RESOURCE_ICONS[res]}</span>
                      <span className={`text-[9px] font-bold ${val > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {val > 0 ? `+${val}` : val}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-slate-500 uppercase leading-none">Current Turn</span>
              <span className="text-sm font-black text-slate-700 mt-0.5">{gameState.turn}턴</span>
            </div>
          </div>
          <button 
            onClick={resetTurn}
            className="flex items-center gap-1.5 md:gap-2 bg-rose-50 border border-rose-200 px-2.5 sm:px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors group cursor-pointer"
            title="현재 턴 초기화"
          >
            <RefreshCcw className="w-4 h-4 text-rose-500 group-hover:rotate-180 transition-transform duration-500 shrink-0" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[7px] font-bold text-rose-600 uppercase leading-none hidden md:inline">Reset Turn</span>
              <span className="text-[9px] md:text-[10px] font-bold text-rose-700 leading-none mt-0.5 md:mt-0">턴 초기화</span>
            </div>
          </button>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 md:px-4 py-1.5 md:py-2 rounded-xl relative group cursor-help">
            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[7px] md:text-[8px] font-bold text-amber-600 uppercase leading-none">Total Score</span>
              <span className="text-sm md:text-base lg:text-lg font-black text-amber-700 leading-none">{getScoreBreakdown().total}</span>
            </div>

            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-amber-200 rounded-xl shadow-xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <h4 className="text-[10px] font-bold text-amber-600 uppercase mb-2 border-b border-amber-100 pb-1">Score Breakdown</h4>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">코인 점수</span>
                  <span className="font-bold text-slate-700">{getScoreBreakdown().coinScore}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">건물 점수</span>
                  <span className="font-bold text-slate-700">{getScoreBreakdown().buildingScore}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">시너지 점수</span>
                  <span className="font-bold text-slate-700">{getScoreBreakdown().synergyScore}</span>
                </div>
                {getScoreBreakdown().balanceScore > 0 && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">균형 보너스</span>
                    <span className="font-bold text-emerald-600">+{getScoreBreakdown().balanceScore}</span>
                  </div>
                )}
                <div className="pt-1.5 mt-1.5 border-t border-slate-100 flex justify-between text-sm font-black">
                  <span className="text-slate-800">합계</span>
                  <span className="text-amber-600">{getScoreBreakdown().total}</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={resetGame}
            className="p-2 md:p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
            title="게임 초기화"
          >
            <RefreshCcw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={calculateTurn}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-sm md:text-base"
          >
            <Play className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">다음 턴</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 lg:overflow-hidden lg:min-h-0 max-w-[1600px] mx-auto w-full">
        {/* Left: Building Palette */}
        <aside className="flex w-full lg:w-72 flex-col gap-3 lg:gap-4 shrink-0 order-2 lg:order-none lg:overflow-y-auto pr-0 lg:pr-2">
          <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-sm border border-slate-200 shrink-0">
            <h2 className="font-bold text-slate-800 mb-2.5 lg:mb-4 flex items-center gap-2 text-xs sm:text-sm lg:text-base">
              <Plus className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
              건물 건설하기
            </h2>
            <div className="flex lg:grid lg:grid-cols-1 gap-2 overflow-x-auto lg:overflow-x-visible pb-1.5 lg:pb-0 scrollbar-hide">
              {/* Landmark Section */}
              {!gameState.hasLandmark && (
                <button
                  onClick={() => setSelectedBuilding(BuildingType.LANDMARK)}
                  className={`flex items-center gap-2.5 lg:gap-3 p-2 lg:p-2.5 rounded-xl border-2 transition-all border-indigo-200 bg-indigo-50 hover:border-indigo-400 shrink-0 min-w-[135px] lg:min-w-0 cursor-pointer ${
                    selectedBuilding === BuildingType.LANDMARK ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className={`w-8 h-8 lg:w-9 lg:h-9 ${LANDMARKS[gameState.region!].color} rounded-lg flex items-center justify-center text-white shadow-sm shrink-0`}>
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div className="text-left font-sans">
                    <p className="font-bold text-[11px] lg:text-xs text-indigo-900 leading-tight">{LANDMARKS[gameState.region!].name} (2x2)</p>
                    <p className="text-[9px] text-indigo-600 font-bold leading-none mt-0.5">지역 랜드마크</p>
                    <p className="text-[8px] text-slate-500 font-bold leading-none mt-1">비용: 지역 14 / 마스터 7</p>
                  </div>
                </button>
              )}

              {Object.values(BUILDINGS).map(building => (
                <button
                  key={building.type}
                  onClick={() => setSelectedBuilding(building.type)}
                  className={`flex items-center gap-2.5 lg:gap-3 p-2 lg:p-2.5 rounded-xl border-2 transition-all shrink-0 min-w-[135px] lg:min-w-0 cursor-pointer ${
                    selectedBuilding === building.type 
                      ? 'border-indigo-500 bg-indigo-50 shadow-inner' 
                      : 'border-slate-100 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 lg:w-9 lg:h-9 ${building.color} rounded-lg flex items-center justify-center text-white shadow-sm shrink-0`}>
                    {RESOURCE_ICONS[building.production]}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[11px] lg:text-xs text-slate-800 leading-tight">{building.type}</p>
                    <p className="text-[9px] text-slate-500 leading-none mt-0.5">
                      {building.production}+1 / {building.consumption}-1
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="hidden lg:block bg-indigo-900 p-4 rounded-2xl shadow-lg text-white flex-1 relative overflow-hidden shrink-0">
            <div className="relative z-10">
              <h2 className="font-bold mb-2 flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                긴급 상황!
              </h2>
              <p className="text-[11px] text-indigo-200 leading-relaxed">
                자원이 0이 되면 도시가 멈춰요! 단디와 똑띠의 조언을 잘 듣고 자원을 관리하세요.
              </p>
              <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-indigo-300" />
                  <p className="text-[10px] font-bold text-indigo-300 uppercase">마스터 코인</p>
                </div>
                <p className="text-[11px]">현재 {gameState.resources[ResourceType.MASTER]}개 보유 중. 모든 자원을 대체할 수 있는 만능 코인입니다!</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
          </div>
        </aside>

        {/* Center: Game Grid */}
        <section className="flex-1 bg-white rounded-3xl shadow-inner border border-slate-200 p-3 sm:p-5 flex items-center justify-center relative overflow-hidden min-h-0 order-1 lg:order-none w-full">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5 md:gap-2 relative z-10 max-h-full overflow-auto p-1 bg-slate-50/50 rounded-2xl border border-slate-100">
            {gameState.grid.map((row, r) => (
              row.map((cell, c) => (
                <motion.div
                  key={`${r}-${c}`}
                  whileHover={cell?.isObstacle ? {} : { scale: 1.05 }}
                  onClick={() => cell ? handleRemoveBuilding(r, c) : handlePlaceBuilding(r, c)}
                  className={`grid-cell rounded-xl md:rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all relative ${
                    cell 
                      ? `${cell.color} border-white shadow-lg ${cell.color === 'bg-white' ? 'text-slate-800' : 'text-white'} ${getSynergyClass(r, c)}` 
                      : selectedBuilding 
                        ? 'border-indigo-300 border-dashed bg-indigo-50/50 hover:bg-indigo-100' 
                        : 'border-slate-200 border-dashed bg-slate-50 hover:bg-slate-100'
                  } ${cell?.isObstacle ? 'cursor-not-allowed' : ''}`}
                >
                  {cell ? (
                    <>
                      {!cell.isObstacle && (
                        <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity z-10">
                          <Trash2 className={`w-3 h-3 ${cell.color === 'bg-white' ? 'text-slate-400' : 'text-white/80'}`} />
                        </div>
                      )}
                      {cell.displayText ? (
                        <span className="text-[9px] md:text-xs font-bold text-center px-1 leading-tight whitespace-nowrap">
                          {cell.displayText}
                        </span>
                      ) : (
                        <>
                          <div className="scale-75 md:scale-100">{RESOURCE_ICONS[cell.production]}</div>
                          <span className="text-[7px] md:text-[9px] font-black mt-0.5 md:mt-1 text-center px-1 line-clamp-2 leading-none">
                            {cell.isLandmark ? cell.name : cell.type}
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    selectedBuilding && <Plus className="w-4 h-4 md:w-5 md:h-5 text-indigo-300" />
                  )}
                </motion.div>
              ))
            ))}
          </div>
        </section>

        {/* Right: Info & Rules */}
        <aside className="flex w-full xl:w-64 flex-col md:flex-row xl:flex-col gap-3 xl:gap-4 shrink-0 order-3 xl:order-none">
          <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-sm border border-slate-200 flex-1 xl:flex-none">
            <h2 className="font-bold text-slate-800 mb-2.5 flex items-center gap-2 text-xs sm:text-sm lg:text-base">
              <Info className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
              시너지 가이드
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-1 gap-1.5 text-[9px] sm:text-[10px]">
              {[
                { color: 'bg-black', text: '공장 + 발전소 = 머니+2' },
                { color: 'bg-blue-500', text: '문화 + 주거 = 문화+2' },
                { color: 'bg-red-600', text: '발전소 + 식량 = 에너지+2' },
                { color: 'bg-white border border-slate-200', text: '주거 + 기술 = 인구+2' },
                { color: 'bg-green-500', text: '식량 + 공장 = 식량+2' },
                { color: 'bg-yellow-400', text: '기술 + 문화 = 기술+2' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                  <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${item.color} rounded-full`}></div>
                  <span className="text-slate-600 font-semibold truncate">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-3 lg:p-4 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[160px] sm:min-h-[220px] xl:min-h-0 xl:flex-1">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-xs sm:text-sm lg:text-base">
                <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500" />
                AI 브리핑
              </h2>
              <button 
                onClick={getAIAdvice}
                disabled={isGeneratingAdvice}
                className="text-[9px] sm:text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md font-bold text-slate-600 disabled:opacity-50 cursor-pointer"
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
                    className={`p-2.5 rounded-xl text-xs ${
                      msg.sender === '똑띠' ? 'bg-blue-50 border-l-4 border-blue-400' :
                      msg.sender === '단디' ? 'bg-red-50 border-l-4 border-red-400' :
                      'bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold text-[9px] sm:text-[10px] ${
                        msg.sender === '똑띠' ? 'text-blue-600' :
                        msg.sender === '단디' ? 'text-red-600' :
                        'text-slate-500'
                      }`}>{msg.sender}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-[11px] font-medium">{msg.text}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer copyright for mobile/tablet flow */}
      <footer className="block lg:hidden text-center text-[11px] sm:text-xs text-slate-400 font-medium py-2.5 mt-2 border-t border-slate-200/50 w-full shrink-0">
        Copyright : Future Canvas & IDCo All Rights Reserved
      </footer>

      {/* Copyright Notice for main game screen (desktop absolute, hidden on mobile in favor of footer flow) */}
      <div className="hidden lg:block absolute bottom-2 right-4 text-slate-400 text-[10px] md:text-[15px] font-medium pointer-events-none z-0">
        Copyright : Future Canvas & IDCo All Rights Reserved
      </div>
    </div>
  );
}
