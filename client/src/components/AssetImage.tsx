// WARFRAME SET BUILDER — Resilient catalog imagery
// Design reminder: Tenno Codex HUD keeps the object silhouette visible while
// trying API/Wiki sources; a generic glyph is only the final safe fallback.
// ============================================================
import { useEffect, useMemo, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { AssetLike, AssetType, fetchWikiImageUrl, getAssetFallback, resolveAssetCandidates } from "@/lib/asset-resolver";

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
  const [sources, setSources] = useState(candidates);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [wikiRequested, setWikiRequested] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSources(candidates);
    setSourceIndex(0);
    setWikiRequested(false);
    setFailed(false);
  }, [candidates]);

  const itemName = typeof item === "string" ? item : item.name || "";
  const currentSource = sources[sourceIndex];

  const handleError: ImgHTMLAttributes<HTMLImageElement>["onError"] = event => {
    onError?.(event);
    if (sourceIndex < sources.length - 1) {
      setSourceIndex(index => index + 1);
      return;
    }

    if (!wikiRequested && itemName.trim()) {
      setWikiRequested(true);
      void fetchWikiImageUrl(itemName, type).then(wikiImage => {
        if (wikiImage) {
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

  if (failed || !currentSource) {
    return fallback ? <>{fallback}</> : <img {...imageProps} src={getAssetFallback(type)} alt={alt || itemName} aria-label={alt || itemName} />;
  }

  return <img {...imageProps} src={currentSource} alt={alt || itemName} onError={handleError} />;
}
