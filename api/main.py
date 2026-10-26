"""
NadiKampus Intelligence Console — API Backend
Endpoints for Higher Education Student Wellbeing Monitoring,
Latent Profile Analysis (LPA via GMM, k=3, model terkunci v1), and Student Analytics.
"""

import datetime
import io
import json
import os
import secrets
import urllib.request
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from api.preprocess import FEATURES

app = FastAPI(
    title="NadiKampus Analytics API",
    description="RESTful API for higher-education student wellbeing monitoring and Latent Profile Analysis (GMM).",
    version="2.1.0"
)

# ---------------------------------------------------------------------------
# Konfigurasi dari environment variable (JANGAN taruh key/password di kode)
#   SUPABASE_URL    contoh: https://xxxx.supabase.co
#   SUPABASE_KEY    key khusus backend
#   ADMIN_PASSWORD  wajib diisi; kalau kosong, upload selalu ditolak
#   CORS_ORIGINS    opsional, daftar domain dipisah koma (default "*")
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = Path(BASE_DIR) / "models"
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "output")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# ---------------------------------------------------------------------------
# Model terkunci v1. Kalau gagal dimuat, server sengaja tidak jalan.
# ---------------------------------------------------------------------------
scaler = joblib.load(MODELS_DIR / "scaler.joblib")
gmm_model = joblib.load(MODELS_DIR / "gmm_k3_diag.joblib")
meta = json.loads((MODELS_DIR / "model_meta.json").read_text())

# komponen mentah GMM -> nomor profile (1 = skor terendah, 3 = tertinggi)
RAW_TO_PROFILE = {i: int(r) + 1 for i, r in enumerate(meta["component_to_profile_rank"])}
MODEL_VERSION = "v1-diag-k3-n149"
assert meta["features"] == FEATURES, "Urutan fitur di model_meta.json beda dengan preprocess.py"
print(f"Model {MODEL_VERSION} dimuat")


def label_profile(wb: float, acd: float, soc: float, car: float) -> int:
    """Beri label profile dengan model terkunci (tanpa fit ulang)."""
    X = pd.DataFrame([[wb, acd, soc, car]], columns=FEATURES)
    raw = int(gmm_model.predict(scaler.transform(X))[0])
    return RAW_TO_PROFILE[raw]


def supa_get(path: str, timeout: int = 5):
    """GET ke Supabase REST API memakai key dari environment."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_KEY belum diset")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# Enable CORS for frontend consumption
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,   # tidak memakai cookie; credentials + "*" ditolak browser
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model_version": MODEL_VERSION}


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

# Definisi metadata 3 Profil LPA-GMM (v1). Skor centroid dan label dibaca dari models/*.json
PROFILE_METADATA = [
    {
        "profile_id": 1,
        "key": "p1",
        "name": "",
        "short": "",
        "color": "#E11D48",
        "scores_likert": {},
        "description": "Kelompok dengan skor relatif paling rendah pada dimensi wellbeing, akademik, dan karier.",
        "recommendation": "Pendampingan akademik intensif, layanan konseling, dan bimbingan karier."
    },
    {
        "profile_id": 2,
        "key": "p2",
        "name": "",
        "short": "",
        "color": "#6366F1",
        "scores_likert": {},
        "description": "Kelompok dengan skor menengah pada seluruh dimensi.",
        "recommendation": "Workshop manajemen stres dan pengembangan keterampilan penunjang."
    },
    {
        "profile_id": 3,
        "key": "p3",
        "name": "",
        "short": "",
        "color": "#0D9488",
        "scores_likert": {},
        "description": "Kelompok dengan skor relatif paling tinggi, termasuk dukungan sosial yang sangat kuat.",
        "recommendation": "Pemberdayaan sebagai peer mentor dan fasilitasi program kepemimpinan/magang."
    }
]

_CENTROIDS = json.loads((MODELS_DIR / "centroids.json").read_text())["profiles"]
_SCORE_KEY = {"WB_Score": "wellbeing", "ACD_Score": "academic", "SOC_Score": "social", "CAR_Score": "career"}
_LABEL = {1: "Skor relatif terendah", 2: "Skor menengah", 3: "Skor relatif tertinggi"}
for _p in PROFILE_METADATA:
    _pid = _p["profile_id"]
    _p["name"] = _LABEL[_pid]
    _p["short"] = f"Profil {_pid}: {_LABEL[_pid]}"
    _p["scores_likert"] = {_SCORE_KEY[k]: v for k, v in _CENTROIDS[str(_pid)].items()}


@app.get("/api/v1/profiles")
def get_profiles():
    """Mengembalikan metadata 3 Profil LPA-GMM terkunci."""
    return {
        "model_version": MODEL_VERSION,
        "total_profiles": len(PROFILE_METADATA),
        "profiles": PROFILE_METADATA
    }


class PredictStudentProfileRequest(BaseModel):
    wellbeing: float = Field(..., ge=0, le=100)
    academic: float = Field(..., ge=0, le=100)
    social: float = Field(..., ge=0, le=100)
    career: float = Field(..., ge=0, le=100)


@app.get("/api/v1/respondents")
def get_respondents():
    """Mengembalikan sebaran seluruh responden riil (dari Supabase / fallback local) dengan koordinat PCA dan prodi."""
    # 1. Coba ambil data live dari Supabase
    try:
        data = supa_get("student_surveys?select=*&order=id.asc", timeout=3)
        if data:
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

    # 2. Fallback ke CSV lokal jika offline (hanya aktif di lokal; di Render folder data/ tidak ada)
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
    Memprediksi profil mahasiswa menggunakan model GMM/LPA terkunci (v1).
    Input: skor rata-rata WB, ACD, SOC, CAR pada skala 1-5 atau 0-100.
    """
    try:
        wb = req.wellbeing / 20.0 if req.wellbeing > 5.0 else req.wellbeing
        acd = req.academic / 20.0 if req.academic > 5.0 else req.academic
        soc = req.social / 20.0 if req.social > 5.0 else req.social
        car = req.career / 20.0 if req.career > 5.0 else req.career
        assigned_profile_id = label_profile(wb, acd, soc, car)
        matched_profile = next(p for p in PROFILE_METADATA if p["profile_id"] == assigned_profile_id)

        return {
            "assigned_profile": matched_profile["profile_id"],
            "name": matched_profile["name"],
            "short_title": matched_profile["short"],
            "color": matched_profile["color"],
            "profile_summary": matched_profile["description"],
            "recommended_intervention": matched_profile["recommendation"],
            "model_version": MODEL_VERSION
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan prediksi model: {str(e)}")


@app.get("/api/v1/survey-stats")
def get_survey_stats():
    """Mengembalikan statistik data responden di Supabase."""
    try:
        data = supa_get("student_surveys?select=id,profile,prodi")
        profiles_cnt = {1: 0, 2: 0, 3: 0}
        prodi_set = set()
        for r in data:
            p = int(r.get("profile", 0))
            if p in profiles_cnt:
                profiles_cnt[p] += 1
            prodi_set.add(r.get("prodi", ""))
        return {
            "total_respondents": len(data),
            "total_prodi": len(prodi_set),
            "profiles_distribution": profiles_cnt,
            "status": "connected"
        }
    except Exception:
        # Jangan menampilkan angka karangan saat database tidak terhubung
        return {
            "total_respondents": 0,
            "total_prodi": 0,
            "profiles_distribution": {1: 0, 2: 0, 3: 0},
            "status": "unavailable",
            "error": "Database tidak dapat dihubungi"
        }


PCA_VIZ_PATH = MODELS_DIR / "pca_viz.joblib"


def _get_pca(fit_pca_model):
    """PCA hanya untuk koordinat scatter dashboard (bukan bagian LPA).
    Pakai file tersimpan kalau ada; kalau tidak, fit dari data lokal seperti sebelumnya."""
    if PCA_VIZ_PATH.exists():
        return joblib.load(PCA_VIZ_PATH)
    return fit_pca_model()


@app.post("/api/v1/import-survey")
async def import_survey_endpoint(
    file: UploadFile = File(...),
    password: str = Form(...)
):
    """
    Endpoint aman untuk upload CSV kuesioner baru.
    Hanya dapat diakses dengan kata sandi admin (environment variable ADMIN_PASSWORD).
    Label profile dihitung dengan model terkunci, tanpa fit ulang.
    """
    if not ADMIN_PASSWORD or not secrets.compare_digest(password.encode(), ADMIN_PASSWORD.encode()):
        raise HTTPException(status_code=401, detail="Kata sandi admin salah! Akses ditolak.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Format file harus berupa CSV (.csv)!")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File CSV kosong.")

    csv_buffer = io.BytesIO(content)

    try:
        from scripts.import_new_survey import (
            clean_and_parse_survey_csv,
            fit_pca_model,
            get_current_max_respondent_id,
            upload_to_supabase
        )

        df_clean = clean_and_parse_survey_csv(csv_buffer)
        if len(df_clean) == 0:
            raise HTTPException(status_code=400, detail="Tidak ada baris data valid yang terbaca dalam CSV.")
        df_clean = df_clean.reset_index(drop=True)

        pca = _get_pca(fit_pca_model)
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
            p_id = label_profile(wb, acd, soc, car)

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

        # Arsipkan salinan file (hanya berguna di lokal; gagal menyimpan tidak membatalkan upload)
        try:
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            processed_dir = os.path.join(BASE_DIR, "data", "incoming", "processed")
            os.makedirs(processed_dir, exist_ok=True)
            with open(os.path.join(processed_dir, f"{ts}_web_{file.filename}"), "wb") as f_out:
                f_out.write(content)
        except OSError:
            pass

        # Distribusi profil baru
        prof_counts = pd.Series([r["profile"] for r in records]).value_counts().to_dict()
        breakdown = {str(k): int(v) for k, v in prof_counts.items()}

        return {
            "success": True,
            "filename": file.filename,
            "model_version": MODEL_VERSION,
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