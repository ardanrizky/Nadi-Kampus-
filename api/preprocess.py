import json
from pathlib import Path
import pandas as pd

BASE = Path(__file__).resolve().parent.parent
COLMAP = json.loads((BASE / "config" / "column_map.json").read_text(encoding="utf-8"))

ITEMS = {
    "WB":  [f"WB{i}" for i in range(1, 10)],   
    "ACD": [f"ACD{i}" for i in range(1, 9)],
    "SOC": [f"SOC{i}" for i in range(1, 9)],
    "CAR": [f"CAR{i}" for i in range(1, 9)],
}
ALL_ITEMS = sum(ITEMS.values(), [])                       # 33 butir tertutup
FEATURES = ["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"]   # urutan sesuai model
COMMENT_COLS = ["WB_O1", "ACD_O1", "SOC_O1", "CAR_O1"]
ID_COLS = ["Timestamp", "Gender", "Semester", "Angkatan", "Departemen", "Prodi"]


def norm(s):
    return " ".join(str(s).split()).lower()


def _read_any(file) -> pd.DataFrame:
    """Baca CSV (koma) atau TSV (tab)."""
    df = pd.read_csv(file, encoding="utf-8-sig")
    if df.shape[1] == 1:                                   # kemungkinan tab
        if hasattr(file, "seek"):
            file.seek(0)
        df = pd.read_csv(file, sep="\t", encoding="utf-8-sig")
    return df


def load_and_rename(file) -> tuple[pd.DataFrame, dict]:
    df = _read_any(file)
    df = df.loc[:, ~df.columns.astype(str).str.startswith("Unnamed")]
    df = df.rename(columns={c: COLMAP[norm(c)] for c in df.columns if norm(c) in COLMAP})
    known = set(COLMAP.values()) | set(ALL_ITEMS) | set(FEATURES)
    report = {
        "unmapped_columns": [str(c).strip()[:60] for c in df.columns if c not in known],
        "missing_columns": [c for c in ALL_ITEMS if c not in df.columns],
    }
    return df, report


def validate(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    issues = {}
    df = df.copy()
    for c in ALL_ITEMS:
        df[c] = pd.to_numeric(df[c], errors="coerce")      # "R" / teks -> NaN

    bad = df[ALL_ITEMS].isna().any(axis=1) | ~df[ALL_ITEMS].isin([1, 2, 3, 4, 5]).all(axis=1)
    issues["baris_dibuang_kosong_atau_di_luar_1_5"] = int(bad.sum())
    df = df[~bad]

    if "Timestamp" in df.columns:
        dup = df.duplicated(subset=["Timestamp"] + ALL_ITEMS)
        issues["duplikat_dibuang"] = int(dup.sum())
        df = df[~dup]

    df = df.copy()
    df["jawaban_seragam"] = df[ALL_ITEMS].nunique(axis=1) == 1   # ditandai, tidak dibuang
    issues["jawaban_seragam"] = int(df["jawaban_seragam"].sum())
    # TODO: cek semester vs angkatan, normalisasi nama prodi
    return df.reset_index(drop=True), issues


def compute_scores(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for name, cols in ITEMS.items():
        df[f"{name}_Score"] = df[cols].mean(axis=1)
    return df


def split_comments(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Pisahkan komentar terbuka (sensitif) dari data skor."""
    have = [c for c in COMMENT_COLS if c in df.columns]
    comments = df[have].copy() if have else pd.DataFrame(index=df.index)
    return df.drop(columns=have), comments