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
} = require('./config')
// console.log("app.js cookie", cookie)

const BASEURL = 'https://api.juejin.cn/growth_api/v1/check_in' // 掘金签到api
const PUSH_URL = 'http://www.pushplus.plus/send' // pushplus 推送api
const DINGTALK_PUSH_URL = "https://oapi.dingtalk.com/robot/send?access_token=" + DING_TALK_TOKEN; // 钉钉webhook

const URL = `${BASEURL}?aid=${aid}&uuid=${uuid}&_signature=${_signature}`
const DRAW_URL = `https://api.juejin.cn/growth_api/v1/lottery/draw?aid=${aid}&uuid=${uuid}&_signature=${_signature}`
const LUCKY_URL = `https://api.juejin.cn/growth_api/v1/lottery_lucky/dip_lucky?aid=${aid}&uuid=${uuid}`
const DRAW_CHECK_URL = `https://api.juejin.cn/growth_api/v1/lottery_config/get?aid=${aid}&uuid=${uuid}`
const NOT_COLLECT_URL = `https://api.juejin.cn/user_api/v1/bugfix/not_collect?aid=${aid}&uuid=${uuid}&spider=0`
// https://api.juejin.cn/user_api/v1/bugfix/collect?aid=2608&uuid=6989117473007552032&spider=0
const COLLECT_URL = `https://api.juejin.cn/user_api/v1/bugfix/collect?aid=${aid}&uuid=${uuid}&spider=0`


const HEADERS = {
  cookie,
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36 Edg/92.0.902.67'
}
const HEADERS_DINGTALK_WEB_HOOK = {
  "Content-Type": "application/json",
};
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
  // console.log('signIn', res.body)
  const drawData = await got.get(DRAW_CHECK_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS)
        }
      ]
    }
  })
  // console.log('drawData', JSON.parse(drawData.body).data)

  if (JSON.parse(drawData.body).data.free_count > 0) draw(); // 免费次数大于0时再抽
  lucky();
  collectBug();
  if (PUSH_PLUS_TOKEN || DING_TALK_TOKEN) {
    if (typeof res.body == "string") res.body = JSON.parse(res.body);
    const msg = res.body.err_no == 0 ? `成功，获得${res.body.data.incr_point}个矿石，矿石总数：${res.body.data.sum_point}个。` : "失败，" + res.body.err_msg;
    handlePush(msg);
  }
  if (!uid) return;
  autoGame();
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
  // console.log(res.body)
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
  // console.log('lucky',res.body)
}
/**
 * @desc 收集bug
 */
async function collectBug() {
  const res = await got.post(NOT_COLLECT_URL, {
    hooks: {
      beforeRequest: [
        options => {
          Object.assign(options.headers, HEADERS)
        }
      ]
    },
  })
  const bugList = JSON.parse(res.body).data;
  bugList.map(item => {
    const body = {
      bug_time: item.bug_time,
      bug_type: item.bug_type
    }
    // console.log('body', body)
    setTimeout(() => {
      const res = got.post(COLLECT_URL, {
        hooks: {
          beforeRequest: [
            options => {
              Object.assign(options.headers, HEADERS)
            }
          ]
        },
        json: body
      })
    }, 3000);
    // console.log('res', res)
  })
  // console.log('bugList', bugList)

  // console.log('collectBug', res.body)
}

// push
async function handlePush(desp) {
  const url = DING_TALK_TOKEN == '' ? PUSH_URL : DINGTALK_PUSH_URL;
  const body = DING_TALK_TOKEN == '' ? {
    token: `${PUSH_PLUS_TOKEN}`,
    title: `签到结果`,
    content: `${desp}`
  } : {
    msgtype: "text",
    text: {
      content: "签到结果: " + desp
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

function randomNum(m, n) {
  return minute = Math.floor(Math.random() * (m - n) + n);
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
  // time: "08:" + randomNum(20, 30) + ":" + randomNum(20, 30)
  time: "09:" + randomNum(10, 30) + ":" + randomNum(20, 30)
  // time: "09:50:00"
}, signIn)