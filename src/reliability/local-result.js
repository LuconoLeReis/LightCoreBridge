// Last-resort result display. No VTT, extension message, rules or dialog library.
function wayBeyond20LocalResultFallback(title, html) {
    if (!document.body) return false;
    document.getElementById('wb20-local-result-fallback')?.remove();
    const panel=document.createElement('section');panel.id='wb20-local-result-fallback';
    panel.setAttribute('role','dialog');panel.setAttribute('aria-label',title || 'Roll result');
    panel.style.cssText='position:fixed;right:16px;top:80px;z-index:2147483646;max-width:440px;max-height:70vh;overflow:auto;padding:16px;border:2px solid currentColor;border-radius:6px;background:Canvas;color:CanvasText;font:15px system-ui;box-shadow:0 2px 12px #0008';
    const heading=document.createElement('strong');heading.textContent=title || 'Roll result';
    const close=document.createElement('button');close.type='button';close.textContent='Close';close.style.float='right';close.addEventListener('click',()=>panel.remove());
    const template=document.createElement('template');template.innerHTML=html;
    const body=document.createElement('div');body.style.whiteSpace='pre-wrap';body.textContent=template.content.textContent;
    panel.append(heading,close,body);document.body.append(panel);
    return true;
}
