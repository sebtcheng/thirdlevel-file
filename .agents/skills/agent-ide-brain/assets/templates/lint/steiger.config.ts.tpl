import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

// Default FSD rules for apps/frontend/src. Run: npx steiger apps/frontend/src
export default defineConfig([...fsd.configs.recommended]);
