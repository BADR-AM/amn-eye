import React from 'react';
import Orb from './Orb';

/**
 * LiquidOrb backward-compatible wrapper
 * Directly leverages the new high-performance WebGL2 Orb component.
 */
export default function LiquidOrb(props) {
  return <Orb {...props} />;
}

export { Orb };
