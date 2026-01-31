"""
Gamification routes - Profit-focused features
- Daily Scratch Card
- Episode Trivia
- Prediction Games
"""
import random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from services import db, get_current_user

router = APIRouter(prefix="/games", tags=["Gamification"])

# ============ SCRATCH CARD CONFIG ============
# Heavily weighted toward low prizes to encourage purchases
SCRATCH_PRIZES = [
    {"value": 1, "label": "1 Coin", "icon": "🪙", "weight": 35},
    {"value": 1, "label": "1 Coin", "icon": "🪙", "weight": 35},  # 70% chance for 1 coin
    {"value": 2, "label": "2 Coins", "icon": "🪙", "weight": 12},
    {"value": 3, "label": "3 Coins", "icon": "🪙", "weight": 5},
    {"value": 5, "label": "5 Coins", "icon": "💰", "weight": 5},
    {"value": 10, "label": "10 Coins", "icon": "💰", "weight": 2},
    {"value": 25, "label": "JACKPOT!", "icon": "🎰", "weight": 1},  # 1% jackpot
]

# ============ TRIVIA CONFIG ============
# Episode trivia questions (sample - would be per-episode in production)
TRIVIA_QUESTIONS_POOL = {
    "general": [
        {
            "question": "What was the main character's name?",
            "options": ["Emma", "Sophie", "Diana", "Lily"],
            "correct": 0,
            "difficulty": "easy"
        },
        {
            "question": "Where did the story take place?",
            "options": ["New York", "London", "Paris", "Tokyo"],
            "correct": 0,
            "difficulty": "easy"
        },
        {
            "question": "What was the key plot twist?",
            "options": ["Secret identity", "Hidden treasure", "Lost sibling", "Time travel"],
            "correct": 0,
            "difficulty": "medium"
        },
        {
            "question": "What emotion best describes the ending?",
            "options": ["Happy", "Sad", "Mysterious", "Hopeful"],
            "correct": 3,
            "difficulty": "easy"
        },
        {
            "question": "What object was important to the story?",
            "options": ["A letter", "A ring", "A photograph", "A key"],
            "correct": 2,
            "difficulty": "medium"
        },
    ]
}

TRIVIA_REWARDS = {
    "correct": 1,      # 1 coin per correct answer
    "perfect_bonus": 2  # +2 bonus for all correct
}

# ============ PREDICTION CONFIG ============
# Prediction options per episode (generic templates)
PREDICTION_TEMPLATES = [
    {
        "question": "What will happen to the main character?",
        "options": ["Find love", "Face betrayal", "Discover a secret", "Make a sacrifice"]
    },
    {
        "question": "How will this episode end?",
        "options": ["Cliffhanger", "Happy resolution", "Plot twist", "Emotional scene"]
    },
    {
        "question": "Who will be the most important character?",
        "options": ["The protagonist", "The love interest", "The villain", "A new character"]
    },
]

PREDICTION_REWARDS = {
    "correct": 3,           # 3 coins for correct prediction
    "streak_bonus": {
        3: 5,               # +5 bonus for 3 in a row
        5: 10,              # +10 bonus for 5 in a row
        10: 25              # +25 bonus for 10 in a row
    }
}


# ============ SCRATCH CARD ENDPOINTS ============
@router.get("/scratch-card/status")
async def get_scratch_card_status(user: dict = Depends(get_current_user)):
    """Check if user can scratch a card today"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    last_scratch_date = user.get("last_scratch_date")
    episodes_watched_today = user.get("episodes_watched_today", 0)
    last_watch_date = user.get("last_watch_date", "")
    
    # Reset if not watched today
    if last_watch_date != today:
        episodes_watched_today = 0
    
    # Can scratch if: watched at least 1 episode today AND haven't scratched today
    has_watched = episodes_watched_today >= 1
    already_scratched = last_scratch_date == today
    can_scratch = has_watched and not already_scratched
    
    return {
        "can_scratch": can_scratch,
        "already_scratched": already_scratched,
        "has_watched_today": has_watched,
        "episodes_watched_today": episodes_watched_today,
        "last_scratch_date": last_scratch_date,
        "message": "Watch an episode to unlock today's scratch card!" if not has_watched else 
                   "Already scratched today!" if already_scratched else 
                   "Scratch card ready!"
    }


@router.post("/scratch-card/scratch")
async def scratch_card(user: dict = Depends(get_current_user)):
    """Scratch the daily card and win a prize"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    last_scratch_date = user.get("last_scratch_date")
    episodes_watched_today = user.get("episodes_watched_today", 0)
    last_watch_date = user.get("last_watch_date", "")
    
    # Reset if not watched today
    if last_watch_date != today:
        episodes_watched_today = 0
    
    # Validate eligibility
    if episodes_watched_today < 1:
        raise HTTPException(status_code=400, detail="Watch at least 1 episode to scratch!")
    
    if last_scratch_date == today:
        raise HTTPException(status_code=400, detail="Already scratched today! Come back tomorrow.")
    
    # Generate scratch card grid (3x3)
    weights = [p["weight"] for p in SCRATCH_PRIZES]
    grid = []
    for _ in range(9):
        prize = random.choices(SCRATCH_PRIZES, weights=weights, k=1)[0]
        grid.append(prize)
    
    # Determine winning combination (check rows, cols, diagonals)
    def check_win(indices):
        values = [grid[i]["value"] for i in indices]
        if values[0] == values[1] == values[2]:
            return values[0]
        return None
    
    winning_lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],  # rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8],  # cols
        [0, 4, 8], [2, 4, 6]              # diagonals
    ]
    
    # Find best winning line
    best_win = 0
    winning_indices = None
    for line in winning_lines:
        win_value = check_win(line)
        if win_value and win_value > best_win:
            best_win = win_value
            winning_indices = line
    
    # If no natural win, give minimum prize (1 coin) with 70% chance
    if best_win == 0:
        if random.random() < 0.7:
            best_win = 1
        else:
            best_win = random.choices([2, 3], weights=[70, 30], k=1)[0]
    
    # Award prize
    new_coins = user["coins"] + best_win
    total_scratched = user.get("total_scratch_wins", 0) + best_win
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "coins": new_coins,
            "last_scratch_date": today,
            "total_scratch_wins": total_scratched
        }}
    )
    
    return {
        "grid": [{"value": p["value"], "label": p["label"], "icon": p["icon"]} for p in grid],
        "prize": best_win,
        "winning_indices": winning_indices,
        "new_balance": new_coins,
        "is_jackpot": best_win >= 25,
        "message": f"🎉 JACKPOT! You won {best_win} coins!" if best_win >= 25 else f"You won {best_win} coins!"
    }


# ============ TRIVIA ENDPOINTS ============
class TriviaAnswers(BaseModel):
    episode_id: str
    answers: List[int]  # Index of selected answer for each question


@router.get("/trivia/{episode_id}")
async def get_trivia_questions(episode_id: str, user: dict = Depends(get_current_user)):
    """Get trivia questions for a completed episode"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    # Check if user has watched this episode
    watched_episodes = user.get("watched_episodes", [])
    if episode_id not in watched_episodes:
        raise HTTPException(status_code=400, detail="Watch the episode first!")
    
    # Check if already completed trivia for this episode today
    trivia_completed = user.get("trivia_completed", {})
    if trivia_completed.get(episode_id) == today:
        raise HTTPException(status_code=400, detail="Already completed trivia for this episode today!")
    
    # Generate 3 random questions
    questions = random.sample(TRIVIA_QUESTIONS_POOL["general"], min(3, len(TRIVIA_QUESTIONS_POOL["general"])))
    
    # Return questions without correct answers
    return {
        "episode_id": episode_id,
        "questions": [
            {
                "id": i,
                "question": q["question"],
                "options": q["options"],
                "difficulty": q["difficulty"]
            }
            for i, q in enumerate(questions)
        ],
        "reward_per_correct": TRIVIA_REWARDS["correct"],
        "perfect_bonus": TRIVIA_REWARDS["perfect_bonus"]
    }


@router.post("/trivia/submit")
async def submit_trivia(data: TriviaAnswers, user: dict = Depends(get_current_user)):
    """Submit trivia answers and get rewards"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    episode_id = data.episode_id
    answers = data.answers
    
    # Check if already completed
    trivia_completed = user.get("trivia_completed", {})
    if trivia_completed.get(episode_id) == today:
        raise HTTPException(status_code=400, detail="Already completed!")
    
    # Get the questions again to check answers
    questions = random.sample(TRIVIA_QUESTIONS_POOL["general"], min(3, len(TRIVIA_QUESTIONS_POOL["general"])))
    
    # Score answers
    correct_count = 0
    results = []
    for i, q in enumerate(questions):
        user_answer = answers[i] if i < len(answers) else -1
        is_correct = user_answer == q["correct"]
        if is_correct:
            correct_count += 1
        results.append({
            "question": q["question"],
            "user_answer": user_answer,
            "correct_answer": q["correct"],
            "is_correct": is_correct
        })
    
    # Calculate rewards
    coins_earned = correct_count * TRIVIA_REWARDS["correct"]
    is_perfect = correct_count == len(questions)
    if is_perfect:
        coins_earned += TRIVIA_REWARDS["perfect_bonus"]
    
    # Update user
    new_coins = user["coins"] + coins_earned
    trivia_completed[episode_id] = today
    total_trivia_correct = user.get("total_trivia_correct", 0) + correct_count
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "coins": new_coins,
            "trivia_completed": trivia_completed,
            "total_trivia_correct": total_trivia_correct
        }}
    )
    
    return {
        "correct_count": correct_count,
        "total_questions": len(questions),
        "coins_earned": coins_earned,
        "is_perfect": is_perfect,
        "new_balance": new_coins,
        "results": results,
        "message": f"Perfect score! +{coins_earned} coins!" if is_perfect else f"You got {correct_count}/{len(questions)} correct! +{coins_earned} coins"
    }


# ============ PREDICTION ENDPOINTS ============
class PredictionSubmit(BaseModel):
    episode_id: str
    prediction_index: int


@router.get("/prediction/streak")
async def get_prediction_streak(user: dict = Depends(get_current_user)):
    """Get user's current prediction streak"""
    streak = user.get("prediction_streak", 0)
    
    # Find next streak bonus
    next_bonus = None
    for streak_count, bonus in sorted(PREDICTION_REWARDS["streak_bonus"].items()):
        if streak < streak_count:
            next_bonus = {"streak": streak_count, "bonus": bonus, "needed": streak_count - streak}
            break
    
    return {
        "current_streak": streak,
        "next_bonus": next_bonus,
        "streak_bonuses": PREDICTION_REWARDS["streak_bonus"]
    }


@router.get("/prediction/{episode_id}")
async def get_prediction(episode_id: str, user: dict = Depends(get_current_user)):
    """Get prediction options for an upcoming episode"""
    # Check if user already made a prediction
    predictions = user.get("predictions", {})
    existing = predictions.get(episode_id)
    
    if existing and existing.get("submitted"):
        return {
            "episode_id": episode_id,
            "already_predicted": True,
            "user_prediction": existing.get("prediction_index"),
            "prediction_text": existing.get("prediction_text"),
            "waiting_for_result": not existing.get("resolved", False),
            "was_correct": existing.get("was_correct"),
            "coins_earned": existing.get("coins_earned", 0)
        }
    
    # Generate prediction question for this episode
    # In production, this would be episode-specific
    template = random.choice(PREDICTION_TEMPLATES)
    
    return {
        "episode_id": episode_id,
        "already_predicted": False,
        "question": template["question"],
        "options": template["options"],
        "reward_if_correct": PREDICTION_REWARDS["correct"],
        "streak_bonuses": PREDICTION_REWARDS["streak_bonus"]
    }


@router.post("/prediction/submit")
async def submit_prediction(data: PredictionSubmit, user: dict = Depends(get_current_user)):
    """Submit a prediction for an episode"""
    episode_id = data.episode_id
    prediction_index = data.prediction_index
    
    predictions = user.get("predictions", {})
    
    # Check if already predicted
    if episode_id in predictions and predictions[episode_id].get("submitted"):
        raise HTTPException(status_code=400, detail="Already made a prediction for this episode!")
    
    # Get the template
    template = random.choice(PREDICTION_TEMPLATES)
    
    if prediction_index < 0 or prediction_index >= len(template["options"]):
        raise HTTPException(status_code=400, detail="Invalid prediction option")
    
    # Save prediction
    predictions[episode_id] = {
        "prediction_index": prediction_index,
        "prediction_text": template["options"][prediction_index],
        "question": template["question"],
        "submitted": True,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "resolved": False
    }
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"predictions": predictions}}
    )
    
    return {
        "success": True,
        "message": "Prediction submitted! Watch the episode to see if you're right.",
        "prediction": template["options"][prediction_index]
    }


@router.post("/prediction/resolve/{episode_id}")
async def resolve_prediction(episode_id: str, user: dict = Depends(get_current_user)):
    """Resolve prediction after watching episode (called when episode completes)"""
    predictions = user.get("predictions", {})
    prediction = predictions.get(episode_id)
    
    if not prediction or not prediction.get("submitted"):
        raise HTTPException(status_code=400, detail="No prediction found for this episode")
    
    if prediction.get("resolved"):
        return {
            "already_resolved": True,
            "was_correct": prediction.get("was_correct"),
            "coins_earned": prediction.get("coins_earned", 0)
        }
    
    # Randomly determine if correct (40% chance - keeps it exciting but controlled)
    # In production, this would be based on actual episode outcomes
    was_correct = random.random() < 0.4
    
    coins_earned = 0
    if was_correct:
        coins_earned = PREDICTION_REWARDS["correct"]
        
        # Check prediction streak
        prediction_streak = user.get("prediction_streak", 0) + 1
        for streak_count, bonus in sorted(PREDICTION_REWARDS["streak_bonus"].items()):
            if prediction_streak == streak_count:
                coins_earned += bonus
                break
    else:
        prediction_streak = 0  # Reset streak
    
    # Update prediction record
    predictions[episode_id]["resolved"] = True
    predictions[episode_id]["was_correct"] = was_correct
    predictions[episode_id]["coins_earned"] = coins_earned
    
    new_coins = user["coins"] + coins_earned
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "predictions": predictions,
            "coins": new_coins,
            "prediction_streak": prediction_streak
        }}
    )
    
    return {
        "was_correct": was_correct,
        "coins_earned": coins_earned,
        "new_balance": new_coins,
        "prediction_streak": prediction_streak,
        "message": f"🎯 Correct! +{coins_earned} coins!" if was_correct else "Not this time! Keep predicting!"
    }


@router.get("/prediction/streak")
async def get_prediction_streak(user: dict = Depends(get_current_user)):
    """Get user's current prediction streak"""
    streak = user.get("prediction_streak", 0)
    
    # Find next streak bonus
    next_bonus = None
    for streak_count, bonus in sorted(PREDICTION_REWARDS["streak_bonus"].items()):
        if streak < streak_count:
            next_bonus = {"streak": streak_count, "bonus": bonus, "needed": streak_count - streak}
            break
    
    return {
        "current_streak": streak,
        "next_bonus": next_bonus,
        "streak_bonuses": PREDICTION_REWARDS["streak_bonus"]
    }


# ============ STREAK SHIELD (PURCHASE WITH COINS) ============
STREAK_SHIELD_COST = 50  # Cost to protect streak

@router.post("/streak/shield")
async def buy_streak_shield(user: dict = Depends(get_current_user)):
    """Buy a streak shield to protect watch streak"""
    coins = user.get("coins", 0)
    
    if coins < STREAK_SHIELD_COST:
        raise HTTPException(
            status_code=400, 
            detail=f"Not enough coins! Need {STREAK_SHIELD_COST}, have {coins}"
        )
    
    # Check if already has shield
    has_shield = user.get("has_streak_shield", False)
    if has_shield:
        raise HTTPException(status_code=400, detail="You already have a streak shield active!")
    
    new_coins = coins - STREAK_SHIELD_COST
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "coins": new_coins,
            "has_streak_shield": True
        }}
    )
    
    return {
        "success": True,
        "message": "Streak Shield activated! Your streak is protected for one missed day.",
        "new_balance": new_coins,
        "cost": STREAK_SHIELD_COST
    }


@router.get("/streak/shield/status")
async def get_shield_status(user: dict = Depends(get_current_user)):
    """Check streak shield status"""
    has_shield = user.get("has_streak_shield", False)
    coins = user.get("coins", 0)
    can_afford = coins >= STREAK_SHIELD_COST
    
    return {
        "has_shield": has_shield,
        "shield_cost": STREAK_SHIELD_COST,
        "can_afford": can_afford,
        "current_coins": coins
    }
