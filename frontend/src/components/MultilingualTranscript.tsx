import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Languages, 
  Clock, 
  User, 
  Download, 
  Copy, 
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: number;
}

interface Utterance {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
  words: Word[];
}

interface TranscriptionData {
  language: string;
  languageName: string;
  transcript: string;
  confidence: number;
  words: Word[];
  paragraphs: any[];
  utterances: Utterance[];
  metadata?: any;
  error?: string;
}

interface MultilingualTranscriptProps {
  videoId: string;
  onTranscriptionComplete?: (transcriptions: Record<string, TranscriptionData>) => void;
}

const MultilingualTranscript: React.FC<MultilingualTranscriptProps> = ({ 
  videoId, 
  onTranscriptionComplete 
}) => {
  const [transcriptions, setTranscriptions] = useState<Record<string, TranscriptionData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [expandedUtterances, setExpandedUtterances] = useState<Set<number>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);

  const languageNames: Record<string, string> = {
    'en-US': 'English (US)',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'es': 'Spanish',
    'ru': 'Russian',
    'ko': 'Korean',
    'hi': 'Hindi'
  };

  useEffect(() => {
    fetchTranscriptions();
  }, [videoId]);

  const fetchTranscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5174';
      
      const response = await axios.get(
        `${API_BASE_URL}/api/transcription/transcript-multilingual/${videoId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setTranscriptions(response.data.transcriptions || {});
        
        // Set default language to first available
        const availableLanguages = Object.keys(response.data.transcriptions || {});
        if (availableLanguages.length > 0) {
          setSelectedLanguage(availableLanguages[0]);
        }

        if (onTranscriptionComplete) {
          onTranscriptionComplete(response.data.transcriptions || {});
        }
      } else {
        setError(response.data.error || 'Failed to fetch transcriptions');
      }
    } catch (err: any) {
      console.error('Error fetching transcriptions:', err);
      if (err.response?.status === 404) {
        setError('No transcriptions found for this video');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch transcriptions');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const downloadTranscript = (language: string) => {
    const transcription = transcriptions[language];
    if (!transcription) return;

    const content = transcription.transcript;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${language}_${videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleUtterance = (index: number) => {
    const newExpanded = new Set(expandedUtterances);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedUtterances(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-white">Loading transcriptions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <AlertCircle className="w-8 h-8 text-red-500" />
        <span className="ml-3 text-red-400">{error}</span>
      </div>
    );
  }

  const availableLanguages = Object.keys(transcriptions);
  const currentTranscription = transcriptions[selectedLanguage];

  if (availableLanguages.length === 0) {
    return (
      <div className="text-center p-8">
        <Languages className="w-12 h-12 text-white/50 mx-auto mb-4" />
        <p className="text-white/70">No transcriptions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white flex items-center">
          <Languages className="w-6 h-6 mr-3" />
          Video Transcript
        </h3>
        
        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:bg-white/20 focus:border-white/40"
          >
            {availableLanguages.map(lang => (
              <option key={lang} value={lang} className="bg-gray-800">
                {languageNames[lang] || lang}
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={() => copyToClipboard(currentTranscription?.transcript || '')}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            title="Copy transcript"
          >
            {copySuccess ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => downloadTranscript(selectedLanguage)}
            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            title="Download transcript"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center space-x-6">
        <label className="flex items-center space-x-2 text-white/70">
          <input
            type="checkbox"
            checked={showTimestamps}
            onChange={(e) => setShowTimestamps(e.target.checked)}
            className="rounded"
          />
          <span>Show timestamps</span>
        </label>
        
        <label className="flex items-center space-x-2 text-white/70">
          <input
            type="checkbox"
            checked={showSpeakers}
            onChange={(e) => setShowSpeakers(e.target.checked)}
            className="rounded"
          />
          <span>Show speakers</span>
        </label>
      </div>

      {/* Transcript Content */}
      {currentTranscription && (
        <motion.div
          key={selectedLanguage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10"
        >
          {/* Metadata */}
          <div className="flex items-center justify-between mb-4 text-sm text-white/60">
            <span>
              Language: {currentTranscription.languageName}
            </span>
            <span>
              Confidence: {Math.round(currentTranscription.confidence * 100)}%
            </span>
          </div>

          {/* Utterances with timestamps */}
          {currentTranscription.utterances && currentTranscription.utterances.length > 0 ? (
            <div className="space-y-3">
              {currentTranscription.utterances.map((utterance, index) => (
                <motion.div
                  key={index}
                  className="border border-white/10 rounded-lg overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <button
                    onClick={() => toggleUtterance(index)}
                    className="w-full p-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {showSpeakers && (
                        <div className="flex items-center space-x-1 text-blue-400">
                          <User className="w-4 h-4" />
                          <span className="text-sm">Speaker {utterance.speaker}</span>
                        </div>
                      )}
                      
                      {showTimestamps && (
                        <div className="flex items-center space-x-1 text-green-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">
                            {formatTime(utterance.start)} - {formatTime(utterance.end)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {expandedUtterances.has(index) ? (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/50" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedUtterances.has(index) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3"
                      >
                        <p className="text-white leading-relaxed">
                          {utterance.text}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            // Fallback to full transcript
            <div className="text-white leading-relaxed whitespace-pre-wrap">
              {currentTranscription.transcript}
            </div>
          )}

          {/* Error message if transcription failed */}
          {currentTranscription.error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">
                Transcription failed: {currentTranscription.error}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default MultilingualTranscript;
