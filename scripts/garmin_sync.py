"""
Garmin Connect sync — HRV, sueño y actividades de running.

Funciona en dos modos:
  - Local (PC):        lee credenciales de scripts/.env
  - GitHub Actions:    lee credenciales de variables de entorno del runner

Uso:
  python scripts/garmin_sync.py         # últimos 2 días
  python scripts/garmin_sync.py 7       # últimos 7 días
  python scripts/garmin_sync.py 30      # carga histórico completo

Dependencias: pip install garth requests python-dotenv
"""
import os
import sys
import json
import requests
from datetime import date, timedelta
from pathlib import Path

# Cargar .env local si existe (para ejecución en PC)
try:
    from dotenv import load_dotenv
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
except ImportError:
    pass

try:
    import garth
except ImportError:
    print("ERROR: Instalá garth → pip install garth")
    sys.exit(1)

# Config desde env vars
GARMIN_USER = os.environ.get("GARMIN_USER", "")
GARMIN_PASS = os.environ.get("GARMIN_PASS", "")
APP_URL = os.environ.get("APP_URL", "http://localhost:3000").rstrip("/")
SYNC_SECRET = os.environ.get("SYNC_SECRET", "")
TOKEN_DIR = Path.home() / ".garmin_tokens"


def login():
    TOKEN_DIR.mkdir(exist_ok=True)
    try:
        garth.resume(str(TOKEN_DIR))
        # Verificar que el token funciona
        garth.connectapi("/userprofile-service/userprofile/personal-information")
        print("✓ Token válido reutilizado.")
    except Exception:
        if not GARMIN_USER or not GARMIN_PASS:
            print("ERROR: GARMIN_USER y GARMIN_PASS son requeridos.")
            sys.exit(1)
        print(f"Autenticando como {GARMIN_USER}...")
        garth.login(GARMIN_USER, GARMIN_PASS)
        garth.save(str(TOKEN_DIR))
        print("✓ Login exitoso.")


def post(endpoint: str, data: dict) -> bool:
    url = f"{APP_URL}{endpoint}"
    try:
        res = requests.post(
            url,
            json=data,
            headers={"x-sync-secret": SYNC_SECRET},
            timeout=15,
        )
        return res.status_code == 200
    except Exception as e:
        print(f"  ✗ Error enviando a {endpoint}: {e}")
        return False


def sync_wellness(day: date):
    day_str = day.isoformat()
    data = {"date": day_str}

    # HRV
    try:
        hrv_data = garth.connectapi(f"/hrv-service/hrv/{day_str}")
        if hrv_data and "hrvSummary" in hrv_data:
            s = hrv_data["hrvSummary"]
            data["hrv"] = s.get("lastNight")
            data["hrv_baseline_lower"] = s.get("baselineLowUpper")
            data["hrv_baseline_upper"] = s.get("baselineHighUpper")
            data["hrv_status"] = s.get("status")
    except Exception as e:
        print(f"  HRV error: {e}")

    # Sueño
    try:
        sleep_data = garth.connectapi(
            f"/wellness-service/wellness/dailySleepData/{day_str}"
        )
        if sleep_data:
            dto = sleep_data.get("dailySleepDTO") or sleep_data
            if isinstance(dto, dict):
                data["sleep_total_s"] = (
                    dto.get("sleepTimeSeconds")
                    or (
                        dto.get("deepSleepSeconds", 0)
                        + dto.get("lightSleepSeconds", 0)
                        + dto.get("remSleepSeconds", 0)
                    )
                )
                data["sleep_deep_s"] = dto.get("deepSleepSeconds", 0)
                data["sleep_rem_s"] = dto.get("remSleepSeconds", 0)
                scores = dto.get("sleepScores", {})
                if isinstance(scores, dict):
                    data["sleep_score"] = scores.get("overallScore") or (
                        scores.get("overall", {}).get("value")
                        if isinstance(scores.get("overall"), dict)
                        else None
                    )
    except Exception as e:
        print(f"  Sleep error: {e}")

    # FC en reposo
    try:
        hr_data = garth.connectapi(
            f"/wellness-service/wellness/dailyHeartRate/{day_str}"
        )
        if hr_data:
            data["resting_hr"] = hr_data.get("restingHeartRate")
    except Exception as e:
        print(f"  HR error: {e}")

    ok = post("/api/sync/wellness", data)
    hrv_val = data.get("hrv", "–")
    sleep_h = round(data.get("sleep_total_s", 0) / 3600, 1) if data.get("sleep_total_s") else "–"
    status = "✓" if ok else "✗"
    print(f"  {status} Wellness {day_str}: HRV {hrv_val}ms | Sueño {sleep_h}h")


def sync_activities(days_back: int):
    start_str = (date.today() - timedelta(days=days_back)).isoformat()
    try:
        activities = garth.connectapi(
            f"/activitylist-service/activities/search/activities"
            f"?startDate={start_str}&limit=50&activityType=running"
        )
        if not activities:
            print("  No se encontraron actividades de running.")
            return

        running_types = {"running", "trail_running", "indoor_running", "treadmill_running"}
        for act in activities:
            type_key = act.get("activityType", {}).get("typeKey", "")
            if type_key not in running_types:
                continue

            ok = post("/api/sync/activity", act)
            name = act.get("activityName", "Run")
            dist_km = round(act.get("distance", 0) / 100000, 1)  # cm → km
            status = "✓" if ok else "✗"
            print(f"  {status} Actividad {name} — {dist_km}km")

    except Exception as e:
        print(f"  Error obteniendo actividades: {e}")


def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 2

    print(f"\n{'='*50}")
    print(f"PeakLab — Garmin Sync ({days} días hacia atrás)")
    print(f"App: {APP_URL}")
    print(f"{'='*50}\n")

    login()

    print("\n📊 Sincronizando wellness (HRV + sueño)...")
    for i in range(days):
        sync_wellness(date.today() - timedelta(days=i))

    print("\n🏃 Sincronizando actividades de running...")
    sync_activities(days)

    print(f"\n✅ Sync completo.")


if __name__ == "__main__":
    main()
