// 통학버스 전용 페이지.
// 정적 세그먼트가 동적 세그먼트([id])보다 우선하므로, 기존 /campus/shuttle 링크가 그대로 이 페이지로 온다.
import ShuttleView from './ShuttleView';

export default function ShuttlePage() {
  return <ShuttleView />;
}
