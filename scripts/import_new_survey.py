"""
Nadi Kampus — Pipeline Otomatis Ingest Kuesioner Baru
Memproses data survei mentah baru dari data/incoming/, menghitung skor 4 dimensi,
menginferensikan ke 5 Profil LPA-GMM, memproyeksikan koordinat PCA 2D,
dan mengunggah secara append ke Supabase 'student_surveys'.
"""

import os
import sys
import glob
import json
import math
import shutil
import datetime
import urllib.request
import urllib.error
import pandas as pd
import numpy as np
from sklearn.decomposition import PCA

SUPABASE_URL = "https://xmabdgvmsljwzrffwvng.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww"

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCOMING_DIR = os.path.join(BASE_DIR, "data", "incoming")
PROCESSED_INCOMING_DIR = os.path.join(INCOMING_DIR, "processed")
HISTORICAL_LPA_CSV = os.path.join(BASE_DIR, "data", "processed", "data_lpa.csv")
MODELS_PROFILES_JSON = os.path.join(BASE_DIR, "models", "lpa_profiles.json")


def load_lpa_metadata():
    """Memuat parameter 5 profil LPA dari models/lpa_profiles.json."""
    if os.path.exists(MODELS_PROFILES_JSON):
        with open(MODELS_PROFILES_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("profiles", [])
    
    # Fallback default profil LPA-GMM
    return [
        {"profile_id": 1, "scores_likert": {"wellbeing": 2.85, "academic": 2.94, "social": 4.10, "career": 3.34}, "name": "Socially Supported, Academically Strained"},
        {"profile_id": 2, "scores_likert": {"wellbeing": 4.06, "academic": 3.88, "social": 4.25, "career": 3.65}, "name": "Thriving & High Functioning"},
        {"profile_id": 3, "scores_likert": {"wellbeing": 3.13, "academic": 3.12, "social": 3.70, "career": 3.05}, "name": "Moderate / Average Adaptation"},
        {"profile_id": 4, "scores_likert": {"wellbeing": 2.11, "academic": 2.31, "social": 2.41, "career": 1.77}, "name": "High Risk / Vulnerable"},
        {"profile_id": 5, "scores_likert": {"wellbeing": 4.48, "academic": 4.52, "social": 5.00, "career": 4.02}, "name": "Flourishing / Optimal Well-being"}
    ]


def get_current_max_respondent_id():
    """Mengambil ID dan nomor urut responden terakhir di Supabase student_surveys."""
    url = f"{SUPABASE_URL}/rest/v1/student_surveys?select=respondent_id&order=id.desc&limit=500"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            max_num = 0
            for row in data:
                r_id = row.get("respondent_id", "")
                parts = r_id.split("-")
                if len(parts) == 3 and parts[-1].isdigit():
                    max_num = max(max_num, int(parts[-1]))
            return max_num if max_num > 0 else len(data)
    except Exception as e:
        print(f"[!] Warning: Gagal mengambil data responden terakhir ({e}), menggunakan default 119.")
        return 119


def fit_pca_model():
    """Membuat PCA transformer berbasis 119 data historis agar koordinat konsisten."""
    if os.path.exists(HISTORICAL_LPA_CSV):
        df_hist = pd.read_csv(HISTORICAL_LPA_CSV)
        score_cols = ["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"]
        pca = PCA(n_components=2, random_state=42)
        pca.fit(df_hist[score_cols])
        return pca
    pca = PCA(n_components=2, random_state=42)
    # Dummy fit jika file historis tidak ditemukan
    pca.fit([[3, 3, 3, 3], [4, 4, 4, 4]])
    return pca


def predict_lpa_profile(wb, acd, soc, car, profiles):
    """Mengklasifikasikan responden ke profil 1-5 berdasarkan model LPA-GMM centroid."""
    best_p = 3
    min_dist = float("inf")
    for p in profiles:
        m = p["scores_likert"]
        dist = math.sqrt(
            (wb - m["wellbeing"]) ** 2 +
            (acd - m["academic"]) ** 2 +
            (soc - m["social"]) ** 2 +
            (car - m["career"]) ** 2
        )
        if dist < min_dist:
            min_dist = dist
            best_p = p["profile_id"]
    return best_p


def clean_and_parse_survey_csv(file_path):
    """
    Membaca dan memetakan kolom CSV baik dalam format:
    1. Pertanyaan panjang Google Form mentah
    2. Kode indikator (WB1..WB9, ACD1..ACD8, SOC1..SOC8, CAR1..CAR8)
    3. Skor agregat (WB_Score, ACD_Score, SOC_Score, CAR_Score)
    """
    df = pd.read_csv(file_path)
    cols = df.columns.tolist()

    # Normalisasi nama kolom demografi
    demo_map = {}
    for col in cols:
        col_lower = col.lower().strip()
        if "jenis kelamin" in col_lower or "gender" in col_lower:
            demo_map["gender"] = col
        elif "semester" in col_lower:
            demo_map["semester"] = col
        elif "angkatan" in col_lower:
            demo_map["angkatan"] = col
        elif "departemen" in col_lower or "jurusan" in col_lower:
            demo_map["departemen"] = col
        elif "program studi" in col_lower or "prodi" in col_lower:
            demo_map["prodi"] = col

    # Cek apakah sudah ada kolom skor agregat
    has_score_cols = all(c in df.columns for c in ["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"])

    wb_cols = [c for c in cols if c.upper().startswith("WB") and c[2:].isdigit()]
    acd_cols = [c for c in cols if c.upper().startswith("ACD") and c[3:].isdigit()]
    soc_cols = [c for c in cols if c.upper().startswith("SOC") and c[3:].isdigit()]
    car_cols = [c for c in cols if c.upper().startswith("CAR") and c[3:].isdigit()]

    # Jika format pertanyaan panjang Google Form mentah (seperti data/raw/survei_raw.csv)
    if not has_score_cols and len(wb_cols) == 0:
        numeric_candidates = []
        for col in cols:
            # Lewati kolom demografi dan timestamp
            if col in demo_map.values() or "timestamp" in col.lower():
                continue
            # Periksa apakah nilai kolom numerik 1-5
            sample_series = pd.to_numeric(df[col], errors='coerce').dropna()
            if len(sample_series) > 0 and sample_series.between(1, 5).all():
                numeric_candidates.append(col)

        if len(numeric_candidates) >= 33:
            # 9 item WB, 8 item ACD, 8 item SOC, 8 item CAR
            wb_cols = numeric_candidates[0:9]
            acd_cols = numeric_candidates[9:17]
            soc_cols = numeric_candidates[17:25]
            car_cols = numeric_candidates[25:33]
            print(f"[*] Terdeteksi format kuesioner Google Form: {len(numeric_candidates)} butir Likert dipetakan.")

    # Menghitung skor dimensi
    if has_score_cols:
        df["wb_calc"] = pd.to_numeric(df["WB_Score"], errors='coerce').fillna(3.0)
        df["acd_calc"] = pd.to_numeric(df["ACD_Score"], errors='coerce').fillna(3.0)
        df["soc_calc"] = pd.to_numeric(df["SOC_Score"], errors='coerce').fillna(3.0)
        df["car_calc"] = pd.to_numeric(df["CAR_Score"], errors='coerce').fillna(3.0)
    elif len(wb_cols) > 0:
        for c in wb_cols + acd_cols + soc_cols + car_cols:
            df[c] = pd.to_numeric(df[c], errors='coerce').fillna(3.0)
        df["wb_calc"] = df[wb_cols].mean(axis=1)
        df["acd_calc"] = df[acd_cols].mean(axis=1)
        df["soc_calc"] = df[soc_cols].mean(axis=1)
        df["car_calc"] = df[car_cols].mean(axis=1)
    else:
        raise ValueError(
            "Format CSV tidak dikenali! Harap sertakan kolom kode indikator (WB1..WB9, ACD1..ACD8, SOC1..SOC8, CAR1..CAR8) "
            "atau kolom skor (WB_Score, ACD_Score, SOC_Score, CAR_Score) atau format kuesioner Google Form mentah."
        )

    # Susun dataframe terstandarisasi
    cleaned_rows = []
    for idx, row in df.iterrows():
        gender = str(row[demo_map["gender"]]).strip() if "gender" in demo_map else "Laki-laki"
        sem_raw = str(row[demo_map["semester"]]).strip() if "semester" in demo_map else "Semester 5"
        semester = sem_raw if "Semester" in sem_raw else f"Semester {sem_raw}"
        
        try:
            angkatan = int(row[demo_map["angkatan"]]) if "angkatan" in demo_map else 2024
        except Exception:
            angkatan = 2024

        dept = str(row[demo_map["departemen"]]).strip() if "departemen" in demo_map else "Departemen Teknik Informatika dan Komputer (DTIK)"
        prodi = str(row[demo_map["prodi"]]).strip() if "prodi" in demo_map else "S.Tr. Teknik Informatika"

        cleaned_rows.append({
            "gender": gender,
            "semester": semester,
            "angkatan": angkatan,
            "departemen": dept,
            "prodi": prodi,
            "wb_score": round(float(row["wb_calc"]), 2),
            "acd_score": round(float(row["acd_calc"]), 2),
            "soc_score": round(float(row["soc_calc"]), 2),
            "car_score": round(float(row["car_calc"]), 2),
        })

    return pd.DataFrame(cleaned_rows)


def upload_to_supabase(records):
    """Mengunggah daftar record ke tabel student_surveys di Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/student_surveys"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

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
                print(f"[*] Berhasil mengunggah batch {start_idx + 1} - {start_idx + len(batch)} (Status {resp.status})")
        except urllib.error.HTTPError as err:
            err_msg = err.read().decode("utf-8")
            print(f"[!] Gagal upload batch {start_idx + 1}: HTTP {err.code} - {err_msg}")
            raise RuntimeError(f"Gagal upload ke Supabase: {err_msg}")

    return total_uploaded


def process_incoming_file(file_path):
    """Memproses satu file CSV baru dan mengunggahnya ke Supabase."""
    print(f"\n=======================================================")
    print(f"[*] Memproses file survei baru: {os.path.basename(file_path)}")
    print(f"=======================================================")

    df_clean = clean_and_parse_survey_csv(file_path)
    print(f"[*] Data terbaca: {len(df_clean)} responden baru.")

    # 1. Muat metadata LPA & PCA
    profiles = load_lpa_metadata()
    pca = fit_pca_model()

    # 2. Ambil nomor urut responden terakhir di database
    last_id_num = get_current_max_respondent_id()
    print(f"[*] Nomor urut responden terakhir di database: MHS-X-{last_id_num}")

    # 3. Hitung koordinat PCA 2D dan Prediksi Profil LPA-GMM
    score_cols = ["wb_score", "acd_score", "soc_score", "car_score"]
    # Gunakan nama fitur yang sama dengan data_lpa.csv saat fit PCA
    df_pca_input = pd.DataFrame(df_clean[score_cols].values, columns=["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"])
    coords = pca.transform(df_pca_input)

    records = []
    for i, row in df_clean.iterrows():
        next_num = last_id_num + i + 1
        wb = row["wb_score"]
        acd = row["acd_score"]
        soc = row["soc_score"]
        car = row["car_score"]

        # Inferensi profil LPA-GMM
        p_id = predict_lpa_profile(wb, acd, soc, car, profiles)

        records.append({
            "respondent_id": f"MHS-{p_id}-{next_num}",
            "gender": row["gender"],
            "semester": row["semester"],
            "angkatan": int(row["angkatan"]),
            "departemen": row["departemen"],
            "prodi": row["prodi"],
            "wb_score": float(wb),
            "acd_score": float(acd),
            "soc_score": float(soc),
            "car_score": float(car),
            "profile": p_id,
            "pca_x": round(float(coords[i, 0]), 3),
            "pca_y": round(float(coords[i, 1]), 3)
        })

    # Cetak ringkasan distribusi profil baru
    profile_counts = pd.Series([r["profile"] for r in records]).value_counts().sort_index()
    print("[*] Distribusi Profil LPA-GMM untuk data baru:")
    for pid, cnt in profile_counts.items():
        p_name = next((p["name"] for p in profiles if p["profile_id"] == pid), f"Profil {pid}")
        print(f"    - Profil {pid} ({p_name}): {cnt} mahasiswa")

    # 4. Upload ke Supabase student_surveys
    uploaded = upload_to_supabase(records)
    print(f"[SUCCESS] {uploaded} data responden baru berhasil diunggah ke Supabase!")

    # 5. Pindahkan file ke folder processed
    os.makedirs(PROCESSED_INCOMING_DIR, exist_ok=True)
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_name = f"{ts}_{os.path.basename(file_path)}"
    dest_path = os.path.join(PROCESSED_INCOMING_DIR, dest_name)
    shutil.move(file_path, dest_path)
    print(f"[*] File telah diarsipkan ke: data/incoming/processed/{dest_name}")

    return len(records)


def main():
    os.makedirs(INCOMING_DIR, exist_ok=True)
    os.makedirs(PROCESSED_INCOMING_DIR, exist_ok=True)

    target_files = []
    if len(sys.argv) > 1:
        # File spesifik diberikan via CLI
        custom_path = sys.argv[1]
        if os.path.exists(custom_path):
            target_files.append(custom_path)
        else:
            print(f"[!] Error: File '{custom_path}' tidak ditemukan!")
            sys.exit(1)
    else:
        # Cari semua CSV di data/incoming/ (kecuali di dalam subfolder processed)
        for f in os.listdir(INCOMING_DIR):
            full_path = os.path.join(INCOMING_DIR, f)
            if os.path.isfile(full_path) and f.lower().endswith(".csv"):
                target_files.append(full_path)

    if not target_files:
        print("[INFO] Tidak ada file CSV baru di folder 'data/incoming/'.")
        print("Panduan penggunaan:")
        print("1. Taruh file CSV survei baru di: data/incoming/")
        print("2. Jalankan perintah: python scripts/import_new_survey.py")
        sys.exit(0)

    total_all = 0
    for f in target_files:
        total_all += process_incoming_file(f)

    print(f"\n[DONE] Seluruh proses selesai. Total {total_all} responden baru telah masuk ke Supabase.")


if __name__ == "__main__":
    main()
