import type { PreviewRenderer, RenderContext, RenderResult } from "./render-types";
import { escapeXml, jitter, labelLayer, mod, moodPose, sceneIntensity, signature, wrapSvg } from "./svg";

function lines(ctx: RenderContext, count: number, color: string, opacity = 0.45) {
  return Array.from({ length: count }, (_, i) => {
    const x1 = mod(ctx.seed, i * 17 + 3, ctx.width);
    const x2 = mod(ctx.seed, i * 23 + 11, ctx.width);
    return `<path d="M${x1} ${mod(ctx.seed, i * 31 + 7, ctx.height)} L${x2} ${mod(ctx.seed, i * 41 + 5, ctx.height)}" stroke="${color}" stroke-width="${2 + (i % 4)}" opacity="${opacity}"/>`;
  }).join("");
}

function eventText(ctx: RenderContext, text: string, x: number, y: number, color: string, size = 28) {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="900" font-family="Inter, Arial, sans-serif">${escapeXml(text).slice(0, 22)}</text>`;
}

function sceneTag(ctx: RenderContext) {
  if (ctx.rarity === "Mythic") return "MYTHIC EVENT";
  if (ctx.rarity === "Legendary") return "SIGNATURE SCENE";
  if (ctx.rarity === "Epic") return "ACTION FRAME";
  return ctx.rarity.toUpperCase();
}

export const comicRenderer: PreviewRenderer = {
  pipeline: "comic-renderer",
  families: ["comic-panel"],
  engines: ["comic-panel-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent, paper } = ctx.palette;
    const pose = moodPose(ctx);
    const splash = ctx.intensity >= 5;
    const gutter = splash ? 18 : 10;
    const panels = splash
      ? `<path d="M0 0 H${ctx.width} V${ctx.height} H0Z" fill="${paper}"/><path d="M28 28 H${ctx.width - 28} V${ctx.height - 28} H28Z" fill="${accent}" stroke="${ink}" stroke-width="12"/><path d="M${ctx.width * 0.05} ${ctx.height * 0.72} L${ctx.width * 0.92} ${ctx.height * 0.16}" stroke="${ink}" stroke-width="18"/><path d="M${ctx.width * 0.18} ${ctx.height * 0.18} L${ctx.width * 0.98} ${ctx.height * 0.34} L${ctx.width * 0.82} ${ctx.height * 0.56} Z" fill="${secondary}" stroke="${ink}" stroke-width="9"/>`
      : ctx.rarity === "Common"
        ? `<rect width="${ctx.width}" height="${ctx.height}" fill="${paper}"/><rect x="36" y="48" width="${ctx.width * 0.66}" height="${ctx.height * 0.72}" fill="${accent}" stroke="${ink}" stroke-width="${gutter}"/><rect x="${ctx.width * 0.66}" y="84" width="${ctx.width * 0.26}" height="${ctx.height * 0.22}" fill="${primary}" stroke="${ink}" stroke-width="${gutter}"/>`
        : ctx.rarity === "Uncommon"
          ? `<rect width="${ctx.width}" height="${ctx.height}" fill="${paper}"/><rect x="30" y="34" width="${ctx.width * 0.38}" height="${ctx.height * 0.78}" fill="${primary}" stroke="${ink}" stroke-width="${gutter}"/><rect x="${ctx.width * 0.48}" y="78" width="${ctx.width * 0.44}" height="${ctx.height * 0.56}" fill="${accent}" stroke="${ink}" stroke-width="${gutter}"/>`
          : ctx.rarity === "Rare"
            ? `<rect width="${ctx.width}" height="${ctx.height}" fill="${secondary}"/><rect x="42" y="42" width="${ctx.width * 0.86}" height="${ctx.height * 0.52}" fill="${accent}" stroke="${ink}" stroke-width="${gutter}"/><path d="M0 ${ctx.height * 0.68} H${ctx.width} V${ctx.height} H0Z" fill="${paper}" stroke="${ink}" stroke-width="${gutter}"/>`
            : `<rect width="${ctx.width}" height="${ctx.height}" fill="${paper}"/><path d="M0 0 H${ctx.width} L${ctx.width * 0.58} ${ctx.height} H0Z" fill="${primary}" stroke="${ink}" stroke-width="${gutter}"/><path d="M${ctx.width * 0.38} 0 H${ctx.width} V${ctx.height * 0.64} L${ctx.width * 0.18} ${ctx.height * 0.84}Z" fill="${secondary}" stroke="${ink}" stroke-width="${gutter}"/>`;
    const placement = {
      Common: [0.44, 0.52, 0.78, -4],
      Uncommon: [0.67, 0.48, 0.9, 9],
      Rare: [0.58, 0.38, 1.55, -7],
      Epic: [0.52, 0.52, 1.18, -18],
      Legendary: [0.62, 0.45, 1.35, -18],
      Mythic: [0.58, 0.44, 1.48, -24]
    }[ctx.rarity];
    const cx = ctx.width * placement[0];
    const cy = ctx.height * placement[1];
    const scale = placement[2];
    const tilt = placement[3];
    const figure = `<g transform="rotate(${tilt} ${cx} ${cy})" filter="url(#softShadow)">
      <path d="M${cx - 96 * scale} ${cy - 180 * scale} Q${cx + 12 * scale} ${cy - 290 * scale} ${cx + 144 * scale} ${cy - 130 * scale} Q${cx + 126 * scale} ${cy + 48 * scale} ${cx + 20 * scale} ${cy + 122 * scale} Q${cx - 134 * scale} ${cy + 92 * scale} ${cx - 96 * scale} ${cy - 180 * scale}Z" fill="${primary}" stroke="${ink}" stroke-width="11"/>
      <path d="M${cx - 170 * scale} ${cy + 110 * scale} L${cx + 190 * scale} ${cy + 86 * scale} L${cx + 104 * scale} ${cy + 310 * scale} H${cx - 92 * scale}Z" fill="${secondary}" stroke="${ink}" stroke-width="11"/>
      <ellipse cx="${cx - 50 * scale}" cy="${cy - 54 * scale}" rx="${28 * pose.eyeScale}" ry="${splash ? 42 : 24 * pose.eyeScale}" fill="${accent}" stroke="${ink}" stroke-width="7"/>
      <ellipse cx="${cx + 70 * scale}" cy="${cy - 78 * scale + pose.asymmetry / 5}" rx="${splash ? 45 : 28}" ry="${splash ? 28 : 24 * pose.eyeScale}" fill="${accent}" stroke="${ink}" stroke-width="7"/>
      <path d="M${cx - 52 * scale} ${cy + 46 * scale} q${splash ? 88 : 58} ${pose.mouthOpen ? 68 : 24} ${splash ? 172 : 124} ${splash ? -24 : -12}" stroke="${ink}" stroke-width="12" fill="none"/>
      <path d="M${cx + 110 * scale} ${cy + 62 * scale} l${splash ? 230 : 138} -${splash ? 150 : 80}" stroke="${ink}" stroke-width="${splash ? 28 : 18}" stroke-linecap="round"/>
    </g>`;
    const fx = `<g>${lines(ctx, splash ? 30 : ctx.rarity === "Epic" ? 18 : 7, ink, 0.45)}${eventText(ctx, splash ? "BREAK" : ctx.rarity === "Epic" ? "IMPACT" : "BANG", 72, 150, ink, splash ? 78 : 42)}</g>`;
    const sig = signature(ctx, "comic-renderer", splash ? "splash-page-event" : `${ctx.rarity.toLowerCase()}-comic-shot`, `${ctx.rarity}-panel-${pose.energy}`, { cameraVariant: `${ctx.rarity.toLowerCase()} comic ${splash ? "splash page" : "panel cut"} ${tilt}` });
    return { svg: wrapSvg(ctx, `${panels}${fx}${figure}${labelLayer(ctx, ink, secondary)}`, sig), signature: sig };
  }
};

export const cinematicRenderer: PreviewRenderer = {
  pipeline: "cinematic-renderer",
  families: ["cinematic-scene", "biohazard-horror"],
  engines: ["cinematic-engine", "horror-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent } = ctx.palette;
    const pose = moodPose(ctx);
    const high = ctx.intensity >= 5;
    const horizon = high ? ctx.height * 0.62 : ctx.height * 0.7;
    const shot = {
      Common: [0.42, 0.58, 0.72, "medium-room"],
      Uncommon: [0.28, 0.58, 0.84, "over-shoulder"],
      Rare: [0.62, 0.47, 1.25, "close-pressure"],
      Epic: [0.72, 0.54, 0.96, "diagonal-action"],
      Legendary: [0.76, 0.68, 0.5, "wide-event"],
      Mythic: [0.2, 0.68, 0.44, "world-collapse"]
    }[ctx.rarity];
    const actorX = ctx.width * (shot[0] as number);
    const actorY = ctx.height * (shot[1] as number);
    const scale = shot[2] as number;
    const set = `<rect width="${ctx.width}" height="${ctx.height}" fill="${ink}"/>
      <rect y="${ctx.height * 0.07}" width="${ctx.width}" height="${ctx.height * 0.78}" fill="url(#keyLight)" opacity="${high ? 0.54 : 0.34}"/>
      <path d="M0 ${horizon} C${ctx.width * 0.2} ${horizon - 90} ${ctx.width * 0.68} ${horizon + 105} ${ctx.width} ${horizon - 48} V${ctx.height} H0Z" fill="${secondary}" opacity="0.82"/>
      <g opacity="${high ? 0.9 : ctx.rarity === "Rare" ? 0.25 : 0.45}">${Array.from({ length: high ? 12 : ctx.rarity === "Epic" ? 7 : 4 }, (_, i) => `<rect x="${mod(ctx.seed, i * 37 + 2, ctx.width)}" y="${ctx.height * (0.16 + (i % 4) * 0.08)}" width="${52 + i * 16}" height="${ctx.height * (0.24 + (i % 3) * 0.08)}" fill="${i % 2 ? ink : secondary}" stroke="${primary}" stroke-width="2" opacity="0.52"/>`).join("")}</g>
      <rect y="0" width="${ctx.width}" height="${ctx.height * 0.075}" fill="#000"/><rect y="${ctx.height * 0.925}" width="${ctx.width}" height="${ctx.height * 0.075}" fill="#000"/>`;
    const closeFace = `<g transform="rotate(-8 ${ctx.width * 0.6} ${ctx.height * 0.42})" filter="url(#softShadow)">
      <path d="M${ctx.width * 0.28} ${ctx.height * 0.02} C${ctx.width * 0.7} ${ctx.height * -0.08} ${ctx.width * 1.02} ${ctx.height * 0.2} ${ctx.width * 0.92} ${ctx.height * 0.66} C${ctx.width * 0.76} ${ctx.height * 0.96} ${ctx.width * 0.3} ${ctx.height * 0.86} ${ctx.width * 0.2} ${ctx.height * 0.5} C${ctx.width * 0.12} ${ctx.height * 0.24} ${ctx.width * 0.16} ${ctx.height * 0.08} ${ctx.width * 0.28} ${ctx.height * 0.02}Z" fill="${primary}" opacity="0.94"/>
      <path d="M${ctx.width * 0.4} ${ctx.height * 0.32} h78 M${ctx.width * 0.68} ${ctx.height * 0.26} h96" stroke="${accent}" stroke-width="16"/>
      <path d="M${ctx.width * 0.48} ${ctx.height * 0.52} q96 ${pose.mouthOpen ? 78 : 28} 236 -14" stroke="${ink}" stroke-width="18" fill="none"/>
    </g>`;
    const actor = `<g transform="rotate(${high ? -7 : pose.tilt / 5} ${actorX} ${actorY})" filter="url(#softShadow)">
      <path d="M${actorX - 56 * scale} ${actorY - 142 * scale} Q${actorX + 4 * scale} ${actorY - 222 * scale} ${actorX + 72 * scale} ${actorY - 136 * scale} Q${actorX + 70 * scale} ${actorY - 40 * scale} ${actorX + 28 * scale} ${actorY + 18 * scale} L${actorX + 110 * scale} ${actorY + 270 * scale} H${actorX - 126 * scale} L${actorX - 40 * scale} ${actorY + 18 * scale} Q${actorX - 88 * scale} ${actorY - 48 * scale} ${actorX - 56 * scale} ${actorY - 142 * scale}Z" fill="${primary}" opacity="0.92"/>
      <path d="M${actorX - 36 * scale} ${actorY - 70 * scale} h${30 * scale} M${actorX + 24 * scale} ${actorY - 86 * scale + pose.asymmetry / 8} h${38 * scale}" stroke="${accent}" stroke-width="7"/>
      <path d="M${actorX - 32 * scale} ${actorY - 10 * scale} q${48 * scale} ${pose.mouthOpen ? 38 : 12} ${96 * scale} 0" stroke="${ink}" stroke-width="8" fill="none"/>
      <path d="M${actorX - 145 * scale} ${actorY + 78 * scale} q-${110 * scale} ${pose.lean} -${high ? 220 : 130} ${high ? -118 : -70}" stroke="${accent}" stroke-width="${high ? 24 : 16}" fill="none"/>
    </g>`;
    const witnesses = high ? Array.from({ length: ctx.rarity === "Mythic" ? 8 : 5 }, (_, i) => {
      const x = 80 + i * (ctx.width - 160) / (ctx.rarity === "Mythic" ? 7 : 4);
      const y = ctx.height * (0.62 + (i % 2) * 0.08);
      return `<g opacity="${0.34 + i * 0.04}"><path d="M${x - 22} ${y + 96} l28 -118 l46 118z" fill="${i % 2 ? primary : accent}"/><circle cx="${x + 6}" cy="${y - 36}" r="${18 + (i % 3) * 4}" fill="${i % 2 ? secondary : primary}"/></g>`;
    }).join("") : "";
    const foreground = ctx.rarity === "Uncommon" ? `<path d="M0 ${ctx.height * 0.08} C${ctx.width * 0.22} ${ctx.height * 0.18} ${ctx.width * 0.18} ${ctx.height * 0.88} 0 ${ctx.height}Z" fill="#000" opacity="0.76"/>` : ctx.rarity === "Rare" ? `<rect x="0" y="0" width="${ctx.width * 0.22}" height="${ctx.height}" fill="#000" opacity="0.36"/>` : "";
    const event = high ? `<g opacity="0.95"><circle cx="${ctx.rarity === "Mythic" ? ctx.width * 0.78 : ctx.width * 0.25}" cy="${ctx.height * 0.24}" r="${ctx.rarity === "Mythic" ? 300 : 175}" fill="url(#eventGlow)"/><path d="M${ctx.width * 0.02} ${ctx.height * 0.72} L${ctx.width * 0.92} ${ctx.rarity === "Mythic" ? ctx.height * 0.2 : ctx.height * 0.12}" stroke="${accent}" stroke-width="${ctx.rarity === "Mythic" ? 24 : 14}" opacity="0.5"/><path d="M${ctx.width * 0.45} 0 V${ctx.height}" stroke="${primary}" stroke-width="${ctx.rarity === "Mythic" ? 58 : 20}" opacity="0.2"/><path d="M0 ${ctx.height * 0.38} C${ctx.width * 0.3} ${ctx.height * 0.24} ${ctx.width * 0.58} ${ctx.height * 0.82} ${ctx.width} ${ctx.height * 0.5}" stroke="${secondary}" stroke-width="18" fill="none" opacity="0.55"/></g>` : "";
    const body = ctx.rarity === "Rare" ? closeFace : `${witnesses}${actor}`;
    const sig = signature(ctx, "cinematic-renderer", high ? String(shot[3]) : String(shot[3]), `${ctx.rarity}-film-${pose.energy}`, { cameraVariant: `${shot[3]} cinematic blocking` });
    return { svg: wrapSvg(ctx, `${set}${event}${foreground}${body}${labelLayer(ctx)}`, sig), signature: sig };
  }
};

export const portraitRenderer: PreviewRenderer = {
  pipeline: "portrait-renderer",
  families: ["anime-portrait", "painterly-portrait"],
  engines: ["portrait-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent } = ctx.palette;
    const pose = moodPose(ctx);
    const high = ctx.intensity >= 5;
    const shot = {
      Common: [0.48, 0.5, 0.72, "study-bust"],
      Uncommon: [0.43, 0.5, 0.82, "profile-turn"],
      Rare: [0.61, 0.42, 1.22, "cropped-face"],
      Epic: [0.5, 0.54, 1.02, "diagonal-brush-gesture"],
      Legendary: [0.38, 0.49, 0.86, "gallery-emotional-scene"],
      Mythic: [0.62, 0.45, 0.72, "split-canvas-hallucination"]
    }[ctx.rarity];
    const cx = ctx.width * (shot[0] as number);
    const cy = ctx.height * (shot[1] as number);
    const s = shot[2] as number;
    const brush = Array.from({ length: 12 + ctx.intensity * 5 }, (_, i) => `<path d="M${mod(ctx.seed, i * 19, ctx.width)} ${mod(ctx.seed, i * 31, ctx.height)} q${jitter(ctx.seed, i + 7, 170)} ${jitter(ctx.seed, i + 11, 120)} ${jitter(ctx.seed, i + 17, 260)} ${jitter(ctx.seed, i + 23, 180)}" stroke="${i % 3 === 0 ? primary : i % 3 === 1 ? secondary : accent}" stroke-width="${10 + (i % 5) * 6}" opacity="0.24" fill="none"/>`).join("");
    const bustFace = `<g transform="rotate(${pose.tilt / 3} ${cx} ${cy})" filter="url(#softShadow)">
      <path d="M${cx - 160 * s} ${cy + 110 * s} C${cx - 96 * s} ${cy - 28 * s} ${cx + 130 * s} ${cy - 48 * s} ${cx + 210 * s} ${cy + 142 * s} L${cx + 238 * s} ${cy + 385 * s} H${cx - 238 * s}Z" fill="${secondary}" opacity="0.92"/>
      <path d="M${cx - 132 * s} ${cy - 170 * s} Q${cx - 12 * s} ${cy - 270 * s} ${cx + 146 * s} ${cy - 158 * s} Q${cx + 184 * s} ${cy + 12 * s} ${cx + 62 * s} ${cy + 154 * s} Q${cx - 54 * s} ${cy + 220 * s} ${cx - 140 * s} ${cy + 102 * s} Q${cx - 210 * s} ${cy - 18 * s} ${cx - 132 * s} ${cy - 170 * s}Z" fill="${primary}" stroke="${ink}" stroke-width="${ctx.family === "anime-portrait" ? 10 : 4}" opacity="0.95"/>
      <path d="M${cx - 208 * s} ${cy - 150 * s} C${cx - 84 * s} ${cy - 288 * s} ${cx + 132 * s} ${cy - 254 * s} ${cx + 214 * s} ${cy - 84 * s} C${cx + 74 * s} ${cy - 144 * s} ${cx - 38 * s} ${cy - 152 * s} ${cx - 208 * s} ${cy - 150 * s}Z" fill="${secondary}" opacity="0.85"/>
      <ellipse cx="${cx - 62 * s}" cy="${cy - 18 * s + pose.asymmetry / 9}" rx="${42 * pose.eyeScale}" ry="${ctx.family === "anime-portrait" ? 34 * pose.eyeScale : 18 * pose.eyeScale}" fill="${accent}" stroke="${ink}" stroke-width="6"/>
      <ellipse cx="${cx + 80 * s}" cy="${cy - 26 * s - pose.asymmetry / 10}" rx="${high ? 58 : 40}" ry="${ctx.family === "anime-portrait" ? 30 : 18}" fill="${accent}" stroke="${ink}" stroke-width="6"/>
      <path d="M${cx - 34 * s} ${cy + 84 * s} q${pose.mouthOpen ? 44 : 58} ${pose.mouthOpen ? 48 : 18} ${pose.mouthOpen ? 104 : 120} ${pose.mouthOpen ? -4 : -14}" stroke="${ink}" stroke-width="${ctx.family === "anime-portrait" ? 10 : 7}" fill="none"/>
    </g>`;
    const profile = `<g transform="rotate(-6 ${ctx.width * 0.42} ${ctx.height * 0.5})" filter="url(#softShadow)">
      <path d="M${ctx.width * 0.26} ${ctx.height * 0.18} C${ctx.width * 0.5} ${ctx.height * 0.06} ${ctx.width * 0.66} ${ctx.height * 0.34} ${ctx.width * 0.48} ${ctx.height * 0.56} L${ctx.width * 0.62} ${ctx.height * 0.88} H${ctx.width * 0.22} L${ctx.width * 0.32} ${ctx.height * 0.58} C${ctx.width * 0.16} ${ctx.height * 0.48} ${ctx.width * 0.16} ${ctx.height * 0.28} ${ctx.width * 0.26} ${ctx.height * 0.18}Z" fill="${primary}" stroke="${ink}" stroke-width="7"/>
      <path d="M${ctx.width * 0.38} ${ctx.height * 0.34} h62 M${ctx.width * 0.45} ${ctx.height * 0.48} q64 28 142 -20" stroke="${accent}" stroke-width="12" fill="none"/>
    </g>`;
    const closeCrop = `<g filter="url(#softShadow)">
      <path d="M${ctx.width * -0.08} ${ctx.height * 0.1} C${ctx.width * 0.36} ${ctx.height * -0.08} ${ctx.width * 0.92} ${ctx.height * 0.1} ${ctx.width * 0.9} ${ctx.height * 0.64} C${ctx.width * 0.82} ${ctx.height * 1.04} ${ctx.width * 0.24} ${ctx.height * 0.98} ${ctx.width * 0.02} ${ctx.height * 0.68}Z" fill="${primary}" stroke="${ink}" stroke-width="8"/>
      <ellipse cx="${ctx.width * 0.3}" cy="${ctx.height * 0.38}" rx="74" ry="${34 * pose.eyeScale}" fill="${accent}" stroke="${ink}" stroke-width="8"/>
      <ellipse cx="${ctx.width * 0.6}" cy="${ctx.height * 0.34}" rx="88" ry="${44 * pose.eyeScale}" fill="${accent}" stroke="${ink}" stroke-width="8"/>
      <path d="M${ctx.width * 0.34} ${ctx.height * 0.58} q118 ${pose.mouthOpen ? 92 : 28} 310 -22" stroke="${ink}" stroke-width="18" fill="none"/>
    </g>`;
    const ghostFaces = high ? Array.from({ length: ctx.rarity === "Mythic" ? 4 : 2 }, (_, i) => {
      const gx = ctx.width * (0.18 + i * 0.22);
      const gy = ctx.height * (0.26 + (i % 2) * 0.34);
      return `<g opacity="${ctx.rarity === "Mythic" ? 0.42 : 0.26}" transform="rotate(${jitter(ctx.seed, i + 4, 18)} ${gx} ${gy})"><ellipse cx="${gx}" cy="${gy}" rx="${70 + i * 10}" ry="${92 + i * 8}" fill="${i % 2 ? primary : accent}"/><path d="M${gx - 28} ${gy - 12} h22 M${gx + 22} ${gy - 18} h24 M${gx - 22} ${gy + 38} q34 22 82 -8" stroke="${ink}" stroke-width="7" fill="none"/></g>`;
    }).join("") : "";
    const scene = high ? `<path d="M0 ${ctx.height * 0.72} C${ctx.width * 0.22} ${ctx.height * 0.56} ${ctx.width * 0.52} ${ctx.height * 0.86} ${ctx.width} ${ctx.height * 0.52} V${ctx.height} H0Z" fill="${ink}" opacity="0.38"/><rect x="${ctx.width * 0.52}" y="0" width="${ctx.width * 0.48}" height="${ctx.height}" fill="${ctx.rarity === "Mythic" ? secondary : ink}" opacity="${ctx.rarity === "Mythic" ? 0.42 : 0.18}"/><circle cx="${ctx.rarity === "Mythic" ? ctx.width * 0.78 : ctx.width * 0.24}" cy="${ctx.height * 0.26}" r="${ctx.rarity === "Mythic" ? 210 : 140}" fill="url(#eventGlow)" opacity="0.62"/>` : ctx.rarity === "Rare" ? `<rect x="0" y="0" width="${ctx.width * 0.28}" height="${ctx.height}" fill="${ink}" opacity="0.34"/>` : "";
    const face = ctx.rarity === "Uncommon" ? profile : ctx.rarity === "Rare" ? closeCrop : bustFace;
    const sig = signature(ctx, "portrait-renderer", String(shot[3]), `${ctx.family}-${ctx.rarity}-${pose.energy}`, { cameraVariant: `${shot[3]} portrait camera` });
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="${ink}"/><rect width="${ctx.width}" height="${ctx.height}" fill="url(#keyLight)" opacity="0.32"/>${brush}${scene}${ghostFaces}${face}${labelLayer(ctx)}`, sig), signature: sig };
  }
};

export const terminalRenderer: PreviewRenderer = {
  pipeline: "terminal-renderer",
  families: ["terminal-brutalist"],
  engines: ["terminal-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent } = ctx.palette;
    const high = ctx.intensity >= 5;
    const columns = high ? 4 : 2;
    const panels = Array.from({ length: high ? 14 : 6 }, (_, i) => {
      const x = 42 + mod(ctx.seed, i * 31, Math.max(60, ctx.width - 260));
      const y = 86 + mod(ctx.seed, i * 47, Math.max(80, ctx.height - 340));
      return `<rect x="${x}" y="${y}" width="${120 + (i % columns) * 44}" height="${70 + (i % 4) * 28}" fill="${i % 2 ? ink : secondary}" stroke="${primary}" stroke-width="2" opacity="${0.42 + ctx.intensity * 0.05}"/><path d="M${x + 12} ${y + 22} h${70 + (i % 5) * 22} M${x + 12} ${y + 44} h${38 + (i % 6) * 18}" stroke="${i % 3 ? accent : primary}" stroke-width="4"/>`;
    }).join("");
    const x = high ? ctx.width * 0.14 : ctx.width * 0.34;
    const y = high ? ctx.height * 0.2 : ctx.height * 0.28;
    const w = high ? ctx.width * 0.7 : ctx.width * 0.36;
    const h = high ? ctx.height * 0.42 : ctx.height * 0.28;
    const subject = `<g transform="rotate(${high ? -2 : 0} ${x + w / 2} ${y + h / 2})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#06080c" stroke="${primary}" stroke-width="${high ? 8 : 4}"/>
      <rect x="${x + 26}" y="${y + 30}" width="${w - 52}" height="42" fill="${secondary}" opacity="0.72"/>
      <path d="M${x + 58} ${y + 110} h${high ? 120 : 70} M${x + w - (high ? 178 : 126)} ${y + 110} h${high ? 120 : 70}" stroke="${accent}" stroke-width="${high ? 12 : 9}"/>
      <path d="M${x + w * 0.38} ${y + 176} h${w * 0.24}" stroke="${primary}" stroke-width="${high ? 14 : 8}"/>
    </g>`;
    const event = high ? eventText(ctx, "SYSTEM COLLAPSE", 54, 76, accent, 34) : "";
    const sig = signature(ctx, "terminal-renderer", high ? "system-failure-dashboard" : "desk-terminal-read", `${ctx.rarity}-terminal-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="#050608"/>${panels}${event}${subject}${labelLayer(ctx, accent, primary)}`, sig), signature: sig };
  }
};

export const posterRenderer: PreviewRenderer = {
  pipeline: "poster-renderer",
  families: ["propaganda-poster"],
  engines: ["poster-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent, paper } = ctx.palette;
    const high = ctx.intensity >= 5;
    const cx = ctx.width * (high ? 0.58 : 0.5);
    const cy = ctx.height * 0.53;
    const s = high ? 1.25 : 0.92;
    const crowd = Array.from({ length: high ? 18 : 5 }, (_, i) => `<path d="M${40 + i * 52} ${ctx.height - 160} l28 -80 l34 80z" fill="${i % 2 ? secondary : ink}" opacity="0.62"/>`).join("");
    const body = `<g>
      <path d="M0 0 H${ctx.width} L${ctx.width * 0.7} ${ctx.height} H0Z" fill="${primary}"/><path d="M${ctx.width * 0.24} 0 H${ctx.width} V${ctx.height} H${ctx.width * 0.48}Z" fill="${secondary}" opacity="0.82"/>
      <path d="M${cx} ${cy - 280 * s} L${cx + 170 * s} ${cy - 80 * s} L${cx + 104 * s} ${cy + 280 * s} H${cx - 130 * s} L${cx - 170 * s} ${cy - 80 * s}Z" fill="${ink}" opacity="0.94"/>
      <rect x="${cx - 96 * s}" y="${cy - 154 * s}" width="${190 * s}" height="${165 * s}" fill="${accent}"/>
      <path d="M${cx - 46 * s} ${cy - 90 * s} h${34 * s} M${cx + 28 * s} ${cy - 90 * s} h${34 * s} M${cx - 44 * s} ${cy - 32 * s} h${98 * s}" stroke="${ink}" stroke-width="11"/>
      <path d="M${cx + 116 * s} ${cy + 24 * s} l${high ? 220 : 150} -${high ? 170 : 120}" stroke="${accent}" stroke-width="${high ? 38 : 26}"/>
      ${crowd}
    </g>`;
    const slogan = high ? eventText(ctx, sceneTag(ctx), 58, 118, ink, 54) : "";
    const sig = signature(ctx, "poster-renderer", high ? "campaign-takeover-poster" : "monument-poster", `${ctx.rarity}-poster-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `${body}${slogan}${labelLayer(ctx, ink, secondary)}`, sig), signature: sig };
  }
};

export const pixelRenderer: PreviewRenderer = {
  pipeline: "pixel-renderer",
  families: ["pixel-topdown"],
  engines: ["pixel-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent } = ctx.palette;
    const high = ctx.intensity >= 5;
    const tile = high ? 36 : 42;
    const grid = Array.from({ length: Math.ceil(ctx.width / tile) * Math.ceil(ctx.height / tile) }, (_, i) => {
      const x = (i * tile) % ctx.width;
      const y = Math.floor((i * tile) / ctx.width) * tile;
      const hit = mod(ctx.seed, i, 9) < (high ? 4 : 2);
      return `<rect x="${x}" y="${y}" width="${tile - 2}" height="${tile - 2}" fill="${hit ? (i % 2 ? primary : secondary) : ink}" opacity="${hit ? 0.58 : 0.95}"/>`;
    }).join("");
    const actors = Array.from({ length: high ? 6 : 1 + Math.floor(ctx.intensity / 2) }, (_, i) => {
      const x = high ? 130 + i * 104 : ctx.width * 0.44 + i * 92;
      const y = high ? 240 + (i % 3) * 104 : ctx.height * 0.44 + i * 60;
      return `<g shape-rendering="crispEdges"><rect x="${x}" y="${y}" width="70" height="70" fill="${primary}" stroke="${accent}" stroke-width="8"/><rect x="${x - 18}" y="${y + 68}" width="108" height="86" fill="${secondary}" stroke="${accent}" stroke-width="8"/><rect x="${x + 18}" y="${y + 24}" width="10" height="${high ? 22 : 10}" fill="${ink}"/><rect x="${x + 46}" y="${y + 24}" width="10" height="${high ? 22 : 10}" fill="${ink}"/></g>`;
    }).join("");
    const sig = signature(ctx, "pixel-renderer", high ? "topdown-raid-map" : "sprite-identity-room", `${ctx.rarity}-pixel-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="${ink}"/><g shape-rendering="crispEdges">${grid}</g>${actors}${labelLayer(ctx, accent, primary)}`, sig), signature: sig };
  }
};

export const arcadeRenderer: PreviewRenderer = {
  pipeline: "arcade-renderer",
  families: ["retro-arcade"],
  engines: ["arcade-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent } = ctx.palette;
    const high = ctx.intensity >= 5;
    const hud = `<rect x="24" y="24" width="${ctx.width - 48}" height="54" fill="${ink}" stroke="${accent}" stroke-width="5"/><text x="46" y="60" fill="${primary}" font-family="monospace" font-size="24" font-weight="900">${sceneTag(ctx)} // STAGE ${ctx.intensity}</text>`;
    const floor = `<path d="M0 ${ctx.height * 0.68} H${ctx.width} V${ctx.height} H0Z" fill="${secondary}"/><g shape-rendering="crispEdges">${Array.from({ length: high ? 24 : 12 }, (_, i) => `<rect x="${mod(ctx.seed, i * 13, ctx.width)}" y="${ctx.height * 0.66 + mod(ctx.seed, i * 29, ctx.height * 0.24)}" width="${28 + (i % 3) * 16}" height="${28 + (i % 2) * 18}" fill="${i % 2 ? primary : accent}" opacity="0.74"/>`).join("")}</g>`;
    const boss = high ? `<g shape-rendering="crispEdges"><rect x="${ctx.width * 0.58}" y="${ctx.height * 0.23}" width="190" height="190" fill="${primary}" stroke="${ink}" stroke-width="12"/><rect x="${ctx.width * 0.62}" y="${ctx.height * 0.32}" width="32" height="42" fill="${ink}"/><rect x="${ctx.width * 0.72}" y="${ctx.height * 0.32}" width="32" height="42" fill="${ink}"/></g>` : "";
    const player = `<g shape-rendering="crispEdges"><rect x="${ctx.width * (high ? 0.22 : 0.42)}" y="${ctx.height * 0.42}" width="86" height="86" fill="${accent}" stroke="${ink}" stroke-width="9"/><rect x="${ctx.width * (high ? 0.18 : 0.39)}" y="${ctx.height * 0.52}" width="150" height="128" fill="${primary}" stroke="${ink}" stroke-width="9"/></g>`;
    const sig = signature(ctx, "arcade-renderer", high ? "boss-stage-action-frame" : "side-scroll-action-frame", `${ctx.rarity}-arcade-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="${ink}"/>${floor}${player}${boss}${hud}${labelLayer(ctx, accent, primary)}`, sig), signature: sig };
  }
};

export const stickerRenderer: PreviewRenderer = {
  pipeline: "sticker-renderer",
  families: ["sticker-pack", "children-cartoon"],
  engines: ["sticker-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent, paper } = ctx.palette;
    const high = ctx.intensity >= 5;
    const stickers = Array.from({ length: high ? 9 : 4 }, (_, i) => {
      const x = 90 + mod(ctx.seed, i * 31, ctx.width - 220);
      const y = 100 + mod(ctx.seed, i * 43, ctx.height - 360);
      return `<g transform="rotate(${jitter(ctx.seed, i, 22)} ${x} ${y})"><path d="M${x - 70} ${y - 80} C${x - 126} ${y - 10} ${x - 80} ${y + 92} ${x + 8} ${y + 96} C${x + 118} ${y + 70} ${x + 102} ${y - 68} ${x + 28} ${y - 102} C${x - 18} ${y - 128} ${x - 48} ${y - 112} ${x - 70} ${y - 80}Z" fill="#fff" stroke="#fff" stroke-width="24"/><path d="M${x - 70} ${y - 80} C${x - 126} ${y - 10} ${x - 80} ${y + 92} ${x + 8} ${y + 96} C${x + 118} ${y + 70} ${x + 102} ${y - 68} ${x + 28} ${y - 102} C${x - 18} ${y - 128} ${x - 48} ${y - 112} ${x - 70} ${y - 80}Z" fill="${i % 2 ? primary : secondary}" stroke="${ink}" stroke-width="7"/><circle cx="${x - 28}" cy="${y - 12}" r="${high ? 20 : 12}" fill="${ink}"/><circle cx="${x + 30}" cy="${y - 18}" r="${high ? 20 : 12}" fill="${ink}"/><path d="M${x - 30} ${y + 32} q38 ${high ? 42 : 15} 86 -4" stroke="${ink}" stroke-width="8" fill="none"/></g>`;
    }).join("");
    const sig = signature(ctx, "sticker-renderer", high ? "incident-sticker-sheet" : "diecut-sticker-cluster", `${ctx.rarity}-sticker-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="${paper}"/><g opacity="0.34" filter="url(#roughPaper)"><rect width="${ctx.width}" height="${ctx.height}" fill="#000"/></g>${stickers}${labelLayer(ctx, ink, secondary)}`, sig), signature: sig };
  }
};

export const clayRenderer: PreviewRenderer = {
  pipeline: "clay-renderer",
  families: ["clay-toy"],
  engines: ["clay-render-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent, paper } = ctx.palette;
    const high = ctx.intensity >= 5;
    const cx = high ? ctx.width * 0.34 : ctx.width * 0.5;
    const cy = high ? ctx.height * 0.52 : ctx.height * 0.46;
    const toys = high ? `<g opacity="0.72">${Array.from({ length: 7 }, (_, i) => `<ellipse cx="${120 + i * 112}" cy="${ctx.height * 0.76 + (i % 2) * 40}" rx="58" ry="36" fill="${i % 2 ? primary : secondary}"/>`).join("")}</g>` : "";
    const subject = `<g filter="url(#softShadow)"><ellipse cx="${ctx.width * 0.5}" cy="${ctx.height * 0.78}" rx="${ctx.width * (high ? 0.42 : 0.3)}" ry="94" fill="${secondary}" opacity="0.24"/><ellipse cx="${cx}" cy="${cy + 170}" rx="${high ? 160 : 120}" ry="${high ? 130 : 100}" fill="${secondary}"/><ellipse cx="${cx}" cy="${cy}" rx="${high ? 136 : 104}" ry="${high ? 118 : 86}" fill="${primary}"/><ellipse cx="${cx - 46}" cy="${cy - 18}" rx="20" ry="${high ? 26 : 15}" fill="${ink}"/><ellipse cx="${cx + 58}" cy="${cy - 24}" rx="${high ? 30 : 20}" ry="16" fill="${ink}"/><path d="M${cx - 34} ${cy + 70} q48 ${high ? 46 : 18} 104 0" stroke="${ink}" stroke-width="10" fill="none" stroke-linecap="round"/></g>`;
    const sig = signature(ctx, "clay-renderer", high ? "toy-diorama-incident" : "tabletop-toy-scene", `${ctx.rarity}-clay-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="${paper}"/><rect y="${ctx.height * 0.58}" width="${ctx.width}" height="${ctx.height * 0.42}" fill="${accent}" opacity="0.32"/>${toys}${subject}${labelLayer(ctx, ink, secondary)}`, sig), signature: sig };
  }
};

export const surrealRenderer: PreviewRenderer = {
  pipeline: "surreal-renderer",
  families: ["surreal-collage"],
  engines: ["surreal-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent, paper } = ctx.palette;
    const high = ctx.intensity >= 5;
    const cutouts = Array.from({ length: high ? 16 : 8 }, (_, i) => {
      const x = mod(ctx.seed, i * 53, ctx.width);
      const y = mod(ctx.seed, i * 37, ctx.height);
      return `<rect x="${x}" y="${y}" width="${74 + i * 7}" height="${90 + (i % 4) * 32}" fill="${i % 3 === 0 ? primary : i % 3 === 1 ? secondary : accent}" opacity="${high ? 0.72 : 0.48}" transform="rotate(${jitter(ctx.seed, i, 32)} ${x} ${y})"/>`;
    }).join("");
    const portal = high ? `<circle cx="${ctx.width * 0.72}" cy="${ctx.height * 0.34}" r="${ctx.rarity === "Mythic" ? 240 : 160}" fill="${paper}" opacity="0.26"/><path d="M${ctx.width * 0.1} ${ctx.height * 0.7} C${ctx.width * 0.36} ${ctx.height * 0.36} ${ctx.width * 0.64} ${ctx.height * 0.92} ${ctx.width} ${ctx.height * 0.45}" stroke="${primary}" stroke-width="18" fill="none"/>` : "";
    const face = `<g filter="url(#softShadow)"><path d="M${ctx.width * 0.28} ${ctx.height * 0.32} C${ctx.width * 0.48} ${ctx.height * 0.14} ${ctx.width * 0.66} ${ctx.height * 0.38} ${ctx.width * 0.52} ${ctx.height * 0.62} C${ctx.width * 0.32} ${ctx.height * 0.78} ${ctx.width * 0.14} ${ctx.height * 0.5} ${ctx.width * 0.28} ${ctx.height * 0.32}Z" fill="${accent}" opacity="0.78"/><circle cx="${ctx.width * 0.36}" cy="${ctx.height * 0.46}" r="${high ? 48 : 30}" fill="${ink}"/><circle cx="${ctx.width * 0.55}" cy="${ctx.height * 0.38}" r="${high ? 34 : 22}" fill="${ink}"/><path d="M${ctx.width * 0.42} ${ctx.height * 0.58} l${high ? 118 : 86} -18" stroke="${ink}" stroke-width="10"/></g>`;
    const sig = signature(ctx, "surreal-renderer", high ? "dream-tableau-world-swap" : "cutout-collage-scene", `${ctx.rarity}-surreal-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="${ink}"/><path d="M0 ${ctx.height * 0.2} C${ctx.width * 0.34} 0 ${ctx.width * 0.46} ${ctx.height * 0.52} ${ctx.width} ${ctx.height * 0.16} V${ctx.height} H0Z" fill="${secondary}" opacity="0.54"/>${cutouts}${portal}${face}${labelLayer(ctx)}`, sig), signature: sig };
  }
};

export const lowPolyRenderer: PreviewRenderer = {
  pipeline: "low-poly-renderer",
  families: ["low-poly"],
  engines: ["low-poly-engine"],
  render(ctx) {
    const { primary, secondary, ink, accent } = ctx.palette;
    const high = ctx.intensity >= 5;
    const terrain = Array.from({ length: high ? 24 : 14 }, (_, i) => {
      const x = mod(ctx.seed, i * 73, ctx.width);
      const y = mod(ctx.seed, i * 41, ctx.height);
      return `<path d="M${x} ${y} l${80 + i * 3} ${20 + (i % 4) * 24} l-${40 + i * 2} ${70 + (i % 3) * 20} z" fill="${i % 3 === 0 ? primary : i % 3 === 1 ? secondary : accent}" opacity="${0.28 + (i % 4) * 0.08}"/>`;
    }).join("");
    const cx = high ? ctx.width * 0.62 : ctx.width * 0.5;
    const cy = high ? ctx.height * 0.46 : ctx.height * 0.48;
    const s = high ? 1.1 : 0.86;
    const subject = `<g stroke="${ink}" stroke-width="5"><path d="M${cx} ${cy - 190 * s} L${cx + 110 * s} ${cy - 80 * s} L${cx + 70 * s} ${cy + 50 * s} L${cx - 88 * s} ${cy + 42 * s} L${cx - 120 * s} ${cy - 90 * s}Z" fill="${primary}"/><path d="M${cx - 70 * s} ${cy + 42 * s} L${cx + 80 * s} ${cy + 50 * s} L${cx + 130 * s} ${cy + 260 * s} L${cx - 140 * s} ${cy + 250 * s}Z" fill="${secondary}"/><path d="M${cx - 54 * s} ${cy - 78 * s} L${cx - 12 * s} ${cy - 60 * s} L${cx - 44 * s} ${cy - 44 * s}Z" fill="${accent}"/><path d="M${cx + 34 * s} ${cy - 82 * s} L${cx + 82 * s} ${cy - 64 * s} L${cx + 40 * s} ${cy - 38 * s}Z" fill="${accent}"/></g>`;
    const sig = signature(ctx, "low-poly-renderer", high ? "faceted-world-reconfiguration" : "isometric-geometry-scene", `${ctx.rarity}-lowpoly-${sceneIntensity(ctx)}`);
    return { svg: wrapSvg(ctx, `<rect width="${ctx.width}" height="${ctx.height}" fill="${ink}"/>${terrain}${subject}${labelLayer(ctx)}`, sig), signature: sig };
  }
};

export const allStudioRenderers: PreviewRenderer[] = [
  comicRenderer,
  cinematicRenderer,
  portraitRenderer,
  terminalRenderer,
  posterRenderer,
  pixelRenderer,
  arcadeRenderer,
  stickerRenderer,
  clayRenderer,
  surrealRenderer,
  lowPolyRenderer
];
