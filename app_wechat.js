const got = require('got')
const {
  autoGame
} = require('./autoGame')

const {
  cookie,
  aid,
  uuid,
  _signature,
  PUSH_PLUS_TOKEN,
  DING_TALK_TOKEN,
  uid
} = require('./wechat')

const BASEURL = 'https://api.juejin.cn' // 掘金签到api

const DINGTALK_PUSH_URL = "https://oapi.dingtalk.com/robot/send?access_token=" + DING_TALK_TOKEN; // 钉钉webhook https://oapi.dingtalk.com/robot/send?access_token=e872241814aabb002d47a17b2d8843a6e0cca5efe917aff9ee684c060908b0bf

const SIGN_IN_URL = `${BASEURL}/growth_api/v1/check_in?aid=${AID}&uuid=${UUID}&_signature=${_SIGNATURE}`

const DRAW_URL = `${BASEURL}/growth_api/v1/lottery/draw?aid=${aid}&uuid=${uuid}&_signature=${_signature}`
const LUCKY_URL = `${BASEURL}/growth_api/v1/lottery_lucky/dip_lucky?aid=${aid}&uuid=${uuid}`
const DRAW_CHECK_URL = `${BASEURL}/growth_api/v1/lottery_config/get?aid=${aid}&uuid=${uuid}` //抽奖奖品列表
const NOT_COLLECT_URL = `${BASEURL}/user_api/v1/bugfix/not_collect?aid=${aid}&uuid=${uuid}&spider=0`
// ${BASEURL}/user_api/v1/bugfix/collect?aid=2608&uuid=6989117473007552032&spider=0
const COLLECT_URL = `${BASEURL}/user_api/v1/bugfix/collect?aid=${aid}&uuid=${uuid}&spider=0`

const lbabySign = 'https://server.lbaby1998.com/server/member/sign/sign' //爱婴岛小程序签到

const HEADERS = {
  cookie,
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.67'
}
const HEADERS_DINGTALK_WEB_HOOK = {
  "Content-Type": "application/json",
};

let growth = {
  checkedIn: false, // 是否签到
  incrPoint: 0, // 签到获得矿石数
  sumPoint: 0, // 总矿石数
  // contCount: 0, // 连续签到天数
  // sumCount: 0, // 累计签到天数
  dippedLucky: false, // 是否沾喜气
  dipValue: 0, // 幸运值
  luckyValue: 0, // 总幸运值
  // freeCount: 0, // 免费抽奖次数
  freeDrawed: false, // 是否免费抽奖
  lotteryName: '', // 奖品名称
  collectedBug: false, // 是否收集 Bug
  collectBugCount: 0, // 收集 Bug 的数量
  lbabyReward: 0 //爱婴岛签到积分
}

function message() {
  return `
    Hello Jamie
  ${growth.checkedIn ? `签到 +${growth.incrPoint} 矿石` : '今日已签到'}
  当前矿石数 ${growth.sumPoint}
  ${growth.dippedLucky ? '今日已经沾过喜气' : `沾喜气 +${growth.dipValue} 幸运值`}
  当前幸运值 ${growth.luckyValue}
  ${growth.freeDrawed ? `恭喜抽中 ${growth.lotteryName}` : '今日已免费抽奖'}
  ${growth.collectedBug ? `收集 Bug +${growth.collectBugCount}` : '暂无可收集 Bug'}
  爱婴岛签到 +${growth.lbabyReward} 积分}
  `.trim()
}
// push
async function handlePush({
  title = '',
  content = ''
} = {}) {
  const url = DING_TALK_TOKEN == '' ? PUSH_URL : DINGTALK_PUSH_URL;
  const body = DING_TALK_TOKEN == '' ? {
    token: `${PUSH_PLUS_TOKEN}`,
    title: `签到结果`,
    content: `${content}`
  } : {
    msgtype: 'markdown',
    markdown: {
      title,
      text: content,
    },
  };
  let param = {
    json: body,
  };
  if (DING_TALK_TOKEN != '') {
    param.hooks = {
      beforeRequest: [
        (options) => {
          Object.assign(options.headers, HEADERS_DINGTALK_WEB_HOOK);
        },
      ],
    }
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
  return new Promise(resolve => setTimeout(resolve, duration))
};
/**
 * @desc 生成指定值之间的随机数，含最小值，不含最大值
 * @param {Number} start 最小值
 * @param {Number} end 最大值
 * @returns {Number}
 */
function getRandomArbitrary(start = 5000, end = 8000) {
  return ~~(Math.random() * (end - start) + start)
}

function formatToMarkdown({
  type,
  message
}) {
  if (type === 'info') {
    // 加号或数字加粗
    message = message.replace(/\+?\d+/g, ' **$&** ')
  }

  // 引用换行
  message = message.replace(/\n/g, ' \n\n > ').replace(/ +/g, ' ')

  return {
    title: `脚本执行${type === 'info' ? '成功 🎉' : '失败 💣'}`,
    content: message,
  }
}
/**
 * @desc 爱婴岛签到
 */
async function lbabySignIn() {
  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    "connection": "keep-alive",
    "sessionId": "901194a4-0ecb-4947-bec4-e1720f563150"
  }
  const body = {
    seqNo: "1678757606906438345",
    system: "ma-shop"
  }

  const res = await got.post(lbabySign, {
    hooks: {
      beforeRequest: [
        options => {

          Object.assign(options.headers, {
            "content-type": "application/x-www-form-urlencoded",
            "connection": "keep-alive",
            "sessionId": "901194a4-0ecb-4947-bec4-e1720f563150"
          })
          // console.log(options.headers)
        }
      ]
    },
    json: body,
  })

  return res
}
/**
 * @desc 签到
 */
async function signIn() {
  const res = await got.post(URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS)
        }
      ]
    }
  })
  growth.checkedIn = true;
  // console.log('签到返回结果:', JSON.parse(res.body))
  return res
}
/**
 * @desc 抽奖
 */
async function draw() {
  const res = await got.post(DRAW_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS)
        }
      ]
    }
  })
  growth.freeDrawed = true;
  // console.log('抽奖返回结果:', JSON.parse(res.body))

  return res

}
/**
 * @desc 获取免费抽奖次数
 */
async function getFreeDraw() {

  const res = await got.get(DRAW_CHECK_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS)
        }
      ]
    }
  })

  if (JSON.parse(res.body).data.free_count > 0) {

    const res = await draw(); // 免费次数大于0时再抽
    return res;
  } else {
    growth.freeDrawed = true
  }
}
/**
 * @desc 沾喜气
 */
async function lucky() {
  const body = {
    lottery_history_id: "7020267603864059917"
  }
  const res = await got.post(LUCKY_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS)
        }
      ]
    },
    json: body,
  })
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
          Object.assign(options.headers, HEADERS)
        }
      ]
    },
  })
  // console.log('未收集bug返回结果:', JSON.parse(res.body))
  return res;
}
async function collectBug({
  bug_time = '',
  bug_type = ''
} = {}) {
  setTimeout(async () => {
    const res = await got.post(COLLECT_URL, {
      hooks: {
        beforeRequest: [
          options => {
            Object.assign(options.headers, HEADERS)
          }
        ]
      },
      json: {
        bug_time,
        bug_type
      }
    })
    // console.log('收集bug返回结果:', res)
  }, getRandomArbitrary(2000, 3000));
}

function runAllFn() {
  /* setTimeout(async () => {
    const res = await lbabySignIn()
    console.log('签到返回结果:', JSON.parse(res.body))
    growth.lbabyReward = JSON.parse(res.body).rewardIntegral
  }, getRandomArbitrary(500, 1000)) */
  setTimeout(async () => {
    if (!growth.checkedIn) {
      const res = await signIn();
      growth.incrPoint = JSON.parse(res.body).data.incr_point
      growth.sumPoint = JSON.parse(res.body).data.sum_point
    }

  }, getRandomArbitrary(1000, 2000));
  setTimeout(async () => {

    if (!growth.freeDrawed) {
      const res = await getFreeDraw()
      growth.lotteryName = JSON.parse(res.body).data.lottery_name
    }
  }, getRandomArbitrary(2000, 3000));
  setTimeout(async () => {
    if (!growth.dippedLucky) {
      const res = await lucky()
      growth.dipValue = JSON.parse(res.body).data.dip_value
      growth.luckyValue = JSON.parse(res.body).data.total_value
      growth.dippedLucky = JSON.parse(res.body).data.has_dip;

    }
  }, getRandomArbitrary(5000, 6000));
  setTimeout(async () => {
    if (!growth.collectedBug) {
      const res = await notCollectBug()
      const bugList = JSON.parse(res.body).data;
      if (bugList.length > 0) {
        growth.collectedBug = true
        const requests = bugList.map(bug => {
          return async () => {
            await collectBug(bug)
            await wait(getRandomArbitrary(1000, 1500))
          }
        })

        for (const request of requests) {
          await request()
          growth.collectBugCount++
        }

      }
    }
  }, getRandomArbitrary(6000, 7000));
  setTimeout(async () => {

    if (PUSH_PLUS_TOKEN || DING_TALK_TOKEN) {
      // if (typeof res.body == "string") res.body = JSON.parse(res.body);
      // const msg = `所有接口结果：${growth}`;
      await handlePush(formatToMarkdown({
        type: 'info',
        message: message()
      }));
    }
  }, getRandomArbitrary(120000, 130000));
  // setTimeout(async () => {
  //   if (!uid) return;
  //   await autoGame('wechat');
  // }, getRandomArbitrary(150000, 160000));
  // 执行完重置所有值
  growth = {
    checkedIn: false, // 是否签到
    incrPoint: 0, // 签到获得矿石数
    sumPoint: 0, // 总矿石数
    // contCount: 0, // 连续签到天数
    // sumCount: 0, // 累计签到天数
    dippedLucky: false, // 是否沾喜气
    dipValue: 0, // 幸运值
    luckyValue: 0, // 总幸运值
    // freeCount: 0, // 免费抽奖次数
    freeDrawed: false, // 是否免费抽奖
    lotteryName: '', // 奖品名称
    collectedBug: false, // 是否收集 Bug
    collectBugCount: 0, // 收集 Bug 的数量
  }
}

/**
 * 设置每日定时任务
 * @param {*} config 配置参数的说明：
 {
    interval: 1, //间隔天数，间隔为整数
    runNow: false, //是否立即运行
    time: "14:00:00" //执行的时间点 时在0~23之间
}
 * @param {*} func 参数是要执行的方法。
 * @param {*} params 请求头参数
 * @param {*} headers 请求头参数
 */
function timeoutFunc(config, func) {
  config.runNow && func()
  let nowTime = new Date().getTime() //当前时间戳
  let timePoints = config.time.split(':').map(i => parseInt(i))
  let recent = new Date().setHours(...timePoints) //传入的执行时间时间戳
  recent >= nowTime || (recent += 24 * 60 * 60 * 1000)
  setTimeout(() => {
    func()
    setInterval(() => {
      func()
    }, config.interval * 24 * 60 * 60 * 1000)
  }, recent - nowTime)
}
timeoutFunc({
  interval: 1,
  runNow: false,
  // time: "08:" + getRandomArbitrary(20, 30) + ":" + getRandomArbitrary(20, 30)
  time: "09:" + getRandomArbitrary(10, 20) + ":" + getRandomArbitrary(20, 30)
  // time: "09:50:00"
}, runAllFn)