"""
Push el workout de mañana al reloj Garmin.
Ejecutar cualquier noche para que el reloj lo descargue al sincronizar.

Uso: python push_workout.py
"""
import os, sys
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
    sys.exit(1)

# Importar el plan
sys.path.insert(0, str(Path(__file__).parent.parent))

GARMIN_USER = os.getenv("GARMIN_USER", "")
GARMIN_PASS = os.getenv("GARMIN_PASS", "")

# Plan simplificado - copiar del training-plan.ts
# En el futuro esto puede llamar a la API de la app
PLAN = {
    # formato: "YYYY-MM-DD": { "title": ..., "description": ..., "type": "easy|quality|long" }
    # Generado dinámicamente desde la lógica del plan
}

def get_tomorrow_workout() -> dict | None:
    """Fetch tomorrow's workout from the app API."""
    import urllib.request, json
    app_url = os.getenv("APP_URL", "http://localhost:3000")
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    try:
        url = f"{app_url}/api/workout/{tomorrow}"
        with urllib.request.urlopen(url, timeout=5) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"No se pudo obtener workout de la app: {e}")
        return None

def build_garmin_workout(workout: dict) -> dict:
    """Convert app workout to Garmin Connect workout format."""
    title = workout.get("title", "Entrenamiento")
    details = workout.get("details", workout.get("description", ""))
    pace_target = workout.get("paceTarget", "")
    hr_target = workout.get("hrTarget", "")

    description = f"{details}"
    if pace_target:
        description += f" | Ritmo: {pace_target}"
    if hr_target:
        description += f" | {hr_target}"

    return {
        "workoutName": title,
        "description": description[:255],
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
                        "description": details[:255],
                        "endCondition": {
                            "conditionTypeId": 3,
                            "conditionTypeKey": "distance",
                        },
                        "endConditionValue": workout.get("distanceKm", 10) * 1000,
                        "preferredEndConditionUnit": {"unitKey": "meter"},
                        "targetType": {
                            "workoutTargetTypeId": 1,
                            "workoutTargetTypeKey": "no.target",
                        },
                    }
                ],
            }
        ],
    }

def login():
    token_dir = Path.home() / ".garmin_tokens"
    token_dir.mkdir(exist_ok=True)
    try:
        garth.resume(str(token_dir))
        garth.client.username
    except Exception:
        garth.login(GARMIN_USER, GARMIN_PASS)
        garth.save(str(token_dir))

def schedule_workout(garmin_workout: dict):
    """Push workout to Garmin Connect and schedule it for tomorrow."""
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # Create workout
    result = garth.connectapi(
        "/workout-service/workout",
        method="POST",
        json=garmin_workout,
    )
    workout_id = result.get("workoutId")
    print(f"Workout creado: ID {workout_id}")

    # Schedule for tomorrow
    garth.connectapi(
        "/workout-service/schedule",
        method="POST",
        json={"workoutId": workout_id, "date": tomorrow},
    )
    print(f"Workout programado para {tomorrow}")
    return workout_id

if __name__ == "__main__":
    if not GARMIN_USER or not GARMIN_PASS:
        print("Configurá GARMIN_USER y GARMIN_PASS en scripts/.env")
        sys.exit(1)

    workout = get_tomorrow_workout()
    if not workout:
        print("No hay workout programado para mañana.")
        sys.exit(0)

    print(f"Workout de mañana: {workout.get('title')}")

    login()
    garmin_workout = build_garmin_workout(workout)

    try:
        schedule_workout(garmin_workout)
        print("✓ Workout enviado al reloj. Sincronizá Garmin Connect para verlo.")
    except Exception as e:
        print(f"Error al enviar: {e}")
