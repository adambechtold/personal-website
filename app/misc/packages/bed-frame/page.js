"use client";

import React, { useEffect } from "react";

/**
 * Renders a package scale comparison visualization page.
 * Shows various package dimensions compared to a 6-foot human figure.
 * Packages are oriented vertically with their longest dimension as height.
 * @return {JSX.Element} The package scale reference page.
 */
export default function PackageScalePage() {
  useEffect(() => {
    // Run the visualization code only on the client after mount
    const PX = 8;

    const packagesRaw = [
      { label: "Pkg 1", dims: [84, 8, 10], lbs: 61, color: "#f97316" },
      { label: "Pkg 2", dims: [63, 8, 10], lbs: 37, color: "#06b6d4" },
      { label: "Pkg 3", dims: [48, 7, 7], lbs: 38, color: "#a78bfa" },
      { label: "Pkg 4", dims: [14, 14, 10], lbs: 22, color: "#34d399" },
      { label: "Pkg 5", dims: [63, 15, 5], lbs: 48, color: "#fb7185" },
    ];

    const packages = packagesRaw.map((p) => {
      const sorted = [...p.dims].sort((a, b) => b - a);
      return {
        ...p,
        h: sorted[0],
        w: sorted[1],
        d: sorted[2],
        origDims: p.dims,
      };
    });

    const HUMAN_H_IN = 72;
    const margin = 50;
    const topPad = 80;

    const tallest = Math.max(HUMAN_H_IN, ...packages.map((p) => p.h));
    const floorY = topPad + tallest * PX;

    // --- Compute natural width of content ---
    let cursorX = margin + 40;

    const humanTopY = floorY - HUMAN_H_IN * PX;
    const humanBlockW = 22 * PX;
    cursorX += humanBlockW;

    // Calculate total content width needed for packages
    let pkgNaturalWidth = 0;
    packages.forEach((p) => {
      const depthPx = p.d * PX * 0.4;
      pkgNaturalWidth += p.w * PX + depthPx + 30; // box + 3d + bracket label space
    });

    const contentNatural = cursorX + pkgNaturalWidth + margin;

    // Now figure out spacing: distribute remaining space as gaps
    // We have 1 gap after human + (n-1) gaps between packages = n gaps total
    const numGaps = packages.length + 1;
    const wrapperEl = document.querySelector(".svg-wrapper");
    const availableWidth = Math.max(contentNatural, wrapperEl.clientWidth - 40);

    const extraSpace = availableWidth - contentNatural;
    const gapSize = Math.max(
      5 * PX,
      (extraSpace > 0 ? extraSpace / numGaps : 0) + 5 * PX
    );

    // --- Layout with computed gaps ---
    cursorX = margin + 40;
    // Human
    const finalHumanCx = cursorX + 10 * PX;
    cursorX += humanBlockW + gapSize;

    const pkgPos = packages.map((p) => {
      const pw = p.w * PX;
      const ph = p.h * PX;
      const depthPx = p.d * PX * 0.4;
      const pos = {
        x: cursorX,
        y: floorY - ph,
        w: pw,
        h: ph,
        depthPx,
        pkg: p,
      };
      cursorX += pw + depthPx + 30 + gapSize;
      return pos;
    });

    const totalW = cursorX + margin;
    const totalH = floorY + 65;

    const svg = document.getElementById("mainSvg");
    svg.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);

    let html = "";

    // --- Grid lines every foot ---
    for (let ft = 0; ft <= 7; ft++) {
      const y = floorY - ft * 12 * PX;
      if (y < 0) continue;
      html += `<line x1="0" y1="${y}" x2="${totalW}" y2="${y}" stroke="${
        ft === 0 ? "#30363d" : "#1c2128"
      }" stroke-width="${ft === 0 ? 2 : 1}"/>`;
      if (ft > 0) {
        html += `<text x="${margin + 28}" y="${
          y + 4
        }" fill="#4b5563" font-family="Space Mono, monospace" font-size="11" text-anchor="end">${ft} ft</text>`;
      }
    }

    // --- Human figure ---
    const hx = finalHumanCx;
    const s = PX;
    const headCenterY = floorY - 67 * s;
    const headR = 5 * s;
    const shoulderY = floorY - 58 * s;
    const waistY = floorY - 30 * s;

    html += `<g>
      <circle cx="${hx}" cy="${headCenterY}" r="${headR}" fill="#374151" stroke="#4b5563" stroke-width="1.5"/>
      <path d="
        M${hx - 9 * s} ${shoulderY}
        Q${hx} ${shoulderY - 1 * s} ${hx + 9 * s} ${shoulderY}
        L${hx + 6 * s} ${waistY}
        L${hx - 6 * s} ${waistY}
        Z
      " fill="#374151" stroke="#4b5563" stroke-width="1.5"/>
      <rect x="${hx - 11 * s}" y="${shoulderY}" width="${3 * s}" height="${
        20 * s
      }" rx="${1.5 * s}" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <rect x="${hx + 8 * s}" y="${shoulderY}" width="${3 * s}" height="${
        20 * s
      }" rx="${1.5 * s}" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <rect x="${hx - 5.5 * s}" y="${waistY}" width="${5 * s}" height="${
        30 * s
      }" rx="${2.5 * s}" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <rect x="${hx + 0.5 * s}" y="${waistY}" width="${5 * s}" height="${
        30 * s
      }" rx="${2.5 * s}" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <text x="${hx}" y="${
        humanTopY - 16
      }" fill="#9ca3af" font-family="Space Mono, monospace" font-size="14" text-anchor="middle" font-weight="700">6 ft Human</text>
      <text x="${hx}" y="${
        humanTopY - 3
      }" fill="#6b7280" font-family="Space Mono, monospace" font-size="11" text-anchor="middle">(72 in)</text>
      <line x1="${hx + 14 * s}" y1="${humanTopY}" x2="${
        hx + 14 * s
      }" y2="${floorY}" stroke="#6b7280" stroke-width="1" stroke-dasharray="4 3"/>
      <line x1="${hx + 12 * s}" y1="${humanTopY}" x2="${
        hx + 16 * s
      }" y2="${humanTopY}" stroke="#6b7280" stroke-width="1"/>
      <line x1="${hx + 12 * s}" y1="${floorY}" x2="${
        hx + 16 * s
      }" y2="${floorY}" stroke="#6b7280" stroke-width="1"/>
      <text x="${hx + 14 * s + 6}" y="${
        humanTopY + (HUMAN_H_IN * s) / 2 + 4
      }" fill="#6b7280" font-family="Space Mono, monospace" font-size="10" text-anchor="start">72"</text>
    </g>`;

    // --- Packages ---
    pkgPos.forEach((pos) => {
      const p = pos.pkg;
      const cx = pos.x + pos.w / 2;
      const dp = pos.depthPx;

      // 3D top face
      html += `<polygon points="${pos.x},${pos.y} ${pos.x + dp},${pos.y - dp} ${
        pos.x + pos.w + dp
      },${pos.y - dp} ${pos.x + pos.w},${pos.y}"
        fill="${p.color}" opacity="0.25" stroke="${
          p.color
        }" stroke-width="1" stroke-opacity="0.4"/>`;

      // 3D right face
      html += `<polygon points="${pos.x + pos.w},${pos.y} ${
        pos.x + pos.w + dp
      },${pos.y - dp} ${pos.x + pos.w + dp},${pos.y + pos.h - dp} ${
        pos.x + pos.w
      },${pos.y + pos.h}"
        fill="${p.color}" opacity="0.15" stroke="${
          p.color
        }" stroke-width="1" stroke-opacity="0.3"/>`;

      // Front face
      html += `<rect x="${pos.x}" y="${pos.y}" width="${pos.w}" height="${pos.h}" rx="2"
        fill="${p.color}" fill-opacity="0.12" stroke="${p.color}" stroke-width="2"/>`;

      // Height bracket
      const bracketX = pos.x + pos.w + dp + 8;
      html += `<line x1="${bracketX}" y1="${pos.y}" x2="${bracketX}" y2="${floorY}" stroke="${p.color}" stroke-width="1" stroke-dasharray="3 2" opacity="0.5"/>`;
      html += `<line x1="${bracketX - 4}" y1="${pos.y}" x2="${
        bracketX + 4
      }" y2="${pos.y}" stroke="${p.color}" stroke-width="1" opacity="0.5"/>`;
      html += `<line x1="${bracketX - 4}" y1="${floorY}" x2="${
        bracketX + 4
      }" y2="${floorY}" stroke="${p.color}" stroke-width="1" opacity="0.5"/>`;
      html += `<text x="${bracketX + 6}" y="${pos.y + pos.h / 2 + 4}" fill="${
        p.color
      }" font-family="Space Mono, monospace" font-size="10" text-anchor="start" opacity="0.7">${
        p.h
      }"</text>`;

      // Width dimension below floor
      const dimY = floorY + 16;
      html += `<line x1="${pos.x}" y1="${dimY}" x2="${
        pos.x + pos.w
      }" y2="${dimY}" stroke="${p.color}" stroke-width="1" opacity="0.6"/>`;
      html += `<line x1="${pos.x}" y1="${dimY - 4}" x2="${pos.x}" y2="${
        dimY + 4
      }" stroke="${p.color}" stroke-width="1" opacity="0.6"/>`;
      html += `<line x1="${pos.x + pos.w}" y1="${dimY - 4}" x2="${
        pos.x + pos.w
      }" y2="${dimY + 4}" stroke="${p.color}" stroke-width="1" opacity="0.6"/>`;
      html += `<text x="${cx}" y="${dimY + 14}" fill="${
        p.color
      }" font-family="Space Mono, monospace" font-size="10" text-anchor="middle" opacity="0.9">${
        p.w
      }" wide</text>`;

      // Label above box
      const labelY = pos.y - dp - 6;
      const origStr = p.origDims.join('" × ') + '"';
      html += `<text x="${cx}" y="${labelY - 16}" fill="${
        p.color
      }" font-family="Space Mono, monospace" font-size="12" text-anchor="middle" font-weight="700">${origStr}</text>`;
      html += `<text x="${cx}" y="${labelY}" fill="${p.color}" font-family="Space Mono, monospace" font-size="11" text-anchor="middle" opacity="0.8">${p.lbs} lbs</text>`;

      // Package name below
      html += `<text x="${cx}" y="${
        floorY + 46
      }" fill="#9ca3af" font-family="DM Sans, sans-serif" font-size="13" text-anchor="middle" font-weight="500">${
        p.label
      }</text>`;
    });

    svg.innerHTML = html;

    // --- Legend ---
    const legendEl = document.getElementById("legend");
    legendEl.innerHTML = "";
    packages.forEach((p) => {
      const origStr = p.origDims.join('"×') + '"';
      legendEl.innerHTML += `
        <div class="legend-item">
          <div class="legend-swatch" style="background:${p.color}"></div>
          <span>${p.label}: ${origStr} — ${p.lbs} lbs</span>
        </div>`;
    });
  }, []); // Empty dependency array means this runs once after mount

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap");

        .packages-page * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .packages-page {
          background: #0e1117;
          color: #e0e4ea;
          font-family: "DM Sans", sans-serif;
          min-height: 100vh;
          padding: 40px 20px;
        }

        .packages-page h1 {
          font-family: "Space Mono", monospace;
          font-size: 28px;
          text-align: center;
          margin-bottom: 8px;
          color: #fff;
          letter-spacing: -0.5px;
        }

        .packages-page .subtitle {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 40px;
          font-family: "Space Mono", monospace;
        }

        .packages-page .container {
          width: 100%;
          margin: 0 auto;
        }

        .packages-page .scale-note {
          text-align: center;
          font-family: "Space Mono", monospace;
          font-size: 12px;
          color: #4b5563;
          margin-bottom: 24px;
        }

        .packages-page .svg-wrapper {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 12px;
          padding: 30px 0 20px;
          overflow-x: auto;
        }

        .packages-page svg {
          display: block;
          width: 100%;
          height: auto;
        }

        .packages-page .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
          margin-top: 28px;
          padding: 20px;
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 12px;
        }

        .packages-page .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: "Space Mono", monospace;
          font-size: 12px;
          color: #9ca3af;
        }

        .packages-page .legend-swatch {
          width: 14px;
          height: 14px;
          border-radius: 3px;
        }

        .packages-page .view-label {
          text-align: center;
          font-family: "Space Mono", monospace;
          font-size: 13px;
          color: #6b7280;
          margin-top: 20px;
        }
      `}</style>

      <div className="packages-page">
        <div className="container">
          <h1>📦 Package Scale Reference</h1>
          <p className="subtitle">
            All dimensions to scale · Packages standing upright · 6 ft human for
            reference
          </p>
          <p className="scale-note">
            Scale: 1 inch = 8 pixels · Longest dimension shown as height
          </p>

          <div className="svg-wrapper">
            <svg
              id="mainSvg"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            ></svg>
          </div>

          <div className="legend" id="legend"></div>

          <p className="view-label">
            Packages oriented vertically (longest edge up)
          </p>
        </div>
      </div>
    </>
  );
}
