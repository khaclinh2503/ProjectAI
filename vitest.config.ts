import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['BloomTap/assets/scripts/logic/**/*.test.ts'],
    },
});
