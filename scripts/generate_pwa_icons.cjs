const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KAIROS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="100%" height="100%">
  <defs>
    <!-- Background Gradient: Ultra-Deep Space & Obsidian Midnight Indigo -->
    <radialGradient id="bgGrad" cx="50%" cy="38%" r="68%">
      <stop offset="0%" stop-color="#161536"/>
      <stop offset="50%" stop-color="#0d0e1e"/>
      <stop offset="100%" stop-color="#04050a"/>
    </radialGradient>

    <!-- Squircle Border Highlight -->
    <linearGradient id="squircleBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#4f46e5" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.5"/>
    </linearGradient>

    <!-- Core Nebula Atmosphere Glow -->
    <radialGradient id="nebulaCore" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.48"/>
      <stop offset="42%" stop-color="#a855f7" stop-opacity="0.25"/>
      <stop offset="78%" stop-color="#ec4899" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#04050a" stop-opacity="0"/>
    </radialGradient>

    <!-- Glowing Blue Vertical Pillar Gradient (Electric Cyan to Luminous Blue / Indigo) -->
    <linearGradient id="blueStemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="25%" stop-color="#0ea5e9"/>
      <stop offset="65%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>

    <!-- Blue Pillar Inner Specular Spine -->
    <linearGradient id="blueStemSpine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#bae6fd" stop-opacity="0.85"/>
      <stop offset="80%" stop-color="#818cf8" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#4f46e5" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Wave Strand Gradients from Design #50 -->
    <!-- Strand 1 (Cyan to Indigo) -->
    <linearGradient id="strandCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>

    <!-- Strand 2 (Electric Violet to Purple) -->
    <linearGradient id="strandViolet" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>

    <!-- Strand 3 (Radiant Magenta to Coral Pink) -->
    <linearGradient id="strandCoral" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="50%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#f43f5e"/>
    </linearGradient>

    <!-- 3D Cosmic Planetary Orbit Ring - Front Arc -->
    <linearGradient id="orbitFrontGrad" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95"/>
      <stop offset="26%" stop-color="#818cf8" stop-opacity="1"/>
      <stop offset="68%" stop-color="#c084fc" stop-opacity="1"/>
      <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.95"/>
    </linearGradient>

    <!-- 3D Cosmic Planetary Orbit Ring - Back Arc (Behind Stem) -->
    <linearGradient id="orbitBackGrad" x1="100%" y1="50%" x2="0%" y2="50%">
      <stop offset="0%" stop-color="#3730a3" stop-opacity="0.35"/>
      <stop offset="50%" stop-color="#4f46e5" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.35"/>
    </linearGradient>

    <!-- Glow & Shadow Filters -->
    <filter id="laserGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="intenseBloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="24" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="depthShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="32" stdDeviation="36" flood-color="#4f46e5" flood-opacity="0.5"/>
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.75"/>
    </filter>
  </defs>

  <!-- Squircle App Container -->
  <rect width="1024" height="1024" rx="228" fill="url(#bgGrad)"/>
  <rect width="1012" height="1012" x="6" y="6" rx="222" fill="none" stroke="url(#squircleBorder)" stroke-width="5"/>

  <!-- Ambient Space Dust & Starlight -->
  <circle cx="228" cy="232" r="3.6" fill="#818cf8" opacity="0.65"/>
  <circle cx="804" cy="208" r="4.4" fill="#f43f5e" opacity="0.7"/>
  <circle cx="180" cy="492" r="3" fill="#38bdf8" opacity="0.5"/>
  <circle cx="848" cy="456" r="4" fill="#c084fc" opacity="0.6"/>
  <circle cx="276" cy="616" r="3" fill="#818cf8" opacity="0.4"/>
  <circle cx="784" cy="660" r="3.2" fill="#ec4899" opacity="0.5"/>
  <circle cx="512" cy="148" r="4" fill="#ffffff" opacity="0.8"/>

  <!-- Core Radiant Atmosphere -->
  <circle cx="512" cy="384" r="308" fill="url(#nebulaCore)"/>

  <!-- MASTER COMPOSITION (Scaled 2x for 1024x1024 ultra-HD crisp fidelity) -->
  <g id="MasterComposition" filter="url(#depthShadow)">

    <!-- 1. BACK ORBITAL RING (Passes cleanly behind the vertical stem) -->
    <g transform="translate(512, 388) rotate(-26)">
      <path d="M -316,0 A 316 94 0 0 1 316,0" 
            fill="none" 
            stroke="url(#orbitBackGrad)" 
            stroke-width="15" 
            stroke-linecap="round"
            opacity="0.65"/>
    </g>

    <!-- 2. DESIGN #50 HARMONIC FLUID WAVE 'K' MONOGRAM (SINGLE BLUE VERTICAL PILLAR) -->
    <g id="Design50_KineticWaveK">

      <!-- BLUE VERTICAL PILLAR (Electric cyan into deep glowing blue/indigo, perfectly centered & weighted) -->
      <path d="M 388,196 C 388,176 404,164 424,164 C 444,164 460,176 460,196 L 460,580 C 460,600 444,612 424,612 C 404,612 388,600 388,580 Z" 
            fill="url(#blueStemGrad)" 
            filter="url(#laserGlow)"/>

      <!-- Specular spine inside blue vertical stem for 3D crystalline depth -->
      <path d="M 406,184 C 414,172 430,172 438,184 L 438,592 C 430,600 414,600 406,592 Z" 
            fill="url(#blueStemSpine)"/>

      <!-- Top Specular Cap Highlight -->
      <ellipse cx="424" cy="180" rx="18" ry="8" fill="#ffffff" opacity="0.9"/>

      <!-- UPPER DIAGONAL SWEEPING WAVE STRANDS (Design #50 Fluid Wave Plumes) -->
      <!-- Wave Strand A (Topmost soaring wave filament) -->
      <path d="M 296,276 
               C 356,276 404,312 456,360 
               C 512,412 576,292 656,204 
               C 680,176 712,168 740,172 
               C 744,172 746,178 742,182 
               C 708,208 664,260 608,332 
               C 552,404 492,436 452,412 
               C 404,384 356,292 296,276 Z" 
            fill="url(#strandCyan)" 
            filter="url(#laserGlow)"/>

      <!-- Wave Strand B (Primary Upper Harmonic Ribbon - Sweeping fluid arc) -->
      <path d="M 320,308 
               C 376,308 424,348 468,392 
               C 528,452 588,336 668,248 
               C 696,220 728,212 748,216 
               C 752,216 752,222 748,226 
               C 716,252 676,300 620,372 
               C 564,444 504,468 464,436 
               C 420,400 372,324 320,308 Z" 
            fill="url(#strandViolet)" 
            filter="url(#laserGlow)"/>

      <!-- Wave Strand C (Inner Upper Momentum Filament) -->
      <path d="M 348,340 
               C 396,340 440,376 480,420 
               C 536,476 596,376 676,292 
               C 700,264 732,256 752,260 
               C 756,260 756,266 750,270 
               C 720,292 684,336 632,404 
               C 576,472 520,488 480,456 
               C 440,424 396,352 348,340 Z" 
            fill="url(#strandCoral)"/>

      <!-- Specular Crest Highlight on Upper Wave Core -->
      <path d="M 468,392 
               C 528,452 588,336 668,248 
               C 696,220 728,212 748,216 
               C 724,232 688,272 640,332 
               C 584,404 528,452 476,412 Z" 
            fill="#ffffff" opacity="0.65"/>

      <!-- LOWER DIAGONAL SWEEPING WAVE STRANDS (Design #50 Kinetic Lower Tail Flare) -->
      <!-- Wave Strand D (Primary Lower Momentum Wave) -->
      <path d="M 464,416 
               C 496,444 536,492 584,548 
               C 628,596 672,612 716,612 
               C 724,612 728,606 722,600 
               C 696,568 656,520 604,464 
               C 560,420 516,396 476,396 
               C 468,396 460,404 464,416 Z" 
            fill="url(#strandViolet)" 
            filter="url(#laserGlow)"/>

      <!-- Wave Strand E (Sleek Outer Trailing Filament - Electric Coral Flare) -->
      <path d="M 484,432 
               C 516,460 556,512 608,568 
               C 648,612 692,628 732,628 
               C 740,628 744,622 738,616 
               C 712,584 676,544 624,488 
               C 580,440 540,420 500,420 
               C 488,420 480,424 484,432 Z" 
            fill="url(#strandCoral)" 
            filter="url(#laserGlow)"/>

      <!-- Wave Strand F (Deep Base Flow - Cyan Foundation Anchor) -->
      <path d="M 448,404 
               C 480,432 516,476 560,528 
               C 600,576 644,596 688,596 
               C 696,596 700,590 694,584 
               C 672,556 636,512 588,456 
               C 544,408 500,384 460,384 
               C 452,384 444,392 448,404 Z" 
            fill="url(#strandCyan)"/>

      <!-- Specular Highlight Ridge on Lower Wave -->
      <path d="M 484,432 
               C 516,460 556,512 608,568 
               C 648,612 692,628 732,628 
               C 708,620 672,596 632,544 
               C 588,488 548,448 504,432 Z" 
            fill="#ffffff" opacity="0.5"/>

      <!-- Central Confluence Energy Jewel & Chromatic Micro-Sparks -->
      <circle cx="472" cy="408" r="12" fill="#ffffff" filter="url(#intenseBloom)"/>
      <circle cx="472" cy="408" r="5.6" fill="#38bdf8"/>
      
      <!-- Dynamic Wave Leading Energy Sparks -->
      <circle cx="736" cy="176" r="6.4" fill="#38bdf8" filter="url(#laserGlow)"/>
      <circle cx="744" cy="220" r="5" fill="#c084fc"/>
      <circle cx="728" cy="616" r="6.4" fill="#f43f5e" filter="url(#laserGlow)"/>
      <circle cx="304" cy="280" r="5" fill="#38bdf8"/>
    </g>

    <!-- 3. FRONT ORBITAL RING (Sweeps across the front of the K with neon luminescence) -->
    <g transform="translate(512, 388) rotate(-26)">
      <!-- Outer Neon Glow Aura -->
      <path d="M 316,0 A 316 94 0 0 1 -316,0" 
            fill="none" 
            stroke="url(#orbitFrontGrad)" 
            stroke-width="19" 
            stroke-linecap="round" 
            filter="url(#laserGlow)"/>

      <!-- Intense Core Specular Laser Filament -->
      <path d="M 304,0 A 304 88 0 0 1 -304,0" 
            fill="none" 
            stroke="#ffffff" 
            stroke-width="6" 
            stroke-linecap="round" 
            opacity="0.95"/>

      <!-- Chrono-Node Cadence Bead -->
      <circle cx="164" cy="76" r="19" fill="#ffffff" filter="url(#intenseBloom)"/>
      <circle cx="164" cy="76" r="11" fill="#38bdf8"/>
      <circle cx="164" cy="76" r="5" fill="#ffffff"/>

      <!-- Trailing Micro-Sparks along orbit -->
      <circle cx="248" cy="54" r="6" fill="#f43f5e" opacity="0.85"/>
      <circle cx="-112" cy="82" r="6.4" fill="#38bdf8" opacity="0.8"/>
      <circle cx="-224" cy="62" r="4.4" fill="#818cf8" opacity="0.7"/>
    </g>

  </g>

  <!-- REFINED KAIROS WORDMARK -->
  <g text-anchor="middle">
    <!-- Subtle drop shadow -->
    <text x="512" y="832" 
          font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="88" 
          font-weight="800" 
          letter-spacing="24" 
          fill="#03050b" 
          opacity="0.8">KAIROS</text>

    <!-- Crisp Pure White Lettering -->
    <text x="512" y="828" 
          font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="88" 
          font-weight="800" 
          letter-spacing="24" 
          fill="#ffffff">KAIROS</text>

    <!-- Signature Cadence Sync Dot -->
    <circle cx="780" cy="816" r="11" fill="#6366f1" filter="url(#laserGlow)"/>
    <circle cx="780" cy="816" r="5" fill="#ffffff"/>
  </g>
</svg>`;

// Helper to create valid multi-image Windows ICO file from PNG buffers
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  let offset = 6 + (16 * count);
  const directoryEntries = [];
  const imageDataList = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset of image data
    directoryEntries.push(entry);
    imageDataList.push(item.buffer);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...imageDataList]);
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const iconsDir = path.join(publicDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('Generating Kairos PWA and Web App Icons from official SVG logo...');

  // 1. Write SVG vectors
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), KAIROS_SVG, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), KAIROS_SVG, 'utf8');
  console.log('  ✓ public/icons/icon.svg & public/favicon.svg');

  const svgBuffer = Buffer.from(KAIROS_SVG);

  // 2. Standard 192x192 PNG
  const png192 = await sharp(svgBuffer, { density: 300 })
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), png192);
  console.log('  ✓ public/icons/icon-192x192.png (192×192 PNG)');

  // 3. Standard 512x512 PNG
  const png512 = await sharp(svgBuffer, { density: 300 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), png512);
  console.log('  ✓ public/icons/icon-512x512.png (512×512 PNG)');

  // 4. Maskable 192x192 PNG (Android safe zone with continuous deep background #04050a)
  const inner192 = Math.round(192 * 0.82); // 82% inside safe-zone
  const resizedInner192 = await sharp(svgBuffer, { density: 300 })
    .resize(inner192, inner192, { fit: 'contain' })
    .png()
    .toBuffer();
  const maskable192 = await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 4, g: 5, b: 10, alpha: 1 } // #04050a
    }
  })
    .composite([{ input: resizedInner192, gravity: 'center' }])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'maskable-icon-192x192.png'), maskable192);
  console.log('  ✓ public/icons/maskable-icon-192x192.png (192×192 Maskable)');

  // 5. Maskable 512x512 PNG
  const inner512 = Math.round(512 * 0.82);
  const resizedInner512 = await sharp(svgBuffer, { density: 300 })
    .resize(inner512, inner512, { fit: 'contain' })
    .png()
    .toBuffer();
  const maskable512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 4, g: 5, b: 10, alpha: 1 } // #04050a
    }
  })
    .composite([{ input: resizedInner512, gravity: 'center' }])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'maskable-icon-512x512.png'), maskable512);
  console.log('  ✓ public/icons/maskable-icon-512x512.png (512×512 Maskable)');

  // 6. Apple Touch Icon (180x180 PNG)
  const appleTouch = await sharp(svgBuffer, { density: 300 })
    .resize(180, 180, { fit: 'contain', background: { r: 4, g: 5, b: 10, alpha: 1 } })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleTouch);
  console.log('  ✓ public/icons/apple-touch-icon.png (180×180 Apple Touch Icon)');

  // 7. Multi-resolution favicon.ico (16, 32, 48, 64)
  const icoSizes = [16, 32, 48, 64];
  const icoBuffers = [];
  for (const s of icoSizes) {
    const buf = await sharp(svgBuffer, { density: 300 })
      .resize(s, s, { fit: 'contain' })
      .png()
      .toBuffer();
    icoBuffers.push({ width: s, height: s, buffer: buf });
  }
  const icoData = createIco(icoBuffers);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoData);
  console.log('  ✓ public/favicon.ico (Multi-size 16/32/48/64 ICO)');

  console.log('\nAll Kairos app logo assets generated successfully.\n');
}

main().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
