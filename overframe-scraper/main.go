package main

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"time"
)

const (
	defaultBaseURL  = "https://overframe.gg/items/arsenal/%d"
	defaultStartID  = 1
	defaultRateMs   = 1000 // 1 req/s
	defaultJitterMs = 200  // ± jitter pour lisser
)

var (
	reNextData = regexp.MustCompile(`<script[^>]*id="__NEXT_DATA__"[^>]*>(?s:(.*?))</script>`)
	httpClient = &http.Client{Timeout: 20 * time.Second}
)

type Item struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// -------- helpers env --------
func getenvStr(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}
func getenvInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return i
}
func getenvIntPtr(key string) *int {
	v := os.Getenv(key)
	if v == "" {
		return nil
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return nil
	}
	return &i
}

// -------- tiny JSON path (generic map) --------
func asMap(v any) map[string]any {
	if m, ok := v.(map[string]any); ok {
		return m
	}
	return nil
}
func s(m map[string]any, k string) string {
	if m == nil {
		return ""
	}
	if v, ok := m[k].(string); ok {
		return v
	}
	return ""
}

// -------- main scrape --------
func main() {
	rand.Seed(time.Now().UnixNano())

	baseURL := getenvStr("BASE_URL", defaultBaseURL)
	startID := getenvInt("START_ID", defaultStartID)
	endIDPtr := getenvIntPtr("END_ID")
	if endIDPtr == nil {
		fmt.Fprintln(os.Stderr, "END_ID est requis pour un one-shot brut. Ex: END_ID=7468")
		os.Exit(2)
	}
	endID := *endIDPtr
	if endID < startID {
		endID = startID
	}

	rateMs := getenvInt("RATE_MS", defaultRateMs)
	jitterMs := getenvInt("JITTER_MS", defaultJitterMs)

	// sorties
	if err := os.MkdirAll("raw", 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "mk raw: %v\n", err)
		os.Exit(1)
	}
	idxf, err := os.Create("index.csv")
	if err != nil {
		fmt.Fprintf(os.Stderr, "index.csv: %v\n", err)
		os.Exit(1)
	}
	defer idxf.Close()
	idxw := csv.NewWriter(idxf)
	defer idxw.Flush()
	_ = idxw.Write([]string{"id", "http", "status", "has_next_data", "name"})

	itemsCSV, err := os.Create("items.csv")
	if err != nil {
		fmt.Fprintf(os.Stderr, "items.csv: %v\n", err)
		os.Exit(1)
	}
	defer itemsCSV.Close()
	cw := csv.NewWriter(itemsCSV)
	defer cw.Flush()
	_ = cw.Write([]string{"id", "name"})

	items := make([]Item, 0, endID-startID+1)

	fmt.Printf("One-shot RAW dump: %d → %d (rate=%dms±%dms)\n", startID, endID, rateMs, jitterMs)

	for id := startID; id <= endID; id++ {
		url := fmt.Sprintf(baseURL, id)
		httpCode, hasNext, name := fetchAndDump(id, url)
		_ = idxw.Write([]string{
			strconv.Itoa(id),
			url,
			strconv.Itoa(httpCode),
			boolToStr(hasNext),
			name,
		})
		if name != "" {
			_ = cw.Write([]string{strconv.Itoa(id), name})
			items = append(items, Item{ID: id, Name: name})
		}

		if (id-startID+1)%50 == 0 {
			fmt.Printf("Progress: %d/%d (last id=%d, http=%d, hasNext=%v, name=%q)\n",
				id-startID+1, endID-startID+1, id, httpCode, hasNext, name)
		}

		// rate limit
		sleep := time.Duration(rateMs+rand.Intn(2*jitterMs)-jitterMs) * time.Millisecond
		time.Sleep(sleep)
	}

	// items.json (id+name) en plus de l’index CSV
	jf, err := os.Create("items.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "items.json: %v\n", err)
		os.Exit(1)
	}
	defer jf.Close()
	enc := json.NewEncoder(jf)
	enc.SetIndent("", "  ")
	if err := enc.Encode(items); err != nil {
		fmt.Fprintf(os.Stderr, "encode items.json: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("OK — RAW dump dans raw/*.json (si Next.js présent), index.csv, items.csv, items.json générés.")
}

func boolToStr(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

func fetchAndDump(id int, url string) (httpCode int, hasNext bool, name string) {
	resp, err := httpClient.Get(url)
	if err != nil {
		return 0, false, ""
	}
	defer resp.Body.Close()
	httpCode = resp.StatusCode

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 || len(body) == 0 {
		return httpCode, false, ""
	}

	m := reNextData.FindSubmatch(body)
	if len(m) < 2 {
		return httpCode, false, ""
	}
	hasNext = true

	// dump brut
	out := filepath.Join("raw", fmt.Sprintf("%d.json", id))
	_ = os.WriteFile(out, m[1], 0o644)

	// essai d’extraire le name pour l’index
	name = tryReadName(m[1])
	return httpCode, hasNext, name
}

func tryReadName(buf []byte) string {
	// Parse en map générique pour être robuste
	var root map[string]any
	if err := json.NewDecoder(bytes.NewReader(buf)).Decode(&root); err != nil {
		return ""
	}
	props := asMap(root["props"])
	pageProps := asMap(props["pageProps"])
	item := asMap(pageProps["item"])
	return s(item, "name")
}
