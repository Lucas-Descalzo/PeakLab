"""
Garmin Connect sync — HRV, sueño y actividades de running.

Autenticación (sin SSO interactivo):
  - GitHub Actions: secret GARMIN_TOKENS_B64 (base64 de un tar.gz con los .json de garth)
  - Caché:          tokens guardados en runs anteriores (~/.garmin_tokens)
  - Local (PC):     tokens generados con scripts/generate_tokens.py

Si no hay tokens válidos el script falla inmediatamente — no reintenta login SSO.

Uso:
  python scripts/garmin_sync.py           # últimos 2 días
  python scripts/garmin_sync.py 7         # últimos 7 días
  python scripts/garmin_sync.py 30        # carga histórico (en tandas)

Dependencias: pip install garth requests python-dotenv
"""
import base64
import io
import os
import sys
import tarfile
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


def load_tokens_from_env() -> bool:
    """Decodifica GARMIN_TOKENS_B64 y escribe los archivos en TOKEN_DIR.

    Maneja tars creados tanto con path relativo (./) como absoluto
    (/home/user/.garmin_tokens/) aplanando cualquier subdirectorio.
    """
    b64 = os.environ.get("GARMIN_TOKENS_B64", "").strip()
    if not b64:
        return False
    try:
        raw = base64.b64decode(b64)
        TOKEN_DIR.mkdir(parents=True, exist_ok=True)
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tar:
            tar.extractall(TOKEN_DIR)
        # Aplanar: mover .json de cualquier subdirectorio al nivel raíz de TOKEN_DIR
        for f in list(TOKEN_DIR.rglob("*.json")):
            if f.parent != TOKEN_DIR:
                f.rename(TOKEN_DIR / f.name)
        # Limpiar subdirectorios vacíos que hayan quedado
        for sub in [p for p in TOKEN_DIR.iterdir() if p.is_dir()]:
            try:
                sub.rmdir()
            except OSError:
                pass
        token_files = list(TOKEN_DIR.glob("*.json"))
        print(f"✓ Tokens decodificados desde GARMIN_TOKENS_B64: {[f.name for f in token_files]}")
        return bool(token_files)
    except Exception as e:
        print(f"✗ Error decodificando GARMIN_TOKENS_B64: {e}")
        return False


def login():
    TOKEN_DIR.mkdir(exist_ok=True)

    # Prioridad 1: decodificar directamente desde el secret (más confiable que el step shell)
    if os.environ.get("GARMIN_TOKENS_B64", "").strip():
        if not load_tokens_from_env():
            print("✗ GARMIN_TOKENS_B64 presente pero falló la decodificación. Abortando.")
            sys.exit(1)

    # Prioridad 2: tokens en disco restaurados desde el caché de GitHub Actions
    token_files = list(TOKEN_DIR.glob("*.json"))
    if not token_files:
        print("✗ Sin tokens disponibles. Opciones:")
        print("  1. Generá tokens localmente con scripts/generate_tokens.py")
        print("  2. Actualizá el secret GARMIN_TOKENS_B64 en GitHub → Settings → Secrets")
        sys.exit(1)

    # Cargar en garth sin llamada de verificación (evita OAuth2 refresh prematuro)
    try:
        garth.resume(str(TOKEN_DIR))
        print(f"✓ Sesión garth inicializada ({len(token_files)} token/s). Sin SSO.")
    except Exception as e:
        print(f"✗ garth.resume() falló: {e}")
        print("  Tokens corruptos o expirados. Regeneralos y actualizá GARMIN_TOKENS_B64.")
        sys.exit(1)


_post_ok = 0
_post_fail = 0
_garmin_errors = 0
_display_name: "str | None" = None


def get_display_name() -> str:
    """Obtiene el displayName del usuario de Garmin (se cachea tras la primera llamada)."""
    global _display_name
    if _display_name is not None:
        return _display_name
    try:
        profile = garth.connectapi("/userprofile-service/userprofile/personal-information")
        _display_name = (profile or {}).get("displayName", "")
        if _display_name:
            print(f"  Display name: {_display_name}")
        else:
            print("  ⚠ displayName vacío en perfil de Garmin.")
    except Exception as e:
        print(f"  ⚠ No se pudo obtener displayName: {e}")
        _display_name = ""
    return _display_name

def post(endpoint: str, data: dict) -> bool:
    global _post_ok, _post_fail
    url = f"{APP_URL}{endpoint}"
    try:
        res = requests.post(
            url,
            json=data,
            headers={"x-sync-secret": SYNC_SECRET},
            timeout=15,
        )
        if res.status_code == 200:
            _post_ok += 1
            return True
        else:
            print(f"  ✗ HTTP {res.status_code} en {endpoint}: {res.text[:200]}")
            _post_fail += 1
            return False
    except Exception as e:
        print(f"  ✗ Error enviando a {endpoint}: {e}")
        _post_fail += 1
        return False


def sync_wellness(day: date):
    global _garmin_errors
    day_str = day.isoformat()
    data = {"date": day_str}
    display_name = get_display_name()

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
        _garmin_errors += 1

    try:
        # Garmin requiere displayName en el path; sin él devuelve 400
        sleep_path = (
            f"/wellness-service/wellness/dailySleepData/{display_name}/{day_str}"
            if display_name else
            f"/wellness-service/wellness/dailySleepData/{day_str}"
        )
        sleep_data = garmin_api_call(sleep_path)
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
        _garmin_errors += 1

    try:
        # Garmin requiere displayName en el path; sin él devuelve 403
        hr_path = (
            f"/wellness-service/wellness/dailyHeartRate/{display_name}/{day_str}"
            if display_name else
            f"/wellness-service/wellness/dailyHeartRate/{day_str}"
        )
        hr_data = garmin_api_call(hr_path)
        if hr_data:
            data["resting_hr"] = hr_data.get("restingHeartRate")
    except Exception as e:
        print(f"  HR error: {e}")
        _garmin_errors += 1

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


def validate_env():
    """Falla rápido si las variables requeridas no están configuradas."""
    errors = []
    if not SYNC_SECRET:
        errors.append("SYNC_SECRET no está configurado (secret de GitHub) — el API lo requiere")
    if "localhost" in APP_URL:
        errors.append(
            f"APP_URL apunta a localhost ({APP_URL}). "
            "Configurá el secret APP_URL con tu URL de Vercel: "
            "https://training-app-beta-ashen.vercel.app"
        )
    if errors:
        print("❌ Variables de entorno faltantes o incorrectas:\n")
        for e in errors:
            print(f"  • {e}")
        print(
            "\nConfigurá estos secrets en: "
            "GitHub → repo → Settings → Secrets and variables → Actions"
        )
        sys.exit(1)


def main():
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 2

    print(f"\n{'='*50}")
    print(f"PeakLab — Garmin Sync")
    print(f"Días: {days} | App: {APP_URL}")
    print(f"{'='*50}\n")

    validate_env()
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

    # Persistir tokens actualizados para que el caché de GitHub Actions tenga la versión más fresca
    try:
        garth.save(str(TOKEN_DIR))
    except Exception:
        pass

    print(f"\n✅ Sync completo. Enviados: {_post_ok} OK, {_post_fail} fallos. Errores Garmin: {_garmin_errors}.")
    if _post_fail > 0 and _post_ok == 0:
        print("❌ Todos los requests a la app fallaron. Revisá APP_URL, SYNC_SECRET y UPSTASH_REDIS_REST_URL en Vercel.")
        sys.exit(1)
    if _garmin_errors > 0:
        print(f"⚠ {_garmin_errors} error/s al obtener datos de Garmin — algunos campos de wellness pueden estar vacíos.")
        sys.exit(2)


if __name__ == "__main__":
    main()
