"""
Script seed: Mengunggah seluruh 119 data responden kuesioner LPA-GMM ke tabel student_surveys di Supabase.
"""
import os
import json
import urllib.request
import pandas as pd
from sklearn.decomposition import PCA

SUPABASE_URL = "https://xmabdgvmsljwzrffwvng.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww"

csv_path = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "data_lpa.csv")
if not os.path.exists(csv_path):
    print(f"Error: {csv_path} tidak ditemukan!")
    exit(1)

df = pd.read_csv(csv_path)

# Proyeksi PCA 2D konsisten dengan backend LPA
score_cols = ["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"]
pca = PCA(n_components=2, random_state=42)
coords = pca.fit_transform(df[score_cols])

records = []
for i, r in df.iterrows():
    p_id = int(r["Profile"])
    records.append({
        "respondent_id": f"MHS-{p_id}-{i+1}",
        "gender": str(r["Jenis Kelamin"]).strip(),
        "semester": str(r["Semester saat ini"]).strip(),
        "angkatan": int(r["Angkatan"]),
        "departemen": str(r["Departemen"]).strip(),
        "prodi": str(r["Program Studi"]).strip(),
        "wb_score": round(float(r["WB_Score"]), 2),
        "acd_score": round(float(r["ACD_Score"]), 2),
        "soc_score": round(float(r["SOC_Score"]), 2),
        "car_score": round(float(r["CAR_Score"]), 2),
        "profile": p_id,
        "pca_x": round(float(coords[i, 0]), 3),
        "pca_y": round(float(coords[i, 1]), 3)
    })

url = f"{SUPABASE_URL}/rest/v1/student_surveys"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Upload dalam batch 50 baris agar aman dan stabil
batch_size = 50
total_uploaded = 0

for start_idx in range(0, len(records), batch_size):
    batch = records[start_idx:start_idx + batch_size]
    req = urllib.request.Request(
        url,
        data=json.dumps(batch).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            total_uploaded += len(batch)
            print(f"[*] Berhasil upload batch {start_idx + 1} - {start_idx + len(batch)} (Status: {resp.status})")
    except urllib.error.HTTPError as err:
        print(f"[!] HTTP Error pada batch {start_idx}: {err.code} - {err.read().decode('utf-8')}")

print(f"\n[SELESAI] Total {total_uploaded} responden LPA-GMM berhasil masuk ke Supabase 'student_surveys'!")
