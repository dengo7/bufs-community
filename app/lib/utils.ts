export type UILang = 'ko' | 'en' | 'zh' | 'ja';

export function formatTimeAgo(dateStr: string, lang: UILang): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days  = Math.floor(diffMs / 86_400_000);

  if (days > 7) {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    if (lang === 'en') {
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${MONTHS[d.getMonth()]} ${day}`;
    }
    if (lang === 'ko') return `${m}월 ${day}일`;
    return `${m}月${day}日`;   // zh/ja는 한자 그대로
  }
  if (days >= 1) {
    if (lang === 'ko') return `${days}일 전`;
    if (lang === 'en') return `${days} days ago`;
    if (lang === 'zh') return `${days}天前`;
    return `${days}日前`;
  }
  if (hours >= 1) {
    if (lang === 'ko') return `${hours}시간 전`;
    if (lang === 'en') return `${hours} hours ago`;
    if (lang === 'zh') return `${hours}小时前`;
    return `${hours}時間前`;
  }
  if (mins >= 1) {
    if (lang === 'ko') return `${mins}분 전`;
    if (lang === 'en') return `${mins} min ago`;
    if (lang === 'zh') return `${mins}分钟前`;
    return `${mins}分前`;
  }
  if (lang === 'ko') return '방금 전';
  if (lang === 'en') return 'Just now';
  if (lang === 'zh') return '刚刚';
  return 'さっき';
}
