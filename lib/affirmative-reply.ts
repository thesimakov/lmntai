/** Короткие ответы согласия перед запуском сборки (RU/EN). */
export function isAffirmativeUserReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/^(no|nope|нет|неа|не\s|not\s)/i.test(t)) return false;
  if (/\b(не\s+верно|не\s+так|не\s+надо|отмена)\b/i.test(t)) return false;

  if (
    /^(да|давай|ага|угу|ок|окей|верно|точно|запуск|запускай|подтверждаю|согласен|согласна|поехали|yes|yep|yeah|y|ok|okay|sure|confirm|go|start|run|👍|✅)[\s!.]*$/i.test(
      t
    )
  ) {
    return true;
  }

  if (t.length <= 64 && /^(да|давай|запуск|ок)\b/i.test(t) && !/\bнет\b/.test(t)) {
    return true;
  }

  return false;
}
