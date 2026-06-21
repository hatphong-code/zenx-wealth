import { createDataHook } from './createDataHook';
import { getAssets, getCachedAssets } from '../services/assetService';
export const useAssetsData = createDataHook(getAssets, getCachedAssets);
