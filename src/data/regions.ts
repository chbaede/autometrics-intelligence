import { RegionId } from '../types/metrics';

export interface RegionDefinition {
  id: RegionId;
  name: string;
  nameKo: string;
  description: string;
  officialDefinitionNotes: string;
}

export const REGIONS_REGISTRY: Record<RegionId, RegionDefinition> = {
  global: {
    id: 'global',
    name: 'Global / Worldwide',
    nameKo: '글로벌 전체',
    description: 'Worldwide total operations across all reporting markets.',
    officialDefinitionNotes: 'Consolidated worldwide figures including all subsidiaries and regional markets.',
  },
  north_america: {
    id: 'north_america',
    name: 'North America',
    nameKo: '북미',
    description: 'United States, Canada, and Mexico (or region defined as North America in IR).',
    officialDefinitionNotes: 'Typically includes US, Canada, and Mexico. GM and Ford report under North America; European OEMs report US and North America separately in some reports.',
  },
  united_states: {
    id: 'united_states',
    name: 'United States',
    nameKo: '미국',
    description: 'United States domestic market.',
    officialDefinitionNotes: 'Reported as domestic US sales or deliveries.',
  },
  europe: {
    id: 'europe',
    name: 'Europe',
    nameKo: '유럽',
    description: 'European market including EU, EFTA, and UK.',
    officialDefinitionNotes: 'Note: German OEMs (VW, BMW, Mercedes) usually define Western Europe + Central/Eastern Europe; Stellantis often uses "Enlarged Europe" which includes Turkey/Eurasia in some disclosures.',
  },
  germany: {
    id: 'germany',
    name: 'Germany',
    nameKo: '독일',
    description: 'German domestic automotive market.',
    officialDefinitionNotes: 'Specific country reporting segment inside Europe.',
  },
  china: {
    id: 'china',
    name: 'China',
    nameKo: '중국',
    description: 'Mainland China, Hong Kong, and Taiwan (or Greater China).',
    officialDefinitionNotes: 'Includes joint ventures (e.g., FAW-VW, SAIC-VW, Beijing Benz, BMW Brilliance) unless stated as consolidated/equity accounted.',
  },
  japan: {
    id: 'japan',
    name: 'Japan',
    nameKo: '일본',
    description: 'Japanese domestic automotive market.',
    officialDefinitionNotes: 'Toyota and Honda domestic retail and wholesale registrations.',
  },
  south_korea: {
    id: 'south_korea',
    name: 'South Korea',
    nameKo: '대한민국',
    description: 'South Korean domestic automotive market.',
    officialDefinitionNotes: 'Hyundai/Kia domestic retail and wholesale deliveries.',
  },
  india: {
    id: 'india',
    name: 'India',
    nameKo: '인도',
    description: 'Indian domestic automotive market.',
    officialDefinitionNotes: 'Tata Motors, Maruti Suzuki domestic dispatches.',
  },
  south_america: {
    id: 'south_america',
    name: 'South America',
    nameKo: '남미',
    description: 'Latin American and South American regional operations.',
    officialDefinitionNotes: 'Primarily Brazil and Argentina manufacturing and delivery hubs.',
  },
  rest_of_world: {
    id: 'rest_of_world',
    name: 'Rest of World / Other',
    nameKo: '기타 지역',
    description: 'Middle East, Africa, Southeast Asia, Oceania, and other territories.',
    officialDefinitionNotes: 'Aggregated regional category varying by OEM.',
  },
};

