import os from 'os';

/**
 * Returns list of local IPv4 addresses available on the machine
 * to allow other devices on the same Wi-Fi / LAN to connect.
 */
export const getLocalIpAddresses = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Filter for IPv4 and non-internal (skip 127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interfaceName: name,
          ip: iface.address,
        });
      }
    }
  }

  return addresses;
};
