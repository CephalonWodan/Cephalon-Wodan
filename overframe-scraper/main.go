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
	"sort"
	"strconv"
	"time"
)

const (
	defaultBaseURL      = "https://overframe.gg/items/arsenal/%d"
	defaultStartID      = 1
	defaultGrowthWindow = 300 // nombre d'IDs au-delà du max connu à explorer à chaque run
	defaultRateMs       = 1000 // 1 req/s
	defaultJitterMs     = 200  // +/- jitter pour éviter un rythme trop régulier
)

var (
	reNextData = regexp.MustCompile(`<script[^>]*id="__NEXT_DATA__"[^>]*>(?s:(.*?))</script>`)
	httpClient = &http.Client{Timeout: 15 * time.Second}
)

type Item struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
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

func getenvStr(key, def string) string {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	return v
}

func loadExisting() (map[int]string, int) {
	known := map[int]string{}
	maxID := 0

	f, err := os.Open("items.json")
	if err != nil {
		return known, 0
	}
	defer f.Close()

	var arr []Item
	if err := json.NewDecoder(f).Decode(&arr); err != nil {
		return known, 0
	}
	for _, it := range arr {
		known[it.ID] = it.Name
		if it.ID > maxID {
			maxID = it.ID
		}
	}
	return known, maxID
}

func fetchName(url string) (string, error) {
	resp, err := httpClient.Get(url)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	m := reNextData.FindSubmatch(body)
	if len(m) < 2 {
		return "", errors.New("no __NEXT_DATA__")
	}

	var next struct {
		Props struct {
			PageProps struct {
				Item struct {
					Name string `json:"name"`
				} `json:"item"`
			} `json:"pageProps"`
		} `json:"props"`
	}

	if err := json.NewDecoder(bytes.NewReader(m[1])).Decode(&next); err != nil {
		return "", err
	}
	return next.Props.PageProps.Item.Name, nil
}

func writeOutputs(items map[int]string) error {
	// CSV
	csvf, err := os.Create("items.csv")
	if err != nil {
		return err
	}
	defer csvf.Close()
	cw := csv.NewWriter(csvf)
	defer cw.Flush()
	_ = cw.Write([]string{"id", "name"})

	// JSON (écriture atomique)
	jsonTmp := filepath.Join(".", "items.tmp.json")
	jsonFinal := filepath.Join(".", "items.json")
	jf, err := os.Create(jsonTmp)
	if err != nil {
		return err
	}
	defer jf.Close()
	enc := json.NewEncoder(jf)
	enc.SetIndent("", "  ")

	// tri par ID
	ids := make([]int, 0, len(items))
	for id := range items {
		ids = append(ids, id)
	}
	sort.Ints(ids)

	arr := make([]Item, 0, len(ids))
	for _, id := range ids {
		name := items[id]
		_ = cw.Write([]string{strconv.Itoa(id), name})
		if name != "" {
			arr = append(arr, Item{ID: id, Name: name})
		}
	}

	if err := enc.Encode(arr); err != nil {
		return err
	}
	return os.Rename(jsonTmp, jsonFinal)
}

func main() {
	rand.Seed(time.Now().UnixNano())

	baseURL := getenvStr("BASE_URL", defaultBaseURL)
	startID := getenvInt("START_ID", defaultStartID)
	growth := getenvInt("GROWTH_WINDOW", defaultGrowthWindow)
	rateMs := getenvInt("RATE_MS", defaultRateMs)
	jitterMs := getenvInt("JITTER_MS", defaultJitterMs)

	known, maxKnown := loadExisting()
	targetMax := maxKnown + growth
	if targetMax < startID {
		targetMax = startID + growth
	}

	fmt.Printf("Scraper — startID=%d, maxKnown=%d, targetMax=%d, rate=%dms±%dms\n",
		startID, maxKnown, targetMax, rateMs, jitterMs)

	// Calcul des IDs à récupérer
	toFetch := make([]int, 0, targetMax-startID+1)
	for id := startID; id <= targetMax; id++ {
		if _, ok := known[id]; ok {
			continue
		}
		toFetch = append(toFetch, id)
	}
	fmt.Printf("IDs à récupérer: %d\n", len(toFetch))

	// Boucle de scraping
	for i, id := range toFetch {
		url := fmt.Sprintf(baseURL, id)
		name, err := fetchName(url)
		if err != nil {
			known[id] = "" // on marque vide pour éviter des retries infinis
		} else {
			known[id] = name
		}

		// log de progression doux
		if (i+1)%50 == 0 {
			fmt.Printf("Progress: %d/%d (dernier id=%d, name=%q)\n", i+1, len(toFetch), id, known[id])
		}

		// rate limit 1 req/s ± jitter
		sleep := time.Duration(rateMs+rand.Intn(2*jitterMs)-jitterMs) * time.Millisecond
		time.Sleep(sleep)
	}

	if err := writeOutputs(known); err != nil {
		fmt.Fprintf(os.Stderr, "Erreur écriture outputs: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("OK — items.csv et items.json mis à jour.")
}
