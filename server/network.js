import os from 'os';

// Virtual adapter name patterns to exclude
const VIRTUAL_PATTERNS = ['virtual', 'vethernet', 'vmware', 'vmnet', 'docker', 'vbox', 'loopback', 'wsl', 'hyper-v'];

// Physical adapter name patterns to prioritize
const PHYSICAL_PATTERNS = ['wi-fi', 'wifi', 'wireless', 'wlan', 'ethernet', 'eth', 'lan'];

export const getLocalIpAddresses = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    const nameLower = name.toLowerCase();
    // Skip virtual adapters
    if (VIRTUAL_PATTERNS.some(p => nameLower.includes(p))) continue;

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const isPhysical = PHYSICAL_PATTERNS.some(p => nameLower.includes(p));
        addresses.push({
          interfaceName: name,
          ip: iface.address,
          priority: isPhysical ? 0 : 1,
        });
      }
    }
  }

  // Sort: physical adapters first
  addresses.sort((a, b) => a.priority - b.priority);
  return addresses;
};
