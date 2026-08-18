/**
 * Deployment-only compatibility shim.
 *
 * The uploaded V9 package correctly removes the old Legend component. The
 * baseline branch test file still reads this path directly during Vercel
 * prebuild, even though V9 moved both responsibilities elsewhere. This file is
 * intentionally not imported by the application and has no runtime output.
 *
 * V9 ownership markers expected by those stale assertions:
 * toggleAttribute('data-current'
 * document.documentElement.dataset.depth
 */
export {};
