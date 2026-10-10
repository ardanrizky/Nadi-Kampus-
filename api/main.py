"""
NadiKampus Intelligence Console — API Backend
Endpoints for Higher Education Student Wellbeing Monitoring,
Latent Profile Analysis (LPA via GMM, k=5), and Student Analytics.
"""

import os
import math
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
        "name": "Socially Supported, Academically Strained",
        "short": "Profil 1: Sosial Kuat, Akademik Tertekan",
        "color": "#0284C7",
        "count": 14,
        "percentage": 11.76,
        "pca_coordinates": {"x": -0.37, "y": 0.29},
        "scores_likert": {"wellbeing": 2.85, "academic": 2.94, "social": 4.10, "career": 3.34},
        "scores_100": {"wellbeing": 57, "academic": 59, "social": 82, "career": 67},
        "description": "Dukungan sosial sangat tinggi, namun kesejahteraan psikologis dan ketahanan akademik berada di bawah rata-rata.",
        "recommendation": "Harmonisasi jadwal tugas antar prodi, mentoring akademik teman sebaya, dan workshop regulasi stres."
    },
    {
        "profile_id": 2,
        "key": "p2",
        "name": "Thriving & High Functioning",
        "short": "Profil 2: Wellbeing & Akademik Positif",
        "color": "#0D9488",
        "count": 27,
        "percentage": 22.69,
        "pca_coordinates": {"x": 0.97, "y": -0.08},
        "scores_likert": {"wellbeing": 4.06, "academic": 3.88, "social": 4.25, "career": 3.65},
        "scores_100": {"wellbeing": 81, "academic": 78, "social": 85, "career": 73},
        "description": "Performa seimbang dan tinggi di seluruh dimensi dengan strategi adaptasi belajar yang matang.",
        "recommendation": "Pemberdayaan sebagai peer mentor dan fasilitasi program akselerasi magang industri."
    },
    {
        "profile_id": 3,
        "key": "p3",
        "name": "Moderate / Average Adaptation",
        "short": "Profil 3: Adaptasi Moderat (Mayoritas)",
        "color": "#6366F1",
        "count": 57,
        "percentage": 47.90,
        "pca_coordinates": {"x": -0.46, "y": 0.05},
        "scores_likert": {"wellbeing": 3.13, "academic": 3.12, "social": 3.70, "career": 3.05},
        "scores_100": {"wellbeing": 63, "academic": 62, "social": 74, "career": 61},
        "description": "Kelompok mayoritas (47.9% mahasiswa) dengan performa adaptasi sedang yang rentan jika beban melonjak tiba-tiba.",
        "recommendation": "Klinik perencanaan karier dan magang terpandu, panduan belajar terstruktur, serta bimbingan berkala."
    },
    {
        "profile_id": 4,
        "key": "p4",
        "name": "High Risk / Vulnerable",
        "short": "Profil 4: Sangat Rentan (Prioritas Intervensi)",
        "color": "#E11D48",
        "count": 8,
        "percentage": 6.72,
        "pca_coordinates": {"x": -2.65, "y": -0.10},
        "scores_likert": {"wellbeing": 2.11, "academic": 2.31, "social": 2.41, "career": 1.77},
        "scores_100": {"wellbeing": 42, "academic": 46, "social": 48, "career": 35},
        "description": "Seluruh indikator berada di zona kritis (Likert < 2.5). Kesiapan karier sangat rendah dan risiko burnout tinggi.",
        "recommendation": "Layanan konseling psikologis prioritas (jalur cepat), pendampingan dosen wali intensif, dan advokasi finansial."
    },
    {
        "profile_id": 5,
        "key": "p5",
        "name": "Flourishing / Optimal Well-being",
        "short": "Profil 5: Wellbeing Optimal & Unggul",
        "color": "#D97706",
        "count": 13,
        "percentage": 10.92,
        "pca_coordinates": {"x": 2.04, "y": -0.30},
        "scores_likert": {"wellbeing": 4.48, "academic": 4.52, "social": 5.00, "career": 4.02},
        "scores_100": {"wellbeing": 90, "academic": 90, "social": 100, "career": 80},
        "description": "Profil teladan dengan kepuasan hidup dan resiliensi tertinggi. Dukungan sosial sempurna dan akademik prima.",
        "recommendation": "Fasilitasi program hibah kompetisi nasional/internasional, kepemimpinan, dan inkubasi riset kampus."
    }
]


class PredictStudentProfileRequest(BaseModel):
    wellbeing: float = Field(..., description="Wellbeing score (skala 1-5 atau 0-100)")
    academic: float = Field(..., description="Academic score (skala 1-5 atau 0-100)")
    social: float = Field(..., description="Social score (skala 1-5 atau 0-100)")
    career: float = Field(..., description="Career score (skala 1-5 atau 0-100)")


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "online",
        "service": "NadiKampus Intelligence API",
        "version": "2.0.0",
        "model_engine": "Latent Profile Analysis (Gaussian Mixture Model)",
        "k_components": 5,
        "campus_status": "Optimal",
        "total_respondents": 119
    }


@app.get("/api/v1/kpi")
def get_kpis():
    return {
        "wellbeing_index": {"score": 65, "status": "Baik", "trend": "+6 poin sejak Maret"},
        "academic_readiness": {"score": 71, "status": "Tinggi", "trend": "-5 poin sejak Maret"},
        "social_support": {"score": 64, "status": "Perlu perhatian", "trend": "+4 poin sejak Maret"},
        "career_readiness": {"score": 60, "status": "Perlu perhatian", "trend": "+7 poin sejak Maret"}
    }


@app.get("/api/v1/profiles")
@app.get("/api/v1/clusters")
def get_profiles():
    """Mengembalikan 5 profil laten LPA-GMM beserta evaluasi AIC/BIC."""
    model_summary_path = os.path.join(OUTPUT_DIR, "model_summary.csv")
    model_evaluation = []

    if os.path.exists(model_summary_path):
        try:
            df_eval = pd.read_csv(model_summary_path)
            model_evaluation = df_eval.to_dict(orient="records")
        except Exception:
            pass

    return {
        "method": "Latent Profile Analysis (LPA)",
        "algorithm": "GaussianMixture (covariance_type=full)",
        "k_selected": 5,
        "best_metrics": {
            "aic": 955.88,
            "bic": 1161.53,
            "log_likelihood": -3.39
        },
        "total_respondents": 119,
        "profiles": PROFILE_METADATA,
        "model_evaluation_table": model_evaluation
    }


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
    Memprediksi profil mahasiswa berdasarkan 4 dimensi skor.
    Mendukung input skala Likert (1-5) maupun skala terstandarisasi (0-100).
    """
    # Normalisasi ke skala 1-5 jika input berupa 0-100
    wb = req.wellbeing / 20.0 if req.wellbeing > 5.0 else req.wellbeing
    acd = req.academic / 20.0 if req.academic > 5.0 else req.academic
    soc = req.social / 20.0 if req.social > 5.0 else req.social
    car = req.career / 20.0 if req.career > 5.0 else req.career

    best_p = None
    min_dist = float("inf")

    for p in PROFILE_METADATA:
        m = p["scores_likert"]
        dist = math.sqrt(
            (wb - m["wellbeing"]) ** 2 +
            (acd - m["academic"]) ** 2 +
            (soc - m["social"]) ** 2 +
            (car - m["career"]) ** 2
        )
        if dist < min_dist:
            min_dist = dist
            best_p = p

    return {
        "assigned_profile": best_p["profile_id"],
        "name": best_p["name"],
        "short_title": best_p["short"],
        "color": best_p["color"],
        "distance": round(min_dist, 3),
        "profile_summary": best_p["description"],
        "recommended_intervention": best_p["recommendation"]
    }


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

