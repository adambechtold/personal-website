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
    const PIXELS_PER_INCH = 8;

    const rawPackages = [
      { label: "Pkg 1", dimensions: [84, 8, 10], pounds: 61, color: "#f97316" },
      { label: "Pkg 2", dimensions: [63, 8, 10], pounds: 37, color: "#06b6d4" },
      { label: "Pkg 3", dimensions: [48, 7, 7], pounds: 38, color: "#a78bfa" },
      {
        label: "Pkg 4",
        dimensions: [14, 14, 10],
        pounds: 22,
        color: "#34d399",
      },
      { label: "Pkg 5", dimensions: [63, 15, 5], pounds: 48, color: "#fb7185" },
    ];

    const packages = rawPackages.map((packageItem) => {
      const descending = [...packageItem.dimensions].sort(
        (first, second) => second - first
      );
      return {
        ...packageItem,
        heightInches: descending[0],
        widthInches: descending[1],
        depthInches: descending[2],
        originalDimensions: packageItem.dimensions,
      };
    });

    const HUMAN_HEIGHT_INCHES = 72;
    const margin = 50;
    const topPadding = 80;

    const tallestInches = Math.max(
      HUMAN_HEIGHT_INCHES,
      ...packages.map((packageItem) => packageItem.heightInches)
    );
    const floorY = topPadding + tallestInches * PIXELS_PER_INCH;

    // --- Compute natural width of content ---
    let cursorX = margin + 40;

    const humanTopY = floorY - HUMAN_HEIGHT_INCHES * PIXELS_PER_INCH;
    const humanBlockWidth = 22 * PIXELS_PER_INCH;
    cursorX += humanBlockWidth;

    // Calculate total content width needed for packages
    let packagesNaturalWidth = 0;
    packages.forEach((packageItem) => {
      const depthPixels = packageItem.depthInches * PIXELS_PER_INCH * 0.4;
      // box + 3d + bracket label space
      packagesNaturalWidth +=
        packageItem.widthInches * PIXELS_PER_INCH + depthPixels + 30;
    });

    const naturalContentWidth = cursorX + packagesNaturalWidth + margin;

    // Now figure out spacing: distribute remaining space as gaps
    // We have 1 gap after human + (n-1) gaps between packages = n gaps total
    const gapCount = packages.length + 1;
    const wrapperElement = document.querySelector(".svg-wrapper");
    const availableWidth = Math.max(
      naturalContentWidth,
      wrapperElement.clientWidth - 40
    );

    const extraSpace = availableWidth - naturalContentWidth;
    const gapSize = Math.max(
      5 * PIXELS_PER_INCH,
      (extraSpace > 0 ? extraSpace / gapCount : 0) + 5 * PIXELS_PER_INCH
    );

    // --- Layout with computed gaps ---
    cursorX = margin + 40;
    // Human
    const humanCenterX = cursorX + 10 * PIXELS_PER_INCH;
    cursorX += humanBlockWidth + gapSize;

    const packagePositions = packages.map((packageItem) => {
      const widthPixels = packageItem.widthInches * PIXELS_PER_INCH;
      const heightPixels = packageItem.heightInches * PIXELS_PER_INCH;
      const depthPixels = packageItem.depthInches * PIXELS_PER_INCH * 0.4;
      const position = {
        x: cursorX,
        y: floorY - heightPixels,
        w: widthPixels,
        h: heightPixels,
        depthPixels,
        packageItem,
      };
      cursorX += widthPixels + depthPixels + 30 + gapSize;
      return position;
    });

    const totalWidth = cursorX + margin;
    const totalHeight = floorY + 65;

    const svgElement = document.getElementById("mainSvg");
    svgElement.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);

    let markup = "";

    // --- Grid lines every foot ---
    for (let foot = 0; foot <= 7; foot++) {
      const y = floorY - foot * 12 * PIXELS_PER_INCH;
      if (y < 0) continue;
      markup += `<line x1="0" y1="${y}" x2="${totalWidth}" y2="${y}" stroke="${
        foot === 0 ? "#30363d" : "#1c2128"
      }" stroke-width="${foot === 0 ? 2 : 1}"/>`;
      if (foot > 0) {
        markup += `<text x="${margin + 28}" y="${
          y + 4
        }" fill="#4b5563" font-family="Space Mono, monospace" font-size="11" text-anchor="end">${foot} ft</text>`;
      }
    }

    // --- Human figure ---
    const humanX = humanCenterX;
    const scale = PIXELS_PER_INCH;
    const headCenterY = floorY - 67 * scale;
    const headRadius = 5 * scale;
    const shoulderY = floorY - 58 * scale;
    const waistY = floorY - 30 * scale;

    markup += `<g>
      <circle cx="${humanX}" cy="${headCenterY}" r="${headRadius}" fill="#374151" stroke="#4b5563" stroke-width="1.5"/>
      <path d="
        M${humanX - 9 * scale} ${shoulderY}
        Q${humanX} ${shoulderY - 1 * scale} ${humanX + 9 * scale} ${shoulderY}
        L${humanX + 6 * scale} ${waistY}
        L${humanX - 6 * scale} ${waistY}
        Z
      " fill="#374151" stroke="#4b5563" stroke-width="1.5"/>
      <rect x="${humanX - 11 * scale}" y="${shoulderY}" width="${
        3 * scale
      }" height="${20 * scale}" rx="${
        1.5 * scale
      }" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <rect x="${humanX + 8 * scale}" y="${shoulderY}" width="${
        3 * scale
      }" height="${20 * scale}" rx="${
        1.5 * scale
      }" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <rect x="${humanX - 5.5 * scale}" y="${waistY}" width="${
        5 * scale
      }" height="${30 * scale}" rx="${
        2.5 * scale
      }" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <rect x="${humanX + 0.5 * scale}" y="${waistY}" width="${
        5 * scale
      }" height="${30 * scale}" rx="${
        2.5 * scale
      }" fill="#374151" stroke="#4b5563" stroke-width="1"/>
      <text x="${humanX}" y="${
        humanTopY - 16
      }" fill="#9ca3af" font-family="Space Mono, monospace" font-size="14" text-anchor="middle" font-weight="700">6 ft Human</text>
      <text x="${humanX}" y="${
        humanTopY - 3
      }" fill="#6b7280" font-family="Space Mono, monospace" font-size="11" text-anchor="middle">(72 in)</text>
      <line x1="${humanX + 14 * scale}" y1="${humanTopY}" x2="${
        humanX + 14 * scale
      }" y2="${floorY}" stroke="#6b7280" stroke-width="1" stroke-dasharray="4 3"/>
      <line x1="${humanX + 12 * scale}" y1="${humanTopY}" x2="${
        humanX + 16 * scale
      }" y2="${humanTopY}" stroke="#6b7280" stroke-width="1"/>
      <line x1="${humanX + 12 * scale}" y1="${floorY}" x2="${
        humanX + 16 * scale
      }" y2="${floorY}" stroke="#6b7280" stroke-width="1"/>
      <text x="${humanX + 14 * scale + 6}" y="${
        humanTopY + (HUMAN_HEIGHT_INCHES * scale) / 2 + 4
      }" fill="#6b7280" font-family="Space Mono, monospace" font-size="10" text-anchor="start">72"</text>
    </g>`;

    // --- Packages ---
    packagePositions.forEach((position) => {
      const packageItem = position.packageItem;
      const centerX = position.x + position.w / 2;
      const depthPixels = position.depthPixels;

      // 3D top face
      markup += `<polygon points="${position.x},${position.y} ${
        position.x + depthPixels
      },${position.y - depthPixels} ${position.x + position.w + depthPixels},${
        position.y - depthPixels
      } ${position.x + position.w},${position.y}"
        fill="${packageItem.color}" opacity="0.25" stroke="${
          packageItem.color
        }" stroke-width="1" stroke-opacity="0.4"/>`;

      // 3D right face
      markup += `<polygon points="${position.x + position.w},${position.y} ${
        position.x + position.w + depthPixels
      },${position.y - depthPixels} ${position.x + position.w + depthPixels},${
        position.y + position.h - depthPixels
      } ${position.x + position.w},${position.y + position.h}"
        fill="${packageItem.color}" opacity="0.15" stroke="${
          packageItem.color
        }" stroke-width="1" stroke-opacity="0.3"/>`;

      // Front face
      markup += `<rect x="${position.x}" y="${position.y}" width="${position.w}" height="${position.h}" rx="2"
        fill="${packageItem.color}" fill-opacity="0.12" stroke="${packageItem.color}" stroke-width="2"/>`;

      // Height bracket
      const bracketX = position.x + position.w + depthPixels + 8;
      markup += `<line x1="${bracketX}" y1="${position.y}" x2="${bracketX}" y2="${floorY}" stroke="${packageItem.color}" stroke-width="1" stroke-dasharray="3 2" opacity="0.5"/>`;
      markup += `<line x1="${bracketX - 4}" y1="${position.y}" x2="${
        bracketX + 4
      }" y2="${position.y}" stroke="${
        packageItem.color
      }" stroke-width="1" opacity="0.5"/>`;
      markup += `<line x1="${bracketX - 4}" y1="${floorY}" x2="${
        bracketX + 4
      }" y2="${floorY}" stroke="${
        packageItem.color
      }" stroke-width="1" opacity="0.5"/>`;
      markup += `<text x="${bracketX + 6}" y="${
        position.y + position.h / 2 + 4
      }" fill="${
        packageItem.color
      }" font-family="Space Mono, monospace" font-size="10" text-anchor="start" opacity="0.7">${
        packageItem.heightInches
      }"</text>`;

      // Width dimension below floor
      const dimensionY = floorY + 16;
      markup += `<line x1="${position.x}" y1="${dimensionY}" x2="${
        position.x + position.w
      }" y2="${dimensionY}" stroke="${
        packageItem.color
      }" stroke-width="1" opacity="0.6"/>`;
      markup += `<line x1="${position.x}" y1="${dimensionY - 4}" x2="${
        position.x
      }" y2="${dimensionY + 4}" stroke="${
        packageItem.color
      }" stroke-width="1" opacity="0.6"/>`;
      markup += `<line x1="${position.x + position.w}" y1="${
        dimensionY - 4
      }" x2="${position.x + position.w}" y2="${dimensionY + 4}" stroke="${
        packageItem.color
      }" stroke-width="1" opacity="0.6"/>`;
      markup += `<text x="${centerX}" y="${dimensionY + 14}" fill="${
        packageItem.color
      }" font-family="Space Mono, monospace" font-size="10" text-anchor="middle" opacity="0.9">${
        packageItem.widthInches
      }" wide</text>`;

      // Label above box
      const labelY = position.y - depthPixels - 6;
      const originalDimensionsLabel =
        packageItem.originalDimensions.join('" × ') + '"';
      markup += `<text x="${centerX}" y="${labelY - 16}" fill="${
        packageItem.color
      }" font-family="Space Mono, monospace" font-size="12" text-anchor="middle" font-weight="700">${originalDimensionsLabel}</text>`;
      markup += `<text x="${centerX}" y="${labelY}" fill="${packageItem.color}" font-family="Space Mono, monospace" font-size="11" text-anchor="middle" opacity="0.8">${packageItem.pounds} lbs</text>`;

      // Package name below
      markup += `<text x="${centerX}" y="${
        floorY + 46
      }" fill="#9ca3af" font-family="DM Sans, sans-serif" font-size="13" text-anchor="middle" font-weight="500">${
        packageItem.label
      }</text>`;
    });

    svgElement.innerHTML = markup;

    // --- Legend ---
    const legendElement = document.getElementById("legend");
    legendElement.innerHTML = "";
    packages.forEach((packageItem) => {
      const originalDimensionsLabel =
        packageItem.originalDimensions.join('"×') + '"';
      legendElement.innerHTML += `
        <div class="legend-item">
          <div class="legend-swatch" style="background:${packageItem.color}"></div>
          <span>${packageItem.label}: ${originalDimensionsLabel} — ${packageItem.pounds} lbs</span>
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
