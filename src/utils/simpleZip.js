// Pure JavaScript standard ZIP builder (Store / Uncompressed)
// Zero external dependencies, 100% compatible with Windows Explorer, WinRAR, 7-Zip, macOS, Linux.

function crc32(buffer) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

export function createZipBlob(files) {
  // files: Array of { name: string, data: Uint8Array | ArrayBuffer }
  const encoder = new TextEncoder();
  const fileEntries = [];
  let offset = 0;

  const parts = [];

  for (const file of files) {
    const rawData = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
    const fileNameBytes = encoder.encode(file.name);
    const fileCrc = crc32(rawData);
    const fileLength = rawData.length;

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true);         // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8)
    view.setUint16(8, 0, true);          // Compression method (0 = store)
    view.setUint16(10, 0, true);         // File last mod time
    view.setUint16(12, 0, true);         // File last mod date
    view.setUint32(14, fileCrc, true);   // CRC-32
    view.setUint32(18, fileLength, true);// Compressed size
    view.setUint32(22, fileLength, true);// Uncompressed size
    view.setUint16(26, fileNameBytes.length, true); // File name length
    view.setUint16(28, 0, true);         // Extra field length

    localHeader.set(fileNameBytes, 30);

    parts.push(localHeader);
    parts.push(rawData);

    fileEntries.push({
      fileNameBytes,
      fileCrc,
      fileLength,
      offset
    });

    offset += localHeader.length + rawData.length;
  }

  // Central directory
  const centralDirStart = offset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const centralHeader = new Uint8Array(46 + entry.fileNameBytes.length);
    const view = new DataView(centralHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Central file header signature
    view.setUint16(4, 20, true);         // Version made by
    view.setUint16(6, 20, true);         // Version needed to extract
    view.setUint16(8, 0x0800, true);     // UTF-8 flag
    view.setUint16(10, 0, true);         // Compression method (0)
    view.setUint16(12, 0, true);         // Mod time
    view.setUint16(14, 0, true);         // Mod date
    view.setUint32(16, entry.fileCrc, true);
    view.setUint32(20, entry.fileLength, true);
    view.setUint32(24, entry.fileLength, true);
    view.setUint16(28, entry.fileNameBytes.length, true);
    view.setUint16(30, 0, true);         // Extra field length
    view.setUint16(32, 0, true);         // File comment length
    view.setUint16(34, 0, true);         // Disk number start
    view.setUint16(36, 0, true);         // Internal file attributes
    view.setUint32(38, 0, true);         // External file attributes
    view.setUint32(42, entry.offset, true); // Relative offset of local header

    centralHeader.set(entry.fileNameBytes, 46);
    parts.push(centralHeader);
    centralDirSize += centralHeader.length;
  }

  // End of central directory record (22 bytes)
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);

  endView.setUint32(0, 0x06054b50, true); // End of central dir signature
  endView.setUint16(4, 0, true);          // Number of this disk
  endView.setUint16(6, 0, true);          // Number of the disk with start of central dir
  endView.setUint16(8, fileEntries.length, true);  // Total entries on this disk
  endView.setUint16(10, fileEntries.length, true); // Total entries
  endView.setUint32(12, centralDirSize, true);     // Size of central dir
  endView.setUint32(16, centralDirStart, true);    // Offset of start of central dir
  endView.setUint16(20, 0, true);                  // ZIP file comment length

  parts.push(endRecord);

  return new Blob(parts, { type: 'application/zip' });
}
