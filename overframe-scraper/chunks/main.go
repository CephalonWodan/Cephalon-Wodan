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
	// détecte les chunks DB depuis la homepage (hash variable)
	reChunk = regexp.MustCompile(`/_next/static/chunks/db/(items|mods|modsets|abilities|abilitystats|modularparts)\.[a-f0-9]+\.js`)

	// JSON.parse('…') et JSON.parse("…") — SANS back-references (Go/RE2 ne les supporte pas)
	reJSONParseS = regexp.MustCompile(`JSON\.parse\(\s*'(.*?)'\s*\)`)
	reJSONParseD = regexp.MustCompile(`JSON\.parse\(\s*"(.*?)"\s*\)`)

	// fallback: gros blobs {…} / […]
	reJSONBlob = regexp.MustCompile(`(?s)(\{(?:[^{}]|\{[^{}]*\})*\}|\[(?:[^\[\]]|\[[^\[\]]*\])*\])`)
)

func main() {
	var (
		outDir       = flag.String("out", "data/overframe", "Répertoire de sortie pour les JSON")
		modeAuto     = flag.Bool("auto", true, "Auto-découvrir les URLs depuis la homepage d’Overframe")
		timeout      = flag.Duration("timeout", 25*time.Second, "Timeout HTTP")
		retries      = flag.Int("retries", 3, "Retries HTTP")
		sleepBetween = flag.Duration("sleep", 600*time.Millisecond, "Pause entre requêtes")
	)
	flag.Parse()

	// URLs fixes (fallback si autodiscovery échoue)
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

	// tri pour logs stables
	kinds := make([]string, 0, len(urls))
	for k := range urls {
		kinds = append(kinds, k)
	}
	sort.Strings(kinds)

	// 2) préparer sortie
	if err := os.MkdirAll(*outDir, 0o755); err != nil {
		die(err)
	}

	// 3) fetch + extract
	client := &http.Client{Timeout: *timeout}
	ok := 0
	for _, kind := range kinds {
		u := urls[kind]
		time.Sleep(*sleepBetween)
		fmt.Printf(">> [%s] %s\n", kind, u)

		body, err := httpGet(client, u, *retries)
		if err != nil {
			fmt.Fprintf(os.Stderr, "   http KO: %v\n", err)
			continue
		}

		obj, err := extractJSON(body)
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
		ok++
	}
	fmt.Printf("Terminé — %d/%d fichiers JSON écrits.\n", ok, len(kinds))
}

func die(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
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
		if kind != "" {
			latest[kind] = "https://overframe.gg" + m
		}
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
	var lastErr error
	for i := 0; i < retries; i++ {
		req, _ := http.NewRequest("GET", url, nil)
		req.Header.Set("User-Agent", "CephalonWodan-OverframeChunks/1.0 (+github.com/CephalonWodan/Cephalon-Wodan)")
		req.Header.Set("Accept-Encoding", "gzip, deflate, br")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			time.Sleep(time.Duration(500+100*i) * time.Millisecond)
			continue
		}

		var r io.Reader = resp.Body
		if resp.Header.Get("Content-Encoding") == "gzip" {
			gr, gzErr := gzip.NewReader(resp.Body)
			if gzErr == nil {
				defer gr.Close()
				r = gr
			}
		}
		if resp.StatusCode != 200 {
			resp.Body.Close()
			lastErr = fmt.Errorf("http %d", resp.StatusCode)
			time.Sleep(time.Duration(500+100*i) * time.Millisecond)
			continue
		}
		body, rdErr := io.ReadAll(r)
		resp.Body.Close()
		if rdErr != nil {
			lastErr = rdErr
			time.Sleep(time.Duration(500+100*i) * time.Millisecond)
			continue
		}
		return body, nil
	}
	return nil, lastErr
}

func extractJSON(js []byte) (any, error) {
	txt := string(js)

	// A) JSON.parse('…') et JSON.parse("…")
	var candidates [][]string
	candidates = append(candidates, reJSONParseS.FindAllStringSubmatch(txt, -1)...)
	candidates = append(candidates, reJSONParseD.FindAllStringSubmatch(txt, -1)...)
	if len(candidates) > 0 {
		best := ""
		for _, mm := range candidates {
			if len(mm) >= 2 {
				blob := mm[1] // groupe capturé
				if len(blob) > len(best) {
					best = blob
				}
			}
		}
		if best != "" {
			if obj, err := parsePossiblyEscaped(best); err == nil {
				return obj, nil
			}
		}
	}

	// B) Fallback gros blobs {…} / […]
	blobs := reJSONBlob.FindAllString(txt, -1)
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
	// 1) direct
	if obj, err := tryJSON(s); err == nil {
		return obj, nil
	}
	// 2) déséchapper via une string JSON
	var unescaped string
	if err := json.Unmarshal([]byte(`"`+s+`"`), &unescaped); err == nil {
		if obj, err := tryJSON(unescaped); err == nil {
			return obj, nil
		}
		// 3) corriger les backslashes invalides
		fixed := fixInvalidBackslashes(unescaped)
		if obj, err := tryJSON(fixed); err == nil {
			return obj, nil
		}
	} else {
		// 4) dernier essai: fixer + parser direct
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

// remplace \X où X n’est pas un escape JSON valide par \\X
func fixInvalidBackslashes(s string) string {
	re := regexp.MustCompile(`\\([^"\\/bfnrtu])`)
	return re.ReplaceAllString(s, `\\$1`)
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
