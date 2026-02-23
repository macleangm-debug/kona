import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart2, MessageCircle, Plus, Loader2, Check, ThumbsUp,
  Clock, Users, ChevronRight, Send, Pin, Trash2, X,
  HelpCircle, Vote, Calendar, Eye, EyeOff, ListChecks
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const POLL_TYPES = {
  multiple_choice: { label: "Multiple Choice", icon: ListChecks },
  yes_no: { label: "Yes/No", icon: Check },
  rating: { label: "1-5 Rating", icon: BarChart2 }
};

export const FanPollsQA = ({ token, series = [] }) => {
  const [polls, setPolls] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("polls");
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState("");
  
  // Poll creation form
  const [pollForm, setPollForm] = useState({
    question: "",
    poll_type: "multiple_choice",
    options: ["", ""],
    series_id: "",
    allow_multiple_votes: false,
    show_results_before_vote: false,
    pinned: false
  });

  const fetchPolls = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/polls/creator/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPolls(res.data.polls || []);
    } catch (e) {
      console.error("Error fetching polls:", e);
    }
  }, [token]);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/polls/qa/creator/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuestions(res.data.questions || []);
    } catch (e) {
      console.error("Error fetching questions:", e);
    }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchPolls(), fetchQuestions()]);
      setLoading(false);
    };
    init();
  }, [fetchPolls, fetchQuestions]);

  const handleCreatePoll = async () => {
    if (!pollForm.question || pollForm.question.length < 5) {
      toast.error("Question must be at least 5 characters");
      return;
    }
    
    if (pollForm.poll_type === "multiple_choice") {
      const validOptions = pollForm.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        toast.error("Add at least 2 options");
        return;
      }
    }
    
    try {
      await axios.post(`${API}/polls/`, {
        ...pollForm,
        options: pollForm.options.filter(o => o.trim()),
        series_id: pollForm.series_id || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Poll created!");
      setShowCreatePoll(false);
      resetPollForm();
      fetchPolls();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create poll");
    }
  };

  const handleClosePoll = async (pollId) => {
    try {
      await axios.patch(`${API}/polls/${pollId}`, {
        status: "closed"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Poll closed");
      fetchPolls();
    } catch (e) {
      toast.error("Failed to close poll");
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!confirm("Delete this poll?")) return;
    
    try {
      await axios.delete(`${API}/polls/${pollId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Poll deleted");
      fetchPolls();
    } catch (e) {
      toast.error("Failed to delete poll");
    }
  };

  const handleTogglePin = async (pollId, currentPinned) => {
    try {
      await axios.patch(`${API}/polls/${pollId}`, {
        pinned: !currentPinned
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(currentPinned ? "Unpinned" : "Pinned to top");
      fetchPolls();
    } catch (e) {
      toast.error("Failed to update poll");
    }
  };

  const handleAnswerQuestion = async (questionId, answer) => {
    if (!answer.trim()) {
      toast.error("Please enter an answer");
      return;
    }
    
    try {
      await axios.post(`${API}/polls/qa/${questionId}/answer`, {
        answer
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Question answered!");
      fetchQuestions();
    } catch (e) {
      toast.error("Failed to answer question");
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm("Delete this question?")) return;
    
    try {
      await axios.delete(`${API}/polls/qa/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Question deleted");
      fetchQuestions();
    } catch (e) {
      toast.error("Failed to delete question");
    }
  };

  const resetPollForm = () => {
    setPollForm({
      question: "",
      poll_type: "multiple_choice",
      options: ["", ""],
      series_id: "",
      allow_multiple_votes: false,
      show_results_before_vote: false,
      pinned: false
    });
  };

  const addOption = () => {
    if (pollForm.options.length < 10) {
      setPollForm({ ...pollForm, options: [...pollForm.options, ""] });
    }
  };

  const removeOption = (index) => {
    if (pollForm.options.length > 2) {
      const newOptions = pollForm.options.filter((_, i) => i !== index);
      setPollForm({ ...pollForm, options: newOptions });
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...pollForm.options];
    newOptions[index] = value;
    setPollForm({ ...pollForm, options: newOptions });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Vote className="w-6 h-6 text-primary" />
            Fan Polls & Q&A
          </h2>
          <p className="text-sm text-muted-foreground">
            Engage with your audience through polls and answer their questions
          </p>
        </div>
        <Button onClick={() => setShowCreatePoll(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Poll
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <BarChart2 className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold">{polls.length}</p>
            <p className="text-xs text-muted-foreground">Total Polls</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold">{polls.reduce((sum, p) => sum + p.total_votes, 0)}</p>
            <p className="text-xs text-muted-foreground">Total Votes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold">{questions.length}</p>
            <p className="text-xs text-muted-foreground">Pending Questions</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <Check className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-2xl font-bold">{polls.filter(p => p.status === "active").length}</p>
            <p className="text-xs text-muted-foreground">Active Polls</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="polls">
            <BarChart2 className="w-4 h-4 mr-2" />
            My Polls ({polls.length})
          </TabsTrigger>
          <TabsTrigger value="questions">
            <MessageCircle className="w-4 h-4 mr-2" />
            Fan Questions ({questions.length})
          </TabsTrigger>
        </TabsList>

        {/* Polls Tab */}
        <TabsContent value="polls" className="mt-4">
          {polls.length > 0 ? (
            <div className="space-y-4">
              {polls.map((poll) => (
                <Card key={poll.id} className="bg-card border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {poll.pinned && (
                            <Pin className="w-4 h-4 text-yellow-400" />
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            poll.status === "active" 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-gray-500/20 text-gray-400"
                          }`}>
                            {poll.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {POLL_TYPES[poll.poll_type]?.label}
                          </span>
                        </div>
                        <h3 className="font-medium">{poll.question}</h3>
                        {poll.series_title && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Series: {poll.series_title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleTogglePin(poll.id, poll.pinned)}
                        >
                          <Pin className={`w-4 h-4 ${poll.pinned ? "text-yellow-400" : ""}`} />
                        </Button>
                        {poll.status === "active" && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleClosePoll(poll.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-400"
                          onClick={() => handleDeletePoll(poll.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-2">
                      {poll.options?.map((option) => (
                        <div key={option.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{option.text}</span>
                            <span className="text-muted-foreground">
                              {option.votes} votes ({option.vote_percentage || 0}%)
                            </span>
                          </div>
                          <Progress 
                            value={option.vote_percentage || 0} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {poll.total_votes} total votes
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(poll.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-12 text-center">
                <BarChart2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-2">No Polls Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first poll to engage with your audience
                </p>
                <Button onClick={() => setShowCreatePoll(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Poll
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="mt-4">
          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((q) => (
                <QuestionCard 
                  key={q.id} 
                  question={q} 
                  onAnswer={handleAnswerQuestion}
                  onDelete={handleDeleteQuestion}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-12 text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-2">No Pending Questions</h3>
                <p className="text-sm text-muted-foreground">
                  When fans ask questions on your series, they'll appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Poll Dialog */}
      <Dialog open={showCreatePoll} onOpenChange={setShowCreatePoll}>
        <DialogContent className="max-w-lg bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Create Poll
            </DialogTitle>
            <DialogDescription>
              Ask your fans a question and see what they think
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Question */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Question</label>
              <textarea
                value={pollForm.question}
                onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                placeholder="What do you want to ask your fans?"
                className="w-full h-20 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none"
              />
            </div>

            {/* Poll Type */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Poll Type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(POLL_TYPES).map(([type, { label, icon: Icon }]) => (
                  <button
                    key={type}
                    onClick={() => setPollForm({ ...pollForm, poll_type: type })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      pollForm.poll_type === type
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    <p className="text-xs">{label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Options (for multiple choice) */}
            {pollForm.poll_type === "multiple_choice" && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Options</label>
                <div className="space-y-2">
                  {pollForm.options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="bg-secondary/50 border-white/10"
                      />
                      {pollForm.options.length > 2 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeOption(i)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollForm.options.length < 10 && (
                    <Button variant="outline" size="sm" onClick={addOption}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Option
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Series Selection */}
            {series.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Link to Series (optional)
                </label>
                <select
                  value={pollForm.series_id}
                  onChange={(e) => setPollForm({ ...pollForm, series_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10"
                >
                  <option value="">All fans (no specific series)</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Settings */}
            <div className="space-y-3 p-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Allow multiple votes</span>
                </div>
                <input
                  type="checkbox"
                  checked={pollForm.allow_multiple_votes}
                  onChange={(e) => setPollForm({ ...pollForm, allow_multiple_votes: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Show results before voting</span>
                </div>
                <input
                  type="checkbox"
                  checked={pollForm.show_results_before_vote}
                  onChange={(e) => setPollForm({ ...pollForm, show_results_before_vote: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Pin to top</span>
                </div>
                <input
                  type="checkbox"
                  checked={pollForm.pinned}
                  onChange={(e) => setPollForm({ ...pollForm, pinned: e.target.checked })}
                  className="w-4 h-4"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreatePoll(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreatePoll}>
                <Plus className="w-4 h-4 mr-2" />
                Create Poll
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Question Card Component
const QuestionCard = ({ question, onAnswer, onDelete }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [answer, setAnswer] = useState("");

  return (
    <Card className="bg-card border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-sm">{question.username}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(question.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ThumbsUp className="w-3 h-3" />
              {question.upvotes}
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-red-400"
              onClick={() => onDelete(question.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm mb-3">{question.question}</p>

        {!showAnswer ? (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowAnswer(true)}
          >
            <Send className="w-4 h-4 mr-2" />
            Answer
          </Button>
        ) : (
          <div className="space-y-2">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer..."
              className="w-full h-20 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none text-sm"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowAnswer(false);
                  setAnswer("");
                }}
              >
                Cancel
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  onAnswer(question.id, answer);
                  setShowAnswer(false);
                  setAnswer("");
                }}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Answer
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FanPollsQA;
