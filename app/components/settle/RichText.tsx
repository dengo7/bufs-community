import { Fragment } from 'react';

/**
 * 문장 속 **핵심어** 를 굵게 — 데이터 문자열에 HTML을 넣지 않고 표시만 바꾼다.
 * (AI 프롬프트 등 일반 텍스트로 쓸 때는 lib/settleGuide.ts 의 plain() 으로 표시를 지운다)
 */
export default function RichText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <b key={i} className="font-bold text-[#111827]">{p}</b> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}
