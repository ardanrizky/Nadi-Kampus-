import json
from pathlib import Path
import pandas as pd

# Path Root Proyek (satu tingkat di atas folder scripts/)
ROOT = Path(__file__).resolve().parents[1]

# Path file input
SENTIMENT_PATH = ROOT / "data" / "outputs_teks" / "nadikampus_sentiment.parquet"
TOPICS_PATH = ROOT / "data" / "outputs_teks" / "nadikampus_topics.parquet"
CORPUS_PATH = ROOT / "data" / "processed" / "nadikampus_corpus_all.parquet"

# Path file output ekspor untuk web dashboard
OUTPUT_JSON = ROOT / "data" / "outputs_teks" / "dashboard_student_voice.json"


def export_student_voice():
    print("Memuat dataset sentimen, topik, dan korpus...")

    if not SENTIMENT_PATH.exists() or not CORPUS_PATH.exists():
        raise FileNotFoundError(
            "File sentiment/corpus tidak ditemukan di data/outputs_teks/ atau data/processed/"
        )

    sentiment_df = pd.read_parquet(SENTIMENT_PATH)
    corpus_df = pd.read_parquet(CORPUS_PATH)

    # 1. Merge data sentimen dengan korpus berdasarkan doc_id
    df = corpus_df.merge(
        sentiment_df[["doc_id", "sentiment", "sentiment_low_conf"]],
        on="doc_id",
        how="inner",
    )

    # 2. Merge data topik (menggunakan kolom 'topic' dan 'topic_label')
    if TOPICS_PATH.exists():
        topics_df = pd.read_parquet(TOPICS_PATH)
        df = df.merge(
            topics_df[["doc_id", "topic", "topic_label"]],
            on="doc_id",
            how="left",
        )

    # 3. Filter hanya data konfidensi tinggi untuk Donut Chart
    valid_df = df[df["sentiment_low_conf"] == False]

    # 4. Ringkasan persentase sentimen per sumber (Telegram vs GForm)
    summary = {
        "gform": valid_df[valid_df["source"] == "gform"]["sentiment"]
        .value_counts(normalize=True)
        .round(4)
        .to_dict(),
        "telegram": valid_df[valid_df["source"] == "telegram"]["sentiment"]
        .value_counts(normalize=True)
        .round(4)
        .to_dict(),
        "meta": {
            "total_documents": len(df),
            "valid_high_conf_documents": len(valid_df),
            "low_conf_count": int(df["sentiment_low_conf"].sum()),
        },
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"✅ Ekspor Student Voice berhasil disimpan ke: {OUTPUT_JSON}")


if __name__ == "__main__":
    export_student_voice()