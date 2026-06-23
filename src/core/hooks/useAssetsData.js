import { createDataHook } from './createDataHook';
import { getAssets, getCachedAssets } from '../services/assetService';

const DEFAULT = {
  currency: 'VND',
  accounts: [],
  summary: { totalAssets: 0, liquidAssets: 0, longTermAssets: 0, riskAssets: 0 },
};
export const useAssetsData = createDataHook(getAssets, getCachedAssets, DEFAULT);
