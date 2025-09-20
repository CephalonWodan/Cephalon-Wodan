package main

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

var (
	// Regex d’auto-discovery des chunks depuis la homepage
	reChunk = regexp.MustCompile(`/_next/static/chunks/db/(items|mods|modsets|abilities|abilitystats|modularparts)\.[a-f0-9]+\.js`)
	// Recherche JSON.parse('...') ou JSON.parse("...")
	reJSONParse = regexp.MustCompile(`JSON\.parse\(\s*(['"])(?P<blob>.*?)(\1)\s*\)`)
	// Fallback JSON brut {…} ou […]
	reJSONBlob = regexp.MustCompile(`(?s)(\{(?:[^{}]|\{[^{}]*\})*\}|\[(?:[^\[\]]|\[[^\[\]]*\])*\])`)
)

func main() {
	var (
		outDir       = flag.String("out", "data/overframe", "Répertoire de sortie pour les JSON")
		modeAuto     = flag.Bool("auto", true, "Auto-découvrir les URLs des chunks depuis la homepage d’Overframe")
		timeout      = flag.Duration("timeout", 20*time.Second, "Timeout HTTP")
		retries      = flag.Int("retries", 3, "Nombre de retries HTTP")
		sleepBetween = flag.Duration("sleep", 500*time.Millisecond, "Pause entre requêtes")
	)
	flag.Parse()

	// URLs fixes (si tu veux forcer sans autodiscovery)
	fixed := map[string]string{
		"modsets":      "https://static.overframe.gg/_next/static/chunks/db/modsets.ab82d329faa2eb1f.js",
		"mods":         "https://static.overframe.gg/_next/static/chunks/db/mods.c6fa01b90d917bee.js",
		"abilities":    "https://static.overframe.gg/_next/static/chunks/db/abilities.69c61fb1bb37d853.js",
		"modularparts": "https://static.overframe.gg/_next/static/chunks/db/modularparts.e12a05551240fd8c.js",
		"items":        "https://static.overframe.gg/_next/static/chunks/db/items.df4ed33a876ec619.js",
		"abilitystats": "https://static.overframe.gg/_next/static/chunks/db/abilitystats.1380563b4cdc91d9.js",
	}

	// 1) déterminer les URLs
	var urls map[string]string
	var err error
	if *modeAuto {
		urls, err = autoDiscover(*timeout, *retries)
		if err != nil {
			fmt.Fprintf(os.Stderr, "auto-discovery KO (%v) — fallback sur URLs fixes.\n", err)
			urls = fixed
		}
	} else {
		urls = fixed
	}
	// tri pour logs propres
	kinds := make([]string, 0, len(urls))
	for k := range urls {
		kinds = append(kinds, k)
	}
	sort.Strings(kinds)

	// 2) créer l’outdir
	if err := os.MkdirAll(*outDir, 0o755); err != nil {
		fatal(err)
	}

	// 3) télécharger + extraire JSON
	client := &http.Client{Timeout: *timeout}

	okCount := 0
	for _, kind := range kinds {
		u := urls[kind]
		time.Sleep(*sleepBetween)
		fmt.Printf(">> [%s] %s\n", kind, u)
		js, err := httpGet(client, u, *retries)
		if err != nil {
			fmt.Fprintf(os.Stderr, "   err: %v\n", err)
			continue
		}
		obj, err := extractJSON(js)
		if err != nil {
			fmt.Fprintf(os.Stderr, "   extraction KO: %v\n", err)
			continue
		}
		out := filepath.Join(*outDir, fmt.Sprintf("overframe-%s.json", kind))
		if err := writeJSON(out, obj); err != nil {
			fmt.Fprintf(os.Stderr, "   write KO: %v\n", err)
			continue
		}
		fmt.Printf("   OK → %s\n", out)
		okCount++
	}
	fmt.Printf("Terminé — %d/%d fichiers JSON écrits.\n", okCount, len(kinds))
}

func autoDiscover(timeout time.Duration, retries int) (map[string]string, error) {
	client := &http.Client{Timeout: timeout}
	html, err := httpGet(client, "https://overframe.gg/", retries)
	if err != nil {
		return nil, err
	}
	matches := reChunk.FindAllString(string(html), -1)
	if len(matches) == 0 {
		return nil, errors.New("aucun chunk db/*.js trouvé")
	}
	latest := map[string]string{}
	for _, m := range matches {
		kind := kindFromChunkPath(m)
		if kind == "" {
			continue
		}
		latest[kind] = "https://overframe.gg" + m
	}
	if len(latest) == 0 {
		return nil, errors.New("regex a matché mais aucun kind reconnu")
	}
	return latest, nil
}

func kindFromChunkPath(p string) string {
	for _, k := range []string{"items", "mods", "modsets", "abilities", "abilitystats", "modularparts"} {
		if strings.Contains(p, "/"+k+".") {
			return k
		}
	}
	return ""
}

func httpGet(client *http.Client, url string, retries int) ([]byte, error) {
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "CephalonWodan-OverframeChunks/1.0 (+github.com/CephalonWodan/Cephalon-Wodan)")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")

	var lastErr error
	for i := 0; i < retries; i++ {
		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(500+100*i) * time.Millisecond)
			continue
		}
		func() {
			defer resp.Body.Close()
			var r io.Reader = resp.Body
			switch resp.Header.Get("Content-Encoding") {
			case "gzip":
				gr, err := gzip.NewReader(resp.Body)
				if err == nil {
					defer gr.Close()
					r = gr
				}
			}
			if resp.StatusCode != 200 {
				lastErr = fmt.Errorf("http %d", resp.StatusCode)
				return
			}
			b, err := io.ReadAll(r)
			if err != nil {
				lastErr = err
				return
			}
			req.Close = true
			lastErr = nil
			js = b
		}()
		if lastErr == nil {
			return js, nil
		}
		time.Sleep(time.Duration(500+100*i) * time.Millisecond)
	}
	return nil, lastErr
}

func extractJSON(js []byte) (any, error) {
	txt := string(js)

	// 1) essayer JSON.parse(...)
	if m := reJSONParse.FindAllStringSubmatch(txt, -1); len(m) > 0 {
		best := ""
		for _, mm := range m {
			blob := mm[2] // groupe "blob"
			if len(blob) > len(best) {
				best = blob
			}
		}
		if obj, err := parsePossiblyEscaped(best); err == nil {
			return obj, nil
		}
	}

	// 2) fallback: trouver gros blob {…} ou […]
	blobs := reJSONBlob.FindAllString(txt, -1)
	// trier par taille décroissante
	sort.Slice(blobs, func(i, j int) bool { return len(blobs[i]) > len(blobs[j]) })
	for _, b := range blobs {
		if len(b) < 2048 {
			break
		}
		if obj, err := tryJSON(b); err == nil {
			return obj, nil
		}
	}
	return nil, errors.New("aucun JSON exploitable trouvé")
}

func parsePossiblyEscaped(s string) (any, error) {
	// Tentative A: le blob est déjà JSON valide
	if obj, err := tryJSON(s); err == nil {
		return obj, nil
	}
	// Tentative B: c’est une string JS avec échappements → on la déséchappe via json.Unmarshal sur "…"
	var unescaped string
	if err := json.Unmarshal([]byte(`"`+s+`"`), &unescaped); err == nil {
		if obj, err := tryJSON(unescaped); err == nil {
			return obj, nil
		}
		// Tentative C: corriger backslashes invalides (\X) → \\X
		fixed := fixInvalidBackslashes(unescaped)
		if obj, err := tryJSON(fixed); err == nil {
			return obj, nil
		}
	} else {
		// Dernière chance: fixer backslashes puis parser directement
		fixed := fixInvalidBackslashes(s)
		if obj, err := tryJSON(fixed); err == nil {
			return obj, nil
		}
	}
	return nil, errors.New("parsePossiblyEscaped: échec")
}

func tryJSON(s string) (any, error) {
	var v any
	dec := json.NewDecoder(bytes.NewReader([]byte(s)))
	dec.UseNumber()
	if err := dec.Decode(&v); err != nil {
		return nil, err
	}
	return v, nil
}

func fixInvalidBackslashes(s string) string {
	// Remplace \X où X ∉ [" \" / \ b f n r t u ] par \\X
	re := regexp.MustCompile(`\\(?!["\\/bfnrtu])`)
	return re.ReplaceAllString(s, `\\$0`)[1:] // le $0 est déjà avec "\"
}

func writeJSON(path string, v any) error {
	tmp := path + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(v); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
