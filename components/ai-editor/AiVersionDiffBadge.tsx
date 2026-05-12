import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

type Props = {
  versionNum: number;
  createdAt: string;
};

export function AiVersionDiffBadge({ versionNum, createdAt }: Props) {
  const ago = formatDistanceToNow(new Date(createdAt), { addSuffix: false, locale: ru });
  return (
    <span className="text-[10px] text-muted-foreground tabular-nums">
      v{versionNum} · {ago}
    </span>
  );
}
