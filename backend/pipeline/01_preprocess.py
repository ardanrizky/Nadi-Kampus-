from pathlib import Path
import pandas as pd
import numpy as np

# 1. Cari file survei mentah secara fleksibel
file_path = None
for p in [Path.cwd(), Path.cwd().parent, Path.cwd().parent.parent]:
    matches = list(p.glob('**/*SURVEI KESMA*.csv'))
    if matches:
        file_path = matches[0]
        break

if not file_path:
    raise FileNotFoundError("File survei KESMA tidak ditemukan!")

print(f"Membaca data dari: {file_path}")
df_raw = pd.read_csv(file_path)

# 2. Konversi skala Likert 1-5 ke skala 0-100
def to_score(series):
    s = pd.to_numeric(series, errors='coerce').fillna(3)
    return ((s - 1) / 4) * 100

df = pd.DataFrame()
df['timestamp'] = df_raw['Timestamp']
df['semester'] = df_raw['Semester saat ini'].astype(str).str.extract(r'(\d+)').fillna(5).astype(int)
df['prodi'] = df_raw['Program Studi'].fillna('Lainnya').str.strip()

# 4 Dimensi utama
df['wellbeing'] = df_raw.iloc[:, 6:15].apply(to_score).mean(axis=1).round(1)
df['academic_pressure'] = (100 - df_raw.iloc[:, 16:24].apply(to_score).mean(axis=1)).round(1)
df['social_support'] = df_raw.iloc[:, 25:33].apply(to_score).mean(axis=1).round(1)
df['career_readiness'] = df_raw.iloc[:, 34:42].apply(to_score).mean(axis=1).round(1)

# Kolom teks keluhan
df['keluhan_akademik'] = df_raw.iloc[:, 24].fillna('').astype(str).str.strip()
df['kebutuhan_karier'] = df_raw.iloc[:, 42].fillna('').astype(str).str.strip()

# 3. Cari dan simpan ke data/processed
target_dir = None
for p in [Path.cwd(), Path.cwd().parent, Path.cwd().parent.parent]:
    candidate = p / 'data' / 'processed'
    if candidate.parent.exists():
        target_dir = candidate
        break

if target_dir is None:
    target_dir = Path.cwd() / 'data' / 'processed'

target_dir.mkdir(parents=True, exist_ok=True)
out_file = target_dir / "student_features_clean.csv"
df.to_csv(out_file, index=False)

print(f"Selesai! {len(df)} baris tersimpan di: {out_file}")
print("\nRata-rata Skor Kampus (0 - 100):")
print(df[['wellbeing', 'academic_pressure', 'social_support', 'career_readiness']].mean().round(1))
