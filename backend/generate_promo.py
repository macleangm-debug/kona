import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration

def generate_kona_promo():
    """Generate promotional video for Kona streaming app"""
    
    prompt = """
    A sleek, modern streaming app interface on a smartphone and laptop screen. 
    The screens display a Netflix-style grid of dramatic mini-series thumbnails with 
    romantic and thriller themes. The interface has a dark theme with purple accent colors.
    Coins and rewards icons float around showing gamification features.
    Smooth transitions between screens showing episode selection, video player, and rewards page.
    Professional, cinematic quality with subtle animations and glowing UI elements.
    Text overlay: "KONA - Stream Mini-Series" appearing elegantly.
    Modern, premium feel like Netflix or Disney+ promotional material.
    """
    
    print("🎬 Starting Kona promo video generation...")
    print("⏳ This may take 3-5 minutes...")
    
    video_gen = OpenAIVideoGeneration(api_key=os.environ['EMERGENT_LLM_KEY'])
    
    video_bytes = video_gen.text_to_video(
        prompt=prompt,
        model="sora-2",
        size="1280x720",   # HD widescreen format
        duration=8,        # 8 seconds
        max_wait_time=600
    )
    
    if video_bytes:
        output_path = '/app/frontend/public/kona_promo.mp4'
        video_gen.save_video(video_bytes, output_path)
        print(f'✅ Video saved to: {output_path}')
        return output_path
    else:
        print('❌ Video generation failed')
        return None

if __name__ == "__main__":
    result = generate_kona_promo()
    if result:
        print(f"\n📥 Download URL: https://auth-location-beta.preview.emergentagent.com/kona_promo.mp4")
