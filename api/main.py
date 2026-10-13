"""
NadiKampus Intelligence Console — API Backend
Endpoints for Higher Education Student Wellbeing Monitoring,
Latent Profile Analysis (LPA via GMM, k=5), and Student Analytics.
"""

import os
import math
import joblib
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd

app = FastAPI(
    title="NadiKampus Analytics API",
    description="RESTful API for higher-education student wellbeing monitoring and Latent Profile Analysis (GMM).",
    version="2.0.0"
)

# Path absolut ke folder models
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# Load scaler dan model GMM yang sudah kita buat
try:
    scaler = joblib.load(MODELS_DIR / "scaler.joblib")
    # Sesuaikan dengan nama file model k=3 atau k=4 milikmu
    gmm_model = joblib.load(MODELS_DIR / "gmm_k3.joblib") 
    print("Model GMM & Scaler berhasil dimuat!")
except Exception as e:
    print(f"Peringatan: Gagal memuat model machine learning: {e}")

# Enable CORS for frontend consumption
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "output")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Sajikan Frontend secara langsung
@app.get("/", include_in_schema=False)
def serve_root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"service": "NadiKampus Intelligence API", "status": "online", "docs": "/docs"}

@app.get("/index.html", include_in_schema=False)
def serve_index_html():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/dashboard.html", include_in_schema=False)
def serve_dashboard():
    return FileResponse(os.path.join(FRONTEND_DIR, "dashboard.html"))

@app.get("/data.html", include_in_schema=False)
def serve_data_page():
    return FileResponse(os.path.join(FRONTEND_DIR, "data.html"))

# Mount CSS & JS statis
if os.path.exists(os.path.join(FRONTEND_DIR, "css")):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
if os.path.exists(os.path.join(FRONTEND_DIR, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")

# Definisi metadata 5 Profil LPA-GMM hasil riset backend
PROFILE_METADATA = [
    {
        "profile_id": 1,
        "key": "p1",
        "name": "Vulnerable / Low Adaptation",
        "short": "Profil 1: Performa Rendah & Butuh Perhatian",
        "color": "#E11D48",
        "scores_likert": {"wellbeing": 2.79, "academic": 2.77, "social": 3.41, "career": 2.93},
        "description": "Kelompok dengan skor di bawah rata-rata pada dimensi wellbeing, akademik, dan karier.",
        "recommendation": "Pendampingan akademik intensif, konseling psikologis, dan bimbingan karier."
    },
    {
        "profile_id": 2,
        "key": "p2",
        "name": "Moderate / Average Adaptation",
        "short": "Profil 2: Adaptasi Sedang (Mayoritas)",
        "color": "#6366F1",
        "scores_likert": {"wellbeing": 3.77, "academic": 3.73, "social": 4.16, "career": 3.58},
        "description": "Kelompok mayoritas dengan performa adaptasi yang stabil dan seimbang.",
        "recommendation": "Workshop manajemen stres dan pengembangan keterampilan penunjang."
    },
    {
        "profile_id": 3,
        "key": "p3",
        "name": "Thriving & High Functioning",
        "short": "Profil 3: Wellbeing & Performa Tinggi",
        "color": "#0D9488",
        "scores_likert": {"wellbeing": 4.59, "academic": 4.59, "social": 5.00, "career": 4.24},
        "description": "Kelompok dengan performa unggul di seluruh dimensi dan dukungan sosial yang sangat kuat.",
        "recommendation": "Pemberdayaan sebagai peer mentor dan fasilitasi program kepemimpinan/magang."
    }
]


@app.get("/api/v1/respondents")
def get_respondents():
    """Mengembalikan sebaran seluruh responden riil (dari Supabase / fallback local) dengan koordinat PCA dan prodi."""
    # 1. Coba ambil data live dari Supabase
    try:
        import urllib.request
        import json
        supa_url = "https://xmabdgvmsljwzrffwvng.supabase.co/rest/v1/student_surveys?select=*&order=id.asc"
        headers = {
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww"
        }
        req = urllib.request.Request(supa_url, headers=headers)
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and len(data) > 0:
                records = []
                for r in data:
                    records.append({
                        "id": r.get("respondent_id"),
                        "profile": int(r.get("profile", 3)),
                        "prodi": str(r.get("prodi", "")),
                        "gender": str(r.get("gender", "")),
                        "semester": str(r.get("semester", "")),
                        "pca_x": float(r.get("pca_x", 0)),
                        "pca_y": float(r.get("pca_y", 0)),
                        "scores": {
                            "wellbeing": float(r.get("wb_score", 0)),
                            "academic": float(r.get("acd_score", 0)),
                            "social": float(r.get("soc_score", 0)),
                            "career": float(r.get("car_score", 0))
                        }
                    })
                return {"total": len(records), "data": records, "source": "supabase"}
    except Exception:
        pass

    # 2. Fallback ke CSV lokal jika offline
    data_lpa_path = os.path.join(PROCESSED_DIR, "data_lpa.csv")
    if os.path.exists(data_lpa_path):
        try:
            df = pd.read_csv(data_lpa_path)
            from sklearn.decomposition import PCA
            cols = ["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"]
            pca = PCA(n_components=2, random_state=42)
            coords = pca.fit_transform(df[cols])
            
            records = []
            for i, r in df.iterrows():
                records.append({
                    "id": f"MHS-{int(r['Profile'])}-{i+1}",
                    "profile": int(r["Profile"]),
                    "prodi": str(r["Program Studi"]),
                    "pca_x": round(float(coords[i, 0]), 2),
                    "pca_y": round(float(coords[i, 1]), 2),
                    "scores": {
                        "wellbeing": round(float(r["WB_Score"]), 2),
                        "academic": round(float(r["ACD_Score"]), 2),
                        "social": round(float(r["SOC_Score"]), 2),
                        "career": round(float(r["CAR_Score"]), 2)
                    }
                })
            return {"total": len(records), "data": records, "source": "local_csv"}
        except Exception as e:
            return {"error": str(e)}

    return {"total": 0, "data": []}

@app.post("/api/v1/predict-profile")
@app.post("/api/v1/predict-cluster")
def predict_profile(req: PredictStudentProfileRequest):
    """
    Memprediksi profil mahasiswa menggunakan model GMM/LPA asli yang telah disimpan.
    """
    try:
        # 1. Masukkan input ke dalam array fitur (urutan harus sama persis saat training: WB, ACD, SOC, CAR)
        features = [[req.wellbeing, req.academic, req.social, req.career]]
        
        # 2. Transformasi pakai scaler
        scaled_features = scaler.transform(features)
        
        # 3. Prediksi pakai GMM
        raw_cluster = int(gmm_model.predict(scaled_features)[0])
        
        # 4. Petakan ke nomor profil (misal ditambah 1 agar jadi 1, 2, 3)
        assigned_profile_id = raw_cluster + 1 
        
        # Cari data metadata profil yang sesuai untuk dikembalikan ke frontend
        matched_profile = next((p for p in PROFILE_METADATA if p["profile_id"] == assigned_profile_id), PROFILE_METADATA[0])

        return {
            "assigned_profile": matched_profile["profile_id"],
            "name": matched_profile["name"],
            "short_title": matched_profile["short"],
            "color": matched_profile["color"],
            "profile_summary": matched_profile["description"],
            "recommended_intervention": matched_profile["recommendation"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan prediksi model: {str(e)}")


ADMIN_DEFAULT_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


@app.get("/api/v1/survey-stats")
def get_survey_stats():
    """Mengembalikan statistik data responden di Supabase."""
    try:
        import urllib.request
        import json
        supa_url = "https://xmabdgvmsljwzrffwvng.supabase.co/rest/v1/student_surveys?select=id,profile,prodi"
        headers = {
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWJkZ3Ztc2xqd3pyZmZ3dm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2NDAyMzEsImV4cCI6MjEwNzIxNjIzMX0.-9rWHxVm72u6IK7oQtULKuqphO8-VxbKfWnS7gOB5Ww"
        }
        req = urllib.request.Request(supa_url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            total = len(data)
            profiles_cnt = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            prodi_set = set()
            for r in data:
                p = int(r.get("profile", 3))
                profiles_cnt[p] = profiles_cnt.get(p, 0) + 1
                prodi_set.add(r.get("prodi", ""))
            return {
                "total_respondents": total,
                "total_prodi": len(prodi_set),
                "profiles_distribution": profiles_cnt,
                "status": "connected"
            }
    except Exception as e:
        return {
            "total_respondents": 122,
            "total_prodi": 18,
            "profiles_distribution": {1: 14, 2: 27, 3: 58, 4: 9, 5: 14},
            "status": "cached",
            "error": str(e)
        }


@app.post("/api/v1/import-survey")
async def import_survey_endpoint(
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    Endpoint aman untuk upload CSV kuesioner baru.
    Hanya dapat diakses dengan kata sandi admin (default: admin123).
    """
    if password != ADMIN_DEFAULT_PASSWORD:
        raise HTTPException(status_code=401, detail="Kata sandi admin salah! Akses ditolak.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Format file harus berupa CSV (.csv)!")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File CSV kosong.")

    import io
    csv_buffer = io.BytesIO(content)

    try:
        from scripts.import_new_survey import (
            clean_and_parse_survey_csv,
            load_lpa_metadata,
            fit_pca_model,
            get_current_max_respondent_id,
            predict_lpa_profile,
            upload_to_supabase
        )

        df_clean = clean_and_parse_survey_csv(csv_buffer)
        if len(df_clean) == 0:
            raise HTTPException(status_code=400, detail="Tidak ada baris data valid yang terbaca dalam CSV.")

        profiles = load_lpa_metadata()
        pca = fit_pca_model()
        last_id_num = get_current_max_respondent_id()

        score_cols = ["wb_score", "acd_score", "soc_score", "car_score"]
        df_pca_input = pd.DataFrame(df_clean[score_cols].values, columns=["WB_Score", "ACD_Score", "SOC_Score", "CAR_Score"])
        coords = pca.transform(df_pca_input)

        records = []
        for i, row in df_clean.iterrows():
            next_num = last_id_num + i + 1
            wb = row["wb_score"]
            acd = row["acd_score"]
            soc = row["soc_score"]
            car = row["car_score"]
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

        # Unggah batch ke Supabase
        uploaded_count = upload_to_supabase(records)

        # Arsipkan salinan file ke folder processed
        import datetime
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        processed_dir = os.path.join(BASE_DIR, "data", "incoming", "processed")
        os.makedirs(processed_dir, exist_ok=True)
        archive_path = os.path.join(processed_dir, f"{ts}_web_{file.filename}")
        with open(archive_path, "wb") as f_out:
            f_out.write(content)

        # Distribusi profil baru
        prof_counts = pd.Series([r["profile"] for r in records]).value_counts().to_dict()
        breakdown = {str(k): int(v) for k, v in prof_counts.items()}

        return {
            "success": True,
            "filename": file.filename,
            "added_count": uploaded_count,
            "previous_total": last_id_num,
            "total_now": last_id_num + uploaded_count,
            "profile_distribution": breakdown,
            "preview": records[:8]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses survei: {str(e)}")

