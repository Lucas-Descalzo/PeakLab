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
import sys
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


# ── Enrich with HR zones (requires garth) ────────────────────────────────────

def enrich_activities_with_zones():
    """
    Fetch HR zones for recently imported activities.
    Runs at the end of import to enrich data.
    Only fetches for the last 30 activities to avoid rate limiting.
    """
    print("\n📊 Enriqueciendo actividades con datos de zonas HR...")
    try:
        import garth
    except ImportError:
        print("  ✗ garth no instalado — pip install garth")
        return

    try:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent / ".env")
    except ImportError:
        pass

    garmin_user = os.environ.get("GARMIN_USER", "")
    garmin_pass = os.environ.get("GARMIN_PASS", "")
    token_dir = Path.home() / ".garmin_tokens"

    # Login / resume session
    try:
        token_dir.mkdir(exist_ok=True)
        try:
            garth.resume(str(token_dir))
            garth.connectapi("/userprofile-service/userprofile/personal-information")
            print("  ✓ Token reutilizado")
        except Exception:
            if not garmin_user or not garmin_pass:
                print("  ✗ GARMIN_USER / GARMIN_PASS requeridos")
                return
            print(f"  Autenticando como {garmin_user}...")
            garth.login(garmin_user, garmin_pass)
            garth.save(str(token_dir))
            print("  ✓ Login exitoso")
    except Exception as e:
        print(f"  ✗ Error de login: {e}")
        return

    # Read the same activities file to get IDs of the last 30 runs
    path = DATA_ROOT / "DI_CONNECT/DI-Connect-Fitness/lucasdesc04@gmail.com_0_summarizedActivities.json"
    if not path.exists():
        print("  ✗ No se encontró el archivo de actividades")
        return

    with open(path, encoding="utf-8") as f:
        raw = json.load(f)

    activities = raw[0].get("summarizedActivitiesExport", [])
    running_types = {"running", "trail_running", "indoor_running", "treadmill_running"}
    runs = [a for a in activities if a.get("activityType", "").lower() in running_types]
    runs.sort(key=lambda x: x.get("startTimeLocal", 0), reverse=True)
    recent = runs[:30]

    enriched = 0
    for act in recent:
        activity_id = act.get("activityId")
        if not activity_id:
            continue
        try:
            data = garth.connectapi(f"/activity-service/activity/{activity_id}/hrTimeInZones")
            time.sleep(1)
            if not data:
                continue
            zone_list = (
                data.get("userHrTimeInZones")
                or data.get("allMetrics", {}).get("metricsMap", {}).get("HEART_RATE_ZONES", [])
            )
            zones = {}
            for z in (zone_list or []):
                if isinstance(z, dict):
                    zone_num = z.get("zoneNumber", z.get("secsInZone"))
                    secs = z.get("secsInZone", 0)
                    if isinstance(zone_num, int) and 1 <= zone_num <= 5:
                        zones[f"zone_{zone_num}_s"] = int(secs)
            if not zones:
                continue

            ts = act.get("startTimeLocal", 0) / 1000
            date_str = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
            dist_cm = act.get("distance", 0)
            dist_m = dist_cm / 100
            dur_s = int(act.get("duration", 0) / 1000)
            avg_hr = int(act.get("avgHr", 0) or 0)
            pace = int(dur_s / (dist_m / 1000)) if dist_m > 0 else 0

            payload = {
                "garmin_id": activity_id,
                "date": date_str,
                "name": act.get("activityName") or act.get("name") or "Run",
                "type": "running",
                "distance_m": dist_m,
                "duration_s": dur_s,
                "avg_hr": avg_hr,
                "max_hr": int(act.get("maxHR", 0) or 0),
                "avg_pace_s_per_km": pace,
                "training_effect": act.get("aerobicTrainingEffect"),
                "aerobic_te": act.get("aerobicTrainingEffect"),
                "anaerobic_te": act.get("anaerobicTrainingEffect"),
                **zones,
            }

            if post("/api/sync/activity", payload):
                enriched += 1
                zones_info = " ".join(f"Z{i}:{zones.get(f'zone_{i}_s', 0)//60}m" for i in range(1, 6))
                print(f"    ✓ {date_str} — {zones_info}")
            time.sleep(0.5)
        except Exception as e:
            print(f"    ✗ {activity_id}: {e}")
            continue

    print(f"  {enriched}/{len(recent)} actividades enriquecidas con zonas HR")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print(f"PeakLab — Importación histórica Garmin")
    print(f"App: {APP_URL}")
    print("=" * 55)

    enrich_only = "--enrich" in sys.argv

    if enrich_only:
        enrich_activities_with_zones()
        print("\n✅ Enriquecimiento completo.")
        sys.exit(0)

    if not DATA_ROOT.exists():
        print(f"\n✗ No se encontró la carpeta de datos: {DATA_ROOT}")
        print("  Asegurate de haber extraído el zip en esa ruta.")
        exit(1)

    import_activities()
    import_wellness()

    print("\n✅ Importación completa.")
    print("   Abrí la app y verificá que aparezcan las actividades y el HRV.")
