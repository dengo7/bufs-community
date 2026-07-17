export const REPORT_REASONS = [
  {
    value: 'spam',
    label: { ko: '스팸', en: 'Spam', zh: '垃圾信息', ja: 'スパム' },
  },
  {
    value: 'hate',
    label: { ko: '혐오 발언', en: 'Hate speech', zh: '仇恨言论', ja: 'ヘイトスピーチ' },
  },
  {
    value: 'obscene',
    label: { ko: '음란물', en: 'Obscene content', zh: '色情内容', ja: '猥褻コンテンツ' },
  },
  {
    value: 'privacy',
    label: { ko: '개인정보 침해', en: 'Privacy violation', zh: '侵犯隐私', ja: 'プライバシー侵害' },
  },
  {
    value: 'other',
    label: { ko: '기타', en: 'Other', zh: '其他', ja: 'その他' },
  },
] as const;
