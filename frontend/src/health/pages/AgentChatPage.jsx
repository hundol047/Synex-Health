import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, Disclaimer, ErrorState, Badge } from '../../shared/components/ui.jsx';

export default function AgentChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState(null);

  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setSending(true);
    setChatError(null);
    try {
      const res = await HealthAPI.chat(text);
      setMessages((m) => [...m, { role: 'agent', text: res.reply }]);
    } catch (error) {
      setChatError(error);
    } finally {
      setSending(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const data = await HealthAPI.analyze();
      setAnalysis(data);
    } catch (error) {
      setAnalysisError(error);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <>
      <Card
        title="AI 분석"
        action={<button className="btn btn-secondary" onClick={runAnalysis} disabled={analyzing}>{analyzing ? '생성 중...' : 'AI 분석 생성'}</button>}
      >
        {analysisError && <ErrorState message={analysisError.message} onRetry={runAnalysis} />}
        {analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analysis.priority_area?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {analysis.priority_area.map((a) => <Badge key={a}>{a}</Badge>)}
              </div>
            )}
            <p>{analysis.summary}</p>
            {analysis.balance_analysis && (<div><h3>좌우 균형</h3><p className="muted">{analysis.balance_analysis}</p></div>)}
            {analysis.body_fat_analysis && (<div><h3>체지방 분석</h3><p className="muted">{analysis.body_fat_analysis}</p></div>)}
            {analysis.progress_analysis && (<div><h3>변화 분석</h3><p className="muted">{analysis.progress_analysis}</p></div>)}
            {analysis.recommendations?.length > 0 && (
              <div>
                <h3>추천 사항</h3>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--muted)' }}>
                  {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {analysis.counselor_questions?.length > 0 && (
              <div>
                <h3>상담사에게 물어보면 좋을 질문</h3>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--muted)' }}>
                  {analysis.counselor_questions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        {!analysis && !analysisError && <p className="muted">버튼을 눌러 최신 측정 기반 AI 분석을 생성하세요.</p>}
      </Card>

      <Card title="AI 코치와 대화하기">
        <div className="chat-thread">
          {messages.length === 0 && <p className="muted">궁금한 점을 물어보세요. 예: &ldquo;왼팔 근육이 왜 적은가요?&rdquo;</p>}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble-row ${m.role === 'user' ? 'me' : ''}`}>
              <div className={`chat-bubble ${m.role === 'user' ? 'me' : 'agent'}`}>{m.text}</div>
            </div>
          ))}
          {sending && <p className="muted">AI 코치가 답변을 작성 중입니다...</p>}
        </div>
        {chatError && <ErrorState message={chatError.message} onRetry={send} />}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            className="chat-input" aria-label="AI 코치에게 질문"
            value={input}
            placeholder="메시지를 입력하세요"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          />
          <button className="btn btn-primary" onClick={send} disabled={sending || !input.trim()} aria-label="전송">
            <Send size={16} />
          </button>
        </div>
      </Card>

      <Disclaimer>
        AI 코치의 답변과 분석은 의학적 진단이 아니며, 건강 관리를 위한 참고 정보입니다. 정확한 진단은 건강센터 또는 의료 전문가와 상담하세요.
      </Disclaimer>
    </>
  );
}
