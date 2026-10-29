# leo-quick-launcher

独立 DSH Client 插件。通过 `shell.overlay` 和公开的 `ctx.provide` 暴露 `leoQuick` 注册服务；不依赖或访问阿源的 DOM、私有类名、存储键。快捷动作由其他插件在加载时注册并在卸载时注销。阿源关闭或未安装时，悬浮球退回窗口右下角；不阻断 leo-status。

## 服务契约

`register({id,label,icon,order,run})` 返回幂等取消注册；`list()`、`subscribe(fn)` 用于视图；`trackCancel(fn)` 注册待清理资源；插件停用调用 `destroy()` 清理资源。`run` 在原始按钮点击调用栈中同步执行。内置图形 `todo`、`record`、`bolt`，不是全局图标库；扩展动作可以先用 bolt。

## 可选阿源坐标事件

阿源插件须主动发布 `ayuan:launcher-anchor-v1` CustomEvent，detail `{visible,panelOpen,x,y,width,height}` 是视口坐标；`panelOpen` 为 true 时临时隐藏快捷球，避免覆盖阿源浮框。只发位置，不发聊天/用户内容。快捷球加载时发送 `leo-quick:anchor-request-v1` 请求一次快照；浏览器尺寸和阿源拖动时再更新。事件未提供、visible=false、阿源卸载时走右下角回退；事件不可用不影响快捷服务。

在 `YuanFloatingPanel` 初始化 `state` 与 `bubblePos` 后增加：

```js
useEffect(() => {
  const publish = () => {
    const p = bubblePos || { x: window.innerWidth - 66, y: window.innerHeight - 66 };
    window.dispatchEvent(new CustomEvent('ayuan:launcher-anchor-v1', {
      detail: { visible: !state.visible, panelOpen: !!state.visible, x: p.x, y: p.y, width: 42, height: 42 },
    }));
  };
  window.addEventListener('leo-quick:anchor-request-v1', publish);
  window.addEventListener('resize', publish);
  publish();
  return () => { window.removeEventListener('leo-quick:anchor-request-v1', publish); window.removeEventListener('resize', publish); };
}, [bubblePos, state.visible]);
useEffect(() => () => {
  window.dispatchEvent(new CustomEvent('ayuan:launcher-anchor-v1', { detail: { visible: false } }));
}, []);
```

阿源现有页面来源捕获器的忽略条件应追加 `[data-ayuan-ignore-origin]`，这是快捷球公开标识；点快捷球不应取代用户的主页面位置。

## leo-status 接入

将 `src/leo-bridge.js` 拷贝到 leo-status 源码目录，在其 Client `apply(ctx)` 中通过 `ctx.inject(['leoQuick','layout'], ...)` 持有 `createQuickBridge({registry:scope.leoQuick,layout:scope.layout})`；关闭 scope 时 `bridge.dispose()`。为已挂载的 App 使用 bridge 的 `subscribe`，并在首次挂载和通知时调用 `consume()`，得到唯一请求；App 尚未挂载时请求仍保留。

- `kind === 'todo'`：打开已有 `create(true)` 的空白待办草稿。
- `kind === 'record'`：点击事件同步调用 `getUserMedia({audio:true})`；待 App 挂载后打开新的记录草稿并消费 `request.pending`。成功时把 `stream` 传给现有录音器；拒绝/不支持时展示错误和上传音频备选，但草稿保持打开。点击录音是实际权限请求；没有确认前不得自动访问麦克风。
- 在录音器开始后 `request.setStopRecorder(() => recorder.stop())`。关闭编辑器、录音结束、插件停用时调用 `request.finish()`；权限在关闭后才返回的流会立即停止 tracks。重复请求在前一个完成之前拒绝，避免覆盖已有草稿。不要将 `MediaStream` 写入 localStorage 或 HTTP。
- 记录动作必须遵循原有规则：打开空页不自动产生正式笔记，第一次实际内容产生草稿；用户提交才生成正式版本。

示意：

```js
const bridge = createQuickBridge({ registry: scope.leoQuick, layout: scope.layout });
// 在 App 的 effect 中订阅并立即检查一次，避免导航后遗漏动作：
const take = () => { const req = bridge.consume(); if (req) setModal(makeQuickDraft(req)); };
const off = bridge.subscribe(take); take();
// return off；NoteModal 在卸载时 req.finish()。
```

实际权限与设备支持取决于浏览器和系统；设备中心录音需要其页面允许嵌入设备请求麦克风。`npm test` 覆盖事件同步栈、取消后迟到的媒体流、拒绝权限、重复动作、插件卸载、无阿源回退、拖动边界。真实权限、视觉和设备中心路径需主任务验收。
