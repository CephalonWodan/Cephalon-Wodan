// Design reminder: Tenno Codex HUD keeps the object silhouette visible while
// trying API/Wiki sources; a generic glyph is only the final safe fallback.
// ============================================================
import { useEffect, useMemo, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { AssetLike, AssetType, fetchWikiImageUrl, getAssetFallback, resolveAssetCandidates } from "@/lib/asset-resolver";

// In-memory cache for successfully loaded image URLs to ensure instant display
const successfulImageCache = new Set<string>();
const failedImageCache = new Set<string>();

type AssetImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  item: AssetLike | string;
  type: AssetType;
  alt?: string;
  fallback?: ReactNode;
  preferredSource?: string;
};

export default function AssetImage({ item, type, alt, fallback, preferredSource, onError, ...imageProps }: AssetImageProps) {
  const candidates = useMemo(() => {
    const resolved = resolveAssetCandidates(item, type);
    return preferredSource ? [preferredSource, ...resolved.filter(source => source !== preferredSource)] : resolved;
  }, [item, type, preferredSource]);

  // If any candidate is already in the successful cache, put it first
  const optimizedCandidates = useMemo(() => {
    const cached = candidates.find(src => successfulImageCache.has(src));
    if (cached) {
      return [cached, ...candidates.filter(src => src !== cached)];
    }
    return candidates;
  }, [candidates]);

  const [sources, setSources] = useState(optimizedCandidates);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [wikiRequested, setWikiRequested] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSources(optimizedCandidates);
    setSourceIndex(0);
    setWikiRequested(false);
    setFailed(false);
  }, [optimizedCandidates]);

  const itemName = typeof item === "string" ? item : item.name || "";
  const currentSource = sources[sourceIndex];

  // If current source is known to have failed previously, skip immediately
  useEffect(() => {
    if (currentSource && failedImageCache.has(currentSource) && sourceIndex < sources.length - 1) {
      setSourceIndex(i => i + 1);
    }
  }, [currentSource, sources, sourceIndex]);

  const handleLoad = () => {
    if (currentSource) {
      successfulImageCache.add(currentSource);
    }
  };

  const handleError: ImgHTMLAttributes<HTMLImageElement>["onError"] = event => {
    onError?.(event);
    if (currentSource) {
      failedImageCache.add(currentSource);
    }

    if (sourceIndex < sources.length - 1) {
      setSourceIndex(index => index + 1);
      return;
    }

    if (!wikiRequested && itemName.trim()) {
      setWikiRequested(true);
      void fetchWikiImageUrl(itemName, type).then(wikiImage => {
        if (wikiImage) {
          successfulImageCache.add(wikiImage);
          setSources(previous => previous.includes(wikiImage) ? previous : [...previous, wikiImage]);
          setSourceIndex(previous => previous < sources.length ? sources.length : previous);
        } else {
          setFailed(true);
        }
      });
      return;
    }

    setFailed(true);
  };

  if (failed || !currentSource || failedImageCache.has(currentSource)) {
    return fallback ? <>{fallback}</> : <img {...imageProps} src={getAssetFallback(type)} alt={alt || itemName} aria-label={alt || itemName} />;
  }

  return (
    <img
      {...imageProps}
      src={currentSource}
      alt={alt || itemName}
      aria-label={alt || itemName}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
