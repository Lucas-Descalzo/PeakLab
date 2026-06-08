"""
Garmin Connect sync — HRV, sueño y actividades
Ejecutar diariamente (o después de cada corrida).

Instalar: pip install garth requests
Configurar: crear archivo .env en esta carpeta con GARMIN_USER y GARMIN_PASS
"""
import os, json, requests
from datetime import date, timedelta
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

try:
    import garth
except ImportError:
    print("Instalá garth: pip install garth")
    exit(1)

GARMIN_USER = os.getenv("GARMIN_USER", "")
GARMIN_PASS = os.getenv("GARMIN_PASS", "")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")
API_SECRET = os.getenv("SYNC_SECRET", "")

def login():
    token_dir = Path.home() / ".garmin_tokens"
    token_dir.mkdir(exist_ok=True)
    try:
        garth.resume(str(token_dir))
        garth.client.username  # test token validity
        print("Token reutilizado.")
    except Exception:
        print("Login Garmin...")
        garth.login(GARMIN_USER, GARMIN_PASS)
        garth.save(str(token_dir))
        print("Login exitoso.")

def fetch_wellness(day: date) -> dict:
    """Fetch HRV and sleep for a specific date."""
    day_str = day.isoformat()
    data = {}

    # HRV status
    try:
        hrv = garth.connectapi(f"/hrv-service/hrv/{day_str}")
        if hrv and "hrvSummary" in hrv:
            s = hrv["hrvSummary"]
            data["hrv"] = s.get("lastNight")
            data["hrv_baseline_lower"] = s.get("baselineLowUpper")
            data["hrv_baseline_upper"] = s.get("baselineHighUpper")
            data["hrv_status"] = s.get("status")
    except Exception as e:
        print(f"HRV error: {e}")

    # Sleep
    try:
        sleep = garth.connectapi(f"/wellness-service/wellness/dailySleepData/{day_str}")
        if sleep and "dailySleepDTO" in sleep:
            s = sleep["dailySleepDTO"]
            data["sleep_total_s"] = (
                s.get("sleepTimeSeconds", 0) or
                (s.get("deepSleepSeconds", 0) + s.get("lightSleepSeconds", 0) + s.get("remSleepSeconds", 0))
            )
            data["sleep_deep_s"] = s.get("deepSleepSeconds", 0)
            data["sleep_rem_s"] = s.get("remSleepSeconds", 0)
            scores = s.get("sleepScores", {})
            data["sleep_score"] = scores.get("overallScore") or scores.get("overall", {}).get("value")
    except Exception as e:
        print(f"Sleep error: {e}")

    # Resting HR
    try:
        hr = garth.connectapi(f"/wellness-service/wellness/dailyHeartRate/{day_str}")
        if hr:
            data["resting_hr"] = hr.get("restingHeartRate")
    except Exception as e:
        print(f"HR error: {e}")

    data["date"] = day_str
    return data

def sync_wellness(days_back: int = 7):
    """Sync wellness data for the last N days."""
    for i in range(days_back):
        day = date.today() - timedelta(days=i)
        print(f"Syncing wellness {day}...")
        wellness = fetch_wellness(day)
        if wellness:
            try:
                res = requests.post(
                    f"{APP_URL}/api/sync/wellness",
                    json=wellness,
                    headers={"x-sync-secret": API_SECRET},
                    timeout=10,
                )
                print(f"  → {res.status_code}")
            except Exception as e:
                print(f"  → Error: {e}")

def sync_activities(days_back: int = 7):
    """Sync recent activities from Garmin Connect."""
    try:
        start = (date.today() - timedelta(days=days_back)).isoformat()
        activities = garth.connectapi(
            f"/activitylist-service/activities/search/activities?startDate={start}&limit=50"
        )
        if not activities:
            return

        for act in activities:
            if act.get("activityType", {}).get("typeKey") not in ("running", "trail_running"):
                continue
            try:
                res = requests.post(
                    f"{APP_URL}/api/sync/activity",
                    json=act,
                    headers={"x-sync-secret": API_SECRET},
                    timeout=10,
                )
                print(f"Activity {act.get('activityId')}: {res.status_code}")
            except Exception as e:
                print(f"Activity error: {e}")
    except Exception as e:
        print(f"Activities error: {e}")

def push_workout(workout_data: dict):
    """Push a structured workout to Garmin Connect (syncs al reloj)."""
    try:
        result = garth.connectapi(
            "/workout-service/workout",
            method="POST",
            json=workout_data,
        )
        print(f"Workout pushed: {result.get('workoutId')}")
        return result
    except Exception as e:
        print(f"Push error: {e}")
        return None

def build_garmin_workout(title: str, steps_description: str) -> dict:
    """Build a simple Garmin workout structure."""
    return {
        "workoutName": title,
        "description": steps_description,
        "sportType": {"sportTypeId": 1, "sportTypeKey": "running"},
        "workoutSegments": [
            {
                "segmentOrder": 1,
                "sportType": {"sportTypeId": 1, "sportTypeKey": "running"},
                "workoutSteps": [
                    {
                        "type": "ExecutableStepDTO",
                        "stepOrder": 1,
                        "stepType": {"stepTypeId": 3, "stepTypeKey": "interval"},
                        "childStepId": None,
                        "description": steps_description,
                        "endCondition": {"conditionTypeId": 1, "conditionTypeKey": "lap.button"},
                        "preferredEndConditionUnit": None,
                        "endConditionValue": None,
                        "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
                        "targetValueOne": None,
                        "targetValueTwo": None,
                    }
                ],
            }
        ],
    }

if __name__ == "__main__":
    import sys
    if not GARMIN_USER or not GARMIN_PASS:
        print("Configurá GARMIN_USER y GARMIN_PASS en scripts/.env")
        exit(1)

    login()
    days = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    print(f"\nSyncando últimos {days} días...")
    sync_wellness(days)
    sync_activities(days)
    print("\nSync completo.")
