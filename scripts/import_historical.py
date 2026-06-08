"""
Importación histórica desde el export de Garmin Connect.
Lee los archivos ya descargados y los sube a la app (Upstash Redis).

Uso:
  python scripts/import_historical.py

Requiere:
  - La app corriendo (local o Vercel)
  - APP_URL y SYNC_SECRET en scripts/.env o variables de entorno
  - Los archivos extraídos en C:/Users/lucas/Downloads/garmin_data/
"""
import os
import json
import time
import requests
from datetime import datetime, timezone
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

APP_URL   = os.environ.get("APP_URL",    "http://localhost:3000").rstrip("/")
SECRET    = os.environ.get("SYNC_SECRET", "peaklab_sync_secret_2026")
DATA_ROOT = Path(r"C:\Users\lucas\Downloads\garmin_data")

HEADERS = {"x-sync-secret": SECRET, "Content-Type": "application/json"}


def post(endpoint: str, data: dict) -> bool:
    try:
        r = requests.post(f"{APP_URL}{endpoint}", json=data, headers=HEADERS, timeout=15)
        return r.status_code == 200
    except Exception as e:
        print(f"    ✗ {endpoint}: {e}")
        return False


# ── Actividades ───────────────────────────────────────────────────────────────

def import_activities():
    path = DATA_ROOT / "DI_CONNECT/DI-Connect-Fitness/lucasdesc04@gmail.com_0_summarizedActivities.json"
    if not path.exists():
        print("✗ No se encontró el archivo de actividades."); return

    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    activities = raw[0].get("summarizedActivitiesExport", [])
    running_types = {"running", "trail_running", "indoor_running", "treadmill_running"}

    runs = [a for a in activities if a.get("activityType", "").lower() in running_types]
    runs.sort(key=lambda x: x.get("startTimeLocal", 0))

    print(f"\n🏃 Importando {len(runs)} actividades de running...")
    ok = err = 0
    for act in runs:
        ts = act.get("startTimeLocal", 0) / 1000
        date_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
        dist_cm  = act.get("distance", 0)
        dist_m   = dist_cm / 100            # cm → m
        dur_ms   = act.get("duration", 0)
        dur_s    = int(dur_ms / 1000)
        avg_hr   = int(act.get("avgHr", 0) or 0)
        pace     = int(dur_s / (dist_m / 1000)) if dist_m > 0 else 0

        payload = {
            "garmin_id":        act.get("activityId"),
            "date":             date_str,
            "name":             act.get("activityName") or act.get("name") or "Run",
            "type":             "running",
            "distance_m":       dist_m,
            "duration_s":       dur_s,
            "avg_hr":           avg_hr,
            "max_hr":           int(act.get("maxHR", 0) or 0),
            "avg_pace_s_per_km": pace,
            "training_effect":  act.get("aerobicTrainingEffect"),
        }

        if post("/api/sync/activity", payload):
            ok += 1
        else:
            err += 1

        time.sleep(0.1)   # pausa breve para no saturar la API

    print(f"   ✓ {ok} importadas  ✗ {err} errores")


# ── Wellness (HRV + sueño) ────────────────────────────────────────────────────

def import_wellness():
    wellness_dir = DATA_ROOT / "DI_CONNECT/DI-Connect-Wellness"

    # --- HRV desde healthStatusData ---
    hrv_by_date: dict[str, dict] = {}
    for hfile in sorted(wellness_dir.glob("*healthStatusData*.json")):
        with open(hfile, encoding="utf-8") as f:
            entries = json.load(f)
        if not isinstance(entries, list):
            continue
        for e in entries:
            date_str = e.get("calendarDate", "")
            if not date_str:
                continue
            for m in e.get("metrics", []):
                if m.get("type") == "HRV":
                    hrv_by_date[date_str] = {
                        "hrv":                   int(m.get("value", 0)),
                        "hrv_status":            m.get("status", ""),
                        "hrv_baseline_lower":    int(m.get("baselineLowerLimit", 55)),
                        "hrv_baseline_upper":    int(m.get("baselineUpperLimit", 99)),
                    }

    # --- Sueño desde sleepData ---
    sleep_by_date: dict[str, dict] = {}
    for sfile in sorted(wellness_dir.glob("*sleepData*.json")):
        with open(sfile, encoding="utf-8") as f:
            entries = json.load(f)
        if not isinstance(entries, list):
            continue
        for s in entries:
            date_str = s.get("calendarDate", "")
            if not date_str:
                continue
            deep  = s.get("deepSleepSeconds", 0) or 0
            light = s.get("lightSleepSeconds", 0) or 0
            rem   = s.get("remSleepSeconds",   0) or 0
            total = deep + light + rem
            scores = s.get("sleepScores", {}) or {}
            score  = scores.get("overallScore") or (
                scores.get("overall", {}).get("value")
                if isinstance(scores.get("overall"), dict) else None
            )
            spo2   = s.get("spo2SleepSummary", {}) or {}
            rhr    = int(spo2.get("averageHR", 0) or 0)
            sleep_by_date[date_str] = {
                "sleep_total_s": total,
                "sleep_deep_s":  deep,
                "sleep_rem_s":   rem,
                "sleep_score":   score,
                "resting_hr":    rhr if rhr > 0 else None,
            }

    # Merge por fecha
    all_dates = sorted(set(list(hrv_by_date.keys()) + list(sleep_by_date.keys())))
    print(f"\n💤 Importando wellness de {len(all_dates)} días...")
    ok = err = 0
    for date_str in all_dates:
        payload = {"date": date_str}
        payload.update(hrv_by_date.get(date_str, {}))
        payload.update(sleep_by_date.get(date_str, {}))

        if post("/api/sync/wellness", payload):
            ok += 1
        else:
            err += 1
        time.sleep(0.05)

    print(f"   ✓ {ok} importados  ✗ {err} errores")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print(f"PeakLab — Importación histórica Garmin")
    print(f"App: {APP_URL}")
    print("=" * 55)

    if not DATA_ROOT.exists():
        print(f"\n✗ No se encontró la carpeta de datos: {DATA_ROOT}")
        print("  Asegurate de haber extraído el zip en esa ruta.")
        exit(1)

    import_activities()
    import_wellness()

    print("\n✅ Importación completa.")
    print("   Abrí la app y verificá que aparezcan las actividades y el HRV.")
