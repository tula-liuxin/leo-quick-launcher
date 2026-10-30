/** Small same-page registry: actions run synchronously in the click gesture. */
export function createRegistry(){
 const entries=new Map(),listeners=new Set(),cancellations=new Set();let closed=false
 const notify=()=>{for(const f of [...listeners])try{f()}catch{}}
 return {
  register(action){if(closed)throw new Error('快捷入口已关闭');if(!action||typeof action.id!=='string'||!action.id||typeof action.label!=='string'||typeof action.run!=='function')throw new Error('快捷入口格式无效');if(entries.has(action.id))throw new Error('快捷入口 ID 已存在');entries.set(action.id,action);notify();let alive=true;return()=>{if(!alive)return;alive=false;if(entries.get(action.id)===action){entries.delete(action.id);notify()}}},
  list(){return [...entries.values()].sort((a,b)=>(a.order??0)-(b.order??0)||a.id.localeCompare(b.id))},
  subscribe(fn){if(closed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn)},
  trackCancel(fn){if(closed){fn();return()=>{}}cancellations.add(fn);return()=>cancellations.delete(fn)},
  destroy(){if(closed)return;closed=true;for(const fn of [...cancellations])try{fn()}catch{}cancellations.clear();entries.clear();notify();listeners.clear()}
 }
}
export function anchorPosition(anchor,width,height){
 const pad=8,size=42,gap=8,step=size+gap
 const fallback={x:Math.max(pad,width-76-size),y:Math.max(pad,height-24-size)}
 if(!anchor?.visible||![anchor.x,anchor.y,anchor.width,anchor.height].every(Number.isFinite))return fallback
 const clampX=n=>Math.max(pad,Math.min(n,width-size-pad)),clampY=n=>Math.max(pad,Math.min(n,height-size-pad))
 const dock=anchor.dock
 // 贴边态：跟鲸鱼一起贴进边缘（左/右=竖排柱；上/下=横排行），hover 展开时鲸鱼 anchor 变化会自动带着一起滑出
 if(dock==='left'||dock==='right')return {x:anchor.x,y:clampY(anchor.y-step)}
 const left=anchor.x-gap-size,right=anchor.x+anchor.width+gap
 let x=left>=pad?left:right+size<=width-pad?right:Math.max(pad,Math.min(anchor.x,width-size-pad))
 let y=left>=pad||right+size<=width-pad?anchor.y:anchor.y-gap-size
 return {x:clampX(x),y:clampY(y)}
}
