import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration

def generate_user_promo():
    """Generate promotional video for Kona users/viewers"""
    
    prompt = """
    Cinematic montage of a young person enjoying mini-series on their smartphone.
    The phone screen shows dramatic romantic and thriller scenes from short-form series.
    Golden coins and reward animations pop up as they watch.
    The viewer swipes through a beautiful dark-themed app interface with glowing purple accents.
    Cut to the person winning rewards, scratching a digital scratch card, celebrating small wins.
    Cozy atmosphere - someone binge-watching on a couch, on a bus, in bed at night.
    The interface shows "Episode Unlocked!" and "You earned coins!" notifications.
    Modern, vibrant, Gen-Z aesthetic. Fast cuts, engaging visuals.
    Text overlay fading in: "KONA - Binge. Win. Repeat."
    Premium streaming service advertisement quality.
    """
    
    print("🎬 Starting Kona USER promo video generation...")
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
        output_path = '/app/frontend/public/kona_user_promo.mp4'
        video_gen.save_video(video_bytes, output_path)
        print(f'✅ Video saved to: {output_path}')
        return output_path
    else:
        print('❌ Video generation failed')
        return None

if __name__ == "__main__":
    result = generate_user_promo()
    if result:
        print(f"\n📥 Download URL: https://kona-video-fix.preview.emergentagent.com/kona_user_promo.mp4")
