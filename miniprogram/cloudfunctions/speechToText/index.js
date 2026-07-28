// cloudfunctions/speechToText/index.js
// 语音转文字云函数
// 调用腾讯云 ASR（自动语音识别）接口，将用户录音转为文字

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { fileID } = event;
  if (!fileID) {
    return { code: -1, text: '', error: '缺少文件参数' };
  }

  try {
    // 1. 下载云存储中的录音文件
    const res = await cloud.downloadFile({ fileID: fileID });
    const buffer = res.fileContent;

    // 2. 将音频转为 base64
    const base64Audio = buffer.toString('base64');

    // 3. 调用腾讯云 ASR 接口进行语音识别
    // 使用微信小程序内置的云端能力（openapi.speechToText）
    // 如果开通了同声传译插件或使用微信官方语音识别，走对应通道
    try {
      const asrResult = await cloud.openapi.serviceMarket.invokeService({
        service: 'wxea18e3e1d8aexxxx',   // 微信同声传译服务ID（示例）
        api: 'asr',
        data: {
          audioData: base64Audio,
          format: 'mp3',
          rate: 16000,
          encoding: 1,
          voice_lang: 'zh_cn'
        }
      });

      if (asrResult && asrResult.data) {
        return {
          code: 0,
          text: asrResult.data.result || '',
          error: ''
        };
      }
    } catch (asrErr) {
      console.error('ASR 调用失败，尝试备选方案:', asrErr);
    }

    // 备选方案：调用腾讯云 SaaS 语音识别
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const AsrClient = tencentcloud.asr.v20190814.Client;

    const clientConfig = {
      credential: {
        secretId: process.env.TENCENT_SECRET_ID || '',
        secretKey: process.env.TENCENT_SECRET_KEY || ''
      },
      region: 'ap-guangzhou',
      profile: { httpProfile: { endpoint: 'asr.tencentcloudapi.com' } }
    };

    const client = new AsrClient(clientConfig);

    const asrRes = await client.CreateRecTask({
      EngineModelType: '16k_zh',
      ChannelNum: 1,
      SourceType: 1,
      Data: base64Audio,
      DataLen: buffer.length
    });

    if (asrRes.Data && asrRes.Data.ResultList && asrRes.Data.ResultList.length > 0) {
      return {
        code: 0,
        text: asrRes.Data.ResultList[0].Text || '',
        error: ''
      };
    }

    return { code: -2, text: '', error: '未识别到有效文本' };

  } catch (err) {
    console.error('speechToText 错误:', err);
    return { code: -3, text: '', error: '语音识别服务异常' + (err.message || '') };
  }
};
