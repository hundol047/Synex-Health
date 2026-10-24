import React from 'react';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockFetch } from './helpers.js';
import AgentChatPage from '../src/health/pages/AgentChatPage.jsx';
it('appends chat bubbles and generates structured analysis',async()=>{
 const fetch=mockFetch({'/api/health-agent/chat':{reply:'꾸준히 운동하세요.'},'/api/health-agent/analyze':{summary:'측정 기반 요약',balance_analysis:'좌우 차이 확인',recommendations:['주 3회 운동'],counselor_questions:['운동 강도 상담']}});
 render(<AgentChatPage/>);
 fireEvent.change(screen.getByPlaceholderText('메시지를 입력하세요'),{target:{value:'운동 추천'}});
 fireEvent.click(screen.getByRole('button',{name:'전송'}));
 expect(screen.getByText('운동 추천').className).toContain('me');
 expect((await screen.findByText('꾸준히 운동하세요.')).className).toContain('agent');
 expect(JSON.parse(fetch.mock.calls[0][1].body).message).toBe('운동 추천');
 fireEvent.click(screen.getByRole('button',{name:'AI 분석 생성'}));
 expect(await screen.findByText('측정 기반 요약')).toBeTruthy();
 for(const text of ['좌우 차이 확인','주 3회 운동','운동 강도 상담']) expect(screen.getByText(text)).toBeTruthy();
});

it('shows a recoverable API error without removing the chat',async()=>{
 mockFetch({'/api/health-agent/chat':{status:503,body:{detail:'코치 연결 실패'}},'/api/health-agent/analyze':{status:503,body:{detail:'분석 생성 실패'}}});
 render(<AgentChatPage/>);
 fireEvent.change(screen.getByLabelText('AI 코치에게 질문'),{target:{value:'운동 추천'}});
 fireEvent.click(screen.getByRole('button',{name:'전송'}));
 expect(await screen.findByText('코치 연결 실패')).toBeTruthy();
 expect(screen.getByText('운동 추천')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'AI 분석 생성'}));
 expect(await screen.findByText('분석 생성 실패')).toBeTruthy();
 expect(screen.getByLabelText('AI 코치에게 질문')).toBeTruthy();
});

it('retries the failed question after the input was cleared, without duplicate bubbles',async()=>{
 let calls=0;const fetch=mockFetch({'/api/health-agent/chat':()=>++calls===1?{status:503,body:{detail:'일시 오류'}}:{reply:'재시도 답변'}});
 render(<AgentChatPage/>);fireEvent.change(screen.getByLabelText('AI 코치에게 질문'),{target:{value:'내 질문'}});fireEvent.click(screen.getByRole('button',{name:'전송'}));
 await screen.findByText('일시 오류');fireEvent.click(screen.getByRole('button',{name:'다시 시도'}));
 expect(await screen.findByText('재시도 답변')).toBeTruthy();expect(screen.getAllByText('내 질문')).toHaveLength(1);
 expect(JSON.parse(fetch.mock.calls[1][1].body).message).toBe('내 질문');
});
