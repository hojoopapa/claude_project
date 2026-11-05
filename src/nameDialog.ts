import { promptText } from './domDialog';
import { getPlayer, setPlayer } from './save';
import { cleanName, claimName, nameKey, rankingEnabled, releaseName } from './ranking';
import { t } from './i18n';

/**
 * 닉네임 입력창. 온라인 랭킹이 켜져 있으면 다른 사람이 이미 쓰는 이름은 받지 않고 다시 묻는다.
 * 새 이름이 확정되면 예전 이름은 장부에서 빼서 다른 사람이 쓸 수 있게 한다. 취소하면 null.
 */
export async function askUniqueName(initial: string = getPlayer().name, firstHint?: string): Promise<string | null> {
  let hint = firstHint ?? t('nameHint'), value = initial;
  for (;;) {
    const v = await promptText({ title: t('nickname'), hint, value, maxLen: 12, ok: t('ok'), cancel: t('cancel'), filter: cleanName });
    if (!v) return null;
    if (rankingEnabled()) {
      const r = await claimName(v);
      if (r !== 'ok') { value = v; hint = t(r === 'taken' ? 'nameTaken' : 'nameCheckFail'); continue; }
      const old = getPlayer().name;
      if (old && nameKey(old) !== nameKey(v)) await releaseName(old);
    }
    setPlayer({ name: v });
    return v;
  }
}
