"""
Genera el valor de GARMIN_TOKENS_B64 para el secret de GitHub Actions.

Uso:
  python scripts/generate_tokens.py

El script inicia sesión en Garmin, guarda los tokens en un directorio
temporal, los empaqueta en .tar.gz y printea el string Base64 listo
para pegar en GitHub → Settings → Secrets → GARMIN_TOKENS_B64.

Dependencias: pip install garth
"""
import base64
import getpass
import io
import sys
import tarfile
import tempfile
from pathlib import Path

try:
    import garth
except ImportError:
    print("ERROR: Instalá garth → pip install garth")
    sys.exit(1)


def main():
    print("=" * 55)
    print("  Generador de GARMIN_TOKENS_B64 para GitHub Actions")
    print("=" * 55)
    print()

    email = input("Email de Garmin Connect: ").strip()
    password = getpass.getpass("Contraseña (no se muestra): ")

    if not email or not password:
        print("✗ Email y contraseña son requeridos.")
        sys.exit(1)

    print("\nIniciando sesión en Garmin Connect...")
    try:
        garth.login(email, password)
    except Exception as e:
        print(f"✗ Error de login: {e}")
        sys.exit(1)

    with tempfile.TemporaryDirectory() as tmp:
        token_dir = Path(tmp) / "tokens"
        token_dir.mkdir()
        garth.save(str(token_dir))

        token_files = list(token_dir.glob("*.json"))
        if not token_files:
            print("✗ garth no guardó ningún archivo de token.")
            sys.exit(1)

        print(f"✓ Tokens generados: {[f.name for f in token_files]}")

        # Empaquetar con paths relativos para que los .json queden en la raíz del tar
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for f in token_files:
                tar.add(f, arcname=f.name)
        raw = buf.getvalue()

    b64 = base64.b64encode(raw).decode("ascii")

    print()
    print("=" * 55)
    print("  GARMIN_TOKENS_B64 (copiá todo el bloque de abajo)")
    print("=" * 55)
    print(b64)
    print("=" * 55)
    print()
    print("Pasos:")
    print("  1. Copiá el string de arriba (sin espacios ni saltos de línea)")
    print("  2. GitHub → tu repo → Settings → Secrets and variables → Actions")
    print("  3. Actualizá (o creá) el secret llamado GARMIN_TOKENS_B64")
    print()
    print("Los tokens duran ~90 días o hasta que cambies tu contraseña.")


if __name__ == "__main__":
    main()
