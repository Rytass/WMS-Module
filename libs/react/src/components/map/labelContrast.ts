import { useEffect, useMemo, useState } from 'react';
import type { FlowNode } from '@rytass/wms-map-react-components';

/**
 * The map package prints every range label in white. Over a pale floor plan,
 * through a fill at 20% alpha on a node at 60% opacity, that is close to
 * invisible. This picks dark or light per range from what is actually behind
 * the label: the background image's pixels there (or the bare canvas), with
 * the range's own translucent fill laid over them.
 */

export type LabelTone = 'dark' | 'light';

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** React Flow canvas colour the package paints when no image covers a spot. */
const CANVAS_BACKGROUND: Rgb = { r: 0xf5, g: 0xf5, b: 0xf5 };
/** `${color}33` — the package's range fill. */
const FILL_ALPHA = 0x33 / 0xff;
/** RECTANGLE_INACTIVE_OPACITY: ranges, labels included, render at 60% in view mode. */
const NODE_OPACITY = 0.6;
const DARK: Rgb = { r: 0, g: 0, b: 0 };
const LIGHT: Rgb = { r: 255, g: 255, b: 255 };
/** Downscale images to this long side before sampling; plenty for an average. */
const SAMPLE_SIZE = 256;

const mix = (under: Rgb, over: Rgb, alpha: number): Rgb => ({
  r: under.r * (1 - alpha) + over.r * alpha,
  g: under.g * (1 - alpha) + over.g * alpha,
  b: under.b * (1 - alpha) + over.b * alpha,
});

const channel = (value: number): number => {
  const c = value / 255;

  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = ({ r, g, b }: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);

  return (hi + 0.05) / (lo + 0.05);
};

export const parseHexColor = (hex: string): Rgb | null => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());

  if (!match) return null;

  const digits =
    match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];

  return {
    r: parseInt(digits.slice(0, 2), 16),
    g: parseInt(digits.slice(2, 4), 16),
    b: parseInt(digits.slice(4, 6), 16),
  };
};

/**
 * The tone that reads best on `backdrop` once the range fill is laid over it.
 * Both the fill and the label sit inside the node's opacity, so each candidate
 * is judged as it is actually composited, not as declared.
 */
export function pickLabelTone(
  backdrop: Rgb,
  rangeColor: Rgb | null,
): LabelTone {
  const behind = rangeColor
    ? mix(backdrop, rangeColor, FILL_ALPHA * NODE_OPACITY)
    : backdrop;
  const seen = (text: Rgb): number =>
    contrastRatio(mix(behind, text, NODE_OPACITY), behind);

  return seen(DARK) >= seen(LIGHT) ? 'dark' : 'light';
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface NodeData {
  readonly width?: number;
  readonly height?: number;
  readonly color?: string;
  readonly imageUrl?: string;
  readonly points?: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

const dataOf = (node: FlowNode): NodeData => node.data as NodeData;

const boxOf = (node: FlowNode): Box | null => {
  const data = dataOf(node);

  if (node.type === 'pathNode') {
    const points = data.points ?? [];

    if (points.length === 0) return null;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    return {
      x: node.position.x + Math.min(...xs),
      y: node.position.y + Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  if (data.width === undefined || data.height === undefined) return null;

  return { ...node.position, width: data.width, height: data.height };
};

/** The label sits in the middle; sample the middle third of the range. */
const labelArea = (box: Box): Box => ({
  x: box.x + box.width / 3,
  y: box.y + box.height / 3,
  width: Math.max(box.width / 3, 1),
  height: Math.max(box.height / 3, 1),
});

interface Sampled {
  readonly pixels: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

const imageCache = new Map<string, Promise<Sampled | null>>();

function sampleImage(url: string): Promise<Sampled | null> {
  const cached = imageCache.get(url);

  if (cached) return cached;

  const loading = new Promise<Sampled | null>((resolve) => {
    const image = new Image();

    image.crossOrigin = 'anonymous';
    image.onload = (): void => {
      try {
        const scale = Math.min(
          1,
          SAMPLE_SIZE / Math.max(image.naturalWidth, image.naturalHeight, 1),
        );
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
          resolve(null);

          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve({
          pixels: context.getImageData(0, 0, width, height).data,
          width,
          height,
        });
      } catch {
        // A cross-origin image without CORS taints the canvas; fall back.
        resolve(null);
      }
    };
    image.onerror = (): void => resolve(null);
    image.src = url;
  });

  imageCache.set(url, loading);

  return loading;
}

/** Average colour of `area` (map units) in an image drawn over `frame`. */
function averageOver(sampled: Sampled, frame: Box, area: Box): Rgb | null {
  const sx = sampled.width / frame.width;
  const sy = sampled.height / frame.height;
  const x0 = Math.max(0, Math.floor((area.x - frame.x) * sx));
  const y0 = Math.max(0, Math.floor((area.y - frame.y) * sy));
  const x1 = Math.min(
    sampled.width,
    Math.ceil((area.x + area.width - frame.x) * sx),
  );
  const y1 = Math.min(
    sampled.height,
    Math.ceil((area.y + area.height - frame.y) * sy),
  );

  if (x1 <= x0 || y1 <= y0) return null;

  const rows = Array.from({ length: y1 - y0 }, (_, i) => y0 + i);
  const columns = Array.from({ length: x1 - x0 }, (_, i) => x0 + i);
  const total = rows.reduce(
    (sum, y) =>
      columns.reduce((acc, x) => {
        const i = (y * sampled.width + x) * 4;
        const alpha = sampled.pixels[i + 3] / 255;
        // Transparent pixels show the canvas through them.
        const pixel = mix(
          CANVAS_BACKGROUND,
          {
            r: sampled.pixels[i],
            g: sampled.pixels[i + 1],
            b: sampled.pixels[i + 2],
          },
          alpha,
        );

        return {
          r: acc.r + pixel.r,
          g: acc.g + pixel.g,
          b: acc.b + pixel.b,
          n: acc.n + 1,
        };
      }, sum),
    { r: 0, g: 0, b: 0, n: 0 },
  );

  return { r: total.r / total.n, g: total.g / total.n, b: total.b / total.n };
}

const contains = (outer: Box, inner: Box): boolean =>
  inner.x < outer.x + outer.width &&
  inner.x + inner.width > outer.x &&
  inner.y < outer.y + outer.height &&
  inner.y + inner.height > outer.y;

/**
 * Label tone per range id. Ranges resolve against the canvas colour at once and
 * are refined as each background image loads, so labels never wait on images.
 */
export function useRangeLabelTones(
  nodes: readonly FlowNode[],
): ReadonlyMap<string, LabelTone> {
  const [samples, setSamples] = useState<ReadonlyMap<string, Sampled | null>>(
    new Map(),
  );

  const images = useMemo(
    () =>
      nodes
        .filter((node) => node.type === 'imageNode' && dataOf(node).imageUrl)
        .map((node) => ({
          url: dataOf(node).imageUrl as string,
          frame: boxOf(node),
          zIndex: node.zIndex ?? 0,
        }))
        .filter(
          (image): image is { url: string; frame: Box; zIndex: number } =>
            image.frame !== null,
        )
        .sort((a, b) => b.zIndex - a.zIndex),
    [nodes],
  );

  useEffect(() => {
    let cancelled = false;

    images.forEach(({ url }) => {
      sampleImage(url).then((sampled) => {
        if (!cancelled)
          setSamples((prev) =>
            prev.has(url) ? prev : new Map([...prev, [url, sampled]]),
          );
      });
    });

    return (): void => {
      cancelled = true;
    };
  }, [images]);

  return useMemo(
    () =>
      new Map(
        nodes
          .filter(
            (node) => node.type === 'rectangleNode' || node.type === 'pathNode',
          )
          .map((node): [string, LabelTone] | null => {
            const box = boxOf(node);

            if (!box) return null;

            const area = labelArea(box);
            const backdrop =
              images
                .filter((image) => contains(image.frame, area))
                .map((image) => {
                  const sampled = samples.get(image.url);

                  return sampled
                    ? averageOver(sampled, image.frame, area)
                    : null;
                })
                .find((rgb): rgb is Rgb => rgb !== null) ?? CANVAS_BACKGROUND;

            return [
              node.id,
              pickLabelTone(backdrop, parseHexColor(dataOf(node).color ?? '')),
            ];
          })
          .filter((entry): entry is [string, LabelTone] => entry !== null),
      ),
    [images, nodes, samples],
  );
}
