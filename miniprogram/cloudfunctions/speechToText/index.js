// 语音转文字云函数：临时录音仅用于本次腾讯云一句话识别。
const cloud = require('wx-server-sdk');
const { asr } = require('tencentcloud-sdk-nodejs-asr');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AsrClient = asr.v20190614.Client;
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 30000;
const VOICE_FILE_ID_PATTERN = /^cloud:\/\/[^/]+\/voice\/[A-Za-z0-9_-]+\.mp3$/;

function emptyResult(code) {
  return { code: code, text: '' };
}

function getConfig() {
  const timeout = Number(process.env.TENCENT_ASR_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeout)
    ? Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(timeout)))
    : DEFAULT_TIMEOUT_MS;

  const config = {
    secretId: (process.env.TENCENT_SECRET_ID || '').trim(),
    secretKey: (process.env.TENCENT_SECRET_KEY || '').trim(),
    region: (process.env.TENCENT_ASR_REGION || '').trim(),
    engine: (process.env.TENCENT_ASR_ENGINE || '').trim(),
    timeoutMs: timeoutMs
  };

  return config.secretId && config.secretKey && config.region && config.engine
    ? config
    : null;
}

function isValidFileID(fileID) {
  return typeof fileID === 'string'
    && fileID.length <= 1024
    && VOICE_FILE_ID_PATTERN.test(fileID);
}

function withTimeout(promise, timeoutMs) {
  return new Promise(function (resolve, reject) {
    let settled = false;
    const timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      reject(new Error('ASR_TIMEOUT'));
    }, timeoutMs);

    Promise.resolve(promise).then(function (value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, function (error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function deleteRecording(fileID) {
  try {
    await cloud.deleteFile({ fileList: [fileID] });
  } catch (error) {
    // 不记录 fileID、内部错误或用户内容，且清理失败不覆盖识别结果。
    console.error('speechToText: temporary recording cleanup failed');
  }
}

exports.main = async function (event) {
  const fileID = event && event.fileID;
  if (!isValidFileID(fileID)) {
    return emptyResult(-1);
  }

  try {
    const config = getConfig();
    if (!config) {
      return emptyResult(-2);
    }

    const downloadResult = await cloud.downloadFile({ fileID: fileID });
    const audio = downloadResult && downloadResult.fileContent;
    if (!Buffer.isBuffer(audio) || audio.length === 0 || audio.length > MAX_AUDIO_BYTES) {
      return emptyResult(-3);
    }

    const client = new AsrClient({
      credential: {
        secretId: config.secretId,
        secretKey: config.secretKey
      },
      region: config.region,
      profile: {
        httpProfile: {
          endpoint: 'asr.tencentcloudapi.com',
          reqTimeout: Math.ceil(config.timeoutMs / 1000)
        }
      }
    });

    const response = await withTimeout(client.SentenceRecognition({
      ProjectId: 0,
      SubServiceType: 2,
      EngSerViceType: config.engine,
      SourceType: 1,
      VoiceFormat: 'mp3',
      Data: audio.toString('base64'),
      DataLen: audio.length,
      UsrAudioKey: fileID.split('/').pop().slice(0, 80)
    }), config.timeoutMs);

    const text = response && typeof response.Result === 'string'
      ? response.Result.trim()
      : '';
    return text ? { code: 0, text: text } : emptyResult(-4);
  } catch (error) {
    // 前端只收到空文本；日志不包含腾讯云错误、音频或用户文本。
    console.error('speechToText: recognition failed');
    return emptyResult(-5);
  } finally {
    await deleteRecording(fileID);
  }
};

exports._test = {
  getConfig: getConfig,
  isValidFileID: isValidFileID,
  MAX_AUDIO_BYTES: MAX_AUDIO_BYTES
};
