const got = require("got");
const { autoGame } = require("./autoGame");

const {
  AID,
  COOKIE,
  DING_TALK_TOKEN,
  UID,
  UUID,
  _SIGNATURE
} = require("./github");
// const {
//   AID,
//   COOKIE,
//   DING_TALK_TOKEN,
//   UID,
//   UUID,
//   _SIGNATURE
// } = require("./env");

const DINGTALK_PUSH_URL = `https://oapi.dingtalk.com/robot/send?access_token=${DING_TALK_TOKEN}`; // 钉钉webhook https://oapi.dingtalk.com/robot/send?access_token=e872241814aabb002d47a17b2d8843a6e0cca5efe917aff9ee684c060908b0bf

const SIGN_IN_URL = `https://api.juejin.cn/growth_api/v1/check_in?aid=${AID}&uuid=${UUID}&_signature=${_SIGNATURE}`;
const DRAW_URL = `https://api.juejin.cn/growth_api/v1/lottery/draw?aid=${AID}&uuid=${UUID}&_signature=${_SIGNATURE}`;
const LUCKY_URL = `https://api.juejin.cn/growth_api/v1/lottery_lucky/dip_lucky?aid=${AID}&uuid=${UUID}`;
const DRAW_CHECK_URL = `https://api.juejin.cn/growth_api/v1/lottery_config/get?aid=${AID}&uuid=${UUID}`; //抽奖奖品列表
const NOT_COLLECT_URL = `https://api.juejin.cn/user_api/v1/bugfix/not_collect?aid=${AID}&uuid=${UUID}&spider=0`;
// https://api.juejin.cn/user_api/v1/bugfix/collect?aid=2608&uuid=6989117473007552032&spider=0
const COLLECT_URL = `https://api.juejin.cn/user_api/v1/bugfix/collect?aid=${AID}&uuid=${UUID}&spider=0`;

const HEADERS = {
  COOKIE,
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0"
};
const HEADERS_DINGTALK_WEB_HOOK = {
  "Content-Type": "application/json"
};

let growth = {
  checkedIn: true, // 是否签到
  incrPoint: 0, // 签到获得矿石数
  sumPoint: 0, // 总矿石数
  // contCount: 0, // 连续签到天数
  // sumCount: 0, // 累计签到天数
  dippedLucky: false, // 是否沾喜气
  dipValue: 0, // 幸运值
  luckyValue: 0, // 总幸运值
  // freeCount: 0, // 免费抽奖次数
  freeDrawed: false, // 是否免费抽奖
  lotteryName: "", // 奖品名称
  collectedBug: false, // 是否收集 Bug
  collectBugCount: 0 // 收集 Bug 的数量
};

const message = () => {
  return `
    Hello Jamie
  ${growth.checkedIn ? `签到 +${growth.incrPoint} 矿石` : "今日已签到"}
  当前矿石数 ${growth.sumPoint}
  ${
    growth.dippedLucky
      ? "今日已经沾过喜气"
      : `沾喜气 +${growth.dipValue} 幸运值`
  }
  当前幸运值 ${growth.luckyValue}
  ${growth.freeDrawed ? `恭喜抽中 ${growth.lotteryName}` : "今日已免费抽奖"}
  ${
    growth.collectedBug
      ? `收集 Bug +${growth.collectBugCount}`
      : "暂无可收集 Bug"
  }
  `.trim();
};
// push
async function handlePush({ title = "", content = "" } = {}) {
  const url = DINGTALK_PUSH_URL;
  const body = {
    msgtype: "markdown",
    markdown: {
      title,
      text: content
    }
  };
  let param = {
    json: body
  };
  if (DING_TALK_TOKEN != "") {
    param.hooks = {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS_DINGTALK_WEB_HOOK);
        }
      ]
    };
  }
  const res = await got.post(url, param);
  // console.log(res.body);
}
/**
 * @desc 延时
 * @param {Number} duration 毫秒数
 * @returns {Promise<*>}
 */
function wait(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}
/**
 * @desc 生成指定值之间的随机数，含最小值，不含最大值
 * @param {Number} start 最小值
 * @param {Number} end 最大值
 * @returns {Number}
 */
function getRandomArbitrary(start = 5000, end = 8000) {
  return ~~(Math.random() * (end - start) + start);
}

function formatToMarkdown({ type, message }) {
  if (type === "info") {
    // 加号或数字加粗
    message = message.replace(/\+?\d+/g, " **$&** ");
  }

  // 引用换行
  message = message.replace(/\n/g, " \n\n > ").replace(/ +/g, " ");

  return {
    title: `脚本执行${type === "info" ? "成功 🎉" : "失败 💣"}`,
    content: message
  };
}
/**
 * @desc 签到
 */
async function signIn() {
  const res = await got.post(SIGN_IN_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS);
        }
      ]
    }
  });
  growth.checkedIn = true;
  // console.log('签到返回结果:', JSON.parse(res.body))
  return res;
}
/**
 * @desc 抽奖
 */
async function draw() {
  const res = await got.post(DRAW_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS);
        }
      ]
    }
  });
  growth.freeDrawed = true;
  // console.log('抽奖返回结果:', JSON.parse(res.body))

  return res;
}
/**
 * @desc 获取免费抽奖次数
 */
async function getFreeDraw() {
  const res = await got.get(DRAW_CHECK_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS);
        }
      ]
    }
  });

  if (JSON.parse(res.body).data.free_count > 0) {
    const res = await draw(); // 免费次数大于0时再抽
    return res;
  } else {
    growth.freeDrawed = true;
  }
}
/**
 * @desc 沾喜气
 */
async function lucky() {
  const body = {
    lottery_history_id: "7020267603864059917"
  };
  const res = await got.post(LUCKY_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS);
        }
      ]
    },
    json: body
  });
  // console.log('沾喜气返回结果:', JSON.parse(res.body))
  // console.log('lucky',res.body)
  return res;
}
/**
 * @desc 收集bug
 */
async function notCollectBug() {
  const res = await got.post(NOT_COLLECT_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS);
        }
      ]
    }
  });
  // console.log('未收集bug返回结果:', JSON.parse(res.body))
  return res;
}
async function collectBug({ bug_time = "", bug_type = "" } = {}) {
  setTimeout(async () => {
    const res = await got.post(COLLECT_URL, {
      hooks: {
        beforeRequest: [
          options => {
            Object.assign(options.headers, HEADERS);
          }
        ]
      },
      json: {
        bug_time,
        bug_type
      }
    });
    // console.log('收集bug返回结果:', res)
  }, getRandomArbitrary(2000, 3000));
}

setTimeout(async () => {
  if (!growth.checkedIn) {
    const res = await signIn();
    console.log("签到返回", JSON.parse(res.body));
    growth.incrPoint = JSON.parse(res.body).data.incr_point;
    growth.sumPoint = JSON.parse(res.body).data.sum_point;
  }
}, getRandomArbitrary(1000, 2000));
setTimeout(async () => {
  if (!growth.freeDrawed) {
    const res = await getFreeDraw();
    // JSON.parse(res.body)
    console.log("抽奖返回", res);

    growth.lotteryName = JSON.parse(res.body).data.lottery_name;
  }
}, getRandomArbitrary(2000, 3000));
setTimeout(async () => {
  if (!growth.dippedLucky) {
    const res = await lucky();
    console.log("沾喜气返回", JSON.parse(res.body));
    growth.dipValue = JSON.parse(res.body).data.dip_value;
    growth.luckyValue = JSON.parse(res.body).data.total_value;
    growth.dippedLucky = JSON.parse(res.body).data.has_dip;
  }
}, getRandomArbitrary(5000, 6000));
setTimeout(async () => {
  if (!growth.collectedBug) {
    const res = await notCollectBug();
    console.log("未收集bug返回", JSON.parse(res.body));

    const bugList = JSON.parse(res.body).data;
    if (bugList.length > 0) {
      growth.collectedBug = true;
      const requests = bugList.map(bug => {
        return async () => {
          await collectBug(bug);
          await wait(getRandomArbitrary(1000, 1500));
        };
      });

      for (const request of requests) {
        await request();
        growth.collectBugCount++;
      }
    }
  }
}, getRandomArbitrary(6000, 7000));
setTimeout(async () => {
  if (DING_TALK_TOKEN) {
    // if (typeof res.body == "string") res.body = JSON.parse(res.body);
    // const msg = `所有接口结果：${growth}`;
    await handlePush(
      formatToMarkdown({
        type: "info",
        message: message()
      })
    );
  }
}, getRandomArbitrary(120000, 130000));
// setTimeout(async () => {
//   if (!uid) return;
//   await autoGame('github');
// }, getRandomArbitrary(500000, 600000));
// 执行完重置所有值
// growth = {
//   checkedIn: false, // 是否签到
//   incrPoint: 0, // 签到获得矿石数
//   sumPoint: 0, // 总矿石数
//   // contCount: 0, // 连续签到天数
//   // sumCount: 0, // 累计签到天数
//   dippedLucky: false, // 是否沾喜气
//   dipValue: 0, // 幸运值
//   luckyValue: 0, // 总幸运值
//   // freeCount: 0, // 免费抽奖次数
//   freeDrawed: false, // 是否免费抽奖
//   lotteryName: '', // 奖品名称
//   collectedBug: false, // 是否收集 Bug
//   collectBugCount: 0, // 收集 Bug 的数量
// }
