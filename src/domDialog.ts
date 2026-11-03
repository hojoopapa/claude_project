import { C } from './ui';

export interface PromptOpts {
  title: string;
  hint?: string;
  value: string;
  maxLen: number;
  ok: string;
  cancel: string;
  /** 입력 값을 걸러 주는 함수 (예: 영문·숫자만) */
  filter?: (s: string) => string;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

/** 글자 입력창 (모바일 키보드가 뜨도록 HTML 입력창을 쓴다). 취소하면 null. */
export function promptText(o: PromptOpts): Promise<string | null> {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;background:rgba(5,8,16,.78);padding:16px;';
    const card = document.createElement('div');
    card.style.cssText = `background:${hex(C.panel)};border:1px solid rgba(255,211,107,.5);border-radius:18px;padding:22px 22px 18px;width:min(380px,100%);color:${C.text};font:600 15px 'Noto Sans KR',system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.5);`;
    card.innerHTML = `<div style="font-size:20px;font-weight:700;color:${C.gold};margin-bottom:10px"></div>` +
      `<input maxlength="${o.maxLen}" style="width:100%;box-sizing:border-box;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:#0c1220;color:#fff;font:600 17px 'Noto Sans KR',system-ui,sans-serif;outline:none"/>` +
      `<div style="font-size:12px;color:${C.dim};margin:8px 2px 14px;font-weight:500"></div>` +
      `<div style="display:flex;gap:10px;justify-content:flex-end"></div>`;
    const [title, hint, row] = [card.children[0], card.children[2], card.children[3]] as HTMLElement[];
    const input = card.children[1] as HTMLInputElement;
    title.textContent = o.title;
    hint.textContent = o.hint ?? '';
    input.value = o.value;
    const mk = (label: string, bg: string, cb: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = `padding:10px 22px;border:0;border-radius:12px;color:#fff;background:${bg};font:700 15px 'Noto Sans KR',system-ui,sans-serif;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35)`;
      b.onclick = cb;
      row.appendChild(b);
    };
    const done = (v: string | null) => { document.removeEventListener('keydown', onKey, true); wrap.remove(); resolve(v); };
    const submit = () => done((o.filter ? o.filter(input.value) : input.value).trim());
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') submit();
      else if (e.key === 'Escape') done(null);
    };
    mk(o.cancel, hex(C.slate), () => done(null));
    mk(o.ok, hex(C.green), submit);
    input.addEventListener('input', () => { if (o.filter) input.value = o.filter(input.value); });
    document.addEventListener('keydown', onKey, true);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    input.focus();
    input.select();
  });
}
