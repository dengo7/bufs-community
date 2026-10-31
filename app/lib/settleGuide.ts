import { kstToday, SCHEDULE, type ScheduleItem } from './schedule';
import { SCHEDULE_TITLE_I18N } from './scheduleI18n';
import { courseRegistration, daysBetween, dayN, type SettleProfile } from './settle';
import { SRC, type Confidence, type Loc, type SettleItem, type SettleSource } from './settleItems';
import type { UILang } from './lang';

/**
 * 상세 시트 "정착 가이드" 박스 — 프로필(체류자격·거주형태·입국 경과일)과 완료 상태로 고르는 맞춤 문장.
 *
 * ▸ 문장마다 출처를 붙인다. 출처로 확인된 사실만 쓰고, 계산값(경과일·남은 날)만 덧붙인다.
 * ▸ 학생증은 아직 확인 중이라 맞춤 문장을 만들지 않는다.
 * ▸ 국적은 받지 않으므로 쓰지 않는다.
 */

export type GuideLine = { text: Loc; source?: SettleSource; confidence?: Confidence };
/** 끝내면 가능해지는 일 — target이 있으면 그 항목 상세로 이동 */
export type GuideUnlock = { text: Loc; source: SettleSource; target?: string };
export type SettleGuide = { lines: GuideLine[]; unlocks: GuideUnlock[]; pending: boolean };

const VISA_NAME = { d2: { ko: 'D-2 학위과정', en: 'D-2 degree program' }, d4: { ko: 'D-4 어학연수', en: 'D-4 language program' } } as const;

const fmt = (d: string) => d.replaceAll('-', '.');
/** **핵심어** 굵게 표시를 지운 일반 텍스트 */
export const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1');

/** 정규 학기 수강신청 직후(30일 안)의 수강신청 확인(정정) 기간. 학사일정에 아직 없으면 null */
function correctionAfter(reg: ScheduleItem): ScheduleItem | null {
  const end = reg.end ?? reg.start;
  return SCHEDULE.find(s => s.title.includes('수강신청 확인(정정)') && s.start > end && daysBetween(end, s.start) <= 30) ?? null;
}

export function buildGuide(item: SettleItem, p: SettleProfile, done: ReadonlySet<string>, lang: UILang, today = kstToday()): SettleGuide {
  const n = dayN(p, today);
  const lines: GuideLine[] = [];
  const unlocks: GuideUnlock[] = [];

  // 공통 첫 문장 — 계산값
  lines.push({
    text: n < 0 ? { ko: `입국까지 ${-n}일 남았어요.`, en: `You arrive in ${-n} days.` }
      : n === 0 ? { ko: '오늘 입국하셨네요.', en: 'You arrive today.' }
      : { ko: `입국한 지 ${n}일이 지났어요.`, en: `It's been ${n} days since you arrived.` },
  });

  switch (item.id) {
    case 'alien_registration': {
      const visa = p.visa === 'd2' || p.visa === 'd4' ? VISA_NAME[p.visa] : null;
      const left = 90 - n;
      const leftKo = left > 0 ? ` 기한까지 ${left}일 남았어요.` : left === 0 ? ' 오늘이 기한이에요.' : ` 기한이 ${-left}일 지났어요.`;
      const leftEn = left > 0 ? ` ${left} days left.` : left === 0 ? ' The deadline is today.' : ` The deadline passed ${-left} days ago.`;
      lines.push({
        text: {
          ko: `${visa ? `${visa.ko} 체류자격으로 ` : ''}90일 넘게 머물려면 입국일부터 90일 안에 외국인등록을 해야 해요.${leftKo}`,
          en: `${visa ? `On a ${visa.en} visa, ` : ''}if you stay longer than 90 days you must register within 90 days of arrival.${leftEn}`,
        },
        source: SRC.mojArc, confidence: 'high',
      });
      lines.push({
        text: { ko: 'BUFS는 학기 초에 국제교류처가 단체로 접수해요.', en: 'At BUFS, the international office files applications as a group at the start of the semester.' },
        source: SRC.bufsArc, confidence: 'high',
      });
      lines.push({
        text: p.housing === 'dorm'
          ? { ko: '기숙사에 살고 있으니 체류지 입증서류로 기숙사 거주확인서를 준비하세요.', en: "Since you live in the dormitory, prepare a dormitory residence certificate as proof of residence." }
          : { ko: '자취를 하고 있으니 체류지 입증서류로 전·월세 계약서를 준비하세요.', en: "Since you live off campus, prepare your lease contract as proof of residence." },
        source: SRC.bufsArc, confidence: 'high',
      });
      lines.push({
        text: { ko: '결핵 검진 기록도 함께 내야 해요.', en: 'You also need to submit a tuberculosis check-up record.' },
        source: SRC.bufsArc, confidence: 'high',
      });
      unlocks.push({
        text: { ko: '체류카드가 나오면 은행 계좌를 체류카드로 다시 개설할 수 있어요. (여권으로 먼저 만든 경우 수수료 6,000원)', en: 'Once your Residence Card is issued, you can reopen your bank account with it (6,000 KRW fee if you first opened it with your passport).' },
        source: SRC.bufsBank, target: 'bank_account',
      });
      unlocks.push({
        text: { ko: '외국인등록증이 나오면 **후불 요금제**에 가입할 수 있어요. (여권으로는 선불만)', en: 'Once your Residence Card is issued, you can sign up for a **postpaid plan**. (A passport allows prepaid only.)' },
        source: SRC.studyInKoreaLife, target: 'mobile_sim',
      });
      break;
    }

    case 'mobile_sim':
      if (!done.has('alien_registration')) {
        lines.push({
          text: { ko: '아직 외국인등록을 완료로 표시하지 않았어요. 지금은 **여권으로 선불 요금제**를 개통할 수 있어요.', en: "You haven't marked alien registration as done. For now, you can get a **prepaid plan with your passport**." },
          source: SRC.studyInKoreaLife, confidence: 'high',
        });
        lines.push({
          text: { ko: '여권과 학생증을 챙겨 **휴대폰 대리점**을 방문하면 바로 개통할 수 있어요.', en: 'Bring your passport and student ID to a **mobile phone store** and you can get connected right away.' },
          source: SRC.studyInKoreaLife, confidence: 'high',
        });
        lines.push({
          text: { ko: '여권으로 가입한 선불은 **체류기간이 끝나면 충전할 수 없어요**. 매장에서 여권을 다시 확인받으면 3개월 연장돼요. (SK텔레콤 기준)', en: "A prepaid line opened with a passport **can't be topped up once your period of stay ends**; re-verifying your passport at a store extends it by 3 months. (SK Telecom)" },
          source: SRC.sktPrepaid, confidence: 'high',
        });
        lines.push({
          text: { ko: '공항 통신사 센터의 여행자용 SIM은 **은행·정부 서비스 본인인증이 안 될 수 있어요**. (LG U+ Korea SIM 기준)', en: "Visitor SIMs sold at airport carrier counters **may not support identity verification for banking or government services**. (LG U+ Korea SIM)" },
          source: SRC.lguKoreaSim, confidence: 'medium',
        });
      } else {
        lines.push({
          text: { ko: '외국인등록을 완료했으니 **외국인등록증으로 후불 요금제**에 가입할 수 있어요.', en: "You've completed alien registration, so you can sign up for a **postpaid plan with your Residence Card**." },
          source: SRC.studyInKoreaLife, confidence: 'high',
        });
        lines.push({
          text: { ko: 'SK텔레콤은 선불에서 후불로 바꿔도 **전화번호가 그대로**예요. 단, 선불 충전 잔액은 사라져요.', en: 'At SK Telecom, switching from prepaid to postpaid **keeps your phone number**, but any prepaid balance is lost.' },
          source: SRC.sktSwitch, confidence: 'high',
        });
        lines.push({
          text: { ko: '외국인등록증이 있으면 **온라인으로도** 가입할 수 있는 외국인 요금제가 있어요. (LG U+, 2025년 7월)', en: 'With a Residence Card, some plans for foreigners can be joined **online** too. (LG U+, July 2025)' },
          source: SRC.lguForeignerPlan, confidence: 'high',
        });
      }
      break;

    case 'bank_account': {
      lines.push({
        text: { ko: '교내 부산은행에서 학기 초에 예약제로 개설해요. 먼저 국제교류처에 예약하세요.', en: 'Busan Bank on campus opens accounts by reservation at the start of the semester. Book through the international office first.' },
        source: SRC.bufsBank, confidence: 'high',
      });
      lines.push({
        text: done.has('alien_registration')
          ? { ko: '외국인등록을 완료했으니 체류카드와 재학증명서로 바로 개설할 수 있어요.', en: "You've completed alien registration, so you can open an account right away with your Residence Card and certificate of enrollment." }
          : { ko: '아직 외국인등록을 완료로 표시하지 않았어요. 여권으로 먼저 만들 수 있지만, 체류카드가 나온 뒤 다시 개설해야 하고 수수료 6,000원이 들어요.', en: "You haven't marked alien registration as done. You can open an account with your passport first, but you'll need to reopen it after your Residence Card is issued, for a 6,000 KRW fee." },
        source: SRC.bufsBank, confidence: 'high',
      });
      lines.push({
        text: { ko: '새 계좌는 하루 한도가 있을 수 있어요. 인터넷뱅킹·ATM 각 100만원, 창구 300만원이에요(2024년 5월 기준).', en: 'A new account may have daily limits: 1 million KRW each for internet banking and ATMs, and 3 million KRW at the counter (as of May 2024).' },
        source: SRC.fscLimit, confidence: 'high',
      });
      break;
    }

    case 'housing_contract':
      lines.push({
        text: { ko: '이 계약서는 외국인등록 때 체류지 입증서류로 내야 하니 잘 보관하세요.', en: "You'll submit this contract as proof of residence for alien registration, so keep it safe." },
        source: SRC.bufsArc, confidence: 'high',
      });
      unlocks.push({
        text: { ko: '계약서가 있으면 외국인등록의 체류지 입증서류를 준비한 거예요.', en: 'With this contract, your proof of residence for alien registration is ready.' },
        source: SRC.bufsArc, target: 'alien_registration',
      });
      break;

    case 'health_insurance':
      lines.push(p.visa === 'd4'
        ? {
          text: { ko: 'D-4 어학연수는 입국 6개월 뒤 가입되는 것으로 보여요.', en: 'D-4 language students appear to be enrolled 6 months after arrival.' },
          source: SRC.nhisForeigner, confidence: 'medium',
        }
        : {
          text: { ko: 'D-2 학위과정은 입국일부터 자동으로 가입돼요. 외국인등록일이 입국일보다 늦으면 등록일부터예요.', en: "D-2 students are enrolled automatically from their arrival date, or from the registration date if that's later." },
          source: SRC.nhisForeigner, confidence: 'high',
        });
      lines.push({
        text: { ko: '보험료는 해당 월분을 전달 25일까지 미리 내요.', en: "Each month's premium is paid in advance by the 25th of the previous month." },
        source: SRC.nhisNotice, confidence: 'high',
      });
      break;

    case 'course_registration': {
      const reg = courseRegistration(today);
      if (reg && (reg.end ?? reg.start) >= today) {
        const title = lang === 'ko' ? reg.title : SCHEDULE_TITLE_I18N[reg.title]?.en ?? reg.title;
        const left = daysBetween(today, reg.start);
        const range = `${fmt(reg.start)}${reg.end ? ` ~ ${fmt(reg.end)}` : ''}`;
        lines.push({
          text: {
            ko: `다음 수강신청은 ${title}, ${range}이에요.${left > 0 ? ` ${left}일 남았어요.` : ' 지금 진행 중이에요.'}`,
            en: `The next course registration is ${title}, ${range}.${left > 0 ? ` ${left} days left.` : ' It is open now.'}`,
          },
          source: SRC.wellSchedule, confidence: 'high',
        });
        const corr = correctionAfter(reg);
        if (corr) {
          lines.push({
            text: {
              ko: `놓치면 수강신청 확인(정정) 기간(${fmt(corr.start)}${corr.end ? ` ~ ${fmt(corr.end)}` : ''})에 다시 기회가 있어요.`,
              en: `If you miss it, there's another chance in the add/drop period (${fmt(corr.start)}${corr.end ? ` – ${fmt(corr.end)}` : ''}).`,
            },
            source: SRC.wellSchedule, confidence: 'high',
          });
        }
      }
      lines.push({
        text: { ko: '신청은 BUFS 수강신청 사이트(sugang.bufs.ac.kr)에서 해요.', en: 'Register on the BUFS course registration site (sugang.bufs.ac.kr).' },
        source: SRC.bufsSugang, confidence: 'high',
      });
      unlocks.push({
        text: { ko: '신청을 마치면 학생포털(m.bufs.ac.kr)의 개인 시간표에서 이번 학기 수업을 확인할 수 있어요.', en: 'After registering, you can check this semester\'s classes in your personal timetable on the student portal (m.bufs.ac.kr).' },
        source: SRC.bufsIt,
      });
      break;
    }

    case 'part_time_work':
      lines.push({
        text: { ko: '일하기 전에 반드시 출입국에서 시간제취업 허가를 먼저 받아야 해요. 허가 없이 일하면 불법취업이에요.', en: 'You must get part-time work permission from immigration before you start. Working without it is illegal employment.' },
        source: SRC.partTimePermit, confidence: 'medium',
      });
      if (p.visa === 'd2') {
        lines.push({
          text: { ko: '학부 과정의 허용 시간은 주당 25시간까지로 늘었어요(2023년 발표 기준).', en: 'The limit for undergraduates was raised to 25 hours a week (as announced in 2023).' },
          source: SRC.partTime2023, confidence: 'high',
        });
      }
      break;

    // 학생증: 확인 중 — 맞춤 문장 없음
    default:
      return { lines, unlocks, pending: true };
  }
  return { lines, unlocks, pending: false };
}

// ── AI 프롬프트 (복사만 — 앱이 AI를 호출하지 않는다) ─────────────────────
/**
 * 사용자가 ChatGPT·Gemini 같은 챗봇에 직접 붙여넣을 프롬프트.
 * /settle 데이터(체류자격·거주형태·입국 경과일·항목 정보)만 담는다 — 이름·이메일·계정 정보·입국 날짜는 넣지 않는다.
 * ko 화면은 한국어 프롬프트, 그 외는 영어 프롬프트에 답변 언어만 지정한다.
 */
const ANSWER_LANG: Record<UILang, string> = { ko: '한국어', en: 'English', zh: 'Simplified Chinese (简体中文)', ja: 'Japanese (日本語)' };

export function buildAiPrompt(
  item: SettleItem,
  p: SettleProfile,
  guide: SettleGuide,
  others: { name: Loc; done: boolean }[],
  lang: UILang,
  today = kstToday(),
): string {
  const ko = lang === 'ko';
  const L = (v: Loc | undefined) => plain(v ? (ko ? v.ko : v.en) : '');
  const n = dayN(p, today);
  const d = item.detail;
  const visa = p.visa === 'd2' ? (ko ? 'D-2 학위과정' : 'D-2 degree program') : p.visa === 'd4' ? (ko ? 'D-4 어학연수' : 'D-4 language program') : (ko ? '기타' : 'Other');
  const housing = p.housing === 'dorm' ? (ko ? '기숙사' : 'Dormitory') : (ko ? '자취' : 'Off-campus');
  const elapsed = n < 0 ? (ko ? `입국까지 ${-n}일 남음` : `${-n} days before arrival`) : (ko ? `입국 후 ${n}일째` : `Day ${n} since arrival`);
  const tag = (c?: Confidence) => (c === 'medium' ? (ko ? ' [확인 권장]' : ' [please double-check]') : '');
  const list = (xs: string[]) => (xs.length ? xs.map(x => `  - ${x}`).join('\n') : (ko ? '  - 없음' : '  - none'));

  const facts: string[] = [];
  if (item.deadline) {
    facts.push(ko
      ? `- 법정 기한: 입국일로부터 ${item.deadline.days}일 이내 (${item.deadline.lawRef})`
      : `- Legal deadline: within ${item.deadline.days} days of arrival (${item.deadline.lawRef})`);
  }
  if (d.documents?.length) facts.push(`- ${ko ? '준비물' : 'Documents'}:\n${list(d.documents.map(x => L(x.name) + (x.note ? ` (${L(x.note)})` : '')))}`);
  if (d.steps?.length) facts.push(`- ${ko ? '진행 순서' : 'Steps'}:\n${list(d.steps.map(L))}`);
  if (d.orgs?.length) facts.push(`- ${ko ? '담당 기관' : 'Offices'}:\n${list(d.orgs.filter(o => o.confidence !== 'low').map(o => L(o.name) + (o.phone ? ` ☎${o.phone}` : '')))}`);
  if (d.cost && d.cost.amount !== null && d.cost.confidence !== 'low') {
    facts.push(`- ${ko ? '비용' : 'Cost'}: ${d.cost.amount === 0 ? (ko ? '무료' : 'free') : `${d.cost.amount.toLocaleString('en-US')}${ko ? '원' : ' KRW'}`}${d.cost.note ? ` — ${L(d.cost.note)}` : ''}`);
  }
  if (!guide.pending) facts.push(`- ${ko ? '내 상황에 맞춘 안내' : 'Guidance for my situation'}:\n${list(guide.lines.slice(1).map(g => L(g.text) + tag(g.confidence)))}`);
  if (guide.unlocks.length) facts.push(`- ${ko ? '끝내면 가능해지는 일' : 'What this unlocks'}:\n${list(guide.unlocks.map(u => L(u.text)))}`);
  if (d.cautions?.length) facts.push(`- ${ko ? '꼭 알아둘 점' : 'Good to know'}:\n${list(d.cautions.map(L))}`);
  if (d.confidence === 'low') facts.push(ko ? '- 참고: 이 항목은 아직 공식 자료로 확인 중이에요.' : '- Note: this task is still being verified against official sources.');
  const sources = [...new Set(d.sources.map(s => s.url))];
  if (sources.length) facts.push(`- ${ko ? '출처' : 'Sources'}:\n${list(sources)}`);

  const doneNames = others.filter(o => o.done).map(o => L(o.name));
  const todoNames = others.filter(o => !o.done).map(o => L(o.name));

  if (ko) {
    return [
      '당신은 부산외국어대학교(BUFS)에 다니는 외국인 유학생의 한국 정착을 돕는 안내 도우미입니다.',
      `아래 정보만 근거로 ${ANSWER_LANG[lang]}로 답해 주세요.`,
      '',
      '[규칙]',
      '1. 아래에 적힌 사실(서류·기관·비용·기한·날짜)만 사용하고, 새로운 사실을 만들어내지 마세요.',
      '2. 모르는 내용은 모른다고 말해 주세요.',
      '3. 법적 판단이 필요한 내용(비자·체류 등)은 단정하지 말고, 학교 국제교류처나 출입국·외국인청(☎1345)에 확인하라고 안내해 주세요.',
      '4. [확인 권장]이 붙은 내용은 확정된 사실처럼 말하지 마세요.',
      '5. 쉬운 말로, 지금 할 일 → 준비물 → 다음 단계 순서로 짧게 정리해 주세요.',
      '',
      '[내 상황]',
      `- 체류자격: ${visa}`,
      `- 거주형태: ${housing}`,
      `- ${elapsed}`,
      '',
      `[지금 보고 있는 할 일] ${L(item.name)}`,
      `- 요약: ${L(item.summary)}`,
      ...facts,
      '',
      '[다른 할 일 진행 상황]',
      `- 완료: ${doneNames.join(', ') || '없음'}`,
      `- 남음: ${todoNames.join(', ') || '없음'}`,
      '',
      '이 할 일을 내 상황에서 어떻게 진행하면 좋을지 알려 주세요.',
    ].join('\n');
  }
  return [
    'You are a helper guiding an international student at Busan University of Foreign Studies (BUFS) through settling in Korea.',
    `Answer in ${ANSWER_LANG[lang]}, using only the information below.`,
    '',
    '[Rules]',
    '1. Use only the facts given below (documents, offices, costs, deadlines, dates). Do not make up new facts.',
    "2. If you don't know something, say so.",
    "3. Don't give definitive answers on legal matters (visa, stay status). Tell me to check with the school's international office or the Immigration Contact Center (1345).",
    '4. Do not present items marked [please double-check] as confirmed facts.',
    '5. Keep it short and simple: what to do now → what to bring → what comes next.',
    '',
    '[My situation]',
    `- Visa status: ${visa}`,
    `- Housing: ${housing}`,
    `- ${elapsed}`,
    '',
    `[Task I'm looking at] ${L(item.name)}`,
    `- Summary: ${L(item.summary)}`,
    ...facts,
    '',
    '[My other tasks]',
    `- Done: ${doneNames.join(', ') || 'none'}`,
    `- Remaining: ${todoNames.join(', ') || 'none'}`,
    '',
    'How should I go about this task in my situation?',
  ].join('\n');
}
