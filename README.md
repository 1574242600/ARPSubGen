# ARPSubGen
[SonarrPatch-AniRssPatch](https://github.com/1574242600/SonarrPatcher/blob/main/SonarrPatcher.Patches/AniRss/README.md) 订阅配置文件生成器，用于编辑并生成 AniRssPatch 订阅配置文件。   

[SonarrPatch](https://github.com/1574242600/SonarrPatcher/) 利用了 DOTNET_STARTUP_HOOKS 环境变量，将基于 Harmony 的补丁加载到 Sonarr 中以修改其原有的功能。AniRssPatch 则在该基础上通过新增 Sonarr Task，实现 [ani-rss](https://github.com/wushuo894/ani-rss) 的主要功能。

## 特点
- 集成 Mikan Project (蜜柑计划)，直接选取 Mikan RSS
- 自动识别标题以推荐 Mikan RSS

## 快速开始
建议在运行前使用 [glossarr-worker](https://github.com/1574242600/glossarr-worker) 配合 [SonarrPatch-SkyHookPatch](https://github.com/1574242600/SonarrPatcher/blob/main/SonarrPatcher.Patches/SkyHook/README.md) 让 Sonarr 强制使用 TheTVDB 的中文节目标题以支持自动识别。

在 Sonarr 管理页面的开发者工具控制台执行以下代码
~~~js
(() => {

async function urlSafeBtoaWithGzip(str) {
  const data = new Uint8Array(await new Response(
    new Blob([new TextEncoder().encode(str)])
      .stream().pipeThrough(new CompressionStream("gzip"))
  ).arrayBuffer());

  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

fetch("/api/v3/series", {
    "headers": {
        "X-Api-Key": window.Sonarr.apiKey
    }
})
.then(r => r.json())
.then(items => items.filter(item => item.seriesType === 'anime' &&  item.monitored === true && Date.parse(item.lastAired)  > Date.now() - 30 * 24 * 60 * 60 * 1000))
.then(items => items.map(item => { return { tvdbId: item.tvdbId, season: item.statistics.seasonCount, title: item.title } }))
.then(items => JSON.stringify(items))
.then(async json => window.location.href = `https://arp-subgen.nworm.icu/?config=${await urlSafeBtoaWithGzip(json)}`)

})()
~~~