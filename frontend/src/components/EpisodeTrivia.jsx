import React, { useState, useEffect } from "react";
import axios from "axios";
import { Brain, CheckCircle, XCircle, Loader2, Trophy, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API } from "@/config";
import { toast } from "sonner";

export const EpisodeTrivia = ({ token, episodeId, onComplete }) => {
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token && episodeId) fetchQuestions();
  }, [token, episodeId]);

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`${API}/games/trivia/${episodeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(res.data);
      setAnswers(new Array(res.data.questions.length).fill(-1));
    } catch (e) {
      if (e.response?.status === 400) {
        // Already completed or not watched
        setQuestions({ error: e.response.data.detail });
      }
    }
    setLoading(false);
  };

  const selectAnswer = (questionIndex, answerIndex) => {
    if (submitted) return;
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.includes(-1)) {
      toast.error("Please answer all questions!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/games/trivia/submit`, {
        episode_id: episodeId,
        answers: answers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setResult(res.data);
      setSubmitted(true);
      
      if (res.data.is_perfect) {
        toast.success(`🏆 Perfect Score! +${res.data.coins_earned} coins!`);
      } else {
        toast.success(`+${res.data.coins_earned} coins earned!`);
      }
      
      if (onComplete) onComplete(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      </Card>
    );
  }

  if (questions?.error) {
    return (
      <Card className="p-4 bg-gradient-to-br from-gray-500/10 to-gray-600/10 border-gray-500/20">
        <div className="text-center py-4">
          <Brain className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{questions.error}</p>
        </div>
      </Card>
    );
  }

  if (!questions) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-blue-500/20">
          <Brain className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold">Episode Trivia</h3>
          <p className="text-xs text-gray-400">
            Answer correctly to earn coins!
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-gray-400">Reward per correct</p>
          <p className="text-sm font-bold text-yellow-400">+{questions.reward_per_correct} coin</p>
        </div>
      </div>

      {/* Result Banner */}
      {result && (
        <div className={`mb-4 p-4 rounded-lg ${
          result.is_perfect 
            ? "bg-yellow-500/20 border border-yellow-500/30" 
            : "bg-green-500/20 border border-green-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.is_perfect ? (
                <Trophy className="w-6 h-6 text-yellow-400" />
              ) : (
                <Star className="w-6 h-6 text-green-400" />
              )}
              <div>
                <p className="font-bold">
                  {result.is_perfect ? "Perfect Score!" : "Good Job!"}
                </p>
                <p className="text-sm text-gray-400">
                  {result.correct_count}/{result.total_questions} correct
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${result.is_perfect ? "text-yellow-400" : "text-green-400"}`}>
                +{result.coins_earned}
              </p>
              <p className="text-xs text-gray-400">coins</p>
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.questions.map((q, qIndex) => (
          <div key={q.id} className="p-3 rounded-lg bg-white/5">
            <p className="font-medium text-sm mb-3">
              {qIndex + 1}. {q.question}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((option, oIndex) => {
                const isSelected = answers[qIndex] === oIndex;
                const showResult = submitted && result;
                const isCorrect = showResult && result.results[qIndex]?.correct_answer === oIndex;
                const wasUserAnswer = showResult && result.results[qIndex]?.user_answer === oIndex;
                
                let buttonClass = "p-2 rounded-lg text-xs text-left transition-all ";
                
                if (showResult) {
                  if (isCorrect) {
                    buttonClass += "bg-green-500/30 border border-green-500 text-green-300";
                  } else if (wasUserAnswer && !isCorrect) {
                    buttonClass += "bg-red-500/30 border border-red-500 text-red-300";
                  } else {
                    buttonClass += "bg-white/5 border border-white/10 text-gray-400";
                  }
                } else {
                  if (isSelected) {
                    buttonClass += "bg-blue-500/30 border-2 border-blue-400 text-white";
                  } else {
                    buttonClass += "bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300";
                  }
                }
                
                return (
                  <button
                    key={oIndex}
                    onClick={() => selectAnswer(qIndex, oIndex)}
                    disabled={submitted}
                    className={buttonClass}
                  >
                    <div className="flex items-center gap-2">
                      {showResult && isCorrect && (
                        <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      )}
                      {showResult && wasUserAnswer && !isCorrect && (
                        <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                      )}
                      <span>{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      {!submitted && (
        <Button 
          onClick={handleSubmit}
          disabled={submitting || answers.includes(-1)}
          className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Submit Answers
        </Button>
      )}

      {/* Perfect bonus hint */}
      {!submitted && (
        <p className="text-center text-xs text-gray-500 mt-2">
          Get all correct for +{questions.perfect_bonus} bonus coins!
        </p>
      )}
    </Card>
  );
};

export default EpisodeTrivia;
