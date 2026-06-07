from sentence_transformers import SentenceTransformer
import time

print("Attempting to download the language model...")
success = False
attempts = 0

while not success and attempts < 10:
    attempts += 1
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Model downloaded and cached successfully!")
        success = True
    except Exception as e:
        print(f"Attempt {attempts} failed due to network error. Retrying in 3 seconds...")
        time.sleep(3)

if not success:
    print("❌ Failed after 10 attempts. Please check your internet connection.")
