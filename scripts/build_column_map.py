import csv, json, sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "config" / "form_header.tsv"


def norm(s):
    return " ".join(str(s).split()).lower()


def read_header(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        first = f.readline()
    delim = "\t" if "\t" in first else ","
    cols = next(csv.reader([first], delimiter=delim))
    return [c for c in cols if c.strip() and not c.startswith("Unnamed")]


# Urutan kode HARUS sama dengan urutan kolom di formulir
codes = (
    ["Timestamp", "Gender", "Semester", "Angkatan", "Departemen", "Prodi"]
    + [f"WB{i}" for i in range(1, 10)] + ["WB_O1"]
    + [f"ACD{i}" for i in range(1, 9)] + ["ACD_O1"]
    + [f"SOC{i}" for i in range(1, 9)] + ["SOC_O1"]
    + [f"CAR{i}" for i in range(1, 9)] + ["CAR_O1"]
)  # 43 kode, tanpa ECO

cols = read_header(SRC)
print(f"{len(cols)} kolom di file, {len(codes)} kode")
assert len(cols) == len(codes), "Jumlah tidak cocok: cek file header atau daftar kode"

mapping = {norm(c): code for c, code in zip(cols, codes)}
assert len(mapping) == len(codes), "Ada dua header bertext sama setelah dinormalisasi"

out = BASE / "config" / "column_map.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")

for c, code in zip(cols, codes):
    print(f"{code:8} <- {c.strip()[:70]}")
print("Tersimpan:", out)