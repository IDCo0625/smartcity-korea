export enum ResourceType {
  POPULATION = '인구',
  CULTURE = '문화',
  TECH = '기술',
  FOOD = '식량',
  MONEY = '머니',
  ENERGY = '에너지',
  MASTER = '마스터'
}

export enum BuildingType {
  FACTORY = '공장',
  CULTURE = '문화시설',
  POWER_PLANT = '발전소',
  HOUSING = '주거',
  FOOD = '식량생산',
  TECH = '기술센터',
  LANDMARK = '랜드마크',
  MOUNTAIN = '산'
}

export interface Building {
  id: string;
  type: BuildingType;
  name?: string;
  displayText?: string;
  color: string;
  production: ResourceType;
  consumption: ResourceType;
  synergyWith: BuildingType | string;
  synergyBonus: ResourceType;
  size?: number; // 1 for 1x1, 2 for 2x2
  isLandmark?: boolean;
  isObstacle?: boolean;
  parentId?: string; // For multi-tile buildings
}

export enum Region {
  CAPITAL = '수도권',
  GANGWON = '강원',
  CHUNGCHEONG = '충청',
  JEOLLA = '전라',
  GYEONGSANG = '경상',
  JEJU = '제주'
}

export const REGION_BONUS: Record<Region, ResourceType> = {
  [Region.CAPITAL]: ResourceType.POPULATION,
  [Region.GANGWON]: ResourceType.CULTURE,
  [Region.CHUNGCHEONG]: ResourceType.TECH,
  [Region.JEOLLA]: ResourceType.FOOD,
  [Region.GYEONGSANG]: ResourceType.MONEY,
  [Region.JEJU]: ResourceType.ENERGY,
};

export interface GameState {
  region: Region | null;
  resources: Record<ResourceType, number>;
  grid: (Building | null)[][];
  turn: number;
  messages: {
    id: string;
    sender: '똑띠' | '단디' | '시스템';
    text: string;
    timestamp: number;
  }[];
  hasLandmark: boolean;
}

export const LANDMARKS: Record<Region, Building> = {
  [Region.CAPITAL]: {
    id: 'landmark_capital',
    type: BuildingType.LANDMARK,
    name: '시그니쳐타워',
    color: 'bg-indigo-800',
    production: ResourceType.POPULATION,
    consumption: ResourceType.FOOD,
    synergyWith: '',
    synergyBonus: ResourceType.POPULATION,
    size: 2,
    isLandmark: true
  },
  [Region.GANGWON]: {
    id: 'landmark_gangwon',
    type: BuildingType.LANDMARK,
    name: '올림픽경기장',
    color: 'bg-purple-800',
    production: ResourceType.CULTURE,
    consumption: ResourceType.TECH,
    synergyWith: '',
    synergyBonus: ResourceType.CULTURE,
    size: 2,
    isLandmark: true
  },
  [Region.CHUNGCHEONG]: {
    id: 'landmark_chungcheong',
    type: BuildingType.LANDMARK,
    name: '과학통합센터',
    color: 'bg-yellow-600',
    production: ResourceType.TECH,
    consumption: ResourceType.MONEY,
    synergyWith: '',
    synergyBonus: ResourceType.TECH,
    size: 2,
    isLandmark: true
  },
  [Region.JEOLLA]: {
    id: 'landmark_jeolla',
    type: BuildingType.LANDMARK,
    name: 'AI스마트팜',
    color: 'bg-green-800',
    production: ResourceType.FOOD,
    consumption: ResourceType.CULTURE,
    synergyWith: '',
    synergyBonus: ResourceType.FOOD,
    size: 2,
    isLandmark: true
  },
  [Region.GYEONGSANG]: {
    id: 'landmark_gyeongsang',
    type: BuildingType.LANDMARK,
    name: '스마트항만',
    color: 'bg-amber-800',
    production: ResourceType.MONEY,
    consumption: ResourceType.ENERGY,
    synergyWith: '',
    synergyBonus: ResourceType.MONEY,
    size: 2,
    isLandmark: true
  },
  [Region.JEJU]: {
    id: 'landmark_jeju',
    type: BuildingType.LANDMARK,
    name: '해상풍력단지',
    color: 'bg-red-800',
    production: ResourceType.ENERGY,
    consumption: ResourceType.POPULATION,
    synergyWith: '',
    synergyBonus: ResourceType.ENERGY,
    size: 2,
    isLandmark: true
  }
};

export const BUILDINGS: Record<BuildingType, Building> = {
  [BuildingType.FACTORY]: {
    id: 'factory',
    type: BuildingType.FACTORY,
    color: 'bg-black',
    production: ResourceType.MONEY,
    consumption: ResourceType.ENERGY,
    synergyWith: BuildingType.TECH,
    synergyBonus: ResourceType.MONEY
  },
  [BuildingType.CULTURE]: {
    id: 'culture',
    type: BuildingType.CULTURE,
    color: 'bg-blue-500',
    production: ResourceType.CULTURE,
    consumption: ResourceType.TECH,
    synergyWith: BuildingType.HOUSING,
    synergyBonus: ResourceType.CULTURE
  },
  [BuildingType.POWER_PLANT]: {
    id: 'power_plant',
    type: BuildingType.POWER_PLANT,
    color: 'bg-red-600',
    production: ResourceType.ENERGY,
    consumption: ResourceType.POPULATION,
    synergyWith: BuildingType.FOOD,
    synergyBonus: ResourceType.ENERGY
  },
  [BuildingType.HOUSING]: {
    id: 'housing',
    type: BuildingType.HOUSING,
    color: 'bg-slate-400',
    production: ResourceType.POPULATION,
    consumption: ResourceType.FOOD,
    synergyWith: BuildingType.POWER_PLANT,
    synergyBonus: ResourceType.POPULATION
  },
  [BuildingType.FOOD]: {
    id: 'food',
    type: BuildingType.FOOD,
    color: 'bg-green-500',
    production: ResourceType.FOOD,
    consumption: ResourceType.CULTURE,
    synergyWith: BuildingType.FACTORY,
    synergyBonus: ResourceType.FOOD
  },
  [BuildingType.TECH]: {
    id: 'tech',
    type: BuildingType.TECH,
    color: 'bg-yellow-400',
    production: ResourceType.TECH,
    consumption: ResourceType.MONEY,
    synergyWith: BuildingType.CULTURE,
    synergyBonus: ResourceType.TECH
  },
  [BuildingType.LANDMARK]: {
    id: 'landmark_placeholder',
    type: BuildingType.LANDMARK,
    color: 'bg-slate-800',
    production: ResourceType.MASTER,
    consumption: ResourceType.MASTER,
    synergyWith: '',
    synergyBonus: ResourceType.MASTER,
    isLandmark: true,
    size: 2
  },
  [BuildingType.MOUNTAIN]: {
    id: 'obstacle_placeholder',
    type: BuildingType.MOUNTAIN,
    color: 'bg-slate-300',
    production: ResourceType.MASTER,
    consumption: ResourceType.MASTER,
    synergyWith: '',
    synergyBonus: ResourceType.MASTER,
    isObstacle: true
  }
};
