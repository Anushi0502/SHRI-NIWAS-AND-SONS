from pathlib import Path


APP_NAME = "Global Creative Services Accounting"
DEFAULT_COMPANY_NAME = "Global Creative Services"

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
EXPORTS_DIR = ROOT_DIR / "exports"
DB_PATH = DATA_DIR / "shreenivas_sons.db"
