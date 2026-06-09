"""
Garmin Connect sync — HRV, sueño y actividades de running.

Funciona en dos modos:
  - Local (PC):        lee credenciales de scripts/.env
  - GitHub Actions:    lee credenciales de variables de entorno del runner

Uso:
  python scripts/garmin_sync.py           # últimos 2 días
  python scripts/garmin_sync.py 7         # últimos 7 días
  python scripts/garmin_sync.py 30        # carga histórico (en tandas)

Manejo de rate limiting (429 Garmin SSO):
  - Login: hasta 3 intentos con backoff de 2/5/10 minutos
  - API calls: pausa de 1s entre requests
  - Syncs largos: procesa de a 5 días con pausa de 8s entre tandas

Dependencias: pip install garth requests python-dotenv
"""
import os
import sys
import time
import random
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


def is_rate_limit_error(e: Exception) -> bool:
    msg = str(e).lower()
    return "429" in msg or "too many" in msg or "rate limit" in msg


def garmin_api_call(path: str, **kwargs):
    """Wrapper de garth.connectapi con retry en 429."""
    max_attempts = 3
    # Delays en segundos: 2min, 5min, 10min
    delays = [120, 300, 600]
    for attempt in range(max_attempts):
        try:
            result = garth.connectapi(path, **kwargs)
            time.sleep(1)  # pausa cortés entre requests
            return result
        except Exception as e:
            if is_rate_limit_error(e) and attempt < max_attempts - 1:
                wait = delays[attempt] + random.uniform(0, 30)
                print(f"  ⏳ Rate limit (429) en {path}. Esperando {wait:.0f}s (intento {attempt+2}/{max_attempts})...")
                time.sleep(wait)
            else:
                raise


def login():
    TOKEN_DIR.mkdir(exist_ok=True)

    # Intentar reutilizar token cacheado primero
    try:
        garth.resume(str(TOKEN_DIR))
        garmin_api_call("/userprofile-service/userprofile/personal-information")
        print("✓ Token válido reutilizado (sin login).")
        return
    except Exception as e:
        if is_rate_limit_error(e):
            print(f"⛔ Rate limit al verificar token: {e}")
            raise
        # Token inválido o expirado — necesita re-login
        pass

    if not GARMIN_USER or not GARMIN_PASS:
        print("ERROR: GARMIN_USER y GARMIN_PASS son requeridos.")
        sys.exit(1)

    # Login con retry y backoff
    max_attempts = 3
    delays = [120, 300, 600]  # 2min, 5min, 10min
    for attempt in range(max_attempts):
        try:
            print(f"Autenticando como {GARMIN_USER} (intento {attempt+1}/{max_attempts})...")
            garth.login(GARMIN_USER, GARMIN_PASS)
            garth.save(str(TOKEN_DIR))
            print("✓ Login exitoso.")
            return
        except Exception as e:
            if is_rate_limit_error(e):
                if attempt < max_attempts - 1:
                    wait = delays[attempt] + random.uniform(0, 60)
                    print(f"⏳ Rate limit en SSO (429). Garmin bloqueó temporalmente.")
                    print(f"   Esperando {wait/60:.1f} minutos antes del intento {attempt+2}...")
                    time.sleep(wait)
                else:
                    print("⛔ Garmin sigue bloqueando después de 3 intentos.")
                    print("   Esperá 30-60 minutos y volvé a ejecutar el workflow.")
                    sys.exit(1)
            else:
                print(f"✗ Error de login: {e}")
                sys.exit(1)


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

    try:
        hrv_data = garmin_api_call(f"/hrv-service/hrv/{day_str}")
        if hrv_data and "hrvSummary" in hrv_data:
            s = hrv_data["hrvSummary"]
            data["hrv"] = s.get("lastNight")
            data["hrv_baseline_lower"] = s.get("baselineLowUpper")
            data["hrv_baseline_upper"] = s.get("baselineHighUpper")
            data["hrv_status"] = s.get("status")
    except Exception as e:
        print(f"  HRV error: {e}")

    try:
        sleep_data = garmin_api_call(f"/wellness-service/wellness/dailySleepData/{day_str}")
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

    try:
        hr_data = garmin_api_call(f"/wellness-service/wellness/dailyHeartRate/{day_str}")
        if hr_data:
            data["resting_hr"] = hr_data.get("restingHeartRate")
    except Exception as e:
        print(f"  HR error: {e}")

    ok = post("/api/sync/wellness", data)
    hrv_val = data.get("hrv", "–")
    sleep_h = round(data.get("sleep_total_s", 0) / 3600, 1) if data.get("sleep_total_s") else "–"
    print(f"  {'✓' if ok else '✗'} Wellness {day_str}: HRV {hrv_val}ms | Sueño {sleep_h}h")


def fetch_hr_zones(activity_id: int) -> dict:
    """Fetch HR time in zones for an activity."""
    try:
        data = garmin_api_call(
            f"/activity-service/activity/{activity_id}/hrTimeInZones"
        )
        if not data:
            return {}
        zones = {}
        zone_list = (
            data.get("userHrTimeInZones")
            or data.get("allMetrics", {}).get("metricsMap", {}).get("HEART_RATE_ZONES", [])
        )
        for z in (zone_list or []):
            if isinstance(z, dict):
                zone_num = z.get("zoneNumber", z.get("secsInZone"))
                secs = z.get("secsInZone", 0)
                if isinstance(zone_num, int) and 1 <= zone_num <= 5:
                    zones[f"zone_{zone_num}_s"] = int(secs)
        return zones
    except Exception as e:
        print(f"    HR zones error: {e}")
        return {}


def fetch_recovery_time() -> "int | None":
    """Get current recovery time advisor from Garmin Connect."""
    try:
        for endpoint in [
            "/wellness-service/wellness/recoveryTime",
            f"/wellness-service/wellness/recoveryAdvisor/{date.today().isoformat()}",
        ]:
            try:
                data = garmin_api_call(endpoint)
                if data:
                    rt = (
                        data.get("recoveryTimeSeconds")
                        or (data.get("recoveryTime", 0) or 0) * 3600
                        or (data.get("value", 0) or 0) * 3600
                    )
                    if rt and rt > 0:
                        return int(rt)
            except Exception:
                continue
        return None
    except Exception:
        return None


def sync_activities(days_back: int):
    start_str = (date.today() - timedelta(days=days_back)).isoformat()
    try:
        activities = garmin_api_call(
            f"/activitylist-service/activities/search/activities"
            f"?startDate={start_str}&limit=50"
        )
        if not activities:
            print("  No se encontraron actividades.")
            return

        running_types = {"running", "trail_running", "indoor_running", "treadmill_running"}
        count = 0
        for act in activities:
            type_key = act.get("activityType", {}).get("typeKey", "")
            if type_key not in running_types:
                continue

            # Fetch HR zones and enrich activity payload
            activity_id = act.get("activityId", 0)
            if activity_id:
                hr_zones = fetch_hr_zones(activity_id)
                act.update(hr_zones)
                time.sleep(0.5)  # pausa para no triggear rate limit

            ok = post("/api/sync/activity", act)
            name = act.get("activityName", "Run")
            dist_km = round(act.get("distance", 0) / 100000, 1)
            zones_info = ", ".join(
                f"Z{i}:{act.get(f'zone_{i}_s', 0)//60}m"
                for i in range(1, 6)
                if act.get(f"zone_{i}_s")
            )
            print(f"  {'✓' if ok else '✗'} {name} — {dist_km}km{(' | ' + zones_info) if zones_info else ''}")
            count += 1
            time.sleep(0.5)  # pequeña pausa entre actividades
        if count == 0:
            print("  No se encontraron actividades de running.")
    except Exception as e:
        print(f"  Error obteniendo actividades: {e}")


# ── Procesamiento en tandas para syncs largos ─────────────────────────────────

CHUNK_SIZE = 5          # días por tanda
CHUNK_DELAY_S = 8       # segundos de pausa entre tandas

def sync_in_chunks(days_back: int):
    """Para syncs de más de 5 días, procesa de a 5 con pausa entre tandas."""
    total_chunks = (days_back + CHUNK_SIZE - 1) // CHUNK_SIZE
    offsets = list(range(days_back))

    for chunk_idx in range(total_chunks):
        chunk = offsets[chunk_idx * CHUNK_SIZE : (chunk_idx + 1) * CHUNK_SIZE]
        if chunk_idx > 0:
            print(f"\n  ⏸  Pausa {CHUNK_DELAY_S}s entre tandas ({chunk_idx}/{total_chunks})...")
            time.sleep(CHUNK_DELAY_S)

        print(f"\n📊 Tanda {chunk_idx+1}/{total_chunks} — wellness...")
        for offset in chunk:
            sync_wellness(date.today() - timedelta(days=offset))

    print(f"\n🏃 Sincronizando actividades ({days_back} días)...")
    sync_activities(days_back)


def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 2

    print(f"\n{'='*50}")
    print(f"PeakLab — Garmin Sync")
    print(f"Días: {days} | App: {APP_URL}")
    print(f"{'='*50}\n")

    login()

    if days <= CHUNK_SIZE:
        print("\n📊 Sincronizando wellness...")
        for i in range(days):
            sync_wellness(date.today() - timedelta(days=i))
        print("\n🏃 Sincronizando actividades...")
        sync_activities(days)
    else:
        print(f"\n📦 Sync largo ({days} días) — procesando en tandas de {CHUNK_SIZE}...")
        sync_in_chunks(days)

    print("\n⏰ Obteniendo tiempo de recuperación...")
    recovery_s = fetch_recovery_time()
    if recovery_s:
        recovery_h = recovery_s / 3600
        print(f"  Recovery time: {recovery_h:.1f}h")
        post("/api/sync/wellness", {
            "date": date.today().isoformat(),
            "recovery_time_s": recovery_s,
        })
    else:
        print("  No disponible.")

    print("\n✅ Sync completo.")


if __name__ == "__main__":
    main()
