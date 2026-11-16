import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  detectSpeechLang,
  prepareSpeechScript,
  pickBestBrowserVoice,
  splitIntoContinuousBrowserChunks,
  computeSpeechResumeOffset,
  snapToCleanSpeechOffset,
} from '../../hub/web/src/utils/speech.js';

test('speech pipeline auto-detects Chinese vs English replies by spoken duration balance', () => {
  const zhMixed = '查清楚了！这次手机端 Safari 偶发断流并不是你的 Token 过期，而是 Cloud Run 网关撞上了超时边界。';
  const enMixed = 'Good news! Whenever your local agent enters 等待人工确认 inside the handler, the mobile banner highlights 一键放行 in 350ms.';
  assert.equal(detectSpeechLang(zhMixed), 'zh');
  assert.equal(detectSpeechLang(enMixed), 'en');
});

test('speech pipeline strips code blocks, paths, commit hashes, and normalizes rates without any jargon dictionary', () => {
  const raw = `破案了！这次日志拍到了精确到毫秒的真相，你手边这台电脑在 5 分钟前其实已经被修通了！

### 一、现场还原

1. \`ccdemacbook-air\`（你面前这台 MacBook Air）：后台 \`node\` 调 [\`probeVideoCompatibility\`](file:///Users/cc/workspace-ops.js#L2344) 打开 \`/Users/cc/Documents/demo.mp4\` 时，把 Node.js 默认 4 个线程（\`UV_THREADPOOL_SIZE=4\`）堵死了。
2. 提交 \`c7fa535\` 修复后，文本改写 ¥0.0003 元 / 千 Token，每分钟约 \`50,000 Token / 分钟\`，延迟 \`< 20ms\`！

\`\`\`js
console.log('should not be read line by line');
\`\`\`

也就是说：现在你再拿手机点 \`terraprobe-video\` 里的视频和图片，已经能秒开了！`;

  const res = prepareSpeechScript(raw);
  assert.equal(res.docLang, 'zh');
  assert.ok(!res.fullText.includes('probeVideoCompatibility'));
  assert.ok(!res.fullText.includes('UV_THREADPOOL_SIZE'));
  assert.ok(!res.fullText.includes('c7fa535'));
  assert.ok(!res.fullText.includes('console.log'));
  assert.ok(res.fullText.includes('这里附了一段代码'));
  assert.ok(res.fullText.includes('Node JS'));
  assert.ok(res.fullText.includes('零点零零零三元每千 Token'));
  assert.ok(res.fullText.includes('5万 Token每分钟'));
  assert.ok(res.fullText.includes('不到20毫秒'));
  assert.ok(res.fullText.includes('点里面的视频和图片'));
});

test('speech pipeline extracts concise TextRank summary on long replies and preserves continuous single-utterance chunks on WebKit', () => {
  const longParagraphs = Array.from({ length: 8 }, (_, i) =>
    `${i + 1}. 这是第 ${i + 1} 段详细的技术排查记录，说明后台网关在长连接空闲超过六十秒之后如何自动重连并恢复消息队列同步。`
  ).join('\n\n');
  const raw = `核心结论：手机端断流已经自动恢复，不需要手动重启任何服务！\n\n${longParagraphs}\n\n一句话总结：直接继续发消息即可正常使用。`;
  const res = prepareSpeechScript(raw);
  assert.equal(res.hasDistinctSummary, true);
  assert.ok(res.conciseText.length < res.fullText.length);
  assert.ok(res.conciseText.includes('核心结论'));

  const webkitChunks = splitIntoContinuousBrowserChunks(res.fullText, true);
  assert.equal(webkitChunks.length, 1);

  const chromiumChunks = splitIntoContinuousBrowserChunks(res.fullText, false);
  assert.ok(chromiumChunks.length >= 2);
});

test('pickBestBrowserVoice prioritizes neural/enhanced/Siri single continuous voice', () => {
  const mockVoices = [
    { name: 'Tingting', voiceURI: 'com.apple.voice.compact.zh-CN.Tingting', lang: 'zh-CN', localService: true },
    { name: 'Microsoft Xiaoxiao Online (Natural)', voiceURI: 'Xiaoxiao', lang: 'zh-CN', localService: false },
    { name: 'Samantha', voiceURI: 'Samantha', lang: 'en-US', localService: true },
  ];
  assert.equal(pickBestBrowserVoice(mockVoices, 'zh').name, 'Microsoft Xiaoxiao Online (Natural)');
  assert.equal(pickBestBrowserVoice(mockVoices, 'en').name, 'Samantha');
});

test('controller renders speak button right after Copy Full Reply button and resumes from current offset on rate switch', async () => {
  const src = await readFile(new URL('../../hub/web/src/controller.js', import.meta.url), 'utf8');
  assert.ok(src.includes('onclick="copyAssistantReply(${msgIdx}, this)">📋 复制全文</button>${speakControlsHtml}'));
  assert.ok(src.includes('startAssistantSpeech(msgIdx, { startOffset: resumeOffset })'));
});

test('computeSpeechResumeOffset preserves exact onboundary progress, falls back to elapsed time, and never slices English words mid-token', () => {
  const text = '查清楚了！这次手机端 Safari 偶发断流并不是你的 Token 过期，而是后台网关连接撞上了超时边界。';
  const safariStart = text.indexOf('Safari');

  // 1. Mid-word offset inside `Safari` (`Saf|ari`) snaps back cleanly to `Safari`
  assert.equal(snapToCleanSpeechOffset(text, safariStart + 3), safariStart);

  // 2. When `onboundary` reported charIndex = 18 recently, resume right at 18 (not 0!)
  const byBoundary = computeSpeechResumeOffset({
    fullText: text,
    docLang: 'zh',
    segmentBaseOffset: 0,
    segmentStartedAt: 1000,
    segmentRate: 1,
    boundaryCharOffset: 18,
    boundaryUpdatedAt: 4800,
    nowMs: 5000,
  });
  assert.equal(byBoundary, 18);

  // 3. When mobile voice does NOT emit `onboundary` (`boundaryUpdatedAt = 0`), estimate from elapsed seconds (~5s at 1x -> ~19 chars, never 0!)
  const byElapsedFallback = computeSpeechResumeOffset({
    fullText: text,
    docLang: 'zh',
    segmentBaseOffset: 0,
    segmentStartedAt: 1000,
    segmentRate: 1,
    boundaryCharOffset: -1,
    boundaryUpdatedAt: 0,
    nowMs: 6200,
  });
  assert.ok(byElapsedFallback >= 15 && byElapsedFallback < text.length - 5);
});
