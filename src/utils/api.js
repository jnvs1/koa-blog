const createJSON = ({data={}, success=true, msg="请求成功"}) => {
  return {
    data,
    success,
    msg
  }
}

module.exports = createJSON
