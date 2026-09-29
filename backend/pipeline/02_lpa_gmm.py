from pathlib import Path
import json
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.mixture import GaussianMixture
from sklearn.decomposition import PCA

# 1. Cari file student_features_clean.csv
file_path = None
for p in [Path.cwd(), Path.cwd().parent, Path.cwd().parent.parent]:
    candidate = p / "data" / "processed" / "student_features_clean.csv"
    if candidate.exists():
        file_path = candidate
        break

if not file_path:
    raise FileNotFoundError("student_features_clean.csv tidak ditemukan. Jalankan 01_preprocess.py terlebih dahulu!")

print(f"Membaca data: {file_path}")
df = pd.read_csv(file_path)
features = ['wellbeing', 'academic_pressure', 'social_support', 'career_readiness']
X = df[features].values

# 2. Standardisasi
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 3. Model LPA (GMM k=4)
model = GaussianMixture(n_components=4, covariance_type='diag', random_state=42)
df['cluster'] = model.fit_predict(X_scaled) + 1

# 4. Reduksi 2D PCA untuk visualisasi
pca = PCA(n_components=2, random_state=42)
pca_coords = pca.fit_transform(X_scaled)
df['pca_x'] = pca_coords[:, 0].round(2)
df['pca_y'] = pca_coords[:, 1].round(2)

# Simpan kembali dataset berlabel
df.to_csv(file_path, index=False)

print("\n--- Ringkasan 4 Profil Mahasiswa (LPA - GMM) ---")
summary = df.groupby('cluster')[features].mean().round(1)
summary['jumlah_mhs'] = df['cluster'].value_counts()
print(summary)
print(f"\nSelesai! Model dan label tersimpan di: {file_path}")
